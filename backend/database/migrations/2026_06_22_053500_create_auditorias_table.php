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
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('modulo'); // e.g. inventario, ventas, clientes, usuarios, caja, cotizaciones, seguridad
            $table->string('accion'); // e.g. LOGIN, LOGOUT, CREAR, EDITAR, ELIMINAR, APERTURA, CIERRE, CONFIRMAR, AJUSTE
            $table->enum('severidad', ['info', 'warning', 'danger']);
            $table->string('descripcion', 500);
            $table->json('valores_anteriores')->nullable();
            $table->json('valores_nuevos')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auditorias');
    }
};
