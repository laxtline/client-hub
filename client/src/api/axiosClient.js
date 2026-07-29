// Shared Axios instance. An interceptor attaches the JWT to every request so
// individual API files don't have to repeat that logic.
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach the token (saved at login) to the Authorization header.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says the token is invalid, clear it and send the user to login.
// A hard navigation (not just removeItem) also resets AuthContext's in-memory
// state — otherwise the app keeps rendering with a user that can't fetch anything.
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      // Skip the redirect on public auth pages (e.g. a wrong password on the
      // login form is also a 401 and must not reload the page).
      if (!AUTH_PAGES.some((p) => window.location.pathname.startsWith(p))) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
