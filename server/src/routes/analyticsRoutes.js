// Analytics routes — admin totals and per-client summary.
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { adminAnalytics, clientAnalytics } from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate);

router.get('/admin', authorize('admin', 'team_member'), adminAnalytics);
router.get('/client', authorize('client'), clientAnalytics);

export default router;
