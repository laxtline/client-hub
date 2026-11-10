import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate, optionalDate } from '../middleware/validateRequest.js';
import { validateQuery } from '../middleware/validateQuery.js';
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
router.use(authenticate, requireWorkspaceAccess);

const allowedStatus = ['todo', 'in_progress', 'review', 'done'];
const allowedPriority = ['low', 'medium', 'high'];

function validateCreate(body) {
  const errors = [];
  if (!body.projectId) errors.push('projectId required');
  if (!body.title || body.title.trim().length < 2) errors.push('Title must be at least 2 characters');
  if (body.priority && !allowedPriority.includes(body.priority)) errors.push('Invalid priority');
  if (body.status && !allowedStatus.includes(body.status)) errors.push('Invalid status');
  if (body.dueDate && !optionalDate(body.dueDate)) errors.push('Invalid dueDate');
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    data: {
      projectId: body.projectId,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      assignedToUserId: body.assignedToUserId || null,
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      dueDate: body.dueDate || null,
    },
  };
}

function validateUpdate(body) {
  const errors = [];
  if (body.title !== undefined && body.title.trim().length < 2) errors.push('Title must be at least 2 characters');
  if (body.priority !== undefined && !allowedPriority.includes(body.priority)) errors.push('Invalid priority');
  if (body.status !== undefined && !allowedStatus.includes(body.status)) errors.push('Invalid status');
  if (body.dueDate !== undefined && !optionalDate(body.dueDate)) errors.push('Invalid dueDate');
  if (body.hoursLogged !== undefined && body.hoursLogged < 0) errors.push('hoursLogged must be positive');
  if (errors.length) return { valid: false, errors };
  const data = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || '';
  if (body.assignedToUserId !== undefined) data.assignedToUserId = body.assignedToUserId;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.status !== undefined) data.status = body.status;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;
  if (body.hoursLogged !== undefined) data.hoursLogged = body.hoursLogged;
  return { valid: true, data };
}

function validateStatus(body) {
  if (!body.status || !allowedStatus.includes(body.status)) return { valid: false, errors: ['Invalid status'] };
  return { valid: true, data: { status: body.status } };
}

function validateComment(body) {
  if (!body.text || body.text.trim().length < 1 || body.text.length > 2000) return { valid: false, errors: ['Comment required, max 2000 chars'] };
  return { valid: true, data: { text: body.text.trim() } };
}

const myTasksQuery = (query) => {
  if (query.status && !allowedStatus.includes(query.status)) return { valid: false, errors: ['Invalid status'] };
  return { valid: true, data: { status: query.status || '' } };
};

router.get('/', listTasks);
router.get('/mine', authorize('admin', 'team_member'), validateQuery(myTasksQuery), listMyTasks);
router.post('/', authorize('admin'), validate(validateCreate), createTask);
router.patch('/:id/status', authorize('admin', 'team_member'), validate(validateStatus), updateTaskStatus);
router.put('/:id', authorize('admin', 'team_member'), validate(validateUpdate), updateTask);
router.delete('/:id', authorize('admin'), deleteTask);
router.get('/:id/comments', listComments);
router.post('/:id/comments', validate(validateComment), addComment);
router.get('/:id/activity', listActivity);

export default router;
