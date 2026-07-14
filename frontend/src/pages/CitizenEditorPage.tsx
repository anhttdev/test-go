import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createCitizen, deleteCitizen, getCitizenById, updateCitizen } from '../api/citizens'
import { useAuth } from '../features/auth/auth-context'
import type { Citizen, CitizenForm } from '../lib/domain'
import { DEFAULT_CITIZEN_FORM, mapCitizenToForm } from '../lib/domain'
import { formatDateTime } from '../lib/format'
import { ForbiddenPage } from './ForbiddenPage'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

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

export function CitizenEditorPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams()

  const citizenId = useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }, [params.id])

  const mode = citizenId ? 'edit' : 'create'
  const canView = auth.hasPermission('nguoi_dan:view')
  const canCreate = auth.hasPermission('nguoi_dan:create')
  const canUpdate = auth.hasPermission('nguoi_dan:update')
  const canDelete = auth.hasPermission('nguoi_dan:delete')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [citizen, setCitizen] = useState<Citizen | null>(null)
  const [form, setForm] = useState<CitizenForm>(DEFAULT_CITIZEN_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CitizenForm, string>>>({})

  useEffect(() => {
    if (!citizenId) {
      queueMicrotask(() => {
        setCitizen(null)
        setForm(DEFAULT_CITIZEN_FORM)
        setErrors({})
      })
      return
    }

    setIsLoading(true)
    void getCitizenById(citizenId)
      .then((payload) => {
        setCitizen(payload)
        setForm(mapCitizenToForm(payload))
        setErrors({})
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải hồ sơ thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải hồ sơ.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [citizenId])

  if (mode === 'create' && !canCreate) {
    return <ForbiddenPage />
  }

  if (mode === 'edit' && !canView && !canUpdate) {
    return <ForbiddenPage />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode === 'create' && !canCreate) {
      toast.push({ type: 'error', title: 'Không đủ quyền', message: 'Bạn không có quyền tạo hồ sơ.' })
      return
    }

    if (mode === 'edit' && !canUpdate) {
      toast.push({ type: 'error', title: 'Không đủ quyền', message: 'Bạn không có quyền cập nhật hồ sơ.' })
      return
    }

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.push({ type: 'error', title: 'Dữ liệu chưa hợp lệ', message: 'Vui lòng kiểm tra các trường bắt buộc.' })
      return
    }

    setIsSaving(true)
    try {
      if (mode === 'create') {
        await createCitizen(form)
        toast.push({ type: 'success', title: 'Tạo hồ sơ', message: 'Đã gửi yêu cầu tạo hồ sơ mới.' })
        navigate('/app/citizens', { replace: true })
        return
      }

      if (!citizenId) return
      const payload = await updateCitizen(citizenId, form)
      setCitizen(payload)
      toast.push({ type: 'success', title: 'Cập nhật hồ sơ', message: 'Đã lưu thay đổi.' })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Lưu thất bại',
        message: error instanceof Error ? error.message : 'Không thể lưu.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!citizenId) return
    if (!canDelete) {
      toast.push({ type: 'error', title: 'Không đủ quyền', message: 'Bạn không có quyền xoá hồ sơ.' })
      return
    }
    const ok = window.confirm(`Xoá hồ sơ ID ${citizenId}? Thao tác không thể hoàn tác.`)
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteCitizen(citizenId)
      toast.push({ type: 'success', title: 'Xoá hồ sơ', message: `Đã xoá hồ sơ ID ${citizenId}.` })
      navigate('/app/citizens', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Xoá thất bại',
        message: error instanceof Error ? error.message : 'Không thể xoá hồ sơ.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{mode === 'create' ? 'Tạo hồ sơ công dân' : 'Hồ sơ công dân'}</div>
          <div className="page-subtitle">
            {mode === 'create'
              ? 'Tạo mới hồ sơ theo biểu mẫu chuẩn.'
              : 'Xem và cập nhật thông tin theo quyền được cấp.'}
          </div>
        </div>
        <div className="page-actions">
          <Link to="/app/citizens" className="btn btn-ghost btn-md">
            Quay lại
          </Link>
          {mode === 'edit' && canDelete ? (
            <Button variant="danger" onClick={() => void handleDelete()} loading={isDeleting} disabled={isLoading}>
              Xoá
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid-editor">
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
                  disabled={mode === 'edit' && !canUpdate}
                />
              </Field>
              <Field label="Họ tên" error={errors.ho_ten}>
                <TextInput
                  value={form.ho_ten}
                  onChange={(e) => setForm((c) => ({ ...c, ho_ten: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  disabled={mode === 'edit' && !canUpdate}
                />
              </Field>
              <Field label="Số CCCD" hint="9–12 chữ số" error={errors.so_cccd}>
                <TextInput
                  value={form.so_cccd}
                  onChange={(e) => setForm((c) => ({ ...c, so_cccd: e.target.value }))}
                  placeholder="012345678901"
                  disabled={mode === 'edit' && !canUpdate}
                />
              </Field>
              <Field label="Số điện thoại" hint="9–11 chữ số" error={errors.so_dien_thoai}>
                <TextInput
                  value={form.so_dien_thoai}
                  onChange={(e) => setForm((c) => ({ ...c, so_dien_thoai: e.target.value }))}
                  placeholder="0901234567"
                  disabled={mode === 'edit' && !canUpdate}
                />
              </Field>
              <Field label="Email" hint="Tuỳ chọn" error={errors.gmail}>
                <TextInput
                  type="email"
                  value={form.gmail}
                  onChange={(e) => setForm((c) => ({ ...c, gmail: e.target.value }))}
                  placeholder="abc@domain.gov.vn"
                  disabled={mode === 'edit' && !canUpdate}
                />
              </Field>
            </div>

            <div className="form-actions">
              {mode === 'create' ? (
                <Button variant="primary" type="submit" loading={isSaving} disabled={isLoading || !canCreate}>
                  Tạo hồ sơ
                </Button>
              ) : canUpdate ? (
                <Button variant="primary" type="submit" loading={isSaving} disabled={isLoading}>
                  Lưu thay đổi
                </Button>
              ) : (
                <div className="muted">Chế độ chỉ xem (không có quyền cập nhật).</div>
              )}
              {mode === 'create' ? (
                <Button type="button" variant="ghost" disabled={isSaving} onClick={() => setForm(DEFAULT_CITIZEN_FORM)}>
                  Làm mới
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Thông tin hệ thống</div>
              <div className="section-subtitle">Phục vụ kiểm soát thay đổi và truy vết.</div>
            </div>
          </div>

          <div className="kv">
            <div className="kv-row">
              <div className="kv-k">ID</div>
              <div className="kv-v mono">{citizen?.id ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Hộ khẩu ID</div>
              <div className="kv-v mono">{citizen?.ho_khau_id ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Tạo lúc</div>
              <div className="kv-v">{citizen?.created_at ? formatDateTime(citizen.created_at) : '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Cập nhật</div>
              <div className="kv-v">{citizen?.updated_at ? formatDateTime(citizen.updated_at) : '-'}</div>
            </div>
          </div>

          <div className="muted">
            {mode === 'create'
              ? 'Sau khi tạo, có thể vào danh sách để mở hồ sơ và chỉnh sửa.'
              : 'Thông tin hiển thị theo dữ liệu backend trả về.'}
          </div>
        </Card>
      </div>
    </div>
  )
}
