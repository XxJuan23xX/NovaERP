import React from 'react'
import Navigation from '../components/Navigation'

export default function PuntoVentaPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />
      <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Punto de Venta (POS)</h1>
          <p className="text-slate-400 text-sm max-w-sm">Módulo de facturación rápida y cobros en ventanilla - En Desarrollo.</p>
        </div>
      </div>
    </div>
  )
}
