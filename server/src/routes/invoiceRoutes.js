// Invoice routes — read open to logged-in (controller isolates clients);
// create restricted to admin. PDF download available to authorized users.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate, optionalDate } from '../middleware/validateRequest.js';
import { validateQuery, paginationSchema } from '../middleware/validateQuery.js';
import {
  listInvoices,
  getInvoice,
  suggestLineItems,
  createInvoice,
  downloadInvoicePDF,
} from '../controllers/invoiceController.js';

const router = Router();
router.use(authenticate);

// A line item must have a description, a positive quantity, and a non-negative rate.
const createSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.coerce.number().positive(),
        rate: z.coerce.number().nonnegative(),
      })
    )
    .min(1),
  taxRate: z.coerce.number().nonnegative().optional(),
  dueDate: optionalDate,
});

router.get(
  '/',
  validateQuery(
    paginationSchema().extend({
      status: z.enum(['pending', 'paid', 'overdue']).optional(),
    })
  ),
  listInvoices
);
router.get('/suggest/:projectId', authorize('admin'), suggestLineItems);
router.get('/:id', getInvoice);
router.get('/:id/pdf', downloadInvoicePDF);
router.post('/', authorize('admin'), validate(createSchema), createInvoice);

export default router;
