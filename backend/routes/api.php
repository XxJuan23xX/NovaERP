<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // Grupo Admin: Solo usuarios con rol 'admin'
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard-prueba', function () {
            return response()->json([
                'status' => 'success',
                'message' => 'Bienvenido al panel de administración de prueba.'
            ]);
        });
    });

    // Grupo General/Empleado: Permite 'admin' y 'empleado'
    Route::middleware('role:admin,empleado')->group(function () {
        Route::get('/pos/ventas-prueba', function () {
            return response()->json([
                'status' => 'success',
                'message' => 'Acceso concedido al módulo POS de prueba.'
            ]);
        });
    });
});

