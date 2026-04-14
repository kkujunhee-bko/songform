import { useAuthStore } from '../store/authStore'

const ALL_GRANTED = { can_read: true, can_create: true, can_edit: true, can_delete: true }
const ALL_DENIED  = { can_read: false, can_create: false, can_edit: false, can_delete: false }

/**
 * 현재 로그인 유저의 특정 메뉴에 대한 권한을 반환합니다.
 * - admin: 항상 모든 권한 허용
 * - 비관리자: role_permissions 테이블 기준 (authStore.myPermissions)
 *
 * @param {string} menuKey - CONFIGURABLE_MENUS 의 key 값
 * @returns {{ can_read, can_create, can_edit, can_delete }}
 */
export function usePermission(menuKey) {
  const user          = useAuthStore(s => s.user)
  const myPermissions = useAuthStore(s => s.myPermissions)

  if (!user) return ALL_DENIED
  if (user.role === 'admin') return ALL_GRANTED

  const perm = myPermissions?.find(p => p.menu_key === menuKey)
  return perm ?? ALL_DENIED
}
