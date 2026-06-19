<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producto extends Model
{
    use SoftDeletes;

    protected $table = 'productos';

    protected $fillable = [
        'sku',
        'nombre',
        'descripcion',
        'categoria_id',
        'marca_id',
        'precio_compra',   // Solo admin puede escribir/leer este campo
        'precio_venta',
        'stock_minimo',
        'unidad_medida',
        'activo',
    ];

    protected $casts = [
        'precio_compra' => 'decimal:2',
        'precio_venta'  => 'decimal:2',
        'activo'        => 'boolean',
        'deleted_at'    => 'datetime',
    ];

    // ─── Relaciones ──────────────────────────────────────────────────────────

    /**
     * Un producto pertenece a una categoría.
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    /**
     * Un producto pertenece a una marca.
     */
    public function marca(): BelongsTo
    {
        return $this->belongsTo(Marca::class, 'marca_id');
    }

    /**
     * Un producto puede estar en muchos almacenes (con su stock propio en la tabla pivote).
     */
    public function almacenes(): BelongsToMany
    {
        return $this->belongsToMany(Almacen::class, 'producto_almacen')
                    ->withPivot('stock_actual')
                    ->withTimestamps();
    }

    /**
     * Un producto tiene muchos movimientos en el kardex.
     */
    public function kardexMovimientos(): HasMany
    {
        return $this->hasMany(KardexMovimiento::class, 'producto_id');
    }
}
