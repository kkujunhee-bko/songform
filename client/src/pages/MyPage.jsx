import { useState } from 'react'
import { User, Phone, Lock, Save, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function MyPage() {
  const user = useAuthStore(s => s.user)
  const updateProfile = useAuthStore(s => s.updateProfile)

  const [phone, setPhone] = useState(user?.phone || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneSuccess, setPhoneSuccess] = useState(false)

  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneSuccess(false)
    setPhoneLoading(true)
    try {
      await updateProfile({ phone })
      setPhoneSuccess(true)
    } catch (err) {
      setPhoneError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPassword !== confirmPassword) {
      setPwError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 4) {
      setPwError('새 비밀번호는 4자 이상이어야 합니다.')
      return
    }
    setPwLoading(true)
    try {
      await updateProfile({ currentPassword, newPassword })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  const roleLabel = {
    admin: '관리자',
    leader: '리더',
    coworker: '동역',
    user: '단원',
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-100">마이페이지</h1>

      {/* 기본 정보 */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">기본 정보</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-gray-500">이름</span>
          <span className="text-gray-100">{user?.name}</span>
          <span className="text-gray-500">이메일</span>
          <span className="text-gray-100 break-all">{user?.email}</span>
          <span className="text-gray-500">권한</span>
          <span className="text-gray-100">{roleLabel[user?.role] || user?.role}</span>
        </div>
      </div>

      {/* 휴대폰 번호 수정 */}
      <form onSubmit={handlePhoneSubmit} className="card space-y-4">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">휴대폰 번호 변경</h2>
        </div>
        <div>
          <label className="label">휴대폰 번호</label>
          <input
            type="tel"
            className="input"
            placeholder="010-0000-0000"
            value={phone}
            onChange={e => {
              setPhone(e.target.value)
              setPhoneSuccess(false)
              setPhoneError('')
            }}
          />
        </div>
        {phoneError && (
          <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg px-3 py-2">
            {phoneError}
          </div>
        )}
        {phoneSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg px-3 py-2">
            <CheckCircle size={14} />
            휴대폰 번호가 저장되었습니다.
          </div>
        )}
        <button
          type="submit"
          disabled={phoneLoading}
          className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {phoneLoading ? '저장 중...' : '저장'}
        </button>
      </form>

      {/* 비밀번호 변경 */}
      <form onSubmit={handlePasswordSubmit} className="card space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">비밀번호 변경</h2>
        </div>
        <div>
          <label className="label">현재 비밀번호</label>
          <input
            type="password"
            className="input"
            placeholder="현재 비밀번호 입력"
            value={currentPassword}
            onChange={e => { setCurrentPassword(e.target.value); setPwError(''); setPwSuccess(false) }}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">새 비밀번호</label>
          <input
            type="password"
            className="input"
            placeholder="새 비밀번호 (4자 이상)"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(false) }}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">새 비밀번호 확인</label>
          <input
            type="password"
            className="input"
            placeholder="새 비밀번호 다시 입력"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setPwError(''); setPwSuccess(false) }}
            autoComplete="new-password"
          />
        </div>
        {pwError && (
          <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg px-3 py-2">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg px-3 py-2">
            <CheckCircle size={14} />
            비밀번호가 변경되었습니다.
          </div>
        )}
        <button
          type="submit"
          disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
          className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock size={14} />
          {pwLoading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}
