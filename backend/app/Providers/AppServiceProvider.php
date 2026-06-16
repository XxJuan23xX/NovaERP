<?php

namespace App\Providers;

use App\Models\KardexMovimiento;
use App\Observers\KardexMovimientoObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ─── Registro del Observer del Kardex ────────────────────────────────
        // Este observer implementa la "Regla de Oro del Inventario":
        // cada INSERT en kardex_movimientos dispara automáticamente la
        // actualización de stock en producto_almacen.
        KardexMovimiento::observe(KardexMovimientoObserver::class);
    }
}
