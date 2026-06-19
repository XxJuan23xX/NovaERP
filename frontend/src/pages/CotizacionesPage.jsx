import React from 'react'
import Navigation from '../components/Navigation'

export default function CotizacionesPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />
      <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Cotizaciones</h1>
          <p className="text-slate-400 text-sm max-w-sm">Módulo de generación y envío de cotizaciones a clientes - En Desarrollo.</p>
        </div>
      </div>
    </div>
  )
}
