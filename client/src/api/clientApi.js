// Client API calls — wraps the /clients endpoints.
import axiosClient from './axiosClient.js';

export const clientApi = {
  list: (params) => axiosClient.get('/clients', { params }),
  get: (id) => axiosClient.get(`/clients/${id}`),
  create: (data) => axiosClient.post('/clients', data),
  update: (id, data) => axiosClient.put(`/clients/${id}`, data),
  archive: (id) => axiosClient.patch(`/clients/${id}/archive`),
  remove: (id) => axiosClient.delete(`/clients/${id}`),
  // Upload a logo image (multipart). Returns { url } to store as logoUrl.
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return axiosClient.post('/clients/upload-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
