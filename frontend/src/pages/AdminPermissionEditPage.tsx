import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listPermissions, updatePermission } from '../api/admin'
import type { Permission } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function AdminPermissionEditPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams()

  const permissionId = useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }, [params.id])

  const canUpdate = auth.hasPermission('permission:update')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [item, setItem] = useState<Permission | null>(null)
  const [form, setForm] = useState({ permission_code: '', permission_name: '' })

  useEffect(() => {
    if (!permissionId) return
    setIsLoading(true)
    void listPermissions()
      .then((payload) => {
        const found = payload.find((x) => x.id === permissionId) ?? null
        setItem(found)
        setForm({
          permission_code: found?.permission_code ?? '',
          permission_name: found?.permission_name ?? '',
        })
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải quyền thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải quyền.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [permissionId])

  const canSubmit = useMemo(() => form.permission_code.trim() && form.permission_name.trim(), [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!permissionId) return
    if (!canUpdate) return

    if (!form.permission_code.trim() || !form.permission_name.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập đủ mã quyền và tên quyền.' })
      return
    }

    setIsSaving(true)
    try {
      await updatePermission(permissionId, form)
      toast.push({ type: 'success', title: 'Quyền hạn', message: 'Đã cập nhật quyền.' })
      navigate('/app/admin/permissions', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: error instanceof Error ? error.message : 'Không thể cập nhật quyền.',
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
          <div className="page-title">Cập nhật quyền</div>
          <div className="page-subtitle">{item ? item.permission_code : isLoading ? 'Đang tải…' : '-'}</div>
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
              disabled={isLoading}
            />
          </Field>
          <Field label="Tên quyền">
            <TextInput
              value={form.permission_name}
              onChange={(e) => setForm((c) => ({ ...c, permission_name: e.target.value }))}
              placeholder="Xem danh sách người dân"
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

