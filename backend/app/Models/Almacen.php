<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Almacen extends Model
{
    protected $table = 'almacenes';

    protected $fillable = [
        'nombre',
        'direccion',
        'responsable',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    // ─── Relaciones ──────────────────────────────────────────────────────────

    /**
     * Un almacén puede contener muchos productos (con stock propio en la tabla pivote).
     */
    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(Producto::class, 'producto_almacen')
                    ->withPivot('stock_actual')
                    ->withTimestamps();
    }

    /**
     * Un almacén tiene muchos movimientos en el kardex.
     */
    public function kardexMovimientos(): HasMany
    {
        return $this->hasMany(KardexMovimiento::class, 'almacen_id');
    }
}
