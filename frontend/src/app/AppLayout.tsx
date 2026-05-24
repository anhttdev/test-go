import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../features/auth/auth-context'
import { Button } from '../ui/primitives'
import { classNames } from '../lib/format'
import { useToast } from '../ui/toast'

const NAV_ITEMS: Array<{ to: string; label: string; icon: string }> = [
  { to: '/app/dashboard', label: 'Tổng quan', icon: '▦' },
  { to: '/app/citizens', label: 'Công dân', icon: '👤' },
  { to: '/app/settings', label: 'Cấu hình', icon: '⚙' },
]

export function AppLayout() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const statusLabel =
    auth.status === 'checking' ? 'Đang kiểm tra' : auth.isAuthenticated ? 'Đã đăng nhập' : 'Chưa đăng nhập'

  async function handleLogout() {
    try {
      await auth.logout()
      toast.push({ type: 'success', title: 'Đăng xuất', message: 'Đã xoá phiên và cookie.' })
      navigate('/login', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng xuất thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng xuất.',
      })
    }
  }

  return (
    <div className={classNames('app-shell', isNavOpen && 'app-shell-nav-open')}>
      <aside className="app-nav" aria-label="Điều hướng">
        <div className="app-brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-title">CSDL Dân cư</div>
            <div className="brand-subtitle">Quản trị hệ thống</div>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => classNames('nav-link', isActive && 'active')}
              onClick={() => setIsNavOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-footer">
          <div className="status-chip" aria-label="Trạng thái phiên">
            <span className={classNames('status-dot', auth.isAuthenticated ? 'online' : 'offline')} />
            <span>{statusLabel}</span>
          </div>
          <div className="nav-footer-actions">
            <Button
              variant="ghost"
              onClick={() =>
                void auth
                  .refresh(false)
                  .then(() => {
                    toast.push({ type: 'success', title: 'Phiên', message: 'Đã kiểm tra trạng thái phiên.' })
                  })
                  .catch((error) => {
                    toast.push({
                      type: 'error',
                      title: 'Phiên',
                      message: error instanceof Error ? error.message : 'Không thể kiểm tra phiên.',
                    })
                  })
              }
            >
              Kiểm tra
            </Button>
            <Button variant="danger" onClick={() => void handleLogout()}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="nav-toggle"
            aria-label="Mở/đóng menu"
            onClick={() => setIsNavOpen((current) => !current)}
          >
            ≡
          </button>
          <div className="topbar-title">
            <div className="topbar-title-main">Hệ thống Quản lí Dân cư Quốc gia</div>
            <div className="topbar-title-sub">Cổng tác nghiệp nội bộ</div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
