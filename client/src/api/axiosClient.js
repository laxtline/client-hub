import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests = [];

export function refreshSession() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  return axiosClient
    .post('/auth/refresh')
    .then((res) => {
      const { accessToken: newToken, user } = res.data;
      setAccessToken(newToken);
      window.dispatchEvent(new CustomEvent('auth:refresh', { detail: { accessToken: newToken, user } }));
      pendingRequests.forEach(({ resolve }) => resolve({ accessToken: newToken, user }));
      pendingRequests = [];
      return { accessToken: newToken, user };
    })
    .catch((err) => {
      accessToken = null;
      pendingRequests.forEach(({ reject }) => reject(err));
      pendingRequests = [];
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
    });
}

axiosClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;

    const isAuthEndpoint = [
      '/auth/login',
      '/auth/signup',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/change-password',
    ].includes(originalRequest?.url);

    if (status !== 401 || !originalRequest || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      const { accessToken: newAccessToken } = await refreshSession();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshErr) {
      accessToken = null;
      const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];
      if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) {
        window.location.assign('/login');
      }
      return Promise.reject(refreshErr);
    }
  }
);

export default axiosClient;
