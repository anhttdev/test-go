import { requestApi } from '../lib/api'

export type LoginForm = {
  username: string
  password: string
}

export type ForgotPasswordForm = {
  email: string
}

export type RegisterAccountForm = {
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  gmail: string
  username: string
  password: string
}

export type PermissionCode = string

export type Permission = {
  id?: number
  permission_code?: string
  permissionCode?: string
  permission_name?: string
  permissionName?: string
}

export type Role = {
  id?: number
  role_code?: string
  roleCode?: string
  role_name?: string
  roleName?: string
  permissions?: Permission[]
}

export type AccountProfile = {
  id?: number
  username?: string
  user?: {
    id?: number
    ma_so?: string
    ho_ten?: string
    so_cccd?: string
    so_dien_thoai?: string
    gmail?: string
  }
  roles?: Role[]
  permissions?: PermissionCode[]
}

export type ProfileResponse = {
  message?: string
  data?: AccountProfile
}

export async function login(form: LoginForm) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function refreshSession() {
  return requestApi<Record<string, unknown>>('/api/v1/auth/refresh', {
    method: 'POST',
  })
}

export async function logout() {
  return requestApi<Record<string, unknown>>('/api/v1/auth/logout', {
    method: 'POST',
  })
}

export async function checkSession() {
  return requestApi<ProfileResponse>('/api/v1/users/profile')
}

export async function forgotPassword(form: ForgotPasswordForm) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function verifyResetToken(token: string) {
  return requestApi<{ success: boolean; message: string; email?: string }>(
    '/api/v1/auth/verify-reset-token',
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
  )
}

export async function resetPassword(token: string, newPassword: string) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      new_password: newPassword,
    }),
  })
}

export async function changePassword(input: {
  old_password: string
  new_password: string
}) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function logoutAll() {
  return requestApi<Record<string, unknown>>('/api/v1/auth/logoutall', {
    method: 'POST',
  })
}

export async function registerAccount(form: RegisterAccountForm) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function getMyPermissions() {
  return requestApi<{ data?: PermissionCode[] }>('/api/v1/users/permissions')
}

export async function getMyRoles() {
  return requestApi<{ data?: Role[] }>('/api/v1/users/roles')
}
