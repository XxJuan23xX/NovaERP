import { useState, useEffect, useMemo } from "react";
import Navigation from "../components/Navigation";
import api from "../services/api";

export default function CierreCajaPage() {
  // ── ESTADOS DEL COMPONENTE ──
  const [cajaData, setCajaData] = useState(null);
  const [efectivoFisico, setEfectivoFisico] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [successMensaje, setSuccessMensaje] = useState("");

  // Fecha y hora dinámica para la cabecera
  const [fechaActual, setFechaActual] = useState(new Date());

  // Cargar datos del cierre de caja
  const cargarResumenCierre = async () => {
    setLoading(true);
    setErrorMensaje("");
    try {
      const res = await api.get("/caja/cierre-resumen");
      if (res.data?.status === "success") {
        setCajaData(res.data.data);
        // Si ya está cerrada, prellenar con el efectivo real guardado
        if (res.data.data.sesion?.estado === "cerrada") {
          setEfectivoFisico(res.data.data.sesion.efectivo_real || "0");
        }
      } else {
        setErrorMensaje("Ocurrió un problema al obtener el resumen de caja.");
      }
    } catch (err) {
      console.error("Error al obtener el resumen de caja:", err);
      setErrorMensaje("No se pudo establecer conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTimer = setTimeout(() => {
      cargarResumenCierre();
    }, 100);

    const timer = setInterval(() => {
      setFechaActual(new Date());
    }, 60000);

    return () => {
      clearTimeout(fetchTimer);
      clearInterval(timer);
    };
  }, []);

  const fechaFormateada = useMemo(() => {
    const opciones = { day: "numeric", month: "short", year: "numeric" };
    const fechaStr = fechaActual.toLocaleDateString("es-ES", opciones);
    const horaStr = fechaActual.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${fechaStr.replace(".", "")} · ${horaStr}`;
  }, [fechaActual]);

  // Formateador de moneda
  const formatPrice = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Cálculos derivados
  const fondoInicial = cajaData?.sesion?.fondo_inicial || 0;
  const efectivoRecibido = cajaData?.resumen?.efectivo_recibido || 0;

  const efectivoEsperado = useMemo(() => {
    return Number(fondoInicial) + Number(efectivoRecibido);
  }, [fondoInicial, efectivoRecibido]);

  const descuadre = useMemo(() => {
    if (efectivoFisico === "") return 0;
    return Number(efectivoFisico) - efectivoEsperado;
  }, [efectivoFisico, efectivoEsperado]);

  // Procesar confirmación del cierre de caja
  const handleConfirmarCierre = async (e) => {
    e.preventDefault();
    if (efectivoFisico === "") {
      setErrorMensaje(
        "Por favor, ingresa el efectivo físico actual de la caja.",
      );
      return;
    }

    setLoadingCierre(true);
    setErrorMensaje("");
    setSuccessMensaje("");

    try {
      const res = await api.post("/caja/cierre", {
        efectivo_real: Number(efectivoFisico),
      });

      if (res.data?.status === "success") {
        setSuccessMensaje("Cierre de caja confirmado correctamente.");
        // Recargar datos para refrescar estado de la sesión
        await cargarResumenCierre();
      } else {
        setErrorMensaje(res.data?.message || "Error al procesar el cierre.");
      }
    } catch (err) {
      console.error("Error al confirmar cierre:", err);
      const errDetail =
        err.response?.data?.message ||
        "Error en el servidor al confirmar el cierre.";
      setErrorMensaje(errDetail);
    } finally {
      setLoadingCierre(false);
    }
  };

  // Imprimir reporte
  const handleImprimir = () => {
    window.print();
  };

  // Exportar reporte a formato CSV (simulación rápida y limpia)
  const handleExportar = () => {
    if (!cajaData) return;

    const { sesion, resumen, empleados } = cajaData;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";

    // Títulos / Cabecera
    csvContent += "REPORTE DE CIERRE DE CAJA\n";
    csvContent += `Caja;${sesion?.caja_nombre || "N/A"}\n`;
    csvContent += `Almacén;${sesion?.almacen_nombre || "N/A"}\n`;
    csvContent += `Cajero;${sesion?.cajero_nombre || "N/A"}\n`;
    csvContent += `Estado;${sesion?.estado || "N/A"}\n`;
    csvContent += `Fecha Apertura;${sesion?.fecha_apertura ? new Date(sesion.fecha_apertura).toLocaleString("es-MX") : "N/A"}\n\n`;

    // Resumen financiero
    csvContent += "RESUMEN FINANCIERO\n";
    csvContent += `Fondo Inicial;${fondoInicial}\n`;
    csvContent += `Total Vendido;${resumen?.total_vendido || 0}\n`;
    csvContent += `Efectivo Recibido;${resumen?.efectivo_recibido || 0}\n`;
    csvContent += `Tarjeta Recibido;${resumen?.tarjeta_recibido || 0}\n`;
    csvContent += `Cancelaciones;${resumen?.cancelaciones || 0}\n\n`;

    // Empleados
    csvContent += "DESGLOSE POR EMPLEADO\n";
    csvContent +=
      "Empleado;Tickets;Efectivo (Monto);Efectivo (Ventas);Tarjeta (Monto);Tarjeta (Ventas);Cancelaciones (Monto);Total Neto\n";

    empleados?.forEach((emp) => {
      csvContent += `"${emp.nombre}";${emp.tickets};${emp.efectivo_monto};${emp.efectivo_ventas};${emp.tarjeta_monto};${emp.tarjeta_ventas};${emp.cancelaciones_monto};${emp.total_neto}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cierre_caja_${sesion?.id || "resumen"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Estado de la sesión de caja
  const sesionEstado = cajaData?.sesion?.estado || "abierta";
  const esCerrada = sesionEstado === "cerrada";

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {/* Barra de Navegación Lateral */}
      <Navigation />

      {/* Contenido Principal */}
      <main className="flex-1 min-w-0 flex flex-col p-8 overflow-y-auto print:p-0">
        {/* Cabecera del Módulo */}
        <header className="flex flex-row items-center justify-between mb-8 pb-4 border-b border-slate-350 gap-4 print:mb-4 print:pb-2 print:border-b-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0 select-none">
                Cierre de Caja
              </h1>
              {esCerrada ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full select-none print:bg-white print:text-black">
                  ✔ Cerrada
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full select-none print:bg-white print:text-black animate-pulse">
                  ● Pendiente
                </span>
              )}
            </div>
            <p className="text-slate-600 font-bold text-xs mt-1.5 select-none print:text-black">
              {fechaFormateada} · Turno Matutino (09:00 - 17:00)
            </p>
          </div>

          {/* Botones de acción en cabecera */}
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handleExportar}
              disabled={loading || !cajaData}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="h-4 w-4 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Exportar Reporte
            </button>
            <button
              onClick={handleImprimir}
              disabled={loading || !cajaData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="h-4 w-4 text-white"
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
              Imprimir
            </button>
          </div>
        </header>

        {/* Mensajes de feedback */}
        {errorMensaje && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl mb-6 flex items-start gap-3 shadow-sm print:hidden">
            <svg
              className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-extrabold text-sm">{errorMensaje}</span>
            <button
              onClick={() => setErrorMensaje("")}
              className="ml-auto text-red-650 hover:text-red-800 font-bold text-xs select-none cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        )}

        {successMensaje && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl mb-6 flex items-start gap-3 shadow-sm print:hidden animate-in fade-in zoom-in-95 duration-200">
            <svg
              className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-extrabold text-sm">{successMensaje}</span>
            <button
              onClick={() => setSuccessMensaje("")}
              className="ml-auto text-emerald-650 hover:text-emerald-850 font-bold text-xs select-none cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-medium">
            <svg
              className="animate-spin h-8 w-8 text-indigo-500 mb-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-bold text-slate-650">
              Cargando reporte de arqueo...
            </span>
          </div>
        ) : !cajaData || !cajaData.sesion ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl text-slate-500 font-medium shadow-sm max-w-2xl mx-auto my-8 p-8 text-center select-none">
            <div className="h-16 w-16 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4 shadow-inner mx-auto">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-slate-900 font-black text-lg mb-2">
              No hay una sesión de caja activa
            </h3>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-6 mx-auto">
              Para realizar arqueos y cierres de caja, primero debes abrir el
              turno y asociar una sucursal desde el Punto de Venta.
            </p>
            <div className="flex justify-center">
              <a
                href="/pos"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3 rounded-xl shadow-md shadow-indigo-600/10 active:scale-95 transition-all flex items-center gap-2 select-none cursor-pointer"
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Ir al Punto de Venta para abrir caja
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-4">
            {/* Tarjetas del Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
              {/* Card 1: Total vendido */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow transition-all print:border print:shadow-none">
                <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1M10 11h4"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Vendido
                  </span>
                  <div className="text-slate-900 font-black text-xl mt-1 tracking-tight">
                    {formatPrice(cajaData.resumen.total_vendido)}
                  </div>
                </div>
              </div>

              {/* Card 2: Efectivo recibido */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow transition-all print:border print:shadow-none">
                <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Efectivo Recibido
                  </span>
                  <div className="text-emerald-700 font-black text-xl mt-1 tracking-tight">
                    {formatPrice(cajaData.resumen.efectivo_recibido)}
                  </div>
                </div>
              </div>

              {/* Card 3: Tarjeta */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow transition-all print:border print:shadow-none">
                <div className="h-12 w-12 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Ventas Tarjeta
                  </span>
                  <div className="text-blue-700 font-black text-xl mt-1 tracking-tight">
                    {formatPrice(cajaData.resumen.tarjeta_recibido)}
                  </div>
                </div>
              </div>

              {/* Card 4: Cancelaciones */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow transition-all print:border print:shadow-none">
                <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cancelaciones
                  </span>
                  <div className="text-red-650 font-black text-xl mt-1 tracking-tight">
                    - {formatPrice(cajaData.resumen.cancelaciones)}
                  </div>
                </div>
              </div>
            </div>

            {/* Fila Central: Tabla de Empleados y Panel de Caja */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start print:grid-cols-1 print:gap-4">
              {/* Tabla de Ventas por Cajero (Ocupa 2/3 columnas en XL screens) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm xl:col-span-2 print:border-0 print:shadow-none print:p-0">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-black text-slate-900 select-none">
                    Ventas y Operaciones por Cajero
                  </h2>
                  <span className="text-[11px] font-black bg-slate-100 border border-slate-350 text-slate-800 px-3 py-1 rounded-lg select-none">
                    {cajaData.empleados?.length || 0} cajeros activos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pr-2">Empleado</th>
                        <th className="pb-3 text-center">Tickets</th>
                        <th className="pb-3 text-right">Efectivo</th>
                        <th className="pb-3 text-right">Tarjeta</th>
                        <th className="pb-3 text-right">Cancelado</th>
                        <th className="pb-3 text-right">Total Vendido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-[12px] font-bold text-slate-800">
                      {cajaData.empleados?.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center py-6 text-slate-400"
                          >
                            Ninguna venta realizada en la sesión activa.
                          </td>
                        </tr>
                      ) : (
                        cajaData.empleados?.map((emp) => (
                          <tr
                            key={emp.user_id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            {/* Avatar + Nombre */}
                            <td className="py-3.5 pr-2 flex items-center gap-3">
                              <div className="h-8 w-8 bg-indigo-100 border border-indigo-200 text-indigo-700 font-black rounded-full flex items-center justify-center shadow-inner text-xs">
                                {emp.nombre
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                              <div>
                                <div className="text-[13px] font-bold text-slate-900">
                                  {emp.nombre}
                                </div>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Cajero ID: #{emp.user_id}
                                </span>
                              </div>
                            </td>
                            {/* Tickets */}
                            <td className="py-3.5 text-center font-extrabold text-slate-900 text-[13px]">
                              {emp.tickets}
                            </td>
                            {/* Efectivo */}
                            <td className="py-3.5 text-right font-medium">
                              <span className="block text-slate-900 font-bold">
                                {formatPrice(emp.efectivo_monto)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {emp.efectivo_ventas}{" "}
                                {emp.efectivo_ventas === 1 ? "vta." : "vtas."}
                              </span>
                            </td>
                            {/* Tarjeta */}
                            <td className="py-3.5 text-right font-medium">
                              <span className="block text-slate-900 font-bold">
                                {formatPrice(emp.tarjeta_monto)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {emp.tarjeta_ventas}{" "}
                                {emp.tarjeta_ventas === 1 ? "vta." : "vtas."}
                              </span>
                            </td>
                            {/* Cancelaciones */}
                            <td className="py-3.5 text-right text-red-600 font-medium">
                              <span className="block font-bold">
                                -{formatPrice(emp.cancelaciones_monto)}
                              </span>
                              <span className="text-[10px] font-semibold">
                                {emp.cancelaciones_ventas}{" "}
                                {emp.cancelaciones_ventas === 1
                                  ? "vta."
                                  : "vtas."}
                              </span>
                            </td>
                            {/* Total Neto */}
                            <td className="py-3.5 text-right font-black text-[13.5px] text-slate-950">
                              {formatPrice(emp.total_neto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Información y Datos de Arqueo Físico (1/3 columna en XL screens) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col space-y-6 print:border print:shadow-none">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-base font-black text-slate-900 select-none">
                    Sesión e Inventario
                  </h2>
                </div>

                {/* Resumen de Sesión */}
                <div className="space-y-3.5 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl shadow-inner select-none print:bg-white">
                  <div className="flex justify-between">
                    <span>Caja activa</span>
                    <span className="text-slate-900 font-black">
                      {cajaData.sesion?.caja_nombre}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Almacén sucursal</span>
                    <span className="text-slate-900 font-bold">
                      {cajaData.sesion?.almacen_nombre}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cajero de apertura</span>
                    <span className="text-slate-900 font-bold">
                      {cajaData.sesion?.cajero_nombre}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha Apertura</span>
                    <span className="text-slate-800 font-medium">
                      {cajaData.sesion?.fecha_apertura
                        ? new Date(
                            cajaData.sesion.fecha_apertura,
                          ).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>

                {/* Cruce Inventario */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 select-none">
                    Valoración de Inventario
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center print:bg-white">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Stock Actual
                      </span>
                      <div className="text-slate-950 font-black text-lg mt-1">
                        {cajaData.inventario.stock_total} uds.
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center print:bg-white">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Valor Ventas
                      </span>
                      <div className="text-indigo-650 font-black text-lg mt-1">
                        {formatPrice(cajaData.inventario.valor_venta_total)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Arqueo de Caja y Confirmación (Footer del Módulo) */}
            <div className="bg-white border border-slate-250 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:border print:shadow-none print:p-4">
              {/* Sección de desglose de efectivo esperado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 w-full max-w-2xl select-none print:gap-3">
                {/* Fondo Inicial */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Fondo Inicial
                  </span>
                  <div className="text-slate-900 font-extrabold text-lg">
                    {formatPrice(fondoInicial)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Establecido al abrir caja
                  </span>
                </div>

                {/* Efectivo Recibido en POS */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Efectivo en Ventas
                  </span>
                  <div className="text-emerald-700 font-extrabold text-lg">
                    + {formatPrice(efectivoRecibido)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Registrado por el sistema
                  </span>
                </div>

                {/* Total Efectivo Esperado */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Total Esperado en Caja
                  </span>
                  <div className="text-indigo-600 font-black text-lg">
                    {formatPrice(efectivoEsperado)}
                  </div>
                  <span className="text-[10px] text-indigo-500 font-semibold">
                    Fondo + Efectivo de ventas
                  </span>
                </div>
              </div>

              {/* Formulario de Arqueo y Cierre */}
              <form
                onSubmit={handleConfirmarCierre}
                className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-6 print:border-0 print:pt-0 print:pl-0"
              >
                {/* Entrada de Efectivo Real */}
                <div className="w-full sm:w-auto">
                  <label
                    htmlFor="efectivo_real"
                    className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5 select-none"
                  >
                    Efectivo Físico en Caja
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      id="efectivo_real"
                      step="0.01"
                      min="0"
                      value={efectivoFisico}
                      onChange={(e) => setEfectivoFisico(e.target.value)}
                      disabled={esCerrada || loadingCierre}
                      placeholder="0.00"
                      className={`w-full sm:w-44 bg-white border border-slate-350 text-slate-900 placeholder-slate-400 font-bold rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                        esCerrada
                          ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                          : ""
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Descuadre/Diferencia badge */}
                {efectivoFisico !== "" && (
                  <div className="text-right sm:text-left select-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Diferencia (Descuadre)
                    </span>
                    <span
                      className={`inline-block text-xs font-black px-3 py-1.5 rounded-lg border ${
                        descuadre === 0
                          ? "bg-slate-50 text-slate-650 border-slate-200"
                          : descuadre > 0
                            ? "bg-emerald-50 text-emerald-800 border-emerald-250"
                            : "bg-red-50 text-red-800 border-red-250"
                      }`}
                    >
                      {descuadre === 0
                        ? "Sin descuadre (Exacto)"
                        : descuadre > 0
                          ? `Sobrante: +${formatPrice(descuadre)}`
                          : `Faltante: ${formatPrice(descuadre)}`}
                    </span>
                  </div>
                )}

                {/* Botón de Confirmar Cierre */}
                <div className="w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 print:hidden">
                  {esCerrada ? (
                    <button
                      type="button"
                      disabled
                      className="w-full sm:w-auto bg-slate-100 text-slate-400 border border-slate-200 rounded-xl px-5 py-3 font-bold text-xs cursor-not-allowed shadow-none"
                    >
                      Corte Finalizado
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loadingCierre}
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 font-black text-xs shadow-md shadow-indigo-600/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loadingCierre ? (
                        <>
                          <svg
                            className="animate-spin h-3.5 w-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Procesando Cierre...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-3.5 w-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Confirmar Cierre de Caja
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, .print\\:hidden, button, form button {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .bg-white {
            background: white !important;
          }
          .shadow-sm, .shadow, .shadow-md, .shadow-xl {
            box-shadow: none !important;
          }
          .border {
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
}
