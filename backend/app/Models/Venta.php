<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $table = 'ventas';

    protected $fillable = [
        'numero_ticket',
        'sesion_caja_id',
        'user_id',
        'almacen_id',
        'cliente_id',
        'cotizacion_id',
        'subtotal',
        'iva',
        'total',
        'metodo_pago',
        'estado',
    ];

    /**
     * Una venta puede pertenecer a un cliente.
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    protected $casts = [
        'subtotal' => 'decimal:2',
        'iva'      => 'decimal:2',
        'total'    => 'decimal:2',
    ];

    // ─── Relaciones ──────────────────────────────────────────────────────────

    /**
     * Una venta pertenece a un usuario (vendedor/admin).
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Una venta se realiza desde un almacén.
     */
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    /**
     * Una venta tiene muchos detalles (productos vendidos).
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(VentaDetalle::class, 'venta_id');
    }

    /**
     * Una venta puede originarse de una cotización.
     */
    public function cotizacion(): BelongsTo
    {
        return $this->belongsTo(Cotizacion::class, 'cotizacion_id');
    }
}
