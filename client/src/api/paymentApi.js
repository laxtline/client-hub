// Payment API calls — wraps the /payments endpoints (Razorpay order + history).
import axiosClient from './axiosClient.js';

export const paymentApi = {
  // Create a Razorpay order for an invoice; returns { orderId, amount, currency, keyId }.
  createOrder: (invoiceId) => axiosClient.post(`/payments/order/${invoiceId}`),
  history: () => axiosClient.get('/payments/history'),
};
