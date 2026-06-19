import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.jpg";

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    {
      name: "Dashboard",
      path: user?.role === "admin" ? "/dashboard" : "/operaciones",
    },
    { name: "Productos", path: "/inventario/productos" },
  ];

  // Solo admin tiene acceso al Kardex
  if (user?.role === "admin") {
    navItems.push({
      name: "Historial & Ajustes (Kardex)",
      path: "/inventario/kardex",
    });
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-8">
        {/* Brand Logo */}
        <Link
          to={user?.role === "admin" ? "/dashboard" : "/operaciones"}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img
              src={logo}
              alt="NovaERP Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800">
            Nova<span className="text-indigo-600">ERP</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">
              {user?.name || "Usuario"}
            </p>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                user?.role === "admin"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-indigo-100 text-indigo-700 border border-indigo-200"
              }`}
            >
              {user?.role === "admin" ? "🔑 Administrador" : "👤 Empleado"}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 px-3.5 py-2 rounded-xl transition-all active:scale-95"
        >
          {user?.role === "admin" ? "Cerrar Sesión" : "Salir del Turno"}
        </button>
      </div>
    </header>
  );
}
