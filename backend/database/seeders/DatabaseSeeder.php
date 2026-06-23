<?php

namespace Database\Seeders;

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\KardexMovimiento;
use App\Models\Marca;
use App\Models\Producto;
use App\Models\User;
use App\Models\Caja;
use App\Models\SesionCaja;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Services\InventarioService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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

        $producto3 = Producto::firstOrCreate(
            ['sku' => 'ACC-APP-20W'],
            [
                'nombre'        => 'Cargador Apple USB-C 20W',
                'descripcion'   => 'Cargador de pared Apple de 20W USB-C',
                'categoria_id'  => $catAccesorios->id,
                'marca_id'      => $marcaApple->id,
                'precio_compra' => 15.00,
                'precio_venta'  => 25.00,
                'stock_minimo'  => 10,
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

        // Registrar stock inicial para Cargador Apple en Almacén Central
        $tieneMovimientos3 = KardexMovimiento::where('producto_id', $producto3->id)
            ->where('almacen_id', $almacenCentral->id)
            ->exists();

        if (!$tieneMovimientos3) {
            $inventarioService->registrarMovimiento(
                productoId:          $producto3->id,
                almacenId:           $almacenCentral->id,
                userId:              $admin->id,
                tipoMovimiento:      KardexMovimiento::TIPO_ENTRADA_COMPRA,
                cantidad:            50,
                motivo:              'Carga inicial de inventario por compra',
                referenciaDocumento: 'OC-0003',
                costoUnitario:       15.00
            );
        }

        // ─── 7. Módulo Cierre de Caja: Caja, Sesiones de caja y Ventas ─────────
        // Limpiamos los registros de ventas de prueba para evitar duplicaciones
        DB::table('venta_detalles')->delete();
        DB::table('ventas')->delete();
        DB::table('sesiones_caja')->delete();
        DB::table('cajas')->delete();
        DB::table('cotizaciones')->delete();
        DB::table('clientes')->delete();

        // Crear Caja Principal
        $caja = Caja::create([
            'nombre'     => 'Caja Principal 01',
            'almacen_id' => $almacenCentral->id,
            'activo'     => true,
        ]);

        // Helper para registrar las ventas consolidadas
        $registrarVentaAux = function ($ticket, $user, $almacen, $sesion, $total, $metodoPago, $fecha, $producto, $estado = 'completada') {
            $subtotal = round($total / 1.16, 2);
            $iva = round($total - $subtotal, 2);
            
            $venta = Venta::create([
                'numero_ticket'  => $ticket,
                'sesion_caja_id' => $sesion->id,
                'user_id'        => $user->id,
                'almacen_id'     => $almacen->id,
                'subtotal'       => $subtotal,
                'iva'            => $iva,
                'total'          => $total,
                'metodo_pago'    => $metodoPago,
                'estado'         => $estado,
                'created_at'     => $fecha,
                'updated_at'     => $fecha,
            ]);

            VentaDetalle::create([
                'venta_id'        => $venta->id,
                'producto_id'     => $producto->id,
                'cantidad'        => 1,
                'precio_unitario' => $subtotal,
                'subtotal'        => $subtotal,
                'created_at'      => $fecha,
                'updated_at'      => $fecha,
            ]);
        };

        // Generar sesiones y ventas para los últimos 7 días (miércoles a martes hoy)
        $salesMock = [
            6 => 10200.00, // Miércoles (6 días atrás)
            5 => 12400.00, // Jueves (5 días atrás)
            4 => 15800.00, // Viernes (4 días atrás)
            3 => 18900.00, // Sábado (3 días atrás)
            2 => 7500.00,  // Domingo (2 días atrás)
            1 => 13200.00, // Lunes (1 día atrás)
            0 => 15650.00  // Martes (Hoy)
        ];

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $isToday = ($i === 0);

            // Crear sesión de caja para ese día
            $sesion = SesionCaja::create([
                'caja_id'         => $caja->id,
                'user_id'         => $admin->id,
                'fondo_inicial'   => 5000.00,
                'estado'          => $isToday ? 'abierta' : 'cerrada',
                'fecha_apertura'  => (clone $date)->addHours(9),
                'fecha_cierre'    => $isToday ? null : (clone $date)->addHours(18),
                'efectivo_real'   => $isToday ? 0 : 5000.00 + ($salesMock[$i] * 0.4),
                'descuadre'       => 0,
                'created_at'      => $date,
                'updated_at'      => $date,
            ]);

            // Distribuir el monto total de ventas del día en dos transacciones
            $totalDelDia = $salesMock[$i];
            
            // Distribuir productos para diversificar categorías
            $p1 = ($i % 3 === 0) ? $producto1 : (($i % 3 === 1) ? $producto2 : $producto3);
            $p2 = ($i % 3 === 0) ? $producto2 : (($i % 3 === 1) ? $producto3 : $producto1);
            $p3 = ($i % 3 === 0) ? $producto3 : (($i % 3 === 1) ? $producto1 : $producto2);

            // Venta 1 (Efectivo)
            $montoEfectivo = round($totalDelDia * 0.4, 2);
            $registrarVentaAux("V-{$date->format('md')}1", $admin, $almacenCentral, $sesion, $montoEfectivo, 'efectivo', (clone $date)->addHours(11), $p1);

            // Venta 2 (Tarjeta)
            $montoTarjeta = round($totalDelDia * 0.6, 2);
            $registrarVentaAux("V-{$date->format('md')}2", $empleado, $almacenCentral, $sesion, $montoTarjeta, 'tarjeta', (clone $date)->addHours(15), $p2);
            
            // Agregar una venta cancelada (para dar realismo a los indicadores de cancelaciones)
            $montoCancelado = round($totalDelDia * 0.1, 2);
            $registrarVentaAux("V-{$date->format('md')}3", $admin, $almacenCentral, $sesion, $montoCancelado, 'efectivo', (clone $date)->addHours(16), $p3, 'cancelada');
        }

        // ─── 8. Módulo Clientes (CRM) ─────────────────────────────────────────
        $c1 = \App\Models\Cliente::create([
            'nombre_razon_social' => 'Empresa Acme S.A.',
            'telefono' => '5512345678',
            'email' => 'jhdz@acme.mx',
            'rfc' => 'EAC980101XYZ',
            'regimen_fiscal' => '601',
            'uso_cfdi' => 'G03',
            'codigo_postal_fiscal' => '06000',
            'direccion_fiscal_calle' => 'Av. Juárez',
            'direccion_fiscal_num_ext' => '100',
            'direccion_fiscal_num_int' => null,
            'direccion_fiscal_colonia' => 'Centro',
            'direccion_fiscal_municipio' => 'Cuauhtémoc',
            'direccion_fiscal_estado' => 'CDMX',
            'tipo_cliente' => 'Mayorista',
            'limite_credito' => 50000.00,
            'vendedor_id' => $admin->id,
        ]);

        $c2 = \App\Models\Cliente::create([
            'nombre_razon_social' => 'Tecnosoluciones MX',
            'telefono' => '8112345678',
            'email' => 'marta@tecno.mx',
            'rfc' => 'TMX120305ABC',
            'regimen_fiscal' => '601',
            'uso_cfdi' => 'G01',
            'codigo_postal_fiscal' => '64000',
            'direccion_fiscal_calle' => 'Av. Constitución',
            'direccion_fiscal_num_ext' => '450',
            'direccion_fiscal_num_int' => 'Piso 3',
            'direccion_fiscal_colonia' => 'Obrera',
            'direccion_fiscal_municipio' => 'Monterrey',
            'direccion_fiscal_estado' => 'Nuevo León',
            'tipo_cliente' => 'Mayorista',
            'limite_credito' => 30000.00,
            'vendedor_id' => $empleado->id,
        ]);

        $c3 = \App\Models\Cliente::create([
            'nombre_razon_social' => 'Distribuidora Norte',
            'telefono' => '6641234567',
            'email' => 'pablo@disnorte.mx',
            'rfc' => 'DNO150610JKL',
            'regimen_fiscal' => '612',
            'uso_cfdi' => 'I01',
            'codigo_postal_fiscal' => '22000',
            'direccion_fiscal_calle' => 'Blvd. Agua Caliente',
            'direccion_fiscal_num_ext' => '800',
            'direccion_fiscal_num_int' => null,
            'direccion_fiscal_colonia' => 'Madero',
            'direccion_fiscal_municipio' => 'Tijuana',
            'direccion_fiscal_estado' => 'Baja California',
            'tipo_cliente' => 'Minorista',
            'limite_credito' => 20000.00,
            'vendedor_id' => $empleado->id,
        ]);

        // Este cliente se creará PENDIENTE (🟡) porque le faltarán algunos datos fiscales obligatorios
        $c4 = \App\Models\Cliente::create([
            'nombre_razon_social' => 'Servicios Globales',
            'telefono' => '3312345678',
            'email' => 'elena@globales.mx',
            'rfc' => 'SGL200820MNP',
            'regimen_fiscal' => '', // Faltante
            'uso_cfdi' => '',       // Faltante
            'codigo_postal_fiscal' => '44100',
            'direccion_fiscal_calle' => 'Av. Chapultepec',
            'direccion_fiscal_num_ext' => '220',
            'direccion_fiscal_num_int' => null,
            'direccion_fiscal_colonia' => 'Americana',
            'direccion_fiscal_municipio' => 'Guadalajara',
            'direccion_fiscal_estado' => 'Jalisco',
        ]);

        // ─── 9. Módulo Traspasos (Seeders) ───────────────────────────────────
        DB::table('traspaso_detalles')->delete();
        DB::table('traspasos')->delete();

        $t1 = \App\Models\Traspaso::create([
            'codigo_traspaso' => 'TR-10001',
            'almacen_origen_id' => $almacenCentral->id,
            'almacen_destino_id' => $almacenSucursal->id,
            'user_id' => $admin->id,
            'estado' => 'recibido',
            'fecha_envio' => now()->subDays(5),
            'fecha_recepcion' => now()->subDays(4),
        ]);

        \App\Models\TraspasoDetalle::create([
            'traspaso_id' => $t1->id,
            'producto_id' => $producto1->id,
            'cantidad' => 5,
        ]);

        $t2 = \App\Models\Traspaso::create([
            'codigo_traspaso' => 'TR-10002',
            'almacen_origen_id' => $almacenCentral->id,
            'almacen_destino_id' => $almacenSucursal->id,
            'user_id' => $admin->id,
            'estado' => 'en_transito',
            'fecha_envio' => now()->subHours(2),
            'fecha_recepcion' => null,
        ]);

        \App\Models\TraspasoDetalle::create([
            'traspaso_id' => $t2->id,
            'producto_id' => $producto2->id,
            'cantidad' => 2,
        ]);

        $t3 = \App\Models\Traspaso::create([
            'codigo_traspaso' => 'TR-10003',
            'almacen_origen_id' => $almacenSucursal->id,
            'almacen_destino_id' => $almacenCentral->id,
            'user_id' => $empleado->id,
            'estado' => 'rechazado',
            'fecha_envio' => now()->subDays(2),
            'fecha_recepcion' => now()->subDays(2),
        ]);

        \App\Models\TraspasoDetalle::create([
            'traspaso_id' => $t3->id,
            'producto_id' => $producto1->id,
            'cantidad' => 3,
        ]);
    }
}
