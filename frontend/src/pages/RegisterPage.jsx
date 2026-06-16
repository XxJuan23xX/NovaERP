import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import Alert from '../components/Alert'
// Importamos su respectiva imagen aquí
import registerImg from '../assets/register.jpg'

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido'
    if (!form.email.trim()) errs.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Correo inválido'
    if (!form.password) errs.password = 'La contraseña es requerida'
    else if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres'
    if (form.password !== form.password_confirmation)
      errs.password_confirmation = 'Las contraseñas no coinciden'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    const result = await register(
      form.name,
      form.email,
      form.password,
      form.password_confirmation,
    )

    if (result.success) {
      navigate('/inventario/productos')
    } else {
      setError(result.message)
    }
  }

  const strength = getStrength(form.password)
  const strengthColors = ['bg-slate-200', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-400']
  const strengthLabels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']

  return (
    <AuthLayout bgImage={registerImg} reverse={false}>
      <div className="mb-2">
        <h1 className="text-7xl font-bold text-slate-800 tracking-tight">
          <span className='text-black'>Crear</span> <span className="text-indigo-600">Cuenta</span>
        </h1>
        <p className="text-sm text-slate-500">
          Registra un nuevo usuario en el sistema ERP
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Alert message={error} type="error" />

        <InputField
          label="Nombre completo"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Juan Pérez"
          autoComplete="name"
          error={fieldErrors.name}
        />

        <InputField
          label="Correo electrónico"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="usuario@empresa.com"
          autoComplete="email"
          error={fieldErrors.email}
        />

        <InputField
          label="Contraseña"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          error={fieldErrors.password}
        />

        {form.password && (
          <div className="space-y-1 -mt-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    level <= strength ? strengthColors[strength] : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            {strength > 0 && (
              <p className="text-xs text-slate-400">
                Contraseña: <span className="font-medium text-slate-600">{strengthLabels[strength]}</span>
              </p>
            )}
          </div>
        )}

        <InputField
          label="Confirmar contraseña"
          type="password"
          name="password_confirmation"
          value={form.password_confirmation}
          onChange={handleChange}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          error={fieldErrors.password_confirmation}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white
            shadow-sm transition-all duration-150 hover:bg-indigo-700 active:scale-[0.99]
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </button>
      </form>

      <div className="mt-2 rounded-xl border border-indigo-50 bg-sky-200 px-4 py-3 text-center">
        <span className="text-sm text-slate-600">¿Ya tienes cuenta? </span>
        <Link to="/login" className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
          Iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  )
}

function getStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}