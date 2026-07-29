// Creates a notification row, pushes it live over Socket.io, AND (for important
// event types) sends an email fallback so the user is reached even when offline.
// Controllers import this so notification logic lives in one place.
import prisma from '../config/db.js';
import { emitToUser } from '../sockets/socketHandler.js';
import { sendEmail } from './emailService.js';

// Event types important enough to also email the user (not just in-app).
const HIGH_IMPORTANCE = new Set(['invoice_paid', 'task_assigned', 'project_status']);

/**
 * Create + emit a notification to a single user, with an email fallback for
 * high-importance types.
 * @param {{userId:string, message:string, type:string, link?:string}} payload
 */
export async function notifyUser({ userId, message, type, link }) {
  const notification = await prisma.notification.create({
    data: { userId, message, type, link },
  });

  // Push it in real-time; if the user is offline the row still exists in the DB.
  emitToUser(userId, 'notification:new', notification);

  // Email fallback for important events (sendEmail fails soft if SMTP is unset).
  if (HIGH_IMPORTANCE.has(type)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: 'ClientHub notification',
        html: `<p>${message}</p>`,
      });
    }
  }

  return notification;
}
