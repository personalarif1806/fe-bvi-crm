import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, tokenStore, ApiError } from '../lib/api.js'

const AuthContext = createContext(null)

const USER_KEY = 'bv-auth-user'

// Peran internal yang boleh mengakses CRM. Customer (eksternal) ditolak.
export const CRM_ROLES = ['Administrator', 'Sales']

// Apakah peran ini berhak masuk aplikasi CRM.
export function canAccessCrm(role) {
  return CRM_ROLES.includes(role)
}

// Halaman awal setelah login. Aplikasi ini khusus CRM, jadi selalu /crm.
export function homePathFor() {
  return '/crm'
}

// Lengkapi user dari API dengan field tampilan yang dipakai UI.
function decorate(user) {
  return {
    ...user,
    accountType: user.role === 'Administrator' ? 'ADMIN' : user.role === 'Sales' ? 'SALES' : 'CUSTOMER',
  }
}

function loadCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const cached = loadCachedUser()
  const [user, setUser] = useState(cached)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(cached && tokenStore.get()))
  const [initializing, setInitializing] = useState(Boolean(tokenStore.get()))

  // Restore sesi: validasi token ke /api/auth/me saat aplikasi dimuat.
  useEffect(() => {
    if (!tokenStore.get()) {
      setInitializing(false)
      return
    }
    let active = true
    authApi
      .me()
      .then(({ user: u }) => {
        if (!active) return
        const decorated = decorate(u)
        setUser(decorated)
        setIsAuthenticated(true)
        localStorage.setItem(USER_KEY, JSON.stringify(decorated))
      })
      .catch((err) => {
        // Token invalid/kedaluwarsa → bersihkan sesi. Error jaringan → biarkan cache.
        if (active && err instanceof ApiError && err.status !== 0) clearSession()
      })
      .finally(() => active && setInitializing(false))
    return () => {
      active = false
    }
  }, [])

  function persist(decorated, token) {
    tokenStore.set(token)
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(decorated))
    } catch {
      /* abaikan */
    }
  }

  function clearSession() {
    tokenStore.clear()
    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      /* abaikan */
    }
    setUser(null)
    setIsAuthenticated(false)
  }

  // Login via backend (bcrypt + JWT) — satu-satunya jalur, selalu cek database.
  // Mengembalikan { ok, error? }.
  async function loginWithCredentials(email, password) {
    try {
      const { user: u, token } = await authApi.login(email, password)
      const decorated = decorate(u)
      persist(decorated, token)
      setUser(decorated)
      setIsAuthenticated(true)
      return { ok: true, user: decorated }
    } catch (err) {
      const error = err instanceof ApiError ? err.message : 'Email atau password salah.'
      return { ok: false, error }
    }
  }

  const logout = () => clearSession()

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, initializing, loginWithCredentials, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
