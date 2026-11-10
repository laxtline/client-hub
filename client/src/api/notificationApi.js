import axiosClient from './axiosClient.js';

export const notificationApi = {
  list: (signal) => axiosClient.get('/notifications', { signal }),
  markRead: (id, signal) => axiosClient.patch(`/notifications/${id}/read`, undefined, { signal }),
  markAllRead: (signal) => axiosClient.patch('/notifications/read-all', undefined, { signal }),
};
