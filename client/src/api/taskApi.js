// Task API calls — wraps the /tasks endpoints (Kanban board, comments, time).
import axiosClient from './axiosClient.js';

export const taskApi = {
  // List tasks, optionally filtered by project (used to populate the Kanban board).
  list: (projectId, signal) => axiosClient.get('/tasks', { params: { projectId }, signal }),
  // Tasks assigned to the logged-in user, across every project.
  listMine: (params, signal) => axiosClient.get('/tasks/mine', { params, signal }),
  create: (data, signal) => axiosClient.post('/tasks', data, { signal }),
  // Move a card between Kanban columns (todo | in_progress | review | done).
  updateStatus: (id, status, signal) =>
    axiosClient.patch(`/tasks/${id}/status`, { status }, { signal }),
  update: (id, data, signal) => axiosClient.put(`/tasks/${id}`, data, { signal }),
  remove: (id, signal) => axiosClient.delete(`/tasks/${id}`, { signal }),

  // Comment thread on a task.
  listComments: (id, signal) => axiosClient.get(`/tasks/${id}/comments`, { signal }),
  addComment: (id, text, signal) => axiosClient.post(`/tasks/${id}/comments`, { text }, { signal }),
};
