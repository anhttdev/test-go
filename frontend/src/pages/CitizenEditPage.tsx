import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCitizenById, updateCitizen } from '../api/citizens'
import { assignRolesToAccount, deleteRolesFromAccount, listRoles } from '../api/admin'
import type { Role } from '../api/admin'
import { useAuth } from '../features/auth/auth-context'
import type { Citizen, CitizenForm } from '../lib/domain'
import { DEFAULT_CITIZEN_FORM, mapCitizenToForm } from '../lib/domain'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import { ForbiddenPage } from './ForbiddenPage'
import { X } from 'lucide-react'

function validate(form: CitizenForm) {
  const errors: Partial<Record<keyof CitizenForm, string>> = {}

  if (!form.ma_so.trim()) errors.ma_so = 'Bắt buộc'
  if (!form.ho_ten.trim()) errors.ho_ten = 'Bắt buộc'
  if (!form.so_cccd.trim()) errors.so_cccd = 'Bắt buộc'
  if (!/^\d{9,12}$/.test(form.so_cccd.trim())) errors.so_cccd = 'CCCD cần 9–12 chữ số'
  if (!form.so_dien_thoai.trim()) errors.so_dien_thoai = 'Bắt buộc'
  if (!/^\d{9,11}$/.test(form.so_dien_thoai.trim())) errors.so_dien_thoai = 'SĐT cần 9–11 chữ số'
  if (form.gmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gmail.trim()))
    errors.gmail = 'Email không hợp lệ'

  return errors
}

function normalizeRoleLabel(role: { role_name?: string; role_code?: string } | null | undefined) {
  const name = (role?.role_name ?? '').trim()
  if (name) return name
  const code = (role?.role_code ?? '').trim()
  if (code) return code
  return '-'
}

function getLinkedAccountIdFromCitizen(citizen: Citizen | null): number | null {
  const raw =
    citizen?.account_id ??
    citizen?.accountId ??
    citizen?.account?.id
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  return null
}

function getLinkedRoleIdsFromCitizen(citizen: Citizen | null): number[] {
  const roles = citizen?.account?.roles ?? citizen?.account?.Roles ?? []
  return roles.map((r) => r.id).filter((v) => Number.isFinite(v))
}

