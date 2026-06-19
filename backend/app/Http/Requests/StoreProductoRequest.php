<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductoRequest extends FormRequest
{
    /**
     * Solo el admin puede crear productos.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Reglas de validación para crear un producto.
     */
    public function rules(): array
    {
        return [
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
        ];
    }

    /**
     * Mensajes de error en español.
     */
    public function messages(): array
    {
        return [
            'sku.required'          => 'El SKU es obligatorio.',
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
        ];
    }
}
