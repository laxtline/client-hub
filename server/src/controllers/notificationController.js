import prisma from '../config/db.js';

async function notificationScope(user) {
  if (user.role !== 'team_member') return { userId: user.id };
  const projects = await prisma.project.findMany({
    where: { tasks: { some: { assignedToUserId: user.id } } }, select: { id: true },
  });
  return {
    userId: user.id,
    type: { in: ['task_assigned', 'task_comment'] },
    link: { in: projects.map((project) => `/projects/${project.id}`) },
  };
}

export async function listNotifications(req, res, next) {
  try {
    const where = await notificationScope(req.user);
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = await prisma.notification.count({
      where: { ...where, isRead: false },
    });
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    if (notification.count === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification marked read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All marked read' });
  } catch (err) {
    next(err);
  }
}
