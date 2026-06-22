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
use App\Services\AuditoriaService;

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

        if (!$sesion) {
            return response()->json([
                'status' => 'success',
                'data' => null
            ]);
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

            // Registrar auditoría
            $severidad = abs($descuadre) > 0 ? 'danger' : 'info';
            $descripcion = "Cierre de caja (Sesión #{$sesion->id}) confirmado. Esperado: \${$efectivoEsperado}, Declarado: \${$efectivoReal}. Descuadre: \${$descuadre}.";
            AuditoriaService::registrar(
                $request->user()->id,
                'caja',
                'CIERRE',
                $severidad,
                $descripcion,
                ['estado' => 'abierta'],
                $sesion->toArray()
            );

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

    /**
     * GET /api/caja/sesion-activa
     *
     * Verifica si el usuario logueado tiene una sesión activa (estado = 'abierta').
     */
    public function sesionActiva(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $sesion = SesionCaja::with(['caja.almacen'])
            ->where('estado', 'abierta')
            ->where('user_id', $userId)
            ->first();

        return response()->json([
            'status' => 'success',
            'data' => $sesion
        ]);
    }

    /**
     * GET /api/caja/cajas-disponibles
     *
     * Obtiene cajas activas que no tengan una sesión abierta actualmente.
     */
    public function cajasDisponibles(Request $request): JsonResponse
    {
        // Obtener IDs de cajas que tienen una sesión abierta
        $cajasOcupadasIds = SesionCaja::where('estado', 'abierta')
            ->pluck('caja_id')
            ->toArray();

        // Obtener cajas activas que no estén ocupadas
        $cajas = Caja::with(['almacen'])
            ->where('activo', true)
            ->whereNotIn('id', $cajasOcupadasIds)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $cajas
        ]);
    }

    /**
     * POST /api/caja/apertura
     *
     * Abre una nueva sesión de caja/turno.
     */
    public function apertura(Request $request): JsonResponse
    {
        $request->validate([
            'almacen_id' => 'required|integer|exists:almacenes,id',
            'fondo_inicial' => 'required|numeric|min:0',
            'user_id' => 'nullable|integer|exists:users,id'
        ]);

        $loggedInUser = $request->user();
        $userId = $loggedInUser->id;
        if ($request->filled('user_id') && $loggedInUser->role === 'admin') {
            $userId = $request->input('user_id');
        }

        $almacenId = $request->input('almacen_id');
        $fondoInicial = $request->input('fondo_inicial');

        // Verificar si el usuario ya tiene una sesión abierta
        $sesionUsuario = SesionCaja::where('user_id', $userId)
            ->where('estado', 'abierta')
            ->first();

        if ($sesionUsuario) {
            $nombreUsuario = \App\Models\User::find($userId)->name;
            return response()->json([
                'status' => 'error',
                'message' => ($userId === $loggedInUser->id) 
                    ? 'Ya tienes una sesión de caja abierta.'
                    : "El cajero '{$nombreUsuario}' ya tiene una sesión de caja abierta."
            ], 422);
        }

        // Buscar una caja activa asociada a este almacén
        $caja = Caja::where('almacen_id', $almacenId)
            ->where('activo', true)
            ->first();

        // Si no existe, crearla dinámicamente
        if (!$caja) {
            $almacen = \App\Models\Almacen::find($almacenId);
            $caja = Caja::create([
                'nombre' => 'Caja Principal ' . $almacen->nombre,
                'almacen_id' => $almacenId,
                'activo' => true
            ]);
        }

        // Verificar si la caja ya está ocupada por otra sesión abierta
        $sesionCaja = SesionCaja::where('caja_id', $caja->id)
            ->where('estado', 'abierta')
            ->first();

        if ($sesionCaja) {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta sucursal ya tiene un turno/caja abierto.'
            ], 422);
        }

        // Crear la sesión
        $sesion = SesionCaja::create([
            'caja_id' => $caja->id,
            'user_id' => $userId,
            'fondo_inicial' => $fondoInicial,
            'estado' => 'abierta',
            'fecha_apertura' => now(),
        ]);

        $sesion->load(['caja.almacen']);

        // Registrar auditoría
        $nombreCajero = \App\Models\User::find($userId)->name;
        AuditoriaService::registrar(
            $request->user()->id,
            'caja',
            'APERTURA',
            'info',
            "Apertura de caja (Sesión #{$sesion->id}) en {$sesion->caja->almacen->nombre} con Fondo Inicial: \${$sesion->fondo_inicial} para el cajero {$nombreCajero}.",
            null,
            $sesion->toArray()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Sesión de caja abierta correctamente.',
            'data' => $sesion
        ], 201);
    }
}
