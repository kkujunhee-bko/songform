import { create } from 'zustand';
import api from '../api/client';

function applyTheme(theme) {
  const t = theme || 'dark';
  localStorage.setItem('songform-theme', t);
  if (t === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,        // 앱 시작 시 토큰 검증 중 여부
  myPermissions: [],    // 현재 유저 역할의 메뉴 권한 목록

  // 권한 로드 (로그인/init 후 호출)
  loadMyPermissions: async () => {
    try {
      const result = await api.get('/role-permissions/my');
      set({ myPermissions: result.permissions || [] });
    } catch {
      // 권한 로드 실패 시 빈 배열 유지
    }
  },

  // 앱 시작 시 토큰 검증
  init: async () => {
    const token = localStorage.getItem('songform-token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      set({ token });                          // 요청 전 토큰 세팅
      const user = await api.get('/auth/me');
      applyTheme(user.theme);
      set({ user, token, loading: false });
      // 권한 로드
      const result = await api.get('/role-permissions/my').catch(() => ({ permissions: [] }));
      set({ myPermissions: result.permissions || [] });
    } catch {
      localStorage.removeItem('songform-token');
      set({ user: null, token: null, loading: false, myPermissions: [] });
    }
  },

  // 로그인
  login: async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('songform-token', token);
    applyTheme(user.theme);
    set({ token, user });
    // 권한 로드
    const result = await api.get('/role-permissions/my').catch(() => ({ permissions: [] }));
    set({ myPermissions: result.permissions || [] });
    return user;
  },

  // 로그아웃
  logout: () => {
    localStorage.removeItem('songform-token');
    set({ user: null, token: null, myPermissions: [] });
  },

  // 다크/라이트 모드 토글 (서버에 저장)
  toggleTheme: async () => {
    const { user } = get();
    if (!user) return;
    const next = user.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ user: { ...user, theme: next } });
    try {
      await api.patch('/auth/theme', { theme: next });
    } catch {
      // 실패해도 UI는 유지
    }
  },
}));
