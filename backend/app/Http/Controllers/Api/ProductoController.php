<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Http\Resources\ProductoResource;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductoController extends Controller
{
    /**
     * GET /api/inventario/productos
     *
     * Lista paginada del catálogo de productos.
     * Acceso: admin y empleado.
     *
     * CONTROL DE COSTOS (Regla de Negocio crítica):
     * - Si el usuario es 'empleado', el select EXCLUYE precio_compra a nivel de BD.
     *   Así el campo nunca llega al modelo ni al Resource, lo que garantiza
     *   que ni por error puede filtrarse.
     * - El ProductoResource aplica una segunda capa de verificación de rol.
     *
     * Búsqueda disponible para ambos roles:
     * - ?busqueda=texto  → busca en nombre, SKU y código de barras
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $isAdmin = $request->user()->role === 'admin';

        // ─── Columnas a seleccionar según el rol ────────────────────────────
        // El empleado NUNCA recibe precio_compra, ni siquiera en el objeto PHP.
        $columnas = $isAdmin
            ? ['id', 'sku', 'codigo_barras', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_compra', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at']
            : ['id', 'sku', 'codigo_barras', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at'];

        // ─── Query base ──────────────────────────────────────────────────────
        $query = Producto::select($columnas)
            ->with(['categoria:id,nombre', 'marca:id,nombre'])
            ->where('activo', true);

        // ─── Búsqueda por texto (nombre, SKU, código de barras) ─────────────
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")
                  ->orWhere('sku', 'like', "%{$busqueda}%")
                  ->orWhere('codigo_barras', 'like', "%{$busqueda}%");
            });
        }

        // ─── Filtros adicionales (disponibles para ambos roles) ──────────────
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->integer('categoria_id'));
        }
        if ($request->has('marca_id')) {
            $query->where('marca_id', $request->integer('marca_id'));
        }

        // ─── Ordenamiento ────────────────────────────────────────────────────
        $query->orderBy('nombre', 'asc');

        // ─── Paginación ──────────────────────────────────────────────────────
        $perPage = min($request->integer('per_page', 15), 100); // Máximo 100 por página
        $productos = $query->paginate($perPage);

        return ProductoResource::collection($productos);
    }

    /**
     * GET /api/inventario/productos/{producto}
     *
     * Detalle de un producto específico.
     * Acceso: admin y empleado.
     *
     * El mismo control de costos aplica:
     * - Admin: recibe precio_compra + precio_venta + margen.
     * - Empleado: solo recibe precio_venta.
     *
     * El empleado también puede ver el stock por almacén (solo lectura).
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $isAdmin = $request->user()->role === 'admin';

        // ─── Columnas según rol (doble capa de seguridad) ───────────────────
        $columnas = $isAdmin
            ? ['id', 'sku', 'codigo_barras', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_compra', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at']
            : ['id', 'sku', 'codigo_barras', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at'];

        $producto = Producto::select($columnas)
            ->with([
                'categoria:id,nombre',
                'marca:id,nombre',
                'almacenes', // Stock por almacén visible para ambos roles (solo lectura)
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new ProductoResource($producto),
        ]);
    }

    /**
     * POST /api/inventario/productos
     *
     * Crea un nuevo producto en el catálogo.
     * Acceso: SOLO admin (bloqueado por middleware 'role:admin' en rutas Y por el FormRequest).
     */
    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = Producto::create($request->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Producto creado correctamente.',
            'data'    => new ProductoResource($producto->load(['categoria', 'marca'])),
        ], 201);
    }

    /**
     * PUT/PATCH /api/inventario/productos/{producto}
     *
     * Actualiza un producto existente.
     * Acceso: SOLO admin (bloqueado por middleware 'role:admin' en rutas Y por el FormRequest).
     */
    public function update(UpdateProductoRequest $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update($request->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Producto actualizado correctamente.',
            'data'    => new ProductoResource($producto->fresh()->load(['categoria', 'marca'])),
        ]);
    }

    /**
     * DELETE /api/inventario/productos/{producto}
     *
     * Eliminación lógica (SoftDelete) del producto.
     * Acceso: SOLO admin (bloqueado por middleware 'role:admin' en rutas).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        // Verificar que el producto no tenga movimientos de kardex activos
        // (política de negocio: no eliminar productos con historial de stock)
        if ($producto->kardexMovimientos()->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede eliminar un producto con historial de movimientos de inventario. Desactívelo en su lugar.',
            ], 422);
        }

        $producto->delete(); // SoftDelete: marca deleted_at, no borra físicamente

        return response()->json([
            'status'  => 'success',
            'message' => 'Producto desactivado correctamente.',
        ]);
    }
}
