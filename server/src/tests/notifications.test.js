import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '../config/db.js';
import { sendEmail } from '../services/emailService.js';
import { notifyAfterSave, notifyUser } from '../services/notificationService.js';
import logger from '../utils/logger.js';

vi.mock('../config/db.js', () => ({
  default: { notification: { create: vi.fn() }, user: { findUnique: vi.fn() } },
}));
vi.mock('../services/emailService.js', () => ({ sendEmail: vi.fn() }));
vi.mock('../sockets/socketHandler.js', () => ({ emitToUser: vi.fn() }));
vi.mock('../utils/logger.js', () => ({ default: { error: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  prisma.notification.create.mockResolvedValue({ id: 'n1' });
  prisma.user.findUnique.mockResolvedValue({ email: 'demo@example.invalid' });
});

describe('notifications after saving a record', () => {
  it('escapes a task title in email while keeping the saved message intact', async () => {
    const message = 'Task: <a href="https://example.invalid">click & open</a>';
    await notifyUser({ userId: 'u1', type: 'task_assigned', message });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'task_assigned', message, link: undefined },
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: '<p>Task: &lt;a href=&quot;https://example.invalid&quot;&gt;click &amp; open&lt;/a&gt;</p>',
      })
    );
  });

  it('logs a notification failure without reporting the saved record as failed', async () => {
    prisma.notification.create.mockRejectedValue(new Error('DB temporarily unavailable'));
    await expect(
      notifyAfterSave({ userId: 'u1', type: 'task_assigned', message: 'Saved task' })
    ).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('DB temporarily unavailable')
    );
  });
});
