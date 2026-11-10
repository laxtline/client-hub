import axiosClient from './axiosClient.js';

export const aiApi = {
  generate: (projectId, signal) =>
    axiosClient.post(`/ai/summary/${projectId}`, undefined, { signal }),
  get: (projectId, signal) => axiosClient.get(`/ai/summary/${projectId}`, { signal }),
};
