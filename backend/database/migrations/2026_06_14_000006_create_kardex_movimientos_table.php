<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla de auditoría de movimientos de inventario (Kardex).
     * REGLA DE ORO: Toda variación de stock debe nacer aquí.
     * Un Observer escucha cada INSERT en esta tabla y actualiza 'producto_almacen'.
     *
     * Tipos de movimiento soportados:
     *  - ENTRADA_COMPRA    : Recepción de mercancía por compra
     *  - ENTRADA_AJUSTE    : Ajuste positivo manual (admin)
     *  - SALIDA_MERMA      : Pérdida por daño, caducidad, etc.
     *  - SALIDA_ROBO       : Pérdida por robo o extravío
     *  - SALIDA_AJUSTE     : Ajuste negativo manual (admin)
     */
    public function up(): void
    {
        Schema::create('kardex_movimientos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('producto_id')
                  ->constrained('productos')
                  ->noActionOnDelete();
            $table->foreignId('almacen_id')
                  ->constrained('almacenes')
                  ->noActionOnDelete();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->noActionOnDelete()
                  ->comment('Usuario que generó el movimiento');

            // Clasificación del movimiento
            $table->string('tipo_movimiento', 30)
                  ->comment('ENTRADA_COMPRA | ENTRADA_AJUSTE | SALIDA_MERMA | SALIDA_ROBO | SALIDA_AJUSTE');

            // Cantidades y saldos
            $table->integer('cantidad')->comment('Positivo siempre; el tipo_movimiento define la dirección');
            $table->integer('stock_anterior')->comment('Stock antes del movimiento (snapshot inmutable)');
            $table->integer('stock_posterior')->comment('Stock después del movimiento (snapshot inmutable)');

            // Información de costos en el momento del movimiento (para trazabilidad)
            $table->decimal('costo_unitario', 18, 2)->nullable()
                  ->comment('Precio de compra al momento del movimiento');

            // Documentación del movimiento
            $table->string('motivo', 255)->nullable()->comment('Descripción o justificación del movimiento');
            $table->string('referencia_documento', 100)->nullable()
                  ->comment('Número de factura, orden de compra, etc.');

            // Esta tabla es inmutable: no tiene updated_at ni softDeletes
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kardex_movimientos');
    }
};
