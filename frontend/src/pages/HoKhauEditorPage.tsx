import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createHoKhau, deleteHoKhau, getHoKhauById, listHoKhau, transferHoKhauMembers } from '../api/hokhau'
import type { HoKhau } from '../api/hokhau'
import { listCitizens } from '../api/citizens'
import { useAuth } from '../features/auth/auth-context'
import { formatDateTime } from '../lib/format'
import { Button, Card, Field, Select, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

function parseIdList(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function formatAddress(hk: HoKhau) {
  const dc = hk.dia_chi
  return [dc.so_nha, dc.ten_duong, dc.phuong_xa, dc.quan_huyen, dc.thanh_pho].filter(Boolean).join(', ')
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

export function HoKhauEditorPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams()

  const hoKhauId = useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }, [params.id])

  const mode = hoKhauId ? 'detail' : 'create'

  const canView = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])
  const canCreate = auth.hasPermission('ho_khau:create')
  const canTransfer = auth.hasPermission('ho_khau:update')
  const canDelete = auth.hasPermission('ho_khau:delete')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hk, setHk] = useState<HoKhau | null>(null)

  const [createForm, setCreateForm] = useState<CreateForm>(DEFAULT_CREATE)

  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [households, setHouseholds] = useState<HoKhau[]>([])
  const [toHoKhauId, setToHoKhauId] = useState<string>('')
  const [transferUserIds, setTransferUserIds] = useState<string>('')
  const [resolvedMemberIds, setResolvedMemberIds] = useState<Record<string, number>>({})
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    if (mode === 'create') {
      setHk(null)
      setCreateForm(DEFAULT_CREATE)
      return
    }

    if (!hoKhauId) return
    setIsLoading(true)
    void getHoKhauById(hoKhauId)
      .then((payload) => {
        setHk(payload.data)
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải hộ khẩu thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải hộ khẩu.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [mode, hoKhauId])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    if (!createForm.ma_ho_khau.trim()) {
      toast.push({ type: 'error', title: 'Thiếu dữ liệu', message: 'Vui lòng nhập mã hộ khẩu.' })
      return
    }

    setIsSaving(true)
    try {
      const created = await createHoKhau({
        ma_ho_khau: createForm.ma_ho_khau.trim(),
        dia_chi: {
          so_nha: createForm.so_nha.trim(),
          ten_duong: createForm.ten_duong.trim(),
          phuong_xa: createForm.phuong_xa.trim(),
          quan_huyen: createForm.quan_huyen.trim(),
          thanh_pho: createForm.thanh_pho.trim(),
        },
        user_ids: parseIdList(createForm.user_ids),
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

  async function openTransfer() {
    if (!hk) return
    setIsTransferOpen(true)
    setToHoKhauId('')
    setTransferUserIds('')
    setResolvedMemberIds({})

    try {
      const payload = await listHoKhau()
      setHouseholds(payload.data ?? [])
    } catch {
      setHouseholds([])
    }
  }

  async function resolveMemberIds() {
    if (!hk?.thanh_viens?.length) return
    setIsResolving(true)
    try {
      const entries = await Promise.all(
        hk.thanh_viens.slice(0, 20).map(async (m) => {
          const payload = await listCitizens({ name: '', maso: m.ma_so, page: '1', size: '1', sort: 'asc' })
          const first = payload[0]
          if (!first?.id) return [m.ma_so, 0] as const
          return [m.ma_so, first.id] as const
        }),
      )
      const next: Record<string, number> = {}
      for (const [maSo, id] of entries) {
        if (id > 0) next[maSo] = id
      }
      setResolvedMemberIds(next)
    } catch {
    } finally {
      setIsResolving(false)
    }
  }

  async function handleTransfer() {
    if (!hk) return
    const toId = Number(toHoKhauId)
    if (!Number.isFinite(toId) || toId <= 0) {
      toast.push({ type: 'error', title: 'Chuyển hộ khẩu', message: 'Vui lòng chọn hộ khẩu đích.' })
      return
    }

    const ids = parseIdList(transferUserIds)
    if (!ids.length) {
      toast.push({ type: 'error', title: 'Chuyển hộ khẩu', message: 'Vui lòng nhập user_ids hợp lệ.' })
      return
    }

    setIsTransferring(true)
    try {
      await transferHoKhauMembers({ tu_ho_khau_id: hk.id, den_ho_khau_id: toId, user_ids: ids })
      toast.push({ type: 'success', title: 'Chuyển hộ khẩu', message: 'Đã chuyển thành viên.' })
      setIsTransferOpen(false)
      const payload = await getHoKhauById(hk.id)
      setHk(payload.data)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Chuyển thất bại',
        message: error instanceof Error ? error.message : 'Không thể chuyển thành viên.',
      })
    } finally {
      setIsTransferring(false)
    }
  }

  async function handleDelete() {
    if (!hk) return
    const ok = window.confirm(`Xóa sổ hộ khẩu "${hk.ma_ho_khau}"?`)
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteHoKhau(hk.id)
      toast.push({ type: 'success', title: 'Hộ khẩu', message: 'Đã xóa sổ hộ khẩu.' })
      navigate('/app/hokhau', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Xóa thất bại',
        message: error instanceof Error ? error.message : 'Không thể xóa sổ hộ khẩu.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (mode === 'create' && !canCreate) return <ForbiddenPage />
  if (mode === 'detail' && !canView) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{mode === 'create' ? 'Tạo sổ hộ khẩu' : 'Chi tiết sổ hộ khẩu'}</div>
          <div className="page-subtitle">
            {mode === 'create'
              ? 'Tạo mới sổ hộ khẩu theo địa chỉ cư trú.'
              : hk
                ? `${hk.ma_ho_khau} • ${formatAddress(hk)}`
                : 'Đang tải dữ liệu…'}
          </div>
        </div>
        <div className="page-actions">
          <Link to="/app/hokhau" className="btn btn-ghost btn-md">
            Quay lại
          </Link>
          {mode === 'detail' && hk && canTransfer ? (
            <Button variant="primary" onClick={() => void openTransfer()} disabled={isLoading}>
              Chuyển thành viên
            </Button>
          ) : null}
          {mode === 'detail' && hk && canDelete ? (
            <Button variant="danger" onClick={() => void handleDelete()} loading={isDeleting} disabled={isLoading}>
              Xóa sổ
            </Button>
          ) : null}
        </div>
      </div>

      {mode === 'create' ? (
        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Thông tin hộ khẩu</div>
              <div className="section-subtitle">User IDs (tuỳ chọn) để gán cư trú ban đầu.</div>
            </div>
          </div>

          <form className="form" onSubmit={handleCreate}>
            <div className="form-grid">
              <Field label="Mã hộ khẩu" hint="Bắt buộc">
                <TextInput
                  value={createForm.ma_ho_khau}
                  onChange={(e) => setCreateForm((c) => ({ ...c, ma_ho_khau: e.target.value }))}
                  placeholder="VD: HK2026-0001"
                />
              </Field>
              <Field label="Số nhà" hint="Bắt buộc">
                <TextInput
                  value={createForm.so_nha}
                  onChange={(e) => setCreateForm((c) => ({ ...c, so_nha: e.target.value }))}
                  placeholder="12A"
                />
              </Field>
              <Field label="Tên đường" hint="Bắt buộc">
                <TextInput
                  value={createForm.ten_duong}
                  onChange={(e) => setCreateForm((c) => ({ ...c, ten_duong: e.target.value }))}
                  placeholder="Trần Hưng Đạo"
                />
              </Field>
              <Field label="Phường/Xã" hint="Bắt buộc">
                <TextInput
                  value={createForm.phuong_xa}
                  onChange={(e) => setCreateForm((c) => ({ ...c, phuong_xa: e.target.value }))}
                  placeholder="Phường 1"
                />
              </Field>
              <Field label="Quận/Huyện" hint="Bắt buộc">
                <TextInput
                  value={createForm.quan_huyen}
                  onChange={(e) => setCreateForm((c) => ({ ...c, quan_huyen: e.target.value }))}
                  placeholder="Quận 1"
                />
              </Field>
              <Field label="Tỉnh/Thành phố" hint="Bắt buộc">
                <TextInput
                  value={createForm.thanh_pho}
                  onChange={(e) => setCreateForm((c) => ({ ...c, thanh_pho: e.target.value }))}
                  placeholder="TP. Hồ Chí Minh"
                />
              </Field>
              <Field label="User IDs" hint="Tuỳ chọn, cách nhau bằng dấu phẩy">
                <TextInput
                  value={createForm.user_ids}
                  onChange={(e) => setCreateForm((c) => ({ ...c, user_ids: e.target.value }))}
                  placeholder="1,2,3"
                />
              </Field>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary" loading={isSaving} disabled={!canCreate}>
                Tạo sổ
              </Button>
              <Button type="button" variant="ghost" disabled={isSaving} onClick={() => setCreateForm(DEFAULT_CREATE)}>
                Làm mới
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Card className="section-card">
            <div className="section-head">
              <div>
                <div className="section-title">Thông tin sổ</div>
                <div className="section-subtitle">Dữ liệu hiển thị theo quyền ho_khau:view.</div>
              </div>
            </div>

            <div className="kv">
              <div className="kv-row">
                <div className="kv-k">ID</div>
                <div className="kv-v mono">{hk?.id ?? '-'}</div>
              </div>
              <div className="kv-row">
                <div className="kv-k">Mã hộ khẩu</div>
                <div className="kv-v mono">{hk?.ma_ho_khau ?? '-'}</div>
              </div>
              <div className="kv-row">
                <div className="kv-k">Địa chỉ</div>
                <div className="kv-v">{hk ? formatAddress(hk) : '-'}</div>
              </div>
              <div className="kv-row">
                <div className="kv-k">Tạo lúc</div>
                <div className="kv-v">{hk?.created_at ? formatDateTime(hk.created_at) : '-'}</div>
              </div>
              <div className="kv-row">
                <div className="kv-k">Cập nhật</div>
                <div className="kv-v">{hk?.updated_at ? formatDateTime(hk.updated_at) : '-'}</div>
              </div>
            </div>
          </Card>

          <Card className="section-card">
            <div className="section-head">
              <div>
                <div className="section-title">Thành viên</div>
                <div className="section-subtitle">
                  Transfer yêu cầu user_ids. Nếu hệ thống chưa trả về ID, có thể dùng nút “Nạp ID” để tra cứu theo mã số.
                </div>
              </div>
              {canTransfer ? (
                <Button variant="ghost" onClick={() => void resolveMemberIds()} loading={isResolving} disabled={isLoading}>
                  Nạp ID
                </Button>
              ) : null}
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Mã số</th>
                    <th>Họ tên</th>
                    <th>CCCD</th>
                    <th>Điện thoại</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {hk?.thanh_viens?.length ? (
                    hk.thanh_viens.map((m) => (
                      <tr key={m.ma_so}>
                        <td className="mono">{resolvedMemberIds[m.ma_so] ?? '-'}</td>
                        <td className="mono">{m.ma_so}</td>
                        <td>{m.ho_ten}</td>
                        <td className="mono">{m.so_cccd}</td>
                        <td className="mono">{m.so_dien_thoai}</td>
                        <td>{m.email ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        {isLoading ? 'Đang tải…' : 'Chưa có thành viên.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {isTransferOpen && hk ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsTransferOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Chuyển thành viên</div>
                <div className="modal-subtitle">
                  Từ {hk.ma_ho_khau} (ID {hk.id})
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsTransferOpen(false)}>
                ✕
              </button>
            </div>

            <div className="form">
              <Field label="Hộ khẩu đích">
                <Select value={toHoKhauId} onChange={(e) => setToHoKhauId(e.target.value)}>
                  <option value="">-- Chọn hộ khẩu --</option>
                  {households
                    .filter((x) => x.id !== hk.id)
                    .map((x) => (
                      <option key={x.id} value={String(x.id)}>
                        {x.ma_ho_khau} (ID {x.id})
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="User IDs" hint="Cách nhau bằng dấu phẩy">
                <TextInput value={transferUserIds} onChange={(e) => setTransferUserIds(e.target.value)} placeholder="1,2,3" />
              </Field>

              <div className="modal-actions">
                <Button variant="primary" onClick={() => void handleTransfer()} loading={isTransferring} disabled={!canTransfer}>
                  Chuyển
                </Button>
                <Button variant="ghost" onClick={() => setIsTransferOpen(false)} disabled={isTransferring}>
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

