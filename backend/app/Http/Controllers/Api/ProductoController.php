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
use App\Services\AuditoriaService;

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
            ? ['id', 'sku', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_compra', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at']
            : ['id', 'sku', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at'];

        $almacenId = $request->query('almacen_id');

        // ─── Query base ──────────────────────────────────────────────────────
        $query = Producto::select($columnas)
            ->with(['categoria:id,nombre', 'marca:id,nombre'])
            ->where('activo', true);

        if ($almacenId) {
            $query->withSum(['almacenes as stock' => function ($q) use ($almacenId) {
                $q->where('producto_almacen.almacen_id', $almacenId);
            }], 'producto_almacen.stock_actual');
        } else {
            $query->withSum('almacenes as stock', 'producto_almacen.stock_actual');
        }

        // ─── Búsqueda por texto (nombre, SKU) ────────────────────────────────
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")
                  ->orWhere('sku', 'like', "%{$busqueda}%");
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

        // ─── Obtener todos los productos (Paginación local en frontend) ─────
        $productos = $query->get();

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
            ? ['id', 'sku', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_compra', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at']
            : ['id', 'sku', 'nombre', 'descripcion',
               'categoria_id', 'marca_id', 'precio_venta',
               'stock_minimo', 'unidad_medida', 'activo', 'created_at', 'updated_at'];

        $producto = Producto::select($columnas)
            ->with([
                'categoria:id,nombre',
                'marca:id,nombre',
                'almacenes', // Stock por almacén visible para ambos roles (solo lectura)
            ])
            ->withSum('almacenes as stock', 'producto_almacen.stock_actual')
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
    public function store(Request $request): JsonResponse
    {
        // Generar SKU incremental automático (formato SKU-00001)
        $ultimoProducto = Producto::withTrashed()
            ->where('sku', 'like', 'SKU-%')
            ->orderBy('id', 'desc')
            ->first();
        $nuevoNumero = 1;

        if ($ultimoProducto && preg_match('/SKU-(\d+)/', $ultimoProducto->sku, $matches)) {
            $nuevoNumero = intval($matches[1]) + 1;
        }

        $sku = 'SKU-' . str_pad($nuevoNumero, 5, '0', STR_PAD_LEFT);
        $request->merge(['sku' => $sku]);

        $validated = $request->validate([
            'sku'            => 'required|string|max:50|unique:productos,sku',
            'nombre'         => 'required|string|max:200',
            'descripcion'    => 'nullable|string|max:500',
            'categoria_id'   => 'required|integer|exists:categorias,id',
            'marca_id'       => 'required|integer|exists:marcas,id',
            'precio_compra'  => 'required|numeric|min:0|max:9999999999.99',
            'precio_venta'   => 'required|numeric|min:0|max:9999999999.99',
            'stock_minimo'   => 'nullable|integer|min:0',
            'unidad_medida'  => 'nullable|string|max:30',
            'activo'         => 'nullable|boolean',
        ], [
            'sku.unique'            => 'Ya existe un producto con ese SKU.',
            'nombre.required'       => 'El nombre del producto es obligatorio.',
            'categoria_id.required' => 'Debe seleccionar una categoría.',
            'categoria_id.exists'   => 'La categoría seleccionada no existe.',
            'marca_id.required'     => 'Debe seleccionar una marca.',
            'marca_id.exists'       => 'La marca seleccionada no existe.',
            'precio_compra.required'=> 'El precio de compra es obligatorio.',
            'precio_compra.numeric' => 'El precio de compra debe ser un número.',
            'precio_venta.required' => 'El precio de venta es obligatorio.',
            'precio_venta.numeric'  => 'El precio de venta debe ser un número.',
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $producto = Producto::create($validated);

            // Registrar stock inicial si se envía cantidad y almacén
            $stock = $request->integer('stock') ?: $request->integer('stock_inicial') ?: 0;
            $almacenId = $request->input('almacen_id') ?: $request->input('almacen');

            if ($stock > 0 && $almacenId) {
                $inventarioService = app(\App\Services\InventarioService::class);
                $inventarioService->registrarMovimiento(
                    productoId:     $producto->id,
                    almacenId:      $almacenId,
                    userId:         $request->user()->id,
                    tipoMovimiento: \App\Models\KardexMovimiento::TIPO_ENTRADA_AJUSTE,
                    cantidad:       $stock,
                    motivo:         'Registro inicial de existencias al crear producto'
                );
            }

            // Registrar auditoría
            AuditoriaService::registrar(
                $request->user()->id,
                'inventario',
                'CREAR',
                'info',
                "Producto creado: {$producto->nombre} (SKU: {$producto->sku})",
                null,
                $producto->toArray()
            );

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Producto creado correctamente.',
                'data'    => new ProductoResource($producto->load(['categoria', 'marca'])->loadSum('almacenes as stock', 'producto_almacen.stock_actual')),
            ], 201);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            throw $e;
        }
    }

    /**
     * PUT/PATCH /api/inventario/productos/{producto}
     *
     * Actualiza un producto existente.
     * Acceso: SOLO admin (bloqueado por middleware 'role:admin' en rutas Y por el FormRequest).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        $validated = $request->validate([
            'sku'           => 'sometimes|required|string|max:50|unique:productos,sku,' . $id,
            'nombre'        => 'sometimes|required|string|max:200',
            'descripcion'   => 'sometimes|nullable|string|max:500',
            'categoria_id'  => 'sometimes|required|integer|exists:categorias,id',
            'marca_id'      => 'sometimes|required|integer|exists:marcas,id',
            'precio_compra' => 'sometimes|required|numeric|min:0|max:9999999999.99',
            'precio_venta'  => 'sometimes|required|numeric|min:0|max:9999999999.99',
            'stock_minimo'  => 'sometimes|nullable|integer|min:0',
            'unidad_medida' => 'sometimes|nullable|string|max:30',
            'activo'        => 'sometimes|nullable|boolean',
            'almacen_id'    => 'sometimes|nullable|integer|exists:almacenes,id',
            'stock'         => 'sometimes|nullable|integer|min:0',
        ], [
            'sku.unique'           => 'Ya existe un producto con ese SKU.',
            'nombre.required'      => 'El nombre del producto es obligatorio.',
            'categoria_id.exists'  => 'La categoría seleccionada no existe.',
            'marca_id.exists'      => 'La marca seleccionada no existe.',
            'precio_compra.numeric'=> 'El precio de compra debe ser un número.',
            'precio_venta.numeric' => 'El precio de venta debe ser un número.',
        ]);

        $valoresAnteriores = $producto->only(['sku', 'nombre', 'descripcion', 'categoria_id', 'marca_id', 'precio_compra', 'precio_venta', 'stock_minimo', 'unidad_medida', 'activo']);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $producto->update($validated);

            $valoresNuevos = $producto->only(['sku', 'nombre', 'descripcion', 'categoria_id', 'marca_id', 'precio_compra', 'precio_venta', 'stock_minimo', 'unidad_medida', 'activo']);

            // Registrar auditoría
            AuditoriaService::registrar(
                $request->user()->id,
                'inventario',
                'EDITAR',
                'info',
                "Producto actualizado: {$producto->nombre} (SKU: {$producto->sku})",
                $valoresAnteriores,
                $valoresNuevos
            );

            $almacenId = $request->input('almacen_id');
            $stockNuevo = $request->has('stock') ? $request->integer('stock') : null;

            if ($almacenId && $stockNuevo !== null) {
                // Obtener stock actual en la sucursal seleccionada
                $pivote = \Illuminate\Support\Facades\DB::table('producto_almacen')
                    ->where('producto_id', $producto->id)
                    ->where('almacen_id', $almacenId)
                    ->first();

                $stockActual = $pivote ? $pivote->stock_actual : 0;
                $delta = $stockNuevo - $stockActual;

                if ($delta !== 0) {
                    $inventarioService = app(\App\Services\InventarioService::class);
                    $tipoMovimiento = $delta > 0
                        ? \App\Models\KardexMovimiento::TIPO_ENTRADA_AJUSTE
                        : \App\Models\KardexMovimiento::TIPO_SALIDA_AJUSTE;

                    $inventarioService->registrarMovimiento(
                        productoId:     $producto->id,
                        almacenId:      $almacenId,
                        userId:         $request->user()->id,
                        tipoMovimiento: $tipoMovimiento,
                        cantidad:       abs($delta),
                        motivo:         'Ajuste de existencias desde edición de producto'
                    );
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Producto actualizado correctamente.',
                'data'    => new ProductoResource($producto->fresh()->load(['categoria', 'marca'])->loadSum('almacenes as stock', 'producto_almacen.stock_actual')),
            ]);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            throw $e;
        }
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

        $valoresAnteriores = $producto->toArray();

        $producto->delete(); // SoftDelete: marca deleted_at, no borra físicamente

        AuditoriaService::registrar(
            $request->user()->id,
            'inventario',
            'ELIMINAR',
            'danger',
            "Producto desactivado / eliminado: {$producto->nombre} (SKU: {$producto->sku})",
            $valoresAnteriores,
            null
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Producto desactivado correctamente.',
        ]);
    }
}
