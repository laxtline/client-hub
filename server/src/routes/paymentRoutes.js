// Payment routes. NOTE: the webhook is mounted separately in app.js with a RAW
// body parser (needed for signature verification), so it is NOT defined here.
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { createOrder, simulatePayment, paymentHistory } from '../controllers/paymentController.js';

const router = Router();
router.use(authenticate);

router.post('/order/:invoiceId', createOrder);
router.post(
  '/simulate',
  validate(
    z.object({
      invoiceId: z.string().min(1),
      amount: z.number().finite().nonnegative(),
      method: z.literal('mock'),
    })
  ),
  simulatePayment
);
router.get('/history', paymentHistory);

export default router;
