<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Factura extends Model
{
    use HasFactory;

    protected $table = 'facturas';

    protected $fillable = [
        'venta_id',
        'uuid',
        'rfc_emisor',
        'razon_social_emisor',
        'regimen_fiscal_emisor',
        'rfc_receptor',
        'razon_social_receptor',
        'regimen_fiscal_receptor',
        'codigo_postal_receptor',
        'uso_cfdi',
        'metodo_pago',
        'forma_pago',
        'serie',
        'folio',
        'xml_path',
        'pdf_path',
        'status',
        'motivo_cancelacion'
    ];

    /**
     * Relación con la venta correspondiente.
     */
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }
}
