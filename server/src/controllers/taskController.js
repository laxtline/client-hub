// Task controller — Kanban tasks, status moves, comments and time logging.
// Emits real-time notifications when a task is assigned or commented on.
import prisma from '../config/db.js';
import { notifyUser } from '../services/notificationService.js';

// Tenant isolation helpers: a client-role user may only touch tasks that belong
// to one of THEIR projects. Admin/team members pass through unchecked.
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
  if (!task) return false; // deny-by-default in an authorization helper
  return clientOwnsProject(user, task.projectId);
}

// GET /api/tasks?projectId= — tasks for a project (used by the Kanban board)
export async function listTasks(req, res, next) {
  try {
    const { projectId } = req.query;
    if (projectId && !(await clientOwnsProject(req.user, projectId))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Clients must always scope by project (no cross-tenant "all tasks" list).
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

// GET /api/tasks/mine — every task assigned to the caller, across all projects.
// Team members otherwise had to open each project in turn to find their own work.
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
      // Soonest deadline first; tasks with no due date sort to the end.
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

// POST /api/tasks — create a task and notify the assignee
export async function createTask(req, res, next) {
  try {
    const { projectId, title, description, assignedToUserId, priority, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        assignedToUserId: assignedToUserId || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    if (assignedToUserId) {
      await notifyUser({
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

// Stamp/clear completedAt when a task crosses into/out of "done", so weekly
// stats can count what was actually finished this week (createdAt can't).
function completedAtChange(beforeStatus, newStatus) {
  if (newStatus === 'done' && beforeStatus !== 'done') return new Date();
  if (newStatus && newStatus !== 'done' && beforeStatus === 'done') return null;
  return undefined; // no status change relevant to completion
}

// PATCH /api/tasks/:id/status — move a card between Kanban columns
export async function updateTaskStatus(req, res, next) {
  try {
    const { status } = req.body; // todo | in_progress | review | done
    // Read the old status first so we can record what changed (the activity log).
    const before = await prisma.task.findUnique({ where: { id: req.params.id } });
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status, completedAt: completedAtChange(before?.status, status) },
    });

    // Audit trail: who moved the card, from which column to which, and when.
    if (before && before.status !== status) {
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: req.user.id,
          action: 'status_changed',
          detail: `${before.status} → ${status}`,
        },
      });
    }
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

// PUT /api/tasks/:id — general update (assignee, priority, hours, etc.)
export async function updateTask(req, res, next) {
  try {
    const { title, description, assignedToUserId, priority, status, dueDate, hoursLogged } =
      req.body;
    const before = await prisma.task.findUnique({ where: { id: req.params.id } });
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        assignedToUserId,
        priority,
        status,
        completedAt: completedAtChange(before?.status, status),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        hoursLogged: hoursLogged != null ? Number(hoursLogged) : undefined,
      },
    });

    // Record a status change made through the general edit form too.
    if (before && status && before.status !== status) {
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: req.user.id,
          action: 'status_changed',
          detail: `${before.status} → ${status}`,
        },
      });
    }
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/:id/activity — the audit trail for a task (newest first)
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

// DELETE /api/tasks/:id
export async function deleteTask(req, res, next) {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/:id/comments — thread for a task
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

// POST /api/tasks/:id/comments — add a comment and notify the assignee
export async function addComment(req, res, next) {
  try {
    if (!(await clientOwnsTask(req.user, req.params.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { text } = req.body;
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, userId: req.user.id, text },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify the task's assignee (if it isn't the commenter themselves).
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (task?.assignedToUserId && task.assignedToUserId !== req.user.id) {
      await notifyUser({
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
