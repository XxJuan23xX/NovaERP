import Navigation from '../components/Navigation'

export default function KardexPage() {
  const mockHistorial = [ 
    { id: 1, fecha: '2026-06-15 11:24', producto: 'Tornillo de Acero 1/2"', tipo: 'Entrada', cantidad: 50, usuario: 'Admin Principal', motivo: 'Compra a proveedor' },
    { id: 2, fecha: '2026-06-15 09:15', producto: 'Cable Eléctrico Calibre 12', tipo: 'Salida', cantidad: 2, usuario: 'Empleado Juan', motivo: 'Venta directa' },
    { id: 3, fecha: '2026-06-14 16:45', producto: 'Pintura Látex Ultra White 19L', tipo: 'Ajuste', cantidad: -1, usuario: 'Admin Principal', motivo: 'Mermas por daño' }
  ]

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />

      <div className="flex-1 min-w-0">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ENCABEZADO */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </span>
              Kardex &amp; Historial de Ajustes
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Bitácora de movimientos físicos y contables del catálogo de inventario (Exclusivo Administrador).
            </p>
          </div>

          {/* TABLA DE MOVIMIENTOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Fecha &amp; Hora</th>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right">Cantidad</th>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {mockHistorial.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/35 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {log.fecha}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {log.producto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          log.tipo === 'Entrada' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : log.tipo === 'Salida'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {log.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold">
                        {log.cantidad > 0 ? `+${log.cantidad}` : log.cantidad}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {log.usuario}
                      </td>
                      <td className="px-6 py-4 text-slate-400 italic">
                        {log.motivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
