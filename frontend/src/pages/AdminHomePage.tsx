import { Link } from 'react-router-dom'
import { Card } from '../ui/primitives'
import { useAuth } from '../features/auth/auth-context'

function normalize(value?: string) {
  return (value ?? '').trim()
}

export function AdminHomePage() {
  const auth = useAuth()

  const canViewRoles = auth.hasAnyPermission(['role:view', 'role:create', 'role:update', 'role:delete'])
  const canViewPerms = auth.hasAnyPermission([
    'permission:view',
    'permission:create',
    'permission:update',
    'permission:delete',
  ])
  const roleCodes = (auth.profile?.roles ?? []).map((r) => normalize(r.role_code ?? r.roleCode)).filter(Boolean)
  const isSuperAdmin = auth.permissions.has('*') || auth.permissions.has('SUPER_ADMIN') || roleCodes.includes('SUPER_ADMIN')

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Phân quyền</div>
          <div className="page-subtitle">Quản trị vai trò và quyền hạn theo RBAC.</div>
        </div>
      </div>

      <div className="grid-cards">
        {isSuperAdmin ? (
          <Card className="stat-card">
            <div className="stat-k">Bảng điều khiển</div>
            <div className="stat-v stat-v-sm">Control Panel</div>
            <div className="stat-meta">Quản lý cán bộ, vai trò và ma trận quyền (SUPER_ADMIN).</div>
            <Link to="/app/admin/control" className="link">
              Mở Control Panel
            </Link>
          </Card>
        ) : null}

        {canViewRoles ? (
          <Card className="stat-card">
            <div className="stat-k">Vai trò</div>
            <div className="stat-v stat-v-sm">Role</div>
            <div className="stat-meta">Tạo/sửa/xóa vai trò, gán quyền.</div>
            <Link to="/app/admin/roles" className="link">
              Mở quản lý vai trò
            </Link>
          </Card>
        ) : null}

        {canViewPerms ? (
          <Card className="stat-card">
            <div className="stat-k">Quyền hạn</div>
            <div className="stat-v stat-v-sm">Permission</div>
            <div className="stat-meta">Danh mục quyền hạt nhân (permission_code).</div>
            <Link to="/app/admin/permissions" className="link">
              Mở danh mục quyền
            </Link>
          </Card>
        ) : null}

        <Card className="stat-card">
          <div className="stat-k">Tài khoản hiện tại</div>
          <div className="stat-v stat-v-sm">{auth.profile?.username ?? '-'}</div>
          <div className="stat-meta">Số quyền đang có: {auth.permissions.size}</div>
        </Card>
      </div>
    </div>
  )
}
