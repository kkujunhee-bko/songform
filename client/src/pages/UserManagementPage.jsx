import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, UserCheck, UserX, ShieldCheck, User, X, Check } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const ROLE_MAP = {
  admin:    { label: '관리자', badgeCls: 'bg-blue-600/20 text-blue-400',   iconCls: 'bg-blue-600/20 text-blue-400' },
  leader:   { label: '리더',   badgeCls: 'bg-violet-600/20 text-violet-400', iconCls: 'bg-violet-600/20 text-violet-400' },
  user:     { label: '단원',   badgeCls: 'bg-teal-600/20 text-teal-400',   iconCls: 'bg-teal-600/20 text-teal-400' },
  coworker: { label: '동역',   badgeCls: 'bg-amber-600/20 text-amber-400', iconCls: 'bg-amber-600/20 text-amber-400' },
}

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role: 'user', is_active: true }

function UserFormModal({ initial, onSave, onClose, isEdit }) {
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md card shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? '회원 정보 수정' : '새 회원 추가'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">이름 *</label>
              <input className="input" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="김성도" required />
            </div>
            <div>
              <label className="label">구분</label>
              <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="leader">리더</option>
                <option value="user">단원</option>
                <option value="coworker">동역</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">아이디 (이메일) *</label>
            <input className="input" type="text" value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="예: user@church.org 또는 임의 ID" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">휴대폰 번호</label>
              <input className="input" value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="label">비밀번호 {isEdit && <span className="text-gray-600">(변경 시만 입력)</span>}</label>
              <input className="input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? '변경하지 않으면 공란' : '필수'}
                required={!isEdit} />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-blue-500" />
              <label htmlFor="is_active" className="text-sm text-gray-300 cursor-pointer">
                계정 활성화
              </label>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
              취소
            </button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center disabled:opacity-50">
              <Check size={15} />
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)

  const [modal, setModal] = useState(null)  // null | { mode: 'create' | 'edit', data }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/users/${id}`, data),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: invalidate,
  })

  const handleDelete = (user) => {
    if (!confirm(`"${user.name}" 회원을 삭제하시겠습니까?`)) return
    deleteMutation.mutate(user.id)
  }

  const handleSave = async (form) => {
    if (modal.mode === 'create') {
      await createMutation.mutateAsync(form)
    } else {
      await updateMutation.mutateAsync({ id: modal.data.id, ...form })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">회원 관리</h1>
          <p className="text-sm text-gray-500 mt-1">총 {users.length}명</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModal({ mode: 'create', data: EMPTY_FORM })}
        >
          <Plus size={16} />
          새 회원 추가
        </button>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">불러오는 중...</div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id}
              className="card flex items-center gap-4">
              {/* 아이콘 */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ROLE_MAP[user.role]?.iconCls ?? 'bg-gray-700 text-gray-400'}`}>
                {user.role === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{user.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_MAP[user.role]?.badgeCls ?? 'bg-gray-700 text-gray-400'}`}>
                    {ROLE_MAP[user.role]?.label ?? user.role}
                  </span>
                  {!user.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">비활성</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span>{user.email}</span>
                  {user.phone && <span>{user.phone}</span>}
                </div>
              </div>

              {/* 상태 아이콘 */}
              <div className="flex-shrink-0">
                {user.is_active
                  ? <UserCheck size={14} className="text-green-500" />
                  : <UserX size={14} className="text-red-500" />}
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  className="btn btn-ghost p-2"
                  onClick={() => setModal({ mode: 'edit', data: { ...user, password: '' } })}
                  title="수정"
                >
                  <Pencil size={14} />
                </button>
                {String(user.id) !== String(currentUser?.id) && (
                  <button
                    className="btn btn-ghost p-2 hover:text-red-400"
                    onClick={() => handleDelete(user)}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 모달 */}
      {modal && (
        <UserFormModal
          initial={modal.data}
          isEdit={modal.mode === 'edit'}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
