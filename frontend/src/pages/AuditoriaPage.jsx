import Navigation from "../components/Navigation";

export default function AuditoriaPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navigation />
      <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Auditoría y Seguridad
          </h1>
          <p className="text-slate-400 text-sm max-w-sm">
            Módulo de trazabilidad, logs de actividad del sistema e historial de
            cambios - En Desarrollo.
          </p>
        </div>
      </div>
    </div>
  );
}