export function CitizenEditPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams()

  const citizenId = useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null
    return parsed
  }, [params.id])

  const canUpdate = auth.hasPermission('nguoi_dan:update')
  const canUpdateAccountRole = auth.hasPermission('account:update_role')
  const roleCodes = useMemo(() => {
    return (auth.profile?.roles ?? []).map((r) => (r.role_code ?? r.roleCode ?? '').trim()).filter(Boolean)
  }, [auth.profile?.roles])
  const isSuperAdmin = auth.permissions.has('*') || auth.permissions.has('SUPER_ADMIN') || roleCodes.includes('SUPER_ADMIN')
  const canManageRoles = isSuperAdmin || canUpdateAccountRole

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [citizen, setCitizen] = useState<Citizen | null>(null)
  const [form, setForm] = useState<CitizenForm>(DEFAULT_CITIZEN_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CitizenForm, string>>>({})

  const [systemRoles, setSystemRoles] = useState<Role[]>([])
  const [isLoadingSystemRoles, setIsLoadingSystemRoles] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')
  const [isAssigningRole, setIsAssigningRole] = useState(false)
  const [removingRoleId, setRemovingRoleId] = useState<number | null>(null)

  const [linkedAccountId, setLinkedAccountId] = useState<number | null>(null)
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<number>>(new Set())

  const availableRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    return systemRoles
      .filter((r) => !assignedRoleIds.has(r.id))
      .filter((r) => {
        if (!q) return true
        return (
          r.role_code.toLowerCase().includes(q) ||
          r.role_name.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.role_name.localeCompare(b.role_name))
  }, [assignedRoleIds, roleSearch, systemRoles])

  const assignedRoles = useMemo(() => {
    const byId = new Map<number, Role>()
    for (const r of systemRoles) byId.set(r.id, r)
    const list: { id: number; role_name?: string; role_code?: string }[] = []
    for (const id of Array.from(assignedRoleIds)) {
      const role = byId.get(id)
      if (role) list.push(role)
      else list.push({ id, role_name: undefined, role_code: `#${id}` })
    }
    list.sort((a, b) => normalizeRoleLabel(a).localeCompare(normalizeRoleLabel(b)))
    return list
  }, [assignedRoleIds, systemRoles])

  useEffect(() => {
    if (!citizenId) return
    setIsLoading(true)
    void getCitizenById(citizenId)
      .then((payload) => {
        setCitizen(payload)
        setForm(mapCitizenToForm(payload))
        setLinkedAccountId(getLinkedAccountIdFromCitizen(payload))
        setAssignedRoleIds(new Set(getLinkedRoleIdsFromCitizen(payload)))
      })
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Tải hồ sơ thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải hồ sơ.',
        })
      })
      .finally(() => setIsLoading(false))
  }, [citizenId])

  useEffect(() => {
    if (!canManageRoles) return
    setIsLoadingSystemRoles(true)
    void listRoles()
      .then((data) => setSystemRoles(data))
      .catch((error) => {
        toast.push({
          type: 'error',
          title: 'Không thể tải danh mục vai trò',
          message: error instanceof Error ? error.message : 'Yêu cầu thất bại.',
        })
      })
      .finally(() => setIsLoadingSystemRoles(false))
  }, [canManageRoles])

  async function handleAssignRole() {
    if (!canManageRoles) return
    if (!linkedAccountId) return
    if (!selectedRoleId) return

    setIsAssigningRole(true)
    try {
      await assignRolesToAccount({ account_id: linkedAccountId, roles: [Number(selectedRoleId)] })
      setAssignedRoleIds((prev) => new Set(prev).add(Number(selectedRoleId)))
      toast.push({
        type: 'success',
        title: 'Cập nhật vai trò',
        message: 'Đã cập nhật quyền hạn cho cán bộ. Hệ thống đã đồng bộ Redis Cache.',
      })
      setSelectedRoleId('')
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: error instanceof Error ? error.message : 'Không thể gán vai trò.',
      })
    } finally {
      setIsAssigningRole(false)
    }
  }

  async function handleRemoveRole(role: { id: number; role_name?: string; role_code?: string }) {
    if (!canManageRoles) return
    if (!linkedAccountId) return
    const name = (role.role_name ?? role.role_code ?? '').trim() || `#${role.id}`
    const ok = window.confirm(`Xác nhận tước quyền ${name}?`)
    if (!ok) return

    setRemovingRoleId(role.id)
    try {
      await deleteRolesFromAccount({ account_id: linkedAccountId, roles: [role.id] })
      setAssignedRoleIds((prev) => {
        const next = new Set(prev)
        next.delete(role.id)
        return next
      })
      toast.push({
        type: 'success',
        title: 'Cập nhật vai trò',
        message: 'Đã cập nhật quyền hạn cho cán bộ. Hệ thống đã đồng bộ Redis Cache.',
      })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: error instanceof Error ? error.message : 'Không thể tước vai trò.',
      })
    } finally {
      setRemovingRoleId(null)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!citizenId) return
    if (!canUpdate) return

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.push({ type: 'error', title: 'Dữ liệu chưa hợp lệ', message: 'Vui lòng kiểm tra các trường bắt buộc.' })
      return
    }

    setIsSaving(true)
    try {
      const payload = await updateCitizen(citizenId, form)
      setCitizen(payload)
      toast.push({ type: 'success', title: 'Cập nhật hồ sơ', message: 'Đã lưu thay đổi.' })
      navigate(`/app/citizens/${citizenId}`, { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Lưu thất bại',
        message: error instanceof Error ? error.message : 'Không thể lưu.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!canUpdate) return <ForbiddenPage />

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Chỉnh sửa hồ sơ</div>
          <div className="page-subtitle">{citizen ? citizen.ho_ten : isLoading ? 'Đang tải…' : '-'}</div>
        </div>
        <div className="page-actions">
          {citizenId ? (
            <Link to={`/app/citizens/${citizenId}`} className="btn btn-default btn-md">
              Quay lại
            </Link>
          ) : (
            <Link to="/app/citizens" className="btn btn-default btn-md">
              Quay lại
            </Link>
          )}
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Thông tin định danh</div>
            <div className="section-subtitle">Cập nhật theo quyền nguoi_dan:update.</div>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Mã số" error={errors.ma_so}>
              <TextInput
                value={form.ma_so}
                onChange={(e) => setForm((c) => ({ ...c, ma_so: e.target.value }))}
                placeholder="VD: ND001"
              />
            </Field>
            <Field label="Họ tên" error={errors.ho_ten}>
              <TextInput
                value={form.ho_ten}
                onChange={(e) => setForm((c) => ({ ...c, ho_ten: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </Field>
            <Field label="Số CCCD" hint="9–12 chữ số" error={errors.so_cccd}>
              <TextInput
                value={form.so_cccd}
                onChange={(e) => setForm((c) => ({ ...c, so_cccd: e.target.value }))}
                placeholder="012345678901"
              />
            </Field>
            <Field label="Số điện thoại" hint="9–11 chữ số" error={errors.so_dien_thoai}>
              <TextInput
                value={form.so_dien_thoai}
                onChange={(e) => setForm((c) => ({ ...c, so_dien_thoai: e.target.value }))}
                placeholder="0901234567"
              />
            </Field>
            <Field label="Email" hint="Tuỳ chọn" error={errors.gmail}>
              <TextInput
                type="email"
                value={form.gmail}
                onChange={(e) => setForm((c) => ({ ...c, gmail: e.target.value }))}
                placeholder="abc@domain.gov.vn"
              />
            </Field>
          </div>

          <div className="form-actions">
            <Button variant="primary" type="submit" loading={isSaving} disabled={isLoading}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>

      {canManageRoles && auth.profile?.id ? (
        <Card className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Cấu hình vai trò cán bộ</div>
              <div className="section-subtitle">Dành riêng cho quản trị viên hệ thống.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-extrabold text-slate-900">Quản lý vai trò &amp; chức vụ</div>
            <div className="mt-1 text-sm text-slate-700">Chỉ hiển thị cho SUPER_ADMIN hoặc người có quyền account:update_role.</div>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              Tài khoản liên kết:{' '}
              <span className="font-black text-slate-900">{linkedAccountId ? `#${linkedAccountId}` : '-'}</span>
            </div>
            {!linkedAccountId ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Không tìm thấy tài khoản liên kết trong dữ liệu công dân. Hãy đảm bảo API <span className="font-black">GET /api/v1/users/:id</span> trả về
                <span className="font-black"> account_id</span>.
              </div>
            ) : null}

            <div className="mt-4">
              <div className="text-xs font-black uppercase tracking-wide text-slate-600">Vai trò hiện tại</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {assignedRoles.length ? (
                  assignedRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-2 rounded-full bg-[#BC5133] px-3 py-1 text-xs font-extrabold text-white"
                    >
                      <span className="max-w-[240px] truncate">{normalizeRoleLabel(r)}</span>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-60"
                        onClick={() => void handleRemoveRole({ id: Number(r.id), role_name: r.role_name, role_code: r.role_code })}
                        disabled={!linkedAccountId || removingRoleId === Number(r.id) || isAssigningRole}
                        aria-label="Tước vai trò"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-slate-700">Chưa gán vai trò nào.</div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-end">
              <Field label="Tìm vai trò">
                <TextInput
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="VD: CAN_BO_HO_KHAU"
                  disabled={isLoadingSystemRoles || isAssigningRole}
                />
              </Field>

              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-wide text-slate-600">Chọn vai trò</div>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-semibold text-slate-900 outline-none focus:border-[#BC5133]"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
                    disabled={isLoadingSystemRoles || isAssigningRole}
                  >
                    <option value="">-- Chọn --</option>
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.role_name} • {r.role_code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    ▾
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#BC5133] px-4 text-sm font-extrabold text-white hover:bg-[#a9482e] disabled:opacity-60"
                disabled={!linkedAccountId || !selectedRoleId || isAssigningRole || isLoadingSystemRoles}
                onClick={() => void handleAssignRole()}
              >
                {isAssigningRole ? 'Đang cập nhật…' : 'Gán vai trò'}
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
