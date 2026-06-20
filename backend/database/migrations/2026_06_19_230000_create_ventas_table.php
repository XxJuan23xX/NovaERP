<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->string('numero_ticket', 50)->unique();
            $table->foreignId('user_id')->constrained('users')->noActionOnDelete();
            $table->foreignId('almacen_id')->constrained('almacenes')->noActionOnDelete();
            $table->decimal('subtotal', 18, 2);
            $table->decimal('iva', 18, 2);
            $table->decimal('total', 18, 2);
            $table->string('metodo_pago', 30); // efectivo, tarjeta, transferencia
            $table->timestamps();
        });

        Schema::create('venta_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->noActionOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_unitario', 18, 2);
            $table->decimal('subtotal', 18, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('venta_detalles');
        Schema::dropIfExists('ventas');
    }
};
