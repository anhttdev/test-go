import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Shield, User, Users } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import type { Citizen, CitizenForm } from '../lib/domain'
import { DEFAULT_CITIZEN_FORM, getCitizenEmail, mapCitizenToForm } from '../lib/domain'
import { ApiRequestError } from '../lib/api'
import { createCitizen, deleteCitizen, getCitizenById, listCitizens, updateCitizen } from '../api/citizens'
import { listHoKhau } from '../api/hokhau'
import type { HoKhau } from '../api/hokhau'

function formatBigNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatCount(value: number) {
  if (!Number.isFinite(value)) return '—'
  return formatBigNumber(value)
}

function normalize(value?: string) {
  return (value ?? '').trim()
}

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="text-base font-extrabold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#BC5133] ${props.className ?? ''}`}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133] ${props.className ?? ''}`}
    />
  )
}

function WarningBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      {message}
    </div>
  )
}

export function OnlinePublicServicesPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const canViewCitizens = auth.hasAnyPermission(['nguoi_dan:view', 'nguoi_dan:view_detail'])
  const canCreateCitizen = auth.hasPermission('nguoi_dan:create')
  const canUpdateCitizen = auth.hasPermission('nguoi_dan:update')
  const canDeleteCitizen = auth.hasPermission('nguoi_dan:delete')
  const canViewHoKhau = auth.hasAnyPermission(['ho_khau:view', 'ho_khau:view_detail'])

  const [activeSubNav, setActiveSubNav] = useState<
    'dvc_truc_tuyen' | 'tthc' | 'noi_bat' | 'tra_cuu' | 'toa_an' | 'faq'
  >('dvc_truc_tuyen')

  const [keyword, setKeyword] = useState('')
  const [filterCoQuan, setFilterCoQuan] = useState('')
  const [filterHanhChinh, setFilterHanhChinh] = useState('')
  const [filterLoaiThoiGian, setFilterLoaiThoiGian] = useState('')
  const [filterDoiTuong, setFilterDoiTuong] = useState('')
  const [filterMucDo, setFilterMucDo] = useState('')

  const [orgTab, setOrgTab] = useState<'bo_nganh' | 'tinh_thanh' | 'khac'>('bo_nganh')

  const [citizens, setCitizens] = useState<Citizen[]>(() => [
    { id: 12, ma_so: '012345678901', ho_ten: 'Nguyễn Văn A', so_cccd: '012345678901', so_dien_thoai: '0901234567', gmail: 'a@gmail.com' },
    { id: 13, ma_so: '098765432109', ho_ten: 'Trần Thị B', so_cccd: '098765432109', so_dien_thoai: '0912345678', gmail: 'b@gmail.com' },
    { id: 14, ma_so: '111222333444', ho_ten: 'Lê Văn C', so_cccd: '111222333444', so_dien_thoai: '0923456789', gmail: 'c@gmail.com' },
  ])
  const [isLoadingCitizens, setIsLoadingCitizens] = useState(false)
  const [hoKhaus, setHoKhaus] = useState<HoKhau[]>([])
  const [isLoadingHoKhau, setIsLoadingHoKhau] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CitizenForm>(DEFAULT_CITIZEN_FORM)
  const [isSavingCreate, setIsSavingCreate] = useState(false)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailCitizen, setDetailCitizen] = useState<Citizen | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState<CitizenForm>(DEFAULT_CITIZEN_FORM)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false)
  const [editPromptId, setEditPromptId] = useState('')

  const orgTable = useMemo(() => {
    if (orgTab === 'tinh_thanh') {
      return [
        { name: 'Hà Nội', total: 280, fullEligible: 140, fullProvided: 110, partialProvided: 120, notProvided: 50 },
        { name: 'TP. Hồ Chí Minh', total: 310, fullEligible: 160, fullProvided: 120, partialProvided: 140, notProvided: 50 },
        { name: 'Đà Nẵng', total: 180, fullEligible: 90, fullProvided: 70, partialProvided: 85, notProvided: 25 },
      ]
    }
    if (orgTab === 'khac') {
      return [
        { name: 'Cơ quan khác A', total: 90, fullEligible: 60, fullProvided: 30, partialProvided: 40, notProvided: 20 },
        { name: 'Cơ quan khác B', total: 75, fullEligible: 45, fullProvided: 22, partialProvided: 33, notProvided: 20 },
      ]
    }
    return [
      { name: 'Bộ Công an', total: 220, fullEligible: 120, fullProvided: 90, partialProvided: 95, notProvided: 35 },
      { name: 'Bộ Tư pháp', total: 165, fullEligible: 88, fullProvided: 72, partialProvided: 70, notProvided: 23 },
      { name: 'Bộ Y tế', total: 210, fullEligible: 102, fullProvided: 80, partialProvided: 95, notProvided: 35 },
    ]
  }, [orgTab])

  const citizenStats = useMemo(() => {
    const total = citizens.length
    const withCCCD = citizens.filter((c) => normalize(c.so_cccd)).length
    const withoutCCCD = Math.max(0, total - withCCCD)
    return { total, withCCCD, withoutCCCD }
  }, [citizens])

  const hoKhauStats = useMemo(() => {
    const total = hoKhaus.length
    const withMembers = hoKhaus.filter((hk) => (hk.thanh_viens?.length ?? 0) > 0).length
    const empty = Math.max(0, total - withMembers)
    return { total, withMembers, empty }
  }, [hoKhaus])

  const permissionsLabel = useMemo(() => {
    if (!auth.isAuthenticated) return '—'
    if (auth.permissions.has('*')) return 'ALL'
    return formatCount(auth.permissions.size)
  }, [auth.isAuthenticated, auth.permissions])

  const rolesCount = useMemo(() => {
    if (!auth.isAuthenticated) return 0
    return (auth.profile?.roles ?? []).length
  }, [auth.isAuthenticated, auth.profile?.roles])

  useEffect(() => {
    async function loadInitialCitizens() {
      if (!auth.isAuthenticated) return
      if (!canViewCitizens) return
      setIsLoadingCitizens(true)
      setWarning(null)
      try {
        const list = await listCitizens({ name: '', maso: '', page: '1', size: '2000', sort: 'asc' })
        if (Array.isArray(list) && list.length) {
          setCitizens(list)
        }
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 403) {
          setWarning('Bạn không được cấp quyền thực hiện thao tác hành chính này!')
          return
        }
      } finally {
        setIsLoadingCitizens(false)
      }
    }

    queueMicrotask(() => void loadInitialCitizens())
  }, [auth.isAuthenticated, canViewCitizens])

  useEffect(() => {
    async function loadInitialHoKhau() {
      if (!auth.isAuthenticated) return
      if (!canViewHoKhau) return
      setIsLoadingHoKhau(true)
      try {
        const payload = await listHoKhau()
        setHoKhaus(payload.data ?? [])
      } catch {
      } finally {
        setIsLoadingHoKhau(false)
      }
    }
    queueMicrotask(() => void loadInitialHoKhau())
  }, [auth.isAuthenticated, canViewHoKhau])

  useEffect(() => {
    const state = location.state as { action?: string } | null
    const action = state?.action
    if (!action) return

    if (action === 'createCitizen') {
      if (auth.isAuthenticated && canCreateCitizen) {
        setWarning(null)
        setIsCreateOpen(true)
      }
      navigate(location.pathname, { replace: true, state: null })
      return
    }

    if (action === 'editCitizen') {
      if (auth.isAuthenticated && canUpdateCitizen) {
        setWarning(null)
        setIsEditPromptOpen(true)
      }
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [auth.isAuthenticated, canCreateCitizen, canUpdateCitizen, location.pathname, location.state, navigate])

  async function openDetail(id: number, startEdit = false) {
    if (!auth.isAuthenticated) return
    if (!canViewCitizens) return
    setWarning(null)
    setIsDetailOpen(true)
    setDetailId(id)
    setIsEditMode(false)
    setDetailCitizen(null)
    setIsLoadingDetail(true)
    try {
      const citizen = await getCitizenById(id)
      setDetailCitizen(citizen)
      setEditForm(mapCitizenToForm(citizen))
      if (startEdit && canUpdateCitizen) {
        setIsEditMode(true)
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setWarning('Bạn không được cấp quyền thực hiện thao tác hành chính này!')
      }
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function handleCreate() {
    if (!auth.isAuthenticated) return
    if (!canCreateCitizen) return

    const payload: CitizenForm = {
      ma_so: normalize(createForm.ma_so),
      ho_ten: normalize(createForm.ho_ten),
      so_cccd: normalize(createForm.so_cccd),
      so_dien_thoai: normalize(createForm.so_dien_thoai),
      gmail: normalize(createForm.gmail),
    }

    if (!payload.ma_so || !payload.ho_ten) return

    setIsSavingCreate(true)
    setWarning(null)
    try {
      await createCitizen(payload)
      setIsCreateOpen(false)
      setCreateForm(DEFAULT_CITIZEN_FORM)
      try {
        if (canViewCitizens) {
          const list = await listCitizens({ name: '', maso: '', page: '1', size: '10', sort: 'asc' })
          setCitizens(list)
        } else {
          setCitizens((current) => [{ ...payload, id: Date.now() }, ...current])
        }
      } catch {
        setCitizens((current) => [{ ...payload, id: Date.now() }, ...current])
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setWarning('Bạn không được cấp quyền thực hiện thao tác hành chính này!')
      }
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function handleSaveEdit() {
    if (!auth.isAuthenticated) return
    if (!canUpdateCitizen) return
    if (!detailId) return

    const payload: CitizenForm = {
      ma_so: normalize(editForm.ma_so),
      ho_ten: normalize(editForm.ho_ten),
      so_cccd: normalize(editForm.so_cccd),
      so_dien_thoai: normalize(editForm.so_dien_thoai),
      gmail: normalize(editForm.gmail),
    }

    setIsSavingEdit(true)
    setWarning(null)
    try {
      const updated = await updateCitizen(detailId, payload)
      setDetailCitizen(updated)
      setIsEditMode(false)
      setCitizens((current) => current.map((c) => ((c.id ?? -1) === detailId ? { ...c, ...updated } : c)))
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setWarning('Bạn không được cấp quyền thực hiện thao tác hành chính này!')
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDelete(id: number) {
    if (!auth.isAuthenticated) return
    if (!canDeleteCitizen) return
    const ok = window.confirm('Xác nhận xoá/khai tử hồ sơ công dân? Thao tác này không thể hoàn tác.')
    if (!ok) return

    setIsDeleting(true)
    setWarning(null)
    try {
      await deleteCitizen(id)
      setCitizens((current) => current.filter((c) => (c.id ?? -1) !== id))
      if (detailId === id) {
        setIsDetailOpen(false)
        setDetailId(null)
        setDetailCitizen(null)
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setWarning('Bạn không được cấp quyền thực hiện thao tác hành chính này!')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  function resetDetail() {
    setIsDetailOpen(false)
    setDetailId(null)
    setDetailCitizen(null)
    setIsEditMode(false)
    setWarning(null)
  }

  function resetCreate() {
    setIsCreateOpen(false)
    setCreateForm(DEFAULT_CITIZEN_FORM)
    setWarning(null)
  }

  function resetEditPrompt() {
    setIsEditPromptOpen(false)
    setEditPromptId('')
    setWarning(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold text-slate-500">
        <Link to="/app/dashboard" className="hover:text-slate-700">
          Cổng Dịch vụ công quốc gia
        </Link>{' '}
        <span className="text-slate-400">{'>'}</span> <span>Dịch vụ công trực tuyến</span>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <div className="flex min-w-[820px] items-center gap-1 px-2 py-2">
          {[
            { key: 'dvc_truc_tuyen', label: 'Dịch vụ công trực tuyến' },
            { key: 'tthc', label: 'Thủ tục hành chính' },
            { key: 'noi_bat', label: 'Dịch vụ công nổi bật' },
            { key: 'tra_cuu', label: 'Tra cứu hồ sơ' },
            { key: 'toa_an', label: 'Tòa án nhân dân' },
            { key: 'faq', label: 'Câu hỏi thường gặp' },
          ].map((item) => {
            const active = activeSubNav === (item.key as typeof activeSubNav)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSubNav(item.key as typeof activeSubNav)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                  active ? 'bg-[#BC5133] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Nhập từ khóa tìm kiếm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-5">
              <Select value={filterCoQuan} onChange={(e) => setFilterCoQuan(e.target.value)}>
                <option value="">Cơ quan thực hiện</option>
                <option value="bca">Bộ Công an</option>
                <option value="btp">Bộ Tư pháp</option>
              </Select>
              <Select value={filterHanhChinh} onChange={(e) => setFilterHanhChinh(e.target.value)}>
                <option value="">Đơn vị hành chính</option>
                <option value="hn">Hà Nội</option>
                <option value="hcm">TP. Hồ Chí Minh</option>
              </Select>
              <Select value={filterLoaiThoiGian} onChange={(e) => setFilterLoaiThoiGian(e.target.value)}>
                <option value="">Loại thời gian</option>
                <option value="30d">30 ngày</option>
                <option value="90d">90 ngày</option>
              </Select>
              <Select value={filterDoiTuong} onChange={(e) => setFilterDoiTuong(e.target.value)}>
                <option value="">Đối tượng thực hiện</option>
                <option value="cd">Công dân</option>
                <option value="dn">Doanh nghiệp</option>
              </Select>
              <Select value={filterMucDo} onChange={(e) => setFilterMucDo(e.target.value)}>
                <option value="">Mức độ Dịch vụ công</option>
                <option value="toan_trinh">Toàn trình</option>
                <option value="mot_phan">Một phần</option>
              </Select>
            </div>
          </div>

          <div className="md:pt-0">
            <button
              type="button"
              className="w-full rounded-2xl bg-[#BC5133] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#a9482e] md:w-auto"
              onClick={() => {
                if (keyword.trim()) {
                  window.dispatchEvent(
                    new CustomEvent('app:toast', {
                      detail: { type: 'info', message: `Tìm kiếm: "${keyword.trim()}" (UI demo)` },
                    }),
                  )
                }
              }}
            >
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Công dân</div>
              <div className="mt-1 text-3xl font-black text-slate-900">
                {isLoadingCitizens ? '…' : auth.isAuthenticated && canViewCitizens ? formatCount(citizenStats.total) : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <User className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Có CCCD</div>
              <div className="mt-1 font-extrabold text-slate-900">
                {auth.isAuthenticated && canViewCitizens ? formatCount(citizenStats.withCCCD) : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Chưa có CCCD</div>
              <div className="mt-1 font-extrabold text-slate-900">
                {auth.isAuthenticated && canViewCitizens ? formatCount(citizenStats.withoutCCCD) : '—'}
              </div>
            </div>
          </div>
          {!auth.isAuthenticated || !canViewCitizens ? (
            <div className="mt-3 text-sm text-slate-600">Chưa có quyền xem thống kê công dân.</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Hộ khẩu</div>
              <div className="mt-1 text-3xl font-black text-slate-900">
                {isLoadingHoKhau ? '…' : auth.isAuthenticated && canViewHoKhau ? formatCount(hoKhauStats.total) : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Home className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Có thành viên</div>
              <div className="mt-1 font-extrabold text-slate-900">
                {auth.isAuthenticated && canViewHoKhau ? formatCount(hoKhauStats.withMembers) : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">Trống</div>
              <div className="mt-1 font-extrabold text-slate-900">
                {auth.isAuthenticated && canViewHoKhau ? formatCount(hoKhauStats.empty) : '—'}
              </div>
            </div>
          </div>
          {!auth.isAuthenticated || !canViewHoKhau ? (
            <div className="mt-3 text-sm text-slate-600">Chưa có quyền xem thống kê hộ khẩu.</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Quyền được cấp</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{permissionsLabel}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">Nguồn: GET /api/v1/users/permissions</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Vai trò</div>
              <div className="mt-1 text-3xl font-black text-slate-900">
                {auth.isAuthenticated ? formatCount(rolesCount) : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">Nguồn: GET /api/v1/users/roles</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">CÔNG DÂN • Quản lý hồ sơ Người dân</div>
            <div className="mt-1 text-sm text-slate-600">
              CRUD hồ sơ công dân (modal) • Mapping API: POST/GET/PUT/DELETE /api/v1/users
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreateCitizen ? (
              <button
                type="button"
                className="rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e]"
                onClick={() => {
                  setWarning(null)
                  setIsCreateOpen(true)
                }}
              >
                + Khai báo công dân mới
              </button>
            ) : null}
          </div>
        </div>

        {warning ? (
          <div className="mt-4">
            <WarningBox message={warning} />
          </div>
        ) : null}

        <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-[860px] w-full border-collapse bg-white">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-extrabold text-slate-700">
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Mã số</th>
                <th className="px-4 py-3">CCCD</th>
                <th className="px-4 py-3">Điện thoại</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className={isLoadingCitizens ? 'opacity-60' : ''}>
              {citizens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-sm text-slate-600">
                    {isLoadingCitizens ? 'Đang tải dữ liệu…' : 'Chưa có dữ liệu.'}
                  </td>
                </tr>
              ) : (
                citizens.map((c) => (
                  <tr
                    key={c.id ?? c.ma_so}
                    className={`border-t border-slate-100 text-sm text-slate-800 ${canViewCitizens ? 'hover:bg-slate-50' : ''}`}
                    onClick={() => {
                      if (!canViewCitizens || !c.id) return
                      void openDetail(c.id)
                    }}
                  >
                    <td className="px-4 py-3 font-semibold">{c.ho_ten}</td>
                    <td className="px-4 py-3 font-mono">{c.ma_so}</td>
                    <td className="px-4 py-3 font-mono">{c.so_cccd}</td>
                    <td className="px-4 py-3 font-mono">{c.so_dien_thoai}</td>
                    <td className="px-4 py-3">{getCitizenEmail(c)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {canViewCitizens && c.id ? (
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                            onClick={() => void openDetail(c.id!)}
                          >
                            Chi tiết
                          </button>
                        ) : null}
                        {canDeleteCitizen && c.id ? (
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            disabled={isDeleting}
                            onClick={() => void handleDelete(c.id!)}
                          >
                            Xóa/Khai tử
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!auth.isAuthenticated ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Bạn đang ở chế độ khách. Hãy đăng nhập để thực hiện các thao tác hành chính theo phân quyền.
          </div>
        ) : !canViewCitizens ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Tài khoản chưa được cấp quyền <span className="font-extrabold">nguoi_dan:view</span>. Bảng đang hiển thị dữ liệu demo.
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Thống kê theo cơ quan</div>
            <div className="mt-1 text-sm text-slate-600">Bảng mẫu theo bố cục hành chính.</div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { key: 'bo_nganh', label: 'Bộ, cơ quan ngang Bộ' },
              { key: 'tinh_thanh', label: 'Tỉnh, Thành phố' },
              { key: 'khac', label: 'Cơ quan khác' },
            ].map((tab) => {
              const active = orgTab === (tab.key as typeof orgTab)
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setOrgTab(tab.key as typeof orgTab)}
                  className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                    active ? 'bg-[#BC5133] text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-[1100px] w-full border-collapse bg-white">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-extrabold text-slate-700">
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Số TTHC</th>
                <th className="px-4 py-3">Số TTHC đủ điều kiện cung cấp DVC toàn trình</th>
                <th className="px-4 py-3">Số TTHC đã cung cấp DVC trực tuyến toàn trình</th>
                <th className="px-4 py-3">Số TTHC đã cung cấp DVC trực tuyến một phần</th>
                <th className="px-4 py-3">Số TTHC chưa cung cấp DVCTI</th>
              </tr>
            </thead>
            <tbody>
              {orgTable.map((row) => (
                <tr key={row.name} className="border-t border-slate-100 text-sm text-slate-800 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{row.name}</td>
                  <td className="px-4 py-3 font-mono">{row.total}</td>
                  <td className="px-4 py-3 font-mono">{row.fullEligible}</td>
                  <td className="px-4 py-3 font-mono">{row.fullProvided}</td>
                  <td className="px-4 py-3 font-mono">{row.partialProvided}</td>
                  <td className="px-4 py-3 font-mono">{row.notProvided}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={isEditPromptOpen}
        title="Cập nhật hồ sơ công dân"
        subtitle="Nhập ID để mở chi tiết và chuyển sang chế độ chỉnh sửa"
        onClose={() => resetEditPrompt()}
      >
        {warning ? (
          <div className="mb-4">
            <WarningBox message={warning} />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Citizen ID">
            <TextInput
              inputMode="numeric"
              placeholder="Ví dụ: 12"
              value={editPromptId}
              onChange={(e) => setEditPromptId(e.target.value)}
            />
          </Field>
          <div className="hidden md:block" />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            onClick={() => resetEditPrompt()}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
            disabled={!editPromptId.trim() || !canUpdateCitizen}
            onClick={() => {
              const parsed = Number(editPromptId.trim())
              if (!Number.isFinite(parsed) || parsed <= 0) return
              resetEditPrompt()
              void openDetail(parsed, true)
            }}
          >
            Mở hồ sơ
          </button>
        </div>
      </Modal>

      <Modal
        open={isCreateOpen}
        title="Khai báo công dân mới"
        subtitle="POST /api/v1/users"
        onClose={() => resetCreate()}
      >
        {warning ? (
          <div className="mb-4">
            <WarningBox message={warning} />
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mã số (ma_so)">
            <TextInput value={createForm.ma_so} onChange={(e) => setCreateForm((p) => ({ ...p, ma_so: e.target.value }))} />
          </Field>
          <Field label="Họ tên (ho_ten)">
            <TextInput value={createForm.ho_ten} onChange={(e) => setCreateForm((p) => ({ ...p, ho_ten: e.target.value }))} />
          </Field>
          <Field label="Số CCCD (so_cccd)">
            <TextInput value={createForm.so_cccd} onChange={(e) => setCreateForm((p) => ({ ...p, so_cccd: e.target.value }))} />
          </Field>
          <Field label="Số điện thoại (so_dien_thoai)">
            <TextInput
              value={createForm.so_dien_thoai}
              onChange={(e) => setCreateForm((p) => ({ ...p, so_dien_thoai: e.target.value }))}
            />
          </Field>
          <Field label="Email (gmail/email)">
            <TextInput value={createForm.gmail} onChange={(e) => setCreateForm((p) => ({ ...p, gmail: e.target.value }))} />
          </Field>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            onClick={() => resetCreate()}
            disabled={isSavingCreate}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
            onClick={() => void handleCreate()}
            disabled={!canCreateCitizen || isSavingCreate}
          >
            {isSavingCreate ? 'Đang lưu…' : 'Tạo hồ sơ'}
          </button>
        </div>
      </Modal>

      <Modal
        open={isDetailOpen}
        title="Chi tiết hồ sơ công dân"
        subtitle={detailId ? `GET /api/v1/users/${detailId}` : 'GET /api/v1/users/:id'}
        onClose={() => resetDetail()}
      >
        {warning ? (
          <div className="mb-4">
            <WarningBox message={warning} />
          </div>
        ) : null}

        {isLoadingDetail ? (
          <div className="text-sm font-semibold text-slate-700">Đang tải dữ liệu…</div>
        ) : !detailCitizen ? (
          <div className="text-sm text-slate-700">Không có dữ liệu.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã số (ma_so)">
                <TextInput
                  value={isEditMode ? editForm.ma_so : detailCitizen.ma_so}
                  onChange={(e) => setEditForm((p) => ({ ...p, ma_so: e.target.value }))}
                  disabled={!isEditMode}
                />
              </Field>
              <Field label="Họ tên (ho_ten)">
                <TextInput
                  value={isEditMode ? editForm.ho_ten : detailCitizen.ho_ten}
                  onChange={(e) => setEditForm((p) => ({ ...p, ho_ten: e.target.value }))}
                  disabled={!isEditMode}
                />
              </Field>
              <Field label="Số CCCD (so_cccd)">
                <TextInput
                  value={isEditMode ? editForm.so_cccd : detailCitizen.so_cccd}
                  onChange={(e) => setEditForm((p) => ({ ...p, so_cccd: e.target.value }))}
                  disabled={!isEditMode}
                />
              </Field>
              <Field label="Số điện thoại (so_dien_thoai)">
                <TextInput
                  value={isEditMode ? editForm.so_dien_thoai : detailCitizen.so_dien_thoai}
                  onChange={(e) => setEditForm((p) => ({ ...p, so_dien_thoai: e.target.value }))}
                  disabled={!isEditMode}
                />
              </Field>
              <Field label="Email (gmail/email)">
                <TextInput
                  value={isEditMode ? editForm.gmail : getCitizenEmail(detailCitizen)}
                  onChange={(e) => setEditForm((p) => ({ ...p, gmail: e.target.value }))}
                  disabled={!isEditMode}
                />
              </Field>
              <Field label="Trạng thái (placeholder)">
                <TextInput value="Đang hoạt động" disabled />
              </Field>
              <Field label="Địa chỉ (placeholder)">
                <TextInput value="—" disabled />
              </Field>
            </div>

            <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                {canUpdateCitizen ? (
                  !isEditMode ? (
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                      onClick={() => setIsEditMode(true)}
                    >
                      Chỉnh sửa hồ sơ
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                        onClick={() => {
                          setIsEditMode(false)
                          setEditForm(mapCitizenToForm(detailCitizen))
                        }}
                        disabled={isSavingEdit}
                      >
                        Hủy chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                        onClick={() => void handleSaveEdit()}
                        disabled={isSavingEdit}
                      >
                        {isSavingEdit ? 'Đang lưu…' : 'Lưu thay đổi'}
                      </button>
                    </>
                  )
                ) : null}
              </div>

              {canDeleteCitizen && detailCitizen.id ? (
                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={() => void handleDelete(detailCitizen.id!)}
                >
                  Xóa/Khai tử
                </button>
              ) : null}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
