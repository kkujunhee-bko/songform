import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Music, Mail, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../api/client'

export default function ForgotPasswordPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { name: name.trim(), email: email.trim() })
      setSuccess(true)
    } catch (err) {
      setError(err.message || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
          <p className="text-sm text-gray-500 mt-1">비밀번호 찾기</p>
        </div>

        {success ? (
          <div className="card space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">
              입력하신 정보와 일치하는 계정이 있을 경우<br />
              임시 비밀번호를 이메일로 발송했습니다.<br />
              <span className="text-gray-400 text-xs mt-1 block">로그인 후 마이페이지에서 비밀번호를 변경해 주세요.</span>
            </p>
            <Link to="/login" className="btn btn-primary w-full justify-center py-2.5">
              <ArrowLeft size={14} />
              로그인 페이지로
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div>
                <label className="label">이름</label>
                <input
                  type="text"
                  className="input"
                  placeholder="가입 시 등록한 이름"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">아이디 (이메일)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="가입 시 등록한 이메일"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email}
                className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={16} />
                {loading ? '발송 중...' : '임시 비밀번호 발송'}
              </button>

              <Link
                to="/login"
                className="btn w-full justify-center py-2.5 border border-blue-500 text-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <ArrowLeft size={16} />
                로그인으로 돌아가기
              </Link>
            </form>

            <p className="text-xs text-gray-600 text-left mt-6">
              회원 이름과 이메일 입력 후 [임시 비밀번호 발송] 버튼을 클릭하면 이메일로 임시 비밀번호를 발송해 드립니다.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
