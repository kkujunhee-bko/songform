import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import WorshipFormListPage from './pages/WorshipFormListPage'
import WorshipFormPage from './pages/WorshipFormPage'
import SettingsPage from './pages/SettingsPage'
import UserManagementPage from './pages/UserManagementPage'
import RolePermissionsPage from './pages/RolePermissionsPage'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'

// 로그인한 사용자만 접근 가능
function ProtectedLayout() {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

// 편집 라우트 래퍼 - id별 key로 컴포넌트 강제 리마운트
function EditFormRoute() {
  const { id } = useParams()
  return <WorshipFormPage key={id} />
}

// 관리자만 접근 가능
function AdminRoute({ children }) {
  const user = useAuthStore(s => s.user)
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const loading = useAuthStore(s => s.loading)
  const user = useAuthStore(s => s.user)
  const loadAll = useSettingsStore(s => s.loadAll)

  // 앱 시작 시 토큰 검증
  useEffect(() => { init() }, [init])

  // 로그인 성공 후 설정 로드
  useEffect(() => {
    if (user) loadAll()
  }, [user, loadAll])

  // 토큰 검증 중
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 보호된 레이아웃 */}
        <Route element={<ProtectedLayout />}>
          {/* 관리자 전용 */}
          <Route path="/settings"          element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="/users"             element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/role-permissions"  element={<AdminRoute><RolePermissionsPage /></AdminRoute>} />

          {/* 일반 + 관리자 공통 */}
          <Route index element={<WorshipFormListPage />} />
          <Route path="/forms/new"       element={<WorshipFormPage key="new" />} />
          <Route path="/forms/:id/edit"  element={<EditFormRoute />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
