// Notification API calls — wraps the /notifications endpoints (bell UI).
import axiosClient from './axiosClient.js';

export const notificationApi = {
  // Returns { notifications, unread }.
  list: () => axiosClient.get('/notifications'),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
};
