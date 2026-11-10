import axiosClient from './axiosClient.js';

export const clientApi = {
  list: (params, signal) => axiosClient.get('/clients', { params, signal }),
  get: (id, signal) => axiosClient.get(`/clients/${id}`, { signal }),
  create: (data, signal) => axiosClient.post('/clients', data, { signal }),
  update: (id, data, signal) => axiosClient.put(`/clients/${id}`, data, { signal }),
  archive: (id, signal) => axiosClient.patch(`/clients/${id}/archive`, undefined, { signal }),
  remove: (id, signal) => axiosClient.delete(`/clients/${id}`, { signal }),
  // Send the image as form data.
  uploadLogo: (file, signal) => {
    const form = new FormData();
    form.append('logo', file);
    return axiosClient.post('/clients/upload-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    });
  },
};
