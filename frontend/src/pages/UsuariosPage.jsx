import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navigation from "../components/Navigation";
import Alert from "../components/Alert";
import { useAuth } from "../context/useAuth";

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // ── ESTADO PARA DROPDOWN DE ACCIONES ──
  const [usuarioMenuAbierto, setUsuarioMenuAbierto] = useState(null);

  useEffect(() => {
    const cerrarMenu = () => setUsuarioMenuAbierto(null);
    document.addEventListener("click", cerrarMenu);
    return () => document.removeEventListener("click", cerrarMenu);
  }, []);

  // ── ESTADOS LOCALES DE LA LISTA ──
  const [users, setUsers] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  // ── ESTADO DE LA FECHA DINÁMICA ──
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── ESTADOS DE PAGINACIÓN ──
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── ESTADOS LOCALES DEL MODAL Y FORMULARIO ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "empleado",
    sucursal: "",
  });
  const [sucursales, setSucursales] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Controles de visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── CARGA INICIAL DE DATOS ──
  const fetchUsers = () => {
    setTableLoading(true);
    setTableError("");
    api
      .get("/users")
      .then((res) => {
        setUsers(res.data.data || []);
      })
      .catch((err) => {
        console.error("Error al cargar usuarios:", err);
        setTableError("No se pudieron cargar los usuarios del sistema.");
      })
      .finally(() => {
        setTableLoading(false);
      });
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      try {
        // 1. Cargar usuarios de forma segura
        await fetchUsers();
      } catch (err) {
        console.error("Error al cargar usuarios de la BD:", err);
      }

      try {
        // 2. Cargar Sucursales/Almacenes de forma segura
        const res = await api.get("/inventario/almacenes");
        const rawData = res.data;
        const list = Array.isArray(rawData)
          ? rawData
          : rawData.almacenes || rawData.data || [];

        setSucursales(list.map((almacen) => almacen.nombre));
      } catch (err) {
        console.warn("Error al cargar almacenes de la BD:", err);
        setSucursales([]); // Se ejecuta seguro dentro del flujo asíncrono
      }
    };

    inicializarDatos();
  }, []);

  // ── MANEJADORES DE ACCIÓN ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
    setFormSuccess("");
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleToggleStatus = async (userId, userName) => {
    try {
      const response = await api.patch(`/users/${userId}/toggle-status`);
      if (response.data.status === "success") {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, activo: response.data.data.activo } : u,
          ),
        );
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      const errMsg =
        err.response?.data?.message ||
        `No se pudo cambiar el estado de ${userName}`;
      alert(errMsg);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "El nombre completo es requerido";
    if (!form.email.trim()) errs.email = "El correo electrónico es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Correo electrónico inválido";
    }

    if (!form.password) errs.password = "La contraseña es requerida";
    else if (form.password.length < 8) errs.password = "Mínimo 8 caracteres";

    if (form.password !== form.password_confirmation) {
      errs.password_confirmation = "Las contraseñas no coinciden";
    }

    if (!form.role) errs.role = "El rol es requerido";
    if (!form.sucursal) errs.sucursal = "La sucursal es requerida";

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const response = await api.post("/register", form);

      if (response.data.status === "success") {
        setFormSuccess(`Usuario "${form.name}" registrado con éxito.`);
        setForm({
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          role: "empleado",
          sucursal: "",
        });
        // Recargar la tabla para mostrar el nuevo usuario
        fetchUsers();
        // Cerrar modal tras un leve retraso para visualizar el éxito
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess("");
        }, 1500);
      } else {
        setFormError(response.data.message || "Error al registrar el usuario.");
      }
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      setFormError(
        err.response?.data?.message || "Error al conectar con el servidor.",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const strengthColors = [
    "bg-slate-200",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-600",
    "bg-emerald-500",
  ];
  const strengthLabels = ["", "Débil", "Regular", "Buena", "Fuerte"];

  // ── ACTUALIZACIÓN DE FECHA CADA MINUTO ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
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

  // ── SUCURSAL DEL ADMINISTRADOR LOGEADO ──
  const adminSucursal = currentUser?.sucursal || "";

  // ── CÁLCULO DE PAGINACIÓN ──
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* El sidebar mantiene su diseño oscuro de acuerdo a las directrices */}
      <Navigation />

      {/* Espacio de trabajo principal en Modo Claro */}
      <div className="flex-1 min-w-0 p-8 flex flex-col">
        {/* Cabecera del Módulo */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px]! font-extrabold tracking-tight text-black!">
              Usuarios
            </h1>
            <p className="mt-1 text-slate-400 text-xs font-medium">
              {formatExecutiveDate(currentDate)}
            </p>
            <p className="mt-2.5 text-slate-600 text-sm">
              Sucursal:{" "}
              <strong className="font-bold text-slate-900">
                {adminSucursal || "No asignada"}
              </strong>{" "}
              — 2 admins / 3 empleados (límite por sucursal)
            </p>
          </div>
          <button
            onClick={() => {
              setFormError("");
              setFormSuccess("");
              setFieldErrors({});
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#4f46e5] hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm hover:shadow transition-all duration-150 active:scale-98 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo usuario
          </button>
        </div>

        {/* Alerta de error en la carga de la tabla */}
        {tableError && <Alert message={tableError} type="error" />}

        {/* Tarjeta contenedora de la Tabla */}
        <div className="bg-white rounded-sm border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
          {tableLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#4f46e5] rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-semibold">
                Cargando personal...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                No hay usuarios registrados
              </h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1.5">
                Utiliza el botón "+ Nuevo usuario" para dar de alta al personal
                en el sistema.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-300 border-b border-slate-100 select-none">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      ID
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Correo
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Sucursal
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentUsers.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                        #{item.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 select-none shadow-sm">
                            {item.name
                              ? item.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "??"}
                          </div>
                          <div>
                            <p className="text-[11.5px] font-bold text-slate-900 leading-tight">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 font-semibold">
                        {item.email}
                      </td>
                      <td className="px-4 py-3">
                        {item.role === "admin" ? (
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold uppercase rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                            Administrador
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold uppercase rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                            Empleado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-650 font-semibold">
                        {item.sucursal || "No asignada"}
                      </td>
                      <td className="px-4 py-3">
                        {item.activo ? (
                          <button
                            onClick={() =>
                              handleToggleStatus(item.id, item.name)
                            }
                            title="Haga click para desactivar usuario"
                            className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold uppercase rounded-md bg-emerald-50 text-emerald-600 border border-emerald-250 hover:bg-emerald-100/50 transition-all cursor-pointer"
                          >
                            Activo
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleToggleStatus(item.id, item.name)
                            }
                            title="Haga click para activar usuario"
                            className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold uppercase rounded-md bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            Inactivo
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUsuarioMenuAbierto(
                              usuarioMenuAbierto === item.id ? null : item.id,
                            );
                          }}
                          title="Acciones de usuario"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer font-bold select-none active:scale-95"
                        >
                          •••
                        </button>

                        {usuarioMenuAbierto === item.id && (
                          <div className="absolute right-6 mt-1 w-48 rounded-xl bg-white shadow-lg ring-1 ring-black/5 z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                            <button
                              onClick={() => {
                                console.log(
                                  "Editar datos del usuario ID:",
                                  item.id,
                                );
                                setUsuarioMenuAbierto(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              Editar datos
                            </button>
                            <button
                              onClick={() => {
                                console.log(
                                  "Cambiar contraseña del usuario ID:",
                                  item.id,
                                );
                                setUsuarioMenuAbierto(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              Cambiar contraseña
                            </button>
                            <button
                              onClick={() => {
                                console.log(
                                  "Desactivar cuenta del usuario ID:",
                                  item.id,
                                );
                                setUsuarioMenuAbierto(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              Desactivar cuenta
                            </button>
                            <button
                              onClick={() => {
                                setUsuarioMenuAbierto(null);
                                navigate("/auditoria");
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2 cursor-pointer border-t border-slate-100"
                            >
                              Ver historial
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length > 10 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <div className="text-sm text-slate-500 font-medium">
                    Página {safeCurrentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safeCurrentPage === totalPages}
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

      {/* ── MODAL DE REGISTRO EN MODO CLARO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-lg bg-white border border-slate-100 p-8 rounded-2xl shadow-xl flex flex-col relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Botón cerrar modal */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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

            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-black! flex items-center gap-3">
                <span className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[#4f46e5]">
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
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </span>
                Registrar Nuevo Usuario
              </h2>
              <p className="mt-1 text-slate-500 text-sm">
                Crea una cuenta de personal interno con privilegios específicos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Alert message={formError} type="error" />
              <Alert message={formSuccess} type="success" />

              {/* Nombre completo */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="name"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  disabled={formLoading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none transition-all duration-150
                    ${
                      fieldErrors.name
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                    }`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Correo electrónico */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="usuario@empresa.com"
                  disabled={formLoading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none transition-all duration-150
                    ${
                      fieldErrors.email
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                    }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Rol de Usuario */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="role"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Rol de Usuario
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={formLoading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white text-slate-900 outline-none transition-all duration-150 
                    ${
                      fieldErrors.role
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                    }`}
                >
                  <option value="empleado"> Empleado</option>
                  <option value="admin"> Administrador</option>
                </select>
                {fieldErrors.role && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.role}
                  </p>
                )}
              </div>

              {/* Sucursal Asignada */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="sucursal"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Sucursal Asignada
                </label>
                <select
                  id="sucursal"
                  name="sucursal"
                  value={form.sucursal}
                  onChange={handleChange}
                  disabled={formLoading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white text-slate-900 outline-none transition-all duration-150 
                    ${
                      fieldErrors.sucursal
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                    }`}
                >
                  <option value="">
                    {sucursales.length === 0
                      ? "Cargando sucursales..."
                      : "Seleccione una sucursal..."}
                  </option>
                  {sucursales.map((suc, idx) => (
                    <option key={idx} value={suc}>
                      {suc}
                    </option>
                  ))}
                </select>
                {fieldErrors.sucursal && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.sucursal}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    disabled={formLoading}
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none transition-all duration-150
                      ${
                        fieldErrors.password
                          ? "border-red-500 ring-1 ring-red-500/30"
                          : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                      }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
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
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Fuerza de la contraseña */}
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          level <= strength
                            ? strengthColors[strength]
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  {strength > 0 && (
                    <p className="text-[10px] text-slate-400">
                      Seguridad:{" "}
                      <span className="font-semibold text-slate-600">
                        {strengthLabels[strength]}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="password_confirmation"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="password_confirmation"
                    name="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.password_confirmation}
                    onChange={handleChange}
                    placeholder="Repite la contraseña"
                    disabled={formLoading}
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none transition-all duration-150
                      ${
                        fieldErrors.password_confirmation
                          ? "border-red-500 ring-1 ring-red-500/30"
                          : "border-slate-200 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10"
                      }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
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
                    )}
                  </button>
                </div>
                {fieldErrors.password_confirmation && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {fieldErrors.password_confirmation}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-red-500 text-white rounded-lg border border-slate-200 font-semibold px-4 py-2.5 text-sm transition-all cursor-pointer active:scale-98"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 rounded-lg bg-[#4f46e5] hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 text-sm shadow-sm transition-all duration-150 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {formLoading ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getStrength(password) {
  let score = 0;
  if (!password) return 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
