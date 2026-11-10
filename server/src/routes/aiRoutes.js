import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { generateSummary, getSummaries } from '../controllers/aiController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);
router.use(authorize('admin', 'client'));

router.post('/summary/:projectId', authorize('admin'), generateSummary);
router.get('/summary/:projectId', getSummaries);

export default router;
