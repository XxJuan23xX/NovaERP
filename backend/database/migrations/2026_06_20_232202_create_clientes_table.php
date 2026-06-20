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
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_razon_social');
            $table->string('telefono')->nullable();
            $table->string('email')->nullable();
            
            // Datos Fiscales
            $table->string('rfc');
            $table->string('regimen_fiscal');
            $table->string('uso_cfdi');
            $table->string('codigo_postal_fiscal');
            
            // Dirección Fiscal
            $table->string('direccion_fiscal_calle');
            $table->string('direccion_fiscal_num_ext');
            $table->string('direccion_fiscal_num_int')->nullable();
            $table->string('direccion_fiscal_colonia');
            $table->string('direccion_fiscal_municipio');
            $table->string('direccion_fiscal_estado');
            
            // Datos Comerciales
            $table->string('tipo_cliente')->default('Público General');
            $table->decimal('limite_credito', 18, 2)->default(0.00);
            $table->foreignId('vendedor_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
