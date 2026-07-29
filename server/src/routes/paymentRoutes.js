// Payment routes. NOTE: the webhook is mounted separately in app.js with a RAW
// body parser (needed for signature verification), so it is NOT defined here.
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { createOrder, paymentHistory } from '../controllers/paymentController.js';

const router = Router();
router.use(authenticate);

router.post('/order/:invoiceId', createOrder);
router.get('/history', paymentHistory);

export default router;
