import { requestApi } from '../lib/api'
import type { Citizen, CitizenForm, CitizenListQuery } from '../lib/domain'

export type CitizenPaging = {
  page?: number
  size?: number
  total?: number
  total_pages?: number
  totalPages?: number
  has_more?: boolean
  hasMore?: boolean
  next_cursor?: number
  nextCursor?: number
}

export type PagedResult<T> = {
  items: T[]
  paging: CitizenPaging | null
  raw: unknown
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function pickPaging(source: unknown): CitizenPaging | null {
  if (!source || typeof source !== 'object') return null
  const r = source as Record<string, unknown>
  const pagingLike = (r.paging ?? r.pagination ?? r.meta ?? r.pageInfo) as unknown
  const candidate = (pagingLike && typeof pagingLike === 'object' ? (pagingLike as Record<string, unknown>) : r) as Record<string, unknown>

  const page = asNumber(candidate.page)
  const size = asNumber(candidate.size ?? candidate.limit)
  const total = asNumber(candidate.total)
  const total_pages = asNumber(candidate.total_pages ?? candidate.totalPages)
  const has_more = typeof candidate.has_more === 'boolean' ? candidate.has_more : undefined
  const hasMore = typeof candidate.hasMore === 'boolean' ? candidate.hasMore : undefined
  const next_cursor = asNumber(candidate.next_cursor ?? candidate.nextCursor)

  const hasAny =
    page !== undefined ||
    size !== undefined ||
    total !== undefined ||
    total_pages !== undefined ||
    has_more !== undefined ||
    hasMore !== undefined ||
    next_cursor !== undefined
  if (!hasAny) return null

  return {
    page,
    size,
    total,
    total_pages,
    has_more,
    hasMore,
    next_cursor,
  }
}

function pickItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== 'object') return []

  const r = payload as Record<string, unknown>

  if (Array.isArray(r.data)) return r.data as T[]
  if (Array.isArray(r.details)) return r.details as T[]
  if (r.details && typeof r.details === 'object') {
    const d = r.details as Record<string, unknown>
    if (Array.isArray(d.data)) return d.data as T[]
    if (Array.isArray(d.items)) return d.items as T[]
  }
  if (Array.isArray(r.items)) return r.items as T[]

  return []
}

export async function listCitizensPaged(query: CitizenListQuery): Promise<PagedResult<Citizen>> {
  const params = new URLSearchParams()

  if (query.name.trim()) params.set('name', query.name.trim())
  if (query.maso.trim()) params.set('maso', query.maso.trim())
  params.set('page', query.page || '1')
  params.set('size', query.size || '10')
  params.set('sort', query.sort)

  const raw = await requestApi<unknown>(`/api/v1/users?${params.toString()}`)
  const items = pickItems<Citizen>(raw)
  const paging = pickPaging(raw)
  return { items, paging, raw }
}

export async function listCitizens(query: CitizenListQuery) {
  const result = await listCitizensPaged(query)
  return result.items
}

export async function getCitizenById(id: number) {
  return requestApi<Citizen>(`/api/v1/users/${id}`)
}

export async function createCitizen(form: CitizenForm) {
  return requestApi<Record<string, unknown>>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({
      ma_so: form.ma_so,
      ho_ten: form.ho_ten,
      so_cccd: form.so_cccd,
      so_dien_thoai: form.so_dien_thoai,
      email: form.gmail,
    }),
  })
}

export async function updateCitizen(id: number, form: CitizenForm) {
  return requestApi<Citizen>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(form),
  })
}

export async function deleteCitizen(id: number) {
  return requestApi<Record<string, unknown>>(`/api/v1/users/${id}`, {
    method: 'DELETE',
  })
}
