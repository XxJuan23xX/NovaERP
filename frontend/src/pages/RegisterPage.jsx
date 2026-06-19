import { useState, useEffect } from "react";
import api from "../services/api";
import Navigation from "../components/Navigation";
import Alert from "../components/Alert";

export default function RegisterPage() {
  // ── ESTADOS LOCALES ──
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "empleado",
    sucursal: "",
  });
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Controles de visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── CARGA DINÁMICA DE SUCURSALES (ALMACENES) ──
  useEffect(() => {
    api
      .get("/inventario/almacenes")
      .then((res) => {
        const rawData = res.data;
        const list = Array.isArray(rawData)
          ? rawData
          : rawData.almacenes || rawData.data || [];
        setSucursales(list.map((almacen) => almacen.nombre));
      })
      .catch((err) => {
        console.warn("Error al cargar almacenes de la BD:", err);
        setSucursales([]);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "El nombre es requerido";
    if (!form.email.trim()) errs.email = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Correo inválido";
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

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Hacemos el POST directo para evitar alterar la sesión del Admin logueado
      const response = await api.post("/register", form);

      if (response.data.status === "success") {
        setSuccess(
          `Empleado "${form.name}" registrado con éxito en la sucursal "${form.sucursal}".`,
        );
        setForm({
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          role: "empleado",
          sucursal: "",
        });
      } else {
        setError(response.data.message || "Error en el registro.");
      }
    } catch (err) {
      console.error("Error al registrar empleado:", err);
      setError(
        err.response?.data?.message || "Error al conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const strengthColors = [
    "bg-slate-800",
    "bg-red-500/80",
    "bg-amber-500/80",
    "bg-blue-500/80",
    "bg-emerald-500/80",
  ];
  const strengthLabels = ["", "Débil", "Regular", "Buena", "Fuerte"];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      <div className="flex-1 min-w-0 flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-850 p-8 rounded-2xl shadow-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6.5 w-6.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </span>
              Registrar Empleado
            </h1>
            <p className="mt-1.5 text-slate-400 text-sm">
              Crea una nueva cuenta de personal interno en NovaERP
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Alert message={error} type="error" />
            <Alert message={success} type="success" />

            {/* Nombre completo */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
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
                disabled={loading}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 outline-none transition-all duration-150
                  ${
                    fieldErrors.name
                      ? "border-red-500 ring-1 ring-red-500/30"
                      : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
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
                disabled={loading}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 outline-none transition-all duration-150
                  ${
                    fieldErrors.email
                      ? "border-red-500 ring-1 ring-red-500/30"
                      : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Rol de Usuario
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={loading}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 outline-none transition-all duration-150 
                  ${
                    fieldErrors.role
                      ? "border-red-500 ring-1 ring-red-500/30"
                      : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }`}
              >
                <option value="empleado" className="bg-slate-900">
                  👤 Empleado
                </option>
                <option value="admin" className="bg-slate-900">
                  🔑 Administrador
                </option>
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Sucursal Asignada
              </label>
              <select
                id="sucursal"
                name="sucursal"
                value={form.sucursal}
                onChange={handleChange}
                disabled={loading}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-950 text-slate-100 outline-none transition-all duration-150 
                  ${
                    fieldErrors.sucursal
                      ? "border-red-500 ring-1 ring-red-500/30"
                      : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }`}
              >
                <option value="" className="bg-slate-900">
                  {sucursales.length === 0
                    ? "Cargando sucursales..."
                    : "Seleccione una sucursal..."}
                </option>
                {sucursales.map((suc, idx) => (
                  <option key={idx} value={suc} className="bg-slate-900">
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
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
                  disabled={loading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 outline-none transition-all duration-150
                    ${
                      fieldErrors.password
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <p className="text-[10px] text-slate-500">
                    Seguridad:{" "}
                    <span className="font-semibold text-slate-350">
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
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
                  disabled={loading}
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 outline-none transition-all duration-150
                    ${
                      fieldErrors.password_confirmation
                        ? "border-red-500 ring-1 ring-red-500/30"
                        : "border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white
                shadow-sm transition-all duration-150 hover:bg-indigo-700 active:scale-[0.99]
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrar Empleado"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
