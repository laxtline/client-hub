import prisma from '../config/db.js';
import { calculateInvoiceTotal, suggestLineItemsFromHours } from '../services/invoiceService.js';
import { generateInvoicePDF } from '../utils/generatePDF.js';

async function getClientId(user) {
  if (user.role !== 'client') return null;
  const c = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  return c?.id ?? null;
}

export async function listInvoices(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { ...(status && { status }) };
    if (req.user.role === 'client') {
      where.clientId = (await getClientId(req.user)) || '__none__';
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

export async function getInvoice(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, project: true, payments: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      if (invoice.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

export async function suggestLineItems(req, res, next) {
  try {
    const items = await suggestLineItemsFromHours(req.params.projectId);
    res.json({ lineItems: items });
  } catch (err) {
    next(err);
  }
}

export async function createInvoice(req, res, next) {
  try {
    const { projectId, clientId, lineItems, taxRate, dueDate } = req.body;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.clientId !== clientId) {
      return res.status(400).json({ message: 'Invoice client must match the project client.' });
    }
    const totalAmount = calculateInvoiceTotal(lineItems, taxRate);
    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        clientId,
        lineItems: JSON.stringify(lineItems),
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

export async function downloadInvoicePDF(req, res, next) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, project: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
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
