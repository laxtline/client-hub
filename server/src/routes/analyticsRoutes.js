import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { adminAnalytics, clientAnalytics, debugQuery } from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);

router.get('/admin', authorize('admin'), adminAnalytics);
router.get('/client', authorize('client'), clientAnalytics);

router.get('/debug', authorize('admin'), debugQuery);

export default router;
