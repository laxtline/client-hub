import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    $transaction: vi.fn(),
    invoice: { findUnique: vi.fn() },
    payment: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock('../config/razorpay.js', () => ({ razorpay: null, paymentsEnabled: false }));
vi.mock('../services/notificationService.js', () => ({ notifyUser: vi.fn() }));
vi.mock('../sockets/socketHandler.js', () => ({ emitToUser: vi.fn() }));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import prisma from '../config/db.js';
import { notifyUser } from '../services/notificationService.js';
import { emitToUser } from '../sockets/socketHandler.js';
import { markInvoicePaidFromWebhook, recordDemoPayment } from '../services/paymentService.js';
import { simulatePayment } from '../controllers/paymentController.js';

const invoice = {
  id: 'inv1',
  projectId: 'project1',
  totalAmount: 118,
  client: { linkedUserId: 'client1' },
};
const entity = { order_id: 'order1', status: 'captured', amount: 11800, currency: 'INR' };
let tx;

beforeEach(() => {
  vi.resetAllMocks();
  tx = {
    invoice: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    payment: {
      create: vi.fn().mockResolvedValue({ id: 'pay1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  prisma.$transaction.mockImplementation((work) => work(tx));
  prisma.user.findMany.mockResolvedValue([{ id: 'admin1' }, { id: 'team1' }, { id: 'client1' }]);
  prisma.payment.findFirst.mockResolvedValue({
    id: 'pay1',
    invoiceId: 'inv1',
    amount: 118,
    status: 'created',
    invoice,
  });
});

describe('payment persistence', () => {
  it('rejects a webhook missing its order ID before querying a payment', async () => {
    await expect(
      markInvoicePaidFromWebhook({ ...entity, order_id: undefined })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });
  it('saves a demo payment and invoice together, then notifies all participants', async () => {
    expect(await recordDemoPayment(invoice)).toEqual({ id: 'pay1' });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceId: 'inv1', status: 'paid', amount: 118 }),
      })
    );
    expect(notifyUser).toHaveBeenCalledTimes(3);
    expect(emitToUser).toHaveBeenCalledWith(
      'team1',
      'invoice:updated',
      expect.objectContaining({ invoiceId: 'inv1', status: 'paid' })
    );
  });

  it('does not create a second payment when another request paid the invoice', async () => {
    tx.invoice.updateMany.mockResolvedValue({ count: 0 });
    expect(await recordDemoPayment(invoice)).toBeNull();
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it('still succeeds if notification storage fails after committing payment', async () => {
    notifyUser.mockRejectedValue(new Error('Notification unavailable'));
    await expect(recordDemoPayment(invoice)).resolves.toEqual({ id: 'pay1' });
  });

  it.each([{ amount: 1 }, { currency: 'USD' }, { status: 'authorized' }, { amount: '11800' }])(
    'rejects mismatched captured payment data: %j',
    async (change) => {
      await expect(markInvoicePaidFromWebhook({ ...entity, ...change })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it('updates webhook payment and invoice atomically', async () => {
    await markInvoicePaidFromWebhook(entity);
    expect(tx.payment.updateMany).toHaveBeenCalledOnce();
    expect(tx.invoice.updateMany).toHaveBeenCalledOnce();
    expect(notifyUser).toHaveBeenCalledTimes(3);
  });

  it('ignores concurrent duplicate webhook claims', async () => {
    tx.payment.updateMany.mockResolvedValue({ count: 0 });
    await markInvoicePaidFromWebhook(entity);
    expect(tx.invoice.updateMany).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it('ignores an already settled webhook without changing paidAt', async () => {
    prisma.payment.findFirst.mockResolvedValue({ status: 'paid' });
    await markInvoicePaidFromWebhook(entity);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['not-a-number', null, {}, -1])('rejects invalid demo amount %j', async (amount) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await simulatePayment({ body: { invoiceId: 'inv1', amount, method: 'mock' } }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
  });
});
