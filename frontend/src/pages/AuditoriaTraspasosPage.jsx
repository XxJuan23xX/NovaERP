import { useState, useEffect, useMemo, Fragment, useCallback } from "react";
import Navigation from "../components/Navigation";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

export default function AuditoriaTraspasosPage() {
  const { user } = useAuth();
  const [traspasos, setTraspasos] = useState([]);
  const [loading, setLoading] = useState(true); // 1. ESTADO INICIAL LIMPIO: Nace directamente en true
  const [error, setError] = useState("");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState(""); // Todos, en_transito, recibido, rechazado

  // Paginación (Laravel Native)
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fila seleccionada para mostrar detalles
  const [expandedTraspasoId, setExpandedTraspasoId] = useState(null);

  // Fecha y hora dinámica para la cabecera
  const [fechaActual, setFechaActual] = useState(new Date());

  // Almacenes para el modal
  const [almacenes, setAlmacenes] = useState([]);

  // States del Modal de Creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [almacenOrigenId, setAlmacenOrigenId] = useState("");
  const [almacenDestinoId, setAlmacenDestinoId] = useState("");
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("1");
  const [productosOrigen, setProductosOrigen] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [loadingProductosModal, setLoadingProductosModal] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  // States del Modal de Confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null); // { id, accion, codigo }
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [errorConfirm, setErrorConfirm] = useState("");

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

  // 2. PROHIBIDO LLAMAR SETSTATE SÍNCRONAMENTE EN LOS EFFECTS:
  // Carga memoizada usando useCallback para evitar recrear la referencia en cada render.
  // Las mutaciones de estado ocurren ÚNICAMENTE después del await de la promesa.
  const cargarTraspasos = useCallback(
    async function cargarTraspasos(page = 1) {
      try {
        const res = await api.get("/inventario/traspasos", {
          params: {
            page: page,
            codigo_traspaso: busqueda,
            estado: estadoFiltro,
          },
        });

        if (res.data?.status === "success") {
          const paginatedData = res.data.data;
          setTraspasos(paginatedData.data || []);
          setCurrentPage(paginatedData.current_page || 1);
          setLastPage(paginatedData.last_page || 1);
          setTotalRecords(paginatedData.total || 0);
        } else {
          setError("No se pudo obtener el historial de traspasos.");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar traspasos:", err);
        setError("Error al conectar con el servidor. Verifica tu conexión.");
        setLoading(false);
      }
    },
    [busqueda, estadoFiltro],
  );

  // Carga de almacenes encapsulada dentro del useEffect para que la función sea local
  // y no genere dependencias externas que gatillen advertencias o renders en cascada.
  useEffect(() => {
    async function cargarAlmacenes() {
      try {
        const res = await api.get("/inventario/almacenes");
        if (res.data?.status === "success") {
          setAlmacenes(res.data.data || []);
        }
      } catch (err) {
        console.error("Error al cargar almacenes:", err);
      }
    }
    cargarAlmacenes();
  }, []);

  // Carga de productos por almacén origen (llamada desde manejadores de eventos)
  async function fetchProductosModal(origenId) {
    try {
      const res = await api.get("/inventario/productos", {
        params: { almacen_id: origenId },
      });
      if (res.data) {
        const listaProd = res.data.data || [];
        const conStock = listaProd.filter(
          (p) => (p.stock !== undefined ? p.stock : 0) > 0,
        );
        setProductosOrigen(conStock);
      }
      setLoadingProductosModal(false);
    } catch (err) {
      console.error("Error al cargar productos del almacén origen:", err);
      setErrorModal("Error al cargar productos para este almacén.");
      setLoadingProductosModal(false);
    }
  }

  // Cargar traspasos al cambiar filtros (con debounce)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      cargarTraspasos(1);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [cargarTraspasos]);

  // Manejadores de filtros para setear loading en la interacción del usuario
  const handleBusquedaChange = (e) => {
    setBusqueda(e.target.value);
    setLoading(true);
  };

  const handleEstadoFiltroChange = (e) => {
    setEstadoFiltro(e.target.value);
    setLoading(true);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= lastPage) {
      setLoading(true);
      cargarTraspasos(newPage);
    }
  };

  // Alternar expansión de fila
  const toggleRow = (id) => {
    setExpandedTraspasoId((prev) => (prev === id ? null : id));
  };

  // Cambiar estado en el badge
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case "recibido":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Recibido
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rechazado
          </span>
        );
      case "en_transito":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-250">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            En Tránsito
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Abrir Modal de Creación con reseteos correspondientes
  const abrirModalCreacion = () => {
    setErrorModal("");
    setAlmacenDestinoId("");
    setProductoSeleccionadoId("");
    setCantidadProducto("1");
    setProductosSeleccionados([]);
    setProductosOrigen([]);
    setLoadingProductosModal(false);

    if (user && almacenes.length > 0) {
      // Si no es admin de Matriz, la sucursal origen queda fija a la del usuario (Ajuste de seguridad)
      if (!(user.role === "admin" && user.sucursal === "Matriz")) {
        const matchingAlmacen = almacenes.find(
          (a) => a.nombre.toLowerCase() === user.sucursal.toLowerCase(),
        );
        if (matchingAlmacen) {
          setAlmacenOrigenId(matchingAlmacen.id);
          setLoadingProductosModal(true);
          fetchProductosModal(matchingAlmacen.id);
        } else {
          setAlmacenOrigenId("");
        }
      } else {
        setAlmacenOrigenId("");
      }
    } else {
      setAlmacenOrigenId("");
    }

    setShowCreateModal(true);
  };

  // Manejador del cambio de Almacén Origen (Ajuste de seguridad 3)
  const handleAlmacenOrigenChange = (e) => {
    const val = e.target.value;
    setAlmacenOrigenId(val);
    // Limpiar productos previamente seleccionados para evitar discrepancias
    setProductosSeleccionados([]);
    setProductoSeleccionadoId("");
    setCantidadProducto("1");
    setProductosOrigen([]);

    if (val) {
      setLoadingProductosModal(true);
      fetchProductosModal(val);
    }
  };

  // Agregar producto a la lista de seleccionados
  const agregarProducto = () => {
    if (!productoSeleccionadoId) return;
    const prod = productosOrigen.find(
      (p) => p.id === Number(productoSeleccionadoId),
    );
    if (!prod) return;

    const cant = parseFloat(cantidadProducto);
    if (isNaN(cant) || cant <= 0) {
      alert("Ingrese una cantidad válida mayor a cero.");
      return;
    }

    if (cant > prod.stock) {
      alert(
        `La cantidad no puede superar el stock disponible (${prod.stock} ${prod.unidad_medida || "uds"}).`,
      );
      return;
    }

    const existeIdx = productosSeleccionados.findIndex(
      (p) => p.producto_id === prod.id,
    );
    if (existeIdx > -1) {
      const nuevaCant = productosSeleccionados[existeIdx].cantidad + cant;
      if (nuevaCant > prod.stock) {
        alert(
          `La cantidad total no puede superar el stock disponible (${prod.stock} ${prod.unidad_medida || "uds"}).`,
        );
        return;
      }
      const copia = [...productosSeleccionados];
      copia[existeIdx].cantidad = nuevaCant;
      setProductosSeleccionados(copia);
    } else {
      setProductosSeleccionados([
        ...productosSeleccionados,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          sku: prod.sku,
          stock_disponible: prod.stock,
          unidad_medida: prod.unidad_medida || "uds",
          cantidad: cant,
        },
      ]);
    }

    setProductoSeleccionadoId("");
    setCantidadProducto("1");
  };

  // Enviar Traspaso al servidor
  const handleSubmitTraspaso = async (e) => {
    e.preventDefault();
    if (!almacenOrigenId || !almacenDestinoId) {
      setErrorModal("Seleccione los almacenes de origen y destino.");
      return;
    }
    if (Number(almacenOrigenId) === Number(almacenDestinoId)) {
      setErrorModal("Los almacenes de origen y destino no pueden ser iguales.");
      return;
    }
    if (productosSeleccionados.length === 0) {
      setErrorModal("Debe seleccionar al menos un producto.");
      return;
    }

    // Validar stock antes de enviar
    for (const item of productosSeleccionados) {
      if (item.cantidad <= 0) {
        setErrorModal(`La cantidad para ${item.nombre} debe ser mayor a 0.`);
        return;
      }
      if (item.cantidad > item.stock_disponible) {
        setErrorModal(
          `La cantidad para ${item.nombre} supera el stock disponible (${item.stock_disponible}).`,
        );
        return;
      }
    }

    setLoadingSubmit(true);
    setErrorModal("");

    try {
      const res = await api.post("/inventario/traspasos", {
        almacen_origen_id: Number(almacenOrigenId),
        almacen_destino_id: Number(almacenDestinoId),
        productos: productosSeleccionados.map((p) => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
        })),
      });

      if (res.data?.status === "success") {
        setShowCreateModal(false);
        setLoading(true);
        cargarTraspasos(1);
      } else {
        setErrorModal(res.data?.message || "Error al crear el traspaso.");
      }
    } catch (err) {
      console.error("Error al crear traspaso:", err);
      setErrorModal(
        err.response?.data?.message || "Error al conectar con el servidor.",
      );
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Lógica para habilitar botones "Recibir" o "Rechazar"
  const puedeConfirmar = (traspaso) => {
    if (!user) return false;
    if (traspaso.estado !== "en_transito") return false;

    // Super Admin o Admin de la sede Matriz puede confirmar cualquier traspaso
    if (user.role === "admin" && user.sucursal === "Matriz") {
      return true;
    }

    // Otros usuarios sólo pueden confirmar si su sucursal coincide con la de destino
    const sucursalDestino = traspaso.almacen_destino?.nombre || "";
    return sucursalDestino.toLowerCase() === user.sucursal.toLowerCase();
  };

  // Disparar confirmación
  const triggerConfirmAction = (id, accion, codigo) => {
    setConfirmData({ id, accion, codigo });
    setErrorConfirm("");
    setShowConfirmModal(true);
  };

  // Procesar Recepción / Rechazo
  const handleConfirmAction = async () => {
    if (!confirmData) return;
    setLoadingConfirm(true);
    setErrorConfirm("");
    try {
      const res = await api.post(
        `/inventario/traspasos/${confirmData.id}/confirmar`,
        {
          accion: confirmData.accion,
        },
      );

      if (res.data?.status === "success") {
        setShowConfirmModal(false);
        setConfirmData(null);
        setLoading(true);
        cargarTraspasos(currentPage);
      } else {
        setErrorConfirm(
          res.data?.message || "Error al procesar la confirmación.",
        );
      }
    } catch (err) {
      console.error("Error al procesar confirmación:", err);
      setErrorConfirm(
        err.response?.data?.message || "Error al comunicar con el servidor.",
      );
    } finally {
      setLoadingConfirm(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-600">
      {/* Barra de Navegación Lateral */}
      <Navigation />

      {/* Panel de Contenido Principal */}
      <main className="flex-1 min-w-0 flex flex-col p-8 overflow-y-auto">
        {/* Cabecera de la Página */}
        <header className="flex flex-row items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-xl font-black text-black! tracking-tight m-0 select-none">
              Auditoría de Traspasos
            </h1>
            <p className="text-slate-500 text-xs font-bold mt-1 select-none">
              Historial de envío y recepción de existencias entre sucursales de
              la empresa.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-800 font-black bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg select-none">
              {fechaFormateada}
            </span>
            <button
              onClick={abrirModalCreacion}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer select-none"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nuevo Traspaso
            </button>
          </div>
        </header>

        {/* Buscador y Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Buscador */}
          <div className="relative md:col-span-2 rounded-2xl shadow-sm">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-450">
              <svg
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
              placeholder="Buscar por código de traspaso (ej. TR-10001)..."
              value={busqueda}
              onChange={handleBusquedaChange}
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-450 font-bold rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-sans"
            />
          </div>

          {/* Filtro Estado */}
          <div className="relative rounded-2xl shadow-sm">
            <select
              value={estadoFiltro}
              onChange={handleEstadoFiltroChange}
              className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-sans cursor-pointer appearance-none"
            >
              <option value="">Filtro: Todos los Estados</option>
              <option value="en_transito">En Tránsito</option>
              <option value="recibido">Recibidos</option>
              <option value="rechazado">Rechazados</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-450">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Mensaje de Error */}
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
              onClick={() => {
                setLoading(true);
                cargarTraspasos(1);
              }}
              className="ml-auto text-indigo-650 hover:text-indigo-850 font-black text-xs cursor-pointer active:scale-95"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Listado Principal de Traspasos */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Sucursal Origen
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Sucursal Destino
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Quién Envió
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Fecha Envío
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Acción
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody>
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-20 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-8 w-8 text-indigo-600"
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
                          Cargando traspasos...
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : traspasos.length === 0 ? (
                <tbody>
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-20 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <svg
                          className="h-10 w-10 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        <p className="font-bold text-slate-650 text-sm">
                          No se encontraron registros de traspaso
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Intenta con otro filtro o código de búsqueda.
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-100 bg-white">
                  {traspasos.map((traspaso) => {
                    const isExpanded = expandedTraspasoId === traspaso.id;
                    return (
                      <Fragment key={traspaso.id}>
                        {/* Fila Principal */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-extrabold text-slate-900">
                            {traspaso.codigo_traspaso}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-700">
                            {traspaso.almacen_origen?.nombre || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-700">
                            {traspaso.almacen_destino?.nombre || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-600">
                            {traspaso.usuario?.name || "N/A"}
                            <span className="block text-[9px] text-slate-400 capitalize font-semibold">
                              {traspaso.usuario?.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-500">
                            {formatDate(traspaso.fecha_envio)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {renderBadgeEstado(traspaso.estado)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => toggleRow(traspaso.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg flex items-center justify-center gap-1 mx-auto transition-all active:scale-95 cursor-pointer"
                            >
                              <span>{isExpanded ? "Ocultar" : "Detalles"}</span>
                              <svg
                                className={`h-2.5 w-2.5 transform transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>

                        {/* Fila Detalle (Expandida) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan="7" className="px-8 py-5">
                              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-w-4xl">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-150 pb-2 mb-3">
                                  📦 Detalle de Artículos Enviados
                                </h3>

                                <div className="space-y-3">
                                  {traspaso.detalles &&
                                  traspaso.detalles.length > 0 ? (
                                    traspaso.detalles.map((det) => (
                                      <div
                                        key={det.id}
                                        className="flex justify-between items-center text-xs font-semibold py-1.5 border-b border-slate-100 last:border-0"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="text-slate-850 font-bold leading-tight">
                                            {det.producto?.nombre}
                                          </p>
                                          <p className="text-slate-400 text-[10px] font-semibold mt-0.5 uppercase tracking-wider">
                                            SKU: {det.producto?.sku}
                                          </p>
                                        </div>
                                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold rounded-lg select-none">
                                          {Number(det.cantidad)} uds.
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-slate-400 font-semibold italic text-center py-2">
                                      No hay detalles registrados para este
                                      traspaso.
                                    </p>
                                  )}
                                </div>

                                {/* Acciones de confirmación (Ajuste de seguridad 2) */}
                                {puedeConfirmar(traspaso) && (
                                  <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-800">
                                        Acciones del Traspaso
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">
                                        Confirma la recepción del inventario
                                        físico en tu sucursal o recházalo para
                                        retornar las unidades al origen.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() =>
                                          triggerConfirmAction(
                                            traspaso.id,
                                            "recibir",
                                            traspaso.codigo_traspaso,
                                          )
                                        }
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer select-none"
                                      >
                                        Recibir Traspaso
                                      </button>
                                      <button
                                        onClick={() =>
                                          triggerConfirmAction(
                                            traspaso.id,
                                            "rechazar",
                                            traspaso.codigo_traspaso,
                                          )
                                        }
                                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer select-none"
                                      >
                                        Rechazar Traspaso
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Metadatos adicionales */}
                                <div className="mt-5 pt-3 border-t border-slate-150 flex flex-wrap justify-between text-[11px] font-bold text-slate-500 gap-4">
                                  <div className="flex gap-1.5">
                                    <span>Fecha Recepción:</span>
                                    <span className="text-slate-700">
                                      {formatDate(traspaso.fecha_recepcion)}
                                    </span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <span>Identificador del Sistema:</span>
                                    <span className="text-slate-700">
                                      #{traspaso.id}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {/* Pie de Tabla - Paginación */}
          {!loading && traspasos.length > 0 && (
            <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
              <span className="text-xs text-slate-500 font-semibold">
                Mostrando página{" "}
                <strong className="text-slate-800">{currentPage}</strong> de{" "}
                <strong className="text-slate-800">{lastPage}</strong> · Total:{" "}
                <strong className="text-slate-800">{totalRecords}</strong>{" "}
                registros
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-xl border border-slate-300 font-extrabold text-xs flex items-center gap-1 transition-all active:scale-95 ${
                    currentPage === 1
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                      : "bg-white text-slate-750 hover:bg-slate-150 cursor-pointer"
                  }`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Anterior
                </button>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === lastPage}
                  className={`px-3 py-1.5 rounded-xl border border-slate-300 font-extrabold text-xs flex items-center gap-1 transition-all active:scale-95 ${
                    currentPage === lastPage
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                      : "bg-white text-slate-750 hover:bg-slate-150 cursor-pointer"
                  }`}
                >
                  Siguiente
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Nuevo Traspaso (Ajuste de seguridad 3) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">
                Crear Nuevo Traspaso de Inventario
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer select-none"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmitTraspaso}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {errorModal && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-bold rounded-xl">
                  {errorModal}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Almacén Origen */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Almacén Origen
                  </label>
                  <select
                    value={almacenOrigenId}
                    onChange={handleAlmacenOrigenChange}
                    disabled={
                      !(user?.role === "admin" && user?.sucursal === "Matriz")
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Seleccionar Origen --</option>
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Almacén Destino */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Almacén Destino
                  </label>
                  <select
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Seleccionar Destino --</option>
                    {almacenes
                      .filter((a) => a.id !== Number(almacenOrigenId))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selector de Productos */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-850">
                  Agregar Artículos al Traspaso
                </h3>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <select
                      value={productoSeleccionadoId}
                      onChange={(e) =>
                        setProductoSeleccionadoId(e.target.value)
                      }
                      disabled={loadingProductosModal || !almacenOrigenId}
                      className="w-full bg-white border border-slate-300 text-slate-950 font-semibold rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {loadingProductosModal ? (
                        <option>Cargando catálogo...</option>
                      ) : !almacenOrigenId ? (
                        <option>Selecciona un Almacén de Origen</option>
                      ) : productosOrigen.length === 0 ? (
                        <option>Sin stock disponible en este almacén</option>
                      ) : (
                        <>
                          <option value="">-- Seleccionar producto --</option>
                          {productosOrigen.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.sku}) - Disponible: {p.stock}{" "}
                              {p.unidad_medida || "uds"}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="w-full sm:w-28 flex gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Cant"
                      value={cantidadProducto}
                      onChange={(e) => setCantidadProducto(e.target.value)}
                      disabled={!productoSeleccionadoId}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold rounded-xl px-2.5 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={agregarProducto}
                      disabled={!productoSeleccionadoId}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Seleccionados */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Artículos en el Traspaso ({productosSeleccionados.length})
                </h4>

                {productosSeleccionados.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-300 rounded-2xl text-xs text-slate-450 font-bold">
                    No se han seleccionado artículos.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-slate-500">
                            Producto
                          </th>
                          <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-slate-500">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-center text-[9px] font-black uppercase text-slate-500">
                            Disponible
                          </th>
                          <th className="px-3 py-2 text-center text-[9px] font-black uppercase text-slate-500 w-24">
                            Cantidad
                          </th>
                          <th className="px-3 py-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productosSeleccionados.map((item, idx) => (
                          <tr key={item.producto_id}>
                            <td className="px-3 py-2 font-bold text-slate-800">
                              {item.nombre}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-500">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">
                              {item.stock_disponible} {item.unidad_medida}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0.01"
                                max={item.stock_disponible}
                                step="any"
                                value={item.cantidad}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const copia = [...productosSeleccionados];
                                  copia[idx].cantidad = isNaN(val) ? "" : val;
                                  setProductosSeleccionados(copia);
                                }}
                                className="w-16 px-1.5 py-0.5 border border-slate-350 rounded-lg text-center font-bold text-slate-900"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const copia = productosSeleccionados.filter(
                                    (_, i) => i !== idx,
                                  );
                                  setProductosSeleccionados(copia);
                                }}
                                className="text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer transition-colors"
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitTraspaso}
                disabled={loadingSubmit || productosSeleccionados.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {loadingSubmit ? "Guardando..." : "Enviar Traspaso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Acciones (Ajuste de seguridad 2) */}
      {showConfirmModal && confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">
                Confirmar Acción
              </h2>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer select-none"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {errorConfirm && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-bold rounded-xl">
                  {errorConfirm}
                </div>
              )}

              <p className="text-xs text-slate-700 font-bold leading-relaxed">
                ¿Estás seguro de que deseas{" "}
                <span
                  className={`font-black ${confirmData.accion === "recibir" ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {confirmData.accion === "recibir" ? "RECIBIR" : "RECHAZAR"}
                </span>{" "}
                el traspaso{" "}
                <strong className="text-slate-900">{confirmData.codigo}</strong>
                ?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-semibold leading-relaxed">
                {confirmData.accion === "recibir" ? (
                  <span>
                    <strong>Efecto en inventario:</strong> Las existencias
                    detalladas se sumarán al stock disponible en tu sucursal.
                  </span>
                ) : (
                  <span>
                    <strong>Efecto en inventario:</strong> Las existencias se
                    retornarán y sumarán de vuelta en la sucursal de origen.
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loadingConfirm}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={loadingConfirm}
                className={`px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                  confirmData.accion === "recibir"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {loadingConfirm ? "Procesando..." : "Sí, confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
