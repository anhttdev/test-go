import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'
import { Button, Card, Field, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'
import * as authApi from '../api/auth'

type LoginFormState = authApi.LoginForm

type ForgotFormState = authApi.ForgotPasswordForm

type RegisterFormState = authApi.RegisterAccountForm & {
  confirmPassword: string
}

const DEFAULT_LOGIN: LoginFormState = { username: '', password: '' }
const DEFAULT_FORGOT: ForgotFormState = { email: '' }
const DEFAULT_REGISTER: RegisterFormState = {
  ma_so: '',
  ho_ten: '',
  so_cccd: '',
  so_dien_thoai: '',
  gmail: '',
  username: '',
  password: '',
  confirmPassword: '',
}

export function LoginPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isBusy, setIsBusy] = useState(false)
  const [loginForm, setLoginForm] = useState<LoginFormState>(DEFAULT_LOGIN)
  const [forgotForm, setForgotForm] = useState<ForgotFormState>(DEFAULT_FORGOT)
  const [showForgot, setShowForgot] = useState(false)
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(DEFAULT_REGISTER)
  const [showRegister, setShowRegister] = useState(false)

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null
    if (state?.from && typeof state.from === 'string') return state.from
    return '/app/dashboard'
  }, [location.state])

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    try {
      await auth.login(loginForm)
      toast.push({ type: 'success', title: 'Đăng nhập', message: 'Xác thực thành công.' })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng nhập thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng nhập.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function handleForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    try {
      await authApi.forgotPassword(forgotForm)
      toast.push({
        type: 'success',
        title: 'Quên mật khẩu',
        message: 'Đã gửi yêu cầu. Kiểm tra email để lấy liên kết đặt lại.',
      })
      setForgotForm(DEFAULT_FORGOT)
      setShowForgot(false)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Quên mật khẩu thất bại',
        message: error instanceof Error ? error.message : 'Không thể gửi yêu cầu.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (registerForm.password.length < 6) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu cần tối thiểu 6 ký tự.' })
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.push({ type: 'error', title: 'Mật khẩu', message: 'Mật khẩu nhập lại không khớp.' })
      return
    }

    if (!/^\d{12}$/.test(registerForm.so_cccd.trim())) {
      toast.push({ type: 'error', title: 'CCCD', message: 'Số CCCD phải đúng 12 chữ số.' })
      return
    }

    setIsBusy(true)
    try {
      const payload = await authApi.registerAccount({
        ma_so: registerForm.ma_so,
        ho_ten: registerForm.ho_ten,
        so_cccd: registerForm.so_cccd,
        so_dien_thoai: registerForm.so_dien_thoai,
        gmail: registerForm.gmail,
        username: registerForm.username,
        password: registerForm.password,
      })

      const message =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'Tạo tài khoản thành công.'

      toast.push({ type: 'success', title: 'Đăng ký', message })
      setShowRegister(false)
      setLoginForm((c) => ({ ...c, username: registerForm.username }))
      setRegisterForm(DEFAULT_REGISTER)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Đăng ký thất bại',
        message: error instanceof Error ? error.message : 'Không thể đăng ký.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-title">Hệ thống Quản lí Dân cư Quốc gia</div>
              <div className="brand-subtitle">Đăng nhập tác nghiệp</div>
            </div>
          </div>
          <div className="auth-hero-copy">
            <div className="hero-title">Bảo mật. Chuẩn hoá. Truy vết.</div>
            <div className="hero-subtitle">
              Nền tảng quản lí hồ sơ công dân và tra cứu dữ liệu theo phân quyền.
            </div>
            <div className="hero-meta">
              <div className="meta-item">
                <div className="meta-k">Kết nối</div>
                <div className="meta-v">API nội bộ qua /api/*</div>
              </div>
              <div className="meta-item">
                <div className="meta-k">Phiên</div>
                <div className="meta-v">Cookie + credentials</div>
              </div>
              <div className="meta-item">
                <div className="meta-k">Ngôn ngữ</div>
                <div className="meta-v">Tiếng Việt</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="auth-card">
        <div className="auth-card-head">
          <div className="auth-card-headline">
            <div className="auth-seal" aria-hidden="true" />
            <div>
              <div className="auth-card-title">Đăng nhập hệ thống</div>
              <div className="auth-card-subtitle">Cổng tác nghiệp nội bộ • Cookie phiên • /api</div>
            </div>
          </div>
          <div className="auth-card-note">
            Chỉ dành cho cán bộ/nhân sự được cấp quyền. Mọi thao tác có thể được ghi nhận để phục vụ kiểm tra, đối soát.
          </div>
        </div>

        <form className="form" onSubmit={handleLogin}>
          <Field label="Tên đăng nhập">
            <TextInput
              autoComplete="username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((c) => ({ ...c, username: event.target.value }))}
              placeholder="vd: admin"
            />
          </Field>
          <Field label="Mật khẩu">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((c) => ({ ...c, password: event.target.value }))}
              placeholder="••••••••"
            />
          </Field>

          <div className="auth-actions auth-actions-col">
            <Button
              variant="primary"
              type="submit"
              loading={isBusy || auth.status === 'checking'}
              className="auth-primary-btn"
            >
              Đăng nhập
            </Button>
            <div className="auth-link-row">
              <button type="button" className="link auth-link-btn" onClick={() => setShowForgot(true)} disabled={isBusy}>
                Quên mật khẩu?
              </button>
              <button
                type="button"
                className="link auth-link-btn"
                onClick={() => setShowRegister(true)}
                disabled={isBusy}
              >
                Đăng ký tài khoản
              </button>
            </div>
          </div>
        </form>

        <div className="auth-card-footer">
          <div className="muted">
            Khuyến nghị dùng trình duyệt cập nhật mới nhất. Không chia sẻ tài khoản và không đăng nhập trên máy công cộng.
          </div>
        </div>

        {showForgot ? (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowForgot(false)}>
            <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <div className="modal-title">Khôi phục mật khẩu</div>
                  <div className="modal-subtitle">Nhập email để nhận liên kết đặt lại.</div>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowForgot(false)}>
                  ✕
                </button>
              </div>

              <form className="form" onSubmit={handleForgot}>
                <Field label="Email">
                  <TextInput
                    type="email"
                    value={forgotForm.email}
                    onChange={(event) => setForgotForm({ email: event.target.value })}
                    placeholder="abc@domain.gov.vn"
                  />
                </Field>
                <div className="modal-actions">
                  <Button type="submit" variant="primary" loading={isBusy}>
                    Gửi yêu cầu
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForgot(false)} disabled={isBusy}>
                    Huỷ
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showRegister ? (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowRegister(false)}>
            <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <div className="modal-title">Đăng ký tài khoản</div>
                  <div className="modal-subtitle">Tạo tài khoản mới theo thông tin định danh.</div>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowRegister(false)}>
                  ✕
                </button>
              </div>

              <form className="form" onSubmit={handleRegister}>
                <div className="form-grid">
                  <Field label="Mã số" hint="Bắt buộc">
                    <TextInput
                      value={registerForm.ma_so}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, ma_so: e.target.value }))}
                      placeholder="VD: ND001"
                    />
                  </Field>
                  <Field label="Họ tên" hint="Bắt buộc">
                    <TextInput
                      value={registerForm.ho_ten}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, ho_ten: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                    />
                  </Field>
                  <Field label="Số CCCD" hint="12 chữ số">
                    <TextInput
                      value={registerForm.so_cccd}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, so_cccd: e.target.value }))}
                      placeholder="012345678901"
                    />
                  </Field>
                  <Field label="Số điện thoại" hint="Tuỳ chọn">
                    <TextInput
                      value={registerForm.so_dien_thoai}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, so_dien_thoai: e.target.value }))}
                      placeholder="0901234567"
                    />
                  </Field>
                  <Field label="Gmail" hint="Tuỳ chọn">
                    <TextInput
                      type="email"
                      value={registerForm.gmail}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, gmail: e.target.value }))}
                      placeholder="abc@gmail.com"
                    />
                  </Field>
                  <div />
                  <Field label="Tên đăng nhập" hint="Tối thiểu 4 ký tự">
                    <TextInput
                      autoComplete="username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, username: e.target.value }))}
                      placeholder="vd: canbo01"
                    />
                  </Field>
                  <div />
                  <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
                    <TextInput
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </Field>
                  <Field label="Nhập lại mật khẩu">
                    <TextInput
                      type="password"
                      autoComplete="new-password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </Field>
                </div>

                <div className="modal-actions">
                  <Button type="submit" variant="primary" loading={isBusy}>
                    Tạo tài khoản
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowRegister(false)} disabled={isBusy}>
                    Huỷ
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
