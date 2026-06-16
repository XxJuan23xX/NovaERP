<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAjusteInventarioRequest;
use App\Http\Resources\KardexMovimientoResource;
use App\Models\KardexMovimiento;
use App\Services\InventarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KardexController extends Controller
{
    public function __construct(
        private readonly InventarioService $inventarioService
    ) {}

    /**
     * POST /api/inventario/kardex/ajustes
     *
     * Registra un ajuste manual de inventario (entrada o salida).
     * Acceso: SOLO admin.
     *
     * Flujo:
     * 1. Valida la request (tipo_movimiento, cantidad, motivo, etc.).
     * 2. Llama al InventarioService para registrar el movimiento.
     * 3. El Observer KardexMovimientoObserver actualiza producto_almacen automáticamente.
     */
    public function registrarAjuste(StoreAjusteInventarioRequest $request): JsonResponse
    {
        try {
            $movimiento = $this->inventarioService->registrarMovimiento(
                productoId:          $request->integer('producto_id'),
                almacenId:           $request->integer('almacen_id'),
                userId:              $request->user()->id,
                tipoMovimiento:      $request->string('tipo_movimiento'),
                cantidad:            $request->integer('cantidad'),
                motivo:              $request->string('motivo'),
                referenciaDocumento: $request->string('referencia_documento'),
                costoUnitario:       $request->float('costo_unitario'),
            );

            // Cargar relaciones antes de pasar al resource
            $movimiento->load(['producto', 'almacen', 'usuario']);

            return response()->json([
                'status'  => 'success',
                'message' => 'Movimiento de inventario registrado correctamente.',
                'data'    => new KardexMovimientoResource($movimiento),
            ], 201);
        } catch (\RuntimeException $e) {
            // Stock insuficiente para la salida
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/inventario/kardex
     *
     * Historial de movimientos del Kardex con filtros.
     * Acceso: SOLO admin (auditoría completa).
     *
     * Filtros disponibles:
     * - ?producto_id=X
     * - ?almacen_id=X
     * - ?tipo_movimiento=ENTRADA_COMPRA
     * - ?fecha_desde=2024-01-01
     * - ?fecha_hasta=2024-12-31
     */
    public function historial(Request $request): JsonResponse
    {
        $query = KardexMovimiento::with([
                'producto:id,nombre,sku',
                'almacen:id,nombre',
                'usuario:id,name,email',
            ])
            ->orderBy('created_at', 'desc');

        // ─── Filtros ─────────────────────────────────────────────────────────
        if ($request->has('producto_id')) {
            $query->where('producto_id', $request->integer('producto_id'));
        }
        if ($request->has('almacen_id')) {
            $query->where('almacen_id', $request->integer('almacen_id'));
        }
        if ($request->has('tipo_movimiento')) {
            $query->where('tipo_movimiento', $request->string('tipo_movimiento'));
        }
        if ($request->has('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->string('fecha_desde'));
        }
        if ($request->has('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->string('fecha_hasta'));
        }

        $perPage = min($request->integer('per_page', 20), 100);
        $movimientos = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data'   => KardexMovimientoResource::collection($movimientos),
        ]);
    }
}
