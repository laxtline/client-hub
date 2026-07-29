// Scheduled background jobs. CONCEPT (cron): runs code on a time schedule.
// Here: every Monday 09:00, generate an AI progress summary for every active
// project (and the service emails the client where configured).
import cron from 'node-cron';
import prisma from '../config/db.js';
import { generateProjectSummary } from '../services/aiSummaryService.js';
import { sendEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';

// Hosts run in UTC, so an unqualified '09:00' would fire at 14:30 IST. Pin the
// zone (override with CRON_TIMEZONE) so "Monday morning" means what it says.
const TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Kolkata';

export function startCronJobs() {
  // '0 9 * * 1' = at 09:00 on Monday. Adjust as needed.
  cron.schedule('0 9 * * 1', async () => {
    logger.info('Weekly AI summary job started');
    try {
      const projects = await prisma.project.findMany({
        where: { archived: false, status: { in: ['in_progress', 'not_started', 'on_hold'] } },
        include: { client: true },
      });

      for (const project of projects) {
        // Per-project guard: one failure (bad email, deleted project) must not
        // abort the weekly update for every remaining project.
        try {
          const summary = await generateProjectSummary(project.id);
          // Optionally email the client their weekly update.
          if (project.client?.contactEmail) {
            await sendEmail({
              to: project.client.contactEmail,
              subject: `Weekly update: ${project.title}`,
              html: `<p>${summary.summaryText}</p><p><b>Status:</b> ${summary.riskFlag}</p>`,
            });
          }
        } catch (err) {
          logger.error(`Weekly summary failed for project ${project.id}: ${err.message}`);
        }
      }
      logger.info(`Weekly AI summary job finished for ${projects.length} projects`);
    } catch (err) {
      logger.error(`Weekly AI summary job failed: ${err.message}`);
    }
  }, { timezone: TIMEZONE });

  // Daily 00:30 — mark any still-pending invoice past its due date as "overdue".
  cron.schedule('30 0 * * *', async () => {
    try {
      const result = await prisma.invoice.updateMany({
        where: { status: 'pending', dueDate: { lt: new Date() } },
        data: { status: 'overdue' },
      });
      if (result.count > 0) logger.info(`Marked ${result.count} invoice(s) overdue`);
    } catch (err) {
      logger.error(`Overdue invoice job failed: ${err.message}`);
    }
  }, { timezone: TIMEZONE });

  // Daily 01:00 — delete spent/expired password reset tokens. Without this the
  // table only ever grows, since a token that is never redeemed is never removed.
  cron.schedule('0 1 * * *', async () => {
    try {
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
        },
      });
      if (result.count > 0) logger.info(`Purged ${result.count} spent reset token(s)`);
    } catch (err) {
      logger.error(`Reset token cleanup job failed: ${err.message}`);
    }
  }, { timezone: TIMEZONE });

  logger.info(`Cron jobs scheduled (timezone: ${TIMEZONE})`);
}
