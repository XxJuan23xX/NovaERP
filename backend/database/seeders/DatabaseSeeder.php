<?php

namespace Database\Seeders;

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\KardexMovimiento;
use App\Models\Marca;
use App\Models\Producto;
use App\Models\User;
use App\Services\InventarioService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ─── 1. Crear Usuarios de prueba (RBAC) ─────────────────────────────
        $admin = User::firstOrCreate(
            ['email' => 'admin@novaerp.com'],
            [
                'name'     => 'Administrador NovaERP',
                'password' => Hash::make('admin123'),
                'role'     => 'admin',
                'sucursal' => 'Matriz',
            ]
        );

        $empleado = User::firstOrCreate(
            ['email' => 'empleado@novaerp.com'],
            [
                'name'     => 'Empleado Ventas',
                'password' => Hash::make('empleado123'),
                'role'     => 'empleado',
                'sucursal' => 'Sucursal Norte',
            ]
        );

        // ─── 2. Categorías por defecto ───────────────────────────────────────
        $catElectronica = Categoria::firstOrCreate(['nombre' => 'Electrónica'], ['descripcion' => 'Dispositivos electrónicos generales']);
        $catComputacion = Categoria::firstOrCreate(['nombre' => 'Computación'], ['descripcion' => 'Laptops, desktops y componentes']);
        $catAccesorios  = Categoria::firstOrCreate(['nombre' => 'Accesorios'], ['descripcion' => 'Cables, cargadores y periféricos']);

        // ─── 3. Marcas por defecto ───────────────────────────────────────────
        $marcaApple   = Marca::firstOrCreate(['nombre' => 'Apple'], ['descripcion' => 'Productos Apple Inc.']);
        $marcaSamsung = Marca::firstOrCreate(['nombre' => 'Samsung'], ['descripcion' => 'Electrónica Samsung']);
        $marcaLenovo  = Marca::firstOrCreate(['nombre' => 'Lenovo'], ['descripcion' => 'Computadoras Lenovo']);

        // ─── 4. Almacenes por defecto ────────────────────────────────────────
        $almacenCentral = Almacen::firstOrCreate(
            ['nombre' => 'Almacén Central'],
            ['direccion' => 'Av. Principal #100, Col. Centro', 'responsable' => 'Ing. Juan Pérez']
        );
        $almacenSucursal = Almacen::firstOrCreate(
            ['nombre' => 'Sucursal Norte'],
            ['direccion' => 'Blvd. Norte #450, Col. Industrial', 'responsable' => 'María López']
        );

        // ─── 5. Productos por defecto ────────────────────────────────────────
        $producto1 = Producto::firstOrCreate(
            ['sku' => 'LAP-LEN-IP3'],
            [
                'nombre'        => 'Laptop Lenovo IdeaPad 3',
                'descripcion'   => 'Laptop de 15.6 pulgadas con procesador AMD Ryzen 5, 8GB RAM, 256GB SSD',
                'categoria_id'  => $catComputacion->id,
                'marca_id'      => $marcaLenovo->id,
                'precio_compra' => 450.00,  // Restringido
                'precio_venta'  => 650.00,
                'stock_minimo'  => 5,
                'unidad_medida' => 'pieza',
                'activo'        => true,
            ]
        );

        $producto2 = Producto::firstOrCreate(
            ['sku' => 'CEL-SAM-S24'],
            [
                'nombre'        => 'Samsung Galaxy S24 Ultra',
                'descripcion'   => 'Smartphone de gama alta con 256GB de almacenamiento y cámara de 200MP',
                'categoria_id'  => $catElectronica->id,
                'marca_id'      => $marcaSamsung->id,
                'precio_compra' => 850.00,  // Restringido
                'precio_venta'  => 1200.00,
                'stock_minimo'  => 3,
                'unidad_medida' => 'pieza',
                'activo'        => true,
            ]
        );

        // ─── 6. Inicializar Stock vía InventarioService (Regla de Oro) ───────
        $inventarioService = app(InventarioService::class);

        // Registrar stock inicial para Laptop Lenovo en Almacén Central
        // Primero verificamos si ya existe algún movimiento para evitar duplicar
        $tieneMovimientos1 = KardexMovimiento::where('producto_id', $producto1->id)
            ->where('almacen_id', $almacenCentral->id)
            ->exists();

        if (!$tieneMovimientos1) {
            $inventarioService->registrarMovimiento(
                productoId:          $producto1->id,
                almacenId:           $almacenCentral->id,
                userId:              $admin->id,
                tipoMovimiento:      KardexMovimiento::TIPO_ENTRADA_COMPRA,
                cantidad:            15,
                motivo:              'Carga inicial de inventario por compra',
                referenciaDocumento: 'OC-0001',
                costoUnitario:       450.00
            );
        }

        // Registrar stock inicial para Samsung Galaxy en Sucursal Norte
        $tieneMovimientos2 = KardexMovimiento::where('producto_id', $producto2->id)
            ->where('almacen_id', $almacenSucursal->id)
            ->exists();

        if (!$tieneMovimientos2) {
            $inventarioService->registrarMovimiento(
                productoId:          $producto2->id,
                almacenId:           $almacenSucursal->id,
                userId:              $admin->id,
                tipoMovimiento:      KardexMovimiento::TIPO_ENTRADA_COMPRA,
                cantidad:            10,
                motivo:              'Carga inicial de inventario por compra',
                referenciaDocumento: 'OC-0002',
                costoUnitario:       850.00
            );
        }
    }
}
