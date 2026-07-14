import { Link } from 'react-router-dom'
import { Card } from '../ui/primitives'

export function ForbiddenPage() {
  return (
    <div className="page">
      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Không đủ quyền truy cập</div>
            <div className="section-subtitle">
              Tài khoản của bạn chưa được cấp quyền cho chức năng này. Vui lòng liên hệ quản trị hệ thống.
            </div>
          </div>
        </div>
        <Link to="/app/dashboard" className="link">
          Quay về tổng quan
        </Link>
      </Card>
    </div>
  )
}

