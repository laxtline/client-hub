// Analytics API calls — wraps the /analytics endpoints (dashboard numbers).
import axiosClient from './axiosClient.js';

export const analyticsApi = {
  // Admin totals: revenue, pending, active/completed counts, top clients.
  admin: () => axiosClient.get('/analytics/admin'),
  // Logged-in client's own summary: projects + progress, invoice counts.
  client: () => axiosClient.get('/analytics/client'),
};
