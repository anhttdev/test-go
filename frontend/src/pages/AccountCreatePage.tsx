import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createInternalAccount } from '../api/accounts'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

type FormState = {
  ma_so: string
  ho_ten: string
  so_cccd: string
  so_dien_thoai: string
  gmail: string
  username: string
  password: string
  confirmPassword: string
}

const DEFAULT_FORM: FormState = {
  ma_so: '',
  ho_ten: '',
  so_cccd: '',
  so_dien_thoai: '',
  gmail: '',
  username: '',
  password: '',
  confirmPassword: '',
}

export function AccountCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const canCreate = auth.hasPermission('account:create')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const canSubmit = useMemo(() => {
    if (!form.ma_so.trim()) return false
    if (!form.ho_ten.trim()) return false
    if (!/^\d{12}$/.test(form.so_cccd.trim())) return false
    if (!form.username.trim() || form.username.trim().length < 4) return false
    if (form.password.length < 6) return false
    if (form.password !== form.confirmPassword) return false
    return true
  }, [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    if (!canSubmit) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng kiểm tra các trường bắt buộc.' })
      return
    }

    setIsSaving(true)
    try {
      await createInternalAccount({
        ma_so: form.ma_so,
        ho_ten: form.ho_ten,
        so_cccd: form.so_cccd,
        so_dien_thoai: form.so_dien_thoai,
        gmail: form.gmail,
        username: form.username,
        password: form.password,
      })
      toast.push({ type: 'success', title: 'Tạo tài khoản', message: 'Đã tạo tài khoản cán bộ.' })
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tạo tài khoản thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo tài khoản.',
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
          <div className="page-title">Tạo tài khoản cán bộ</div>
          <div className="page-subtitle">API: POST /api/v1/account</div>
        </div>
        <div className="page-actions">
          <Link to="/app/dashboard" className="btn btn-default btn-md">
            Quay lại
          </Link>
        </div>
      </div>

      <Card className="section-card">
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Mã số" hint="Bắt buộc">
              <TextInput value={form.ma_so} onChange={(e) => setForm((c) => ({ ...c, ma_so: e.target.value }))} />
            </Field>
            <Field label="Họ tên" hint="Bắt buộc">
              <TextInput value={form.ho_ten} onChange={(e) => setForm((c) => ({ ...c, ho_ten: e.target.value }))} />
            </Field>
            <Field label="Số CCCD" hint="12 chữ số">
              <TextInput value={form.so_cccd} onChange={(e) => setForm((c) => ({ ...c, so_cccd: e.target.value }))} />
            </Field>
            <Field label="Số điện thoại" hint="Tuỳ chọn">
              <TextInput
                value={form.so_dien_thoai}
                onChange={(e) => setForm((c) => ({ ...c, so_dien_thoai: e.target.value }))}
              />
            </Field>
            <Field label="Gmail" hint="Tuỳ chọn">
              <TextInput
                type="email"
                value={form.gmail}
                onChange={(e) => setForm((c) => ({ ...c, gmail: e.target.value }))}
                placeholder="abc@gmail.com"
              />
            </Field>
            <div />
            <Field label="Tên đăng nhập" hint="Tối thiểu 4 ký tự">
              <TextInput
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
              />
            </Field>
            <div />
            <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              />
            </Field>
            <Field label="Nhập lại mật khẩu">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm((c) => ({ ...c, confirmPassword: e.target.value }))}
              />
            </Field>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={!canSubmit}>
              Tạo tài khoản
            </Button>
            <Button type="button" variant="default" disabled={isSaving} onClick={() => setForm(DEFAULT_FORM)}>
              Làm mới
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

