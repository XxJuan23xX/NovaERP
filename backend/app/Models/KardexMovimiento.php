<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KardexMovimiento extends Model
{
    protected $table = 'kardex_movimientos';

    /**
     * Esta tabla es de SOLO INSERCIÓN (append-only / immutable log).
     * Nunca se actualiza ni se elimina un registro del Kardex.
     * Por eso deshabilitamos updated_at.
     */
    const UPDATED_AT = null;

    // Tipos de movimiento disponibles (constantes de dominio)
    const TIPO_ENTRADA_COMPRA = 'ENTRADA_COMPRA';
    const TIPO_ENTRADA_AJUSTE = 'ENTRADA_AJUSTE';
    const TIPO_ENTRADA_TRASPASO = 'ENTRADA_TRASPASO';
    const TIPO_SALIDA_MERMA   = 'SALIDA_MERMA';
    const TIPO_SALIDA_ROBO    = 'SALIDA_ROBO';
    const TIPO_SALIDA_AJUSTE  = 'SALIDA_AJUSTE';
    const TIPO_SALIDA_VENTA   = 'SALIDA_VENTA';
    const TIPO_SALIDA_TRASPASO = 'SALIDA_TRASPASO';

    protected $fillable = [
        'producto_id',
        'almacen_id',
        'user_id',
        'tipo_movimiento',
        'cantidad',
        'stock_anterior',
        'stock_posterior',
        'costo_unitario',
        'motivo',
        'referencia_documento',
    ];

    protected $casts = [
        'costo_unitario' => 'decimal:2',
        'created_at'     => 'datetime',
    ];

    // ─── Relaciones ──────────────────────────────────────────────────────────

    /**
     * Cada movimiento pertenece a un producto.
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    /**
     * Cada movimiento pertenece a un almacén.
     */
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    /**
     * Cada movimiento fue creado por un usuario.
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // ─── Helpers de dominio ───────────────────────────────────────────────────

    /**
     * Retorna todos los tipos de movimiento válidos.
     */
    public static function tiposValidos(): array
    {
        return [
            self::TIPO_ENTRADA_COMPRA,
            self::TIPO_ENTRADA_AJUSTE,
            self::TIPO_ENTRADA_TRASPASO,
            self::TIPO_SALIDA_MERMA,
            self::TIPO_SALIDA_ROBO,
            self::TIPO_SALIDA_AJUSTE,
            self::TIPO_SALIDA_VENTA,
            self::TIPO_SALIDA_TRASPASO,
        ];
    }

    /**
     * Determina si el tipo de movimiento es una entrada (incrementa stock).
     */
    public function esEntrada(): bool
    {
        return str_starts_with($this->tipo_movimiento, 'ENTRADA_');
    }
}
