import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../../api/auth'
import { AuthContext } from './auth-context'
import type { AuthContextValue, AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setStatus('checking')

    try {
      await authApi.checkSession()
      setStatus('authenticated')
    } catch {
      setStatus('anonymous')
    }
  }, [])

  const login = useCallback(async (form: authApi.LoginForm) => {
    await authApi.login(form)
    await refresh(true)
  }, [refresh])

  const logout = useCallback(async () => {
    await authApi.logout()
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh(true)
    })
  }, [refresh])

  const value = useMemo<AuthContextValue>(() => {
    return {
      status,
      isAuthenticated: status === 'authenticated',
      refresh,
      login,
      logout,
    }
  }, [status, refresh, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
