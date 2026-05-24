import { createContext, useContext } from 'react'
import type * as authApi from '../../api/auth'

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  isAuthenticated: boolean
  refresh: (silent?: boolean) => Promise<void>
  login: (form: authApi.LoginForm) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider chưa được gắn vào cây component.')
  return value
}

