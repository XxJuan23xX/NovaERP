import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navigation from "../components/Navigation";

const REGIMENES_FISCALES = [
  { code: "601", name: "601 - General de Ley Personas Morales" },
  { code: "603", name: "603 - Personas Morales con Fines no Lucrativos" },
  {
    code: "605",
    name: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  },
  { code: "606", name: "606 - Arrendamiento" },
  { code: "608", name: "608 - Demás ingresos" },
  {
    code: "612",
    name: "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  },
  { code: "616", name: "616 - Sin obligaciones fiscales" },
  { code: "621", name: "621 - Incorporación Fiscal" },
  { code: "626", name: "626 - Régimen Simplificado de Confianza (RESICO)" },
];

const USOS_CFDI = [
  { code: "G01", name: "G01 - Adquisición de mercancías" },
  { code: "G02", name: "G02 - Devoluciones, descuentos o bonificaciones" },
  { code: "G03", name: "G03 - Gastos en general" },
  { code: "I01", name: "I01 - Construcciones" },
  { code: "I02", name: "I02 - Mobiliario y equipo de oficina por inversiones" },
  { code: "I03", name: "I03 - Equipo de transporte" },
  { code: "I04", name: "I04 - Equipo de cómputo y accesorios" },
  { code: "I08", name: "I08 - Otras inversiones" },
  {
    code: "D01",
    name: "D01 - Honorarios médicos, dentales y gastos hospitalarios",
  },
  { code: "D02", name: "D02 - Gastos médicos por incapacidad o discapacidad" },
  { code: "D03", name: "D03 - Gastos funerales" },
  { code: "D04", name: "D04 - Donativos" },
  { code: "D10", name: "D10 - Colegiaturas" },
  { code: "S01", name: "S01 - Sin efectos fiscales" },
];

const INITIAL_FORM = {
  nombre_razon_social: "",
  telefono: "",
  email: "",
  rfc: "",
  regimen_fiscal: "601",
  uso_cfdi: "G03",
  codigo_postal_fiscal: "",
  direccion_fiscal_calle: "",
  direccion_fiscal_num_ext: "",
  direccion_fiscal_num_int: "",
  direccion_fiscal_colonia: "",
  direccion_fiscal_municipio: "",
  direccion_fiscal_estado: "",
  tipo_cliente: "Público General",
  limite_credito: "0",
  vendedor_id: "",
};

export default function ClientesPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");

  // Control de Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("generales"); // generales, fiscales, comerciales
  const [selectedCliente, setSelectedCliente] = useState(null); // Para editar
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [apiSubmitting, setApiSubmitting] = useState(false);

  // Ficha de Detalle (Drawer)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null); // cliente + transacciones + resumen
  const [detailLoading, setDetailLoading] = useState(false);

  // Cargar Clientes y Vendedores (Users)
  const fetchClientes = async (searchVal = "", typeFilter = "Todos") => {
    setLoading(true);
    try {
      const params = {};
      if (searchVal) params.busqueda = searchVal;
      if (typeFilter !== "Todos") params.tipo_cliente = typeFilter;

      const res = await api.get("/clientes", { params });
      if (res.data?.status === "success") {
        setClientes(res.data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      setError("No se pudieron cargar los clientes del sistema.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const res = await api.get("/users");
      if (res.data?.status === "success") {
        setVendedores(res.data.data || []);
      }
    } catch (err) {
      console.warn("Error al cargar vendedores:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendedores();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounce para la barra de búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchClientes(busqueda, tipoFiltro);
    }, 300);
    return () => clearTimeout(handler);
  }, [busqueda, tipoFiltro]);

  // Formateadores
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(val) || 0);
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "Sin compras";
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = clientes.length;
    const completos = clientes.filter((c) => c.perfil_completo).length;
    const pendientes = total - completos;
    return { total, completos, pendientes };
  }, [clientes]);

  // Manejo de Formulario
  const handleOpenCreate = () => {
    setSelectedCliente(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setActiveTab("generales");
    setFormModalOpen(true);
  };

  const handleOpenEdit = (cliente) => {
    setSelectedCliente(cliente);
    setForm({
      nombre_razon_social: cliente.nombre_razon_social || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      rfc: cliente.rfc || "",
      regimen_fiscal: cliente.regimen_fiscal || "601",
      uso_cfdi: cliente.uso_cfdi || "G03",
      codigo_postal_fiscal: cliente.codigo_postal_fiscal || "",
      direccion_fiscal_calle: cliente.direccion_fiscal_calle || "",
      direccion_fiscal_num_ext: cliente.direccion_fiscal_num_ext || "",
      direccion_fiscal_num_int: cliente.direccion_fiscal_num_int || "",
      direccion_fiscal_colonia: cliente.direccion_fiscal_colonia || "",
      direccion_fiscal_municipio: cliente.direccion_fiscal_municipio || "",
      direccion_fiscal_estado: cliente.direccion_fiscal_estado || "",
      tipo_cliente: cliente.tipo_cliente || "Público General",
      limite_credito: String(cliente.limite_credito) || "0",
      vendedor_id: cliente.vendedor_id || "",
    });
    setFormErrors({});
    setActiveTab("generales");
    setFormModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "rfc" ? value.toUpperCase() : value,
    }));
    // Limpiar el error de este campo al escribir
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Validaciones del Frontend
  const validateForm = () => {
    const errors = {};
    if (!form.nombre_razon_social.trim()) {
      errors.nombre_razon_social = "El nombre o razón social es obligatorio.";
    }

    // RFC validation
    const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i;
    if (!form.rfc.trim()) {
      errors.rfc = "El RFC es obligatorio.";
    } else if (!rfcRegex.test(form.rfc)) {
      errors.rfc =
        "El formato de RFC es inválido (ej: VECJ880101XXX o MNO980101XX1).";
    }

    // Código Postal validation
    const cpRegex = /^[0-9]{5}$/;
    if (!form.codigo_postal_fiscal.trim()) {
      errors.codigo_postal_fiscal = "El Código Postal es obligatorio.";
    } else if (!cpRegex.test(form.codigo_postal_fiscal)) {
      errors.codigo_postal_fiscal = "Debe constar de exactamente 5 dígitos.";
    }

    // Régimen & Uso CFDI
    if (!form.regimen_fiscal)
      errors.regimen_fiscal = "El régimen fiscal es obligatorio.";
    if (!form.uso_cfdi) errors.uso_cfdi = "El uso del CFDI es obligatorio.";

    // Dirección Fiscal
    if (!form.direccion_fiscal_calle.trim())
      errors.direccion_fiscal_calle = "La calle es obligatoria.";
    if (!form.direccion_fiscal_num_ext.trim())
      errors.direccion_fiscal_num_ext = "El número exterior es obligatorio.";
    if (!form.direccion_fiscal_colonia.trim())
      errors.direccion_fiscal_colonia = "La colonia es obligatoria.";
    if (!form.direccion_fiscal_municipio.trim())
      errors.direccion_fiscal_municipio =
        "El municipio/alcaldía es obligatorio.";
    if (!form.direccion_fiscal_estado.trim())
      errors.direccion_fiscal_estado = "El estado es obligatorio.";

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Redirigir a la pestaña fiscal si hay un error fiscal
      const fiscalKeys = [
        "rfc",
        "regimen_fiscal",
        "uso_cfdi",
        "codigo_postal_fiscal",
        "direccion_fiscal_calle",
        "direccion_fiscal_num_ext",
        "direccion_fiscal_colonia",
        "direccion_fiscal_municipio",
        "direccion_fiscal_estado",
      ];
      const hasFiscalError = Object.keys(errors).some((key) =>
        fiscalKeys.includes(key),
      );
      if (hasFiscalError) {
        setActiveTab("fiscales");
      } else {
        setActiveTab("generales");
      }
      return;
    }

    setApiSubmitting(true);
    try {
      const payload = {
        ...form,
        limite_credito: Number(form.limite_credito) || 0,
        vendedor_id: form.vendedor_id ? Number(form.vendedor_id) : null,
      };

      let res;
      if (selectedCliente) {
        res = await api.put(`/clientes/${selectedCliente.id}`, payload);
      } else {
        res = await api.post("/clientes", payload);
      }

      if (res.data?.status === "success") {
        setFormModalOpen(false);
        fetchClientes(busqueda, tipoFiltro);
        // Si estaba abierto el drawer de este cliente, actualizarlo
        if (detailOpen && detailData?.cliente?.id === selectedCliente?.id) {
          handleOpenDetail(selectedCliente.id);
        }
      }
    } catch (err) {
      console.error("Error al guardar cliente:", err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(
          err.response?.data?.message ||
            "Ocurrió un error al guardar el cliente.",
        );
      }
    } finally {
      setApiSubmitting(false);
    }
  };

  // Ver Ficha (Drawer)
  const handleOpenDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api.get(`/clientes/${id}`);
      if (res.data?.status === "success") {
        setDetailData(res.data.data);
      }
    } catch (err) {
      console.error("Error al cargar detalle del cliente:", err);
      alert("No se pudo obtener el historial y detalle del cliente.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Eliminar
  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente a ${name}?`,
      )
    ) {
      return;
    }
    try {
      const res = await api.delete(`/clientes/${id}`);
      if (res.data?.status === "success") {
        fetchClientes(busqueda, tipoFiltro);
        if (detailOpen && detailData?.cliente?.id === id) {
          setDetailOpen(false);
        }
      }
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      alert(
        err.response?.data?.message ||
          "No se puede eliminar el cliente porque posee ventas asociadas.",
      );
    }
  };

  // Crear Cotización / Venta pre-seleccionando al cliente
  const handleCrearCotizacion = (cliente) => {
    // Almacenamos el cliente en localStorage para que el POS lo tome al cargar
    localStorage.setItem(
      "pos_preselected_cliente",
      JSON.stringify({
        id: cliente.id,
        nombre_razon_social: cliente.nombre_razon_social,
        rfc: cliente.rfc,
        perfil_completo: cliente.perfil_completo,
      }),
    );
    navigate("/pos");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      <div className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ENCABEZADO */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-black! flex items-center gap-3">
                <span className="p-2 bg-white rounded-xl border border-slate-200 text-indigo-600 shadow-sm">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </span>
                Clientes (CRM)
              </h1>
              <p className="mt-1 text-slate-500 text-xs font-semibold">
                Control de cartera de clientes y facturación SAT 4.0
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-sm shadow-indigo-600/10 hover:shadow transition-all duration-150 active:scale-98 cursor-pointer"
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
              Nuevo cliente
            </button>
          </div>

          {/* METRICAS KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 select-none">
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Clientes
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {kpis.total}
                </h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Perfiles Completos (Sat 4.0)
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  {kpis.completos}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                    🟢 Listos
                  </span>
                </h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Perfiles Incompletos
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  {kpis.pendientes}
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                    🟡 Pendientes
                  </span>
                </h3>
              </div>
            </div>
          </div>

          {/* FILTROS Y BUSCADOR */}
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
                  placeholder="Buscar por nombre, email o RFC..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150"
                />
              </div>

              {/* Selector de Tipo */}
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Todos">Todos los tipos</option>
                <option value="Mayorista">Mayoristas</option>
                <option value="Minorista">Minoristas</option>
                <option value="Público General">Público General</option>
              </select>
            </div>
          </div>

          {/* LISTADO DE CLIENTES */}
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

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-xs font-semibold">
                Cargando clientes...
              </span>
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 mx-auto mb-4 text-slate-350"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857"
                />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">
                No se encontraron clientes
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Intenta ajustando el criterio de búsqueda o agrega un nuevo
                cliente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Tarjeta Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-400 tracking-wider block uppercase">
                          C-{String(cliente.id).padStart(3, "0")}
                        </span>
                        <h2
                          className="text-sm font-black text-black! truncate mt-0.5"
                          title={cliente.nombre_razon_social}
                        >
                          {cliente.nombre_razon_social}
                        </h2>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                          cliente.perfil_completo
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {cliente.perfil_completo ? "🟢 Listo" : "🟡 Pendiente"}
                      </span>
                    </div>

                    {/* Badge de tipo de cliente */}
                    <div className="mt-2.5">
                      <span className="inline-block text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                        {cliente.tipo_cliente}
                      </span>
                    </div>

                    {/* Información fiscal / RFC */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">RFC:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {cliente.rfc || "N/A"}
                        </span>
                      </div>
                      {cliente.telefono && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Teléfono:</span>
                          <a
                            href={`https://wa.me/52${cliente.telefono.replace(/\s+/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📞 {cliente.telefono}
                          </a>
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email:</span>
                          <a
                            href={`mailto:${cliente.email}`}
                            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors truncate max-w-[180px]"
                            onClick={(e) => e.stopPropagation()}
                            title={cliente.email}
                          >
                            ✉️ {cliente.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Resumen Comercial */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center bg-slate-50/50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Monto Compras
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5">
                          {formatCurrency(cliente.compras_total)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Última compra
                        </span>
                        <span className="text-xs font-bold text-slate-600 block mt-0.5 truncate">
                          {formatShortDate(cliente.ultima_compra)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 select-none">
                    <button
                      onClick={() => handleOpenDetail(cliente.id)}
                      className="text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Ficha
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cliente)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent rounded-lg transition-all cursor-pointer"
                        title="Editar datos"
                      >
                        <svg
                          className="h-4.5 w-4.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCrearCotizacion(cliente)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent rounded-lg transition-all cursor-pointer"
                        title="Vender / Cotizar en POS"
                      >
                        <svg
                          className="h-4.5 w-4.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(cliente.id, cliente.nombre_razon_social)
                        }
                        className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent rounded-lg transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <svg
                          className="h-4.5 w-4.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL NUEVO / EDITAR CLIENTE (CENTERED) ── */}
      {formModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all select-none">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="pb-4 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h2 className="text-slate-950 font-black text-lg tracking-tight">
                  {selectedCliente ? "Editar Cliente" : "Nuevo Cliente"}
                </h2>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">
                  Divide los datos del cliente para una facturación 4.0 exitosa.
                </p>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
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

            {/* Selector de Pestañas (Tabs) */}
            <div className="flex border-b border-slate-150 my-4 select-none">
              <button
                type="button"
                onClick={() => setActiveTab("generales")}
                className={`flex-1 py-2.5 text-center text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "generales"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Datos Generales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fiscales")}
                className={`flex-1 py-2.5 text-center text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "fiscales"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Datos Fiscales (4.0)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("comerciales")}
                className={`flex-1 py-2.5 text-center text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "comerciales"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Datos Comerciales
              </button>
            </div>

            {/* Formulario */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto space-y-4 pr-1 my-2"
            >
              {/* PESTAÑA 1: DATOS GENERALES */}
              {activeTab === "generales" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Nombre / Razón Social{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre_razon_social"
                      value={form.nombre_razon_social}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Pérez o Empresa Acme S.A."
                      className={`w-full bg-slate-50 border ${
                        formErrors.nombre_razon_social
                          ? "border-red-500 ring-2 ring-red-500/10"
                          : "border-slate-300 focus:border-indigo-500"
                      } text-black! text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                    />
                    {formErrors.nombre_razon_social && (
                      <p className="text-[10px] font-bold text-red-650 mt-1">
                        {formErrors.nombre_razon_social}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={form.telefono}
                        onChange={handleInputChange}
                        placeholder="10 dígitos (ej. 5512345678)"
                        className={`w-full bg-slate-50 border ${
                          formErrors.telefono
                            ? "border-red-500"
                            : "border-slate-300 focus:border-indigo-500"
                        } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                      />
                      {formErrors.telefono && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.telefono}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Correo Electrónica
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        placeholder="ejemplo@correo.com"
                        className={`w-full bg-slate-50 border ${
                          formErrors.email
                            ? "border-red-500"
                            : "border-slate-300 focus:border-indigo-500"
                        } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                      />
                      {formErrors.email && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: DATOS FISCALES */}
              {activeTab === "fiscales" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        RFC <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="rfc"
                        value={form.rfc}
                        onChange={handleInputChange}
                        placeholder="XAXX010101000"
                        maxLength={13}
                        className={`w-full bg-slate-50 border ${
                          formErrors.rfc
                            ? "border-red-500 ring-2 ring-red-500/10"
                            : "border-slate-300 focus:border-indigo-500"
                        } text-slate-900 text-xs font-mono font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                      />
                      {formErrors.rfc && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.rfc}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Régimen Fiscal <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="regimen_fiscal"
                        value={form.regimen_fiscal}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {REGIMENES_FISCALES.map((rf) => (
                          <option key={rf.code} value={rf.code}>
                            {rf.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.regimen_fiscal && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.regimen_fiscal}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Uso de CFDI <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="uso_cfdi"
                        value={form.uso_cfdi}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {USOS_CFDI.map((cf) => (
                          <option key={cf.code} value={cf.code}>
                            {cf.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.uso_cfdi && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.uso_cfdi}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Código Postal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="codigo_postal_fiscal"
                        value={form.codigo_postal_fiscal}
                        onChange={handleInputChange}
                        placeholder="5 dígitos"
                        maxLength={5}
                        className={`w-full bg-slate-50 border ${
                          formErrors.codigo_postal_fiscal
                            ? "border-red-500 ring-2 ring-red-500/10"
                            : "border-slate-300 focus:border-indigo-500"
                        } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                      />
                      {formErrors.codigo_postal_fiscal && (
                        <p className="text-[10px] font-bold text-red-650 mt-1">
                          {formErrors.codigo_postal_fiscal}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                      Dirección Fiscal
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                          Calle <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="direccion_fiscal_calle"
                          value={form.direccion_fiscal_calle}
                          onChange={handleInputChange}
                          className={`w-full bg-slate-50 border ${
                            formErrors.direccion_fiscal_calle
                              ? "border-red-500"
                              : "border-slate-300 focus:border-indigo-500"
                          } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                            Num Ext <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="direccion_fiscal_num_ext"
                            value={form.direccion_fiscal_num_ext}
                            onChange={handleInputChange}
                            placeholder="Ej. 100"
                            className={`w-full bg-slate-50 border ${
                              formErrors.direccion_fiscal_num_ext
                                ? "border-red-500"
                                : "border-slate-300"
                            } text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none transition-all`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                            Num Int
                          </label>
                          <input
                            type="text"
                            name="direccion_fiscal_num_int"
                            value={form.direccion_fiscal_num_int}
                            onChange={handleInputChange}
                            placeholder="Depto"
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                          Colonia <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="direccion_fiscal_colonia"
                          value={form.direccion_fiscal_colonia}
                          onChange={handleInputChange}
                          className={`w-full bg-slate-50 border ${
                            formErrors.direccion_fiscal_colonia
                              ? "border-red-500"
                              : "border-slate-300 focus:border-indigo-500"
                          } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                          Municipio / Alcaldía{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="direccion_fiscal_municipio"
                          value={form.direccion_fiscal_municipio}
                          onChange={handleInputChange}
                          className={`w-full bg-slate-50 border ${
                            formErrors.direccion_fiscal_municipio
                              ? "border-red-500"
                              : "border-slate-300 focus:border-indigo-500"
                          } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                          Estado <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="direccion_fiscal_estado"
                          value={form.direccion_fiscal_estado}
                          onChange={handleInputChange}
                          className={`w-full bg-slate-50 border ${
                            formErrors.direccion_fiscal_estado
                              ? "border-red-500"
                              : "border-slate-300 focus:border-indigo-500"
                          } text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-all`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: DATOS COMERCIALES */}
              {activeTab === "comerciales" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Tipo de Cliente <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="tipo_cliente"
                        value={form.tipo_cliente}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="Mayorista">Mayorista</option>
                        <option value="Minorista">Minorista</option>
                        <option value="Público General">Público General</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                        Límite de Crédito
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          name="limite_credito"
                          min="0"
                          step="0.01"
                          value={form.limite_credito}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Vendedor Asignado
                    </label>
                    <select
                      name="vendedor_id"
                      value={form.vendedor_id}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Ninguno</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </form>

            {/* Acciones Footer */}
            <div className="pt-4 border-t border-slate-100 flex gap-3 select-none shrink-0">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={apiSubmitting}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
              >
                {apiSubmitting
                  ? "Guardando..."
                  : selectedCliente
                    ? "Actualizar Cliente"
                    : "Crear Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DETALLE DE CLIENTE (RIGHT SLIDE-OVER) ── */}
      {detailOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop Click handle */}
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => setDetailOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-250">
            {/* Cabecera Drawer */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 tracking-wider block uppercase">
                  FICHA GENERAL DE CLIENTE
                </span>
                <h3 className="text-base font-black text-slate-900 truncate mt-0.5">
                  {detailLoading
                    ? "Cargando..."
                    : detailData?.cliente?.nombre_razon_social}
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
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
                  <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs font-semibold">
                    Cargando datos completos...
                  </span>
                </div>
              ) : (
                detailData && (
                  <>
                    {/* Resumen Comercial Rápido */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 select-none">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Compras Neto
                        </span>
                        <span className="text-base font-black text-indigo-600 block mt-0.5">
                          {formatCurrency(detailData.resumen?.total_compras)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Cantidad Tickets
                        </span>
                        <span className="text-base font-black text-slate-800 block mt-0.5">
                          {detailData.resumen?.cantidad_compras} compras
                        </span>
                      </div>
                    </div>

                    {/* Ficha: Datos Generales */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5 mb-3">
                        Contacto y Generales
                      </h4>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Teléfono
                          </span>
                          <span className="font-bold text-slate-800">
                            {detailData.cliente?.telefono || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Correo
                          </span>
                          <span className="font-bold text-slate-800 break-all">
                            {detailData.cliente?.email || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Vendedor Asignado
                          </span>
                          <span className="font-bold text-slate-800">
                            {detailData.cliente?.vendedor?.name ||
                              "Sin asignar"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Tipo Cliente
                          </span>
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md mt-0.5">
                            {detailData.cliente?.tipo_cliente}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ficha: Datos Fiscales */}
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                          Información Fiscal (SAT 4.0)
                        </h4>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                            detailData.cliente?.perfil_completo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {detailData.cliente?.perfil_completo
                            ? "🟢 Completo"
                            : "🟡 Incompleto"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs mb-3">
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            RFC
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {detailData.cliente?.rfc || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Código Postal Fiscal
                          </span>
                          <span className="font-bold text-slate-800">
                            {detailData.cliente?.codigo_postal_fiscal || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Régimen Fiscal
                          </span>
                          <span className="font-bold text-slate-800">
                            {REGIMENES_FISCALES.find(
                              (r) =>
                                r.code === detailData.cliente?.regimen_fiscal,
                            )?.name ||
                              detailData.cliente?.regimen_fiscal ||
                              "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">
                            Uso CFDI
                          </span>
                          <span className="font-bold text-slate-800">
                            {USOS_CFDI.find(
                              (u) => u.code === detailData.cliente?.uso_cfdi,
                            )?.name ||
                              detailData.cliente?.uso_cfdi ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Dirección Fiscal Detallada */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/50 text-xs text-slate-600 space-y-1 font-medium">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Dirección de Facturación
                        </span>
                        {detailData.cliente?.direccion_fiscal_calle ? (
                          <>
                            <p>
                              <strong className="font-semibold text-slate-800">
                                Calle/Núm:
                              </strong>{" "}
                              {detailData.cliente.direccion_fiscal_calle} #
                              {detailData.cliente.direccion_fiscal_num_ext}
                              {detailData.cliente.direccion_fiscal_num_int
                                ? ` Int. ${detailData.cliente.direccion_fiscal_num_int}`
                                : ""}
                            </p>
                            <p>
                              <strong className="font-semibold text-slate-800">
                                Colonia:
                              </strong>{" "}
                              {detailData.cliente.direccion_fiscal_colonia}
                            </p>
                            <p>
                              <strong className="font-semibold text-slate-800">
                                Ciudad/Edo:
                              </strong>{" "}
                              {detailData.cliente.direccion_fiscal_municipio},{" "}
                              {detailData.cliente.direccion_fiscal_estado}
                            </p>
                          </>
                        ) : (
                          <p className="text-slate-450 italic text-[11px]">
                            No se ha cargado dirección fiscal.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ficha: Historial Transacciones */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5 mb-3">
                        Historial de Ventas
                      </h4>
                      {detailData.transacciones?.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 italic text-xs">
                          Este cliente no ha registrado compras en el sistema.
                        </div>
                      ) : (
                        <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500">
                                <th className="px-3 py-2">Folio</th>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2 text-right">Monto</th>
                                <th className="px-3 py-2 text-center">
                                  Estado
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {detailData.transacciones.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-mono text-slate-500 font-bold">
                                    {t.numero_ticket}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {formatShortDate(t.created_at)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-900 font-bold">
                                    {formatCurrency(t.total)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        t.estado === "completada"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-red-50 text-red-700"
                                      }`}
                                    >
                                      {t.estado}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
            </div>

            {/* Acciones Drawer Footer */}
            {!detailLoading && detailData && (
              <div className="p-6 border-t border-slate-100 flex gap-3 select-none shrink-0">
                <button
                  onClick={() => handleOpenEdit(detailData.cliente)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  Editar Datos
                </button>
                <button
                  onClick={() => handleCrearCotizacion(detailData.cliente)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Crear Cotización
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
