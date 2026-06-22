<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Traspaso extends Model
{
    use HasFactory;

    protected $table = 'traspasos';

    protected $fillable = [
        'codigo_traspaso',
        'almacen_origen_id',
        'almacen_destino_id',
        'user_id',
        'estado',
        'fecha_envio',
        'fecha_recepcion',
    ];

    protected $casts = [
        'fecha_envio' => 'datetime',
        'fecha_recepcion' => 'datetime',
    ];

    public function almacenOrigen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(TraspasoDetalle::class, 'traspaso_id');
    }
}
