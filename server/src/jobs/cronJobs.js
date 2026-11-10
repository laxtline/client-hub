import cron from 'node-cron';
import prisma from '../config/db.js';
import { generateProjectSummary } from '../services/aiSummaryService.js';
import { sendEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';
import { escapeHtml } from '../utils/sanitize.js';

const TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Kolkata';

const scheduledTasks = [];

function schedule(name, schedule, callback) {
  const task = cron.schedule(schedule, callback, { timezone: TIMEZONE });
  scheduledTasks.push({ name, task });
  return task;
}

export function startCronJobs() {
  schedule('weekly-ai-summary', '0 9 * * 1', async () => {
    logger.info('Weekly AI summary job started');
    try {
      const projects = await prisma.project.findMany({
        where: { archived: false, status: { in: ['in_progress', 'not_started', 'on_hold'] } },
        include: { client: true },
      });

      for (const project of projects) {
        try {
          const summary = await generateProjectSummary(project.id);
          if (project.client?.contactEmail) {
            await sendEmail({
              to: project.client.contactEmail,
              subject: `Weekly update: ${project.title}`,
              html: `<p>${escapeHtml(summary.summaryText)}</p><p><b>Status:</b> ${escapeHtml(summary.riskFlag)}</p>`,
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
  });

  schedule('overdue-invoices', '30 0 * * *', async () => {
    try {
      const result = await prisma.invoice.updateMany({
        where: { status: 'pending', dueDate: { lt: new Date() } },
        data: { status: 'overdue' },
      });
      if (result.count > 0) logger.info(`Marked ${result.count} invoice(s) overdue`);
    } catch (err) {
      logger.error(`Overdue invoice job failed: ${err.message}`);
    }
  });

  const RESET_TOKEN_GRACE_MS = 5 * 60 * 1000;
  schedule('reset-token-cleanup', '0 1 * * *', async () => {
    try {
      const graceCutoff = new Date(Date.now() - RESET_TOKEN_GRACE_MS);
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null, lt: graceCutoff } }],
        },
      });
      if (result.count > 0) logger.info(`Purged ${result.count} spent reset token(s)`);
    } catch (err) {
      logger.error(`Reset token cleanup job failed: ${err.message}`);
    }
  });

  const REFRESH_TOKEN_GRACE_MS = 60 * 60 * 1000;
  schedule('refresh-token-cleanup', '0 2 * * *', async () => {
    try {
      const graceCutoff = new Date(Date.now() - REFRESH_TOKEN_GRACE_MS);
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null, lt: graceCutoff } }],
        },
      });
      if (result.count > 0) logger.info(`Purged ${result.count} expired refresh token(s)`);
    } catch (err) {
      logger.error(`Refresh token cleanup job failed: ${err.message}`);
    }
  });

  logger.info(`Cron jobs scheduled (timezone: ${TIMEZONE})`);
}

export function stopCronJobs() {
  for (const { name, task } of scheduledTasks) {
    task.stop();
    logger.debug(`Stopped cron job: ${name}`);
  }
  scheduledTasks.length = 0;
  logger.info('All cron jobs stopped');
}