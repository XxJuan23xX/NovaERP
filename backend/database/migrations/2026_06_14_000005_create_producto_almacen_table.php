<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla pivote que registra el stock actual de cada producto por almacén.
     * REGLA DE ORO: Este valor NUNCA se actualiza directamente con UPDATE.
     * Solo se modifica a través de un Observer disparado por 'kardex_movimientos'.
     */
    public function up(): void
    {
        Schema::create('producto_almacen', function (Blueprint $table) {
            $table->id();

            $table->foreignId('producto_id')
                  ->constrained('productos')
                  ->cascadeOnDelete();
            $table->foreignId('almacen_id')
                  ->constrained('almacenes')
                  ->cascadeOnDelete();

            // Stock actual calculado y mantenido por KardexMovimientoObserver
            $table->integer('stock_actual')->default(0)->comment('Actualizado SOLO por Observer del Kardex');

            $table->timestamps();

            // Garantizamos que no existan duplicados producto-almacén
            $table->unique(['producto_id', 'almacen_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_almacen');
    }
};
