import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card } from '../ui/primitives'

function normalizeLabel(value?: string) {
  const v = (value ?? '').trim()
  return v || '-'
}

export function MyProfilePage() {
  const auth = useAuth()
  const profile = auth.profile

  const roles = useMemo(() => {
    return (profile?.roles ?? []).map((r) => ({
      name: (r.role_name ?? r.roleName ?? '').trim(),
      code: (r.role_code ?? r.roleCode ?? '').trim(),
    }))
  }, [profile])

  const permissionCodes = useMemo(() => {
    const codes = Array.from(auth.permissions)
    codes.sort((a, b) => a.localeCompare(b))
    return codes
  }, [auth.permissions])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Hồ sơ của tôi</div>
          <div className="page-subtitle">Thông tin tài khoản và quyền hạn từ phiên đăng nhập hiện tại.</div>
        </div>
        <div className="page-actions">
          <Button variant="default" onClick={() => void auth.refresh(false)}>
            Tải lại
          </Button>
          <Link to="/app/settings" className="btn btn-primary btn-md">
            Đổi mật khẩu
          </Link>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Tài khoản</div>
            <div className="section-subtitle">Định danh tài khoản nội bộ và hồ sơ công dân liên kết (nếu có).</div>
          </div>
        </div>

        <div className="kv">
          <div className="kv-row">
            <div className="kv-k">Username</div>
            <div className="kv-v">{normalizeLabel(profile?.username)}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Account ID</div>
            <div className="kv-v">{profile?.id ?? '-'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Công dân</div>
            <div className="kv-v">{normalizeLabel(profile?.user?.ho_ten)}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Mã số</div>
            <div className="kv-v">{normalizeLabel(profile?.user?.ma_so)}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">CCCD</div>
            <div className="kv-v">{normalizeLabel(profile?.user?.so_cccd)}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Điện thoại</div>
            <div className="kv-v">{normalizeLabel(profile?.user?.so_dien_thoai)}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Email</div>
            <div className="kv-v">{normalizeLabel(profile?.user?.gmail)}</div>
          </div>
        </div>
      </Card>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Vai trò</div>
            <div className="section-subtitle">Danh sách vai trò (role) gán cho tài khoản.</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tên vai trò</th>
                <th>Mã vai trò</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={2}>
                    Chưa có vai trò được gán.
                  </td>
                </tr>
              ) : (
                roles.map((r, idx) => (
                  <tr key={`${r.code || r.name || 'role'}-${idx}`}>
                    <td>{normalizeLabel(r.name)}</td>
                    <td>{normalizeLabel(r.code)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="section-card">
        <div className="section-head section-head-row">
          <div>
            <div className="section-title">Quyền hạn</div>
            <div className="section-subtitle">Tập quyền hiện tại (đã gộp từ role + permissions).</div>
          </div>
          <div className="muted">
            {auth.permissions.has('*') ? 'ALL' : permissionCodes.length} quyền
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Permission code</th>
              </tr>
            </thead>
            <tbody>
              {permissionCodes.length === 0 ? (
                <tr>
                  <td className="table-empty">Chưa có quyền nào.</td>
                </tr>
              ) : (
                permissionCodes.map((code) => (
                  <tr key={code}>
                    <td>{code}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
