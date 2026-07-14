import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deletePermission, listPermissions } from '../api/admin'
import type { Permission } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function AdminPermissionsListPage() {
  const auth = useAuth()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<Permission[]>([])

  const canView = auth.hasPermission('permission:view')
  const canCreate = auth.hasPermission('permission:create')
  const canUpdate = auth.hasPermission('permission:update')
  const canDelete = auth.hasPermission('permission:delete')

  async function load() {
    setIsLoading(true)
    try {
      const payload = await listPermissions()
      setItems(payload)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải danh mục quyền thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải danh mục quyền.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(item: Permission) {
    const ok = window.confirm(`Xóa quyền "${item.permission_code}"?`)
    if (!ok) return

    try {
      await deletePermission(item.id)
      toast.push({ type: 'success', title: 'Quyền hạn', message: 'Đã xóa quyền.' })
      await load()
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Xóa thất bại',
        message: error instanceof Error ? error.message : 'Không thể xóa quyền.',
      })
    }
  }

  if (!canView) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Danh mục quyền</div>
          <div className="page-subtitle">Quản trị permission_code và mô tả hiển thị.</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin" className="btn btn-default btn-md">
            Quay lại
          </Link>
          <Button variant="default" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
          {canCreate ? (
            <Link to="/app/admin/permissions/new" className="btn btn-primary btn-md">
              Tạo quyền
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
                <th>Mã quyền</th>
                <th>Tên quyền</th>
                <th className="table-actions-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.id}</td>
                    <td className="mono">{item.permission_code}</td>
                    <td>{item.permission_name}</td>
                    <td className="table-actions">
                      {canUpdate ? (
                        <Link to={`/app/admin/permissions/${item.id}/edit`} className="btn btn-primary btn-sm">
                          Sửa
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <Button variant="danger" size="sm" onClick={() => void handleDelete(item)}>
                          Xóa
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
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

