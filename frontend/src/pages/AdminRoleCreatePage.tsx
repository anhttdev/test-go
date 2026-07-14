import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRole } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

const DEFAULT_FORM = { role_code: '', role_name: '', description: '' }

export function AdminRoleCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const canCreate = auth.hasPermission('role:create')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const canSubmit = useMemo(() => form.role_code.trim() && form.role_name.trim(), [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    if (!form.role_code.trim() || !form.role_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập role_code và role_name.' })
      return
    }

    setIsSaving(true)
    try {
      await createRole(form)
      toast.push({ type: 'success', title: 'Vai trò', message: 'Đã tạo vai trò.' })
      navigate('/app/admin/roles', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tạo thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo vai trò.',
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
          <div className="page-title">Tạo vai trò</div>
          <div className="page-subtitle">Role code nên viết hoa hoặc dạng SNAKE_CASE.</div>
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
            />
          </Field>
          <Field label="Tên vai trò">
            <TextInput
              value={form.role_name}
              onChange={(e) => setForm((c) => ({ ...c, role_name: e.target.value }))}
              placeholder="Cán bộ hộ khẩu"
            />
          </Field>
          <Field label="Mô tả">
            <TextInput
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Tuỳ chọn"
            />
          </Field>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={!canSubmit}>
              Tạo vai trò
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

