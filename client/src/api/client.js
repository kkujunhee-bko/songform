import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 모든 요청에 JWT 토큰 첨부
api.interceptors.request.use(config => {
  const token = localStorage.getItem('songform-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // 401 → 로그인 페이지로 (이미 로그인 페이지면 제외)
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('songform-token');
      window.location.href = '/login';
    }
    const msg = err.response?.data?.error || err.message || '오류가 발생했습니다.';
    return Promise.reject(new Error(msg));
  }
);

export default api;
