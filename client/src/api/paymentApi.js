// Payment API calls — wraps the /payments endpoints (Razorpay order + history + mock).
import axiosClient from './axiosClient.js';

export const paymentApi = {
  // Create a Razorpay order for an invoice; returns { orderId, amount, currency, keyId }.
  createOrder: (invoiceId, signal) =>
    axiosClient.post(`/payments/order/${invoiceId}`, undefined, { signal }),
  // Mock payment for demo/offline use — no Razorpay keys needed.
  simulate: (invoiceId, amount, signal) =>
    axiosClient.post('/payments/simulate', { invoiceId, amount, method: 'mock' }, { signal }),
  history: (signal) => axiosClient.get('/payments/history', { signal }),
};
