// AI API calls — wraps the /ai endpoints (Groq-powered project summaries).
import axiosClient from './axiosClient.js';

export const aiApi = {
  // Admin-only "Generate Summary Now".
  generate: (projectId, signal) =>
    axiosClient.post(`/ai/summary/${projectId}`, undefined, { signal }),
  // Latest summary + history for a project; returns { latest, history }.
  get: (projectId, signal) => axiosClient.get(`/ai/summary/${projectId}`, { signal }),
};
