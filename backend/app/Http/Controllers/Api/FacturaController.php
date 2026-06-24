<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Factura;
use App\Models\Venta;
use App\Services\FacturacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class FacturaController extends Controller
{
    protected $facturacionService;

    public function __construct(FacturacionService $facturacionService)
    {
        $this->facturacionService = $facturacionService;
    }

    /**
     * GET /api/facturas
     *
     * Listado e historial de facturas emitidas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Factura::with('venta.cliente')
            ->orderBy('created_at', 'desc');

        // Búsqueda por RFC o Razón Social
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('rfc_receptor', 'like', "%{$busqueda}%")
                  ->orWhere('razon_social_receptor', 'like', "%{$busqueda}%")
                  ->orWhere('uuid', 'like', "%{$busqueda}%");
            });
        }

        // Filtrado por status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min($request->integer('per_page', 15), 100);
        $facturas = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $facturas
        ]);
    }

    /**
     * POST /api/facturas/emitir
     *
     * Emite la factura CFDI 4.0 de una venta.
     */
    public function emitir(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'venta_id' => 'required|integer|exists:ventas,id',
            'forma_pago' => 'required|string|max:2', // 01, 03, 04, etc.
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos de facturación inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        $ventaId = $request->input('venta_id');
        $formaPago = $request->input('forma_pago');

        // Verificar si la venta ya fue facturada
        $facturaExistente = Factura::where('venta_id', $ventaId)->first();
        if ($facturaExistente) {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta venta ya cuenta con una factura emitida previamente.',
                'data' => $facturaExistente
            ], 422);
        }

        $venta = Venta::with('cliente.vendedor')->findOrFail($ventaId);

        try {
            $factura = $this->facturacionService->emitirFactura($venta, $formaPago);

            return response()->json([
                'status' => 'success',
                'message' => 'Factura CFDI 4.0 emitida correctamente.',
                'data' => $factura
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al emitir la factura fiscal.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/facturas/{id}/cancelar
     *
     * Cancela la factura simulada.
     */
    public function cancelar(int $id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'motivo' => 'required|string|in:01,02,03,04', // Motivos oficiales del SAT
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Motivo de cancelación inválido.',
                'errors' => $validator->errors()
            ], 422);
        }

        $factura = Factura::findOrFail($id);

        if ($factura->status === 'cancelada') {
            return response()->json([
                'status' => 'error',
                'message' => 'La factura ya se encuentra cancelada.'
            ], 422);
        }

        try {
            $this->facturacionService->cancelarFactura($factura, $request->input('motivo'));

            return response()->json([
                'status' => 'success',
                'message' => 'Factura cancelada correctamente ante el SAT.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cancelar la factura.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/facturas/{id}/validar-sat
     *
     * Valida la factura consultando el Web Service SOAP oficial del SAT.
     */
    public function validarSat(int $id): JsonResponse
    {
        $factura = Factura::with('venta')->findOrFail($id);

        try {
            $resultado = $this->facturacionService->validarConSAT($factura);
            return response()->json($resultado);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo validar el comprobante con el Web Service del SAT.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/facturas/{id}/descargar-xml
     *
     * Descarga el archivo XML CFDI 4.0.
     */
    public function descargarXml(int $id)
    {
        $factura = Factura::findOrFail($id);

        if (!Storage::disk('local')->exists($factura->xml_path)) {
            abort(404, 'Archivo XML no encontrado.');
        }

        $fileName = "CFDI_4.0_{$factura->serie}_{$factura->folio}_{$factura->uuid}.xml";

        return response()->streamDownload(function () use ($factura) {
            echo Storage::disk('local')->get($factura->xml_path);
        }, $fileName, [
            'Content-Type' => 'application/xml',
        ]);
    }

    /**
     * GET /api/facturas/{id}/descargar-pdf
     *
     * Descarga u obtiene la representación impresa en formato HTML/PDF.
     */
    public function descargarPdf(int $id)
    {
        $factura = Factura::findOrFail($id);

        if (!Storage::disk('local')->exists($factura->pdf_path)) {
            abort(404, 'Representación impresa de la factura no encontrada.');
        }

        // Devolvemos el HTML con cabeceras de visualización web
        return response(Storage::disk('local')->get($factura->pdf_path), 200, [
            'Content-Type' => 'text/html; charset=utf-8'
        ]);
    }
}
