import prisma from '../config/db.js';
import { calculateProgress } from '../utils/calculateProgress.js';
import { notifyAfterSave } from '../services/notificationService.js';
import { sanitizeDescription } from '../utils/sanitize.js';

async function getClientId(user) {
  if (user.role !== 'client') return null;
  const c = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  return c?.id ?? null;
}

export async function listProjects(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { archived: false, ...(status && { status }) };
    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      where.clientId = cid || '__none__';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { client: true, tasks: { select: { status: true } } },
      }),
      prisma.project.count({ where }),
    ]);

    const withProgress = projects.map((p) => ({
      ...p,
      progress: calculateProgress(p.tasks),
    }));

    res.json({ projects: withProgress, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        tasks: { include: { assignedTo: { select: { id: true, name: true } } } },
        invoices: true,
      },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role === 'client') {
      const cid = await getClientId(req.user);
      if (project.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ project: { ...project, progress: calculateProgress(project.tasks) } });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { clientId, title, description, budget, startDate, deadline, status } = req.body;
    const project = await prisma.project.create({
      data: {
        clientId,
        title,
        description: description ? sanitizeDescription(description) : null,
        budget: Number(budget) || 0,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'not_started',
      },
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { title, description, budget, startDate, deadline, status } = req.body;
    const before = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title,
        description: description === undefined ? undefined : sanitizeDescription(description || ''),
        budget: budget != null ? Number(budget) : undefined,
        startDate: startDate === undefined ? undefined : startDate ? new Date(startDate) : null,
        deadline: deadline === undefined ? undefined : deadline ? new Date(deadline) : null,
        status,
      },
    });

    if (status && before && before.status !== status && before.client?.linkedUserId) {
      await notifyAfterSave({
        userId: before.client.linkedUserId,
        message: `Project "${project.title}" status changed to ${status.replace('_', ' ')}`,
        type: 'project_status',
        link: `/projects/${project.id}`,
      });
    }
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function archiveProject(req, res, next) {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { archived: true },
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
}
