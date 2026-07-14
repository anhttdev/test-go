import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { RequireAuth } from './app/RequireAuth'
import { RequirePermission } from './app/RequirePermission'
import { AuthProvider } from './features/auth/AuthContext'
import { AccountCreatePage } from './pages/AccountCreatePage'
import { AdminControlPanelPage } from './pages/AdminControlPanelPage'
import { AdminHomePage } from './pages/AdminHomePage'
import { AdminPermissionCreatePage } from './pages/AdminPermissionCreatePage'
import { AdminPermissionEditPage } from './pages/AdminPermissionEditPage'
import { AdminPermissionsListPage } from './pages/AdminPermissionsListPage'
import { AdminRoleCreatePage } from './pages/AdminRoleCreatePage'
import { AdminRoleEditPage } from './pages/AdminRoleEditPage'
import { AdminRolePermissionsPage } from './pages/AdminRolePermissionsPage'
import { AdminRolesListPage } from './pages/AdminRolesListPage'
import { CitizenCreatePage } from './pages/CitizenCreatePage'
import { CitizenDetailPage } from './pages/CitizenDetailPage'
import { CitizenEditPage } from './pages/CitizenEditPage'
import { CitizensListPage } from './pages/CitizensListPage'
import { DashboardPage } from './pages/DashboardPage'
import { HoKhauCreatePage } from './pages/HoKhauCreatePage'
import { HoKhauDetailPage } from './pages/HoKhauDetailPage'
import { HoKhauPage } from './pages/HoKhauPage'
import { HoKhauTransferPage } from './pages/HoKhauTransferPage'
import { LoginPage } from './pages/LoginPage'
import { MyProfilePage } from './pages/MyProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OnlinePublicServicesPage } from './pages/OnlinePublicServicesPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SettingsPage } from './pages/SettingsPage'
import { ToastProvider } from './ui/ToastProvider'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/app"
            element={
              <AppLayout />
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="services/online" element={<OnlinePublicServicesPage />} />
            <Route
              path="citizens"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['nguoi_dan:view', 'nguoi_dan:view_detail']}>
                    <CitizensListPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="citizens/new"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['nguoi_dan:create']}>
                    <CitizenCreatePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="citizens/:id"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['nguoi_dan:view', 'nguoi_dan:view_detail']}>
                    <CitizenDetailPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="citizens/:id/edit"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['nguoi_dan:update']}>
                    <CitizenEditPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="hokhau"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['ho_khau:view', 'ho_khau:view_detail']}>
                    <HoKhauPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="hokhau/new"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['ho_khau:create']}>
                    <HoKhauCreatePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="hokhau/:id"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['ho_khau:view', 'ho_khau:view_detail']}>
                    <HoKhauDetailPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="hokhau/:id/transfer"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['ho_khau:update']}>
                    <HoKhauTransferPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['role:view', 'permission:view', 'role:create', 'permission:create']}>
                    <AdminHomePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/control"
              element={
                <RequireAuth>
                  <AdminControlPanelPage />
                </RequireAuth>
              }
            />
            <Route
              path="admin/permissions"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['permission:view']}>
                    <AdminPermissionsListPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/permissions/new"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['permission:create']}>
                    <AdminPermissionCreatePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/permissions/:id/edit"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['permission:update']}>
                    <AdminPermissionEditPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/roles"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['role:view']}>
                    <AdminRolesListPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/roles/new"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['role:create']}>
                    <AdminRoleCreatePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/roles/:id/edit"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['role:update']}>
                    <AdminRoleEditPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="admin/roles/:id/permissions"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['role:assign_permission', 'role:remove_permission']}>
                    <AdminRolePermissionsPage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="accounts/new"
              element={
                <RequireAuth>
                  <RequirePermission anyOf={['account:create']}>
                    <AccountCreatePage />
                  </RequirePermission>
                </RequireAuth>
              }
            />
            <Route
              path="profile"
              element={
                <RequireAuth>
                  <MyProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
