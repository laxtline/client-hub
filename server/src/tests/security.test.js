// Security-critical unit tests. These cover the two places where getting the
// logic wrong silently costs money or leaks data: the payment webhook signature
// check, and the RBAC middleware that guards every write endpoint.
import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

import { verifyRazorpaySignature } from '../utils/webhookVerify.js';
import { authorize } from '../middleware/roleMiddleware.js';

const SECRET = 'test_webhook_secret';
const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

describe('verifyRazorpaySignature', () => {
  it('accepts a signature produced with the shared secret', () => {
    expect(verifyRazorpaySignature(body, sign(body, SECRET), SECRET)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    // This is the attack that would otherwise mark invoices paid for free.
    expect(verifyRazorpaySignature(body, sign(body, 'attacker_secret'), SECRET)).toBe(false);
  });

  it('rejects a tampered body even with a once-valid signature', () => {
    const signature = sign(body, SECRET);
    const tampered = Buffer.from(JSON.stringify({ event: 'payment.captured', amount: 1 }));
    expect(verifyRazorpaySignature(tampered, signature, SECRET)).toBe(false);
  });

  it('rejects when the signature or secret is missing', () => {
    expect(verifyRazorpaySignature(body, undefined, SECRET)).toBe(false);
    expect(verifyRazorpaySignature(body, sign(body, SECRET), undefined)).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    // timingSafeEqual throws on mismatched lengths — the guard must catch it.
    expect(() => verifyRazorpaySignature(body, 'abc123', SECRET)).not.toThrow();
    expect(verifyRazorpaySignature(body, 'abc123', SECRET)).toBe(false);
  });
});

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('authorize (RBAC)', () => {
  it('lets an allowed role through', () => {
    const next = vi.fn();
    const res = mockRes();
    authorize('admin')({ user: { role: 'admin' } }, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('blocks a role that is not on the list with 403', () => {
    const next = vi.fn();
    const res = mockRes();
    authorize('admin')({ user: { role: 'client' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('blocks an unauthenticated request with 401', () => {
    const next = vi.fn();
    const res = mockRes();
    authorize('admin')({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('accepts any one of several allowed roles', () => {
    const next = vi.fn();
    authorize('admin', 'team_member')({ user: { role: 'team_member' } }, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
