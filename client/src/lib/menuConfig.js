import { List, Plus, Settings } from 'lucide-react'

/**
 * 비관리자 역할에 대해 권한 설정이 가능한 메뉴 목록.
 * key 값은 role_permissions 테이블의 menu_key 와 동일해야 합니다.
 */
export const CONFIGURABLE_MENUS = [
  { key: 'forms_list',   label: '송폼 목록',     icon: List,     path: '/' },
  { key: 'forms_create', label: '새 송폼 만들기', icon: Plus,     path: '/forms/new' },  
]

/** 권한 관리 대상 역할 */
export const MANAGED_ROLES = [
  { value: 'leader',   label: '리더' },
  { value: 'user',     label: '단원' },
  { value: 'coworker', label: '동역' },
]

/** 역할 한글 레이블 조회 */
export function getRoleLabel(role) {
  return MANAGED_ROLES.find(r => r.value === role)?.label ?? role
}

/** 권한 컬럼 정의 */
export const PERMISSION_COLS = [
  { key: 'can_read',   label: '읽기',  desc: 'LNB 메뉴 표시' },
  { key: 'can_create', label: '등록',  desc: '새 항목 생성' },
  { key: 'can_edit',   label: '수정',  desc: '항목 편집' },
  { key: 'can_delete', label: '삭제',  desc: '항목 삭제' },
]
