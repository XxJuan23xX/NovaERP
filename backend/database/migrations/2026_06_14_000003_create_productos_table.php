<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla principal del catálogo de productos.
     * NOTA: precio_compra es de acceso restringido (solo admin).
     * El stock físico se maneja en la tabla pivote 'producto_almacen'.
     */
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();

            // Identificadores únicos del producto
            $table->string('sku', 50)->unique()->comment('Stock Keeping Unit - código interno');
            $table->string('nombre', 200);
            $table->string('descripcion', 500)->nullable();

            // Relaciones de catálogo
            $table->foreignId('categoria_id')
                  ->constrained('categorias')
                  ->noActionOnDelete();
            $table->foreignId('marca_id')
                  ->constrained('marcas')
                  ->noActionOnDelete();

            // Precios - precio_compra es SENSIBLE (solo admin puede verlo)
            $table->decimal('precio_compra', 18, 2)->comment('Costo de adquisición - RESTRINGIDO a admin');
            $table->decimal('precio_venta', 18, 2)->comment('Precio de venta al público');

            // Configuración de stock
            $table->integer('stock_minimo')->default(0)->comment('Umbral para alertas de reabastecimiento');
            $table->string('unidad_medida', 30)->default('pieza')->comment('pieza, kg, litro, metro, etc.');

            // Estado
            $table->boolean('activo')->default(true);

            $table->timestamps();
            $table->softDeletes(); // Para eliminación lógica en lugar de física
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
