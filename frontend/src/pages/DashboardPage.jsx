import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        {/* Icono */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-slate-800">¡Bienvenido!</h1>
        <p className="text-slate-500">{user?.name}</p>
        <p className="mb-1 text-sm text-slate-400">{user?.email}</p>

        <span
          className={`mb-6 mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
            user?.role === 'admin'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {user?.role === 'admin' ? '🔑 Administrador' : '👤 Empleado'}
        </span>

        <p className="mb-8 text-sm text-slate-400">
          Aquí irá el dashboard de tu ERP. Módulo en construcción.
        </p>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700
            transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]
            focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
