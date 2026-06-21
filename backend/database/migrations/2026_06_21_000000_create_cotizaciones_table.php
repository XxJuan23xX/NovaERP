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
        Schema::create('cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 50)->unique();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->noActionOnDelete();
            $table->foreignId('vendedor_id')->constrained('users')->noActionOnDelete();
            $table->date('fecha_emision');
            $table->date('fecha_vigencia');
            $table->decimal('subtotal', 18, 2);
            $table->decimal('iva', 18, 2);
            $table->decimal('total', 18, 2);
            $table->string('estado', 30)->default('vigente'); // borrador, vigente, vencida, convertida
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('cotizacion_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_id')->constrained('cotizaciones')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->noActionOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_unitario', 18, 2);
            $table->decimal('descuento_porcentaje', 5, 2)->default(0.00);
            $table->decimal('total', 18, 2);
            $table->timestamps();
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->foreignId('cotizacion_id')->nullable()->constrained('cotizaciones')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign(['cotizacion_id']);
            $table->dropColumn('cotizacion_id');
        });

        Schema::dropIfExists('cotizacion_detalles');
        Schema::dropIfExists('cotizaciones');
    }
};
