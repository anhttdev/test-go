import { requestApi } from '../lib/api'

export type CreateAccountForm = {
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  gmail: string
  username: string
  password: string
}

export async function createInternalAccount(form: CreateAccountForm) {
  return requestApi<Record<string, unknown>>('/api/v1/account', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

