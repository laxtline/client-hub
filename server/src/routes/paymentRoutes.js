import { Router } from 'express';
import { validate } from '../middleware/validateRequest.js';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { createOrder, simulatePayment, paymentHistory } from '../controllers/paymentController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);
router.use(authorize('admin', 'client'));

function validateSimulate(body) {
  const errors = [];
  if (!body.invoiceId) errors.push('invoiceId required');
  if (body.amount === undefined || body.amount < 0) errors.push('amount must be non-negative');
  if (body.method !== 'mock') errors.push('method must be mock');
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: { invoiceId: body.invoiceId, amount: parseFloat(body.amount), method: body.method } };
}

router.post('/order/:invoiceId', createOrder);
router.post('/simulate', validate(validateSimulate), simulatePayment);
router.get('/history', paymentHistory);

export default router;
