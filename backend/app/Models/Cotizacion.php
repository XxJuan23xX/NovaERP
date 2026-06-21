<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Cotizacion extends Model
{
    protected $table = 'cotizaciones';

    protected $fillable = [
        'folio',
        'cliente_id',
        'vendedor_id',
        'fecha_emision',
        'fecha_vigencia',
        'subtotal',
        'iva',
        'total',
        'estado',
        'observaciones',
    ];

    protected $casts = [
        'fecha_emision'  => 'date',
        'fecha_vigencia' => 'date',
        'subtotal'       => 'decimal:2',
        'iva'            => 'decimal:2',
        'total'          => 'decimal:2',
    ];

    /**
     * Una cotización pertenece a un cliente (opcional).
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    /**
     * Una cotización pertenece a un vendedor (usuario).
     */
    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Una cotización tiene muchos detalles.
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(CotizacionDetalle::class, 'cotizacion_id');
    }

    /**
     * Una cotización puede tener una venta asociada si fue convertida.
     */
    public function venta(): HasOne
    {
        return $this->hasOne(Venta::class, 'cotizacion_id');
    }
}
