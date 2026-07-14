import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCitizen } from '../api/citizens'
import { useAuth } from '../features/auth/auth-context'
import type { CitizenForm } from '../lib/domain'
import { DEFAULT_CITIZEN_FORM } from '../lib/domain'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

function validate(form: CitizenForm) {
  const errors: Partial<Record<keyof CitizenForm, string>> = {}

  if (!form.ma_so.trim()) errors.ma_so = 'Bắt buộc'
  if (!form.ho_ten.trim()) errors.ho_ten = 'Bắt buộc'
  if (!form.so_cccd.trim()) errors.so_cccd = 'Bắt buộc'
  if (!/^\d{9,12}$/.test(form.so_cccd.trim())) errors.so_cccd = 'CCCD cần 9–12 chữ số'
  if (!form.so_dien_thoai.trim()) errors.so_dien_thoai = 'Bắt buộc'
  if (!/^\d{9,11}$/.test(form.so_dien_thoai.trim())) errors.so_dien_thoai = 'SĐT cần 9–11 chữ số'
  if (form.gmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gmail.trim()))
    errors.gmail = 'Email không hợp lệ'

  return errors
}

export function CitizenCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const canCreate = auth.hasPermission('nguoi_dan:create')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<CitizenForm>(DEFAULT_CITIZEN_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CitizenForm, string>>>({})

  const canSubmit = useMemo(() => {
    if (!form.ma_so.trim()) return false
    if (!form.ho_ten.trim()) return false
    if (!/^\d{9,12}$/.test(form.so_cccd.trim())) return false
    if (!/^\d{9,11}$/.test(form.so_dien_thoai.trim())) return false
    return true
  }, [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.push({ type: 'error', title: 'Dữ liệu chưa hợp lệ', message: 'Vui lòng kiểm tra các trường bắt buộc.' })
      return
    }

    setIsSaving(true)
    try {
      await createCitizen(form)
      toast.push({ type: 'success', title: 'Tạo hồ sơ', message: 'Đã tạo hồ sơ công dân.' })
      navigate('/app/citizens', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tạo hồ sơ thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo hồ sơ.',
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
          <div className="page-title">Tạo hồ sơ công dân</div>
          <div className="page-subtitle">Tạo mới hồ sơ theo biểu mẫu chuẩn.</div>
        </div>
        <div className="page-actions">
          <Link to="/app/citizens" className="btn btn-default btn-md">
            Quay lại
          </Link>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Thông tin định danh</div>
            <div className="section-subtitle">Các trường bắt buộc để tra cứu và liên hệ.</div>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Mã số" error={errors.ma_so}>
              <TextInput
                value={form.ma_so}
                onChange={(e) => setForm((c) => ({ ...c, ma_so: e.target.value }))}
                placeholder="VD: ND001"
              />
            </Field>
            <Field label="Họ tên" error={errors.ho_ten}>
              <TextInput
                value={form.ho_ten}
                onChange={(e) => setForm((c) => ({ ...c, ho_ten: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </Field>
            <Field label="Số CCCD" hint="9–12 chữ số" error={errors.so_cccd}>
              <TextInput
                value={form.so_cccd}
                onChange={(e) => setForm((c) => ({ ...c, so_cccd: e.target.value }))}
                placeholder="012345678901"
              />
            </Field>
            <Field label="Số điện thoại" hint="9–11 chữ số" error={errors.so_dien_thoai}>
              <TextInput
                value={form.so_dien_thoai}
                onChange={(e) => setForm((c) => ({ ...c, so_dien_thoai: e.target.value }))}
                placeholder="0901234567"
              />
            </Field>
            <Field label="Email" hint="Tuỳ chọn" error={errors.gmail}>
              <TextInput
                type="email"
                value={form.gmail}
                onChange={(e) => setForm((c) => ({ ...c, gmail: e.target.value }))}
                placeholder="abc@domain.gov.vn"
              />
            </Field>
          </div>

          <div className="form-actions">
            <Button variant="primary" type="submit" loading={isSaving} disabled={!canSubmit}>
              Tạo hồ sơ
            </Button>
            <Button type="button" variant="default" disabled={isSaving} onClick={() => setForm(DEFAULT_CITIZEN_FORM)}>
              Làm mới
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

