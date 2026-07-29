// Task API calls — wraps the /tasks endpoints (Kanban board, comments, time).
import axiosClient from './axiosClient.js';

export const taskApi = {
  // List tasks, optionally filtered by project (used to populate the Kanban board).
  list: (projectId) => axiosClient.get('/tasks', { params: { projectId } }),
  // Tasks assigned to the logged-in user, across every project.
  listMine: (params) => axiosClient.get('/tasks/mine', { params }),
  create: (data) => axiosClient.post('/tasks', data),
  // Move a card between Kanban columns (todo | in_progress | review | done).
  updateStatus: (id, status) => axiosClient.patch(`/tasks/${id}/status`, { status }),
  update: (id, data) => axiosClient.put(`/tasks/${id}`, data),
  remove: (id) => axiosClient.delete(`/tasks/${id}`),

  // Comment thread on a task.
  listComments: (id) => axiosClient.get(`/tasks/${id}/comments`),
  addComment: (id, text) => axiosClient.post(`/tasks/${id}/comments`, { text }),
};
