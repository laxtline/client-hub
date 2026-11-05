// AI routes — generate is admin-only; read is available to authorized users
// (controller blocks clients from reading other clients' summaries).
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { generateSummary, getSummaries } from '../controllers/aiController.js';

const router = Router();
router.use(authenticate);

router.post('/summary/:projectId', authorize('admin'), generateSummary);
router.get('/summary/:projectId', getSummaries);

export default router;
