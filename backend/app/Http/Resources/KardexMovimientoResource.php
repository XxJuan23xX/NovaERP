<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KardexMovimientoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'tipo_movimiento'      => $this->tipo_movimiento,
            'cantidad'             => (int) $this->cantidad,
            'stock_anterior'       => (int) $this->stock_anterior,
            'stock_posterior'      => (int) $this->stock_posterior,
            'costo_unitario'       => $this->costo_unitario !== null ? (float) $this->costo_unitario : null,
            'motivo'               => $this->motivo,
            'referencia_documento' => $this->referencia_documento,
            'producto'             => $this->whenLoaded('producto', fn () => [
                'id'     => $this->producto->id,
                'sku'    => $this->producto->sku,
                'nombre' => $this->producto->nombre,
            ]),
            'almacen'              => $this->whenLoaded('almacen', fn () => [
                'id'     => $this->almacen->id,
                'nombre' => $this->almacen->nombre,
            ]),
            'usuario'              => $this->whenLoaded('usuario', fn () => [
                'id'    => $this->usuario->id,
                'name'  => $this->usuario->name,
                'email' => $this->usuario->email,
            ]),
            'created_at'           => $this->created_at?->toISOString(),
        ];
    }
}
