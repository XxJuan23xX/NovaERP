<?php

namespace App\Http\Requests;

use App\Models\KardexMovimiento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAjusteInventarioRequest extends FormRequest
{
    /**
     * Solo el admin puede realizar ajustes de inventario.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Reglas para registrar un ajuste manual de inventario (Entrada o Salida).
     */
    public function rules(): array
    {
        return [
            'producto_id'          => 'required|integer|exists:productos,id',
            'almacen_id'           => 'required|integer|exists:almacenes,id',
            'tipo_movimiento'      => ['required', 'string', Rule::in(KardexMovimiento::tiposValidos())],
            'cantidad'             => 'required|integer|min:1',
            'motivo'               => 'required|string|max:255',
            'referencia_documento' => 'nullable|string|max:100',
            'costo_unitario'       => 'nullable|numeric|min:0',
        ];
    }

    /**
     * Mensajes de error en español.
     */
    public function messages(): array
    {
        $tiposValidos = implode(', ', KardexMovimiento::tiposValidos());

        return [
            'producto_id.required'     => 'Debe seleccionar un producto.',
            'producto_id.exists'       => 'El producto seleccionado no existe.',
            'almacen_id.required'      => 'Debe seleccionar un almacén.',
            'almacen_id.exists'        => 'El almacén seleccionado no existe.',
            'tipo_movimiento.required' => 'Debe especificar el tipo de movimiento.',
            'tipo_movimiento.in'       => "El tipo de movimiento debe ser uno de: {$tiposValidos}.",
            'cantidad.required'        => 'La cantidad es obligatoria.',
            'cantidad.min'             => 'La cantidad debe ser al menos 1.',
            'motivo.required'          => 'El motivo del ajuste es obligatorio.',
        ];
    }
}
