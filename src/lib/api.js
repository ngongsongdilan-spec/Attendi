import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// JWTs live ONLY in httpOnly cookies (set by the backend). This client never
// reads or writes tokens from JS-accessible storage, so an XSS cannot steal them.
const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const clearAuthCache = () => {
  localStorage.removeItem('fet_auth');
  localStorage.removeItem('fet_user');
  localStorage.removeItem('fet_user_role');
  localStorage.removeItem('fet_user_name');
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // The refresh cookie (httpOnly) is sent automatically.
        await axios.post(`${API_BASE}/api/v1/auth/refresh/`, null, { withCredentials: true });
        return api(originalRequest);
      } catch {
        clearAuthCache();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;