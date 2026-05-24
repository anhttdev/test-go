import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword, logoutAll } from '../api/auth'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

export function SettingsPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [isBusy, setIsBusy] = useState(false)
  const [isBusyLogoutAll, setIsBusyLogoutAll] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPostChangeOpen, setIsPostChangeOpen] = useState(false)

  const canSubmit = useMemo(() => {
    if (!currentPassword.trim()) return false
    if (newPassword.length < 6) return false
    if (newPassword !== confirmPassword) return false
    return true
  }, [currentPassword, newPassword, confirmPassword])

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword.length < 6) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu mới cần tối thiểu 6 ký tự.' })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu nhập lại không khớp.' })
      return
    }

    setIsBusy(true)
    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      })

      toast.push({ type: 'success', title: 'Đổi mật khẩu', message: 'Đã cập nhật mật khẩu.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsPostChangeOpen(true)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đổi mật khẩu thất bại',
        message:
          error instanceof Error
            ? error.message
            : 'Không thể đổi mật khẩu.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function handlePostChangeLogoutAll() {
    setIsBusyLogoutAll(true)
    try {
      await logoutAll()
      toast.push({ type: 'success', title: 'Đăng xuất', message: 'Đã đăng xuất khỏi tất cả thiết bị.' })
      setIsPostChangeOpen(false)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng xuất thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng xuất toàn bộ.',
      })
    } finally {
      setIsBusyLogoutAll(false)
    }
  }

  async function handleLogoutAll() {
    const ok = window.confirm('Đăng xuất khỏi tất cả thiết bị? Phiên hiện tại cũng sẽ bị huỷ.')
    if (!ok) return

    setIsBusyLogoutAll(true)
    try {
      await logoutAll()
      toast.push({ type: 'success', title: 'Đăng xuất', message: 'Đã yêu cầu đăng xuất toàn bộ thiết bị.' })
      await auth.refresh(false)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng xuất thất bại',
        message:
          error instanceof Error
            ? error.message
            : 'Không thể đăng xuất toàn bộ.',
      })
    } finally {
      setIsBusyLogoutAll(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Cấu hình</div>
          <div className="page-subtitle">Cài đặt bảo mật và phiên đăng nhập.</div>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Đổi mật khẩu</div>
            <div className="section-subtitle">Đổi mật khẩu tài khoản đang đăng nhập.</div>
          </div>
        </div>

        <form className="form" onSubmit={handleChangePassword}>
          <div className="form-grid">
            <Field label="Mật khẩu hiện tại">
              <TextInput
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <div />
            <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={isBusy} disabled={!canSubmit || isBusyLogoutAll}>
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </Card>

      {isPostChangeOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsPostChangeOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Cập nhật mật khẩu thành công</div>
                <div className="modal-subtitle">Bạn muốn xử lý phiên đăng nhập như thế nào?</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsPostChangeOpen(false)}>
                ✕
              </button>
            </div>

            <div className="kv">
              <div className="kv-row">
                <div className="kv-k">Tùy chọn</div>
                <div className="kv-v">Chọn 1 trong 2</div>
              </div>
              <div className="kv-row">
                <div className="kv-k">Gợi ý</div>
                <div className="kv-v">Nếu nghi ngờ lộ tài khoản, hãy đăng xuất tất cả.</div>
              </div>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="ghost" onClick={() => setIsPostChangeOpen(false)} disabled={isBusyLogoutAll}>
                Duy trì đăng nhập
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isBusyLogoutAll}
                onClick={() => void handlePostChangeLogoutAll()}
              >
                Đăng xuất tất cả thiết bị
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Phiên đăng nhập</div>
            <div className="section-subtitle">Huỷ toàn bộ phiên đang hoạt động trên mọi thiết bị.</div>
          </div>
        </div>

        <div className="form-actions">
          <Button variant="danger" onClick={() => void handleLogoutAll()} loading={isBusyLogoutAll} disabled={isBusy}>
            Đăng xuất khỏi tất cả thiết bị
          </Button>
        </div>
      </Card>
    </div>
  )
}
