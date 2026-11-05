import prisma from '../config/db.js';
import { notifyAfterSave } from '../services/notificationService.js';
import { sanitizeComment, sanitizeDescription } from '../utils/sanitize.js';

async function clientOwnsProject(user, projectId) {
  if (user.role !== 'client') return true;
  const client = await prisma.client.findUnique({ where: { linkedUserId: user.id } });
  if (!client) return false;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  return project?.clientId === client.id;
}

async function clientOwnsTask(user, taskId) {
  if (user.role !== 'client') return true;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return false;
  return clientOwnsProject(user, task.projectId);
}

export async function listTasks(req, res, next) {
  try {
    const { projectId } = req.query;
    if (projectId && !(await clientOwnsProject(req.user, projectId))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!projectId && req.user.role === 'client') {
      return res.status(400).json({ message: 'projectId is required' });
    }
    const tasks = await prisma.task.findMany({
      where: { ...(projectId && { projectId }) },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function listMyTasks(req, res, next) {
  try {
    const { status } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        assignedToUserId: req.user.id,
        ...(status && { status }),
        project: { archived: false },
      },
      include: { project: { select: { id: true, title: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req, res, next) {
  try {
    const { projectId, title, description, assignedToUserId, priority, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description: description ? sanitizeDescription(description) : null,
        assignedToUserId: assignedToUserId || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    if (assignedToUserId) {
      await notifyAfterSave({
        userId: assignedToUserId,
        message: `You were assigned a new task: "${title}"`,
        type: 'task_assigned',
        link: `/projects/${projectId}`,
      });
    }
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

function completedAtChange(beforeStatus, newStatus) {
  if (newStatus === 'done' && beforeStatus !== 'done') return new Date();
  if (newStatus && newStatus !== 'done' && beforeStatus === 'done') return null;
  return undefined;
}

export async function updateTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    const task = await prisma.$transaction(async (tx) => {
      const before = await tx.task.findUnique({ where: { id: req.params.id } });
      const updated = await tx.task.update({
        where: { id: req.params.id },
        data: { status, completedAt: completedAtChange(before?.status, status) },
      });

      if (before && before.status !== status) {
        await tx.taskActivity.create({
          data: {
            taskId: updated.id,
            userId: req.user.id,
            action: 'status_changed',
            detail: `${before.status} → ${status}`,
          },
        });
      }
      return updated;
    });
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req, res, next) {
  try {
    const { title, description, assignedToUserId, priority, status, dueDate, hoursLogged } =
      req.body;
    const task = await prisma.$transaction(async (tx) => {
      const before = await tx.task.findUnique({ where: { id: req.params.id } });
      const updated = await tx.task.update({
        where: { id: req.params.id },
        data: {
          title,
          description:
            description === undefined ? undefined : sanitizeDescription(description || ''),
          assignedToUserId,
          priority,
          status,
          completedAt: completedAtChange(before?.status, status),
          dueDate: dueDate === undefined ? undefined : dueDate ? new Date(dueDate) : null,
          hoursLogged: hoursLogged != null ? Number(hoursLogged) : undefined,
        },
      });

      if (before && status && before.status !== status) {
        await tx.taskActivity.create({
          data: {
            taskId: updated.id,
            userId: req.user.id,
            action: 'status_changed',
            detail: `${before.status} → ${status}`,
          },
        });
      }
      return updated;
    });
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

export async function listActivity(req, res, next) {
  try {
    if (!(await clientOwnsTask(req.user, req.params.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req, res, next) {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listComments(req, res, next) {
  try {
    if (!(await clientOwnsTask(req.user, req.params.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const comments = await prisma.taskComment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    if (!(await clientOwnsTask(req.user, req.params.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { text } = req.body;
    const cleanText = sanitizeComment(text);
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, userId: req.user.id, text: cleanText },
      include: { user: { select: { id: true, name: true } } },
    });

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (task?.assignedToUserId && task.assignedToUserId !== req.user.id) {
      await notifyAfterSave({
        userId: task.assignedToUserId,
        message: `New comment on "${task.title}"`,
        type: 'task_comment',
        link: `/projects/${task.projectId}`,
      });
    }
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}
