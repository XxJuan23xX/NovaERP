<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesionCaja extends Model
{
    protected $table = 'sesiones_caja';

    protected $fillable = [
        'caja_id',
        'user_id',
        'fondo_inicial',
        'fecha_apertura',
        'fecha_cierre',
        'estado',
        'efectivo_real',
        'descuadre',
    ];

    protected $casts = [
        'fecha_apertura' => 'datetime',
        'fecha_cierre'   => 'datetime',
        'fondo_inicial'  => 'decimal:2',
        'efectivo_real'  => 'decimal:2',
        'descuadre'      => 'decimal:2',
    ];

    /**
     * Una sesión pertenece a una caja.
     */
    public function caja(): BelongsTo
    {
        return $this->belongsTo(Caja::class, 'caja_id');
    }

    /**
     * Una sesión es abierta/gestionada por un usuario (cajero).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Una sesión de caja tiene muchas ventas.
     */
    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'sesion_caja_id');
    }
}
