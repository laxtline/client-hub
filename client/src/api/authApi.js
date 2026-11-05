// Auth API calls — wraps the /auth endpoints.
// Note: /auth/refresh is handled automatically by axiosClient interceptor.
import axiosClient from './axiosClient.js';

export const authApi = {
  login: (data, signal) => axiosClient.post('/auth/login', data, { signal }),
  signup: (data, signal) => axiosClient.post('/auth/signup', data, { signal }),
  me: (signal) => axiosClient.get('/auth/me', { signal }),
  forgotPassword: (email, signal) =>
    axiosClient.post('/auth/forgot-password', { email }, { signal }),
  resetPassword: (data, signal) => axiosClient.post('/auth/reset-password', data, { signal }),
  logout: (signal) => axiosClient.post('/auth/logout', undefined, { signal }),
};
