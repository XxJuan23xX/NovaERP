import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import Navigation from "../components/Navigation";
import Alert from "../components/Alert";

export default function AuditoriaPage() {
  // ── ESTADOS LOCALES DE LOS LOGS ──
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_logs: 0,
    criticos: 0,
    warnings: 0,
    info: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── ESTADOS DE FILTROS ──
  const [busqueda, setBusqueda] = useState("");
  const [modulo, setModulo] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ── ESTADOS DE PAGINACIÓN ──
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  // ── ESTADO DEL LOG SELECCIONADO PARA DETALLE (MODAL) ──
  const [selectedLog, setSelectedLog] = useState(null);

  // ── FECHA Y HORA DINÁMICA DE CABECERA ──
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatHeaderDate = (date) => {
    const months = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} • ${hours}:${minutes}`;
  };

  // ── CONSULTAR API CON FILTROS Y PAGINACIÓN ──
  const fetchLogs = (page = 1) => {
    setLoading(true);
    setError("");

    const params = {
      page: page,
      per_page: itemsPerPage,
      busqueda: busqueda || undefined,
      modulo: modulo || undefined,
      severidad: severidad || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    };

    api
      .get("/auditoria", { params })
      .then((res) => {
        if (res.data?.status === "success") {
          setLogs(res.data.data.data || []);
          setCurrentPage(res.data.data.current_page || 1);
          setLastPage(res.data.data.last_page || 1);
          setTotalRecords(res.data.data.total || 0);

          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      })
      .catch((err) => {
        console.error("Error al cargar auditorías:", err);
        setError(
          "Ocurrió un error al obtener la bitácora de auditorías del servidor.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Cargar datos al cambiar filtros (con debounce en la búsqueda)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLogs(1);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [busqueda, modulo, severidad, fechaDesde, fechaHasta]);

  // Cambiar de página
  const handlePageChange = (page) => {
    if (page >= 1 && page <= lastPage) {
      fetchLogs(page);
    }
  };

  // ── AUXILIARES DE RENDERIZADO ──
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { day: "numeric", month: "short", year: "numeric" };
    const dStr = date.toLocaleDateString("es-ES", options).replace(".", "");
    const tStr = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dStr} · ${tStr}`;
  };

  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getSeverityBadge = (level) => {
    switch (level) {
      case "danger":
        return (
          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold rounded-md bg-red-50 text-red-600 border border-red-200">
            Crítico
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold rounded-md bg-amber-50 text-amber-600 border border-amber-200">
            Advertencia
          </span>
        );
      case "info":
      default:
        return (
          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
            Información
          </span>
        );
    }
  };

  const getModuleBadge = (mod) => {
    const modules = {
      seguridad: "bg-purple-50 text-purple-600 border-purple-100",
      inventario: "bg-blue-50 text-blue-600 border-blue-100",
      ventas: "bg-indigo-50 text-indigo-600 border-indigo-100",
      caja: "bg-sky-50 text-sky-600 border-sky-100",
      clientes: "bg-teal-50 text-teal-600 border-teal-100",
      cotizaciones: "bg-pink-50 text-pink-600 border-pink-100",
      usuarios: "bg-rose-50 text-rose-600 border-rose-100",
    };

    const style = modules[mod] || "bg-slate-50 text-slate-600 border-slate-100";
    return (
      <span
        className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold uppercase rounded-md border ${style}`}
      >
        {mod}
      </span>
    );
  };

  // Comparar JSON de valores anteriores y nuevos
  const diffData = useMemo(() => {
    if (!selectedLog) return [];
    const prev = selectedLog.valores_anteriores || {};
    const next = selectedLog.valores_nuevos || {};

    // Obtener todas las propiedades únicas
    const allKeys = Array.from(
      new Set([...Object.keys(prev), ...Object.keys(next)]),
    );

    // Filtrar claves no deseadas como timestamps
    return allKeys
      .filter(
        (k) => k !== "updated_at" && k !== "created_at" && k !== "password",
      )
      .map((key) => {
        const valPrev = prev[key];
        const valNext = next[key];
        const isChanged = JSON.stringify(valPrev) !== JSON.stringify(valNext);
        return {
          key,
          prev: valPrev !== undefined ? valPrev : null,
          next: valNext !== undefined ? valNext : null,
          isChanged,
        };
      });
  }, [selectedLog]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      {/* Espacio principal de la página */}
      <div className="flex-1 min-w-0 p-8 flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-[28px]! font-extrabold tracking-tight text-black!">
              Auditoría y Seguridad
            </h1>
            <p className="mt-1 text-slate-400 text-xs font-semibold">
              {formatHeaderDate(currentDate)}
            </p>
            <p className="mt-1.5 text-slate-500 text-sm">
              Bitácora centralizada de acciones críticas y trazabilidad en
              tiempo real.
            </p>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-transparent p-5 mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          {/* Buscar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Cajero, SKU, palabra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 placeholder-slate-400 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4f46e5] focus:bg-white transition-all outline-none"
            />
          </div>
          {/* Módulo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Módulo
            </label>
            <select
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4f46e5] focus:bg-white transition-all outline-none cursor-pointer"
            >
              <option value="">Todos los módulos</option>
              <option value="seguridad">Seguridad</option>
              <option value="usuarios">Usuarios</option>
              <option value="inventario">Inventario</option>
              <option value="ventas">Ventas (POS)</option>
              <option value="caja">Caja</option>
              <option value="clientes">Clientes (CRM)</option>
              <option value="cotizaciones">Cotizaciones</option>
            </select>
          </div>
          {/* Gravedad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Gravedad
            </label>
            <select
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4f46e5] focus:bg-white transition-all outline-none cursor-pointer"
            >
              <option value="">Todas las gravedades</option>
              <option value="info">Información (Info)</option>
              <option value="warning">Advertencia (Warning)</option>
              <option value="danger">Crítico (Danger)</option>
            </select>
          </div>
          {/* Fecha Desde */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4f46e5] focus:bg-white transition-all outline-none cursor-pointer"
            />
          </div>
          {/* Fecha Hasta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4f46e5] focus:bg-white transition-all outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* MÉTRIQUES CARD SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 select-none">
          {/* Card 1: Total Acciones */}
          <div className="bg-blue-100 border border-blue-400/20 rounded-sm p-5 shadow-sm hover:shadow-md transition-all">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                Total Acciones
              </span>
              <p className="text-2xl font-black text-blue-900 mt-1">
                {stats.total_logs}
              </p>
            </div>
          </div>

          {/* Card 2: Eventos Críticos */}
          <div className="bg-red-100 border border-red-400/20 rounded-sm p-5 shadow-sm hover:shadow-md transition-all">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                Eventos Críticos
              </span>
              <p className="text-2xl font-black text-red-800 mt-1">
                {stats.criticos}
              </p>
            </div>
          </div>

          {/* Card 3: Advertencias */}
          <div className="bg-amber-100 border border-amber-400/20 rounded-sm p-5 shadow-sm hover:shadow-md transition-all">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                Advertencias
              </span>
              <p className="text-2xl font-black text-amber-800 mt-1">
                {stats.warnings}
              </p>
            </div>
          </div>

          {/* Card 4: Información */}
          <div className="bg-green-100 border border-green-400/20 rounded-sm p-5 shadow-sm hover:shadow-md transition-all">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                Información
              </span>
              <p className="text-2xl font-black text-green-800 mt-1">
                {stats.info}
              </p>
            </div>
          </div>
        </div>

        {/* TABLA DE AUDITORÍAS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
          {error && (
            <div className="p-4">
              <Alert message={error} type="error" />
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#4f46e5] rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold">
                Cargando bitácora de auditorías...
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                🔍
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                No se encontraron actividades
              </h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1.5">
                Intenta ajustar los criterios de búsqueda o limpia los filtros
                para visualizar más registros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1 flex flex-col justify-between">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 select-none">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Módulo
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Acción
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Nivel
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700 text-center">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3 text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>
                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 select-none shadow-sm">
                            {item.user ? getInitials(item.user.name) : "S"}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-900 leading-tight">
                              {item.user ? item.user.name : "Sistema"}
                            </p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              {item.user ? item.user.role : "Automático"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Módulo */}
                      <td className="px-4 py-3">
                        {getModuleBadge(item.modulo)}
                      </td>
                      {/* Acción */}
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black uppercase text-slate-700 font-mono">
                          {item.accion}
                        </span>
                      </td>
                      {/* Nivel */}
                      <td className="px-4 py-3">
                        {getSeverityBadge(item.severidad)}
                      </td>
                      {/* Descripción */}
                      <td
                        className="px-4 py-3 text-[11px] font-medium text-slate-600 max-w-xs truncate"
                        title={item.descripcion}
                      >
                        {item.descripcion}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 text-[10px] font-bold transition-all duration-150 active:scale-95 cursor-pointer gap-1"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAGINACIÓN */}
              {lastPage > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 select-none mt-auto">
                  <div className="text-xs text-slate-500 font-semibold">
                    Registros del {currentPage * itemsPerPage - (itemsPerPage - 1)} al{" "}
                    {Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords}{" "}
                    logs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                      Pág. {currentPage} / {lastPage}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === lastPage}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLE DE AUDITORÍA */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-3xl bg-white border border-slate-100 p-8 rounded-2xl shadow-xl flex flex-col relative max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ❌
            </button>

            {/* Cabecera del Modal */}
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                <span>🔍</span> Detalle del Log #{selectedLog.id}
              </h2>
              <p className="mt-1 text-slate-500 text-xs font-semibold">
                Registrado el {formatDateTime(selectedLog.created_at)}
              </p>
            </div>

            {/* Contenido del Modal (Scrollable si es largo) */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 select-text">
              {/* Bloque Metadatos Básicos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Usuario
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">
                    {selectedLog.user ? selectedLog.user.name : "Sistema"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Módulo
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5 uppercase">
                    {selectedLog.modulo}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Acción
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5 uppercase font-mono">
                    {selectedLog.accion}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Dirección IP
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5 font-mono">
                    {selectedLog.ip_address || "No registrada"}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Descripción del Evento
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 leading-relaxed">
                  {selectedLog.descripcion}
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dispositivo / Agente de Usuario
                  </span>
                  <p
                    className="text-[11px] font-semibold text-slate-500 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 truncate"
                    title={selectedLog.user_agent}
                  >
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}

              {/* COMPARATIVA DE CAMBIOS (Valores anteriores y nuevos) */}
              {diffData.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Comparativa de Cambios
                  </span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                          <th className="px-4 py-2.5">Propiedad</th>
                          <th className="px-4 py-2.5">Antes</th>
                          <th className="px-4 py-2.5">Después</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {diffData.map((field) => (
                          <tr
                            key={field.key}
                            className={`transition-colors ${field.isChanged ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="px-4 py-2.5 font-bold font-mono text-slate-700">
                              {field.key}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-medium">
                              {field.prev !== null ? (
                                typeof field.prev === "object" ? (
                                  <pre className="text-[10px] font-mono whitespace-pre-wrap">
                                    {JSON.stringify(field.prev)}
                                  </pre>
                                ) : (
                                  field.prev.toString()
                                )
                              ) : (
                                <span className="text-slate-300 italic">
                                  nulo/vacío
                                </span>
                              )}
                            </td>
                            <td
                              className={`px-4 py-2.5 font-bold ${field.isChanged ? "text-amber-600" : "text-slate-600 font-medium"}`}
                            >
                              {field.next !== null ? (
                                typeof field.next === "object" ? (
                                  <pre className="text-[10px] font-mono whitespace-pre-wrap">
                                    {JSON.stringify(field.next)}
                                  </pre>
                                ) : (
                                  field.next.toString()
                                )
                              ) : (
                                <span className="text-slate-300 italic">
                                  eliminado
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow transition-all duration-150 active:scale-95 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
