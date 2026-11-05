// Invoice API calls — wraps the /invoices endpoints (list, create, suggest, PDF).
import axiosClient from './axiosClient.js';

export const invoiceApi = {
  list: (params, signal) => axiosClient.get('/invoices', { params, signal }),
  get: (id, signal) => axiosClient.get(`/invoices/${id}`, { signal }),
  // Auto-suggest line items from hours logged on a project's tasks (admin only).
  suggest: (projectId, signal) => axiosClient.get(`/invoices/suggest/${projectId}`, { signal }),
  create: (data, signal) => axiosClient.post('/invoices', data, { signal }),
  // PDF is streamed as binary, so we ask Axios for a Blob we can download.
  downloadPdf: (id, signal) =>
    axiosClient.get(`/invoices/${id}/pdf`, { responseType: 'blob', signal }),
};
