// Project controller — CRUD plus auto-calculated progress %.
// Clients can only ever see their OWN projects (tenant isolation enforced here).
import prisma from '../config/db.js';
import { calculateProgress } from '../utils/calculateProgress.js';
import { notifyUser } from '../services/notificationService.js';

// Helper: for a client-role user, find their Client record id (or null).
async function clientIdForUser(user) {
  if (user.role !== 'client') return null;
  const c = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  return c?.id ?? null;
}

// GET /api/projects — admin/team see all; client sees only their own
export async function listProjects(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { archived: false, ...(status && { status }) };
    // Tenant isolation: restrict clients to their own projects.
    if (req.user.role === 'client') {
      const cid = await clientIdForUser(req.user);
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

    // Attach a progress % to each project from its tasks.
    const withProgress = projects.map((p) => ({
      ...p,
      progress: calculateProgress(p.tasks),
    }));

    res.json({ projects: withProgress, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:id — detail with tasks, team and progress
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

    // Block a client from reading another client's project.
    if (req.user.role === 'client') {
      const cid = await clientIdForUser(req.user);
      if (project.clientId !== cid) return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ project: { ...project, progress: calculateProgress(project.tasks) } });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects — admin only
export async function createProject(req, res, next) {
  try {
    const { clientId, title, description, budget, startDate, deadline, status } = req.body;
    const project = await prisma.project.create({
      data: {
        clientId,
        title,
        description,
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

// PUT /api/projects/:id — update
export async function updateProject(req, res, next) {
  try {
    const { title, description, budget, startDate, deadline, status } = req.body;
    // Read the old status + client so we can notify the client if status changes.
    const before = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        budget: budget != null ? Number(budget) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status,
      },
    });

    // Real-time + email alert to the client when their project's status changes.
    if (status && before && before.status !== status && before.client?.linkedUserId) {
      await notifyUser({
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

// PATCH /api/projects/:id/archive
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
