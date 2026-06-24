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
        Schema::create('facturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->string('uuid', 36)->unique();
            $table->string('rfc_emisor', 13);
            $table->string('razon_social_emisor');
            $table->string('regimen_fiscal_emisor', 3);
            $table->string('rfc_receptor', 13);
            $table->string('razon_social_receptor');
            $table->string('regimen_fiscal_receptor', 3);
            $table->string('codigo_postal_receptor', 5);
            $table->string('uso_cfdi', 3);
            $table->string('metodo_pago', 3)->default('PUE');
            $table->string('forma_pago', 2);
            $table->string('serie')->nullable();
            $table->integer('folio')->nullable();
            $table->string('xml_path');
            $table->string('pdf_path');
            $table->string('status')->default('vigente'); // 'vigente' o 'cancelada'
            $table->string('motivo_cancelacion', 2)->nullable(); // 01, 02, 03, 04 del SAT
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facturas');
    }
};
