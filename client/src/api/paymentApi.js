import axiosClient from './axiosClient.js';

export const paymentApi = {
  createOrder: (invoiceId, signal) =>
    axiosClient.post(`/payments/order/${invoiceId}`, undefined, { signal }),
  // Local demo only; no charge is made.
  simulate: (invoiceId, amount, signal) =>
    axiosClient.post('/payments/simulate', { invoiceId, amount, method: 'mock' }, { signal }),
  history: (signal) => axiosClient.get('/payments/history', { signal }),
};
