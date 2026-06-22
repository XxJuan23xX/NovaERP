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
        Schema::create('traspasos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_traspaso', 50)->unique();
            $table->unsignedBigInteger('almacen_origen_id');
            $table->unsignedBigInteger('almacen_destino_id');
            $table->unsignedBigInteger('user_id');
            $table->string('estado', 30)->default('en_transito'); // en_transito, recibido, rechazado (string for flexibility with SQL Server)
            $table->timestamp('fecha_envio')->useCurrent();
            $table->timestamp('fecha_recepcion')->nullable();
            $table->timestamps();

            // Foreign Key Definitions (no cascade to avoid conflicts in SQL Server)
            $table->foreign('almacen_origen_id')->references('id')->on('almacenes');
            $table->foreign('almacen_destino_id')->references('id')->on('almacenes');
            $table->foreign('user_id')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('traspasos');
    }
};
