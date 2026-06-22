<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Services\AuditoriaService;

class ClienteController extends Controller
{
    /**
     * GET /api/clientes
     *
     * Listado de clientes con filtros y agregados de compras.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cliente::with('vendedor');

        // Búsqueda por Nombre, Email o RFC
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre_razon_social', 'like', "%{$busqueda}%")
                  ->orWhere('email', 'like', "%{$busqueda}%")
                  ->orWhere('rfc', 'like', "%{$busqueda}%");
            });
        }

        // Filtro por tipo de cliente
        if ($tipoCliente = $request->query('tipo_cliente')) {
            $query->where('tipo_cliente', $tipoCliente);
        }

        // Obtener clientes con agregaciones de ventas completadas
        $clientes = $query
            ->withCount(['ventas as compras_count' => function ($q) {
                $q->where('estado', 'completada');
            }])
            ->withSum(['ventas as compras_total' => function ($q) {
                $q->where('estado', 'completada');
            }], 'total')
            ->withMax(['ventas as ultima_compra' => function ($q) {
                $q->where('estado', 'completada');
            }], 'created_at')
            ->orderBy('nombre_razon_social', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $clientes
        ]);
    }

    /**
     * POST /api/clientes
     *
     * Registrar un nuevo cliente.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre_razon_social' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'rfc' => ['required', 'string', 'regex:/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i'],
            'regimen_fiscal' => 'required|string|max:10',
            'uso_cfdi' => 'required|string|max:10',
            'codigo_postal_fiscal' => 'required|string|regex:/^[0-9]{5}$/',
            'direccion_fiscal_calle' => 'required|string|max:255',
            'direccion_fiscal_num_ext' => 'required|string|max:20',
            'direccion_fiscal_num_int' => 'nullable|string|max:20',
            'direccion_fiscal_colonia' => 'required|string|max:255',
            'direccion_fiscal_municipio' => 'required|string|max:255',
            'direccion_fiscal_estado' => 'required|string|max:255',
            'tipo_cliente' => ['required', 'string', Rule::in(['Mayorista', 'Minorista', 'Público General'])],
            'limite_credito' => 'required|numeric|min:0',
            'vendedor_id' => 'nullable|integer|exists:users,id',
        ], [
            'rfc.regex' => 'El formato del RFC es inválido (debe cumplir con el formato oficial del SAT con homoclave).',
            'codigo_postal_fiscal.regex' => 'El código postal debe constar de exactamente 5 dígitos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos del cliente inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        // Convertir RFC a mayúsculas
        $data['rfc'] = strtoupper($data['rfc']);

        $cliente = Cliente::create($data);

        // Registrar auditoría
        AuditoriaService::registrar(
            $request->user()->id,
            'clientes',
            'CREAR',
            'info',
            "Cliente creado: {$cliente->nombre_razon_social} (RFC: {$cliente->rfc})",
            null,
            $cliente->toArray()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente registrado correctamente.',
            'data' => $cliente
        ], 201);
    }

    /**
     * GET /api/clientes/{id}
     *
     * Ficha de detalle de un cliente con su historial de transacciones.
     */
    public function show(int $id): JsonResponse
    {
        $cliente = Cliente::with('vendedor')->findOrFail($id);

        // Historial de ventas / transacciones
        $transacciones = $cliente->ventas()
            ->select('id', 'numero_ticket', 'total', 'estado', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        // Calcular agregados rápidos para la cabecera del detalle
        $totalVendido = $cliente->ventas()->where('estado', 'completada')->sum('total');
        $comprasCount = $cliente->ventas()->where('estado', 'completada')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'cliente' => $cliente,
                'transacciones' => $transacciones,
                'resumen' => [
                    'total_compras' => (float) $totalVendido,
                    'cantidad_compras' => $comprasCount
                ]
            ]
        ]);
    }

    /**
     * PUT /api/clientes/{id}
     *
     * Actualizar datos del cliente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre_razon_social' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'rfc' => ['required', 'string', 'regex:/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i'],
            'regimen_fiscal' => 'required|string|max:10',
            'uso_cfdi' => 'required|string|max:10',
            'codigo_postal_fiscal' => 'required|string|regex:/^[0-9]{5}$/',
            'direccion_fiscal_calle' => 'required|string|max:255',
            'direccion_fiscal_num_ext' => 'required|string|max:20',
            'direccion_fiscal_num_int' => 'nullable|string|max:20',
            'direccion_fiscal_colonia' => 'required|string|max:255',
            'direccion_fiscal_municipio' => 'required|string|max:255',
            'direccion_fiscal_estado' => 'required|string|max:255',
            'tipo_cliente' => ['required', 'string', Rule::in(['Mayorista', 'Minorista', 'Público General'])],
            'limite_credito' => 'required|numeric|min:0',
            'vendedor_id' => 'nullable|integer|exists:users,id',
        ], [
            'rfc.regex' => 'El formato del RFC es inválido.',
            'codigo_postal_fiscal.regex' => 'El código postal debe constar de exactamente 5 dígitos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos del cliente inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['rfc'] = strtoupper($data['rfc']);

        $valoresAnteriores = $cliente->only(['nombre_razon_social', 'telefono', 'email', 'rfc', 'tipo_cliente', 'limite_credito']);
        
        $cliente->update($data);

        $valoresNuevos = $cliente->only(['nombre_razon_social', 'telefono', 'email', 'rfc', 'tipo_cliente', 'limite_credito']);

        // Registrar auditoría
        AuditoriaService::registrar(
            $request->user()->id,
            'clientes',
            'EDITAR',
            'info',
            "Cliente actualizado: {$cliente->nombre_razon_social} (RFC: {$cliente->rfc})",
            $valoresAnteriores,
            $valoresNuevos
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Datos del cliente actualizados correctamente.',
            'data' => $cliente
        ]);
    }

    /**
     * DELETE /api/clientes/{id}
     *
     * Eliminar cliente.
     */
    public function destroy(int $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);

        // Verificar si tiene transacciones registradas
        if ($cliente->ventas()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar el cliente porque tiene transacciones registradas.'
            ], 422);
        }

        $valoresAnteriores = $cliente->toArray();

        $cliente->delete();

        // Registrar auditoría
        AuditoriaService::registrar(
            request()->user()->id,
            'clientes',
            'ELIMINAR',
            'danger',
            "Cliente eliminado: {$cliente->nombre_razon_social} (RFC: {$cliente->rfc})",
            $valoresAnteriores,
            null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente eliminado correctamente.'
        ]);
    }
}
