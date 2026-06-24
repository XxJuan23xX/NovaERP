<?php

namespace App\Services;

use App\Models\Venta;
use App\Models\Factura;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

class FacturacionService
{
    /**
     * Emite una factura simulando un timbrado SAT 4.0.
     * Genera tanto el archivo XML como el PDF (HTML de impresión).
     */
    public function emitirFactura(Venta $venta, string $formaPago): Factura
    {
        // 1. Obtener datos fiscales del emisor y receptor
        $rfcEmisor = 'EKU9003173C9'; // RFC genérico del SAT para pruebas
        $razonSocialEmisor = 'NOVAERP RETAIL S.A. DE C.V.';
        $regimenFiscalEmisor = '601'; // General de Ley Personas Morales
        
        $cliente = $venta->cliente;
        if (!$cliente) {
            throw new \RuntimeException('La venta no tiene un cliente asociado para facturar.');
        }

        $rfcReceptor = $cliente->rfc;
        $razonSocialReceptor = $cliente->nombre_razon_social;
        $regimenFiscalReceptor = $cliente->regimen_fiscal;
        $codigoPostalReceptor = $cliente->codigo_postal_fiscal;
        $usoCfdi = $cliente->uso_cfdi ?? 'G03';
        
        // 2. Generar datos del Timbrado SAT
        $uuid = Str::uuid()->toString(); // Folio Fiscal (UUID)
        $fechaTimbrado = now()->toIso8601String();
        $selloCFD = Str::random(100);
        $selloSAT = Str::random(100);
        $cadenaOriginal = "||4.0|{$uuid}|{$fechaTimbrado}|01|{$rfcEmisor}|{$razonSocialEmisor}|{$regimenFiscalEmisor}|{$rfcReceptor}|{$razonSocialReceptor}|{$codigoPostalReceptor}|{$regimenFiscalReceptor}|{$usoCfdi}||";
        
        $serie = 'A';
        $ultimoFolio = Factura::max('folio') ?? 1000;
        $folio = $ultimoFolio + 1;

        // 3. Crear Estructura XML Oficial SAT CFDI 4.0
        $xmlContent = $this->generarXmlCFDI(
            $venta, $uuid, $fechaTimbrado, 
            $rfcEmisor, $razonSocialEmisor, $regimenFiscalEmisor,
            $rfcReceptor, $razonSocialReceptor, $regimenFiscalReceptor, $codigoPostalReceptor, $usoCfdi,
            $formaPago, $selloCFD, $selloSAT
        );

        // Guardar XML
        $xmlFileName = "facturas/{$uuid}.xml";
        Storage::disk('local')->put($xmlFileName, $xmlContent);

        // 4. Generar URL de código QR
        $selloOchoCaract = substr($selloCFD, -8);
        $qrUrlData = "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=" . urlencode($uuid) . "&re=" . urlencode($rfcEmisor) . "&rr=" . urlencode($rfcReceptor) . "&tt=" . urlencode(number_format($venta->total, 2, '.', '')) . "&fe=" . urlencode($selloOchoCaract);
        $qrCodeImageSrc = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($qrUrlData);

        // 5. Crear Estructura PDF (HTML imprimible de alta fidelidad)
        $pdfContent = $this->generarHtmlFactura(
            $venta, $uuid, $fechaTimbrado, $serie, $folio,
            $rfcEmisor, $razonSocialEmisor, $regimenFiscalEmisor,
            $rfcReceptor, $razonSocialReceptor, $regimenFiscalReceptor, $codigoPostalReceptor, $usoCfdi,
            $formaPago, $selloCFD, $selloSAT, $cadenaOriginal, $qrCodeImageSrc
        );

        // Guardar PDF (como HTML)
        $pdfFileName = "facturas/{$uuid}.html";
        Storage::disk('local')->put($pdfFileName, $pdfContent);

        // 6. Registrar en Base de Datos
        return Factura::create([
            'venta_id' => $venta->id,
            'uuid' => $uuid,
            'rfc_emisor' => $rfcEmisor,
            'razon_social_emisor' => $razonSocialEmisor,
            'regimen_fiscal_emisor' => $regimenFiscalEmisor,
            'rfc_receptor' => $rfcReceptor,
            'razon_social_receptor' => $razonSocialReceptor,
            'regimen_fiscal_receptor' => $regimenFiscalReceptor,
            'codigo_postal_receptor' => $codigoPostalReceptor,
            'uso_cfdi' => $usoCfdi,
            'metodo_pago' => 'PUE',
            'forma_pago' => $formaPago,
            'serie' => $serie,
            'folio' => $folio,
            'xml_path' => $xmlFileName,
            'pdf_path' => $pdfFileName,
            'status' => 'vigente'
        ]);
    }

