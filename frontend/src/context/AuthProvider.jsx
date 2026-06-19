import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api, { authService } from '../services/api'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch (e) {
      console.error('Error parsing user from localStorage:', e)
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'))

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          const response = await api.get('/user')
          setUser(response.data)
          localStorage.setItem('user', JSON.stringify(response.data))
        } catch (e) {
          console.error('Error verifying token on mount:', e)
          setToken(null)
          setUser(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password })
      const { access_token: receivedToken, user: receivedUser } = response.data.data
      
      setToken(receivedToken)
      setUser(receivedUser)
      
      localStorage.setItem('token', receivedToken)
      localStorage.setItem('user', JSON.stringify(receivedUser))
      
      return { success: true }
    } catch (error) {
      console.error('Login request failed:', error)
      const message = error.response?.data?.message || 'Credenciales incorrectas o error de conexión'
      return { success: false, message }
    }
  }

  const register = async (name, email, password, passwordConfirmation) => {
    try {
      const response = await authService.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      const { access_token: receivedToken, user: receivedUser } = response.data.data
      
      setToken(receivedToken)
      setUser(receivedUser)
      
      localStorage.setItem('token', receivedToken)
      localStorage.setItem('user', JSON.stringify(receivedUser))
      
      return { success: true }
    } catch (error) {
      console.error('Register request failed:', error)
      const message = error.response?.data?.message || 'Error al registrar el usuario'
      return { success: false, message }
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}