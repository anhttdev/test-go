import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  KeyRound,
  LayoutGrid,
  Pencil,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { ApiRequestError, requestApi } from '../lib/api'
import { useToast } from '../ui/toast'
import { assignPermissionsToRole, createRole, listPermissions, listRoles } from '../api/admin'
import type { Permission, Role } from '../api/admin'

type AdminTab = 'accounts' | 'roles' | 'matrix'

type AccountRow = {
  id: number
  username: string
  user?: { id?: number; ho_ten?: string; ma_so?: string } | null
  roles: { id: number; role_code: string; role_name: string }[]
  is_active: boolean
}

function normalize(value?: string) {
  return (value ?? '').trim()
}

function roleLabel(role: { role_code?: string; role_name?: string }) {
  return normalize(role.role_name) || normalize(role.role_code) || 'Role'
}

function groupKey(permissionCode: string) {
  const code = normalize(permissionCode)
  if (!code) return 'khac'
  const parts = code.split(':')
  return parts[0] || 'khac'
}

function sortByPermissionCode(a: Permission, b: Permission) {
  return a.permission_code.localeCompare(b.permission_code)
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-extrabold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-50" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function AdminControlPanelPage() {
  const auth = useAuth()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const isSuperAdmin = useMemo(() => {
    const roleCodes = (auth.profile?.roles ?? []).map((r) => normalize(r.role_code ?? r.roleCode)).filter(Boolean)
    return auth.permissions.has('*') || auth.permissions.has('SUPER_ADMIN') || roleCodes.includes('SUPER_ADMIN')
  }, [auth.permissions, auth.profile?.roles])

  const [tab, setTab] = useState<AdminTab>('accounts')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [focusedRoleId, setFocusedRoleId] = useState<number | null>(null)

  const [accounts, setAccounts] = useState<AccountRow[]>(() => [
    {
      id: 1,
      username: 'superadmin',
      user: { id: 12, ho_ten: 'Quản trị hệ thống', ma_so: '000000000001' },
      roles: [{ id: 1, role_code: 'SUPER_ADMIN', role_name: 'Quản trị hệ thống' }],
      is_active: true,
    },
    {
      id: 2,
      username: 'canbo_hokhau',
      user: { id: 13, ho_ten: 'Cán bộ Hộ khẩu', ma_so: '000000000002' },
      roles: [{ id: 2, role_code: 'CAN_BO_HO_KHAU', role_name: 'Cán bộ hộ khẩu' }],
      is_active: true,
    },
    {
      id: 3,
      username: 'lanhdao_phuong',
      user: { id: 14, ho_ten: 'Lãnh đạo Phường', ma_so: '000000000003' },
      roles: [{ id: 3, role_code: 'LANH_DAO_PHUONG', role_name: 'Lãnh đạo Phường' }],
      is_active: true,
    },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assignAccount, setAssignAccount] = useState<AccountRow | null>(null)
  const [assignSelected, setAssignSelected] = useState<Set<number>>(new Set())
  const assignRef = useRef<HTMLDivElement | null>(null)

  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [createRoleForm, setCreateRoleForm] = useState({ role_code: '', role_name: '', description: '' })
  const [isSavingRole, setIsSavingRole] = useState(false)

  const [rolePerms, setRolePerms] = useState<Map<number, Set<number>>>(new Map())

  const [isRolePermOpen, setIsRolePermOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [editingSelectedPermIds, setEditingSelectedPermIds] = useState<Set<number>>(new Set())
  const [scrollToPermId, setScrollToPermId] = useState<number | null>(null)
  const [isSavingRolePerms, setIsSavingRolePerms] = useState(false)

  useEffect(() => {
    const state = location.state as { tab?: AdminTab } | null
    const nextTab = state?.tab
    if (!nextTab) return
    if (nextTab === 'accounts' || nextTab === 'roles' || nextTab === 'matrix') {
      setTab(nextTab)
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!isSuperAdmin) return
    async function load() {
      setIsLoading(true)
      setBanner(null)
      try {
        const [rolesRes, permsRes] = await Promise.all([listRoles(), listPermissions()])
        setRoles(rolesRes)
        setPermissions(permsRes.slice().sort(sortByPermissionCode))
        const nextPerms = new Map<number, Set<number>>()
        for (const r of rolesRes) {
          const ids = new Set<number>((r.permissions ?? []).map((p) => p.id))
          nextPerms.set(r.id, new Set(ids))
        }
        setRolePerms(nextPerms)
        if (focusedRoleId == null && rolesRes.length) setFocusedRoleId(rolesRes[0].id)
      } catch (error) {
        toast.push({
          type: 'error',
          title: 'Tải dữ liệu thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải roles/permissions.',
        })
      } finally {
        setIsLoading(false)
      }
    }
    queueMicrotask(() => void load())
  }, [focusedRoleId, isSuperAdmin, toast])

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!assignRef.current) return
      if (assignRef.current.contains(event.target as Node)) return
      setIsAssignOpen(false)
    }
    if (!isAssignOpen) return
    window.addEventListener('mousedown', onOutside)
    return () => window.removeEventListener('mousedown', onOutside)
  }, [isAssignOpen])

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    for (const p of permissions) {
      const key = groupKey(p.permission_code)
      const existing = groups.get(key) ?? []
      existing.push(p)
      groups.set(key, existing)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [permissions])

  const roleColumns = useMemo(() => roles.slice().sort((a, b) => a.role_code.localeCompare(b.role_code)), [roles])

  function openAssignRoles(account: AccountRow) {
    setBanner(null)
    setAssignAccount(account)
    const selected = new Set<number>(account.roles.map((r) => r.id))
    setAssignSelected(selected)
    setIsAssignOpen(true)
  }

  async function saveAssignRoles() {
    if (!assignAccount) return
    setBanner(null)
    try {
      await requestApi('/api/v1/admin/accounts/roles', {
        method: 'POST',
        body: JSON.stringify({ account_id: assignAccount.id, roles: Array.from(assignSelected) }),
      })
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== assignAccount.id) return a
          const nextRoles = roles.filter((r) => assignSelected.has(r.id)).map((r) => ({ id: r.id, role_code: r.role_code, role_name: r.role_name }))
          return { ...a, roles: nextRoles }
        }),
      )
      setIsAssignOpen(false)
      setBanner('Đồng bộ hệ thống thành công! Đã trục xuất bộ đệm cũ trên Redis. Quyền hạn mới của cán bộ sẽ có hiệu lực ngay lập tức.')
      toast.push({ type: 'success', title: 'Cập nhật vai trò', message: 'Đã cập nhật vai trò cho cán bộ.' })
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return
      toast.push({
        type: 'error',
        title: 'Không thể cập nhật vai trò',
        message: error instanceof Error ? error.message : 'Yêu cầu thất bại.',
      })
    }
  }

  async function submitCreateRole() {
    const role_code = normalize(createRoleForm.role_code)
    const role_name = normalize(createRoleForm.role_name)
    const description = normalize(createRoleForm.description)
    if (!role_code || !role_name) return
    setIsSavingRole(true)
    setBanner(null)
    try {
      await createRole({ role_code, role_name, description: description || undefined })
      toast.push({ type: 'success', title: 'Tạo vai trò', message: 'Đã tạo vai trò mới.' })
      setIsCreateRoleOpen(false)
      setCreateRoleForm({ role_code: '', role_name: '', description: '' })
      const next = await listRoles()
      setRoles(next)
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return
      toast.push({
        type: 'error',
        title: 'Tạo vai trò thất bại',
        message: error instanceof Error ? error.message : 'Không thể tạo vai trò.',
      })
    } finally {
      setIsSavingRole(false)
    }
  }

  function openRolePermissions(roleId: number, permId?: number) {
    const setForRole = rolePerms.get(roleId) ?? new Set<number>()
    setEditingRoleId(roleId)
    setEditingSelectedPermIds(new Set(setForRole))
    setScrollToPermId(typeof permId === 'number' ? permId : null)
    setIsRolePermOpen(true)
  }

  useEffect(() => {
    if (!isRolePermOpen) return
    if (!scrollToPermId) return
    const id = `perm-${scrollToPermId}`
    queueMicrotask(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ block: 'center' })
    })
  }, [isRolePermOpen, scrollToPermId])

  async function saveRolePermissions() {
    if (!editingRoleId) return
    setIsSavingRolePerms(true)
    setBanner(null)
    try {
      const ids = Array.from(editingSelectedPermIds)
      await assignPermissionsToRole(editingRoleId, ids)
      const nextRoles = await listRoles()
      setRoles(nextRoles)
      const nextPerms = new Map<number, Set<number>>()
      for (const r of nextRoles) {
        nextPerms.set(r.id, new Set((r.permissions ?? []).map((p) => p.id)))
      }
      setRolePerms(nextPerms)
      setIsRolePermOpen(false)
      setEditingRoleId(null)
      setScrollToPermId(null)
      setBanner('Đồng bộ hệ thống thành công! Đã trục xuất bộ đệm cũ trên Redis. Quyền hạn mới của cán bộ sẽ có hiệu lực ngay lập tức.')
      toast.push({ type: 'success', title: 'Cập nhật quyền', message: 'Đã cập nhật quyền hạn cho vai trò.' })
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return
      toast.push({
        type: 'error',
        title: 'Không thể cập nhật quyền',
        message: error instanceof Error ? error.message : 'Yêu cầu thất bại.',
      })
    } finally {
      setIsSavingRolePerms(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] rounded-3xl border border-slate-200 bg-white p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="mt-4 text-2xl font-black text-slate-900">403 Access Denied</div>
          <div className="mt-2 text-sm text-slate-700">Khu vực hạn chế dành riêng cho Quản trị viên tối cao!</div>
          <div className="mt-6">
            <Link to="/app/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e]">
              <LayoutGrid className="h-4 w-4" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black tracking-[0.14em] text-slate-500">ADMIN CONTROL PANEL</div>
            <div className="mt-1 text-2xl font-black text-slate-900">Quản lý Cán bộ &amp; Phân quyền</div>
            <div className="mt-1 text-sm text-slate-700">Chỉ hiển thị cho SUPER_ADMIN.</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              {normalize(auth.profile?.username) || '-'}
            </div>
          </div>
        </div>

        {banner ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            {banner}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                tab === 'accounts' ? 'border-[#BC5133] bg-[#BC5133] text-white shadow' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setTab('accounts')}
            >
              <Users className="h-4 w-4" />
              Danh sách Cán bộ
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                tab === 'roles' ? 'border-[#BC5133] bg-[#BC5133] text-white shadow' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setTab('roles')}
            >
              <Settings className="h-4 w-4" />
              Danh mục Vai trò
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                tab === 'matrix' ? 'border-[#BC5133] bg-[#BC5133] text-white shadow' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setTab('matrix')}
            >
              <KeyRound className="h-4 w-4" />
              Ma trận Quyền hạn
            </button>
          </div>

          {tab === 'matrix' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-bold text-slate-600">Vai trò đang chọn</div>
              <div className="relative">
                <select
                  className="w-[260px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133]"
                  value={focusedRoleId ?? ''}
                  onChange={(e) => setFocusedRoleId(Number(e.target.value))}
                >
                  {roleColumns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_code} • {roleLabel(r)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
              <div className="hidden text-xs font-semibold text-slate-600 md:block">Thay đổi được lưu ở thanh dưới.</div>
            </div>
          ) : null}

          {tab === 'roles' ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e]"
              onClick={() => setIsCreateRoleOpen(true)}
            >
              + Tạo vai trò mới
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          {tab === 'accounts' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full table-fixed bg-white text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-600">
                    <th className="w-[70px] px-4 py-3">ID</th>
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Nhân khẩu liên kết</th>
                    <th className="px-4 py-3">Vai trò hiện tại</th>
                    <th className="w-[140px] px-4 py-3">Trạng thái</th>
                    <th className="w-[170px] px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-bold text-slate-900">{a.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900">{a.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{a.user?.ho_ten ?? '-'}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{a.user?.ma_so ? `Mã số: ${a.user.ma_so}` : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {a.roles.length ? (
                            a.roles.map((r) => (
                              <span key={r.id} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">
                                {roleLabel(r)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold ${a.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                          {a.is_active ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                          onClick={() => openAssignRoles(a)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                          Cập nhật Vai trò
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                Dữ liệu bảng cán bộ đang dùng mock state. Khi backend mở endpoint quản trị account, UI sẽ tự dùng API.
              </div>
            </div>
          ) : null}

          {tab === 'roles' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roleColumns.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black tracking-wide text-slate-500">{r.role_code}</div>
                      <div className="mt-1 text-lg font-black text-slate-900">{roleLabel(r)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
                      <Settings className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{normalize(r.description) || '—'}</div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">{(r.permissions ?? []).length} quyền</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-3 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e]"
                      onClick={() => {
                        setFocusedRoleId(r.id)
                        openRolePermissions(r.id)
                      }}
                    >
                      Sửa quyền hạn
                      <KeyRound className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'matrix' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-extrabold text-slate-900">Ma trận quyền hạn</div>
                <div className="text-xs font-semibold text-slate-600">Chế độ xem • Bấm vào ô để chỉnh quyền cho từng vai trò</div>
              </div>

              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-[1180px] w-full border-separate border-spacing-0 bg-white text-sm">
                  <colgroup>
                    <col className="w-[380px]" />
                    {roleColumns.map((r) => (
                      <col key={r.id} className="w-[140px]" />
                    ))}
                  </colgroup>

                  <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                    <tr>
                      <th className="sticky left-0 z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-600">Quyền hạn</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">Permission code và mô tả tiếng Việt</div>
                      </th>
                      {roleColumns.map((r) => (
                        <th
                          key={r.id}
                          className={`border-b border-slate-200 px-3 py-3 text-left align-bottom ${
                            focusedRoleId === r.id ? 'bg-[#BC5133] text-white' : 'bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black">{roleLabel(r)}</div>
                            <div
                              className={`mt-1 font-mono text-[11px] font-semibold ${
                                focusedRoleId === r.id ? 'text-white/80' : 'text-slate-600'
                              }`}
                            >
                              {r.role_code}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {groupedPermissions.map(([group, perms]) => (
                      <>
                        <tr key={`g:${group}`}>
                          <td className="sticky left-0 z-10 border-b border-slate-200 bg-slate-100/80 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wide text-slate-700">{group}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                                {perms.length}
                              </span>
                            </div>
                          </td>
                          {roleColumns.map((r) => (
                            <td
                              key={`g:${group}:${r.id}`}
                              className={`border-b border-slate-200 bg-slate-100/80 px-2 py-3 ${
                                focusedRoleId === r.id ? 'shadow-[inset_0_0_0_9999px_rgba(188,81,51,0.06)]' : ''
                              }`}
                            />
                          ))}
                        </tr>

                        {perms.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
                              <div className="font-mono text-[12px] font-semibold text-slate-600">{p.permission_code}</div>
                              <div className="mt-1 text-sm font-extrabold text-slate-900">{p.permission_name}</div>
                            </td>

                            {roleColumns.map((r) => {
                              const enabled = rolePerms.get(r.id)?.has(p.id) ?? false
                              return (
                                <td
                                  key={`${p.id}:${r.id}`}
                                  className={`border-b border-slate-200 px-2 py-3 ${
                                    focusedRoleId === r.id ? 'shadow-[inset_0_0_0_9999px_rgba(188,81,51,0.06)]' : ''
                                  }`}
                                >
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 hover:bg-slate-50 ${
                                        enabled ? 'border-[#BC5133] bg-[#BC5133]/10' : 'border-slate-200 bg-white'
                                      }`}
                                      onClick={() => openRolePermissions(r.id, p.id)}
                                      aria-label={`${enabled ? 'Có' : 'Không'} quyền ${p.permission_code} cho ${r.role_code}`}
                                    >
                                      {enabled ? <Check className="h-4 w-4 text-[#BC5133]" /> : <span className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={isRolePermOpen}
        title="Cập nhật quyền cho vai trò"
        subtitle={
          editingRoleId
            ? (() => {
                const role = roles.find((r) => r.id === editingRoleId)
                if (!role) return `Role #${editingRoleId}`
                return `${roleLabel(role)} • ${role.role_code}`
              })()
            : undefined
        }
        onClose={() => {
          setIsRolePermOpen(false)
          setEditingRoleId(null)
          setScrollToPermId(null)
        }}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Ma trận chỉ hiển thị quyền. Để chỉnh sửa, hãy tick chọn trong cửa sổ này rồi bấm “Lưu quyền”.
          </div>

          <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
            {groupedPermissions.map(([group, perms]) => (
              <div key={group} className="border-b border-slate-200 last:border-b-0">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-700">{group}</div>
                  <div className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">{perms.length}</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {perms.map((p) => {
                    const checked = editingSelectedPermIds.has(p.id)
                    return (
                      <label
                        key={p.id}
                        id={`perm-${p.id}`}
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[#BC5133]"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(editingSelectedPermIds)
                            if (e.target.checked) next.add(p.id)
                            else next.delete(p.id)
                            setEditingSelectedPermIds(next)
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-mono text-[12px] font-semibold text-slate-600">{p.permission_code}</div>
                          <div className="mt-1 text-sm font-extrabold text-slate-900">{p.permission_name}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setIsRolePermOpen(false)
                setEditingRoleId(null)
                setScrollToPermId(null)
              }}
              disabled={isSavingRolePerms}
            >
              Hủy
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
              disabled={!editingRoleId || isSavingRolePerms}
              onClick={() => void saveRolePermissions()}
            >
              <Check className="h-4 w-4" />
              {isSavingRolePerms ? 'Đang lưu…' : 'Lưu quyền'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isAssignOpen}
        title="Cập nhật vai trò cán bộ"
        subtitle={assignAccount ? `Account #${assignAccount.id} • ${assignAccount.username}` : undefined}
        onClose={() => setIsAssignOpen(false)}
      >
        <div ref={assignRef} className="space-y-4">
          <div className="text-sm font-semibold text-slate-700">Chọn vai trò cần gán</div>
          <div className="max-h-[50vh] overflow-auto rounded-2xl border border-slate-200">
            {roleColumns.map((r) => {
              const checked = assignSelected.has(r.id)
              return (
                <label key={r.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#BC5133]"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(assignSelected)
                      if (e.target.checked) next.add(r.id)
                      else next.delete(r.id)
                      setAssignSelected(next)
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{r.role_code}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{roleLabel(r)}</div>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              onClick={() => setIsAssignOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
              disabled={!assignAccount}
              onClick={() => void saveAssignRoles()}
            >
              <Check className="h-4 w-4" />
              Lưu vai trò
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={isCreateRoleOpen} title="Tạo vai trò mới" subtitle="POST /api/v1/admin/roles" onClose={() => setIsCreateRoleOpen(false)}>
        <div className="grid gap-4">
          <div>
            <div className="text-xs font-bold text-slate-700">RoleCode</div>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133]"
              placeholder="Ví dụ: CAN_BO_TIEP_NHAN"
              value={createRoleForm.role_code}
              onChange={(e) => setCreateRoleForm((v) => ({ ...v, role_code: e.target.value }))}
            />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">RoleName</div>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133]"
              placeholder="Ví dụ: Cán bộ tiếp nhận"
              value={createRoleForm.role_name}
              onChange={(e) => setCreateRoleForm((v) => ({ ...v, role_name: e.target.value }))}
            />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">Description</div>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#BC5133]"
              placeholder="Mô tả vai trò"
              value={createRoleForm.description}
              onChange={(e) => setCreateRoleForm((v) => ({ ...v, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              onClick={() => setIsCreateRoleOpen(false)}
              disabled={isSavingRole}
            >
              Hủy
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#BC5133] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
              disabled={isSavingRole || !normalize(createRoleForm.role_code) || !normalize(createRoleForm.role_name)}
              onClick={() => void submitCreateRole()}
            >
              <Check className="h-4 w-4" />
              {isSavingRole ? 'Đang tạo…' : 'Tạo vai trò'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
