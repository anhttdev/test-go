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

export async function login(form: LoginForm) {
  return requestApi<Record<string, unknown>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function logout() {
  return requestApi<Record<string, unknown>>('/api/v1/auth/logout', {
    method: 'POST',
  })
}

export async function checkSession() {
  return requestApi<unknown>('/api/v1/users/profile?page=1&size=5')
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
