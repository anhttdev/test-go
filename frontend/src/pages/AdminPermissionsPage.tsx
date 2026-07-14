import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPermission, deletePermission, listPermissions, updatePermission } from '../api/admin'
import type { Permission } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

const DEFAULT_FORM = { permission_code: '', permission_name: '' }

export function AdminPermissionsPage() {
  const auth = useAuth()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<Permission[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Permission | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const canView = auth.hasAnyPermission(['permission:view'])
  const canCreate = auth.hasAnyPermission(['permission:create'])
  const canUpdate = auth.hasAnyPermission(['permission:update'])
  const canDelete = auth.hasAnyPermission(['permission:delete'])

  const modalTitle = useMemo(() => (editing ? 'Cập nhật quyền' : 'Tạo quyền mới'), [editing])

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

  function openCreate() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setIsModalOpen(true)
  }

  function openEdit(item: Permission) {
    setEditing(item)
    setForm({ permission_code: item.permission_code, permission_name: item.permission_name })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.permission_code.trim() || !form.permission_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập đủ mã quyền và tên quyền.' })
      return
    }

    setIsSaving(true)
    try {
      if (editing) {
        await updatePermission(editing.id, form)
        toast.push({ type: 'success', title: 'Quyền hạn', message: 'Đã cập nhật quyền.' })
      } else {
        await createPermission(form)
        toast.push({ type: 'success', title: 'Quyền hạn', message: 'Đã tạo quyền mới.' })
      }
      setIsModalOpen(false)
      await load()
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Lưu thất bại',
        message: error instanceof Error ? error.message : 'Không thể lưu thay đổi.',
      })
    } finally {
      setIsSaving(false)
    }
  }

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

  if (!canView) {
    return (
      <div className="page">
        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Danh mục quyền</div>
              <div className="section-subtitle">Bạn không có quyền permission:view.</div>
            </div>
          </div>
          <Link to="/app/admin" className="link">
            Quay lại phân quyền
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Danh mục quyền</div>
          <div className="page-subtitle">Quản trị permission_code và mô tả hiển thị.</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin" className="btn btn-ghost btn-md">
            Quay lại
          </Link>
          <Button variant="default" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
          {canCreate ? (
            <Button variant="primary" onClick={openCreate} disabled={isLoading}>
              Tạo quyền
            </Button>
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
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          Sửa
                        </Button>
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

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{modalTitle}</div>
                <div className="modal-subtitle">Mã quyền dạng module:hành_động (vd: nguoi_dan:view).</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <Field label="Mã quyền">
                <TextInput
                  value={form.permission_code}
                  onChange={(e) => setForm((c) => ({ ...c, permission_code: e.target.value }))}
                  placeholder="vd: nguoi_dan:view"
                />
              </Field>
              <Field label="Tên quyền">
                <TextInput
                  value={form.permission_name}
                  onChange={(e) => setForm((c) => ({ ...c, permission_name: e.target.value }))}
                  placeholder="Xem danh sách người dân"
                />
              </Field>

              <div className="modal-actions">
                <Button type="submit" variant="primary" loading={isSaving}>
                  Lưu
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

