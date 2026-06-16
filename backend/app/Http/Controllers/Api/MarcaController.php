<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MarcaResource;
use App\Models\Marca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarcaController extends Controller
{
    /**
     * GET /api/inventario/marcas
     * Acceso: admin y empleado.
     */
    public function index(): JsonResponse
    {
        $marcas = Marca::where('activo', true)
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => MarcaResource::collection($marcas),
        ]);
    }

    /**
     * GET /api/inventario/marcas/{id}
     * Acceso: admin y empleado.
     */
    public function show(int $id): JsonResponse
    {
        $marca = Marca::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new MarcaResource($marca),
        ]);
    }

    /**
     * POST /api/inventario/marcas
     * Acceso: SOLO admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'      => 'required|string|max:100|unique:marcas,nombre',
            'descripcion' => 'nullable|string|max:255',
            'activo'      => 'nullable|boolean',
        ], [
            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.unique'   => 'Ya existe una marca con ese nombre.',
        ]);

        $marca = Marca::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Marca creada correctamente.',
            'data'    => new MarcaResource($marca),
        ], 201);
    }

    /**
     * PUT /api/inventario/marcas/{id}
     * Acceso: SOLO admin.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $marca = Marca::findOrFail($id);

        $validated = $request->validate([
            'nombre'      => ['sometimes', 'required', 'string', 'max:100',
                              Rule::unique('marcas', 'nombre')->ignore($id)],
            'descripcion' => 'sometimes|nullable|string|max:255',
            'activo'      => 'sometimes|boolean',
        ]);

        $marca->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Marca actualizada correctamente.',
            'data'    => new MarcaResource($marca->fresh()),
        ]);
    }

    /**
     * DELETE /api/inventario/marcas/{id}
     * Acceso: SOLO admin.
     */
    public function destroy(int $id): JsonResponse
    {
        $marca = Marca::findOrFail($id);

        if ($marca->productos()->where('activo', true)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede eliminar una marca que tiene productos activos asociados.',
            ], 422);
        }

        $marca->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Marca eliminada correctamente.',
        ]);
    }
}
