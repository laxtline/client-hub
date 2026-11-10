import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateRequest.js';
import { validateQuery, paginationSchema, sortSchema } from '../middleware/validateQuery.js';
import upload from '../config/multer.js';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  archiveClient,
  deleteClient,
  uploadLogo,
} from '../controllers/clientController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess);

function validateCreate(body) {
  const errors = [];
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 100) errors.push('Name must be 2–100 characters');
  if (typeof body.contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contactEmail.trim())) errors.push('Client login email required');
  if (body.logoUrl && !body.logoUrl.startsWith('http')) errors.push('Invalid logo URL');
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    data: {
      name: body.name.trim(),
      companyName: body.companyName?.trim() || '',
      contactEmail: body.contactEmail?.trim().toLowerCase() || '',
      contactPhone: body.contactPhone?.trim() || '',
      notes: body.notes?.trim() || '',
      logoUrl: body.logoUrl?.trim() || '',
    },
  };
}

function validateUpdate(body) {
  const errors = [];
  if (body.name !== undefined && body.name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (body.contactEmail !== undefined && body.contactEmail && !body.contactEmail.includes('@')) errors.push('Invalid email');
  if (body.logoUrl !== undefined && body.logoUrl && !body.logoUrl.startsWith('http')) errors.push('Invalid logo URL');
  if (errors.length) return { valid: false, errors };
  const data = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.companyName !== undefined) data.companyName = body.companyName.trim();
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail.trim().toLowerCase();
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone.trim();
  if (body.notes !== undefined) data.notes = body.notes.trim();
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl.trim();
  return { valid: true, data };
}

const listQuerySchema = (query) => {
  const pageResult = paginationSchema({ defaultLimit: 10, maxLimit: 100 })(query);
  if (!pageResult.valid) return pageResult;
  const sortResult = sortSchema(['name', 'companyName', 'createdAt'], 'createdAt', 'desc')(query);
  if (query.status && !['active', 'archived'].includes(query.status)) {
    return { valid: false, errors: ['Invalid status'] };
  }
  return { valid: true, data: { ...pageResult.data, ...sortResult.data, search: query.search || '', status: query.status || '' } };
};

router.get('/', authorize('admin'), validateQuery(listQuerySchema), listClients);
router.get('/:id', authorize('admin'), getClient);
router.post('/', authorize('admin'), validate(validateCreate), createClient);
router.post('/upload-logo', authorize('admin'), upload.single('logo'), uploadLogo);
router.put('/:id', authorize('admin'), validate(validateUpdate), updateClient);
router.patch('/:id/archive', authorize('admin'), archiveClient);
router.delete('/:id', authorize('admin'), deleteClient);

export default router;
