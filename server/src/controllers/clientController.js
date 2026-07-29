// Client controller — CRUD for agency clients with search, filter & pagination.
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { uploadToImageKit, imagekitEnabled } from '../config/imagekit.js';

// POST /api/clients/upload-logo — upload an image to ImageKit, return its URL.
// The frontend calls this first, then saves the returned URL on the client record.
export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    if (!imagekitEnabled) {
      return res.status(503).json({ message: 'Image uploads are not configured on the server' });
    }

    // Send the in-memory buffer to ImageKit; get back the hosted URL.
    const url = await uploadToImageKit(req.file.buffer, req.file.originalname || 'logo');

    res.json({ url });
  } catch (err) {
    next(err);
  }
}

// GET /api/clients — list with optional ?search, ?status, ?page, ?limit
export async function listClients(req, res, next) {
  try {
    const { search = '', status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build a Prisma "where" filter dynamically from the query params.
    const where = {
      archived: status === 'archived' ? true : false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { projects: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ clients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/clients/:id — one client plus their projects
export async function getClient(req, res, next) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { projects: true, linkedUser: { select: { id: true, email: true } } },
    });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ client });
  } catch (err) {
    next(err);
  }
}

// POST /api/clients — create a client AND a linked client-role login account
export async function createClient(req, res, next) {
  try {
    const { name, companyName, contactEmail, contactPhone, notes, logoUrl, portalPassword } =
      req.body;

    // If a contact email + password are given, create a portal login for the
    // client. Both rows are created in one transaction so a failure on either
    // side can't leave an orphaned login (which would permanently reserve the
    // email while seeing no data).
    const client = await prisma.$transaction(async (tx) => {
      let linkedUserId;
      if (contactEmail && portalPassword) {
        const passwordHash = await bcrypt.hash(portalPassword, 10);
        const user = await tx.user.create({
          data: { name, email: contactEmail, passwordHash, role: 'client' },
        });
        linkedUserId = user.id;
      }
      return tx.client.create({
        data: { name, companyName, contactEmail, contactPhone, notes, logoUrl, linkedUserId },
      });
    });
    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
}

// PUT /api/clients/:id — update fields
export async function updateClient(req, res, next) {
  try {
    const { name, companyName, contactEmail, contactPhone, notes, logoUrl } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { name, companyName, contactEmail, contactPhone, notes, logoUrl },
    });
    res.json({ client });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/clients/:id/archive — soft-delete (recoverable)
export async function archiveClient(req, res, next) {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { archived: true },
    });
    res.json({ client });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/clients/:id — hard delete
export async function deleteClient(req, res, next) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
}
