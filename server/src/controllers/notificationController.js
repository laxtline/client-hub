// Notification controller — list, unread count, and mark-as-read for the bell UI.
import prisma from '../config/db.js';

// GET /api/notifications — the current user's notifications (newest first)
export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read — mark one as read
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

// PATCH /api/notifications/read-all — mark every notification read
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
