import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  assignPermissionsToRole,
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole,
} from '../api/admin'
import type { Permission, Role } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

const DEFAULT_ROLE_FORM = { role_code: '', role_name: '', description: '' }

export function AdminRolesPage() {
  const auth = useAuth()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleForm, setRoleForm] = useState(DEFAULT_ROLE_FORM)
  const [isSavingRole, setIsSavingRole] = useState(false)

  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set())
  const [isSavingPerms, setIsSavingPerms] = useState(false)

  const canView = auth.hasAnyPermission(['role:view'])
  const canCreate = auth.hasAnyPermission(['role:create'])
  const canUpdate = auth.hasAnyPermission(['role:update'])
  const canDelete = auth.hasAnyPermission(['role:delete'])
  const canAssign = auth.hasAnyPermission(['role:assign_permission', 'role:remove_permission'])

  const roleModalTitle = useMemo(() => (editingRole ? 'Cập nhật vai trò' : 'Tạo vai trò mới'), [editingRole])

  async function load() {
    setIsLoading(true)
    try {
      const [rolesPayload, permsPayload] = await Promise.all([listRoles(), listPermissions()])
      setRoles(rolesPayload)
      setPermissions(permsPayload)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải dữ liệu thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải role/permission.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openCreateRole() {
    setEditingRole(null)
    setRoleForm(DEFAULT_ROLE_FORM)
    setIsRoleModalOpen(true)
  }

  function openEditRole(role: Role) {
    setEditingRole(role)
    setRoleForm({
      role_code: role.role_code,
      role_name: role.role_name,
      description: role.description ?? '',
    })
    setIsRoleModalOpen(true)
  }

  function openAssignPerms(role: Role) {
    setPermRole(role)
    setSelectedPermissionIds(new Set((role.permissions ?? []).map((p) => p.id)))
    setIsPermModalOpen(true)
  }

  async function handleSaveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!roleForm.role_code.trim() || !roleForm.role_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập role_code và role_name.' })
      return
    }

    setIsSavingRole(true)
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleForm)
        toast.push({ type: 'success', title: 'Vai trò', message: 'Đã cập nhật vai trò.' })
      } else {
        await createRole(roleForm)
        toast.push({ type: 'success', title: 'Vai trò', message: 'Đã tạo vai trò.' })
      }
      setIsRoleModalOpen(false)
      await load()
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Lưu thất bại',
        message: error instanceof Error ? error.message : 'Không thể lưu vai trò.',
      })
    } finally {
      setIsSavingRole(false)
    }
  }

  async function handleDeleteRole(role: Role) {
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

  async function handleSavePerms() {
    if (!permRole) return
    setIsSavingPerms(true)
    try {
      await assignPermissionsToRole(permRole.id, Array.from(selectedPermissionIds))
      toast.push({ type: 'success', title: 'Phân quyền', message: 'Đã đồng bộ túi quyền cho vai trò.' })
      setIsPermModalOpen(false)
      await load()
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đồng bộ thất bại',
        message: error instanceof Error ? error.message : 'Không thể gán quyền cho vai trò.',
      })
    } finally {
      setIsSavingPerms(false)
    }
  }

  if (!canView) {
    return (
      <div className="page">
        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Vai trò</div>
              <div className="section-subtitle">Bạn không có quyền role:view.</div>
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
          <div className="page-title">Vai trò</div>
          <div className="page-subtitle">Quản trị role và gán túi quyền (permissions).</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin" className="btn btn-ghost btn-md">
            Quay lại
          </Link>
          <Button variant="default" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
          {canCreate ? (
            <Button variant="primary" onClick={openCreateRole} disabled={isLoading}>
              Tạo vai trò
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
                        <Button variant="ghost" size="sm" onClick={() => openAssignPerms(role)}>
                          Gán quyền
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <Button variant="ghost" size="sm" onClick={() => openEditRole(role)}>
                          Sửa
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button variant="danger" size="sm" onClick={() => void handleDeleteRole(role)}>
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

      {isRoleModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsRoleModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{roleModalTitle}</div>
                <div className="modal-subtitle">Role code nên viết hoa hoặc dạng SNAKE_CASE.</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsRoleModalOpen(false)}>
                ✕
              </button>
            </div>

            <form className="form" onSubmit={handleSaveRole}>
              <Field label="Role code">
                <TextInput
                  value={roleForm.role_code}
                  onChange={(e) => setRoleForm((c) => ({ ...c, role_code: e.target.value }))}
                  placeholder="VD: CAN_BO_HO_KHAU"
                />
              </Field>
              <Field label="Tên vai trò">
                <TextInput
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm((c) => ({ ...c, role_name: e.target.value }))}
                  placeholder="Cán bộ hộ khẩu"
                />
              </Field>
              <Field label="Mô tả">
                <TextInput
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Tuỳ chọn"
                />
              </Field>

              <div className="modal-actions">
                <Button type="submit" variant="primary" loading={isSavingRole}>
                  Lưu
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsRoleModalOpen(false)} disabled={isSavingRole}>
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPermModalOpen && permRole ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsPermModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Gán quyền cho vai trò</div>
                <div className="modal-subtitle">
                  {permRole.role_name} ({permRole.role_code})
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsPermModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 360 }}>
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
                  {permissions.map((p) => {
                    const checked = selectedPermissionIds.has(p.id)
                    return (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedPermissionIds((current) => {
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
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="primary" loading={isSavingPerms} onClick={() => void handleSavePerms()}>
                Đồng bộ
              </Button>
              <Button type="button" variant="ghost" disabled={isSavingPerms} onClick={() => setIsPermModalOpen(false)}>
                Hủy
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

