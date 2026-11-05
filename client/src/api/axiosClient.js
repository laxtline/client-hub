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
const MAX_PENDING = 50;
const MAX_REFRESH_RETRIES = 2;
const REFRESH_RETRY_DELAY = 1000; // ms
let refreshPromise = null;

// Share refresh requests across session restoration, StrictMode and API retries.
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh()
      .then((session) => {
        setAccessToken(session.accessToken);
        window.dispatchEvent(new CustomEvent('auth:refresh', { detail: session }));
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function attemptRefresh(retryCount = 0) {
  try {
    const { data } = await axiosClient.post('/auth/refresh');
    return { accessToken: data.accessToken, user: data.user };
  } catch (err) {
    if (!err.response && retryCount < MAX_REFRESH_RETRIES) {
      // wait a bit before retry, helps on flaky wifi
      await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY * (retryCount + 1)));
      return attemptRefresh(retryCount + 1);
    }
    throw err;
  }
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
    ].includes(originalRequest?.url);
    if (status !== 401 || !originalRequest || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      if (pendingRequests.length >= MAX_PENDING) {
        return Promise.reject(new Error('Too many pending refresh requests'));
      }
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosClient(originalRequest);
        })
        .catch((e) => Promise.reject(e));
    }

    isRefreshing = true;

    try {
      const { accessToken: newAccessToken } = await refreshSession();

      accessToken = newAccessToken;

      pendingRequests.forEach(({ resolve }) => resolve(newAccessToken));
      pendingRequests = [];

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshErr) {
      accessToken = null;
      pendingRequests.forEach(({ reject }) => reject(refreshErr));
      pendingRequests = [];

      const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];
      if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) {
        window.location.assign('/login');
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;
