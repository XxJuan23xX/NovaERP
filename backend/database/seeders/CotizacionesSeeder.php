<?php

namespace Database\Seeders;

use App\Models\Cliente;
use App\Models\Cotizacion;
use App\Models\CotizacionDetalle;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Database\Seeder;

class CotizacionesSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiar tablas en orden de dependencia
        CotizacionDetalle::query()->delete();
        Cotizacion::query()->delete();

        $admin = User::where('email', 'admin@novaerp.com')->first();
        $c1 = Cliente::where('rfc', 'EAC980101XYZ')->first();
        $c2 = Cliente::where('rfc', 'TMX120305ABC')->first();
        $c3 = Cliente::where('rfc', 'DNO150610JKL')->first();
        $p1 = Producto::where('sku', 'LAP-LEN-IP3')->first(); 
        $p2 = Producto::where('sku', 'CEL-SAM-S24')->first(); 

        // COT-081
        $cot1 = Cotizacion::create([
            'folio' => 'COT-081',
            'cliente_id' => $c3 ? $c3->id : null,
            'vendedor_id' => $admin ? $admin->id : 1,
            'fecha_emision' => '2026-06-19',
            'fecha_vigencia' => '2026-06-26',
            'subtotal' => 75258.62,
            'iva' => 12041.38,
            'total' => 87300.00,
            'estado' => 'convertida',
            'observaciones' => 'Convertida a venta desde POS.',
        ]);
        if ($p2) {
            CotizacionDetalle::create([
                'cotizacion_id' => $cot1->id,
                'producto_id' => $p2->id,
                'cantidad' => 60, 
                'precio_unitario' => 1200.00,
                'descuento_porcentaje' => 0.00,
                'total' => 72000.00,
            ]);
        }

        // COT-082
        $cot2 = Cotizacion::create([
            'folio' => 'COT-082',
            'cliente_id' => null, 
            'vendedor_id' => $admin ? $admin->id : 1,
            'fecha_emision' => '2026-06-18',
            'fecha_vigencia' => '2026-06-20', 
            'subtotal' => 1810.34,
            'iva' => 289.66,
            'total' => 2100.00,
            'estado' => 'vencida',
            'observaciones' => 'Venta mostrador normal.',
        ]);
        if ($p1) {
            CotizacionDetalle::create([
                'cotizacion_id' => $cot2->id,
                'producto_id' => $p1->id,
                'cantidad' => 3,
                'precio_unitario' => 650.00,
                'descuento_porcentaje' => 0.00,
                'total' => 1950.00,
            ]);
        }

        // COT-083
        $cot3 = Cotizacion::create([
            'folio' => 'COT-083',
            'cliente_id' => $c2 ? $c2->id : null,
            'vendedor_id' => $admin ? $admin->id : 1,
            'fecha_emision' => '2026-06-19',
            'fecha_vigencia' => '2026-06-26',
            'subtotal' => 16982.76,
            'iva' => 2717.24,
            'total' => 19700.00,
            'estado' => 'vigente',
            'observaciones' => 'Descuento especial por volumen.',
        ]);
        if ($p1) {
            CotizacionDetalle::create([
                'cotizacion_id' => $cot3->id,
                'producto_id' => $p1->id,
                'cantidad' => 26,
                'precio_unitario' => 650.00,
                'descuento_porcentaje' => 0.00,
                'total' => 16900.00,
            ]);
        }

        // COT-084
        $cot4 = Cotizacion::create([
            'folio' => 'COT-084',
            'cliente_id' => $c1 ? $c1->id : null,
            'vendedor_id' => $admin ? $admin->id : 1,
            'fecha_emision' => '2026-06-19',
            'fecha_vigencia' => '2026-06-26',
            'subtotal' => 45172.41,
            'iva' => 7227.59,
            'total' => 52400.00,
            'estado' => 'vigente',
            'observaciones' => 'Entrega a domicilio incluida.',
        ]);
        if ($p2) {
            CotizacionDetalle::create([
                'cotizacion_id' => $cot4->id,
                'producto_id' => $p2->id,
                'cantidad' => 38,
                'precio_unitario' => 1200.00,
                'descuento_porcentaje' => 0.00,
                'total' => 45600.00,
            ]);
        }
    }
}
