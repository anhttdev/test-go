import { requestApi } from '../lib/api'

export type Permission = {
  id: number
  permission_code: string
  permission_name: string
}

export type Role = {
  id: number
  role_code: string
  role_name: string
  description?: string
  permissions?: Permission[]
}

function unwrapDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const r = payload as Record<string, unknown>
    if (Array.isArray(r.data)) return r.data as T[]
    if (Array.isArray(r.details)) return r.details as T[]
    if (r.details && typeof r.details === 'object') {
      const d = r.details as Record<string, unknown>
      if (Array.isArray(d.data)) return d.data as T[]
      if (Array.isArray(d.items)) return d.items as T[]
    }
    if (Array.isArray(r.items)) return r.items as T[]
  }
  return []
}

export async function listPermissions() {
  const raw = await requestApi<unknown>('/api/v1/admin/permissions')
  return unwrapDataArray<Permission>(raw)
}

export async function createPermission(input: { permission_code: string; permission_name: string }) {
  return requestApi<Record<string, unknown>>('/api/v1/admin/permissions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updatePermission(id: number, input: { permission_code: string; permission_name: string }) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deletePermission(id: number) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/permissions/${id}`, {
    method: 'DELETE',
  })
}

export async function listRoles() {
  const raw = await requestApi<unknown>('/api/v1/admin/roles')
  return unwrapDataArray<Role>(raw)
}

export async function createRole(input: { role_code: string; role_name: string; description?: string }) {
  return requestApi<Record<string, unknown>>('/api/v1/admin/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateRole(
  id: number,
  input: { role_code: string; role_name: string; description?: string },
) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteRole(id: number) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/roles/${id}`, {
    method: 'DELETE',
  })
}

export async function assignPermissionsToRole(roleId: number, permissionIds: number[]) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/roles/${roleId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permission_ids: permissionIds }),
  })
}

export async function removePermissionsFromRole(roleId: number, permissionIds: number[]) {
  return requestApi<Record<string, unknown>>(`/api/v1/admin/roles/${roleId}/permissions`, {
    method: 'DELETE',
    body: JSON.stringify({ permission_ids: permissionIds }),
  })
}

export async function assignRolesToAccount(input: { account_id: number; roles: number[] }) {
  return requestApi<Record<string, unknown>>('/api/v1/admin/account/assignroles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteRolesFromAccount(input: { account_id: number; roles: number[] }) {
  return requestApi<Record<string, unknown>>('/api/v1/admin/account/deleteroles', {
    method: 'DELETE',
    body: JSON.stringify(input),
  })
}
