import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeePage from "./pages/EmployeePage";
import ProductosPage from "./pages/ProductosPage";
import KardexPage from "./pages/KardexPage";
import PuntoVentaPage from "./pages/PuntoVentaPage";
import CotizacionesPage from "./pages/CotizacionesPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import ClientesPage from "./pages/ClientesPage";
import CierreCajaPage from "./pages/CierreCajaPage";
import UsuariosPage from "./pages/UsuariosPage";
import AuditoriaTraspasosPage from "./pages/AuditoriaTraspasosPage";

// 🔒 Ruta protegida — Si no existe el token físico en el navegador, se expulsa inmediatamente
function PrivateRoute({ children }) {
  const { user } = useAuth();
  const tokenExistente = !!localStorage.getItem("token");

  // Cortocircuito instantáneo: Si no hay token, no hay sesión válida
  if (!tokenExistente) {
    return <Navigate to="/login" replace />;
  }

  // Si el token existe en disco pero el estado reactivo 'user' se está sincronizando,
  // mostramos un mensaje temporal rápido en lugar de rebotar al usuario por error
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-semibold">
        Verificando credenciales...
      </div>
    );
  }

  return children;
}

// 🛑 NUEVO GUARDIÁN: Protege rutas exclusivas para el Administrador
function AdminRoute({ children }) {
  const { user } = useAuth();
  const tokenExistente = !!localStorage.getItem("token");

  // 1. Si no hay token o no es admin, lo rebota al catálogo
  if (!tokenExistente || (user && user.role !== "admin")) {
    return <Navigate to="/inventario/productos" replace />;
  }

  // 2. Si el token existe pero el objeto 'user' aún está cargando en React, congelamos la UI un instante
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-semibold">
        Verificando nivel de acceso...
      </div>
    );
  }

  return children;
}

// 🔓 Ruta pública — Si el usuario ya está autenticado, lo manda directo al catálogo del Módulo 1
function PublicRoute({ children }) {
  const { user } = useAuth();
  const tokenExistente = !!localStorage.getItem("token");

  // Si hay rastro de sesión activa por token o por estado, redirige de inmediato
  if (tokenExistente || user) {
    return <Navigate to="/inventario/productos" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirige la raíz a /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas públicas (solo sin sesión) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AdminRoute>
              <RegisterPage />
            </AdminRoute>
          }
        />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <PuntoVentaPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/cotizaciones"
          element={
            <PrivateRoute>
              <CotizacionesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <AdminRoute>
              <UsuariosPage />
            </AdminRoute>
          }
        />
        <Route
          path="/auditoria"
          element={
            <AdminRoute>
              <AuditoriaPage />
            </AdminRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <ClientesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/cierre-caja"
          element={
            <PrivateRoute>
              <CierreCajaPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/operaciones"
          element={
            <PrivateRoute>
              <EmployeePage />
            </PrivateRoute>
          }
        />

        {/* Módulo 1: Inventario y Catálogo */}
        <Route
          path="/inventario/productos"
          element={
            <PrivateRoute>
              <ProductosPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventario/traspasos"
          element={
            <PrivateRoute>
              <AuditoriaTraspasosPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventario/kardex"
          element={
            <AdminRoute>
              <KardexPage />
            </AdminRoute>
          }
        />

        {/* 404 — redirige a login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
