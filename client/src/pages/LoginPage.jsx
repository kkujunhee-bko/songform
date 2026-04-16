import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const loadAll = useSettingsStore(s => s.loadAll)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      await loadAll()
      // admin → 설정 페이지, 일반 사용자 → 목록
      navigate(user.role === 'admin' ? '/settings' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Music size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SongForm</h1>
          <p className="text-sm text-gray-500 mt-1">엘리아다 예배 송폼 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">아이디 (이메일)</label>
            <input
              type="text"
              className="input"
              placeholder="admin 또는 이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input
              type="password"
              className="input"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={16} />
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          계정이 없으신가요? 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  )
}
