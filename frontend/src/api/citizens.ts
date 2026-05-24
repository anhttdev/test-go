import { requestApi } from '../lib/api'
import type { Citizen, CitizenForm, CitizenListQuery } from '../lib/domain'

export async function listCitizens(query: CitizenListQuery) {
  const params = new URLSearchParams()

  if (query.name.trim()) params.set('name', query.name.trim())
  if (query.maso.trim()) params.set('maso', query.maso.trim())
  params.set('page', query.page || '1')
  params.set('size', query.size || '10')
  params.set('sort', query.sort)

  return requestApi<Citizen[]>(`/api/v2/users/?${params.toString()}`)
}

export async function getCitizenById(id: number) {
  return requestApi<Citizen>(`/api/v1/user/${id}`)
}

export async function createCitizen(form: CitizenForm) {
  return requestApi<Record<string, unknown>>('/api/v1/user/', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function updateCitizen(id: number, form: CitizenForm) {
  return requestApi<Citizen>(`/api/v1/user/${id}`, {
    method: 'PUT',
    body: JSON.stringify(form),
  })
}

export async function deleteCitizen(id: number) {
  return requestApi<Record<string, unknown>>(`/api/v1/user/${id}`, {
    method: 'DELETE',
  })
}

