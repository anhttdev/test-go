import { Link } from 'react-router-dom'
import { Card } from '../ui/primitives'

export function NotFoundPage() {
  return (
    <div className="page">
      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Không tìm thấy trang</div>
            <div className="section-subtitle">Đường dẫn không tồn tại hoặc bạn không có quyền truy cập.</div>
          </div>
        </div>
        <Link to="/app/dashboard" className="link">
          Về trang tổng quan
        </Link>
      </Card>
    </div>
  )
}

