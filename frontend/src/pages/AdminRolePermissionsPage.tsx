import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assignPermissionsToRole, listPermissions, listRoles } from '../api/admin'
import type { Permission, Role } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function AdminRolePermissionsPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams()

  const roleId = useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }, [params.id])

  const canAssign = auth.hasAnyPermission(['role:assign_permission', 'role:remove_permission'])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!roleId) return
    setIsLoading(true)
    void Promise.all([listRoles(), listPermissions()])
      .then(([roles, perms]) => {
        const found = roles.find((x) => x.id === roleId) ?? null
        setRole(found)
        setPermissions(perms)
        setSelected(new Set((found?.permissions ?? []).map((p) => p.id)))
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải dữ liệu thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [roleId])

  async function handleSave() {
    if (!roleId) return
    if (!canAssign) return

    setIsSaving(true)
    try {
      await assignPermissionsToRole(roleId, Array.from(selected))
      toast.push({ type: 'success', title: 'Phân quyền', message: 'Đã đồng bộ túi quyền cho vai trò.' })
      navigate('/app/admin/roles', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đồng bộ thất bại',
        message: error instanceof Error ? error.message : 'Không thể gán quyền cho vai trò.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!canAssign) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Gán quyền cho vai trò</div>
          <div className="page-subtitle">{role ? `${role.role_name} (${role.role_code})` : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin/roles" className="btn btn-default btn-md">
            Quay lại
          </Link>
          <Button variant="primary" onClick={() => void handleSave()} loading={isSaving} disabled={isLoading}>
            Đồng bộ
          </Button>
        </div>
      </div>

      <Card className="section-card">
        <div className="table-wrap" style={{ maxHeight: 520 }}>
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>ID</th>
                <th>Mã quyền</th>
                <th>Tên quyền</th>
              </tr>
            </thead>
            <tbody>
              {permissions.length ? (
                permissions.map((p) => {
                  const checked = selected.has(p.id)
                  return (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelected((current) => {
                              const next = new Set(current)
                              if (e.target.checked) next.add(p.id)
                              else next.delete(p.id)
                              return next
                            })
                          }}
                        />
                      </td>
                      <td className="mono">{p.id}</td>
                      <td className="mono">{p.permission_code}</td>
                      <td>{p.permission_name}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="table-empty">
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

