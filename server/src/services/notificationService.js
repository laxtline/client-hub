import prisma from '../config/db.js';
import { emitToUser } from '../sockets/socketHandler.js';
import { sendEmail } from './emailService.js';
import { escapeHtml } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

const HIGH_IMPORTANCE = new Set(['invoice_paid', 'task_assigned', 'project_status']);

export async function notifyUser({ userId, message, type, link }) {
  const notification = await prisma.notification.create({
    data: { userId, message, type, link },
  });

  emitToUser(userId, 'notification:new', notification);

  if (HIGH_IMPORTANCE.has(type)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: 'ClientHub notification',
        html: `<p>${escapeHtml(message)}</p>`,
      });
    }
  }

  return notification;
}

// The main record is already saved when these notifications are sent.
export async function notifyAfterSave(options) {
  try {
    return await notifyUser(options);
  } catch (err) {
    logger.error(`Notification failed after save: ${err.message}`);
    return null;
  }
}
