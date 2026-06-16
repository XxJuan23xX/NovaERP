<?php

namespace App\Services;

use App\Models\KardexMovimiento;
use App\Models\Producto;
use App\Models\Almacen;
use Illuminate\Support\Facades\DB;

class InventarioService
{
    /**
     * Registra un movimiento en el Kardex y actualiza el stock vía Observer.
     *
     * Este es el punto de entrada ÚNICO para cualquier variación de stock.
     * El controlador llama a este servicio; el servicio crea el KardexMovimiento;
     * el Observer actualiza producto_almacen automáticamente.
     *
     * @param  int     $productoId
     * @param  int     $almacenId
     * @param  int     $userId         Usuario autenticado que hace el movimiento
     * @param  string  $tipoMovimiento Constante de KardexMovimiento::TIPO_*
     * @param  int     $cantidad       Siempre positivo; el tipo define la dirección
     * @param  string|null $motivo
     * @param  string|null $referenciaDocumento
     * @param  float|null  $costoUnitario
     * @return KardexMovimiento
     *
     * @throws \InvalidArgumentException Si el tipo de movimiento es inválido
     * @throws \RuntimeException         Si no hay suficiente stock para una salida
     */
    public function registrarMovimiento(
        int $productoId,
        int $almacenId,
        int $userId,
        string $tipoMovimiento,
        int $cantidad,
        ?string $motivo = null,
        ?string $referenciaDocumento = null,
        ?float $costoUnitario = null
    ): KardexMovimiento {
        // 1. Validar tipo de movimiento
        if (!in_array($tipoMovimiento, KardexMovimiento::tiposValidos())) {
            throw new \InvalidArgumentException(
                "Tipo de movimiento inválido: {$tipoMovimiento}"
            );
        }

        // 2. Obtener stock actual (con bloqueo pesimista para evitar race conditions)
        return DB::transaction(function () use (
            $productoId, $almacenId, $userId,
            $tipoMovimiento, $cantidad, $motivo,
            $referenciaDocumento, $costoUnitario
        ) {
            // Bloqueo pessimista: evita que dos requests simultáneos lean el mismo stock
            $pivote = DB::table('producto_almacen')
                        ->where('producto_id', $productoId)
                        ->where('almacen_id', $almacenId)
                        ->lockForUpdate()
                        ->first();

            $stockAnterior = $pivote ? $pivote->stock_actual : 0;

            // 3. Calcular stock posterior según dirección del movimiento
            $esEntrada = str_starts_with($tipoMovimiento, 'ENTRADA_');

            if ($esEntrada) {
                $stockPosterior = $stockAnterior + $cantidad;
            } else {
                // Validar que haya suficiente stock antes de la salida
                if ($stockAnterior < $cantidad) {
                    throw new \RuntimeException(
                        "Stock insuficiente. Stock actual: {$stockAnterior}, cantidad solicitada: {$cantidad}."
                    );
                }
                $stockPosterior = $stockAnterior - $cantidad;
            }

            // 4. Crear el movimiento en el Kardex
            // El Observer KardexMovimientoObserver::created() se dispara automáticamente
            // y actualiza la tabla producto_almacen con el nuevo stock_posterior.
            $movimiento = KardexMovimiento::create([
                'producto_id'          => $productoId,
                'almacen_id'           => $almacenId,
                'user_id'              => $userId,
                'tipo_movimiento'      => $tipoMovimiento,
                'cantidad'             => $cantidad,
                'stock_anterior'       => $stockAnterior,
                'stock_posterior'      => $stockPosterior,
                'costo_unitario'       => $costoUnitario,
                'motivo'               => $motivo,
                'referencia_documento' => $referenciaDocumento,
            ]);

            return $movimiento;
        });
    }
}
