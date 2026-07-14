import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createHoKhau } from '../api/hokhau'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

function parseIdList(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

type CreateForm = {
  ma_ho_khau: string
  so_nha: string
  ten_duong: string
  phuong_xa: string
  quan_huyen: string
  thanh_pho: string
  user_ids: string
}

const DEFAULT_CREATE: CreateForm = {
  ma_ho_khau: '',
  so_nha: '',
  ten_duong: '',
  phuong_xa: '',
  quan_huyen: '',
  thanh_pho: '',
  user_ids: '',
}

export function HoKhauCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const canCreate = auth.hasPermission('ho_khau:create')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<CreateForm>(DEFAULT_CREATE)

  const canSubmit = useMemo(() => {
    if (!form.ma_ho_khau.trim()) return false
    if (!form.so_nha.trim()) return false
    if (!form.ten_duong.trim()) return false
    if (!form.phuong_xa.trim()) return false
    if (!form.quan_huyen.trim()) return false
    if (!form.thanh_pho.trim()) return false
    return true
  }, [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    setIsSaving(true)
    try {
      const created = await createHoKhau({
        ma_ho_khau: form.ma_ho_khau.trim(),
        dia_chi: {
          so_nha: form.so_nha.trim(),
          ten_duong: form.ten_duong.trim(),
          phuong_xa: form.phuong_xa.trim(),
          quan_huyen: form.quan_huyen.trim(),
          thanh_pho: form.thanh_pho.trim(),
        },
        user_ids: parseIdList(form.user_ids),
      })
      toast.push({ type: 'success', title: 'Hộ khẩu', message: 'Đã tạo sổ hộ khẩu.' })
      navigate(`/app/hokhau/${created.id}`, { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tạo hộ khẩu thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo hộ khẩu.',
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
          <div className="page-title">Tạo sổ hộ khẩu</div>
          <div className="page-subtitle">Tạo mới sổ hộ khẩu theo địa chỉ cư trú.</div>
        </div>
        <div className="page-actions">
          <Link to="/app/hokhau" className="btn btn-default btn-md">
            Quay lại
          </Link>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Thông tin sổ hộ khẩu</div>
            <div className="section-subtitle">User IDs (tuỳ chọn) để gán cư trú ban đầu.</div>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Mã hộ khẩu" hint="Bắt buộc">
              <TextInput
                value={form.ma_ho_khau}
                onChange={(e) => setForm((c) => ({ ...c, ma_ho_khau: e.target.value }))}
                placeholder="VD: HK2026-0001"
              />
            </Field>
            <Field label="Số nhà" hint="Bắt buộc">
              <TextInput
                value={form.so_nha}
                onChange={(e) => setForm((c) => ({ ...c, so_nha: e.target.value }))}
                placeholder="12A"
              />
            </Field>
            <Field label="Tên đường" hint="Bắt buộc">
              <TextInput
                value={form.ten_duong}
                onChange={(e) => setForm((c) => ({ ...c, ten_duong: e.target.value }))}
                placeholder="Trần Hưng Đạo"
              />
            </Field>
            <Field label="Phường/Xã" hint="Bắt buộc">
              <TextInput
                value={form.phuong_xa}
                onChange={(e) => setForm((c) => ({ ...c, phuong_xa: e.target.value }))}
                placeholder="Phường 1"
              />
            </Field>
            <Field label="Quận/Huyện" hint="Bắt buộc">
              <TextInput
                value={form.quan_huyen}
                onChange={(e) => setForm((c) => ({ ...c, quan_huyen: e.target.value }))}
                placeholder="Quận 1"
              />
            </Field>
            <Field label="Tỉnh/Thành phố" hint="Bắt buộc">
              <TextInput
                value={form.thanh_pho}
                onChange={(e) => setForm((c) => ({ ...c, thanh_pho: e.target.value }))}
                placeholder="TP. Hồ Chí Minh"
              />
            </Field>
            <Field label="User IDs" hint="Tuỳ chọn, cách nhau bằng dấu phẩy">
              <TextInput
                value={form.user_ids}
                onChange={(e) => setForm((c) => ({ ...c, user_ids: e.target.value }))}
                placeholder="1,2,3"
              />
            </Field>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={!canSubmit}>
              Tạo sổ
            </Button>
            <Button type="button" variant="default" disabled={isSaving} onClick={() => setForm(DEFAULT_CREATE)}>
              Làm mới
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

