import { requestApi } from '../lib/api'

export type DiaChi = {
  so_nha: string
  ten_duong: string
  phuong_xa: string
  quan_huyen: string
  thanh_pho: string
}

export type HoKhauMember = {
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  email?: string
}

export type HoKhau = {
  id: number
  ma_ho_khau: string
  dia_chi: DiaChi
  thanh_viens?: HoKhauMember[]
  created_at?: string
  updated_at?: string
}

export type HoKhauListResponse = {
  message?: string
  data: HoKhau[]
}

export type HoKhauDetailResponse = {
  message?: string
  data: HoKhau
}

export async function listHoKhau() {
  return requestApi<HoKhauListResponse>('/api/v1/hokhau/')
}

export async function getHoKhauById(id: number) {
  return requestApi<HoKhauDetailResponse>(`/api/v1/hokhau/${id}`)
}

export async function createHoKhau(input: { ma_ho_khau: string; dia_chi: DiaChi; user_ids: number[] }) {
  return requestApi<HoKhau>('/api/v1/hokhau/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function transferHoKhauMembers(input: { tu_ho_khau_id: number; den_ho_khau_id: number; user_ids: number[] }) {
  return requestApi<Record<string, unknown>>('/api/v1/hokhau/transfer', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteHoKhau(id: number) {
  return requestApi<Record<string, unknown>>(`/api/v1/hokhau/${id}`, {
    method: 'DELETE',
  })
}

