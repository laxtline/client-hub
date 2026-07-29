// AI API calls — wraps the /ai endpoints (Groq-powered project summaries).
import axiosClient from './axiosClient.js';

export const aiApi = {
  // Admin-only "Generate Summary Now".
  generate: (projectId) => axiosClient.post(`/ai/summary/${projectId}`),
  // Latest summary + history for a project; returns { latest, history }.
  get: (projectId) => axiosClient.get(`/ai/summary/${projectId}`),
};
