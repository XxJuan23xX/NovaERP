<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\Producto;
use App\Models\Almacen;
use App\Models\KardexMovimiento;
use App\Services\InventarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class VentaController extends Controller
{
    protected $inventarioService;

    public function __construct(InventarioService $inventarioService)
    {
        $this->inventarioService = $inventarioService;
    }

    /**
     * GET /api/pos/ventas
     *
     * Listado del historial de ventas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Venta::with(['usuario:id,name', 'almacen:id,nombre'])
            ->orderBy('created_at', 'desc');

        // Filtrar por almacén si se solicita
        if ($almacenId = $request->query('almacen_id')) {
            $query->where('almacen_id', $almacenId);
        }

        // Paginación
        $perPage = min($request->integer('per_page', 15), 100);
        $ventas = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $ventas,
        ]);
    }

    /**
     * GET /api/pos/ventas/{id}
     *
     * Detalle de una venta específica.
     */
    public function show(int $id): JsonResponse
    {
        $venta = Venta::with([
            'usuario:id,name',
            'almacen:id,nombre',
            'detalles.producto:id,nombre,sku,precio_venta'
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $venta,
        ]);
    }

    /**
     * POST /api/pos/ventas
     *
     * Registra una venta en el punto de venta (POS) y descuenta stock del inventario.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Validar la petición
        $validator = Validator::make($request->all(), [
            'almacen_id' => 'nullable|integer|exists:almacenes,id',
            'cliente_id' => 'nullable|integer|exists:clientes,id',
            'cotizacion_id' => 'nullable|integer|exists:cotizaciones,id',
            'metodo_pago' => ['required', 'string', Rule::in(['efectivo', 'tarjeta'])],
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|integer|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_unitario' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de venta inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = $request->user()->id;
        $metodoPago = $request->input('metodo_pago');
        $productosInput = $request->input('productos');
        $clienteId = $request->input('cliente_id');
        $cotizacionId = $request->input('cotizacion_id');

        // Buscar sesión de caja abierta para el cajero (con la caja cargada)
        $sesion = \App\Models\SesionCaja::with('caja')->where('user_id', $userId)
            ->where('estado', 'abierta')
            ->first();

        // Si no hay sesión para el cajero, lanzar error de validación
        if (!$sesion) {
            return response()->json([
                'status' => 'error',
                'message' => 'No tienes una sesión de caja abierta. Por favor, inicia tu turno antes de registrar ventas.'
            ], 422);
        }

        $almacenId = $sesion->caja->almacen_id;

        try {
            // 2. Procesar venta dentro de una transacción de BD
            $venta = DB::transaction(function () use ($userId, $almacenId, $metodoPago, $productosInput, $sesion, $clienteId, $cotizacionId) {

                // Generar número de ticket único: V-2000 en adelante
                $ultimoId = Venta::max('id') ?? 2000;
                $numeroTicket = 'V-' . ($ultimoId + 1);

                $subtotalGeneral = 0;

                // Estructura para almacenar detalles antes de insertar
                $detallesPreparados = [];

                foreach ($productosInput as $item) {
                    $productoId = $item['producto_id'];
                    $cantidad = $item['cantidad'];

                    // Obtener producto con bloqueo pesimista
                    $producto = Producto::lockForUpdate()->findOrFail($productoId);

                    if (!$producto->activo) {
                        throw new \RuntimeException("El producto '{$producto->nombre}' no está activo.");
                    }

                    // Verificar stock en el almacén
                    $pivote = DB::table('producto_almacen')
                        ->where('producto_id', $productoId)
                        ->where('almacen_id', $almacenId)
                        ->first();

                    $stockActual = $pivote ? $pivote->stock_actual : 0;

                    if ($stockActual < $cantidad) {
                        throw new \RuntimeException(
                            "Stock insuficiente para '{$producto->nombre}'. Stock disponible: {$stockActual}, solicitado: {$cantidad}."
                        );
                    }

                    $precioUnitario = $item['precio_unitario'] ?? $producto->precio_venta;
                    $subtotalItem = $precioUnitario * $cantidad;
                    $subtotalGeneral += $subtotalItem;

                    $detallesPreparados[] = [
                        'producto' => $producto,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioUnitario,
                        'subtotal' => $subtotalItem,
                    ];
                }

                // Calcular IVA y Total
                $iva = $subtotalGeneral * 0.16;
                $total = $subtotalGeneral + $iva;

                // Crear la Venta
                $venta = Venta::create([
                    'numero_ticket' => $numeroTicket,
                    'sesion_caja_id' => $sesion->id,
                    'user_id' => $userId,
                    'almacen_id' => $almacenId,
                    'cliente_id' => $clienteId,
                    'cotizacion_id' => $cotizacionId,
                    'subtotal' => $subtotalGeneral,
                    'iva' => $iva,
                    'total' => $total,
                    'metodo_pago' => $metodoPago,
                ]);

                // Si viene de una cotización, actualizar su estado
                if ($cotizacionId) {
                    DB::table('cotizaciones')
                        ->where('id', $cotizacionId)
                        ->update(['estado' => 'convertida']);
                }

                // Crear detalles y registrar movimientos en el Kardex (descontar stock)
                foreach ($detallesPreparados as $detalle) {
                    $producto = $detalle['producto'];
                    $cantidad = $detalle['cantidad'];

                    // Descontar stock vía InventarioService (aplica Observer que actualiza producto_almacen)
                    $this->inventarioService->registrarMovimiento(
                        productoId: $producto->id,
                        almacenId: $almacenId,
                        userId: $userId,
                        tipoMovimiento: KardexMovimiento::TIPO_SALIDA_VENTA,
                        cantidad: $cantidad,
                        motivo: "Venta registrada en POS - Ticket {$numeroTicket}",
                        referenciaDocumento: $numeroTicket,
                        costoUnitario: $producto->precio_compra // Registramos costo de compra para Kardex
                    );

                    // Guardar detalle de la venta
                    VentaDetalle::create([
                        'venta_id' => $venta->id,
                        'producto_id' => $producto->id,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $detalle['precio_unitario'],
                        'subtotal' => $detalle['subtotal'],
                    ]);
                }

                return $venta;
            });

            // Retornar venta con sus relaciones
            return response()->json([
                'status' => 'success',
                'message' => 'Venta registrada correctamente.',
                'data' => Venta::with(['detalles.producto:id,nombre,sku', 'almacen:id,nombre', 'cliente:id,nombre_razon_social,rfc'])->find($venta->id),
            ], 201);

        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error inesperado al registrar la venta.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/pos/siguiente-ticket
     *
     * Obtiene el próximo número de ticket disponible.
     */
    public function siguienteTicket(Request $request): JsonResponse
    {
        $ultimoId = Venta::max('id') ?? 2000;
        $siguienteTicket = 'V-' . ($ultimoId + 1);

        return response()->json([
            'status' => 'success',
            'siguiente_ticket' => $siguienteTicket
        ]);
    }
}

