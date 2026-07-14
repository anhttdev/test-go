import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listRoles, updateRole } from '../api/admin'
import type { Role } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function AdminRoleEditPage() {
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

  const canUpdate = auth.hasPermission('role:update')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ role_code: '', role_name: '', description: '' })

  useEffect(() => {
    if (!roleId) return
    setIsLoading(true)
    void listRoles()
      .then((payload) => {
        const found = payload.find((x) => x.id === roleId) ?? null
        setRole(found)
        setForm({
          role_code: found?.role_code ?? '',
          role_name: found?.role_name ?? '',
          description: found?.description ?? '',
        })
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải vai trò thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải vai trò.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [roleId])

  const canSubmit = useMemo(() => form.role_code.trim() && form.role_name.trim(), [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!roleId) return
    if (!canUpdate) return

    if (!form.role_code.trim() || !form.role_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập role_code và role_name.' })
      return
    }

    setIsSaving(true)
    try {
      await updateRole(roleId, form)
      toast.push({ type: 'success', title: 'Vai trò', message: 'Đã cập nhật vai trò.' })
      navigate('/app/admin/roles', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: error instanceof Error ? error.message : 'Không thể cập nhật vai trò.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!canUpdate) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Cập nhật vai trò</div>
          <div className="page-subtitle">{role ? role.role_code : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin/roles" className="btn btn-default btn-md">
            Quay lại
          </Link>
        </div>
      </div>

      <Card className="section-card">
        <form className="form" onSubmit={handleSubmit}>
          <Field label="Role code">
            <TextInput
              value={form.role_code}
              onChange={(e) => setForm((c) => ({ ...c, role_code: e.target.value }))}
              placeholder="VD: CAN_BO_HO_KHAU"
              disabled={isLoading}
            />
          </Field>
          <Field label="Tên vai trò">
            <TextInput
              value={form.role_name}
              onChange={(e) => setForm((c) => ({ ...c, role_name: e.target.value }))}
              placeholder="Cán bộ hộ khẩu"
              disabled={isLoading}
            />
          </Field>
          <Field label="Mô tả">
            <TextInput
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Tuỳ chọn"
              disabled={isLoading}
            />
          </Field>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={!canSubmit || isLoading}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

