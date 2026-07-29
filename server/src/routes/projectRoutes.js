// Project routes — list/detail open to any logged-in user (controller enforces
// tenant isolation); create/update/archive restricted to admin. Input validated.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateRequest.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
} from '../controllers/projectController.js';

const router = Router();
router.use(authenticate);

const statusEnum = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);
const createSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  status: statusEnum.optional(),
});
const updateSchema = createSchema.partial();

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', authorize('admin'), validate(createSchema), createProject);
router.put('/:id', authorize('admin'), validate(updateSchema), updateProject);
router.patch('/:id/archive', authorize('admin'), archiveProject);

export default router;
