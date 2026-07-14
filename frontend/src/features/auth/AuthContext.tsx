import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../../api/auth'
import { AuthContext } from './auth-context'
import type { AuthContextValue, AuthStatus } from './auth-context'
import { ApiRequestError } from '../../lib/api'

function normalizePermissionCode(value?: string) {
  return (value ?? '').trim()
}

const ROLE_FALLBACK_PERMISSIONS: Record<string, string[]> = {
  CAN_BO_TIEP_NHAN: ['nguoi_dan:create', 'nguoi_dan:view', 'ho_khau:create', 'ho_khau:view'],
  CAN_BO_HO_KHAU: [
    'nguoi_dan:view',
    'nguoi_dan:view_detail',
    'nguoi_dan:create',
    'nguoi_dan:update',
    'ho_khau:view',
    'ho_khau:view_detail',
    'ho_khau:create',
    'ho_khau:update',
    'ho_khau:add_member',
    'ho_khau:remove_member',
    'ho_khau:change_owner',
  ],
  CAN_BO_CONG_TAC: ['lich_su_cong_tac:view', 'lich_su_cong_tac:create', 'lich_su_cong_tac:update', 'lich_su_cong_tac:delete'],
  TRUONG_PHONG: [
    'nguoi_dan:view',
    'nguoi_dan:view_detail',
    'nguoi_dan:export',
    'ho_khau:view',
    'ho_khau:view_detail',
    'ho_khau:export',
    'lich_su_cong_tac:view',
    'lich_su_cong_tac:approve',
    'lich_su_cong_tac:export',
  ],
  AUDITOR: ['nguoi_dan:view', 'nguoi_dan:view_detail', 'ho_khau:view', 'ho_khau:view_detail', 'lich_su_cong_tac:view'],
}

function extractPermissionsFromProfile(profile: authApi.AccountProfile | null) {
  const result = new Set<string>()

  if (!profile) return result

  const roleCodes = (profile.roles ?? [])
    .map((role) => normalizePermissionCode(role.role_code) || normalizePermissionCode(role.roleCode))
    .filter(Boolean)

  if (roleCodes.includes('SUPER_ADMIN')) {
    result.add('*')
  }

  for (const roleCode of roleCodes) {
    for (const perm of ROLE_FALLBACK_PERMISSIONS[roleCode] ?? []) {
      const normalized = normalizePermissionCode(perm)
      if (normalized) result.add(normalized)
    }
  }

  for (const code of profile.permissions ?? []) {
    const normalized = normalizePermissionCode(code)
    if (normalized) result.add(normalized)
  }

  for (const role of profile.roles ?? []) {
    for (const permission of role.permissions ?? []) {
      const normalized =
        normalizePermissionCode(permission.permission_code) || normalizePermissionCode(permission.permissionCode)
      if (normalized) result.add(normalized)
    }
  }

  return result
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [profile, setProfile] = useState<authApi.AccountProfile | null>(null)
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set())

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setStatus('checking')

    try {
      const payload = await authApi.checkSession()
      let nextProfile = payload.data ?? null

      if (nextProfile) {
        try {
          const rolesPayload = await authApi.getMyRoles()
          const roles = rolesPayload.data ?? []
          if (roles.length > 0) {
            nextProfile = { ...nextProfile, roles }
          }
        } catch {
        }
      }

      const fromProfile = extractPermissionsFromProfile(nextProfile)

      let nextPermissions = fromProfile

      try {
        const permsPayload = await authApi.getMyPermissions()
        const codes = permsPayload.data ?? []
        const fromEndpoint = new Set(codes.map((code) => normalizePermissionCode(code)).filter(Boolean))
        if (fromEndpoint.size > 0) {
          nextPermissions = fromEndpoint
        }
      } catch {
      }

      setProfile(nextProfile)
      setPermissions(nextPermissions)
      setStatus('authenticated')
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setProfile(null)
        setPermissions(new Set())
        setStatus('anonymous')
        return
      }

      setProfile(null)
      setPermissions(new Set())
      setStatus('authenticated')
    }
  }, [])

  const login = useCallback(async (form: authApi.LoginForm) => {
    await authApi.login(form)
    setStatus('authenticated')
    await refresh(true)
  }, [refresh])

  const logout = useCallback(async () => {
    await authApi.logout()
    setProfile(null)
    setPermissions(new Set())
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh(true)
    })
  }, [refresh])

  const value = useMemo<AuthContextValue>(() => {
    const hasPermission = (permission: string) => {
      if (!permission.trim()) return false
      if (permissions.has('*')) return true
      return permissions.has(permission)
    }

    const hasAnyPermission = (list: string[]) => {
      if (permissions.has('*')) return true
      for (const item of list) {
        if (item.trim() && permissions.has(item)) return true
      }
      return false
    }

    return {
      status,
      isAuthenticated: status === 'authenticated',
      profile,
      permissions,
      hasPermission,
      hasAnyPermission,
      refresh,
      login,
      logout,
    }
  }, [status, profile, permissions, refresh, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
