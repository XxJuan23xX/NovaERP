import { useState, useEffect, useMemo, Fragment } from "react";
import Navigation from "../components/Navigation";
import api from "../services/api";

// Función helper para calcular los puntos de control de una curva Bézier cúbica (Catmull-Rom)
function calcularPuntosDeControl(current, previous, next, reverse) {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.15; // Factor de suavizado para las curvas

  const lengthX = n.x - p.x;
  const lengthY = n.y - p.y;
  const length = Math.sqrt(lengthX * lengthX + lengthY * lengthY);
  const angle = Math.atan2(lengthY, lengthX);

  const ctrlAngle = angle + (reverse ? Math.PI : 0);
  const ctrlLength = length * smoothing;

  return {
    x: Number((current.x + Math.cos(ctrlAngle) * ctrlLength).toFixed(2)),
    y: Number(
      Math.max(
        25,
        Math.min(195, current.y + Math.sin(ctrlAngle) * ctrlLength),
      ).toFixed(2),
    ),
  };
}

// Datos estáticos de prueba para simular las últimas 5 ventas del POS
const ultimasVentasMock = [
  {
    id: 1,
    folio: "V-1024",
    cliente: "Público General",
    metodo_pago: "efectivo",
    total: 1250.0,
    estado: "completada",
  },
  {
    id: 2,
    folio: "V-1023",
    cliente: "Tecnosoluciones MX",
    metodo_pago: "tarjeta",
    total: 4500.0,
    estado: "completada",
  },
  {
    id: 3,
    folio: "V-1022",
    cliente: "Distribuidora Norte",
    metodo_pago: "tarjeta",
    total: 820.0,
    estado: "completada",
  },
  {
    id: 4,
    folio: "V-1021",
    cliente: "Empresa Acme S.A.",
    metodo_pago: "efectivo",
    total: 3400.0,
    estado: "pendiente",
  },
  {
    id: 5,
    folio: "V-1020",
    cliente: "Servicios Globales",
    metodo_pago: "tarjeta",
    total: 1500.0,
    estado: "completada",
  },
];

