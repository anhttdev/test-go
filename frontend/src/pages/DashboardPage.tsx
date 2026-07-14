import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Book,
  BriefcaseBusiness,
  Building2,
  FilePlus2,
  Filter,
  GitBranch,
  Home,
  KeyRound,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'

function ActionRow({
  icon,
  title,
  desc,
  to,
  disabled,
  right,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  to?: string
  disabled?: boolean
  right?: React.ReactNode
  onClick?: () => void
}) {
  const content = (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition ${
        disabled ? 'opacity-55' : 'hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-slate-50 p-2 text-slate-700">{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">{title}</div>
          <div className="mt-0.5 line-clamp-2 text-sm text-slate-600">{desc}</div>
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )

  if (to && !disabled) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className="block w-full text-left" disabled={disabled} onClick={disabled ? undefined : onClick}>
      {content}
    </button>
  )
}

export function DashboardPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [searchMode, setSearchMode] = useState<'citizen_name' | 'citizen_maso' | 'hokhau_ma'>('citizen_name')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [activeModuleTab, setActiveModuleTab] = useState<'citizen' | 'hokhau' | 'staff'>('citizen')
  const [activeCardKey, setActiveCardKey] = useState('citizen:list')

  const canViewCitizens = auth.hasAnyPermission(['nguoi_dan:view', 'nguoi_dan:view_detail'])
  const canCreateCitizen = auth.hasPermission('nguoi_dan:create')
  const canUpdateCitizen = auth.hasPermission('nguoi_dan:update')
  const canDeleteCitizen = auth.hasPermission('nguoi_dan:delete')

  const canViewHoKhau = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])
  const canCreateHoKhau = auth.hasPermission('ho_khau:create')
  const canUpdateHoKhau = auth.hasPermission('ho_khau:update')

  const roleCodes = useMemo(() => {
    return (auth.profile?.roles ?? [])
      .map((r) => (r.role_code ?? r.roleCode ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [auth.profile?.roles])

  const isSuperAdmin = auth.permissions.has('*') || auth.permissions.has('SUPER_ADMIN') || roleCodes.includes('SUPER_ADMIN')

  const canAnySearch = canViewCitizens || canViewHoKhau

  const searchOptions = useMemo(
    () =>
      [
        { value: 'citizen_name' as const, label: 'Công dân • Họ tên', enabled: canViewCitizens },
        { value: 'citizen_maso' as const, label: 'Công dân • Mã số', enabled: canViewCitizens },
        { value: 'hokhau_ma' as const, label: 'Hộ khẩu • Mã sổ', enabled: canViewHoKhau },
      ].filter((x) => x.enabled),
    [canViewCitizens, canViewHoKhau],
  )

  function submitSearch() {
    const term = q.trim()
    if (!term) return
    if (searchMode === 'hokhau_ma') {
      navigate(`/app/hokhau?q=${encodeURIComponent(term)}`)
      return
    }
    const key = searchMode === 'citizen_maso' ? 'maso' : 'name'
    navigate(`/app/citizens?${key}=${encodeURIComponent(term)}&page=1&size=10&sort=asc`)
  }

  useEffect(() => {
    if (activeModuleTab === 'staff' && !isSuperAdmin) {
      setActiveModuleTab('citizen')
      setActiveCardKey('citizen:list')
    }
  }, [activeModuleTab, isSuperAdmin])

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-[#FFF7E6] p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Tra cứu dịch vụ</div>
              <div className="mt-1 text-sm text-slate-700">
                Tìm theo công dân hoặc hộ khẩu. Kết quả sẽ điều hướng sang module tương ứng.
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {auth.isAuthenticated ? `Phiên: ${auth.profile?.username ?? '-'}` : 'Chưa đăng nhập'}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-center">
              <div>
                <div className="text-xs font-bold text-slate-700">Đối tượng</div>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133] disabled:opacity-60"
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as typeof searchMode)}
                  disabled={!canAnySearch}
                >
                  {searchOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">Từ khóa</div>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
                    placeholder={canAnySearch ? 'Nhập họ tên / mã số / mã hộ khẩu…' : 'Đăng nhập để được cấp quyền tra cứu'}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    disabled={!canAnySearch}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitSearch()
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  disabled={!canAnySearch}
                  onClick={() => setIsAdvancedOpen((v) => !v)}
                >
                  <Filter className="h-4 w-4" />
                  Nâng cao
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a9482e] disabled:opacity-60"
                  disabled={!canAnySearch}
                  onClick={submitSearch}
                >
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </button>
              </div>
            </div>

            {isAdvancedOpen ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="font-bold text-slate-900">Bộ lọc nâng cao</div>
                <div className="mt-1 text-slate-600">Bố cục sẵn sàng để mở rộng theo tiêu chí tra cứu.</div>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Quản lý Dân cư</div>
                <div className="mt-1 text-sm text-slate-700">Bảng điều khiển nghiệp vụ theo phân quyền (RBAC).</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-extrabold shadow-sm transition-all duration-200 ${
                  activeModuleTab === 'citizen'
                    ? 'border-[#BC5133] bg-[#BC5133] text-white shadow'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
                onClick={() => {
                  setActiveModuleTab('citizen')
                  setActiveCardKey('citizen:list')
                }}
              >
                Quản lý Người dân
              </button>
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-extrabold shadow-sm transition-all duration-200 ${
                  activeModuleTab === 'hokhau'
                    ? 'border-[#BC5133] bg-[#BC5133] text-white shadow'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
                onClick={() => {
                  setActiveModuleTab('hokhau')
                  setActiveCardKey('hokhau:list')
                }}
              >
                Quản lý Hộ khẩu
              </button>
                {isSuperAdmin ? (
                  <button
                    type="button"
                    className={`rounded-xl border px-4 py-2 text-sm font-extrabold shadow-sm transition-all duration-200 ${
                      activeModuleTab === 'staff'
                        ? 'border-[#BC5133] bg-[#BC5133] text-white shadow'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      setActiveModuleTab('staff')
                      setActiveCardKey('staff:accounts')
                    }}
                  >
                    Quản lý Cán bộ
                  </button>
                ) : null}
            </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {activeModuleTab === 'citizen' ? (
                <>
                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'citizen:list'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!canViewCitizens ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('citizen:list')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('citizen:list')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Tra cứu & Quản lý Nhân khẩu</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Xem danh sách, thông tin chi tiết và tiểu sử công dân trên địa bàn.
                        </div>
                      </div>
                      <Users className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'citizen:list' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Công dân: 2,038</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Toàn trình: 1,023</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Một phần: 1,015</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Danh sách • Chi tiết • Tiểu sử</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !canViewCitizens}
                        onClick={() => navigate('/app/citizens')}
                      >
                        Truy cập dịch vụ
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'citizen:create'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!canCreateCitizen ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('citizen:create')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('citizen:create')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Đăng ký Khai sinh / Thêm mới</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Thực hiện quy trình thêm mới dữ liệu nhân khẩu vào hệ thống.
                        </div>
                      </div>
                      <UserPlus className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'citizen:create' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Khai sinh</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Thêm mới</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Xác thực</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Biểu mẫu • Kiểm tra dữ liệu • Gửi hồ sơ</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !canCreateCitizen}
                        onClick={() => navigate('/app/services/online', { state: { action: 'createCitizen' } })}
                      >
                        Thực hiện
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'citizen:update'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!(canUpdateCitizen || canDeleteCitizen) ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('citizen:update')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('citizen:update')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Điều chỉnh & Khai tử</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Cập nhật thông tin nhân thân hoặc thực hiện thủ tục xóa/khai tử hồ sơ.
                        </div>
                      </div>
                      <UserCog className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'citizen:update' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Cập nhật</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Khai tử</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Theo dõi</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Chỉnh sửa • Xóa hồ sơ • Lịch sử</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !(canUpdateCitizen || canDeleteCitizen)}
                        onClick={() => {
                          if (canUpdateCitizen) {
                            navigate('/app/services/online', { state: { action: 'editCitizen' } })
                            return
                          }
                          navigate('/app/citizens')
                        }}
                      >
                        Truy cập dịch vụ
                      </button>
                    </div>
                  </div>
                </>
              ) : activeModuleTab === 'hokhau' ? (
                <>
                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'hokhau:list'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!canViewHoKhau ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('hokhau:list')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('hokhau:list')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Tra cứu Sổ hộ khẩu</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Quản lý danh sách sổ hộ khẩu, xem chi tiết thành viên và chủ hộ.
                        </div>
                      </div>
                      <Book className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'hokhau:list' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Hộ khẩu: 2,930</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Toàn trình: 1,572</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Một phần: 1,358</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Danh sách • Chi tiết • Thành viên</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !canViewHoKhau}
                        onClick={() => navigate('/app/hokhau')}
                      >
                        Truy cập dịch vụ
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'hokhau:create'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!canCreateHoKhau ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('hokhau:create')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('hokhau:create')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Cấp mới Sổ hộ khẩu</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Thực hiện thủ tục cấp cuốn sổ hộ khẩu mới cho hộ gia đình.
                        </div>
                      </div>
                      <FilePlus2 className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'hokhau:create' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Cấp mới</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Chủ hộ</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Thành viên</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Tạo sổ • Gán chủ hộ • Thêm thành viên</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !canCreateHoKhau}
                        onClick={() => navigate('/app/hokhau/new')}
                      >
                        Thực hiện
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'hokhau:update'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } ${!canUpdateHoKhau ? 'opacity-55' : 'hover:shadow-sm'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('hokhau:update')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('hokhau:update')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Biến động Hộ khẩu</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Tách hộ, nhập hộ, chuyển hộ khẩu hoặc thay đổi chủ hộ.
                        </div>
                      </div>
                      <GitBranch className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'hokhau:update' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Chuyển hộ</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Tách/Nhập</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Đổi chủ hộ</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Transfer • Split/Join • Owner</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="w-full rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        disabled={!auth.isAuthenticated || !canUpdateHoKhau}
                        onClick={() => navigate('/app/hokhau')}
                      >
                        Truy cập dịch vụ
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          Quản lý Hệ thống &amp; Cán bộ - Chỉ dành riêng cho Super Admin
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          Truy cập bảng điều khiển quản trị để cập nhật cán bộ, vai trò và ma trận quyền.
                        </div>
                      </div>
                      <ShieldCheck className="h-6 w-6 text-slate-700" />
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'staff:accounts'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } hover:shadow-sm`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('staff:accounts')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('staff:accounts')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Tài khoản Cán bộ</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Quản lý danh sách tài khoản cơ quan một cửa, thực hiện khóa/mở trạng thái Stateful.
                        </div>
                      </div>
                      <Users className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'staff:accounts' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Stateful</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Khoá/Mở</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Audit</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Danh sách • Trạng thái • Theo dõi</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link
                        to="/app/admin/control"
                        state={{ tab: 'accounts' }}
                        className="block w-full rounded-xl bg-[#BC5133] px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-[#a9482e]"
                      >
                        Truy cập dịch vụ
                      </Link>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'staff:roles'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } hover:shadow-sm`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('staff:roles')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('staff:roles')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Gán Vai trò</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Điều chỉnh chức vụ, cấp chức danh Cán bộ Hộ khẩu, Công an địa bàn hoặc Lãnh đạo Phường.
                        </div>
                      </div>
                      <Settings className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'staff:roles' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">SUPER_ADMIN</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Cán bộ</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Lãnh đạo</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Tạo role • Gán role • Quản lý quyền</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link
                        to="/app/admin/control"
                        state={{ tab: 'roles' }}
                        className="block w-full rounded-xl bg-[#BC5133] px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-[#a9482e]"
                      >
                        Thực hiện
                      </Link>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                      activeCardKey === 'staff:matrix'
                        ? 'border-[#EABF55] bg-[#F3C062] shadow-sm ring-2 ring-[#EABF55]/40'
                        : 'border-slate-200 bg-white'
                    } hover:shadow-sm`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCardKey('staff:matrix')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveCardKey('staff:matrix')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Ma trận Quyền hạn</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Bật/Tắt công tắc phân quyền chi tiết cho từng nhóm chức năng (Permission Matrix).
                        </div>
                      </div>
                      <KeyRound className="h-7 w-7 text-slate-900/75" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCardKey === 'staff:matrix' ? (
                        <>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Role</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Permission</span>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-900">Toggle</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600/80">Ma trận • Nhóm quyền • Lưu cấu hình</span>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link
                        to="/app/admin/control"
                        state={{ tab: 'matrix' }}
                        className="block w-full rounded-xl bg-[#BC5133] px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-[#a9482e]"
                      >
                        Truy cập dịch vụ
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-6xl">
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-900">CÔNG DÂN</div>
                <div className="mt-1 text-sm text-slate-600">Danh mục dịch vụ dành cho công dân theo quyền.</div>
              </div>
              <Users className="h-6 w-6 text-slate-700" />
            </div>

            {!auth.isAuthenticated ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Đăng nhập để hiển thị các nghiệp vụ theo phân quyền (RBAC).
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {auth.isAuthenticated && canViewCitizens ? (
                <ActionRow
                  icon={<Users className="h-5 w-5" />}
                  title="Tra cứu nhân khẩu / Danh sách"
                  desc="GET /api/v1/users"
                  to="/app/citizens"
                />
              ) : null}
              {auth.isAuthenticated && canCreateCitizen ? (
                <ActionRow
                  icon={<FilePlus2 className="h-5 w-5" />}
                  title="Khai báo công dân mới"
                  desc="POST /api/v1/users"
                  to="/app/services/online"
                />
              ) : null}
              {auth.isAuthenticated && canViewHoKhau ? (
                <ActionRow
                  icon={<Home className="h-5 w-5" />}
                  title="Tra cứu sổ hộ khẩu"
                  desc="GET /api/v1/hokhau"
                  to="/app/hokhau"
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-900">DOANH NGHIỆP</div>
                <div className="mt-1 text-sm text-slate-600">Danh mục dịch vụ dành cho doanh nghiệp (đang hoàn thiện).</div>
              </div>
              <Building2 className="h-6 w-6 text-slate-700" />
            </div>
            <div className="mt-4 space-y-3">
              <ActionRow
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                title="Thủ tục đăng ký kinh doanh"
                desc="Tra cứu & nộp hồ sơ (placeholder)"
                disabled
              />
              <ActionRow
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Bảo hiểm xã hội"
                desc="Tra cứu trạng thái, lịch sử đóng (placeholder)"
                disabled
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
