<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Traspaso;
use App\Models\TraspasoDetalle;
use App\Models\Almacen;
use App\Models\Producto;
use App\Models\KardexMovimiento;
use App\Services\InventarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TraspasoController extends Controller
{
    protected $inventarioService;

    public function __construct(InventarioService $inventarioService)
    {
        $this->inventarioService = $inventarioService;
    }

    /**
     * GET /api/inventario/traspasos
     *
     * Obtiene el listado de traspasos con filtros y relaciones.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Traspaso::with([
            'almacenOrigen',
            'almacenDestino',
            'usuario:id,name,role',
            'detalles.producto:id,nombre,sku'
        ]);

        // Filtrar por estado si se especifica
        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        // Filtrar por código de traspaso
        if ($request->filled('codigo_traspaso')) {
            $query->where('codigo_traspaso', 'like', '%' . $request->input('codigo_traspaso') . '%');
        }

        // Ordenar por fecha de envío descendente
        $query->orderBy('fecha_envio', 'desc');

        // Paginación nativa de Laravel
        $perPage = min($request->integer('per_page', 15), 100);
        $traspasos = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $traspasos,
        ]);
    }

    /**
     * POST /api/inventario/traspasos
     *
     * Crea un nuevo traspaso y descuenta el stock en el origen.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'almacen_origen_id' => 'required|integer|exists:almacenes,id',
            'almacen_destino_id' => 'required|integer|exists:almacenes,id',
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|integer|exists:productos,id',
            'productos.*.cantidad' => 'required|numeric|min:0.01',
        ]);

        $almacenOrigenId = $request->input('almacen_origen_id');
        $almacenDestinoId = $request->input('almacen_destino_id');

        if ($almacenOrigenId == $almacenDestinoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'El almacén de origen y de destino no pueden ser iguales.'
            ], 422);
        }

        $almacenOrigen = Almacen::findOrFail($almacenOrigenId);
        $almacenDestino = Almacen::findOrFail($almacenDestinoId);
        $user = $request->user();

        // Validación de Sucursal (Seguridad):
        // Si no es un administrador de la sede "Matriz", la sucursal del usuario debe coincidir con el almacén de origen.
        if (!($user->role === 'admin' && $user->sucursal === 'Matriz')) {
            if ($almacenOrigen->nombre !== $user->sucursal) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tiene permisos para realizar traspasos desde este almacén de origen (' . $almacenOrigen->nombre . '). Su sucursal asignada es ' . $user->sucursal . '.'
                ], 403);
            }
        }

        try {
            $traspaso = DB::transaction(function () use ($request, $almacenOrigenId, $almacenDestinoId, $user) {
                // 1. Crear el traspaso con un código temporal único para evitar fallar la restricción unique
                $traspaso = Traspaso::create([
                    'codigo_traspaso' => 'TR-TEMP-' . uniqid() . '-' . mt_rand(1000, 9999),
                    'almacen_origen_id' => $almacenOrigenId,
                    'almacen_destino_id' => $almacenDestinoId,
                    'user_id' => $user->id,
                    'estado' => 'en_transito',
                    'fecha_envio' => now(),
                ]);

                // 2. Actualizar con el código correlativo real y seguro usando el ID autoincrementable de la DB
                $codigoTraspaso = 'TR-' . (10000 + $traspaso->id);
                $traspaso->update(['codigo_traspaso' => $codigoTraspaso]);

                // 3. Procesar productos
                foreach ($request->input('productos') as $p) {
                    $productoId = $p['producto_id'];
                    $cantidad = $p['cantidad'];

                    $producto = Producto::findOrFail($productoId);
                    $costoUnitario = $producto->precio_compra;

                    // Descontar stock en el origen y registrar Kardex (vía InventarioService)
                    // Esto lanzará RuntimeException si hay stock insuficiente
                    $this->inventarioService->registrarMovimiento(
                        productoId: $productoId,
                        almacenId: $almacenOrigenId,
                        userId: $user->id,
                        tipoMovimiento: KardexMovimiento::TIPO_SALIDA_TRASPASO,
                        cantidad: $cantidad,
                        motivo: "Envío de traspaso {$codigoTraspaso}",
                        referenciaDocumento: $codigoTraspaso,
                        costoUnitario: $costoUnitario
                    );

                    // Registrar detalle del traspaso
                    TraspasoDetalle::create([
                        'traspaso_id' => $traspaso->id,
                        'producto_id' => $productoId,
                        'cantidad' => $cantidad,
                    ]);
                }

                return $traspaso;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Traspaso creado exitosamente.',
                'data' => $traspaso->load(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto:id,nombre,sku'])
            ], 201);

        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            Log::error("Error al crear traspaso: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Ocurrió un error inesperado al procesar el traspaso.'
            ], 500);
        }
    }

    /**
     * POST /api/inventario/traspasos/{id}/confirmar
     *
     * Confirma (recibe o rechaza) un traspaso en tránsito.
     */
    public function confirmar(Request $request, $id): JsonResponse
    {
        $request->validate([
            'accion' => 'required|string|in:recibir,rechazar',
        ]);

        $accion = $request->input('accion');
        $traspaso = Traspaso::where('id', $id)->where('estado', 'en_transito')->firstOrFail();
        $almacenDestino = Almacen::findOrFail($traspaso->almacen_destino_id);
        $user = $request->user();

        // Permisos de Confirmación:
        // Debe ser administrador de la sede "Matriz", o bien la sucursal del usuario debe coincidir con el almacén de destino.
        if (!($user->role === 'admin' && $user->sucursal === 'Matriz')) {
            if ($almacenDestino->nombre !== $user->sucursal) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No tiene permisos para confirmar traspasos destinados a ' . $almacenDestino->nombre . '. Su sucursal asignada es ' . $user->sucursal . '.'
                ], 403);
            }
        }

        try {
            DB::transaction(function () use ($traspaso, $accion, $user) {
                $traspaso->estado = $accion === 'recibir' ? 'recibido' : 'rechazado';
                $traspaso->fecha_recepcion = now();
                $traspaso->save();

                foreach ($traspaso->detalles as $detalle) {
                    $producto = Producto::findOrFail($detalle->producto_id);
                    $costoUnitario = $producto->precio_compra;

                    if ($accion === 'recibir') {
                        // Incrementar el stock en el almacén de destino
                        $this->inventarioService->registrarMovimiento(
                            productoId: $detalle->producto_id,
                            almacenId: $traspaso->almacen_destino_id,
                            userId: $user->id,
                            tipoMovimiento: KardexMovimiento::TIPO_ENTRADA_TRASPASO,
                            cantidad: $detalle->cantidad,
                            motivo: "Recepción de traspaso {$traspaso->codigo_traspaso}",
                            referenciaDocumento: $traspaso->codigo_traspaso,
                            costoUnitario: $costoUnitario
                        );
                    } else {
                        // Devolver el stock al almacén de origen
                        $this->inventarioService->registrarMovimiento(
                            productoId: $detalle->producto_id,
                            almacenId: $traspaso->almacen_origen_id,
                            userId: $user->id,
                            tipoMovimiento: KardexMovimiento::TIPO_ENTRADA_AJUSTE,
                            cantidad: $detalle->cantidad,
                            motivo: "Retorno por rechazo de traspaso {$traspaso->codigo_traspaso}",
                            referenciaDocumento: $traspaso->codigo_traspaso,
                            costoUnitario: $costoUnitario
                        );
                    }
                }
            });

            $mensaje = $accion === 'recibir'
                ? 'El traspaso ha sido recibido y el stock ha sido sumado en el almacén de destino.'
                : 'El traspaso ha sido rechazado y el stock ha sido devuelto al almacén de origen.';

            return response()->json([
                'status' => 'success',
                'message' => $mensaje,
                'data' => $traspaso->load(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto:id,nombre,sku'])
            ]);

        } catch (\Exception $e) {
            Log::error("Error al confirmar traspaso ID {$id}: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Ocurrió un error al procesar la confirmación: ' . $e->getMessage()
            ], 500);
        }
    }
}

