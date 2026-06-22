<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\CotizacionDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Services\AuditoriaService;

class CotizacionController extends Controller
{
    /**
     * GET /api/cotizaciones
     *
     * Listado de cotizaciones con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cotizacion::with(['cliente:id,nombre_razon_social,rfc', 'vendedor:id,name']);

        // Búsqueda por Folio o Nombre de Cliente
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('folio', 'like', "%{$busqueda}%")
                  ->orWhereHas('cliente', function ($sq) use ($busqueda) {
                      $sq->where('nombre_razon_social', 'like', "%{$busqueda}%")
                        ->orWhere('rfc', 'like', "%{$busqueda}%");
                  });
            });
        }

        // Filtro por estado (borrador, vigente, vencida, convertida)
        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        $cotizaciones = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $cotizaciones
        ]);
    }

    /**
     * GET /api/cotizaciones/{id}
     *
     * Detalle completo de una cotización.
     */
    public function show(int $id): JsonResponse
    {
        $cotizacion = Cotizacion::with([
            'cliente', 
            'vendedor:id,name', 
            'detalles.producto' => function ($query) {
                $query->select('id', 'nombre', 'sku', 'precio_venta', 'stock_minimo')
                      ->withSum('almacenes as stock', 'producto_almacen.stock_actual');
            }
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $cotizacion
        ]);
    }

    /**
     * POST /api/cotizaciones
     *
     * Registrar una nueva cotización.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cliente_id' => 'nullable|integer|exists:clientes,id',
            'fecha_emision' => 'required|date',
            'fecha_vigencia' => 'required|date|after_or_equal:fecha_emision',
            'subtotal' => 'required|numeric|min:0',
            'iva' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'estado' => ['required', 'string', Rule::in(['borrador', 'vigente', 'vencida', 'convertida'])],
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
            'detalles.*.descuento_porcentaje' => 'nullable|numeric|between:0,100',
            'detalles.*.total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de cotización inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $cotizacion = DB::transaction(function () use ($request) {
                // Auto-generación de folio COT-081 en adelante
                $ultimoId = Cotizacion::max('id') ?? 80; // COT-081, COT-082, etc.
                $folio = 'COT-' . str_pad($ultimoId + 1, 3, '0', STR_PAD_LEFT);

                $cotizacion = Cotizacion::create([
                    'folio' => $folio,
                    'cliente_id' => $request->input('cliente_id'),
                    'vendedor_id' => $request->user()->id,
                    'fecha_emision' => $request->input('fecha_emision'),
                    'fecha_vigencia' => $request->input('fecha_vigencia'),
                    'subtotal' => $request->input('subtotal'),
                    'iva' => $request->input('iva'),
                    'total' => $request->input('total'),
                    'estado' => $request->input('estado'),
                    'observaciones' => $request->input('observaciones'),
                ]);

                foreach ($request->input('detalles') as $item) {
                    CotizacionDetalle::create([
                        'cotizacion_id' => $cotizacion->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad' => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'descuento_porcentaje' => $item['descuento_porcentaje'] ?? 0.00,
                        'total' => $item['total'],
                    ]);
                }

                return $cotizacion;
            });

            // Registrar auditoría
            AuditoriaService::registrar(
                $request->user()->id,
                'cotizaciones',
                'CREAR',
                'info',
                "Cotización creada: Folio {$cotizacion->folio}. Total: \${$cotizacion->total} M.N.",
                null,
                $cotizacion->toArray()
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización creada correctamente.',
                'data' => Cotizacion::with([
                    'cliente', 
                    'detalles.producto' => function ($query) {
                        $query->withSum('almacenes as stock', 'producto_almacen.stock_actual');
                    }
                ])->find($cotizacion->id)
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al guardar la cotización.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/cotizaciones/{id}
     *
     * Actualizar una cotización existente (especialmente borradores).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cotizacion = Cotizacion::findOrFail($id);
        $valoresAnteriores = $cotizacion->only(['cliente_id', 'subtotal', 'iva', 'total', 'estado', 'observaciones']);

        $validator = Validator::make($request->all(), [
            'cliente_id' => 'nullable|integer|exists:clientes,id',
            'fecha_emision' => 'required|date',
            'fecha_vigencia' => 'required|date|after_or_equal:fecha_emision',
            'subtotal' => 'required|numeric|min:0',
            'iva' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'estado' => ['required', 'string', Rule::in(['borrador', 'vigente', 'vencida', 'convertida'])],
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
            'detalles.*.descuento_porcentaje' => 'nullable|numeric|between:0,100',
            'detalles.*.total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de cotización inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $cotizacion) {
                $cotizacion->update([
                    'cliente_id' => $request->input('cliente_id'),
                    'fecha_emision' => $request->input('fecha_emision'),
                    'fecha_vigencia' => $request->input('fecha_vigencia'),
                    'subtotal' => $request->input('subtotal'),
                    'iva' => $request->input('iva'),
                    'total' => $request->input('total'),
                    'estado' => $request->input('estado'),
                    'observaciones' => $request->input('observaciones'),
                ]);

                // Eliminar detalles previos y recrear
                $cotizacion->detalles()->delete();

                foreach ($request->input('detalles') as $item) {
                    CotizacionDetalle::create([
                        'cotizacion_id' => $cotizacion->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad' => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'descuento_porcentaje' => $item['descuento_porcentaje'] ?? 0.00,
                        'total' => $item['total'],
                    ]);
                }
            });

            $valoresNuevos = $cotizacion->only(['cliente_id', 'subtotal', 'iva', 'total', 'estado', 'observaciones']);

            // Registrar auditoría
            AuditoriaService::registrar(
                $request->user()->id,
                'cotizaciones',
                'EDITAR',
                'info',
                "Cotización actualizada: Folio {$cotizacion->folio}.",
                $valoresAnteriores,
                $valoresNuevos
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Cotización actualizada correctamente.',
                'data' => Cotizacion::with([
                    'cliente', 
                    'detalles.producto' => function ($query) {
                        $query->withSum('almacenes as stock', 'producto_almacen.stock_actual');
                    }
                ])->find($cotizacion->id)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar la cotización.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PATCH /api/cotizaciones/{id}/convertir
     *
     * Marcar una cotización como convertida.
     */
    public function convertir(int $id): JsonResponse
    {
        $cotizacion = Cotizacion::findOrFail($id);
        
        if ($cotizacion->estado === 'convertida') {
            return response()->json([
                'status' => 'error',
                'message' => 'La cotización ya ha sido convertida a venta previamente.'
            ], 422);
        }

        $valoresAnteriores = ['estado' => $cotizacion->estado];
        
        $cotizacion->update(['estado' => 'convertida']);

        $valoresNuevos = ['estado' => $cotizacion->estado];

        // Registrar auditoría
        AuditoriaService::registrar(
            request()->user()->id,
            'cotizaciones',
            'CONFIRMAR',
            'info',
            "Cotización Folio {$cotizacion->folio} convertida a venta en el POS.",
            $valoresAnteriores,
            $valoresNuevos
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Estado de cotización actualizado a convertida.',
            'data' => $cotizacion
        ]);
    }
}
