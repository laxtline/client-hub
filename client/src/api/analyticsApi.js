import axiosClient from './axiosClient.js';

export const analyticsApi = {
  admin: (signal) => axiosClient.get('/analytics/admin', { signal }),
  client: (signal) => axiosClient.get('/analytics/client', { signal }),
};
