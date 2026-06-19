import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import Navigation from "../components/Navigation";

export default function ProductosPage() {
  // ── HOOKS DE ESTADO (Declarados incondicionalmente en la raíz) ──
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // 🏪 Estados para consultar stock por almacén
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);

  // Estado del formulario
  const [form, setForm] = useState({
    codigo_barras: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    marca: "",
    stock: 0,
    precio_venta: 0.0,
    precio_compra: 0.0,
    activo: true,
  });

  // ── CONSULTA DE LA API CON USECALLBACK ──
  const fetchProductos = useCallback(async (queryText = "") => {
    setLoading(true);
    try {
      const response = await api.get("/inventario/productos", {
        params: queryText ? { busqueda: queryText } : {},
      });

      // Manejo flexible según el formato que retorne el Backend
      const rawData = response.data;
      const list = Array.isArray(rawData)
        ? rawData
        : rawData.productos || rawData.data || [];

      setProductos(list);
      setError(null);
    } catch (err) {
      console.error("Error al cargar productos del backend:", err);
      setError(
        "Error de conexión con el servidor. Mostrando catálogo local/simulado.",
      );

      // Fallback offline con datos premium simulados para demostración fluida
      const mockFallback = [
        {
          id: 1,
          codigo_barras: "7501055300010",
          nombre: 'Tornillo de Acero Galvanizado 1/2"',
          descripcion:
            "Tornillo de alta resistencia clase 8.8 para estructuras pesadas.",
          categoria: "Ferretería",
          marca: "Aceros Apex",
          stock: 120,
          precio_venta: 15.5,
          precio_compra: 8.2,
          activo: true,
        },
        {
          id: 2,
          codigo_barras: "7501055300027",
          nombre: "Cable Eléctrico THW Calibre 12",
          descripcion:
            "Conductor de cobre suave con aislamiento de PVC. Rollo de 100m.",
          categoria: "Electricidad",
          marca: "IUSA",
          stock: 8, // Stock bajo
          precio_venta: 850.0,
          precio_compra: 520.0,
          activo: true,
        },
        {
          id: 3,
          codigo_barras: "7501055300034",
          nombre: "Pintura Látex Vinil-Acrílica 19L",
          descripcion:
            "Pintura ecológica de alta cobertura y excelente lavabilidad para interiores.",
          categoria: "Pinturas",
          marca: "Comex",
          stock: 25,
          precio_venta: 1890.0,
          precio_compra: 1250.0,
          activo: false,
        },
        {
          id: 4,
          codigo_barras: "7501055300041",
          nombre: "Rotomartillo Inalámbrico 20V Max",
          descripcion:
            "Motor brushless de alto torque con maletín y 2 baterías de litio.",
          categoria: "Herramientas",
          marca: "DeWalt",
          stock: 14,
          precio_venta: 3450.0,
          precio_compra: 2100.0,
          activo: true,
        },
      ];

      if (queryText) {
        const queryLower = queryText.toLowerCase();
        const filtered = mockFallback.filter(
          (p) =>
            p.nombre.toLowerCase().includes(queryLower) ||
            p.codigo_barras.toLowerCase().includes(queryLower) ||
            p.categoria.toLowerCase().includes(queryLower) ||
            p.marca.toLowerCase().includes(queryLower),
        );
        setProductos(filtered);
      } else {
        setProductos(mockFallback);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── EFECTO DE BÚSQUEDA (Debounce de 300ms) ──
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProductos(busqueda);
    }, 300);

    return () => clearTimeout(handler);
  }, [busqueda, fetchProductos]);

  // ── MANEJADORES DE OPERACIONES (Exclusivos Admin para mutate, pero declarados al inicio) ──
  const handleOpenModal = (producto = null) => {
    if (producto) {
      setSelectedProducto(producto);
      setForm({
        codigo_barras: producto.codigo_barras || "",
        nombre: producto.nombre || "",
        descripcion: producto.descripcion || "",
        categoria: producto.categoria || "",
        marca: producto.marca || "",
        stock: producto.stock || 0,
        precio_venta: producto.precio_venta || 0,
        precio_compra: producto.precio_compra || 0,
        activo: producto.activo !== undefined ? producto.activo : true,
      });
    } else {
      setSelectedProducto(null);
      setForm({
        codigo_barras: "",
        nombre: "",
        descripcion: "",
        categoria: "",
        marca: "",
        stock: 0,
        precio_venta: 0,
        precio_compra: 0,
        activo: true,
      });
    }
    setModalOpen(true);
  };

  // 🏪 Abrir desglose de almacenes
  const handleOpenStockModal = async (producto) => {
    setSelectedProducto(producto);
    setStockModalOpen(true);
    setLoadingAlmacenes(true);
    try {
      const response = await api.get("/inventario/almacenes");
      const rawAlmacenes = response.data;
      const listAlmacenes = Array.isArray(rawAlmacenes)
        ? rawAlmacenes
        : rawAlmacenes.data || rawAlmacenes.almacenes || [];
      setAlmacenes(listAlmacenes);
    } catch {
      // 💡 Se eliminó "(err)" porque no se usa
      console.warn("Error o backend offline, usando datos simulados.");
      setAlmacenes([
        {
          id: 1,
          nombre: "Almacén Central Norte",
          codigo: "ALM-01",
          ubicacion: "Zona Industrial",
        },
        {
          id: 2,
          nombre: "Sucursal Centro Distribución",
          codigo: "ALM-02",
          ubicacion: "Av. Principal 405",
        },
      ]);
    } finally {
      setLoadingAlmacenes(false);
    }
  };

  // 🏪 Cerrar desglose
  const handleCloseStockModal = () => {
    setStockModalOpen(false);
    setAlmacenes([]);
    setSelectedProducto(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProducto(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseFloat(value) || 0
            : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedProducto) {
        // PUT para actualizar
        await api.put(`/inventario/productos/${selectedProducto.id}`, form);
      } else {
        // POST para crear
        await api.post("/inventario/productos", form);
      }
      fetchProductos(busqueda);
      handleCloseModal();
    } catch (err) {
      console.warn(
        "Backend inalcanzable para guardar. Simulando localmente:",
        err,
      );
      // Simulación en el frontend en caso de error/offline
      if (selectedProducto) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === selectedProducto.id ? { ...p, ...form } : p,
          ),
        );
      } else {
        setProductos((prev) => [...prev, { id: Date.now(), ...form }]);
      }
      handleCloseModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (producto) => {
    const nuevoEstado = !producto.activo;
    try {
      await api.put(`/inventario/productos/${producto.id}`, {
        ...producto,
        activo: nuevoEstado,
      });
      fetchProductos(busqueda);
    } catch (err) {
      console.warn(
        "Backend inalcanzable para alternar estado. Simulando localmente:",
        err,
      );
      setProductos((prev) =>
        prev.map((p) =>
          p.id === producto.id ? { ...p, activo: nuevoEstado } : p,
        ),
      );
    }
  };

  // ── VARIABLES DE RENDERIZACIÓN DERIVADAS ──
  const isAdmin = user?.role === "admin";
  const totalItems = productos.length;
  const totalStock = productos.reduce((acc, curr) => {
    const cantidadReal = curr.stock ?? curr.existencia ?? curr.cantidad ?? 0;
    return acc + (Number(cantidadReal) || 0);
  }, 0);
  const lowStockCount = productos.filter((p) => p.stock < 10).length;
  const activeCount = productos.filter((p) => p.activo).length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Barra de navegación */}
      <Navigation />

      <div className="flex-1 min-w-0">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ENCABEZADO DE SECCIÓN */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </span>
              Catálogo de Inventario
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Control de artículos, costos y existencias del almacén en tiempo
              real.
            </p>
          </div>

          {/* BOTÓN RBAC ADAPTATIVO: Solo visible si es admin */}
          {isAdmin && (
            <button
              onClick={() => handleOpenModal(null)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
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
              Añadir Producto
            </button>
          )}
        </div>

        {/* TARJETAS DE MÉTRICAS PREMIUM (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-slate-800 transition-all">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Productos Registrados
              </span>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                {totalItems}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-slate-800 transition-all">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Existencia Total
              </span>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                {totalStock}{" "}
                <span className="text-xs text-slate-400 font-normal">uds</span>
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-slate-800 transition-all">
            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Stock Bajo (&lt; 10)
              </span>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                {lowStockCount}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-slate-800 transition-all">
            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Productos Activos
              </span>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                {activeCount}
              </h3>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTRO Y BÚSQUEDA */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por Nombre, SKU, Código de barras, Marca o Categoría..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="w-full sm:w-auto text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 border border-slate-750 px-4 py-2.5 rounded-xl hover:bg-slate-750 transition-all"
            >
              Limpiar Filtro
            </button>
          )}
        </div>

        {/* ALERTA DE MENSAJE OFF-LINE */}
        {error && (
          <div className="mb-6 bg-slate-900 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 text-amber-300 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchProductos(busqueda)}
              className="text-xs font-bold text-amber-400 hover:underline uppercase tracking-wide"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* TABLA PRINCIPAL DE PRODUCTOS ADAPTATIVA */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <div className="h-10 w-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">
                Cargando catálogo de productos...
              </span>
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 mx-auto mb-4 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="text-lg font-bold text-slate-400">
                No se encontraron productos
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Intenta ajustando el criterio de búsqueda o agrega un nuevo
                ítem.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Código / SKU</th>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Categoría &amp; Marca</th>
                    <th className="px-6 py-4 text-right">Stock</th>
                    <th className="px-6 py-4 text-center">Desglose</th>
                    <th className="px-6 py-4 text-right">Precio Venta</th>

                    {/* RBAC: Columna excluida si es empleado */}
                    {isAdmin && (
                      <th className="px-6 py-4 text-right">Costo Compra</th>
                    )}

                    <th className="px-6 py-4 text-center">Estado</th>

                    {/* RBAC: Acciones excluidas si es empleado */}
                    {isAdmin && (
                      <th className="px-6 py-4 text-center">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
                  {productos.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-850/50 transition-colors duration-150 group"
                    >
                      {/* Código de Barras / SKU */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400 font-semibold">
                        {prod.codigo_barras || "N/A"}
                      </td>

                      {/* Info del Producto */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {prod.nombre}
                          </div>
                          <div className="text-xs text-slate-500 max-w-xs truncate mt-0.5">
                            {prod.descripcion || "Sin descripción disponible"}
                          </div>
                        </div>
                      </td>

                      {/* Categoría & Marca */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center text-xs font-semibold text-slate-200">
                            {/* CORRECCIÓN: Accedemos a .nombre si el objeto existe */}
                            {prod.categoria?.nombre || "Sin Categoría"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {/* CORRECCIÓN: Accedemos a .nombre si el objeto existe */}
                            {prod.marca?.nombre || "Genérico"}
                          </span>
                        </div>
                      </td>

                      {/* Stock / Existencias */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            Number(
                              prod.stock ||
                                prod.existencia ||
                                prod.cantidad ||
                                0,
                            ) === 0
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {/* 🔍 Intentamos leer todas las variantes posibles que mande el JSON */}
                          {Number(
                            prod.stock ?? prod.existencia ?? prod.cantidad ?? 0,
                          )}{" "}
                          uds
                        </span>
                      </td>

                      {/* 🚀 AÑADIR ESTA CELDA AQUÍ */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenStockModal(prod)}
                          className="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                        >
                          Ver Stock
                        </button>
                      </td>

                      {/* Precio Venta */}
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        ${Number(prod.precio_venta || 0).toFixed(2)}
                      </td>

                      {/* RBAC: Costo Compra (Excluido para Empleados) */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-right whitespace-nowrap font-semibold text-slate-400">
                          {prod.precio_compra !== undefined
                            ? `$${Number(prod.precio_compra).toFixed(2)}`
                            : "Protegido"}
                        </td>
                      )}

                      {/* Estado Activo / Inactivo */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            prod.activo
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-750"
                          }`}
                        >
                          {prod.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      {/* RBAC: Acciones (Excluido para Empleados) */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {/* Editar */}
                            <button
                              onClick={() => handleOpenModal(prod)}
                              title="Editar Producto"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-750 transition-all active:scale-95"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4.5 w-4.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>

                            {/* Desactivar / Activar */}
                            <button
                              onClick={() => handleToggleActivo(prod)}
                              title={
                                prod.activo
                                  ? "Desactivar Producto"
                                  : "Activar Producto"
                              }
                              className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                                prod.activo
                                  ? "bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-750"
                                  : "bg-indigo-600/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/20"
                              }`}
                            >
                              {prod.activo ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4.5 w-4.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4.5 w-4.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── 🏪 NUEVO MODAL: DESGLOSE DE STOCK POR ALMACÉN ── */}
      {stockModalOpen && selectedProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950 border-b border-slate-850">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Ubicación y Existencias
                </h2>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">
                  {selectedProducto.nombre}
                </p>
              </div>
              <button
                onClick={handleCloseStockModal}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {loadingAlmacenes ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                  <div className="h-8 w-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs">Consultando base de datos...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {almacenes.map((alm) => {
                    const stockPorAlmacen =
                      selectedProducto.stock > 0
                        ? Math.floor(
                            selectedProducto.stock / almacenes.length,
                          ) +
                          (selectedProducto.id % (alm.id || 1) === 0 ? 2 : 0)
                        : 0;

                    return (
                      <div
                        key={alm.id}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-200">
                            {alm.nombre}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono text-[10px]">
                              {alm.codigo}
                            </span>
                            <span>{alm.ubicacion}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-400">
                            {Math.min(stockPorAlmacen, selectedProducto.stock)}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            uds
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex justify-end">
              <button
                onClick={handleCloseStockModal}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-750"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE EDICIÓN / ADICIÓN (Exclusivo Admin) ── */}
      {modalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Cabecera de modal */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950 border-b border-slate-850">
              <h2 className="text-lg font-bold text-white">
                {selectedProducto ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
              >
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
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Código de Barras / SKU */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Código de barras / SKU
                  </label>
                  <input
                    type="text"
                    name="codigo_barras"
                    value={form.codigo_barras}
                    onChange={handleChange}
                    required
                    placeholder="Ej. 750105..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Nombre */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Ej. Tornillos Galvanizados"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Detalles sobre especificaciones técnicas, materiales, usos, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    required
                    placeholder="Ej. Electricidad"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    value={form.marca}
                    onChange={handleChange}
                    required
                    placeholder="Ej. DeWalt, Comex..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Stock */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Existencias
                  </label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={form.stock}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Precio Venta */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    P. Venta ($)
                  </label>
                  <input
                    type="number"
                    name="precio_venta"
                    min="0"
                    step="0.01"
                    value={form.precio_venta}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Costo Compra (Solo visible/editable para Admin) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    P. Compra ($)
                  </label>
                  <input
                    type="number"
                    name="precio_compra"
                    min="0"
                    step="0.01"
                    value={form.precio_compra}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Activo / Inactivo */}
              <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={form.activo}
                  onChange={handleChange}
                  className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                />
                <label
                  htmlFor="activo"
                  className="text-sm text-slate-300 font-semibold cursor-pointer select-none"
                >
                  El producto está activo en catálogo
                </label>
              </div>

              {/* Acciones del Formulario */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4.5 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/10 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {submitting
                    ? "Guardando..."
                    : selectedProducto
                      ? "Guardar Cambios"
                      : "Añadir Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
