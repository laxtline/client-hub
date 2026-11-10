import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
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
router.use(authenticate, requireWorkspaceAccess);
router.use(authorize('admin', 'client'));

const allowedInvoiceStatus = ['pending', 'paid', 'overdue'];

function validateCreate(body) {
  const errors = [];
  if (!body.projectId) errors.push('projectId required');
  if (!body.clientId) errors.push('clientId required');
  if (!body.lineItems || !Array.isArray(body.lineItems) || body.lineItems.length === 0) errors.push('At least one line item required');
  else {
    body.lineItems.forEach((item, i) => {
      if (!item.description || item.description.trim().length < 1) errors.push(`Line item ${i + 1}: description required`);
      if (item.quantity === undefined || item.quantity <= 0) errors.push(`Line item ${i + 1}: quantity must be positive`);
      if (item.rate === undefined || item.rate < 0) errors.push(`Line item ${i + 1}: rate must be non-negative`);
    });
  }
  if (body.taxRate !== undefined && body.taxRate < 0) errors.push('taxRate must be non-negative');
  if (body.dueDate && !optionalDate(body.dueDate)) errors.push('Invalid dueDate');
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    data: {
      projectId: body.projectId,
      clientId: body.clientId,
      lineItems: body.lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
      })),
      taxRate: body.taxRate || 0,
      dueDate: body.dueDate || null,
    },
  };
}

const invoiceQuerySchema = (query) => {
  const pageResult = paginationSchema()(query);
  if (!pageResult.valid) return pageResult;
  if (query.status && !allowedInvoiceStatus.includes(query.status)) {
    return { valid: false, errors: ['Invalid status'] };
  }
  return { valid: true, data: { ...pageResult.data, status: query.status || '' } };
};

router.get('/', validateQuery(invoiceQuerySchema), listInvoices);
router.get('/suggest/:projectId', authorize('admin'), suggestLineItems);
router.get('/:id', getInvoice);
router.get('/:id/pdf', downloadInvoicePDF);
router.post('/', authorize('admin'), validate(validateCreate), createInvoice);

export default router;
