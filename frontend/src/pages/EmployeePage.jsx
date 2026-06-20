import { useAuth } from '../context/useAuth'
import Navigation from '../components/Navigation'
import { Link } from 'react-router-dom'

export default function EmployeePage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />

      <div className="flex-1 min-w-0 flex items-center justify-center p-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl w-full text-center shadow-xl">
          <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Portal de Operaciones
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            ¡Hola, {user?.name}! Has iniciado sesión como <span className="font-semibold text-indigo-400">Empleado</span>. Este panel contiene tus tareas diarias y controles del almacén.
          </p>

          <div className="border border-slate-800 bg-slate-950 rounded-xl p-5 mb-8 text-left space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Módulos Disponibles</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <Link 
                to="/inventario/productos" 
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-all font-semibold"
              >
                <span>📦 Catálogo de Productos</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            NovaERP • Módulo de Operaciones para Personal de Planta
          </p>
        </div>
      </div>
    </div>
  )
}
