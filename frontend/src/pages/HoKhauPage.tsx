import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listHoKhau } from '../api/hokhau'
import type { HoKhau } from '../api/hokhau'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

function formatAddress(hk: HoKhau) {
  const dc = hk.dia_chi
  return [dc.so_nha, dc.ten_duong, dc.phuong_xa, dc.quan_huyen, dc.thanh_pho].filter(Boolean).join(', ')
}

export function HoKhauPage() {
  const auth = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<HoKhau[]>([])
  const [query, setQuery] = useState(() => params.get('q') ?? '')

  const canCreate = auth.hasPermission('ho_khau:create')

  async function load() {
    setIsLoading(true)
    try {
      const payload = await listHoKhau()
      setItems(payload.data ?? [])
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải danh sách hộ khẩu thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải danh sách hộ khẩu.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      const q = params.get('q') ?? ''
      setQuery(q)
    })
  }, [params])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((hk) => hk.ma_ho_khau.toLowerCase().includes(q) || formatAddress(hk).toLowerCase().includes(q))
  }, [items, query])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Hộ khẩu</div>
          <div className="page-subtitle">Danh sách sổ hộ khẩu và tra cứu theo địa chỉ.</div>
        </div>
        <div className="page-actions">
          {canCreate ? (
            <Link to="/app/hokhau/new" className="btn btn-primary btn-md">
              Tạo hộ khẩu
            </Link>
          ) : null}
          <Button variant="default" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Bộ lọc</div>
            <div className="section-subtitle">Lọc nhanh theo mã hộ khẩu hoặc địa chỉ.</div>
          </div>
        </div>

        <div className="filters">
          <Field label="Tìm kiếm" hint="ma_ho_khau / địa chỉ">
            <TextInput
              value={query}
              onChange={(e) => {
                const next = e.target.value
                setQuery(next)
                const nextParams = new URLSearchParams(params)
                if (next.trim()) nextParams.set('q', next)
                else nextParams.delete('q')
                setParams(nextParams, { replace: true })
              }}
              placeholder="VD: HK2026..."
            />
          </Field>
        </div>
      </Card>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Danh sách</div>
            <div className="section-subtitle">Tổng: {filtered.length} sổ hộ khẩu.</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã hộ khẩu</th>
                <th>Địa chỉ</th>
                <th>Thành viên</th>
                <th className="table-actions-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((hk) => (
                  <tr key={hk.id}>
                    <td className="mono">{hk.id}</td>
                    <td className="mono">{hk.ma_ho_khau}</td>
                    <td>{formatAddress(hk)}</td>
                    <td className="mono">{hk.thanh_viens?.length ?? '-'}</td>
                    <td className="table-actions">
                      <Link to={`/app/hokhau/${hk.id}`} className="btn btn-default btn-sm">
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty">
                    {isLoading ? 'Đang tải…' : 'Chưa có dữ liệu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
