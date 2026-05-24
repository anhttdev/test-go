import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'checking') {
    return (
      <div className="app-splash">
        <div className="splash-card">
          <div className="splash-mark" aria-hidden="true" />
          <div>
            <div className="splash-title">Hệ thống Quản lí Dân cư Quốc gia</div>
            <div className="splash-subtitle">Đang kiểm tra phiên đăng nhập…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
