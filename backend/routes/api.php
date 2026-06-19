<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\MarcaController;
use App\Http\Controllers\Api\AlmacenController;
use App\Http\Controllers\Api\KardexController;

// ─── Rutas públicas (sin autenticación) ─────────────────────────────────────
Route::post('/login',    [AuthController::class, 'login']);

// ─── Rutas protegidas (requieren token Sanctum válido) ───────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Registro de personal (exclusivo para Administradores)
    Route::middleware('role:admin')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::get('/users', [AuthController::class, 'index']);
        Route::patch('/users/{id}/toggle-status', [AuthController::class, 'toggleStatus']);
    });

    // Usuario autenticado
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);

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
    });
});
