// Payment business logic — creating gateway orders and applying webhook results.
// Razorpay specifics live here; the controller just calls these functions.
import prisma from '../config/db.js';
import { razorpay } from '../config/razorpay.js';
import { notifyUser } from './notificationService.js';
import logger from '../utils/logger.js';
import { emitToUser } from '../sockets/socketHandler.js';
import crypto from 'crypto';

async function announcePayment(invoice) {
  // A notification failure must never turn a committed payment into a failed request.
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['admin', 'team_member'] } },
          ...(invoice.client?.linkedUserId ? [{ id: invoice.client.linkedUserId }] : []),
        ],
      },
      select: { id: true },
    });
    const results = await Promise.allSettled(
      users.map(({ id }) => {
        emitToUser(id, 'invoice:updated', {
          invoiceId: invoice.id,
          projectId: invoice.projectId,
          status: 'paid',
        });
        return notifyUser({
          userId: id,
          message: `Payment received for invoice ${invoice.id}.`,
          type: 'invoice_paid',
          link: '/invoices',
        });
      })
    );
    for (const result of results) {
      if (result.status === 'rejected')
        logger.error(`Payment notification failed: ${result.reason.message}`);
    }
  } catch (err) {
    logger.error(`Payment notifications failed: ${err.message}`);
  }
}

export async function recordDemoPayment(invoice) {
  const payment = await prisma.$transaction(async (tx) => {
    // Conditional update locks the invoice: concurrent clicks can only pay it once.
    const claimed = await tx.invoice.updateMany({
      where: { id: invoice.id, status: { not: 'paid' } },
      data: { status: 'paid' },
    });
    if (!claimed.count) return null;
    return tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        status: 'paid',
        gatewayTransactionId: `mock_${crypto.randomBytes(8).toString('hex')}`,
        paidAt: new Date(),
      },
    });
  });
  if (payment) await announcePayment(invoice);
  return payment;
}

// Create a Razorpay order for an invoice and a matching local Payment row.
// Amount is sent to Razorpay in the smallest currency unit (paise).
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

// Apply a verified "payment captured" webhook: mark Payment + Invoice paid,
// then notify the client. Called only AFTER signature verification.
export async function markInvoicePaidFromWebhook(entity) {
  // The order id links back to the Payment row we created above.
  const orderId = entity.order_id;
  if (typeof orderId !== 'string' || !orderId) {
    throw Object.assign(new Error('Captured payment is missing its order ID'), { statusCode: 400 });
  }
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
  if (
    entity.status !== 'captured' ||
    entity.currency !== 'INR' ||
    !Number.isSafeInteger(entity.amount) ||
    entity.amount !== Math.round(payment.amount * 100) ||
    entity.amount !== Math.round(payment.invoice.totalAmount * 100)
  ) {
    throw Object.assign(
      new Error('Captured payment amount, currency or status does not match the invoice'),
      { statusCode: 400 }
    );
  }

  const changed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'paid' } },
      data: { status: 'paid', paidAt: new Date() },
    });
    if (!claimed.count) return false;
    const invoice = await tx.invoice.updateMany({
      where: { id: payment.invoiceId, status: { not: 'paid' } },
      data: { status: 'paid' },
    });
    return invoice.count > 0;
  });
  if (changed) await announcePayment(payment.invoice);
  logger.info(`Invoice ${payment.invoiceId} marked paid via webhook`);
}
