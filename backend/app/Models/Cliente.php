<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = [
        'nombre_razon_social',
        'telefono',
        'email',
        'rfc',
        'regimen_fiscal',
        'uso_cfdi',
        'codigo_postal_fiscal',
        'direccion_fiscal_calle',
        'direccion_fiscal_num_ext',
        'direccion_fiscal_num_int',
        'direccion_fiscal_colonia',
        'direccion_fiscal_municipio',
        'direccion_fiscal_estado',
        'tipo_cliente',
        'limite_credito',
        'vendedor_id',
    ];

    protected $appends = ['perfil_completo'];

    protected $casts = [
        'limite_credito' => 'decimal:2',
    ];

    /**
     * Devuelve true si todos los datos fiscales obligatorios están cargados.
     */
    public function getPerfilCompletoAttribute(): bool
    {
        return !empty($this->rfc) &&
               !empty($this->regimen_fiscal) &&
               !empty($this->uso_cfdi) &&
               !empty($this->codigo_postal_fiscal) &&
               !empty($this->direccion_fiscal_calle) &&
               !empty($this->direccion_fiscal_num_ext) &&
               !empty($this->direccion_fiscal_colonia) &&
               !empty($this->direccion_fiscal_municipio) &&
               !empty($this->direccion_fiscal_estado);
    }

    /**
     * Un cliente puede tener un vendedor asignado.
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Un cliente tiene muchas ventas asociadas.
     */
    public function ventas()
    {
        return $this->hasMany(Venta::class, 'cliente_id');
    }
}
