export type Citizen = {
  id?: number
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  gmail?: string
  email?: string
  ho_khau_id?: number | null
  account_id?: number | null
  accountId?: number | null
  account?: {
    id?: number
    username?: string
    is_active?: boolean
    roles?: { id: number; role_code?: string; role_name?: string }[]
    Roles?: { id: number; role_code?: string; role_name?: string }[]
  } | null
  created_at?: string
  updated_at?: string
}

export type CitizenForm = {
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  gmail: string
}

export type CitizenListQuery = {
  name: string
  maso: string
  page: string
  size: string
  sort: 'asc' | 'desc'
}

export const DEFAULT_CITIZEN_FORM: CitizenForm = {
  ma_so: '',
  ho_ten: '',
  so_cccd: '',
  so_dien_thoai: '',
  gmail: '',
}

export const DEFAULT_CITIZEN_LIST_QUERY: CitizenListQuery = {
  name: '',
  maso: '',
  page: '1',
  size: '10',
  sort: 'asc',
}

export function getCitizenEmail(citizen: Citizen | null) {
  if (!citizen) return '-'
  return citizen.gmail ?? citizen.email ?? '-'
}

export function mapCitizenToForm(citizen: Citizen): CitizenForm {
  return {
    ma_so: citizen.ma_so ?? '',
    ho_ten: citizen.ho_ten ?? '',
    so_cccd: citizen.so_cccd ?? '',
    so_dien_thoai: citizen.so_dien_thoai ?? '',
    gmail: citizen.gmail ?? citizen.email ?? '',
  }
}
