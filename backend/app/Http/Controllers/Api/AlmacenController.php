<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlmacenResource;
use App\Models\Almacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AlmacenController extends Controller
{
    /**
     * GET /api/inventario/almacenes
     * Acceso: admin y empleado (empleado solo ve nombre/id para referencia de stock).
     */
    public function index(): JsonResponse
    {
        $almacenes = Almacen::where('activo', true)
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => AlmacenResource::collection($almacenes),
        ]);
    }

    /**
     * GET /api/inventario/almacenes/{id}
     * Acceso: admin y empleado.
     */
    public function show(int $id): JsonResponse
    {
        $almacen = Almacen::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new AlmacenResource($almacen),
        ]);
    }

    /**
     * POST /api/inventario/almacenes
     * Acceso: SOLO admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'      => 'required|string|max:100|unique:almacenes,nombre',
            'direccion'   => 'nullable|string|max:255',
            'responsable' => 'nullable|string|max:100',
            'activo'      => 'nullable|boolean',
        ], [
            'nombre.required' => 'El nombre del almacén es obligatorio.',
            'nombre.unique'   => 'Ya existe un almacén con ese nombre.',
        ]);

        $almacen = Almacen::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Almacén creado correctamente.',
            'data'    => new AlmacenResource($almacen),
        ], 201);
    }

    /**
     * PUT /api/inventario/almacenes/{id}
     * Acceso: SOLO admin.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $almacen = Almacen::findOrFail($id);

        $validated = $request->validate([
            'nombre'      => ['sometimes', 'required', 'string', 'max:100',
                              Rule::unique('almacenes', 'nombre')->ignore($id)],
            'direccion'   => 'sometimes|nullable|string|max:255',
            'responsable' => 'sometimes|nullable|string|max:100',
            'activo'      => 'sometimes|boolean',
        ]);

        $almacen->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Almacén actualizado correctamente.',
            'data'    => new AlmacenResource($almacen->fresh()),
        ]);
    }

    /**
     * DELETE /api/inventario/almacenes/{id}
     * Acceso: SOLO admin.
     */
    public function destroy(int $id): JsonResponse
    {
        $almacen = Almacen::findOrFail($id);

        // No eliminar si tiene movimientos de kardex o stock activo
        if ($almacen->kardexMovimientos()->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede eliminar un almacén con historial de movimientos. Desactívelo en su lugar.',
            ], 422);
        }

        $almacen->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Almacén eliminado correctamente.',
        ]);
    }
}
