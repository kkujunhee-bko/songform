import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, KeyRound, Info } from 'lucide-react'
import api from '../api/client'
import { CONFIGURABLE_MENUS, MANAGED_ROLES, PERMISSION_COLS } from '../lib/menuConfig'

// 빈 권한 행 생성
function emptyPerm(role, menuKey) {
  return { role, menu_key: menuKey, can_read: false, can_create: false, can_edit: false, can_delete: false }
}

// 서버 데이터 → 편집용 상태(matrix) 변환
// matrix[role][menu_key] = { can_read, can_create, can_edit, can_delete }
function buildMatrix(rows) {
  const matrix = {}
  for (const { value: role } of MANAGED_ROLES) {
    matrix[role] = {}
    for (const { key } of CONFIGURABLE_MENUS) {
      const found = rows.find(r => r.role === role && r.menu_key === key)
      matrix[role][key] = found
        ? { can_read: found.can_read, can_create: found.can_create, can_edit: found.can_edit, can_delete: found.can_delete }
        : { can_read: false, can_create: false, can_edit: false, can_delete: false }
    }
  }
  return matrix
}

// matrix → 서버 전송용 배열 변환
function flattenMatrix(matrix) {
  const arr = []
  for (const role of Object.keys(matrix)) {
    for (const menu_key of Object.keys(matrix[role])) {
      arr.push({ role, menu_key, ...matrix[role][menu_key] })
    }
  }
  return arr
}

// 역할 탭 배경 색상
const TAB_COLORS = {
  leader:   { active: 'bg-violet-600 text-white', dot: 'bg-violet-400' },
  user:     { active: 'bg-teal-600 text-white',   dot: 'bg-teal-400' },
  coworker: { active: 'bg-amber-600 text-white',  dot: 'bg-amber-400' },
}

export default function RolePermissionsPage() {
  const qc = useQueryClient()
  const [activeRole, setActiveRole] = useState(MANAGED_ROLES[0].value)
  const [matrix, setMatrix] = useState(null)
  const [saved, setSaved] = useState(false)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => api.get('/role-permissions'),
  })

  // 서버 데이터 로드 후 matrix 초기화
  useEffect(() => {
    if (rows.length >= 0) setMatrix(buildMatrix(rows))
  }, [rows])

  const saveMutation = useMutation({
    mutationFn: (permissions) => api.put('/role-permissions', { permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleToggle = (menuKey, permCol) => {
    setMatrix(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [menuKey]: {
          ...prev[activeRole][menuKey],
          [permCol]: !prev[activeRole][menuKey][permCol],
        },
      },
    }))
  }

  // 읽기 off 시 나머지도 모두 off
  const handleReadToggle = (menuKey) => {
    const cur = matrix[activeRole][menuKey]
    const nextRead = !cur.can_read
    setMatrix(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [menuKey]: nextRead
          ? { ...cur, can_read: true }
          : { can_read: false, can_create: false, can_edit: false, can_delete: false },
      },
    }))
  }

  const handleSave = () => {
    if (!matrix) return
    saveMutation.mutate(flattenMatrix(matrix))
  }

  // 역할별 요약 (읽기 권한 보유 메뉴 수)
  const summaryCount = (role) => {
    if (!matrix) return 0
    return CONFIGURABLE_MENUS.filter(m => matrix[role]?.[m.key]?.can_read).length
  }

  if (isLoading || !matrix) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">불러오는 중...</div>
      </div>
    )
  }

  const currentMatrix = matrix[activeRole]
  const colors = TAB_COLORS[activeRole]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={20} className="text-blue-400" />
            <h1 className="text-2xl font-bold text-white">회원 권한 관리</h1>
          </div>
          <p className="text-sm text-gray-500">
            역할별로 접근 가능한 메뉴와 CRUD 권한을 설정합니다.
          </p>
        </div>
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <Save size={15} />
          {saveMutation.isPending ? '저장 중...' : saved ? '저장 완료 ✓' : '저장'}
        </button>
      </div>

      {/* 역할 탭 */}
      <div className="flex gap-2 mb-5">
        {MANAGED_ROLES.map(r => {
          const isActive = activeRole === r.value
          const c = TAB_COLORS[r.value]
          const count = summaryCount(r.value)
          return (
            <button
              key={r.value}
              onClick={() => setActiveRole(r.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border
                ${isActive
                  ? `${c.active} border-transparent shadow-lg`
                  : 'text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white/70' : c.dot}`} />
              {r.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'text-gray-500'
              }`}>
                {count}/{CONFIGURABLE_MENUS.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* 안내 문구 */}
      <div className="flex items-start gap-2 border border-blue-900/50 rounded-lg px-4 py-3 mb-5 text-xs text-blue-300">
        <Info size={13} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>읽기</strong> 권한을 켜면 LNB 메뉴가 표시됩니다. 읽기를 끄면 등록·수정·삭제도 함께 비활성화됩니다.
        </span>
      </div>

      {/* 권한 테이블 */}
      <div className="card overflow-hidden p-0">
        {/* 헤더 행 */}
        <div className="grid border-b border-gray-700/60" style={{ gridTemplateColumns: '1fr repeat(4, 88px)' }}>
          <div className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">메뉴</div>
          {PERMISSION_COLS.map(col => (
            <div key={col.key} className="py-3 text-center">
              <div className="text-xs font-semibold text-gray-300">{col.label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{col.desc}</div>
            </div>
          ))}
        </div>

        {/* 메뉴 행들 */}
        <div className="divide-y divide-gray-800/60">
          {CONFIGURABLE_MENUS.map((menu) => {
            const Icon = menu.icon
            const perm = currentMatrix[menu.key]
            const isReadable = perm.can_read

            return (
              <div
                key={menu.key}
                className="grid items-center"
                style={{ gridTemplateColumns: '1fr repeat(4, 88px)' }}
              >
                {/* 메뉴명 */}
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isReadable ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-600'
                  }`}>
                    <Icon size={15} />
                  </div>
                  <span className={`text-sm font-medium ${isReadable ? 'text-white' : 'text-gray-500'}`}>
                    {menu.label}
                  </span>
                </div>

                {/* 읽기 토글 */}
                <div className="flex justify-center py-4">
                  <PermToggle
                    checked={perm.can_read}
                    onChange={() => handleReadToggle(menu.key)}
                    color="blue"
                  />
                </div>

                {/* 등록/수정/삭제 토글 */}
                {(['can_create', 'can_edit', 'can_delete']).map(col => (
                  <div key={col} className="flex justify-center py-4">
                    <PermToggle
                      checked={perm[col]}
                      onChange={() => handleToggle(menu.key, col)}
                      disabled={!isReadable}
                      color="green"
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* 저장 버튼 (하단 반복) */}
      <div className="mt-5 flex justify-end">
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <Save size={15} />
          {saveMutation.isPending ? '저장 중...' : saved ? '저장 완료 ✓' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ── 토글 버튼 컴포넌트 ──────────────────────────────────
function PermToggle({ checked, onChange, disabled = false, color = 'blue' }) {
  const colors = {
    blue:  { on: 'bg-blue-600',  ring: 'ring-blue-500/30' },
    green: { on: 'bg-green-600', ring: 'ring-green-500/30' },
  }
  const c = colors[color]

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-all duration-200 focus:outline-none
        ${checked && !disabled ? `${c.on} ring-2 ${c.ring}` : 'bg-gray-700'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
      `}
      aria-checked={checked}
      role="switch"
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
        ${checked && !disabled ? 'left-5' : 'left-0.5'}
      `} />
    </button>
  )
}
