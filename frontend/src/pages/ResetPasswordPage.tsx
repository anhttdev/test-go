import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as authApi from '../api/auth'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

export function ResetPasswordPage() {
  const toast = useToast()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') ?? '', [params])
  const [draftToken, setDraftToken] = useState(token)
  const [email, setEmail] = useState('')
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    queueMicrotask(() => setDraftToken(token))
  }, [token])

  useEffect(() => {
    if (!draftToken) return

    setIsVerifying(true)
    void authApi
      .verifyResetToken(draftToken)
      .then((payload) => {
        setIsTokenValid(true)
        setEmail(payload.email ?? '')
        toast.push({
          type: 'success',
          title: 'Token hợp lệ',
          message: payload.message || 'Có thể đặt lại mật khẩu.',
        })
      })
      .catch((error) => {
        setIsTokenValid(false)
        setEmail('')
        toast.push({
          type: 'error',
          title: 'Token không hợp lệ',
          message: error instanceof Error ? error.message : 'Không thể xác minh token.',
        })
      })
      .finally(() => setIsVerifying(false))
  }, [draftToken])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      toast.push({ type: 'error', title: 'Thiếu token', message: 'Không tìm thấy token trong URL.' })
      return
    }

    if (!isTokenValid) {
      toast.push({ type: 'error', title: 'Token', message: 'Token chưa hợp lệ hoặc đã hết hạn.' })
      return
    }

    if (newPassword.length < 6) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu cần tối thiểu 6 ký tự.' })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu nhập lại không khớp.' })
      return
    }

    setIsBusy(true)
    try {
      await authApi.resetPassword(token, newPassword)
      toast.push({ type: 'success', title: 'Đặt lại mật khẩu', message: 'Đã gửi yêu cầu đặt lại mật khẩu.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đặt lại thất bại',
        message: error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="auth-shell reset-shell">
      <Card className="auth-card reset-card">
        <div className="auth-card-head">
          <div className="auth-card-title">Đặt lại mật khẩu</div>
          <div className="auth-card-subtitle">Xác minh token trước khi đổi mật khẩu.</div>
        </div>

        <div className="kv">
          <div className="kv-row">
            <div className="kv-k">Token</div>
            <div className="kv-v mono">{token || '-'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Email</div>
            <div className="kv-v">{email || '-'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-k">Trạng thái</div>
            <div className="kv-v">
              {isVerifying ? 'Đang xác minh…' : isTokenValid ? 'Hợp lệ' : token ? 'Không hợp lệ' : 'Thiếu token'}
            </div>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <Field label="Mật khẩu mới">
            <TextInput
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Nhập lại mật khẩu">
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <div className="auth-actions">
            <Button type="submit" variant="primary" loading={isBusy} disabled={!token || !isTokenValid}>
              Xác nhận
            </Button>
            <Link to="/login" className="link">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
