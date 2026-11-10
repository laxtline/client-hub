import axiosClient from './axiosClient.js';

export const accountApi = {
  list: (signal) => axiosClient.get('/accounts', { signal }),
  createTeam: (data) => axiosClient.post('/accounts/team', data),
  resetPassword: (id) => axiosClient.post(`/accounts/${id}/reset-password`),
  setDisabled: (id, disabled) => axiosClient.patch(`/accounts/${id}/status`, { disabled }),
};
