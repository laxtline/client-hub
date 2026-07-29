// Task routes — admin & team members manage tasks; comments open to all logged-in.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateRequest.js';
import {
  listTasks,
  listMyTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  listComments,
  addComment,
  listActivity,
} from '../controllers/taskController.js';

const router = Router();
router.use(authenticate);

// Validation schemas.
const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  assignedToUserId: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional().nullable(),
});
const statusSchema = z.object({ status: z.enum(['todo', 'in_progress', 'review', 'done']) });
// The general edit form was previously unvalidated, so a malformed hoursLogged
// or an unknown status reached Prisma and surfaced as a 500.
const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  dueDate: z.string().optional().nullable(),
  hoursLogged: z.coerce.number().nonnegative().optional(),
});
const commentSchema = z.object({ text: z.string().min(1).max(2000) });

router.get('/', listTasks);
// Declared before the '/:id/...' routes so "mine" is never read as an id.
// Self-scoping: it only ever returns tasks assigned to the caller.
router.get('/mine', authorize('admin', 'team_member'), listMyTasks);
router.post('/', authorize('admin', 'team_member'), validate(createSchema), createTask);
router.patch('/:id/status', authorize('admin', 'team_member'), validate(statusSchema), updateTaskStatus);
router.put('/:id', authorize('admin', 'team_member'), validate(updateSchema), updateTask);
router.delete('/:id', authorize('admin'), deleteTask);

// Comment thread
router.get('/:id/comments', listComments);
router.post('/:id/comments', validate(commentSchema), addComment);

// Activity log (audit trail)
router.get('/:id/activity', listActivity);

export default router;
