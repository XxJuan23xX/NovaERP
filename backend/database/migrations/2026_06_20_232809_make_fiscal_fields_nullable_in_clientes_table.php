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
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('rfc')->nullable()->change();
            $table->string('regimen_fiscal')->nullable()->change();
            $table->string('uso_cfdi')->nullable()->change();
            $table->string('codigo_postal_fiscal')->nullable()->change();
            $table->string('direccion_fiscal_calle')->nullable()->change();
            $table->string('direccion_fiscal_num_ext')->nullable()->change();
            $table->string('direccion_fiscal_colonia')->nullable()->change();
            $table->string('direccion_fiscal_municipio')->nullable()->change();
            $table->string('direccion_fiscal_estado')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('rfc')->nullable(false)->change();
            $table->string('regimen_fiscal')->nullable(false)->change();
            $table->string('uso_cfdi')->nullable(false)->change();
            $table->string('codigo_postal_fiscal')->nullable(false)->change();
            $table->string('direccion_fiscal_calle')->nullable(false)->change();
            $table->string('direccion_fiscal_num_ext')->nullable(false)->change();
            $table->string('direccion_fiscal_colonia')->nullable(false)->change();
            $table->string('direccion_fiscal_municipio')->nullable(false)->change();
            $table->string('direccion_fiscal_estado')->nullable(false)->change();
        });
    }
};
