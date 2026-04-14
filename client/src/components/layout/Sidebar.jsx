import { NavLink, useNavigate } from 'react-router-dom'
import { Settings, LogOut, Users, ShieldCheck, Music, Sun, Moon, KeyRound } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { CONFIGURABLE_MENUS } from '../../lib/menuConfig'

export default function Sidebar() {
  const navigate = useNavigate()
  const user           = useAuthStore(s => s.user)
  const myPermissions  = useAuthStore(s => s.myPermissions)
  const logout         = useAuthStore(s => s.logout)
  const toggleTheme    = useAuthStore(s => s.toggleTheme)

  const isAdmin = user?.role === 'admin'
  const isDark  = user?.theme === 'dark'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navCls = (isActive) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
    }`

  // 비관리자: can_read 권한이 있는 메뉴만 필터링
  const visibleUserMenus = CONFIGURABLE_MENUS.filter(menu => {
    const perm = myPermissions.find(p => p.menu_key === menu.key)
    return perm?.can_read === true
  })

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* 로고 */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Music size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">SongForm</div>
            <div className="text-xs text-gray-500">예배 송폼 관리</div>
          </div>
        </div>

        {/* 로그인 사용자 정보 */}
        {user && (
          <div className="mt-3 px-2 py-1.5 bg-gray-800 rounded-md flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              isAdmin ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-700 text-gray-400'
            }`}>
              {isAdmin ? <ShieldCheck size={11} /> : <Music size={11} />}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-300 truncate font-medium">{user.name}</div>
              <div className="text-xs text-gray-600 truncate">
                {isAdmin ? '관리자' :
                  user.role === 'leader'   ? '리더' :
                  user.role === 'coworker' ? '동역' : '단원'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {isAdmin ? (
          // ── 관리자 메뉴 ──
          <>
            <NavLink to="/users" className={({ isActive }) => navCls(isActive)}>
              <Users size={16} />
              회원 관리
            </NavLink>
            <NavLink to="/role-permissions" className={({ isActive }) => navCls(isActive)}>
              <KeyRound size={16} />
              회원 권한 관리
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => navCls(isActive)}>
              <Settings size={16} />
              환경설정
            </NavLink>
          </>
        ) : (
          // ── 비관리자: 권한에 따라 동적 렌더링 ──
          visibleUserMenus.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-600 text-center">
              접근 가능한 메뉴가 없습니다.
            </div>
          ) : (
            visibleUserMenus.map(menu => {
              const Icon = menu.icon
              return (
                <NavLink
                  key={menu.key}
                  to={menu.path}
                  end={menu.path === '/'}
                  className={({ isActive }) => navCls(isActive)}
                >
                  <Icon size={16} />
                  {menu.label}
                </NavLink>
              )
            })
          )
        )}
      </nav>

      {/* 하단: 테마 토글 + 로그아웃 */}
      <div className="px-2 py-4 border-t border-gray-800 space-y-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-gray-100"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? '라이트 모드' : '다크 모드'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-red-400"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
