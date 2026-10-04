import axios from 'axios';

/**
 * Axios instance for all SyncSpace REST calls.
 *
 * Contract with backend:
 *  - baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
 *  - Cookies (httpOnly refresh token) are sent with withCredentials: true
 *  - All JSON responses are { success, message, data }
 */

export const TOKEN_KEY = 'syncspace_access_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — token lives in Redux only */
  }
}

export function clearToken() {
  setToken(null);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // refresh token lives in an httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Callback fired when refresh fails (registered by store.js). Lets the app
// dispatch a clean Redux logout instead of api.js importing the store
// (which would create a circular import).
let onAuthFailureHandler = null;
export function onAuthFailure(fn) {
  onAuthFailureHandler = fn;
}

// On 401 (not from an /auth/* call, and not a retry): try the refresh token
// once, store the new access token, and replay the original request.
// If refresh fails, log the user out and send them to /login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';

    const isAuthCall = url.includes('/auth/');
    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const refreshRes = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const accessToken = refreshRes.data?.data?.accessToken;
        if (!accessToken) throw new Error('No access token in refresh response');
        setToken(accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        clearToken();
        if (onAuthFailureHandler) {
          try {
            onAuthFailureHandler();
          } catch {
            /* handler errors must not mask the original failure */
          }
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.href = `/login?redirect=${encodeURIComponent(returnTo)}`;
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
