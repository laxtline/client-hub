// Notification API calls — wraps the /notifications endpoints (bell UI).
import axiosClient from './axiosClient.js';

export const notificationApi = {
  // Returns { notifications, unread }.
  list: (signal) => axiosClient.get('/notifications', { signal }),
  markRead: (id, signal) => axiosClient.patch(`/notifications/${id}/read`, undefined, { signal }),
  markAllRead: (signal) => axiosClient.patch('/notifications/read-all', undefined, { signal }),
};
