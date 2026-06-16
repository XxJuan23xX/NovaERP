import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import Alert from '../components/Alert'
// Importamos su respectiva imagen aquí
import loginImg from '../assets/login.jpg'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.email.trim()) errs.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Correo inválido'
    if (!form.password) errs.password = 'La contraseña es requerida'
    return errs
  }

 const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    const result = await login(form.email, form.password)

    if (result.success) {
      // Redirección directa y única al catálogo de productos
      navigate('/inventario/productos')
    } else {
      setError(result.message)
    }
  }

  return (
    <AuthLayout bgImage={loginImg} reverse={true}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          <span className='text-black'>Iniciar</span> <span className="text-indigo-600">Sesión</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ingresa tus credenciales para acceder a NovaERP
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert message={error} type="error" />

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
          placeholder="Introduce tu contraseña"
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white
            shadow-sm transition-all duration-150 hover:bg-indigo-700 active:scale-[0.99]
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Autenticando...' : 'Ingresar al Sistema'}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-indigo-50 bg-indigo-50/50 px-4 py-3 text-center">
        <span className="text-sm text-slate-600">¿No tienes cuenta? </span>
        <Link to="/register" className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
          Regístrate aquí
        </Link>
      </div>
    </AuthLayout>
  )
}