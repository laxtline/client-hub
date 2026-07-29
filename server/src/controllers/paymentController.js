// Payment controller — create a gateway order and handle the webhook callback.
// Webhook security: we verify the Razorpay signature BEFORE trusting any event.
import prisma from '../config/db.js';
import { createPaymentOrder, markInvoicePaidFromWebhook } from '../services/paymentService.js';
import { paymentsEnabled } from '../config/razorpay.js';
import { verifyRazorpaySignature } from '../utils/webhookVerify.js';
import logger from '../utils/logger.js';

// POST /api/payments/order/:invoiceId — client starts a payment from their portal
export async function createOrder(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role === 'client') {
      const client = await prisma.client.findUnique({ where: { linkedUserId: req.user.id } });
      if (invoice.clientId !== client?.id) return res.status(403).json({ message: 'Forbidden' });
    }
    if (invoice.status === 'paid') return res.status(400).json({ message: 'Already paid' });
    // A missing gateway key is a configuration state, not a crash — say so
    // clearly (503) instead of returning a generic 500 to the payer.
    if (!paymentsEnabled) {
      return res
        .status(503)
        .json({ message: 'Online payments are not configured on this server.' });
    }

    const { order } = await createPaymentOrder(invoice);
    // Return the public key + order so the frontend can open the Razorpay widget.
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

// POST /api/payments/webhook — called by Razorpay (NOT the browser).
// Mounted with a raw body parser so the signature can be verified byte-for-byte.
export async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const valid = verifyRazorpaySignature(
      req.body, // raw Buffer
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    if (!valid) {
      logger.warn('Rejected webhook with invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    // Only act on a successful capture; ignore other event types.
    if (event.event === 'payment.captured') {
      await markInvoicePaidFromWebhook(event.payload.payment.entity);
    }
    res.json({ received: true }); // always 200 so the gateway stops retrying
  } catch (err) {
    logger.error(`Webhook error: ${err.message}`);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}

// GET /api/payments/history — payment log (admin: all, client: own)
export async function paymentHistory(req, res, next) {
  try {
    const where = {};
    if (req.user.role === 'client') {
      const client = await prisma.client.findUnique({ where: { linkedUserId: req.user.id } });
      where.invoice = { clientId: client?.id || '__none__' };
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
