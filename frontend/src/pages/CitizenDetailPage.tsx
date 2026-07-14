import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteCitizen, getCitizenById } from '../api/citizens'
import { useAuth } from '../features/auth/auth-context'
import type { Citizen } from '../lib/domain'
import { formatDateTime } from '../lib/format'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

export function CitizenDetailPage() {
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

  const canView = auth.hasAnyPermission(['nguoi_dan:view', 'nguoi_dan:view_detail'])
  const canUpdate = auth.hasPermission('nguoi_dan:update')
  const canDelete = auth.hasPermission('nguoi_dan:delete')

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [citizen, setCitizen] = useState<Citizen | null>(null)

  useEffect(() => {
    if (!citizenId) return
    setIsLoading(true)
    void getCitizenById(citizenId)
      .then((payload) => setCitizen(payload))
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải hồ sơ thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải hồ sơ.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [citizenId])

  async function handleDelete() {
    if (!citizenId) return
    if (!canDelete) return
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

  if (!canView) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Hồ sơ công dân</div>
          <div className="page-subtitle">{citizen ? citizen.ho_ten : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          <Link to="/app/citizens" className="btn btn-default btn-md">
            Quay lại
          </Link>
          {citizenId && canUpdate ? (
            <Link to={`/app/citizens/${citizenId}/edit`} className="btn btn-primary btn-md">
              Chỉnh sửa
            </Link>
          ) : null}
          {citizenId && canDelete ? (
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
              <div className="section-subtitle">Hiển thị theo quyền nguoi_dan:view.</div>
            </div>
          </div>

          <div className="kv">
            <div className="kv-row">
              <div className="kv-k">Mã số</div>
              <div className="kv-v mono">{citizen?.ma_so ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Họ tên</div>
              <div className="kv-v">{citizen?.ho_ten ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">CCCD</div>
              <div className="kv-v mono">{citizen?.so_cccd ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Điện thoại</div>
              <div className="kv-v mono">{citizen?.so_dien_thoai ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Email</div>
              <div className="kv-v">{citizen?.gmail ?? citizen?.email ?? '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Hộ khẩu ID</div>
              <div className="kv-v mono">{citizen?.ho_khau_id ?? '-'}</div>
            </div>
          </div>
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
              <div className="kv-k">Tạo lúc</div>
              <div className="kv-v">{citizen?.created_at ? formatDateTime(citizen.created_at) : '-'}</div>
            </div>
            <div className="kv-row">
              <div className="kv-k">Cập nhật</div>
              <div className="kv-v">{citizen?.updated_at ? formatDateTime(citizen.updated_at) : '-'}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

