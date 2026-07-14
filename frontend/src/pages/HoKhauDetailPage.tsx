import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteHoKhau, getHoKhauById } from '../api/hokhau'
import type { HoKhau } from '../api/hokhau'
import { useAuth } from '../features/auth/auth-context'
import { formatDateTime } from '../lib/format'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

function formatAddress(hk: HoKhau) {
  const dc = hk.dia_chi
  return [dc.so_nha, dc.ten_duong, dc.phuong_xa, dc.quan_huyen, dc.thanh_pho].filter(Boolean).join(', ')
}

export function HoKhauDetailPage() {
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

  const canView = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])
  const canTransfer = auth.hasPermission('ho_khau:update')
  const canDelete = auth.hasPermission('ho_khau:delete')

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hk, setHk] = useState<HoKhau | null>(null)

  useEffect(() => {
    if (!hoKhauId) return
    setIsLoading(true)
    void getHoKhauById(hoKhauId)
      .then((payload) => setHk(payload.data))
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải hộ khẩu thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải hộ khẩu.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [hoKhauId])

  async function handleDelete() {
    if (!hoKhauId) return
    if (!canDelete) return
    const ok = window.confirm(`Xóa sổ hộ khẩu ID ${hoKhauId}?`)
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteHoKhau(hoKhauId)
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

  if (!canView) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Chi tiết sổ hộ khẩu</div>
          <div className="page-subtitle">{hk ? `${hk.ma_ho_khau} • ${formatAddress(hk)}` : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          <Link to="/app/hokhau" className="btn btn-default btn-md">
            Quay lại
          </Link>
          {hoKhauId && canTransfer ? (
            <Link to={`/app/hokhau/${hoKhauId}/transfer`} className="btn btn-primary btn-md">
              Chuyển thành viên
            </Link>
          ) : null}
          {hoKhauId && canDelete ? (
            <Button variant="danger" onClick={() => void handleDelete()} loading={isDeleting} disabled={isLoading}>
              Xóa sổ
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid-editor">
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
              <div className="kv-v">{hk?.created_at ? formatDateTime(String(hk.created_at)) : '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Cập nhật</div>
              <div className="kv-v">{hk?.updated_at ? formatDateTime(String(hk.updated_at)) : '-'}</div>
            </div>
          </div>
        </Card>

        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Thành viên</div>
              <div className="section-subtitle">Danh sách thành viên cư trú trong sổ.</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
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
                      <td className="mono">{m.ma_so}</td>
                      <td>{m.ho_ten}</td>
                      <td className="mono">{m.so_cccd}</td>
                      <td className="mono">{m.so_dien_thoai}</td>
                      <td>{m.email ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      {isLoading ? 'Đang tải…' : 'Chưa có thành viên.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

