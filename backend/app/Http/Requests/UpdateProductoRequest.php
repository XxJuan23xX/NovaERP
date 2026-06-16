<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductoRequest extends FormRequest
{
    /**
     * Solo el admin puede editar productos.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Reglas de validación para actualizar un producto.
     * Usamos 'sometimes' para permitir actualizaciones parciales (PATCH).
     */
    public function rules(): array
    {
        $productoId = $this->route('producto'); // El ID del producto en la ruta

        return [
            'sku'           => ['sometimes', 'required', 'string', 'max:50',
                                Rule::unique('productos', 'sku')->ignore($productoId)],
            'codigo_barras' => ['sometimes', 'nullable', 'string', 'max:100',
                                Rule::unique('productos', 'codigo_barras')->ignore($productoId)],
            'nombre'        => 'sometimes|required|string|max:200',
            'descripcion'   => 'sometimes|nullable|string|max:500',
            'categoria_id'  => 'sometimes|required|integer|exists:categorias,id',
            'marca_id'      => 'sometimes|required|integer|exists:marcas,id',
            'precio_compra' => 'sometimes|required|numeric|min:0|max:9999999999.99',
            'precio_venta'  => 'sometimes|required|numeric|min:0|max:9999999999.99',
            'stock_minimo'  => 'sometimes|nullable|integer|min:0',
            'unidad_medida' => 'sometimes|nullable|string|max:30',
            'activo'        => 'sometimes|nullable|boolean',
        ];
    }

    /**
     * Mensajes de error en español.
     */
    public function messages(): array
    {
        return [
            'sku.unique'           => 'Ya existe un producto con ese SKU.',
            'codigo_barras.unique' => 'Ya existe un producto con ese código de barras.',
            'nombre.required'      => 'El nombre del producto es obligatorio.',
            'categoria_id.exists'  => 'La categoría seleccionada no existe.',
            'marca_id.exists'      => 'La marca seleccionada no existe.',
            'precio_compra.numeric'=> 'El precio de compra debe ser un número.',
            'precio_venta.numeric' => 'El precio de venta debe ser un número.',
        ];
    }
}
