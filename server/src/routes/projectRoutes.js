import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate, optionalDate } from '../middleware/validateRequest.js';
import { validateQuery, paginationSchema } from '../middleware/validateQuery.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
} from '../controllers/projectController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);

const allowedStatus = ['not_started', 'in_progress', 'completed', 'on_hold'];

function validateCreate(body) {
  const errors = [];
  if (!body.clientId) errors.push('clientId required');
  if (!body.title || body.title.trim().length < 2) errors.push('Title must be at least 2 characters');
  if (body.budget !== undefined && body.budget < 0) errors.push('Budget must be positive');
  if (body.status && !allowedStatus.includes(body.status)) errors.push('Invalid status');
  if (body.startDate && !optionalDate(body.startDate)) errors.push('Invalid startDate');
  if (body.deadline && !optionalDate(body.deadline)) errors.push('Invalid deadline');
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    data: {
      clientId: body.clientId,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      budget: body.budget || 0,
      startDate: body.startDate || null,
      deadline: body.deadline || null,
      status: body.status || 'not_started',
    },
  };
}

function validateUpdate(body) {
  const errors = [];
  if (body.title !== undefined && body.title.trim().length < 2) errors.push('Title must be at least 2 characters');
  if (body.budget !== undefined && body.budget < 0) errors.push('Budget must be positive');
  if (body.status && !allowedStatus.includes(body.status)) errors.push('Invalid status');
  if (body.startDate && !optionalDate(body.startDate)) errors.push('Invalid startDate');
  if (body.deadline && !optionalDate(body.deadline)) errors.push('Invalid deadline');
  if (errors.length) return { valid: false, errors };
  const data = {};
  if (body.clientId) data.clientId = body.clientId;
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description.trim();
  if (body.budget !== undefined) data.budget = body.budget;
  if (body.startDate !== undefined) data.startDate = body.startDate;
  if (body.deadline !== undefined) data.deadline = body.deadline;
  if (body.status !== undefined) data.status = body.status;
  return { valid: true, data };
}

const listQuerySchema = (query) => {
  const pageResult = paginationSchema()(query);
  if (!pageResult.valid) return pageResult;
  if (query.status && !allowedStatus.includes(query.status)) {
    return { valid: false, errors: ['Invalid status'] };
  }
  return { valid: true, data: { ...pageResult.data, status: query.status } };
};

router.get('/', validateQuery(listQuerySchema), listProjects);
router.get('/:id', getProject);
router.post('/', authorize('admin'), validate(validateCreate), createProject);
router.put('/:id', authorize('admin'), validate(validateUpdate), updateProject);
router.patch('/:id/archive', authorize('admin'), archiveProject);

export default router;
