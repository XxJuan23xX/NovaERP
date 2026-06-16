<?php

namespace App\Observers;

use App\Models\KardexMovimiento;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;

class KardexMovimientoObserver
{
    /**
     * Escucha el evento 'created' de cada KardexMovimiento.
     *
     * REGLA DE ORO: Este es el ÚNICO lugar donde se actualiza el stock en
     * la tabla 'producto_almacen'. Jamás se hace un UPDATE directo desde
     * controladores, servicios externos u otros lugares.
     *
     * El flujo es:
     * 1. Se inserta un KardexMovimiento (con stock_anterior y stock_posterior ya calculados).
     * 2. Este Observer detecta el INSERT.
     * 3. El Observer hace el upsert en producto_almacen con el nuevo stock.
     */
    public function created(KardexMovimiento $movimiento): void
    {
        // upsert: si ya existe la combinación producto+almacen, actualiza el stock.
        // Si no existe, la crea con el stock inicial.
        DB::table('producto_almacen')->upsert(
            [
                'producto_id'  => $movimiento->producto_id,
                'almacen_id'   => $movimiento->almacen_id,
                'stock_actual' => $movimiento->stock_posterior,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            // Columnas únicas para identificar el registro existente
            ['producto_id', 'almacen_id'],
            // Columnas a actualizar si el registro ya existe
            ['stock_actual', 'updated_at']
        );
    }
}
