import prisma from '../config/db.js';
import {
  createPaymentOrder,
  markInvoicePaidFromWebhook,
  recordDemoPayment,
} from '../services/paymentService.js';
import { paymentsEnabled } from '../config/razorpay.js';
import { verifyRazorpaySignature } from '../utils/webhookVerify.js';
import logger from '../utils/logger.js';

async function getClientId(user) {
  const c = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  return c?.id ?? null;
}

export async function createOrder(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      if (invoice.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }
    if (invoice.status === 'paid') return res.status(400).json({ message: 'Already paid' });
    if (!paymentsEnabled) {
      return res
        .status(503)
        .json({ message: 'Online payments are not configured on this server.' });
    }

    const { order } = await createPaymentOrder(invoice);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const valid = verifyRazorpaySignature(req.body, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
    if (!valid) {
      logger.warn('Rejected webhook with invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.captured') {
      await markInvoicePaidFromWebhook(event.payload.payment.entity);
    }
    res.json({ received: true });
  } catch (err) {
    logger.error(`Webhook error: ${err.message}`);
    res.status(err.statusCode || 500).json({ message: 'Webhook processing failed' });
  }
}

export async function simulatePayment(req, res, next) {
  try {
    const { invoiceId, amount, method } = req.body;

    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo payments are disabled in production.' });
    }
    if (
      !invoiceId ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      method !== 'mock'
    ) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, project: true },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      if (invoice.clientId !== cid) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Invoice already paid' });
    }

    if (Math.round(amount * 100) !== Math.round(invoice.totalAmount * 100)) {
      return res.status(400).json({ message: 'Amount mismatch' });
    }

    const payment = await recordDemoPayment(invoice);
    if (!payment) return res.status(409).json({ message: 'Invoice already paid' });

    res.status(200).json({
      payment,
      invoice: { id: invoice.id, status: 'paid', totalAmount: invoice.totalAmount },
    });
  } catch (err) {
    next(err);
  }
}

export async function paymentHistory(req, res, next) {
  try {
    const where = {};
    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      where.invoice = { clientId: cid || '__none__' };
    }
    const payments = await prisma.payment.findMany({
      where,
      include: { invoice: { select: { id: true, totalAmount: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
}
