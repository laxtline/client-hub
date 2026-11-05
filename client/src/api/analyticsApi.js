// Analytics API calls — wraps the /analytics endpoints (dashboard numbers).
import axiosClient from './axiosClient.js';

export const analyticsApi = {
  // Admin totals: revenue, pending, active/completed counts, top clients.
  admin: (signal) => axiosClient.get('/analytics/admin', { signal }),
  // Logged-in client's own summary: projects + progress, invoice counts.
  client: (signal) => axiosClient.get('/analytics/client', { signal }),
};
