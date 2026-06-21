<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CotizacionDetalle extends Model
{
    protected $table = 'cotizacion_detalles';

    protected $fillable = [
        'cotizacion_id',
        'producto_id',
        'cantidad',
        'precio_unitario',
        'descuento_porcentaje',
        'total',
    ];

    protected $casts = [
        'precio_unitario'      => 'decimal:2',
        'descuento_porcentaje' => 'decimal:2',
        'total'                => 'decimal:2',
    ];

    /**
     * El detalle pertenece a una cotización.
     */
    public function cotizacion(): BelongsTo
    {
        return $this->belongsTo(Cotizacion::class, 'cotizacion_id');
    }

    /**
     * El detalle pertenece a un producto.
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
