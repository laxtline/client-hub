// Client routes — all protected; writes restricted to admin via authorize().
// Input is validated with Zod before reaching the controller.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateRequest.js';
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
router.use(authenticate); // every client route requires login

// Validation schemas (kept here next to the routes they protect).
const createSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  portalPassword: z.string().min(6).optional().or(z.literal('')),
});
const updateSchema = createSchema.partial();

router.get('/', authorize('admin', 'team_member'), listClients);
router.get('/:id', authorize('admin', 'team_member'), getClient);
router.post('/', authorize('admin'), validate(createSchema), createClient);
// Logo upload (multipart) — admin only; `logo` is the form field name.
router.post('/upload-logo', authorize('admin'), upload.single('logo'), uploadLogo);
router.put('/:id', authorize('admin'), validate(updateSchema), updateClient);
router.patch('/:id/archive', authorize('admin'), archiveClient);
router.delete('/:id', authorize('admin'), deleteClient);

export default router;