// Datos estáticos de prueba para simular las últimas 4 alertas críticas de seguridad/auditoría
const alertasAuditoriaMock = [
  {
    id: 1,
    accion: "Cierre de caja con descuadres",
    detalle: "Descuadre de -$150.00 en efectivo",
    severidad: "danger",
    hora: "08:45 AM",
    usuario: "Empleado Ventas",
  },
  {
    id: 2,
    accion: "Ajuste manual de stock",
    detalle: "Modificación de 5 piezas en SKU-00001",
    severidad: "warning",
    hora: "08:12 AM",
    usuario: "admin@novaerp.com",
  },
  {
    id: 3,
    accion: "Intento de login fallido",
    detalle: "3 intentos fallidos desde IP 192.168.1.45",
    severidad: "danger",
    hora: "07:30 AM",
    usuario: "cajero_norte",
  },
  {
    id: 4,
    accion: "Cambio de permisos",
    detalle: "Rol cambiado de cajero a supervisor",
    severidad: "warning",
    hora: "Ayer, 05:20 PM",
    usuario: "admin@novaerp.com",
  },
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fechaActual, setFechaActual] = useState(new Date());
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Estado para el tooltip interactivo de la gráfica lineal
  const [activePoint, setActivePoint] = useState(null); // { x, y, value, label }

  // Temporizador para el reloj en la cabecera
  useEffect(() => {
    const timer = setInterval(() => {
      setFechaActual(new Date());
    }, 60000);
    return () => clearInterval(timer);
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

  // Carga asíncrona de datos del Dashboard
  useEffect(() => {
    async function cargarDashboardData() {
      try {
        const res = await api.get("/dashboard");
        if (res.data?.status === "success") {
          setData(res.data.data);
        } else {
          setError("No se pudo obtener la información de rendimiento.");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err);
        setError(
          "Error de comunicación con el servidor. Verifica tu conexión.",
        );
        setLoading(false);
      }
    }
    cargarDashboardData();
  }, [retryTrigger]);

  // Reintentar carga en caso de error
  const handleReintentar = () => {
    setLoading(true);
    setError("");
    setRetryTrigger((prev) => prev + 1);
  };

  // ── CÁLCULO DE COORDENADAS PARA LA GRÁFICA DE LÍNEAS (SVG) ──
  const lineChartData = useMemo(() => {
    if (!data?.grafica_ventas || data.grafica_ventas.length === 0) return null;

    const pointsData = data.grafica_ventas;
    const maxVal = Math.max(...pointsData.map((d) => d.ventas), 1000);

    // Dimensiones lógicas dentro de la viewBox="0 0 500 240"
    const startX = 55;
    const endX = 465;
    const startY = 195;
    const endY = 25;

    const widthSpan = endX - startX;
    const heightSpan = startY - endY;

    const points = pointsData.map((d, i) => {
      const x = startX + (i * widthSpan) / (pointsData.length - 1);
      const y = startY - (d.ventas * heightSpan) / maxVal;
      return { x, y, label: d.dia, value: d.ventas, date: d.fecha };
    });

    const linePath = points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

      const cp1 = calcularPuntosDeControl(a[i - 1], a[i - 2], p, false);
      const cp2 = calcularPuntosDeControl(p, a[i - 1], a[i + 1], true);

      return `${acc} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }, "");

    const fillPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${startY} L ${points[0].x.toFixed(2)} ${startY} Z`;

    // Líneas guía horizontales (4 subdivisiones)
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal * i) / 4;
      const y = startY - (val * heightSpan) / maxVal;
      gridLines.push({ y, value: val });
    }

    return {
      points,
      linePath,
      fillPath,
      gridLines,
      maxVal,
      startX,
      endX,
      startY,
    };
  }, [data]);

  // ── CÁLCULO PARA LA GRÁFICA DE ANILLOS / DONUT (SVG) ──
  const donutChartData = useMemo(() => {
    if (!data?.grafica_categorias || data.grafica_categorias.length === 0)
      return null;

    const categories = data.grafica_categorias;
    const colors = [
      "#4f46e5",
      "#10b981",
      "#f59e0b",
      "#f43f5e",
      "#8b5cf6",
      "#3b82f6",
    ];
    const circumference = 2 * Math.PI * 70; // Radio = 70. Circunferencia = 439.82
    const gap = 5; // Margen/espacio visual en píxeles entre segmentos

    let accumulatedPercentage = 0;
    const segments = categories.map((cat, i) => {
      const pct = cat.porcentaje;
      const segmentLength = (circumference * pct) / 100;
      // Restamos el gap para dejar un espacio visual entre cada categoría
      const visibleLength = Math.max(1.5, segmentLength - gap);
      const strokeDashoffset = circumference - visibleLength;
      const rotation = (accumulatedPercentage * 360) / 100;
      accumulatedPercentage += pct;

      return {
        ...cat,
        color: colors[i % colors.length],
        strokeDasharray: `${circumference}`,
        strokeDashoffset,
        rotation,
      };
    });

    return { segments, circumference };
  }, [data]);

  const formatMoneda = (val) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const renderKPIChange = (change) => {
    if (!change) return null;
    const isIncrease = change.change_type === "increase";
    const isDecrease = change.change_type === "decrease";

    let colorClass = "text-slate-400";
    let symbol = "";
    if (isIncrease) {
      colorClass = "text-emerald-600 bg-emerald-50 border border-emerald-100";
      symbol = "↑";
    } else if (isDecrease) {
      colorClass = "text-rose-600 bg-rose-50 border border-rose-100";
      symbol = "↓";
    }

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black leading-none ${colorClass}`}
      >
        {symbol} {Math.abs(change.change_percentage)}%
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-600">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main Panel */}
      <main className="flex-1 min-w-0 flex flex-col p-8 overflow-y-auto">
        {/* Cabecera */}
        <header className="flex flex-row items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-[25px]! font-black text-black! tracking-tight m-0 select-none">
              Dashboard Principal
            </h1>
            <p className="text-slate-650 font-bold text-[12px]! mt-1.5 select-none">
              {fechaFormateada} · Resumen general del rendimiento de ventas e
              indicadores clave del ERP.
            </p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3.5 rounded-2xl mb-6 flex items-start gap-3 shadow-sm">
            <svg
              className="h-5 w-5 mt-0.5 shrink-0 text-red-500"
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
            <span className="font-extrabold text-sm leading-snug">{error}</span>
            <button
              onClick={handleReintentar}
              className="ml-auto text-indigo-650 hover:text-indigo-850 font-black text-xs cursor-pointer active:scale-95"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <svg
              className="animate-spin h-8 w-8 text-indigo-600 mb-2"
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
            <span className="font-bold text-xs">
              Cargando indicadores de ventas...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs Grid */}
            {data?.kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* KPI Card 1: Ventas Hoy */}
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider block">
                      Ventas Hoy
                    </span>
                    <h3 className="text-2xl font-black text-blue-900 mt-2 select-all">
                      {formatMoneda(data.kpis.ventas_hoy.value)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-200/40 flex items-center justify-between text-blue-500 text-[10px] font-bold">
                    <span>Comparado con ayer</span>
                    {renderKPIChange(data.kpis.ventas_hoy)}
                  </div>
                </div>

                {/* KPI Card 2: Tickets */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                      Tickets de Hoy
                    </span>
                    <h3 className="text-2xl font-black text-emerald-900 mt-2 select-all">
                      {data.kpis.tickets_hoy.value}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-200/40 flex items-center justify-between text-emerald-600 text-[10px] font-bold">
                    <span>Volumen emitido</span>
                    {renderKPIChange(data.kpis.tickets_hoy)}
                  </div>
                </div>

                {/* KPI Card 3: Ticket Promedio */}
                <div className="bg-purple-50 border border-purple-200 rounded-sm p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-650 tracking-wider block">
                      Ticket Promedio
                    </span>
                    <h3 className="text-2xl font-black text-purple-900 mt-2 select-all">
                      {formatMoneda(data.kpis.ticket_promedio.value)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-purple-200/40 flex items-center justify-between text-purple-650 text-[10px] font-bold">
                    <span>Monto promedio</span>
                    {renderKPIChange(data.kpis.ticket_promedio)}
                  </div>
                </div>

                {/* KPI Card 4: Clientes Activos */}
                <div className="bg-rose-50 border border-rose-200/80 rounded-sm p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider block">
                      Clientes Activos
                    </span>
                    <h3 className="text-2xl font-black text-rose-900 mt-2 select-all">
                      {data.kpis.clientes_activos.value}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-200/40 flex items-center justify-between text-rose-600 text-[10px] font-bold">
                    <span>Base clientes CRM</span>
                    {renderKPIChange(data.kpis.clientes_activos)}
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Graphic 1: Ventas por día (Line chart) */}
              <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col h-[380px] lg:col-span-2 relative">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  Ventas por Día (Últimos 7 días)
                </h3>

                {lineChartData ? (
                  <div className="flex-1 min-h-0 relative">
                    <svg viewBox="0 0 500 240" className="w-full h-full">
                      <style>{`
                         @keyframes drawLine {
                           from { stroke-dashoffset: 1000; }
                           to { stroke-dashoffset: 0; }
                         }
                         @keyframes fadeInArea {
                           from { opacity: 0; }
                           to { opacity: 1; }
                         }
                         .animate-line-draw {
                           stroke-dasharray: 1000;
                           stroke-dashoffset: 1000;
                           animation: drawLine 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                         }
                         .animate-area-fade {
                           opacity: 0;
                           animation: fadeInArea 0.8s ease-out 1.1s forwards;
                         }
                       `}</style>
                      <defs>
                        {/* Gradiente debajo de la línea de ventas */}
                        <linearGradient
                          id="area-gradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#4f46e5"
                            stopOpacity="0.25"
                          />
                          <stop
                            offset="100%"
                            stopColor="#4f46e5"
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>

                      {/* Guías Horizontales y Eje Y */}
                      {lineChartData.gridLines.map((line, idx) => (
                        <g key={idx}>
                          <line
                            x1={lineChartData.startX}
                            y1={line.y}
                            x2={lineChartData.endX}
                            y2={line.y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={lineChartData.startX - 14}
                            y={line.y + 4}
                            textAnchor="end"
                            className="fill-slate-400 text-[9px] font-bold"
                          >
                            {line.value >= 1000
                              ? `${(line.value / 1000).toFixed(1)}k`
                              : line.value}
                          </text>
                        </g>
                      ))}

                      {/* Área rellena bajo la línea */}
                      <path
                        d={lineChartData.fillPath}
                        fill="url(#area-gradient)"
                        className="animate-area-fade"
                      />

                      {/* Línea principal */}
                      <path
                        d={lineChartData.linePath}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-line-draw"
                      />

                      {/* Eje X y sus etiquetas */}
                      <line
                        x1={lineChartData.startX}
                        y1={lineChartData.startY}
                        x2={lineChartData.endX}
                        y2={lineChartData.startY}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />

                      {lineChartData.points.map((p, idx) => (
                        <g key={idx}>
                          <text
                            x={p.x}
                            y={lineChartData.startY + 15}
                            textAnchor="middle"
                            className="fill-slate-500 text-[9px] font-black"
                          >
                            {p.label}
                          </text>
                          {/* Área invisible grande para facilitar el hover */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="20"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => {
                              setActivePoint({
                                x: p.x,
                                y: p.y,
                                value: p.value,
                                label: p.label,
                                date: p.date,
                              });
                            }}
                            onMouseLeave={() => setActivePoint(null)}
                          />
                        </g>
                      ))}

                      {/* Círculo activo visible únicamente en hover */}
                      {activePoint && (
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.y}
                          r="5.5"
                          className="fill-white stroke-indigo-600 stroke-[3.5px] pointer-events-none"
                        />
                      )}
                    </svg>

                    {/* Tooltip dinámico absoluto dentro de la tarjeta */}
                    {activePoint && (
                      <div
                        className="absolute bg-slate-900 text-white rounded-xl px-3 py-2 text-[10px] font-bold shadow-xl border border-slate-700 pointer-events-none transition-all z-10"
                        style={{
                          left: `${(activePoint.x / 500) * 100}%`,
                          top: `${(activePoint.y / 240) * 100 - 18}%`,
                          transform: "translate(-50%, -100%)",
                        }}
                      >
                        <p className="text-slate-400 font-semibold">
                          {activePoint.date}
                        </p>
                        <p className="text-white text-xs mt-0.5">
                          {formatMoneda(activePoint.value)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                    Sin datos de ventas disponibles
                  </div>
                )}
              </div>

              {/* Graphic 2: Ventas por categoría (Donut/Ring chart) */}
              <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col h-[380px] lg:col-span-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  Ventas por Categoría
                </h3>

                {donutChartData ? (
                  <div className="flex-1 flex flex-col items-center justify-between min-h-0">
                    {/* SVG Donut */}
                    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center mt-2">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full -rotate-90"
                      >
                        <style>{`
                          @keyframes drawDonut {
                            from { stroke-dashoffset: 439.82; }
                            to { stroke-dashoffset: var(--target-offset); }
                          }
                          @keyframes fadeInDonutText {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                          }
                          .animate-donut-segment {
                            animation: drawDonut 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                            animation-delay: calc(var(--index) * 0.25s);
                          }
                          .animate-donut-text-fade {
                            opacity: 0;
                            animation: fadeInDonutText 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s forwards;
                          }
                        `}</style>
                        {donutChartData.segments.map((seg, idx) => (
                          <circle
                            key={idx}
                            cx="100"
                            cy="100"
                            r="70"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="18"
                            strokeDasharray={seg.strokeDasharray}
                            style={{
                              "--target-offset": `${seg.strokeDashoffset}px`,
                              "--index": idx,
                              strokeDashoffset: "439.82px",
                            }}
                            transform={`rotate(${seg.rotation} 100 100)`}
                            className="transition-all duration-300 hover:stroke-[22px] cursor-pointer animate-donut-segment"
                          />
                        ))}
                      </svg>
                      {/* Texto de Valor Total Agregado en el Centro */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none animate-donut-text-fade">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          Total
                        </span>
                        <span className="text-xs font-black text-slate-800 mt-0.5">
                          {formatMoneda(
                            data.grafica_categorias.reduce(
                              (sum, item) => sum + item.ventas,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Leyendas con Color Indicators */}
                    <div className="w-full mt-3 space-y-1.5 overflow-y-auto max-h-[120px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {donutChartData.segments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[10px] font-bold"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: seg.color }}
                            />
                            <span className="text-slate-700 truncate">
                              {seg.categoria}
                            </span>
                          </div>
                          <div className="flex gap-2 text-right shrink-0">
                            <span className="text-slate-400">
                              {seg.porcentaje}%
                            </span>
                            <span className="text-slate-800">
                              {formatMoneda(seg.ventas)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                    Sin categorías de ventas registradas
                  </div>
                )}
              </div>
            </div>

            {/* Nueva Sección: Últimas Ventas y Alertas de Auditoría */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Últimas Ventas (60% / col-span-2) */}
              <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col h-[380px] lg:col-span-2 relative min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  ÚLTIMAS VENTAS (TIEMPO REAL)
                </h3>
                <div className="flex-1 overflow-x-auto min-h-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-semibold">
                        <th className="pb-3 pr-2 select-none">Folio</th>
                        <th className="pb-3 px-2 select-none">Cliente</th>
                        <th className="pb-3 px-2 select-none">
                          Método de Pago
                        </th>
                        <th className="pb-3 px-2 text-right select-none">
                          Total
                        </th>
                        <th className="pb-3 pl-2 text-center select-none">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {ultimasVentasMock.map((venta) => (
                        <Fragment key={venta.id}>
                          <tr className="hover:bg-slate-50/60 transition-colors duration-150">
                            <td className="py-3 pr-2 text-indigo-600 font-extrabold select-all">
                              {venta.folio}
                            </td>
                            <td className="py-3 px-2 text-slate-900 truncate max-w-[150px]">
                              {venta.cliente}
                            </td>
                            <td className="py-3 px-2 capitalize">
                              {venta.metodo_pago}
                            </td>
                            <td className="py-3 px-2 text-right select-all">
                              {formatMoneda(venta.total)}
                            </td>
                            <td className="py-3 pl-2 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold leading-none ${
                                  venta.estado === "completada"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}
                              >
                                {venta.estado === "completada"
                                  ? "Completada"
                                  : "Pendiente"}
                              </span>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Columna Derecha: Alertas de Auditoría (40% / col-span-1) */}
              <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col h-[380px] lg:col-span-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  ALERTAS CRÍTICAS DE SEGURIDAD
                </h3>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {alertasAuditoriaMock.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`border rounded-sm p-3 transition-colors duration-150 flex flex-col gap-1.5 ${
                        alerta.severidad === "danger"
                          ? "bg-rose-100 border-rose-200 hover:bg-rose-50/55 hover:border-rose-200"
                          : "bg-amber-100 border-amber-200 hover:bg-amber-50/60 hover:border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                          {alerta.accion}
                        </span>
                        <span
                          className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold leading-none ${
                            alerta.severidad === "danger"
                              ? "bg-white text-rose-600 border border-rose-100"
                              : "bg-white text-amber-600 border border-amber-100"
                          }`}
                        >
                          {alerta.severidad === "danger"
                            ? "Peligro"
                            : "Advertencia"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                        {alerta.detalle}
                      </p>
                      <div
                        className={`flex items-center justify-between text-[9px] text-slate-400 font-bold border-t pt-1.5 mt-0.5 select-none ${
                          alerta.severidad === "danger"
                            ? "border-rose-100/50"
                            : "border-amber-100/50"
                        }`}
                      >
                        <span className="truncate max-w-[120px]">
                          Usuario: {alerta.usuario}
                        </span>
                        <span>{alerta.hora}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
