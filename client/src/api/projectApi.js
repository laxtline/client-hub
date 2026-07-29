// Project API calls — wraps the /projects endpoints.
import axiosClient from './axiosClient.js';

export const projectApi = {
  list: (params) => axiosClient.get('/projects', { params }),
  get: (id) => axiosClient.get(`/projects/${id}`),
  create: (data) => axiosClient.post('/projects', data),
  update: (id, data) => axiosClient.put(`/projects/${id}`, data),
  archive: (id) => axiosClient.patch(`/projects/${id}/archive`),
};
