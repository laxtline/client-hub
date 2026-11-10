import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { uploadToImageKit, imagekitEnabled } from '../config/imagekit.js';
import { sanitizeDescription } from '../utils/sanitize.js';
import { temporaryPassword } from '../utils/accounts.js';

export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    if (!imagekitEnabled) {
      return res.status(503).json({ message: 'Image uploads are not configured on the server' });
    }

    const url = await uploadToImageKit(req.file.buffer, req.file.originalname || 'logo');

    res.json({ url });
  } catch (err) {
    next(err);
  }
}

export async function listClients(req, res, next) {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

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
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { projects: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ clients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

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

export async function createClient(req, res, next) {
  try {
    const { name, companyName, contactEmail, contactPhone, notes, logoUrl } =
      req.body;
    const password = temporaryPassword();

    const client = await prisma.$transaction(async (tx) => {
      let linkedUserId;
      if (contactEmail) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await tx.user.create({
          data: { name, email: contactEmail, passwordHash, role: 'client', createdByAdmin: true, mustChangePassword: true },
        });
        linkedUserId = user.id;
      }
      return tx.client.create({
        data: {
          name,
          companyName,
          contactEmail,
          contactPhone,
          notes: notes ? sanitizeDescription(notes) : null,
          logoUrl,
          linkedUserId,
        },
      });
    });
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ client, credentials: { email: contactEmail, temporaryPassword: password } });
  } catch (err) {
    next(err);
  }
}

export async function updateClient(req, res, next) {
  try {
    const { name, companyName, contactEmail, contactPhone, notes, logoUrl } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        name,
        companyName,
        contactEmail,
        contactPhone,
        notes: notes === undefined ? undefined : sanitizeDescription(notes || ''),
        logoUrl,
      },
    });
    res.json({ client });
  } catch (err) {
    next(err);
  }
}

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

export async function deleteClient(req, res, next) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
}
