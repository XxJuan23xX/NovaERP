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
  // 🏪 Estados para categorías, marcas y almacenes dinámicos
  const [categoriasList, setCategoriasList] = useState([]);
  const [marcasList, setMarcasList] = useState([]);
  const [almacenesList, setAlmacenesList] = useState([]);

  // ── ESTADOS DE PAGINACIÓN ──
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── ESTADO DE LA FECHA DINÁMICA ──
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── ACTUALIZACIÓN DE FECHA CADA MINUTO ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── CARGAR CATEGORÍAS, MARCAS Y ALMACENES DE LA BD ──
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const catRes = await api.get("/inventario/categorias");
        const rawCats = catRes.data;
        const listCats = Array.isArray(rawCats)
          ? rawCats
          : rawCats.data || rawCats.categorias || [];
        setCategoriasList(listCats);
      } catch (err) {
        console.warn("Error al cargar categorías, usando locales:", err);
        setCategoriasList([
          { id: 1, nombre: "Electrónica" },
          { id: 2, nombre: "Computación" },
          { id: 3, nombre: "Accesorios" },
          { id: 4, nombre: "Ferretería" },
          { id: 5, nombre: "Electricidad" },
          { id: 6, nombre: "Pinturas" },
          { id: 7, nombre: "Herramientas" }
        ]);
      }

      try {
        const marcaRes = await api.get("/inventario/marcas");
        const rawMarcas = marcaRes.data;
        const listMarcas = Array.isArray(rawMarcas)
          ? rawMarcas
          : rawMarcas.data || rawMarcas.marcas || [];
        setMarcasList(listMarcas);
      } catch (err) {
        console.warn("Error al cargar marcas, usando locales:", err);
        setMarcasList([
          { id: 1, nombre: "Apple" },
          { id: 2, nombre: "Samsung" },
          { id: 3, nombre: "Lenovo" },
          { id: 4, nombre: "Aceros Apex" },
          { id: 5, nombre: "IUSA" },
          { id: 6, font_bold: false, nombre: "Comex" },
          { id: 7, nombre: "DeWalt" }
        ]);
      }

      try {
        const almacenRes = await api.get("/inventario/almacenes");
        const rawAlmacenes = almacenRes.data;
        const listAlmacenes = Array.isArray(rawAlmacenes)
          ? rawAlmacenes
          : rawAlmacenes.data || rawAlmacenes.almacenes || [];
        setAlmacenesList(listAlmacenes);
      } catch (err) {
        console.warn("Error al cargar almacenes, usando locales:", err);
        setAlmacenesList([
          { id: 1, nombre: "Almacén Central", codigo: "ALM-01", ubicacion: "Zona Industrial" },
          { id: 2, nombre: "Sucursal Norte", codigo: "ALM-02", ubicacion: "Blvd. Norte #450" }
        ]);
      }
    };

    fetchCatalogos();
  }, []);

  const formatExecutiveDate = (date) => {
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

  // Estado del formulario
  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    descripcion: "",
    categoria_id: "",
    marca_id: "",
    almacen_id: "",
    stock: 0,
    stock_minimo: 0,
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
          sku: "SKU-00001",
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
          sku: "SKU-00002",
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
          sku: "SKU-00003",
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
          sku: "SKU-00004",
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
            (p.sku && p.sku.toLowerCase().includes(queryLower)) ||
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
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [busqueda, fetchProductos]);

  // ── MANEJADORES DE OPERACIONES (Exclusivos Admin para mutate, pero declarados al inicio) ──
  const handleOpenModal = async (producto = null) => {
    const defaultAlmacenId = almacenesList.length > 0 ? almacenesList[0].id : "";
    if (producto) {
      setSelectedProducto(producto);
      setForm({
        sku: producto.sku || "",
        nombre: producto.nombre || "",
        descripcion: producto.descripcion || "",
        categoria_id: producto.categoria_id || producto.categoria?.id || "",
        marca_id: producto.marca_id || producto.marca?.id || "",
        almacen_id: defaultAlmacenId,
        stock: 0,
        stock_minimo: producto.stock_minimo || producto.stock_min || 0,
        precio_venta: producto.precio_venta || 0,
        precio_compra: producto.precio_compra || 0,
        activo: producto.activo !== undefined ? producto.activo : true,
      });
      setModalOpen(true);

      // Cargar detalles completos del producto (para obtener existencias por almacén)
      try {
        const response = await api.get(`/inventario/productos/${producto.id}`);
        const detailedProd = response.data?.data || response.data;
        if (detailedProd) {
          setSelectedProducto(detailedProd);
          
          // Buscar stock en el almacén seleccionado por defecto
          const matchedAlmacen = detailedProd.almacenes?.find(
            (a) => Number(a.id) === Number(defaultAlmacenId)
          );
          const initialStock = matchedAlmacen ? matchedAlmacen.stock_actual : 0;

          setForm((prev) => ({
            ...prev,
            stock: initialStock,
          }));
        }
      } catch (err) {
        console.warn("Error al cargar detalle de almacenes del producto:", err);
      }
    } else {
      setSelectedProducto(null);
      setForm({
        sku: "",
        nombre: "",
        descripcion: "",
        categoria_id: "",
        marca_id: "",
        almacen_id: defaultAlmacenId,
        stock: 0,
        stock_minimo: 0,
        precio_venta: 0,
        precio_compra: 0,
        activo: true,
      });
      setModalOpen(true);
    }
  };

  // 🏪 Abrir desglose de almacenes
  const handleOpenStockModal = async (producto) => {
    setSelectedProducto(producto);
    setStockModalOpen(true);
    setLoadingAlmacenes(true);
    try {
      // 1. Obtener almacenes
      const response = await api.get("/inventario/almacenes");
      const rawAlmacenes = response.data;
      const listAlmacenes = Array.isArray(rawAlmacenes)
        ? rawAlmacenes
        : rawAlmacenes.data || rawAlmacenes.almacenes || [];
      setAlmacenes(listAlmacenes);

      // 2. Obtener detalle de producto (para existencias reales por almacén)
      const prodResponse = await api.get(`/inventario/productos/${producto.id}`);
      const detailedProd = prodResponse.data?.data || prodResponse.data;
      if (detailedProd) {
        setSelectedProducto(detailedProd);
      }
    } catch (err) {
      console.warn("Error al cargar desglose de almacenes, usando fallback:", err);
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
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : type === "number"
              ? parseFloat(value) || 0
              : name === "categoria_id" || name === "marca_id" || name === "almacen_id"
                ? parseInt(value, 10) || ""
                : value,
      };

      // Si cambia de almacén en modo edición, se actualiza el stock correspondiente
      if (name === "almacen_id" && selectedProducto && selectedProducto.almacenes) {
        const matchedAlmacen = selectedProducto.almacenes.find(
          (a) => Number(a.id) === Number(updated.almacen_id)
        );
        updated.stock = matchedAlmacen ? matchedAlmacen.stock_actual : 0;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...form,
    };

    try {
      if (selectedProducto) {
        // PUT para actualizar
        await api.put(`/inventario/productos/${selectedProducto.id}`, payload);
      } else {
        // POST para crear
        await api.post("/inventario/productos", payload);
      }
      fetchProductos(busqueda);
      handleCloseModal();
    } catch (err) {
      console.warn(
        "Backend inalcanzable para guardar. Simulando localmente:",
        err,
      );

      const selectedCat = categoriasList.find(c => Number(c.id) === Number(form.categoria_id));
      const selectedMarca = marcasList.find(m => Number(m.id) === Number(form.marca_id));

      const localProduct = {
        ...payload,
        sku: form.sku || `SKU-${String(productos.length + 1).padStart(5, "0")}`,
        categoria: selectedCat ? { id: selectedCat.id, nombre: selectedCat.nombre } : { id: form.categoria_id, nombre: "Sin Categoría" },
        marca: selectedMarca ? { id: selectedMarca.id, nombre: selectedMarca.nombre } : { id: form.marca_id, nombre: "Genérico" },
        // Add almacenes mapping for the offline mock details
        almacenes: almacenesList.map(a => ({
          id: a.id,
          nombre: a.nombre,
          stock_actual: Number(a.id) === Number(form.almacen_id) ? Number(form.stock) : 0
        })),
        stock: form.stock,
      };

      // Simulación en el frontend en caso de error/offline
      if (selectedProducto) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === selectedProducto.id ? { ...p, ...localProduct } : p,
          ),
        );
      } else {
        setProductos((prev) => [...prev, { id: Date.now(), ...localProduct }]);
      }
      handleCloseModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este producto?"))
      return;
    try {
      await api.delete(`/inventario/productos/${id}`);
      fetchProductos(busqueda);
    } catch (err) {
      if (err.response) {
        // El servidor respondió con un error (ej. 422 por tener movimientos de Kardex)
        const errorMsg = err.response.data?.message || "Error al intentar eliminar el producto.";
        alert(`No se pudo eliminar del servidor: ${errorMsg}`);
      } else {
        // Conexión fallida (offline)
        console.warn(
          "Backend inalcanzable para eliminar. Simulando localmente:",
          err,
        );
        setProductos((prev) => prev.filter((p) => p.id !== id));
      }
    }
  };

  // ── VARIABLES DE RENDERIZACIÓN DERIVADAS ──
  const isAdmin = user?.role === "admin";
  const totalItems = productos.length;

  const lowStockCount = productos.filter((p) => {
    const currentStock = Number(p.stock ?? p.existencia ?? p.cantidad ?? 0);
    const minStock = p.stock_minimo ?? p.stock_min ?? 5;
    return currentStock > 0 && currentStock < minStock;
  }).length;

  const outOfStockCount = productos.filter((p) => {
    const currentStock = Number(p.stock ?? p.existencia ?? p.cantidad ?? 0);
    return currentStock === 0;
  }).length;

  // Cómputo de paginación
  const totalPages = Math.ceil(productos.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProductos = productos.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* El sidebar mantiene su diseño oscuro de acuerdo a las directrices */}
      <Navigation />

      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ENCABEZADO DE SECCIÓN */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-[22px]! font-extrabold tracking-tight text-black! flex items-center gap-3">
                <span className="p-2 bg-white rounded-xl border border-slate-200 text-blue-600 shadow-sm">
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
              <p className="mt-1 text-slate-400 text-xs font-medium">
                {formatExecutiveDate(currentDate)}
              </p>
              <p className="mt-2.5 text-slate-600 text-sm">
                Sucursal:{" "}
                <strong className="font-bold text-slate-900">
                  {user?.sucursal || "No asignada"}
                </strong>{" "}
                — 2 admins / 3 empleados (límite por sucursal)
              </p>
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS (FILTROS Y BÚSQUEDA) */}
          <div className="bg-transparent rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              {/* Buscador */}
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
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                />
              </div>

              {/* Botón de Filtrar */}
              <button className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-xl text-[12px] transition-all cursor-pointer active:scale-98">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4.5 w-4.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filtrar
              </button>

              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl transition-all"
                >
                  Limpiar Filtro
                </button>
              )}
            </div>

            {/* Botón destacado + Nuevo producto */}
            {isAdmin && (
              <button
                onClick={() => handleOpenModal(null)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-98 cursor-pointer"
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
                Nuevo producto
              </button>
            )}
          </div>

          {/* TARJETAS DE MÉTRICAS (KPIs) - MODO CLARO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Tarjeta 1 (Total productos) */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total productos
                </span>
                <h3 className="text-[18px] font-bold text-slate-900 mt-0.5">
                  {totalItems.toLocaleString("es-MX")}
                </h3>
              </div>
            </div>

            {/* Tarjeta 2 (Stock bajo) */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-3.5 rounded-xl bg-yellow-50 text-yellow-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Stock bajo
                </span>
                <h3 className="text-[18px] font-bold text-slate-900 mt-0.5">
                  {lowStockCount.toLocaleString("es-MX")}
                </h3>
              </div>
            </div>

            {/* Tarjeta 3 (Sin stock) */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-3.5 rounded-xl bg-red-50 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
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
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Sin stock
                </span>
                <h3 className="text-[18px] font-bold text-slate-900 mt-0.5">
                  {outOfStockCount.toLocaleString("es-MX")}
                </h3>
              </div>
            </div>
          </div>

          {/* ALERTA DE MENSAJE OFF-LINE */}
          {error && (
            <div className="mb-6 bg-white border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm border border-slate-200 border-l-amber-500">
              <div className="flex items-center gap-3 text-amber-600 text-sm">
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
                className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* TABLA PRINCIPAL DE INVENTARIO */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm font-semibold">
                  Cargando catálogo de productos...
                </span>
              </div>
            ) : productos.length === 0 ? (
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <h3 className="text-lg font-bold text-slate-800">
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
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-3 py-2.5">SKU</th>
                      <th className="px-3 py-2.5">PRODUCTO</th>
                      <th className="px-3 py-2.5">Categoría &amp; Marca</th>
                      <th className="px-3 py-2.5 text-right">STOCK</th>
                      <th className="px-3 py-2.5 text-center">Desglose</th>
                      <th className="px-3 py-2.5 text-right">PRECIO</th>

                      {/* RBAC: Columna excluida si es empleado */}
                      {isAdmin && (
                        <th className="px-3 py-2.5 text-right">Costo Compra</th>
                      )}

                      <th className="px-3 py-2.5 text-center">ESTADO</th>

                      {/* RBAC: Acciones excluidas si es empleado */}
                      {isAdmin && (
                        <th className="px-3 py-2.5 text-center">ACCIONES</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {currentProductos.map((prod) => {
                      const minStock =
                        prod.stock_minimo ?? prod.stock_min ?? 10;
                      const currentStock = Number(
                        prod.stock ?? prod.existencia ?? prod.cantidad ?? 0,
                      );
                      const isLow = currentStock > 0 && currentStock < minStock;
                      const isZero = currentStock === 0;

                      return (
                        <tr
                          key={prod.id}
                          className="hover:bg-slate-50/50 transition-colors duration-150"
                        >
                          {/* SKU */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-400 font-semibold">
                            {prod.sku || "N/A"}
                          </td>

                          {/* PRODUCTO */}
                          <td className="px-3 py-2.5">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {prod.nombre}
                              </div>
                              {prod.descripcion && (
                                <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5">
                                  {prod.descripcion}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* CATEGORIA Y MARCA */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center text-[11px] font-semibold text-slate-700">
                                {prod.categoria?.nombre ||
                                  prod.categoria ||
                                  "Sin Categoría"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {prod.marca?.nombre || prod.marca || "Genérico"}
                              </span>
                            </div>
                          </td>

                          {/* STOCK (FORMATO DUAL DINÁMICO) */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold">
                            <span
                              className={
                                isZero
                                  ? "text-red-650 font-bold"
                                  : isLow
                                    ? "text-orange-600 font-bold"
                                    : "text-slate-900"
                              }
                            >
                              {currentStock}
                            </span>
                            <span className="text-slate-450 text-[10px]">
                              {" "}
                              / {minStock} mín
                            </span>
                          </td>

                          {/* DESGLOSE */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenStockModal(prod)}
                              className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all active:scale-95 cursor-pointer"
                            >
                              Ver Stock
                            </button>
                          </td>

                          {/* PRECIO (MONEDA LIMPIO) */}
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            $
                            {Number(prod.precio_venta || 0).toLocaleString(
                              "es-MX",
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </td>

                          {/* COSTO COMPRA (ADMIN ONLY) */}
                          {isAdmin && (
                            <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-slate-450">
                              {prod.precio_compra !== undefined
                                ? `$${Number(prod.precio_compra).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                                : "Protegido"}
                            </td>
                          )}

                          {/* ESTADO BADGE */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {isZero ? (
                              <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                                Agotado
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                Stock bajo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                Normal
                              </span>
                            )}
                          </td>

                          {/* ACCIONES DIRECTAS CON ICONOS (SIN TRES PUNTOS) */}
                          {isAdmin && (
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Botón Editar: recuadro azul suave */}
                                <button
                                  onClick={() => handleOpenModal(prod)}
                                  title="Editar Producto"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95 cursor-pointer"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>

                                {/* Botón Eliminar: recuadro rojo/rosa suave */}
                                <button
                                  onClick={() => handleDelete(prod.id)}
                                  title="Eliminar Producto"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all active:scale-95 cursor-pointer"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {productos.length > 10 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-medium">
                  Página {safeCurrentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safeCurrentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── 🏪 MODAL: DESGLOSE DE STOCK POR ALMACÉN - MODO CLARO ── */}
      {stockModalOpen && selectedProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Ubicación y Existencias
                </h2>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                  {selectedProducto.nombre}
                </p>
              </div>
              <button
                onClick={handleCloseStockModal}
                className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAlmacenes ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                  <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs font-semibold">
                    Consultando base de datos...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {almacenes.map((alm) => {
                    const matchedAlmacen = selectedProducto.almacenes?.find(
                      (a) => Number(a.id) === Number(alm.id)
                    );
                    const stockPorAlmacen = matchedAlmacen !== undefined
                      ? matchedAlmacen.stock_actual
                      : (selectedProducto.stock > 0
                          ? Math.floor(
                              selectedProducto.stock / almacenes.length
                            ) + (selectedProducto.id % (alm.id || 1) === 0 ? 2 : 0)
                          : 0);

                    return (
                      <div
                        key={alm.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-850">
                            {alm.nombre}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono text-[10px]">
                              {alm.codigo}
                            </span>
                            <span>{alm.ubicacion}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-600">
                            {stockPorAlmacen}
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
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                onClick={handleCloseStockModal}
                className="px-4.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE EDICIÓN / ADICIÓN (Exclusivo Admin) - MODO CLARO ── */}
      {modalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 flex flex-col max-h-[90vh]">
            {/* Cabecera de modal */}
            <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-base font-bold text-black!">
                {selectedProducto ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  {/* SKU (Solo visible en EDICIÓN y desactivado) */}
                  {selectedProducto && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        SKU (Autogenerado)
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={form.sku}
                        readOnly
                        className="w-full bg-slate-50 text-slate-500 cursor-not-allowed border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Nombre Comercial */}
                  <div className={selectedProducto ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                      placeholder="Ej. Tornillos Galvanizados"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Descripción Detallada
                  </label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Detalles sobre especificaciones técnicas, materiales, usos, etc."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Categoría */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Categoría
                    </label>
                    <select
                      name="categoria_id"
                      value={form.categoria_id}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150 cursor-pointer"
                    >
                      <option value="" disabled>Selecciona una categoría</option>
                      {categoriasList.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Marca
                    </label>
                    <select
                      name="marca_id"
                      value={form.marca_id}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150 cursor-pointer"
                    >
                      <option value="" disabled>Selecciona una marca</option>
                      {marcasList.map((marca) => (
                        <option key={marca.id} value={marca.id}>
                          {marca.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Almacén / Sucursal */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Almacén / Sucursal
                    </label>
                    <select
                      name="almacen_id"
                      value={form.almacen_id}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150 cursor-pointer"
                    >
                      <option value="" disabled>Selecciona un almacén</option>
                      {almacenesList.map((alm) => (
                        <option key={alm.id} value={alm.id}>
                          {alm.nombre} ({alm.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Existencias */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {selectedProducto ? "Stock Actual en Almacén" : "Existencias Iniciales"}
                    </label>
                    <input
                      type="number"
                      name="stock"
                      min="0"
                      value={form.stock}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Stock Mínimo */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      name="stock_minimo"
                      min="0"
                      value={form.stock_minimo}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                    />
                  </div>

                  {/* Precio Venta */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Costo Compra (Solo visible/editable para Admin) */}
                {isAdmin && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all duration-150"
                    />
                  </div>
                )}

                {/* Activo / Inactivo */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="activo"
                    name="activo"
                    checked={form.activo}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-200 bg-white text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label
                    htmlFor="activo"
                    className="text-xs text-slate-700 font-semibold cursor-pointer select-none"
                  >
                    El producto está activo en catálogo
                  </label>
                </div>
              </div>

              {/* Acciones del Formulario */}
              <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
  );
}
