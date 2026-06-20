<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caja;
use App\Models\SesionCaja;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CierreCajaController extends Controller
{
    /**
     * GET /api/caja/cierre-resumen
     *
     * Obtiene el resumen consolidado de la sesión de caja activa.
     */
    public function cierreResumen(Request $request): JsonResponse
    {
        // Obtener la sesión de caja abierta actual
        $sesion = SesionCaja::with(['caja.almacen'])
            ->where('estado', 'abierta')
            ->orderBy('id', 'desc')
            ->first();

        // Si no hay sesión de caja abierta, creamos una de prueba automáticamente para demostración
        if (!$sesion) {
            $caja = Caja::where('activo', true)->first();
            if (!$caja) {
                $almacen = \App\Models\Almacen::first() ?: \App\Models\Almacen::create([
                    'nombre' => 'Almacén Central',
                    'direccion' => 'Av. Principal #100, Col. Centro',
                    'responsable' => 'Ing. Juan Pérez'
                ]);

                $caja = Caja::create([
                    'nombre' => 'Caja Principal 01',
                    'almacen_id' => $almacen->id,
                    'activo' => true
                ]);
            }

            $user = $request->user() ?: User::first();

            $sesion = SesionCaja::create([
                'caja_id' => $caja->id,
                'user_id' => $user->id,
                'fondo_inicial' => 5000.00,
                'estado' => 'abierta',
                'fecha_apertura' => now(),
            ]);

            $sesion->load(['caja.almacen']);
        }

        $sesionId = $sesion->id;

        // --- 1. Calcular totales monetarios de la sesión ---
        // Ventas completadas totales
        $totalVendidoNeto = (float) Venta::where('sesion_caja_id', $sesionId)
            ->where('estado', 'completada')
            ->sum('total');

        // Efectivo recibido (ventas completadas en efectivo)
        $efectivoRecibido = (float) Venta::where('sesion_caja_id', $sesionId)
            ->where('estado', 'completada')
            ->where('metodo_pago', 'efectivo')
            ->sum('total');

        // Tarjeta recibido (ventas completadas con tarjeta)
        $tarjetaRecibido = (float) Venta::where('sesion_caja_id', $sesionId)
            ->where('estado', 'completada')
            ->where('metodo_pago', 'tarjeta')
            ->sum('total');

        // Cancelaciones (ventas marcadas como canceladas)
        $cancelacionesMonto = (float) Venta::where('sesion_caja_id', $sesionId)
            ->where('estado', 'cancelada')
            ->sum('total');

        // --- 2. Cruce con stock y dinero en 'producto_almacen' (Valoración de inventario) ---
        $almacenId = $sesion->caja->almacen_id;

        $inventarioSum = DB::table('producto_almacen')
            ->where('almacen_id', $almacenId)
            ->sum('stock_actual');

        $inventarioVal = DB::table('producto_almacen')
            ->join('productos', 'producto_almacen.producto_id', '=', 'productos.id')
            ->where('producto_almacen.almacen_id', $almacenId)
            ->selectRaw('SUM(producto_almacen.stock_actual * productos.precio_venta) as total_venta, SUM(producto_almacen.stock_actual * productos.precio_compra) as total_compra')
            ->first();

        // --- 3. Ventas detalladas por Empleado ---
        $empleadosId = Venta::where('sesion_caja_id', $sesionId)
            ->select('user_id')
            ->distinct()
            ->pluck('user_id');

        $cajerosResumen = [];
        foreach ($empleadosId as $uid) {
            $user = User::find($uid);
            if (!$user) continue;

            $ticketsCount = Venta::where('user_id', $uid)
                ->where('sesion_caja_id', $sesionId)
                ->count();

            // Efectivo por este empleado
            $empEfectivo = (float) Venta::where('user_id', $uid)
                ->where('sesion_caja_id', $sesionId)
                ->where('estado', 'completada')
                ->where('metodo_pago', 'efectivo')
                ->sum('total');

            $empEfectivoVentas = Venta::where('user_id', $uid)
                ->where('sesion_caja_id', $sesionId)
                ->where('estado', 'completada')
                ->where('metodo_pago', 'efectivo')
                ->count();

            // Tarjeta por este empleado
            $empTarjeta = (float) Venta::where('user_id', $uid)
                ->where('sesion_caja_id', $sesionId)
                ->where('estado', 'completada')
                ->where('metodo_pago', 'tarjeta')
                ->sum('total');

            $empTarjetaVentas = Venta::where('user_id', $uid)
                ->where('sesion_caja_id', $sesionId)
                ->where('estado', 'completada')
                ->where('metodo_pago', 'tarjeta')
                ->count();

            // Cancelaciones por este empleado
            $empCancelaciones = (float) Venta::where('sesion_caja_id', $sesionId)
                ->where('user_id', $uid)
                ->where('estado', 'cancelada')
                ->sum('total');

            $empCancelacionesVentas = Venta::where('sesion_caja_id', $sesionId)
                ->where('user_id', $uid)
                ->where('estado', 'cancelada')
                ->count();

            $cajerosResumen[] = [
                'user_id'              => $user->id,
                'nombre'               => $user->name,
                'tickets'              => $ticketsCount,
                'efectivo_monto'       => $empEfectivo,
                'efectivo_ventas'      => $empEfectivoVentas,
                'tarjeta_monto'        => $empTarjeta,
                'tarjeta_ventas'       => $empTarjetaVentas,
                'cancelaciones_monto'  => $empCancelaciones,
                'cancelaciones_ventas' => $empCancelacionesVentas,
                'total_neto'           => $empEfectivo + $empTarjeta
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'sesion' => [
                    'id'             => $sesion->id,
                    'caja_nombre'    => $sesion->caja->nombre,
                    'almacen_nombre' => $sesion->caja->almacen->nombre,
                    'cajero_nombre'  => $sesion->user->name,
                    'fondo_inicial'  => (float) $sesion->fondo_inicial,
                    'fecha_apertura' => $sesion->fecha_apertura->toISOString(),
                    'estado'         => $sesion->estado,
                ],
                'resumen' => [
                    'total_vendido'    => $totalVendidoNeto,
                    'efectivo_recibido'=> $efectivoRecibido,
                    'tarjeta_recibido' => $tarjetaRecibido,
                    'cancelaciones'    => $cancelacionesMonto,
                ],
                'inventario' => [
                    'stock_total'        => (int) $inventarioSum,
                    'valor_venta_total'  => round((float) ($inventarioVal->total_venta ?? 0), 2),
                    'valor_compra_total' => round((float) ($inventarioVal->total_compra ?? 0), 2),
                ],
                'empleados' => $cajerosResumen
            ]
        ]);
    }

    /**
     * POST /api/caja/cierre
     *
     * Confirma el cierre de caja, calcula el descuadre y actualiza el estado.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'efectivo_real' => 'required|numeric|min:0'
        ], [
            'efectivo_real.required' => 'El efectivo físico es obligatorio.',
            'efectivo_real.numeric'  => 'El efectivo físico debe ser un valor numérico.'
        ]);

        $efectivoReal = (float) $request->input('efectivo_real');

        // Obtener sesión de caja abierta
        $sesion = SesionCaja::where('estado', 'abierta')
            ->orderBy('id', 'desc')
            ->first();

        if (!$sesion) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se encontró ninguna sesión de caja activa para cerrar.'
            ], 422);
        }

        // Calcular efectivo esperado = fondo_inicial + efectivo_recibido
        $efectivoRecibido = (float) Venta::where('sesion_caja_id', $sesion->id)
            ->where('estado', 'completada')
            ->where('metodo_pago', 'efectivo')
            ->sum('total');

        $efectivoEsperado = (float) $sesion->fondo_inicial + $efectivoRecibido;
        $descuadre = $efectivoReal - $efectivoEsperado;

        DB::beginTransaction();
        try {
            $sesion->update([
                'estado'         => 'cerrada',
                'fecha_cierre'   => now(),
                'efectivo_real'  => $efectivoReal,
                'descuadre'      => $descuadre
            ]);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Cierre de caja confirmado correctamente.',
                'data'    => [
                    'sesion_id'         => $sesion->id,
                    'efectivo_esperado' => $efectivoEsperado,
                    'efectivo_real'     => $efectivoReal,
                    'descuadre'         => $descuadre,
                    'estado'            => 'cerrada'
                ]
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Ocurrió un error al procesar el cierre de caja.',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
