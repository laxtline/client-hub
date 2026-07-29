// Auth API calls — wraps the /auth endpoints.
import axiosClient from './axiosClient.js';

export const authApi = {
  login: (data) => axiosClient.post('/auth/login', data),
  signup: (data) => axiosClient.post('/auth/signup', data),
  me: () => axiosClient.get('/auth/me'),
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }),
  resetPassword: (data) => axiosClient.post('/auth/reset-password', data),
};