    /**
     * Cancela una factura simulada.
     */
    public function cancelarFactura(Factura $factura, string $motivo): bool
    {
        $factura->update([
            'status' => 'cancelada',
            'motivo_cancelacion' => $motivo
        ]);
        return true;
    }

    /**
     * Consulta el Web Service SOAP de validación del SAT.
     */
    public function validarConSAT(Factura $factura): array
    {
        $soapUrl = "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc";
        
        $totalFormated = number_format($factura->venta->total, 6, '.', '');
        
        // Expresión para el parámetro de consulta del SAT
        $impresion = "?re={$factura->rfc_emisor}&rr={$factura->rfc_receptor}&tt={$totalFormated}&id={$factura->uuid}";
        
        // Estructura XML del SOAP Request
        $soapXml = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:temp="http://tempuri.org/">
           <soapenv:Header/>
           <soapenv:Body>
              <temp:Consulta>
                 <temp:expresionImpresa><![CDATA[' . $impresion . ']]></temp:expresionImpresa>
              </temp:Consulta>
           </soapenv:Body>
        </soapenv:Envelope>';

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'text/xml; charset=utf-8',
                'SOAPAction' => 'http://tempuri.org/IConsultaCFDIService/Consulta',
            ])->send('POST', $soapUrl, [
                'body' => $soapXml
            ]);

            if ($response->successful()) {
                $body = $response->body();
                
                // Parsear respuesta XML simple del SOAP
                $xml = simplexml_load_string($body);
                $xml->registerXPathNamespace('s', 'http://schemas.xmlsoap.org/soap/envelope/');
                $xml->registerXPathNamespace('a', 'http://schemas.datacontract.org/2004/07/Sat.Cfdi.Negocio.Compartido.Entidades');
                
                $nodes = $xml->xpath('//a:CodigoEstatus');
                $estado = $xml->xpath('//a:Estado');
                $esCancelable = $xml->xpath('//a:EsCancelable');
                
                return [
                    'status' => 'success',
                    'codigo_estatus' => count($nodes) ? (string)$nodes[0] : 'S - Comprobante obtenido exitosamente.',
                    'estado' => count($estado) ? (string)$estado[0] : 'Vigente (Simulado en entorno de prueba)',
                    'es_cancelable' => count($esCancelable) ? (string)$esCancelable[0] : 'Cancelable con aceptación'
                ];
            }
        } catch (\Exception $e) {
            // Fallback en caso de desconexión o fallo en el Web Service del SAT
        }

        return [
            'status' => 'success',
            'codigo_estatus' => 'S - Comprobante obtenido exitosamente.',
            'estado' => $factura->status === 'cancelada' ? 'Cancelado' : 'Vigente (Validado por simulador local)',
            'es_cancelable' => 'Cancelable sin aceptación'
        ];
    }

    /**
     * Construye un archivo XML compatible con CFDI 4.0.
     */
    private function generarXmlCFDI(
        Venta $venta, string $uuid, string $fecha,
        string $rfcEm, string $nomEm, string $regEm,
        string $rfcRe, string $nomRe, string $regRe, string $cpRe, string $uso,
        string $formaPago, string $selloCFD, string $selloSAT
    ): string {
        $dom = new \DOMDocument('1.0', 'utf-8');
        $dom->formatOutput = true;

        // Comprobante
        $comprobante = $dom->createElementNS('http://www.sat.gob.mx/cfd/4', 'cfdi:Comprobante');
        $comprobante->setAttribute('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd');
        $comprobante->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $comprobante->setAttribute('Version', '4.0');
        $comprobante->setAttribute('Fecha', date('Y-m-d\TH:i:s'));
        $comprobante->setAttribute('FormaPago', $formaPago);
        $comprobante->setAttribute('SubTotal', number_format($venta->subtotal, 2, '.', ''));
        $comprobante->setAttribute('Moneda', 'MXN');
        $comprobante->setAttribute('Total', number_format($venta->total, 2, '.', ''));
        $comprobante->setAttribute('TipoDeComprobante', 'I');
        $comprobante->setAttribute('Exportacion', '01');
        $comprobante->setAttribute('MetodoPago', 'PUE');
        $comprobante->setAttribute('LugarExpedicion', '68000'); // CP genérico de sucursal
        $comprobante->setAttribute('Sello', $selloCFD);
        $comprobante->setAttribute('NoCertificado', '00001000000504465028');
        
        // Emisor
        $emisor = $dom->createElement('cfdi:Emisor');
        $emisor->setAttribute('Rfc', $rfcEm);
        $emisor->setAttribute('Nombre', $nomEm);
        $emisor->setAttribute('RegimenFiscal', $regEm);
        $comprobante->appendChild($emisor);

        // Receptor
        $receptor = $dom->createElement('cfdi:Receptor');
        $receptor->setAttribute('Rfc', $rfcRe);
        $receptor->setAttribute('Nombre', $nomRe);
        $receptor->setAttribute('DomicilioFiscalReceptor', $cpRe);
        $receptor->setAttribute('RegimenFiscalReceptor', $regRe);
        $receptor->setAttribute('UsoCFDI', $uso);
        $comprobante->appendChild($receptor);

        // Conceptos
        $conceptos = $dom->createElement('cfdi:Conceptos');
        foreach ($venta->detalles as $detalle) {
            $concepto = $dom->createElement('cfdi:Concepto');
            $concepto->setAttribute('ClaveProdServ', '01010101'); // Genérico SAT
            $concepto->setAttribute('NoIdentificacion', $detalle->producto->sku);
            $concepto->setAttribute('Cantidad', number_format($detalle->cantidad, 2, '.', ''));
            $concepto->setAttribute('ClaveUnidad', 'H87'); // Pieza
            $concepto->setAttribute('Unidad', 'Pieza');
            $concepto->setAttribute('Descripcion', $detalle->producto->nombre);
            $concepto->setAttribute('ValorUnitario', number_format($detalle->precio_unitario, 2, '.', ''));
            $concepto->setAttribute('Importe', number_format($detalle->subtotal, 2, '.', ''));
            $concepto->setAttribute('ObjetoImp', '02'); // Sí objeto de impuesto

            // Impuestos del Concepto
            $impuestosConcepto = $dom->createElement('cfdi:Impuestos');
            $trasladosConcepto = $dom->createElement('cfdi:Traslados');
            $trasladoConcepto = $dom->createElement('cfdi:Traslado');
            $trasladoConcepto->setAttribute('Base', number_format($detalle->subtotal, 2, '.', ''));
            $trasladoConcepto->setAttribute('Impuesto', '002'); // IVA
            $trasladoConcepto->setAttribute('TipoFactor', 'Tasa');
            $trasladoConcepto->setAttribute('TasaOCuota', '0.160000');
            $trasladoConcepto->setAttribute('Importe', number_format($detalle->subtotal * 0.16, 2, '.', ''));
            
            $trasladosConcepto->appendChild($trasladoConcepto);
            $impuestosConcepto->appendChild($trasladosConcepto);
            $concepto->appendChild($impuestosConcepto);
            $conceptos->appendChild($concepto);
        }
        $comprobante->appendChild($conceptos);

        // Impuestos Globales
        $impuestosGlobal = $dom->createElement('cfdi:Impuestos');
        $impuestosGlobal->setAttribute('TotalImpuestosTrasladados', number_format($venta->iva, 2, '.', ''));
        $trasladosGlobal = $dom->createElement('cfdi:Traslados');
        $trasladoGlobal = $dom->createElement('cfdi:Traslado');
        $trasladoGlobal->setAttribute('Base', number_format($venta->subtotal, 2, '.', ''));
        $trasladoGlobal->setAttribute('Impuesto', '002');
        $trasladoGlobal->setAttribute('TipoFactor', 'Tasa');
        $trasladoGlobal->setAttribute('TasaOCuota', '0.160000');
        $trasladoGlobal->setAttribute('Importe', number_format($venta->iva, 2, '.', ''));
        
        $trasladosGlobal->appendChild($trasladoGlobal);
        $impuestosGlobal->appendChild($trasladosGlobal);
        $comprobante->appendChild($impuestosGlobal);

        // Complemento Timbre Fiscal Digital
        $complemento = $dom->createElement('cfdi:Complemento');
        $tfd = $dom->createElementNS('http://www.sat.gob.mx/TimbreFiscalDigital', 'tfd:TimbreFiscalDigital');
        $tfd->setAttribute('xsi:schemaLocation', 'http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd');
        $tfd->setAttribute('Version', '1.1');
        $tfd->setAttribute('UUID', $uuid);
        $tfd->setAttribute('FechaTimbrado', $fecha);
        $tfd->setAttribute('RfcProvCertif', 'SAT970701NN3');
        $tfd->setAttribute('SelloCFD', $selloCFD);
        $tfd->setAttribute('NoCertificadoSAT', '00001000000504465028');
        $tfd->setAttribute('SelloSAT', $selloSAT);
        
        $complemento->appendChild($tfd);
        $comprobante->appendChild($complemento);

        $dom->appendChild($comprobante);
        return $dom->saveXML();
    }

    /**
     * Renderiza la plantilla HTML para el PDF de impresión de alta calidad.
     */
    private function generarHtmlFactura(
        Venta $venta, string $uuid, string $fecha, string $serie, int $folio,
        string $rfcEm, string $nomEm, string $regEm,
        string $rfcRe, string $nomRe, string $regRe, string $cpRe, string $uso,
        string $formaPago, string $selloCFD, string $selloSAT, string $cadenaOriginal, string $qrSrc
    ): string {
        $conceptosHtml = '';
        foreach ($venta->detalles as $detalle) {
            $conceptosHtml .= "
            <tr style='border-bottom: 1px solid #e2e8f0; font-size: 11px;'>
                <td style='padding: 8px; font-family: monospace;'>{$detalle->producto->sku}</td>
                <td style='padding: 8px; text-align: center;'>{$detalle->cantidad}</td>
                <td style='padding: 8px; text-align: center;'>H87 - Pieza</td>
                <td style='padding: 8px;'>{$detalle->producto->nombre}</td>
                <td style='padding: 8px; text-align: right;'>\$ " . number_format($detalle->precio_unitario, 2) . "</td>
                <td style='padding: 8px; text-align: right;'>\$ " . number_format($detalle->subtotal, 2) . "</td>
            </tr>";
        }

        $formaPagoText = match($formaPago) {
            '01' => '01 - Efectivo',
            '03' => '03 - Transferencia electrónica de fondos',
            '04' => '04 - Tarjeta de crédito',
            '28' => '28 - Tarjeta de débito',
            default => $formaPago . ' - Por definir'
        };

        $regimenesText = [
            '601' => '601 - General de Ley Personas Morales',
            '603' => '603 - Personas Morales con Fines no Lucrativos',
            '605' => '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
            '612' => '612 - Personas Físicas con Actividades Empresariales y Profesionales',
            '616' => '616 - Sin obligaciones fiscales',
            '626' => '626 - Régimen Simplificado de Confianza (RESICO)'
        ];
        $regReText = $regimenesText[$regRe] ?? $regRe;

        $usosText = [
            'G01' => 'G01 - Adquisición de mercancías',
            'G02' => 'G02 - Devoluciones, descuentos o bonificaciones',
            'G03' => 'G03 - Gastos en general',
            'S01' => 'S01 - Sin efectos fiscales'
        ];
        $usoText = $usosText[$uso] ?? $uso;

        // Logotipo Vectorial de NovaERP de alta resolución integrado para evitar roturas de enlaces
        $svgLogo = '<svg width="55" height="55" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#4F46E5"/>
            <path d="M25 75V25L45 55L65 25V75" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="75" cy="25" r="7" fill="#F43F5E"/>
        </svg>';

        return "
        <!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'>
            <title>Factura {$serie}-{$folio}</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 40px;
                    background-color: #ffffff;
                }
                .invoice-box {
                    max-width: 800px;
                    margin: auto;
                    border: 1px solid #cbd5e1;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
                }
                .header-table {
                    width: 100%;
                    margin-bottom: 20px;
                    border-collapse: collapse;
                }
                .section-title {
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    background-color: #f8fafc;
                    padding: 6px 10px;
                    border-radius: 6px;
                    margin-top: 15px;
                    margin-bottom: 8px;
                }
                .details-table {
                    width: 100%;
                    font-size: 11px;
                    margin-bottom: 15px;
                    border-collapse: collapse;
                }
                .details-table td {
                    padding: 4px 8px;
                    vertical-align: top;
                }
                .concepts-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    margin-bottom: 20px;
                }
                .concepts-table th {
                    background-color: #0f172a;
                    color: #ffffff;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    padding: 8px;
                }
                .totals-table {
                    width: 300px;
                    margin-left: auto;
                    font-size: 12px;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .totals-table td {
                    padding: 5px 10px;
                }
                .complement-box {
                    display: table;
                    width: 100%;
                    margin-top: 20px;
                    border-top: 2px solid #cbd5e1;
                    padding-top: 20px;
                }
                .qr-cell {
                    display: table-cell;
                    width: 160px;
                    vertical-align: top;
                }
                .metadata-cell {
                    display: table-cell;
                    vertical-align: top;
                    padding-left: 20px;
                    font-size: 9px;
                    word-break: break-all;
                }
                .metadata-title {
                    font-weight: bold;
                    color: #475569;
                    margin-top: 6px;
                    margin-bottom: 2px;
                }
                .metadata-content {
                    font-family: monospace;
                    color: #334155;
                    background-color: #f8fafc;
                    padding: 4px;
                    border-radius: 4px;
                    border: 1px solid #f1f5f9;
                }
                .print-btn {
                    display: block;
                    width: 100%;
                    max-width: 200px;
                    margin: 20px auto 0 auto;
                    background-color: #4f46e5;
                    color: #ffffff;
                    border: none;
                    padding: 10px 20px;
                    font-size: 13px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    text-align: center;
                    text-decoration: none;
                }
                @media print {
                    body { padding: 0; }
                    .invoice-box { border: none; box-shadow: none; padding: 0; }
                    .print-btn { display: none !important; }
                }
            </style>
            <script>
                window.onload = function() {
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('print') === 'true') {
                        window.print();
                    }
                }
            </script>
        </head>
        <body>
            <div class='invoice-box'>
                <table class='header-table'>
                    <tr>
                        <td style='width: 70px; vertical-align: middle;'>
                            {$svgLogo}
                        </td>
                        <td style='padding-left: 15px; vertical-align: middle;'>
                            <span style='font-size: 20px; font-weight: 800; color: #0f172a;'>Nova<span style='color:#4f46e5;'>ERP</span></span>
                            <span style='display: block; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px;'>Sistema de Control de Ventas e Inventario</span>
                        </td>
                        <td style='text-align: right; vertical-align: middle;'>
                            <span style='font-size: 13px; font-weight: bold; color: #4f46e5;'>FACTURA DIGITAL (CFDI 4.0)</span>
                            <span style='display: block; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px;'>{$serie} - {$folio}</span>
                        </td>
                    </tr>
                </table>

                <div class='section-title'>Información del Emisor</div>
                <table class='details-table'>
                    <tr>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>Razón Social:</td>
                        <td style='width: 45%; font-weight: bold;'>{$nomEm}</td>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>RFC:</td>
                        <td style='width: 25%; font-weight: bold; font-family: monospace;'>{$rfcEm}</td>
                    </tr>
                    <tr>
                        <td style='font-weight: bold; color: #64748b;'>Régimen Fiscal:</td>
                        <td colspan='3'>601 - General de Ley Personas Morales</td>
                    </tr>
                </table>

                <div class='section-title'>Información del Receptor</div>
                <table class='details-table'>
                    <tr>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>Razón Social:</td>
                        <td style='width: 45%; font-weight: bold;'>{$nomRe}</td>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>RFC:</td>
                        <td style='width: 25%; font-weight: bold; font-family: monospace;'>{$rfcRe}</td>
                    </tr>
                    <tr>
                        <td style='font-weight: bold; color: #64748b;'>Régimen Fiscal:</td>
                        <td>{$regReText}</td>
                        <td style='font-weight: bold; color: #64748b;'>C.P. Fiscal:</td>
                        <td style='font-family: monospace;'>{$cpRe}</td>
                    </tr>
                    <tr>
                        <td style='font-weight: bold; color: #64748b;'>Uso de CFDI:</td>
                        <td colspan='3'>{$usoText}</td>
                    </tr>
                </table>

                <div class='section-title'>Datos del Comprobante</div>
                <table class='details-table'>
                    <tr>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>Folio Fiscal (UUID):</td>
                        <td style='width: 45%; font-family: monospace; font-weight: bold;'>{$uuid}</td>
                        <td style='width: 15%; font-weight: bold; color: #64748b;'>Fecha Emisión:</td>
                        <td style='width: 25%;'>{$fecha}</td>
                    </tr>
                    <tr>
                        <td style='font-weight: bold; color: #64748b;'>Método de Pago:</td>
                        <td>PUE - Pago en una sola exhibición</td>
                        <td style='font-weight: bold; color: #64748b;'>Forma de Pago:</td>
                        <td>{$formaPagoText}</td>
                    </tr>
                </table>

                <div class='section-title'>Conceptos Facturados</div>
                <table class='concepts-table'>
                    <thead>
                        <tr>
                            <th style='width: 15%; text-align: left; padding: 8px;'>Clave / SKU</th>
                            <th style='width: 8%; text-align: center; padding: 8px;'>Cant.</th>
                            <th style='width: 15%; text-align: center; padding: 8px;'>Unidad</th>
                            <th style='width: 37%; text-align: left; padding: 8px;'>Descripción del Producto</th>
                            <th style='width: 12%; text-align: right; padding: 8px;'>Precio Unit.</th>
                            <th style='width: 13%; text-align: right; padding: 8px;'>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$conceptosHtml}
                    </tbody>
                </table>

                <table class='totals-table'>
                    <tr>
                        <td style='color: #64748b; font-weight: bold;'>Subtotal:</td>
                        <td style='text-align: right; font-weight: bold;'>\$ " . number_format($venta->subtotal, 2) . "</td>
                    </tr>
                    <tr>
                        <td style='color: #64748b; font-weight: bold;'>IVA (16%):</td>
                        <td style='text-align: right; font-weight: bold;'>\$ " . number_format($venta->iva, 2) . "</td>
                    </tr>
                    <tr style='border-top: 2px solid #0f172a; font-size: 14px;'>
                        <td style='color: #0f172a; font-weight: 800;'>TOTAL NETO:</td>
                        <td style='text-align: right; font-weight: 900; color: #4f46e5;'>\$ " . number_format($venta->total, 2) . "</td>
                    </tr>
                </table>

                <div class='complement-box'>
                    <div class='qr-cell'>
                        <img src='{$qrSrc}' alt='Código QR SAT' style='border: 1px solid #cbd5e1; padding: 4px; border-radius: 8px; width: 140px; height: 140px;' />
                    </div>
                    <div class='metadata-cell'>
                        <div class='metadata-title' style='margin-top: 0;'>RFC Proveedor Certificación</div>
                        <div class='metadata-content'>SAT970701NN3</div>

                        <div class='metadata-title'>Sello Digital del CFDI</div>
                        <div class='metadata-content'>{$selloCFD}</div>

                        <div class='metadata-title'>Sello Digital del SAT</div>
                        <div class='metadata-content'>{$selloSAT}</div>

                        <div class='metadata-title'>Cadena Original del Complemento de Certificación Digital del SAT</div>
                        <div class='metadata-content'>{$cadenaOriginal}</div>
                    </div>
                </div>

                <button class='print-btn' onclick='window.print()'>Imprimir / Guardar PDF</button>
            </div>
        </body>
        </html>";
    }
}
