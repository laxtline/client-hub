// Invoice API calls — wraps the /invoices endpoints (list, create, suggest, PDF).
import axiosClient from './axiosClient.js';

export const invoiceApi = {
  list: (params) => axiosClient.get('/invoices', { params }),
  get: (id) => axiosClient.get(`/invoices/${id}`),
  // Auto-suggest line items from hours logged on a project's tasks (admin only).
  suggest: (projectId) => axiosClient.get(`/invoices/suggest/${projectId}`),
  create: (data) => axiosClient.post('/invoices', data),
  // PDF is streamed as binary, so we ask Axios for a Blob we can download.
  downloadPdf: (id) => axiosClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};
