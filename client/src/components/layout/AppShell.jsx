import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Music } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-gray-950">
      {/* 모바일 오버레이 배경 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바: 항상 fixed - 레이아웃 흐름에서 제외 */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* 메인 영역: 사이드바 너비만큼 margin-left로 공간 확보
          모바일(<md): ml-0 (사이드바 오버레이라 공간 불필요)
          태블릿(md~lg): ml-14 (아이콘 사이드바 w-14 = 3.5rem)
          PC(lg+): ml-56 (풀 사이드바 w-56 = 14rem) */}
      <div className="h-full flex flex-col md:ml-14 lg:ml-56">
        {/* 모바일 전용 상단 바 */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Music size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">SongForm</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
