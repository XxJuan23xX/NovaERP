import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/useAuth";

// Formato de Moneda
const formatCurrency = (val) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);
};

export default function CotizacionesPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Estados Principales
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  // Control de Vistas
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState(null); // Para editar borrador
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null); // Detalle de cotización seleccionada

  // Formulario de Cotización
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [fechaEmision, setFechaEmision] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [fechaVigencia, setFechaVigencia] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [cartItems, setCartItems] = useState([]); // { producto, cantidad, descuento_porcentaje }
  const [observaciones, setObservaciones] = useState("");

  // Modal para rápido cliente nuevo
  const [quickClientModal, setQuickClientModal] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({
    nombre_razon_social: "",
    rfc: "",
    email: "",
    telefono: "",
  });
  const [quickClientErrors, setQuickClientErrors] = useState({});

  // Cargar catálogos
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCot, resCli, resProd] = await Promise.all([
        api.get("/cotizaciones"),
        api.get("/clientes"),
        api.get("/inventario/productos"),
      ]);

      if (resCot.data?.status === "success") {
        setCotizaciones(resCot.data.data || []);
      }
      if (resCli.data?.status === "success") {
        setClientes(resCli.data.data || []);
      }
      // El backend devuelve los productos envueltos
      if (resProd.data) {
        setProductos(resProd.data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
      setError("Error de conexión al obtener datos de cotizaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Clientes y productos filtrados para autocompletes
  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return [];
    return clientes.filter(
      (c) =>
        c.nombre_razon_social
          .toLowerCase()
          .includes(clienteSearch.toLowerCase()) ||
        c.rfc.toLowerCase().includes(clienteSearch.toLowerCase()),
    );
  }, [clientes, clienteSearch]);

  const filteredProductos = useMemo(() => {
    if (!productSearch.trim()) return [];
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()),
    );
  }, [productos, productSearch]);

  // Cotizaciones filtradas para el listado principal
  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter((cot) => {
      const matchSearch =
        cot.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
        (cot.cliente
          ? cot.cliente.nombre_razon_social
              .toLowerCase()
              .includes(busqueda.toLowerCase())
          : "mostrador".includes(busqueda.toLowerCase()));

      const matchEstado =
        estadoFiltro === "Todos" || cot.estado === estadoFiltro;

      return matchSearch && matchEstado;
    });
  }, [cotizaciones, busqueda, estadoFiltro]);

  // Cálculos en tiempo real del carrito
  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = Number(item.producto.precio_venta) || 0;
      const discount = Number(item.descuento_porcentaje) || 0;
      const finalPrice = price * (1 - discount / 100);
      return sum + finalPrice * item.cantidad;
    }, 0);

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return { subtotal, iva, total };
  }, [cartItems]);

  // Manejo de carrito
  const handleAddProduct = (prod) => {
    const itemExistente = cartItems.find(
      (item) => item.producto.id === prod.id,
    );
    if (itemExistente) {
      setCartItems(
        cartItems.map((item) =>
          item.producto.id === prod.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
    } else {
      setCartItems([
        ...cartItems,
        { producto: prod, cantidad: 1, descuento_porcentaje: 0 },
      ]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleQtyChange = (prodId, val) => {
    const qty = parseInt(val, 10) || 1;
    setCartItems(
      cartItems.map((item) =>
        item.producto.id === prodId
          ? { ...item, cantidad: qty < 1 ? 1 : qty }
          : item,
      ),
    );
  };

  const handleDiscountChange = (prodId, val) => {
    const disc = parseFloat(val) || 0;
    setCartItems(
      cartItems.map((item) =>
        item.producto.id === prodId
          ? {
              ...item,
              descuento_porcentaje: disc < 0 ? 0 : disc > 100 ? 100 : disc,
            }
          : item,
      ),
    );
  };

  const handleRemoveItem = (prodId) => {
    setCartItems(cartItems.filter((item) => item.producto.id !== prodId));
  };

  // Crear Cliente Rápido
  const handleQuickClientSubmit = async (e) => {
    e.preventDefault();
    setQuickClientErrors({});
    if (!quickClientForm.nombre_razon_social.trim()) {
      setQuickClientErrors({
        nombre_razon_social: "El nombre es obligatorio.",
      });
      return;
    }
    if (!quickClientForm.rfc.trim()) {
      setQuickClientErrors({ rfc: "El RFC es obligatorio." });
      return;
    }

    try {
      // Registrar un cliente con los datos básicos
      const payload = {
        ...quickClientForm,
        rfc: quickClientForm.rfc.toUpperCase(),
        regimen_fiscal: "601", // Por defecto para simplificar
        uso_cfdi: "G03",
        codigo_postal_fiscal: "06000",
        direccion_fiscal_calle: "Conocido",
        direccion_fiscal_num_ext: "SN",
        direccion_fiscal_colonia: "Centro",
        direccion_fiscal_municipio: "Cuauhtémoc",
        direccion_fiscal_estado: "CDMX",
        tipo_cliente: "Público General",
        limite_credito: 0,
      };

      const res = await api.post("/clientes", payload);
      if (res.data?.status === "success") {
        const newClient = res.data.data;
        // Agregar al catálogo local y seleccionarlo
        setClientes([...clientes, newClient]);
        setSelectedCliente(newClient);
        setClienteSearch(newClient.nombre_razon_social);
        setQuickClientModal(false);
        setQuickClientForm({
          nombre_razon_social: "",
          rfc: "",
          email: "",
          telefono: "",
        });
      }
    } catch (err) {
      console.error("Error al crear cliente rápido:", err);
      if (err.response?.data?.errors) {
        setQuickClientErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || "Error al crear cliente.");
      }
    }
  };

  // Guardar Cotización
  const handleSaveCotizacion = async (estado) => {
    if (cartItems.length === 0) {
      alert("Debes agregar al menos un producto.");
      return;
    }

    try {
      const payload = {
        cliente_id: selectedCliente ? selectedCliente.id : null,
        fecha_emision: fechaEmision,
        fecha_vigencia: fechaVigencia,
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        estado: estado,
        observaciones: observaciones,
        detalles: cartItems.map((item) => {
          const price = Number(item.producto.precio_venta) || 0;
          const disc = Number(item.descuento_porcentaje) || 0;
          const lineTotal = price * (1 - disc / 100) * item.cantidad;
          return {
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            precio_unitario: price,
            descuento_porcentaje: disc,
            total: lineTotal,
          };
        }),
      };

      let res;
      if (selectedCotizacion) {
        res = await api.put(`/cotizaciones/${selectedCotizacion.id}`, payload);
      } else {
        res = await api.post("/cotizaciones", payload);
      }

      if (res.data?.status === "success") {
        const savedCot = res.data.data;
        setIsCreating(false);
        setSelectedCotizacion(null);
        setCartItems([]);
        setSelectedCliente(null);
        setClienteSearch("");
        setObservaciones("");
        fetchData();

        if (estado === "vigente" && savedCot) {
          handlePrintCotizacion(savedCot.id);
        }
      }
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      alert("Ocurrió un error al intentar guardar la cotización.");
    }
  };

  // Convertir a Venta
  const handleConvertir = async (cot) => {
    try {
      // 1. Obtener detalles de la cotización completa si no la tenemos pre-cargada
      const res = await api.get(`/cotizaciones/${cot.id}`);
      if (res.data?.status === "success") {
        const fullCot = res.data.data;

        // 2. Guardar en localStorage para el POS
        localStorage.setItem(
          "pos_preselected_cotizacion",
          JSON.stringify({
            cotizacion_id: fullCot.id,
            cliente_id: fullCot.cliente_id,
            observaciones: fullCot.observaciones,
            productos: fullCot.detalles.map((det) => ({
              producto_id: det.producto_id,
              cantidad: det.cantidad,
              precio_unitario:
                Number(det.precio_unitario) *
                (1 - (Number(det.descuento_porcentaje) || 0) / 100),
              producto: det.producto,
            })),
          }),
        );

        // 3. Redirigir al POS
        navigate("/pos");
      }
    } catch (err) {
      console.error("Error al preparar la conversión a venta:", err);
      alert("No se pudo iniciar la conversión de esta cotización.");
    }
  };

  const handleOpenDetail = async (id) => {
    setDetailOpen(true);
    setDetailData(null);
    try {
      const res = await api.get(`/cotizaciones/${id}`);
      if (res.data?.status === "success") {
        setDetailData(res.data.data);
      }
    } catch (err) {
      console.error("Error al obtener detalle de cotización:", err);
    }
  };

  // Función para abrir detalle e imprimir de forma segura una vez cargado el DOM
  const handlePrintCotizacion = async (id) => {
    setIsPrinting(true);
    setDetailOpen(true);
    setDetailData(null);
    try {
      const res = await api.get(`/cotizaciones/${id}`);
      if (res.data?.status === "success") {
        setDetailData(res.data.data);
      }
    } catch (err) {
      console.error("Error al obtener detalle para imprimir:", err);
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    if (isPrinting && detailData && detailOpen) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [detailData, isPrinting, detailOpen]);

  // Iniciar edición de borrador
  const handleEditBorrador = (cot) => {
    setSelectedCotizacion(cot);
    setSelectedCliente(cot.cliente);
    setClienteSearch(cot.cliente ? cot.cliente.nombre_razon_social : "");
    setFechaEmision(cot.fecha_emision);
    setFechaVigencia(cot.fecha_vigencia);
    setObservaciones(cot.observaciones || "");

    // Cargar detalles
    api.get(`/cotizaciones/${cot.id}`).then((res) => {
      if (res.data?.status === "success") {
        const list = res.data.data.detalles.map((det) => ({
          producto: det.producto,
          cantidad: det.cantidad,
          descuento_porcentaje: Number(det.descuento_porcentaje) || 0,
        }));
        setCartItems(list);
        setIsCreating(true);
        setDetailOpen(false);
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      <div className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">
        {/* VISTA PRINCIPAL: LISTADO DE COTIZACIONES */}
        {!isCreating && (
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-[28px]! font-extrabold tracking-tight text-black! flex items-center gap-3">
                  Cotizaciones
                </h1>
                <p className="mt-1 text-slate-500 text-xs font-semibold">
                  Generación y seguimiento de presupuestos de venta
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedCotizacion(null);
                  setCartItems([]);
                  setSelectedCliente(null);
                  setClienteSearch("");
                  setObservaciones("");
                  setIsCreating(true);
                }}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs! font-black px-5 py-2.5 rounded-xl shadow-sm shadow-indigo-600/10 hover:shadow transition-all duration-150 active:scale-98 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Nueva cotización
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
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

            {/* FILTROS */}
            <div className="bg-transparent rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por folio o cliente..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150"
                  />
                </div>

                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="borrador">Borrador</option>
                  <option value="vigente">Vigente</option>
                  <option value="vencida">Vencida</option>
                  <option value="convertida">Convertida</option>
                </select>
              </div>
            </div>

            {/* Contadores */}
            <div className="bg-green-200 border border-slate-200 px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-wider text-slate-800 select-none w-fit mb-6">
              {filteredCotizaciones.length} cotizaciones encontradas
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs font-semibold">
                    Cargando cotizaciones...
                  </span>
                </div>
              ) : filteredCotizaciones.length === 0 ? (
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
                    No se encontraron cotizaciones
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Crea un presupuesto formal presionando el botón "Nueva
                    cotización".
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-5 py-4">FOLIO</th>
                        <th className="px-5 py-4">CLIENTE</th>
                        <th className="px-5 py-4 text-right">TOTAL</th>
                        <th className="px-5 py-4 text-center">ESTADO</th>
                        <th className="px-5 py-4 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-bold">
                      {filteredCotizaciones.map((cot) => (
                        <tr
                          key={cot.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-5 py-4 whitespace-nowrap text-indigo-600 font-mono">
                            {cot.folio}
                          </td>
                          <td className="px-5 py-4 text-slate-900">
                            {cot.cliente
                              ? cot.cliente.nombre_razon_social
                              : "Mostrador"}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-950 font-mono">
                            {formatCurrency(cot.total)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-lg border ${
                                cot.estado === "borrador"
                                  ? "bg-slate-50 text-slate-600 border-slate-200"
                                  : cot.estado === "vigente"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : cot.estado === "vencida"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {cot.estado}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center select-none">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => handleOpenDetail(cot.id)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Ver Ficha"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handlePrintCotizacion(cot.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Imprimir / PDF"
                              >
                                <svg
                                  className="h-4 w-4"
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
                              {["borrador", "vigente"].includes(cot.estado) && (
                                <button
                                  onClick={() => handleConvertir(cot)}
                                  className="text-[10px] font-black px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                  Convertir a Venta
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        )}

        {/* FORMULARIO DE NUEVA / EDITAR COTIZACIÓN */}
        {isCreating && (
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Cabecera Formulario */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
              <div>
                <h1 className="text-[28px]! font-extrabold text-black!">
                  {selectedCotizacion
                    ? `Editar Cotización ${selectedCotizacion.folio}`
                    : "Nueva Cotización"}
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Registra un presupuesto formal para tus clientes.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedCotizacion(null);
                }}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Volver al listado
              </button>
            </div>

            {/* Alerta de Perfil Incompleto */}
            {selectedCliente && !selectedCliente.perfil_completo && (
              <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-start gap-2.5 shadow-sm animate-in slide-in-from-top-2 duration-150">
                <svg
                  className="h-5 w-5 mt-0.5 shrink-0 text-amber-500"
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
                <span className="font-extrabold text-xs leading-relaxed">
                  ⚠️ Se requerirán datos fiscales adicionales para facturar esta
                  cotización en el futuro.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bloque izquierdo: Formulario de Datos */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                    Datos del Encabezado
                  </h3>

                  {/* Fila 1: Cliente Autocomplete */}
                  <div className="relative space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        Seleccionar Cliente
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickClientErrors({});
                          setQuickClientModal(true);
                        }}
                        className="text-[9px] font-black text-indigo-600 hover:underline"
                      >
                        + Nuevo Cliente Rápido
                      </button>
                    </div>
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setSelectedCliente(null);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Escribe el nombre o RFC del cliente..."
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />

                    {showClientDropdown && clienteSearch.trim() && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                        {filteredClientes.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 italic text-center">
                            No se encontraron coincidencias.
                          </div>
                        ) : (
                          filteredClientes.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCliente(c);
                                setClienteSearch(c.nombre_razon_social);
                                setShowClientDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-800 border-b border-slate-100 last:border-0"
                            >
                              {c.nombre_razon_social} ({c.rfc})
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fila 2: Fechas y Vigencia */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Fecha de Emisión
                      </label>
                      <input
                        type="date"
                        value={fechaEmision}
                        onChange={(e) => setFechaEmision(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Fecha de Vencimiento (Expiración)
                      </label>
                      <input
                        type="date"
                        value={fechaVigencia}
                        onChange={(e) => setFechaVigencia(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Vendedor (auto-asignado) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Vendedor Asignado
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        currentUser ? currentUser.name : "Usuario del Sistema"
                      }
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl px-4 py-2.5 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                {/* Carrito de Productos */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Productos a Cotizar
                    </h3>
                  </div>

                  {/* Buscador de Producto */}
                  <div className="relative space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Buscar Producto
                    </label>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Escribe el nombre o SKU del producto..."
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />

                    {showProductDropdown && productSearch.trim() && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                        {filteredProductos.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 italic text-center">
                            No se encontraron coincidencias.
                          </div>
                        ) : (
                          filteredProductos.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddProduct(p)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-800 border-b border-slate-100 last:border-0 flex justify-between items-center"
                            >
                              <span>
                                {p.nombre} (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {p.sku}
                                </span>
                                )
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">
                                Stock: {p.stock ?? 0}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tabla de Productos del Carrito */}
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 italic text-xs">
                      Agrega productos a la cotización desde el buscador de
                      arriba.
                    </div>
                  ) : (
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500">
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3 text-center w-20">Cant</th>
                            <th className="px-4 py-3 text-right w-24">
                              Precio
                            </th>
                            <th className="px-4 py-3 text-center w-24">
                              Desc (%)
                            </th>
                            <th className="px-4 py-3 text-right w-28">Total</th>
                            <th className="px-2 py-3 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {cartItems.map((item) => {
                            const price =
                              Number(item.producto.precio_venta) || 0;
                            const discount =
                              Number(item.descuento_porcentaje) || 0;
                            const finalPrice = price * (1 - discount / 100);
                            const lineTotal = finalPrice * item.cantidad;

                            return (
                              <tr
                                key={item.producto.id}
                                className="align-middle hover:bg-slate-50/20"
                              >
                                <td className="px-4 py-3.5">
                                  <p className="text-slate-900 leading-snug">
                                    {item.producto.nombre}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                    SKU: {item.producto.sku} · Stock:{" "}
                                    {item.producto.stock ?? 0}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.cantidad}
                                    onChange={(e) =>
                                      handleQtyChange(
                                        item.producto.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-14 bg-slate-50 border border-slate-300 text-slate-900 text-center text-xs font-bold rounded-lg py-1 px-1 focus:outline-none focus:border-indigo-500"
                                  />
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono">
                                  {formatCurrency(price)}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={item.descuento_porcentaje}
                                    onChange={(e) =>
                                      handleDiscountChange(
                                        item.producto.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 bg-slate-50 border border-slate-300 text-slate-900 text-center text-xs font-bold rounded-lg py-1 px-1 focus:outline-none focus:border-indigo-500"
                                  />
                                </td>
                                <td className="px-4 py-3.5 text-right text-slate-950 font-mono">
                                  {formatCurrency(lineTotal)}
                                </td>
                                <td className="px-2 py-3.5 text-center select-none">
                                  <button
                                    onClick={() =>
                                      handleRemoveItem(item.producto.id)
                                    }
                                    className="text-slate-300 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                                  >
                                    <svg
                                      className="h-4 w-4"
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
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque derecho: Resumen Financiero y Acciones */}
              <div className="space-y-6 select-none">
                <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">
                      Resumen del Presupuesto
                    </h3>

                    <div className="space-y-3 font-semibold text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-slate-950 font-mono">
                          {formatCurrency(totals.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (16%)</span>
                        <span className="text-slate-950 font-mono">
                          {formatCurrency(totals.iva)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                        <span>Total</span>
                        <span className="text-indigo-600 font-mono">
                          {formatCurrency(totals.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notas / Observaciones */}
                  <div className="space-y-1.5 mt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Observaciones / Notas
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej. Válido por 15 días, incluye costos de entrega..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-all font-sans resize-none"
                    />
                  </div>

                  {/* Acciones */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleSaveCotizacion("borrador")}
                      className="w-full py-3 px-4 bg-amber-200 hover:bg-amber-300 text-slate-800 font-black text-xs rounded-xl transition-all cursor-pointer select-none active:scale-95 text-center block border border-slate-200"
                    >
                      [Guardar como Borrador]
                    </button>
                    <button
                      onClick={() => handleSaveCotizacion("vigente")}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/10 hover:shadow transition-all cursor-pointer select-none active:scale-95 text-center block"
                    >
                      [Guardar y Enviar / Imprimir]
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ── MODAL NUEVO CLIENTE RÁPIDO ── */}
      {quickClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="pb-3 border-b border-slate-150 flex items-center justify-between">
              <h2 className="text-slate-950 font-black text-base tracking-tight">
                Nuevo Cliente Rápido
              </h2>
              <button
                onClick={() => setQuickClientModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleQuickClientSubmit} className="space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 block">
                  Nombre / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickClientForm.nombre_razon_social}
                  onChange={(e) =>
                    setQuickClientForm({
                      ...quickClientForm,
                      nombre_razon_social: e.target.value,
                    })
                  }
                  placeholder="Ej. Juan Pérez"
                  className={`w-full bg-slate-50 border ${
                    quickClientErrors.nombre_razon_social
                      ? "border-red-500 ring-2 ring-red-500/10"
                      : "border-slate-300 focus:border-indigo-500"
                  } text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none`}
                />
                {quickClientErrors.nombre_razon_social && (
                  <p className="text-[10px] font-bold text-red-650 mt-1 animate-in fade-in duration-100">
                    {quickClientErrors.nombre_razon_social}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 block">
                  RFC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickClientForm.rfc}
                  onChange={(e) =>
                    setQuickClientForm({
                      ...quickClientForm,
                      rfc: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="XAXX010101000"
                  className={`w-full bg-slate-50 border ${
                    quickClientErrors.rfc
                      ? "border-red-500 ring-2 ring-red-500/10"
                      : "border-slate-300 focus:border-indigo-500"
                  } text-slate-900 text-xs font-mono font-bold rounded-xl px-3.5 py-2 focus:outline-none`}
                />
                {quickClientErrors.rfc && (
                  <p className="text-[10px] font-bold text-red-650 mt-1 animate-in fade-in duration-100">
                    {quickClientErrors.rfc}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 block">
                  Correo
                </label>
                <input
                  type="email"
                  value={quickClientForm.email}
                  onChange={(e) =>
                    setQuickClientForm({
                      ...quickClientForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="cliente@ejemplo.com"
                  className={`w-full bg-slate-50 border ${
                    quickClientErrors.email
                      ? "border-red-500 ring-2 ring-red-500/10"
                      : "border-slate-300 focus:border-indigo-500"
                  } text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none`}
                />
                {quickClientErrors.email && (
                  <p className="text-[10px] font-bold text-red-650 mt-1 animate-in fade-in duration-100">
                    {quickClientErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 block">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={quickClientForm.telefono}
                  onChange={(e) =>
                    setQuickClientForm({
                      ...quickClientForm,
                      telefono: e.target.value,
                    })
                  }
                  placeholder="10 dígitos"
                  className={`w-full bg-slate-50 border ${
                    quickClientErrors.telefono
                      ? "border-red-500 ring-2 ring-red-500/10"
                      : "border-slate-300 focus:border-indigo-500"
                  } text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none`}
                />
                {quickClientErrors.telefono && (
                  <p className="text-[10px] font-bold text-red-650 mt-1 animate-in fade-in duration-100">
                    {quickClientErrors.telefono}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2.5 select-none">
                <button
                  type="button"
                  onClick={() => setQuickClientModal(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer text-center"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER DETALLE DE COTIZACIÓN (RIGHT SLIDE-OVER) ── */}
      {detailOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200 print-modal-container">
          <div
            className="absolute inset-0 cursor-default print:hidden"
            onClick={() => setDetailOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-250 print-modal-content">
            {/* Cabecera Drawer */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 tracking-wider block uppercase">
                  FICHA DE COTIZACIÓN
                </span>
                <h3 className="text-base font-black text-slate-950 truncate mt-0.5">
                  {detailData ? `${detailData.folio}` : "Cargando..."}
                </h3>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Cuerpo Drawer (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailData && (
                <>
                  {/* Resumen Monetario */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 select-none">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Importe Total Presupuestado
                      </span>
                      <span className="text-base font-black text-indigo-600 block mt-0.5 font-mono">
                        {formatCurrency(detailData.total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Estado
                      </span>
                      <span
                        className={`inline-block text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-lg border mt-1.5 ${
                          detailData.estado === "borrador"
                            ? "bg-slate-50 text-slate-600 border-slate-200"
                            : detailData.estado === "vigente"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : detailData.estado === "vencida"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {detailData.estado}
                      </span>
                    </div>
                  </div>

                  {/* Fechas e Info */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5 mb-3">
                      Fechas e Info General
                    </h4>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold">
                          Cliente
                        </span>
                        <span className="font-bold text-slate-850">
                          {detailData.cliente
                            ? detailData.cliente.nombre_razon_social
                            : "Mostrador"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">
                          RFC
                        </span>
                        <span className="font-bold text-slate-850 font-mono">
                          {detailData.cliente ? detailData.cliente.rfc : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">
                          Vendedor
                        </span>
                        <span className="font-bold text-slate-850">
                          {detailData.vendedor?.name || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">
                          Fecha Emisión
                        </span>
                        <span className="font-bold text-slate-850">
                          {detailData.fecha_emision}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">
                          Vence el
                        </span>
                        <span className="font-bold text-slate-850">
                          {detailData.fecha_vigencia}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Artículos */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5 mb-3">
                      Artículos Cotizados
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500">
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2 text-center w-12">Cant</th>
                            <th className="px-3 py-2 text-center w-16">Desc</th>
                            <th className="px-3 py-2 text-right w-24">
                              Importe
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {detailData.detalles?.map((det) => (
                            <tr key={det.id}>
                              <td className="px-3 py-2">
                                <p className="text-slate-900 leading-tight">
                                  {det.producto?.nombre}
                                </p>
                                <span className="text-[9px] text-slate-400">
                                  SKU: {det.producto?.sku}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center text-slate-700">
                                {det.cantidad}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-500">
                                {Number(det.descuento_porcentaje) > 0
                                  ? `${Number(det.descuento_porcentaje)}%`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-900 font-mono">
                                {formatCurrency(det.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notas adicionales */}
                  {detailData.observaciones && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Observaciones
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {detailData.observaciones}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Acciones Drawer Footer */}
            {detailData && (
              <div className="p-6 border-t border-slate-100 flex gap-3 select-none shrink-0 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <svg
                    className="h-4 w-4"
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
                  Imprimir / PDF
                </button>
                {detailData.estado === "borrador" && (
                  <button
                    onClick={() => handleEditBorrador(detailData)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    Editar Borrador
                  </button>
                )}
                {["borrador", "vigente"].includes(detailData.estado) && (
                  <button
                    onClick={() => handleConvertir(detailData)}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
                  >
                    Convertir a Venta
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Estilos CSS exclusivos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .print-modal-container, .print-modal-container * {
            visibility: visible;
          }
          .print-modal-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            display: block !important;
            backdrop-filter: none !important;
            justify-content: flex-start !important;
          }
          .print-modal-content {
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
          }
          button {
            display: none !important;
          }
          svg {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
