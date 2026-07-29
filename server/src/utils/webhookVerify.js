// Verifies that an incoming Razorpay webhook genuinely came from Razorpay.
// WHY: anyone can POST to our webhook URL; without verifying the signature an
// attacker could mark invoices "paid" for free. We recompute the HMAC of the
// raw body using our shared secret and compare it to the header signature.
import crypto from 'crypto';

/**
 * @param {Buffer|string} rawBody - the exact raw request body bytes
 * @param {string} signature - value of the x-razorpay-signature header
 * @param {string} secret - RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean} true only if the signature is valid
 */
export function verifyRazorpaySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // timingSafeEqual avoids leaking info via comparison timing
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
