import axiosClient from './axiosClient.js';

export const taskApi = {
  list: (projectId, signal) => axiosClient.get('/tasks', { params: { projectId }, signal }),
  listMine: (params, signal) => axiosClient.get('/tasks/mine', { params, signal }),
  create: (data, signal) => axiosClient.post('/tasks', data, { signal }),
  updateStatus: (id, status, signal) =>
    axiosClient.patch(`/tasks/${id}/status`, { status }, { signal }),
  update: (id, data, signal) => axiosClient.put(`/tasks/${id}`, data, { signal }),
  remove: (id, signal) => axiosClient.delete(`/tasks/${id}`, { signal }),

  listComments: (id, signal) => axiosClient.get(`/tasks/${id}/comments`, { signal }),
  addComment: (id, text, signal) => axiosClient.post(`/tasks/${id}/comments`, { text }, { signal }),
};
