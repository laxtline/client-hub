import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { listNotifications, markRead, markAllRead } from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
