import prisma from '../config/db.js';
import { razorpay } from '../config/razorpay.js';
import { notifyUser } from './notificationService.js';
import logger from '../utils/logger.js';
import { emitToUser } from '../sockets/socketHandler.js';
import crypto from 'crypto';

async function announcePayment(invoice) {
  // Payment is already saved. Notification errors should not fail the request.
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
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
    // Only one request should claim an unpaid invoice.
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

// Razorpay expects paise.
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

export async function markInvoicePaidFromWebhook(entity) {
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
  // Do not apply the same capture twice.
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
