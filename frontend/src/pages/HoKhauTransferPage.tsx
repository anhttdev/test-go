import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getHoKhauById, listHoKhau, transferHoKhauMembers } from '../api/hokhau'
import type { HoKhau } from '../api/hokhau'
import { listCitizens } from '../api/citizens'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, Select, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'

function parseIdList(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

export function HoKhauTransferPage() {
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

  const canTransfer = auth.hasPermission('ho_khau:update')
  const canView = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hk, setHk] = useState<HoKhau | null>(null)
  const [households, setHouseholds] = useState<HoKhau[]>([])
  const [toHoKhauId, setToHoKhauId] = useState<string>('')
  const [transferUserIds, setTransferUserIds] = useState<string>('')
  const [resolvedMemberIds, setResolvedMemberIds] = useState<Record<string, number>>({})
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    if (!hoKhauId) return
    setIsLoading(true)
    void Promise.all([getHoKhauById(hoKhauId), listHoKhau()])
      .then(([detail, list]) => {
        setHk(detail.data)
        setHouseholds(list.data ?? [])
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải dữ liệu thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [hoKhauId])

  async function resolveMemberIds() {
    if (!hk?.thanh_viens?.length) return
    setIsResolving(true)
    try {
      const entries = await Promise.all(
        hk.thanh_viens.slice(0, 30).map(async (m) => {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hk) return
    if (!canTransfer) return

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

    setIsSaving(true)
    try {
      await transferHoKhauMembers({ tu_ho_khau_id: hk.id, den_ho_khau_id: toId, user_ids: ids })
      toast.push({ type: 'success', title: 'Chuyển hộ khẩu', message: 'Đã chuyển thành viên.' })
      navigate(`/app/hokhau/${hk.id}`, { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Chuyển thất bại',
        message: error instanceof Error ? error.message : 'Không thể chuyển thành viên.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!canView || !canTransfer) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Chuyển thành viên hộ khẩu</div>
          <div className="page-subtitle">{hk ? `Từ ${hk.ma_ho_khau} (ID ${hk.id})` : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          {hoKhauId ? (
            <Link to={`/app/hokhau/${hoKhauId}`} className="btn btn-default btn-md">
              Quay lại
            </Link>
          ) : (
            <Link to="/app/hokhau" className="btn btn-default btn-md">
              Quay lại
            </Link>
          )}
          <Button variant="default" onClick={() => void resolveMemberIds()} loading={isResolving} disabled={isLoading}>
            Nạp ID
          </Button>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Biểu mẫu chuyển</div>
            <div className="section-subtitle">API: PATCH /api/v1/hokhau/transfer</div>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <Field label="Hộ khẩu đích">
            <Select value={toHoKhauId} onChange={(e) => setToHoKhauId(e.target.value)}>
              <option value="">-- Chọn hộ khẩu --</option>
              {households
                .filter((x) => (hk ? x.id !== hk.id : true))
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

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isSaving} disabled={isLoading}>
              Chuyển
            </Button>
          </div>
        </form>
      </Card>

      {hk?.thanh_viens?.length ? (
        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Gợi ý thành viên</div>
              <div className="section-subtitle">Copy user_ids sau khi nạp ID theo mã số.</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Mã số</th>
                  <th>Họ tên</th>
                  <th>CCCD</th>
                </tr>
              </thead>
              <tbody>
                {hk.thanh_viens.map((m) => (
                  <tr key={m.ma_so}>
                    <td className="mono">{resolvedMemberIds[m.ma_so] ?? '-'}</td>
                    <td className="mono">{m.ma_so}</td>
                    <td>{m.ho_ten}</td>
                    <td className="mono">{m.so_cccd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

