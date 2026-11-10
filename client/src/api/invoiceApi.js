import axiosClient from './axiosClient.js';

export const invoiceApi = {
  list: (params, signal) => axiosClient.get('/invoices', { params, signal }),
  get: (id, signal) => axiosClient.get(`/invoices/${id}`, { signal }),
  suggest: (projectId, signal) => axiosClient.get(`/invoices/suggest/${projectId}`, { signal }),
  create: (data, signal) => axiosClient.post('/invoices', data, { signal }),
  // Keep the PDF response as a blob.
  downloadPdf: (id, signal) =>
    axiosClient.get(`/invoices/${id}/pdf`, { responseType: 'blob', signal }),
};
