import React from 'react'
import Navigation from '../components/Navigation'

export default function UsuariosPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />
      <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-slate-400 text-sm max-w-sm">Módulo de control de roles, accesos y personal - En Desarrollo.</p>
        </div>
      </div>
    </div>
  )
}
