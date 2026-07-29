// Payment business logic — creating gateway orders and applying webhook results.
// Razorpay specifics live here; the controller just calls these functions.
import prisma from '../config/db.js';
import { razorpay } from '../config/razorpay.js';
import { notifyUser } from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Create a Razorpay order for an invoice and a matching local Payment row.
 * Amount is sent to Razorpay in the smallest currency unit (paise).
 * @param {object} invoice - the invoice being paid
 * @returns {Promise<{order:object, payment:object}>}
 */
export async function createPaymentOrder(invoice) {
  if (!razorpay) throw new Error('Payment gateway not configured');

  const order = await razorpay.orders.create({
    amount: Math.round(invoice.totalAmount * 100), // paise
    currency: 'INR',
    receipt: `inv_${invoice.id}`,
    notes: { invoiceId: invoice.id },
  });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      gatewayTransactionId: order.id,
      status: 'created',
    },
  });

  return { order, payment };
}

/**
 * Apply a verified "payment captured" webhook: mark Payment + Invoice paid,
 * then notify the client. Called only AFTER signature verification.
 * @param {object} entity - razorpay payment entity from the webhook payload
 */
export async function markInvoicePaidFromWebhook(entity) {
  // The order id links back to the Payment row we created above.
  const orderId = entity.order_id;
  const payment = await prisma.payment.findFirst({
    where: { gatewayTransactionId: orderId },
    include: { invoice: { include: { client: true } } },
  });
  if (!payment) {
    logger.warn(`Webhook for unknown order ${orderId}`);
    return;
  }
  // Razorpay retries webhooks; a duplicate delivery must not clobber the
  // original paidAt or re-notify the client.
  if (payment.status === 'paid') {
    logger.info(`Duplicate webhook for order ${orderId} ignored`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'paid', paidAt: new Date() },
  });
  await prisma.invoice.update({
    where: { id: payment.invoiceId },
    data: { status: 'paid' },
  });

  // Notify the linked client user in real-time.
  const clientUserId = payment.invoice.client?.linkedUserId;
  if (clientUserId) {
    await notifyUser({
      userId: clientUserId,
      message: `Your payment for invoice ${payment.invoiceId} was received. Thank you!`,
      type: 'invoice_paid',
      // The invoice list is the deepest route that exists; there is no
      // /invoices/:id page, so linking to one would land on the 404 page.
      link: '/invoices',
    });
  }
  logger.info(`Invoice ${payment.invoiceId} marked paid via webhook`);
}
