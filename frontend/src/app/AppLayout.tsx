import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Folder, LogIn, LogOut, Shield, UserRound, Users, Home } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useToast } from '../ui/toast'

function NationalEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="emblemRed" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D43B2A" />
          <stop offset="1" stopColor="#A11E17" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#emblemRed)" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,215,0,0.85)" strokeWidth="2.2" />
      <path
        d="M32 16l4.1 8.5 9.4 1.4-6.8 6.6 1.6 9.3L32 37.6l-8.3 4.2 1.6-9.3-6.8-6.6 9.4-1.4L32 16z"
        fill="#FFD200"
      />
      <path
        d="M15 41c4 8.5 11 13 17 13s13-4.5 17-13"
        fill="none"
        stroke="rgba(255,215,0,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function normalizeLabel(value?: string) {
  const v = (value ?? '').trim()
  return v || '-'
}

export function AppLayout() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const roleCodes = useMemo(() => {
    const roles = auth.profile?.roles ?? []
    return roles
      .map((r) => (r.role_code ?? r.roleCode ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [auth.profile?.roles])

  const roleLabel = useMemo(() => {
    const roles = auth.profile?.roles ?? []
    const first = roles[0]
    const name = (first?.role_name ?? first?.roleName ?? '').trim()
    const code = (first?.role_code ?? first?.roleCode ?? '').trim()
    return name || code || 'Cán bộ'
  }, [auth.profile?.roles])

  const fullName = useMemo(() => {
    const n = auth.profile?.user?.ho_ten?.trim()
    return n || auth.profile?.username?.trim() || '-'
  }, [auth.profile])

  const isSuperAdmin = useMemo(() => auth.permissions.has('*') || roleCodes.includes('SUPER_ADMIN'), [auth.permissions, roleCodes])

  const canManageCitizens = auth.hasAnyPermission(['nguoi_dan:view', 'nguoi_dan:view_detail'])
  const canManageHoKhau = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])
  const canSeeWorkspaceGroup = auth.isAuthenticated && (canManageCitizens || canManageHoKhau)

  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'CB'
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    const value = `${first}${last}`.toUpperCase()
    return value || 'CB'
  }, [fullName])

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return
      if (dropdownRef.current.contains(event.target as Node)) return
      setIsProfileOpen(false)
    }
    window.addEventListener('mousedown', onOutside)
    return () => window.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setIsProfileOpen(false)
      setIsLoginOpen(true)
    }
    window.addEventListener('app:unauthorized', onUnauthorized)
    return () => window.removeEventListener('app:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    setIsProfileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    try {
      await auth.logout()
      toast.push({ type: 'success', title: 'Đăng xuất', message: 'Đã xoá phiên và cookie.' })
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng xuất thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng xuất.',
      })
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = loginUsername.trim()
    if (!username || !loginPassword) return
    setIsLoggingIn(true)
    try {
      await auth.login({ username, password: loginPassword })
      setIsLoginOpen(false)
      setLoginPassword('')
      toast.push({ type: 'success', title: 'Đăng nhập', message: 'Đã xác thực phiên làm việc.' })
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng nhập thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng nhập.',
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900">
      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <NationalEmblem className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-black tracking-[0.14em] text-[#BC5133]">CỔNG DỊCH VỤ CÔNG QUỐC GIA</div>
              <div className="truncate text-xs text-slate-600">National Public Service Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!auth.isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => navigate('/login')}
                >
                  Đăng ký
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md bg-[#BC5133] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#a9482e]"
                  onClick={() => setIsLoginOpen(true)}
                >
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </button>
              </>
            ) : (
              <div className="text-sm font-semibold text-slate-700">
                Xin chào, <span className="font-extrabold text-slate-900">{normalizeLabel(fullName)}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="bg-[#BC5133] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 overflow-visible px-2 py-2">
            <NavLink
              to="/app/dashboard"
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/10 ${
                  isActive ? 'bg-white/15' : ''
                }`
              }
            >
              Trang chủ
            </NavLink>
            <a className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/10" href="#">
              Thông tin và dịch vụ
            </a>
            <a className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/10" href="#">
              Thanh toán trực tiếp
            </a>
            <a className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/10" href="#">
              Phản ánh kiến nghị
            </a>
            <a className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/10" href="#">
              Hỗ trợ
            </a>
            <div className="relative ml-auto shrink-0" ref={dropdownRef}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/15"
                onClick={() => {
                  if (!auth.isAuthenticated) {
                    setIsLoginOpen(true)
                    return
                  }
                  setIsProfileOpen((v) => !v)
                }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold">
                  {initials}
                </span>
                <span className="hidden max-w-[240px] truncate md:inline">
                  {auth.isAuthenticated ? `Cán bộ: ${normalizeLabel(fullName)} [${roleLabel}]` : 'Không gian làm việc'}
                </span>
                <span className="md:hidden">{auth.isAuthenticated ? 'Không gian làm việc' : 'Đăng nhập'}</span>
                <ChevronDown className="h-4 w-4 opacity-90" />
              </button>

              <div
                className={`absolute right-2 top-[100%] z-40 mt-2 w-[340px] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg transition-all duration-200 ${
                  isProfileOpen && auth.isAuthenticated ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                }`}
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-700">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">{normalizeLabel(fullName)}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">
                        {roleLabel} • Account ID: {auth.profile?.id ?? '-'} • {auth.permissions.has('*') ? 'ALL' : `${auth.permissions.size} quyền`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    to="/app/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <UserRound className="h-4 w-4 text-slate-600" />
                    Hồ sơ cá nhân
                  </Link>

                  {canSeeWorkspaceGroup ? (
                    <div className="mt-2">
                      <div className="px-3 pb-2 pt-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          Nghiệp vụ quản lý
                        </span>
                      </div>
                      {canManageCitizens ? (
                        <Link
                          to="/app/citizens"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Users className="h-4 w-4 text-slate-600" />
                          Quản lý công dân
                        </Link>
                      ) : null}
                      {canManageHoKhau ? (
                        <Link
                          to="/app/hokhau"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Home className="h-4 w-4 text-slate-600" />
                          Quản lý hộ khẩu
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {isSuperAdmin ? (
                    <Link
                      to="/app/admin"
                      className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Shield className="h-4 w-4 text-slate-600" />
                      Hệ thống quản trị
                    </Link>
                  ) : null}

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      {isLoginOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={() => setIsLoginOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-base font-extrabold text-slate-900">Đăng nhập</div>
              <div className="mt-1 text-sm text-slate-600">Xác thực bằng tài khoản nội bộ (cookie session).</div>
            </div>
            <form className="px-5 py-4" onSubmit={(e) => void handleLoginSubmit(e)}>
              <label className="block">
                <div className="text-sm font-semibold text-slate-800">Tên đăng nhập</div>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#BC5133]"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="mt-4 block">
                <div className="text-sm font-semibold text-slate-800">Mật khẩu</div>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#BC5133]"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                />
              </label>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsLoginOpen(false)}
                  disabled={isLoggingIn}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn || !loginUsername.trim() || !loginPassword}
                  className="rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a9482e] disabled:opacity-60"
                >
                  {isLoggingIn ? 'Đang đăng nhập…' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
