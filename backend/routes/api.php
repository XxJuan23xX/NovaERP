<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\MarcaController;
use App\Http\Controllers\Api\AlmacenController;
use App\Http\Controllers\Api\KardexController;
use App\Http\Controllers\Api\VentaController;
use App\Http\Controllers\Api\TraspasoController;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\DashboardController;

// ─── Rutas públicas (sin autenticación) ─────────────────────────────────────
Route::post('/login',    [AuthController::class, 'login']);

// ─── Rutas protegidas (requieren token Sanctum válido) ───────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Registro de personal (exclusivo para Administradores)
    Route::middleware('role:admin')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::get('/users', [AuthController::class, 'index']);
        Route::patch('/users/{id}/toggle-status', [AuthController::class, 'toggleStatus']);
        Route::get('/auditoria', [AuditoriaController::class, 'index']);
    });

    // Usuario autenticado
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // =========================================================================
    // MÓDULO 1: INVENTARIO Y CATÁLOGO
    // Prefijo: /api/inventario
    // =========================================================================
    Route::prefix('inventario')->group(function () {

        // ─── Rutas compartidas: admin + empleado (GET = solo lectura) ─────────
        Route::middleware('role:admin,empleado')->group(function () {

            // Catálogo - Categorías (solo lectura para empleado)
            Route::get('/categorias',       [CategoriaController::class, 'index']);
            Route::get('/categorias/{id}',  [CategoriaController::class, 'show']);

            // Catálogo - Marcas (solo lectura para empleado)
            Route::get('/marcas',       [MarcaController::class, 'index']);
            Route::get('/marcas/{id}',  [MarcaController::class, 'show']);

            // Catálogo - Almacenes (solo lectura para empleado, necesario para ver stock)
            Route::get('/almacenes',       [AlmacenController::class, 'index']);
            Route::get('/almacenes/{id}',  [AlmacenController::class, 'show']);

            // Catálogo - Productos (ambos roles pueden leer, pero el empleado NO verá precio_compra)
            // La lógica de ocultamiento de precio_compra está en ProductoController + ProductoResource
            Route::get('/productos',         [ProductoController::class, 'index']);
            Route::get('/productos/{id}',    [ProductoController::class, 'show']);

            // Traspasos de Inventario (Fase 1: Historial & Fase 2: Creación/Confirmación)
            Route::get('/traspasos',         [TraspasoController::class, 'index']);
            Route::post('/traspasos',        [TraspasoController::class, 'store']);
            Route::post('/traspasos/{id}/confirmar', [TraspasoController::class, 'confirmar']);
        });

        // ─── Rutas exclusivas: SOLO admin ─────────────────────────────────────
        Route::middleware('role:admin')->group(function () {

            // CRUD Categorías (admin puede crear, editar y eliminar)
            Route::post('/categorias',        [CategoriaController::class, 'store']);
            Route::put('/categorias/{id}',    [CategoriaController::class, 'update']);
            Route::patch('/categorias/{id}',  [CategoriaController::class, 'update']);
            Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);

            // CRUD Marcas
            Route::post('/marcas',        [MarcaController::class, 'store']);
            Route::put('/marcas/{id}',    [MarcaController::class, 'update']);
            Route::patch('/marcas/{id}',  [MarcaController::class, 'update']);
            Route::delete('/marcas/{id}', [MarcaController::class, 'destroy']);

            // CRUD Almacenes
            Route::post('/almacenes',        [AlmacenController::class, 'store']);
            Route::put('/almacenes/{id}',    [AlmacenController::class, 'update']);
            Route::patch('/almacenes/{id}',  [AlmacenController::class, 'update']);
            Route::delete('/almacenes/{id}', [AlmacenController::class, 'destroy']);

            // CRUD Productos (solo admin puede crear, editar, eliminar)
            Route::post('/productos',           [ProductoController::class, 'store']);
            Route::put('/productos/{id}',       [ProductoController::class, 'update']);
            Route::patch('/productos/{id}',     [ProductoController::class, 'update']);
            Route::delete('/productos/{id}',    [ProductoController::class, 'destroy']);

            // Kardex - Ajustes manuales de inventario (SOLO admin)
            Route::post('/kardex/ajustes', [KardexController::class, 'registrarAjuste']);
            Route::get('/kardex',          [KardexController::class, 'historial']);
        });
    });

    // ─── Rutas legacy de prueba del Módulo 3 ─────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard-prueba', function () {
            return response()->json([
                'status'  => 'success',
                'message' => 'Bienvenido al panel de administración de prueba.',
            ]);
        });
    });

    Route::middleware('role:admin,empleado')->group(function () {
        Route::get('/pos/ventas-prueba', function () {
            return response()->json([
                'status'  => 'success',
                'message' => 'Acceso concedido al módulo POS de prueba.',
            ]);
        });

        // Rutas reales del Punto de Venta (POS)
        Route::get('/pos/ventas',           [VentaController::class, 'index']);
        Route::post('/pos/ventas',          [VentaController::class, 'store']);
        Route::get('/pos/siguiente-ticket', [VentaController::class, 'siguienteTicket']);
        // MÓDULO: CLIENTES (CRM)
        Route::apiResource('clientes', \App\Http\Controllers\Api\ClienteController::class);

        // MÓDULO: COTIZACIONES
        Route::patch('/cotizaciones/{id}/convertir', [\App\Http\Controllers\Api\CotizacionController::class, 'convertir']);
        Route::apiResource('cotizaciones', \App\Http\Controllers\Api\CotizacionController::class);

        // MÓDULO: CIERRE DE CAJA
        Route::prefix('caja')->group(function () {
            Route::get('/cierre-resumen', [\App\Http\Controllers\Api\CierreCajaController::class, 'cierreResumen']);
            Route::post('/cierre', [\App\Http\Controllers\Api\CierreCajaController::class, 'store']);
            Route::get('/sesion-activa', [\App\Http\Controllers\Api\CierreCajaController::class, 'sesionActiva']);
            Route::get('/cajas-disponibles', [\App\Http\Controllers\Api\CierreCajaController::class, 'cajasDisponibles']);
            Route::post('/apertura', [\App\Http\Controllers\Api\CierreCajaController::class, 'apertura']);
        });
    });
});
