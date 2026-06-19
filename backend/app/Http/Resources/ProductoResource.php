<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductoResource extends JsonResource
{
    /**
     * Transforma el modelo Producto en un array JSON.
     *
     * CONTROL DE ACCESO POR ROL:
     * - Admin   → Recibe precio_compra (costo) + precio_venta + margen calculado.
     * - Empleado → Solo recibe precio_venta. El campo precio_compra es OMITIDO.
     *
     * La decisión se toma aquí en el Resource, pero el controlador también
     * la refuerza al nivel del query (no incluir el campo en el select si es empleado).
     */
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->role === 'admin';

        $data = [
            'id'             => $this->id,
            'sku'            => $this->sku,
            'nombre'         => $this->nombre,
            'descripcion'    => $this->descripcion,
            'unidad_medida'  => $this->unidad_medida,
            'stock_minimo'   => $this->stock_minimo,
            'stock'          => (int) ($this->stock ?? 0),
            'activo'         => $this->activo,
            'precio_venta'   => (float) $this->precio_venta,

            // Relaciones (cuando están cargadas con eager loading)
            'categoria' => $this->whenLoaded('categoria', fn () => [
                'id'     => $this->categoria->id,
                'nombre' => $this->categoria->nombre,
            ]),
            'marca' => $this->whenLoaded('marca', fn () => [
                'id'     => $this->marca->id,
                'nombre' => $this->marca->nombre,
            ]),
            // Stock por almacén (cuando están cargados)
            'almacenes' => $this->whenLoaded('almacenes', fn () =>
                $this->almacenes->map(fn ($almacen) => [
                    'id'           => $almacen->id,
                    'nombre'       => $almacen->nombre,
                    'stock_actual' => $almacen->pivot->stock_actual,
                ])
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];

        // ─── CAMPO RESTRINGIDO: precio_compra ───────────────────────────────
        // Solo el admin recibe este campo. El empleado nunca lo ve.
        if ($isAdmin) {
            $data['precio_compra'] = (float) $this->precio_compra;
            // Bonus para admin: margen de ganancia calculado
            $data['margen_ganancia'] = $this->precio_compra > 0
                ? round((($this->precio_venta - $this->precio_compra) / $this->precio_compra) * 100, 2)
                : null;
        }

        return $data;
    }
}
