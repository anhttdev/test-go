import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteRole, listRoles } from '../api/admin'
import type { Role } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function AdminRolesListPage() {
  const auth = useAuth()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])

  const canView = auth.hasPermission('role:view')
  const canCreate = auth.hasPermission('role:create')
  const canUpdate = auth.hasPermission('role:update')
  const canDelete = auth.hasPermission('role:delete')
  const canAssign = auth.hasAnyPermission(['role:assign_permission', 'role:remove_permission'])

  async function load() {
    setIsLoading(true)
    try {
      const payload = await listRoles()
      setRoles(payload)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải vai trò thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải vai trò.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(role: Role) {
    const ok = window.confirm(`Xóa vai trò "${role.role_code}"?`)
    if (!ok) return

    try {
      await deleteRole(role.id)
      toast.push({ type: 'success', title: 'Vai trò', message: 'Đã xóa vai trò.' })
      await load()
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Xóa thất bại',
        message: error instanceof Error ? error.message : 'Không thể xóa vai trò.',
      })
    }
  }

  if (!canView) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Vai trò</div>
          <div className="page-subtitle">Quản trị role và gán túi quyền (permissions).</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin" className="btn btn-default btn-md">
            Quay lại
          </Link>
          <Button variant="default" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
          {canCreate ? (
            <Link to="/app/admin/roles/new" className="btn btn-primary btn-md">
              Tạo vai trò
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="section-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role code</th>
                <th>Tên vai trò</th>
                <th>Mô tả</th>
                <th>Số quyền</th>
                <th className="table-actions-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roles.length ? (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td className="mono">{role.id}</td>
                    <td className="mono">{role.role_code}</td>
                    <td>{role.role_name}</td>
                    <td className="muted">{role.description ?? '-'}</td>
                    <td className="mono">{role.permissions?.length ?? 0}</td>
                    <td className="table-actions">
                      {canAssign ? (
                        <Link to={`/app/admin/roles/${role.id}/permissions`} className="btn btn-default btn-sm">
                          Gán quyền
                        </Link>
                      ) : null}
                      {canUpdate ? (
                        <Link to={`/app/admin/roles/${role.id}/edit`} className="btn btn-primary btn-sm">
                          Sửa
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <Button variant="danger" size="sm" onClick={() => void handleDelete(role)}>
                          Xóa
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="table-empty">
                    {isLoading ? 'Đang tải…' : 'Chưa có dữ liệu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

