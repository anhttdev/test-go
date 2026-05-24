import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCitizens } from '../api/citizens'
import type { Citizen } from '../lib/domain'
import { DEFAULT_CITIZEN_LIST_QUERY } from '../lib/domain'
import { formatDateTime } from '../lib/format'
import { Button, Card } from '../ui/primitives'
import { useToast } from '../ui/toast'

export function DashboardPage() {
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [loadedAt, setLoadedAt] = useState<string | null>(null)

  const recentCitizens = useMemo(() => citizens.slice(0, 6), [citizens])

  async function load() {
    setIsLoading(true)
    try {
      const payload = await listCitizens({ ...DEFAULT_CITIZEN_LIST_QUERY, page: '1', size: '12' })
      setCitizens(payload)
      setLoadedAt(new Date().toISOString())
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải dữ liệu thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải danh sách.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Tổng quan</div>
          <div className="page-subtitle">Giám sát nhanh và thao tác thường dùng.</div>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => void load()} loading={isLoading}>
            Tải mới
          </Button>
          <Link to="/app/citizens/new" className="btn btn-default btn-md">
            Tạo hồ sơ
          </Link>
        </div>
      </div>

      <div className="grid-cards">
        <Card className="stat-card">
          <div className="stat-k">Bản ghi đang hiển thị</div>
          <div className="stat-v">{citizens.length}</div>
          <div className="stat-meta">Trang mẫu: 1 / kích thước 12</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-k">Lần đồng bộ gần nhất</div>
          <div className="stat-v stat-v-sm">{loadedAt ? formatDateTime(loadedAt) : '-'}</div>
          <div className="stat-meta">Nguồn: GET /api/v2/users/</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-k">Trạng thái hệ thống</div>
          <div className="stat-v stat-v-sm">Sẵn sàng</div>
          <div className="stat-meta">Kết nối qua proxy Vite /api</div>
        </Card>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Hồ sơ gần đây</div>
            <div className="section-subtitle">Danh sách mẫu (không phải thống kê toàn bộ).</div>
          </div>
          <Link to="/app/citizens" className="link">
            Mở danh sách
          </Link>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã số</th>
                <th>Họ tên</th>
                <th>Số CCCD</th>
                <th>Điện thoại</th>
                <th>Liên hệ</th>
              </tr>
            </thead>
            <tbody>
              {recentCitizens.length ? (
                recentCitizens.map((citizen) => (
                  <tr key={citizen.id ?? citizen.ma_so}>
                    <td className="mono">{citizen.id ?? '-'}</td>
                    <td className="mono">{citizen.ma_so}</td>
                    <td>
                      <Link to={`/app/citizens/${citizen.id ?? ''}`} className="table-link">
                        {citizen.ho_ten}
                      </Link>
                    </td>
                    <td className="mono">{citizen.so_cccd}</td>
                    <td className="mono">{citizen.so_dien_thoai}</td>
                    <td>{citizen.gmail ?? citizen.email ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="table-empty">
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
