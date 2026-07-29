// Invoice controller — create/list invoices, suggest line items, export PDF.
import prisma from '../config/db.js';
import { calculateInvoiceTotal, suggestLineItemsFromHours } from '../services/invoiceService.js';
import { generateInvoicePDF } from '../utils/generatePDF.js';

// Helper: a client-role user's own Client id.
async function clientIdForUser(user) {
  if (user.role !== 'client') return null;
  const c = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  return c?.id ?? null;
}

// GET /api/invoices — admin sees all; client sees only their own
export async function listInvoices(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { ...(status && { status }) };
    if (req.user.role === 'client') {
      where.clientId = (await clientIdForUser(req.user)) || '__none__';
    }
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { client: true, project: { select: { title: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ invoices, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/:id
export async function getInvoice(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, project: true, payments: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role === 'client') {
      const cid = await clientIdForUser(req.user);
      if (invoice.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/suggest/:projectId — auto line items from logged hours
export async function suggestLineItems(req, res, next) {
  try {
    const items = await suggestLineItemsFromHours(req.params.projectId);
    res.json({ lineItems: items });
  } catch (err) {
    next(err);
  }
}

// POST /api/invoices — admin creates an invoice (total computed in service)
export async function createInvoice(req, res, next) {
  try {
    const { projectId, clientId, lineItems, taxRate, dueDate } = req.body;
    const totalAmount = calculateInvoiceTotal(lineItems, taxRate);
    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        clientId,
        lineItems,
        taxRate: Number(taxRate) || 0,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.status(201).json({ invoice });
  } catch (err) {
    next(err);
  }
}

// GET /api/invoices/:id/pdf — stream a generated PDF download
export async function downloadInvoicePDF(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, project: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    // Tenant isolation: a client can only download their OWN invoice PDF.
    if (req.user.role === 'client') {
      const cid = await clientIdForUser(req.user);
      if (invoice.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }

    const pdf = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.pdf`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
