import { NavLink, useNavigate } from 'react-router-dom'
import { Settings, LogOut, Users, ShieldCheck, Music, Sun, Moon, KeyRound, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { CONFIGURABLE_MENUS } from '../../lib/menuConfig'

export default function Sidebar({ mobileOpen, onClose }) {
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

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  // 태블릿(md~lg): 아이콘 중앙 정렬  /  PC(lg+): 아이콘+텍스트 좌측 정렬
  const navCls = (isActive) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
    md:justify-center md:px-2 lg:justify-start lg:px-3 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
    }`

  const visibleUserMenus = CONFIGURABLE_MENUS.filter(menu => {
    const perm = myPermissions.find(p => p.menu_key === menu.key)
    return perm?.can_read === true
  })

  return (
    /*
      항상 fixed 포지션:
        모바일(<md) : 기본 -translate-x-full(숨김), mobileOpen 시 translate-x-0(슬라이드 인)
        태블릿(md+) : md:translate-x-0 으로 항상 보임, 너비 w-14 (아이콘만)
        PC(lg+)     : lg:w-56 으로 너비 확장 (아이콘+텍스트)
    */
    <aside
      className={`
        fixed inset-y-0 left-0 z-30
        w-56 md:w-14 lg:w-56
        bg-gray-900 border-r border-gray-800 flex flex-col
        transition-transform duration-300 ease-in-out
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* 로고 */}
      <div className="px-4 py-5 border-b border-gray-800 flex-shrink-0 relative">
        <div className="flex items-center gap-2 md:justify-center lg:justify-start">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Music size={16} className="text-white" />
          </div>
          {/* 텍스트: 모바일 항상 표시, 태블릿 숨김, PC 표시 */}
          <div className="md:hidden lg:block">
            <div className="text-sm font-bold text-white">SongForm</div>
            <div className="text-xs text-gray-500">예배 송폼 관리</div>
          </div>
        </div>

        {/* 로그인 사용자 정보 */}
        {user && (
          <div className="mt-3 px-2 py-1.5 bg-gray-800 rounded-md flex items-center gap-2 md:justify-center lg:justify-start">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              isAdmin ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-700 text-gray-400'
            }`}>
              {isAdmin ? <ShieldCheck size={11} /> : <Music size={11} />}
            </div>
            <div className="min-w-0 md:hidden lg:block">
              <div className="text-xs text-gray-300 truncate font-medium">{user.name}</div>
              <div className="text-xs text-gray-600 truncate">
                {isAdmin ? '관리자' :
                  user.role === 'leader'   ? '리더' :
                  user.role === 'coworker' ? '동역' : '단원'}
              </div>
            </div>
          </div>
        )}

        {/* 모바일 닫기 버튼 */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="메뉴 닫기"
        >
          <X size={18} />
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {isAdmin ? (
          <>
            <NavLink to="/users" className={({ isActive }) => navCls(isActive)} onClick={handleNavClick} title="회원 관리">
              <Users size={16} className="flex-shrink-0" />
              <span className="md:hidden lg:inline">회원 관리</span>
            </NavLink>
            <NavLink to="/role-permissions" className={({ isActive }) => navCls(isActive)} onClick={handleNavClick} title="회원 권한 관리">
              <KeyRound size={16} className="flex-shrink-0" />
              <span className="md:hidden lg:inline">회원 권한 관리</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => navCls(isActive)} onClick={handleNavClick} title="환경설정">
              <Settings size={16} className="flex-shrink-0" />
              <span className="md:hidden lg:inline">환경설정</span>
            </NavLink>
          </>
        ) : (
          visibleUserMenus.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-600 text-center md:hidden lg:block">
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
                  onClick={handleNavClick}
                  title={menu.label}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="md:hidden lg:inline">{menu.label}</span>
                </NavLink>
              )
            })
          )
        )}
      </nav>

      {/* 하단: 테마 토글 + 로그아웃 */}
      <div className="px-2 py-4 border-t border-gray-800 space-y-1 flex-shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-gray-100 md:justify-center md:px-2 lg:justify-start lg:px-3"
          title={isDark ? '라이트 모드' : '다크 모드'}
        >
          {isDark ? <Sun size={16} className="flex-shrink-0" /> : <Moon size={16} className="flex-shrink-0" />}
          <span className="md:hidden lg:inline">{isDark ? '라이트 모드' : '다크 모드'}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-red-400 md:justify-center md:px-2 lg:justify-start lg:px-3"
          title="로그아웃"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="md:hidden lg:inline">로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
