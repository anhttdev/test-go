import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPermission } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

const DEFAULT_FORM = { permission_code: '', permission_name: '' }

export function AdminPermissionCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const canCreate = auth.hasPermission('permission:create')

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const canSubmit = useMemo(() => form.permission_code.trim() && form.permission_name.trim(), [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    if (!form.permission_code.trim() || !form.permission_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập đủ mã quyền và tên quyền.' })
      return
    }

    setIsSaving(true)
    try {
      await createPermission(form)
      toast.push({ type: 'success', title: 'Quyền hạn', message: 'Đã tạo quyền mới.' })
      navigate('/app/admin/permissions', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tạo thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo quyền.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!canCreate) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Tạo quyền mới</div>
          <div className="page-subtitle">Mã quyền dạng module:hành_động (vd: nguoi_dan:view).</div>
        </div>
        <div className="page-actions">
          <Link to="/app/admin/permissions" className="btn btn-default btn-md">
            Quay lại
          </Link>
        </div>
      </div>

      <Card className="section-card">
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

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={!canSubmit}>
              Tạo quyền
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

