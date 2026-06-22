import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.jpg";

export default function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── ESTADO DEL SIDEBAR (Persistido para evitar flickeos) ──
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Extrae iniciales dinámicamente del nombre del usuario
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
          />
        </svg>
      ),
    },
    {
      name: "Punto de Venta",
      path: "/pos",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: "Inventario",
      path: "/inventario/productos",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      name: "Traspasos",
      path: "/inventario/traspasos",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      name: "Cotizaciones",
      path: "/cotizaciones",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      name: "Usuarios",
      path: "/usuarios",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: "Auditoría",
      path: "/auditoria",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      name: "Clientes (CRM)",
      path: "/clientes",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      name: "Cierre de Caja",
      path: "/cierre-caja",
      icon: (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1M10 11h4"
          />
        </svg>
      ),
    },
  ];

  // ── FILTRAR MENÚ SEGÚN EL ROL DE USUARIO ──
  const filteredMenuItems = menuItems
    .filter((item) => {
      if (user?.role === "empleado") {
        return [
          "/pos",
          "/inventario/productos",
          "/cotizaciones",
          "/inventario/traspasos",
        ].includes(item.path);
      }
      return true;
    })
    .map((item) => {
      if (user?.role === "empleado" && item.path === "/inventario/productos") {
        return { ...item, name: "Consulta Productos" };
      }
      return item;
    });

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col justify-between bg-slate-900 border-r border-slate-800 z-50 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ── SECCIÓN SUPERIOR: LOGO Y TOGGLE ── */}
      <div
        className={`flex border-b border-slate-800 overflow-hidden ${
          collapsed
            ? "flex-col items-center py-3 gap-2"
            : "items-center justify-between p-4 h-16"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
          <div className="flex-shrink-0 h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-indigo-600/10 border border-indigo-500/20">
            <img
              src={logo}
              alt="NovaERP Logo"
              className="h-full w-full object-cover"
            />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">
              Nova<span className="text-indigo-500">ERP</span>
            </span>
          )}
        </div>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={
            collapsed
              ? "w-full flex justify-center py-2 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
              : "p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* ── SECCIÓN DE PERFIL ACTIVO (BADGE) ── */}
      <div className="mt-4">
        {!collapsed ? (
          <div className="mx-4 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2.5 transition-all">
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${user?.role === "admin" ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.role === "admin"
                ? "🛡️ Panel de Admin"
                : "👤 Panel de Empleado"}
            </span>
          </div>
        ) : (
          <div
            title={
              user?.role === "admin"
                ? "Panel de Administración"
                : "Panel de Empleado"
            }
            className="mx-auto w-8 h-8 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center transition-all"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${user?.role === "admin" ? "bg-indigo-500" : "bg-emerald-500"}`}
            />
          </div>
        )}
      </div>

      {/* ── SECCIÓN MEDIA: ENLACES DE MENÚ ── */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredMenuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {item.icon}
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── SECCIÓN INFERIOR: USUARIO Y CERRAR SESIÓN ── */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar circular con gradiente e iniciales */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 select-none shadow-md shadow-indigo-600/10">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || "Usuario"}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold capitalize mt-0.5 truncate">
                  {user?.role || "Personal"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer active:scale-90"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            {/* Solo se muestra el avatar con tooltip de logout/iniciales */}
            <div
              onClick={handleLogout}
              title="Cerrar Sesión (Click)"
              className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center cursor-pointer hover:opacity-85 hover:scale-95 active:scale-90 transition-all select-none shadow-md shadow-indigo-600/10"
            >
              {getInitials(user?.name)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
