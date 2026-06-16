<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoriaController extends Controller
{
    /**
     * GET /api/inventario/categorias
     * Acceso: admin y empleado (lista para select/filtros).
     */
    public function index(): JsonResponse
    {
        $categorias = Categoria::where('activo', true)
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => CategoriaResource::collection($categorias),
        ]);
    }

    /**
     * GET /api/inventario/categorias/{id}
     * Acceso: admin y empleado.
     */
    public function show(int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new CategoriaResource($categoria),
        ]);
    }

    /**
     * POST /api/inventario/categorias
     * Acceso: SOLO admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'      => 'required|string|max:100|unique:categorias,nombre',
            'descripcion' => 'nullable|string|max:255',
            'activo'      => 'nullable|boolean',
        ], [
            'nombre.required' => 'El nombre de la categoría es obligatorio.',
            'nombre.unique'   => 'Ya existe una categoría con ese nombre.',
        ]);

        $categoria = Categoria::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Categoría creada correctamente.',
            'data'    => new CategoriaResource($categoria),
        ], 201);
    }

    /**
     * PUT /api/inventario/categorias/{id}
     * Acceso: SOLO admin.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);

        $validated = $request->validate([
            'nombre'      => ['sometimes', 'required', 'string', 'max:100',
                              Rule::unique('categorias', 'nombre')->ignore($id)],
            'descripcion' => 'sometimes|nullable|string|max:255',
            'activo'      => 'sometimes|boolean',
        ]);

        $categoria->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Categoría actualizada correctamente.',
            'data'    => new CategoriaResource($categoria->fresh()),
        ]);
    }

    /**
     * DELETE /api/inventario/categorias/{id}
     * Acceso: SOLO admin.
     */
    public function destroy(int $id): JsonResponse
    {
        $categoria = Categoria::findOrFail($id);

        // Verificar que no tenga productos activos antes de eliminar
        if ($categoria->productos()->where('activo', true)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede eliminar una categoría que tiene productos activos asociados.',
            ], 422);
        }

        $categoria->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Categoría eliminada correctamente.',
        ]);
    }
}
