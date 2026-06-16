import logo from '../assets/logo.jpg'

export default function AuthLayout({ children, bgImage, reverse = false }) {
  return (
    // Si 'reverse' es true, invertimos las columnas en pantallas grandes
    <div className={`flex h-screen w-screen overflow-hidden bg-white ${reverse ? 'lg:flex-row-reverse' : ''}`}>
      
      {/* ── Column: Form Content ── */}
      <div className="flex flex-1 flex-col justify-center px-8 py-6 sm:px-12 lg:px-16 xl:px-24 bg-white">
        
        {/* Logo unificado */}
        <div className="mb-1">
          <div className="flex items-center gap-2.5">
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
          </div>
        </div>

        {/* Form content */}
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>

      {/* ── Column: Decorative Panel (Limpio) ── */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[45%] relative overflow-hidden h-full">
        <img
          src={bgImage} // Imagen dinámica recibida de la página
          alt="Panel decorativo"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}