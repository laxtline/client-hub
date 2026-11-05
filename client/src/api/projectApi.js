// Project API calls — wraps the /projects endpoints.
import axiosClient from './axiosClient.js';

export const projectApi = {
  list: (params, signal) => axiosClient.get('/projects', { params, signal }),
  get: (id, signal) => axiosClient.get(`/projects/${id}`, { signal }),
  create: (data, signal) => axiosClient.post('/projects', data, { signal }),
  update: (id, data, signal) => axiosClient.put(`/projects/${id}`, data, { signal }),
  archive: (id, signal) => axiosClient.patch(`/projects/${id}/archive`, undefined, { signal }),
};
