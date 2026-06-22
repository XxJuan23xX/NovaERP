<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TraspasoDetalle extends Model
{
    use HasFactory;

    protected $table = 'traspaso_detalles';

    protected $fillable = [
        'traspaso_id',
        'producto_id',
        'cantidad',
    ];

    protected $casts = [
        'cantidad' => 'float',
    ];

    public function traspaso(): BelongsTo
    {
        return $this->belongsTo(Traspaso::class, 'traspaso_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
