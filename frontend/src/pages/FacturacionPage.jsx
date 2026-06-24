import { useState, useEffect } from "react";
import Navigation from "../components/Navigation";
import api from "../services/api";

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalFacturas, setTotalFacturas] = useState(0);

  // Modal Cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("02");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Modal Validar SAT
  const [validarModalOpen, setValidarModalOpen] = useState(false);
  const [validacionResult, setValidacionResult] = useState(null);
  const [loadingValidacion, setLoadingValidacion] = useState(false);

  const fetchFacturas = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: 10,
      };
      if (busqueda) params.busqueda = busqueda;
      if (statusFiltro !== "Todos") params.status = statusFiltro;

      const res = await api.get("/facturas", { params });
      if (res.data?.status === "success") {
        setFacturas(res.data.data.data || []);
        setCurrentPage(res.data.data.current_page || 1);
        setLastPage(res.data.data.last_page || 1);
        setTotalFacturas(res.data.data.total || 0);
      }
    } catch (err) {
      console.error("Error al obtener facturas:", err);
      setError("No se pudieron cargar las facturas del sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchFacturas(1);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [busqueda, statusFiltro]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= lastPage) {
      fetchFacturas(page);
    }
  };

  const handleDescargarXml = (id) => {
    // Abrir endpoint de descarga directa en pestaña nueva
    const token = localStorage.getItem("token");
    window.open(
      `http://127.0.0.1:8000/api/facturas/${id}/descargar-xml?token=${token}`,
      "_blank",
    );
  };

  const handleDescargarPdf = (id) => {
    // Abrir endpoint de visualización/impresión
    const token = localStorage.getItem("token");
    window.open(
      `http://127.0.0.1:8000/api/facturas/${id}/descargar-pdf?token=${token}`,
      "_blank",
    );
  };

  const handleOpenCancelModal = (factura) => {
    setSelectedFactura(factura);
    setMotivoCancelacion("02");
    setCancelModalOpen(true);
  };

  const handleCancelarFactura = async (e) => {
    e.preventDefault();
    if (!selectedFactura) return;
    setSubmittingCancel(true);
    try {
      const res = await api.post(`/facturas/${selectedFactura.id}/cancelar`, {
        motivo: motivoCancelacion,
      });
      if (res.data?.status === "success") {
        alert("Factura cancelada correctamente ante el SAT.");
        setCancelModalOpen(false);
        fetchFacturas(currentPage);
      }
    } catch (err) {
      console.error("Error al cancelar factura:", err);
      alert(
        err.response?.data?.message ||
          "Ocurrió un error al intentar cancelar la factura.",
      );
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleValidarSat = async (factura) => {
    setSelectedFactura(factura);
    setValidacionResult(null);
    setLoadingValidacion(true);
    setValidarModalOpen(true);
    try {
      const res = await api.get(`/facturas/${factura.id}/validar-sat`);
      setValidacionResult(res.data);
    } catch (err) {
      console.error("Error al validar con SAT:", err);
      setValidacionResult({
        status: "error",
        estado: "Error de consulta",
        codigo_estatus: "N/A",
        es_cancelable: "Desconocido",
      });
    } finally {
      setLoadingValidacion(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(val) || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      <div className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ENCABEZADO */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-[28px]! font-extrabold tracking-tight text-black! flex items-center gap-3">
                Facturación (CFDI 4.0)
              </h1>
              <p className="mt-1 text-slate-500 text-xs font-semibold">
                Historial de comprobantes emitidos ante el SAT y control de
                cancelaciones
              </p>
            </div>
          </div>

          {/* FILTROS */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-sm mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por RFC, Cliente o UUID..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150"
                />
              </div>

              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Todos">Todos los estatus</option>
                <option value="vigente">Vigentes</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-semibold select-none">
              Mostrando{" "}
              <strong className="text-slate-900">{totalFacturas}</strong>{" "}
              comprobantes
            </div>
          </div>

          {/* LISTADO DE COMPROBANTES */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs font-semibold">
                  Cargando facturas...
                </span>
              </div>
            ) : facturas.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-14 w-14 mx-auto mb-4 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-sm font-bold text-slate-800">
                  No se encontraron facturas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ningún ticket de venta ha sido facturado con los filtros
                  aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider select-none">
                      <th className="px-5 py-3">Serie/Folio</th>
                      <th className="px-5 py-3">Folio Fiscal (UUID)</th>
                      <th className="px-5 py-3">Cliente / RFC</th>
                      <th className="px-5 py-3 text-right">Monto</th>
                      <th className="px-5 py-3">Fecha Emisión</th>
                      <th className="px-5 py-3 text-center">Estado</th>
                      <th className="px-5 py-3 text-center">Acciones SAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-650 font-semibold">
                    {facturas.map((fact) => {
                      const esCancelada = fact.status === "cancelada";
                      return (
                        <tr
                          key={fact.id}
                          className="hover:bg-slate-50/50 transition-colors duration-150"
                        >
                          {/* Folio */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-blue-600 font-extrabold">
                            {fact.serie}-{fact.folio}
                          </td>
                          {/* UUID */}
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[10px] text-slate-500">
                            <span title={fact.uuid}>
                              {fact.uuid.substring(0, 18)}...
                            </span>
                          </td>
                          {/* Cliente */}
                          <td className="px-5 py-3.5">
                            <div className="text-slate-900 font-bold max-w-xs truncate">
                              {fact.razon_social_receptor}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {fact.rfc_receptor}
                            </div>
                          </td>
                          {/* Monto */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap font-extrabold text-green-700">
                            {formatCurrency(fact.venta?.total)}
                          </td>
                          {/* Fecha */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                            {formatDate(fact.created_at)}
                          </td>
                          {/* Estatus */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${
                                esCancelada
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {esCancelada ? "🔴 Cancelada" : "🟢 Vigente"}
                            </span>
                          </td>
                          {/* Acciones */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap select-none">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Descargar XML */}
                              <button
                                onClick={() => handleDescargarXml(fact.id)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent rounded-lg transition-all cursor-pointer"
                                title="Descargar XML"
                              >
                                <svg
                                  className="h-4.5 w-4.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </button>

                              {/* Descargar PDF */}
                              <button
                                onClick={() => handleDescargarPdf(fact.id)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent rounded-lg transition-all cursor-pointer"
                                title="Imprimir / Ver PDF"
                              >
                                <svg
                                  className="h-4.5 w-4.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                  />
                                </svg>
                              </button>

                              {/* Validar SAT */}
                              <button
                                onClick={() => handleValidarSat(fact)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent rounded-lg transition-all cursor-pointer"
                                title="Validar estatus ante el SAT"
                              >
                                <svg
                                  className="h-4.5 w-4.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                  />
                                </svg>
                              </button>

                              {/* Cancelar Factura */}
                              {!esCancelada && (
                                <button
                                  onClick={() => handleOpenCancelModal(fact)}
                                  className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent rounded-lg transition-all cursor-pointer"
                                  title="Cancelar Factura"
                                >
                                  <svg
                                    className="h-4.5 w-4.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!loading && lastPage > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex items-center justify-between select-none">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-white border border-slate-300 text-xs font-bold text-slate-600 px-3.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500 font-bold">
                  Página{" "}
                  <strong className="text-slate-900">{currentPage}</strong> de{" "}
                  {lastPage}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === lastPage}
                  className="bg-white border border-slate-300 text-xs font-bold text-slate-600 px-3.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── MODAL CANCELACIÓN ── */}
      {cancelModalOpen && selectedFactura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="pb-4 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h2 className="text-slate-950 font-black text-base tracking-tight">
                  Cancelar Factura CFDI
                </h2>
                <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                  Selecciona el motivo de cancelación oficial SAT para el folio{" "}
                  {selectedFactura.serie}-{selectedFactura.folio}.
                </p>
              </div>
            </div>

            <form onSubmit={handleCancelarFactura} className="space-y-4 my-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  Motivo de Cancelación
                </label>
                <select
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-sans"
                >
                  <option value="01">
                    01 - Comprobante emitido con errores con relación
                  </option>
                  <option value="02">
                    02 - Comprobante emitido con errores sin relación
                  </option>
                  <option value="03">
                    03 - No se llevó a cabo la operación
                  </option>
                  <option value="04">
                    04 - Operación nominativa relacionada en una factura global
                  </option>
                </select>
              </div>

              <div className="bg-red-50 border border-red-150 p-4 rounded-xl text-red-800 text-[11px] font-bold leading-relaxed">
                ⚠️ <strong>¡Atención!</strong> Esta acción enviará una petición
                SOAP de cancelación SAT y es irreversible.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 select-none">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-[11px] px-4 py-2.5 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCancel ? "Cancelando..." : "Confirmar Cancelación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VALIDAR SAT (WEBSERVICE SOAP REAL) ── */}
      {validarModalOpen && selectedFactura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="pb-4 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h2 className="text-slate-950 font-black text-base tracking-tight">
                  Resultado de Validación SAT
                </h2>
                <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                  Consulta de estatus en tiempo real en los servidores oficiales
                  del SAT.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              {loadingValidacion ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-3">
                  <div className="h-8 w-8 border-3 border-slate-250 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-slate-650">
                    Conectando con Web Service del SAT...
                  </span>
                </div>
              ) : validacionResult ? (
                <div className="space-y-3.5 text-xs font-semibold text-slate-650">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Folio Fiscal (UUID)</span>
                    <span className="text-slate-900 font-mono text-[10px] font-bold">
                      {selectedFactura.uuid}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Estatus de Comprobante</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        validacionResult.estado?.includes("Vigente")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                          : "bg-red-50 text-red-700 border-red-250"
                      }`}
                    >
                      {validacionResult.estado}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Cancelabilidad</span>
                    <span className="text-slate-900 font-bold">
                      {validacionResult.es_cancelable}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Código Respuesta SAT
                    </span>
                    <div className="bg-slate-50 border border-slate-200 text-[10.5px] font-bold text-slate-800 p-2.5 rounded-xl font-mono leading-relaxed">
                      {validacionResult.codigo_estatus}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-red-600 font-bold text-xs">
                  Ocurrió un error al intentar consultar los servidores del SAT.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end select-none">
              <button
                type="button"
                onClick={() => setValidarModalOpen(false)}
                className="bg-indigo-650 hover:bg-indigo-750 text-white font-black text-[11.5px] px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Cerrar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
