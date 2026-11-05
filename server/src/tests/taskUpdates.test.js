import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '../config/db.js';
import { updateTask, updateTaskStatus } from '../controllers/taskController.js';

vi.mock('../config/db.js', () => ({ default: { $transaction: vi.fn() } }));
vi.mock('../services/notificationService.js', () => ({ notifyAfterSave: vi.fn() }));

let tx;
beforeEach(() => {
  vi.resetAllMocks();
  tx = {
    task: {
      findUnique: vi.fn().mockResolvedValue({ id: 't1', status: 'todo' }),
      update: vi.fn().mockResolvedValue({ id: 't1', status: 'done' }),
    },
    taskActivity: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
  };
  prisma.$transaction.mockImplementation((work) => work(tx));
});

describe('task status and activity consistency', () => {
  it.each([updateTaskStatus, updateTask])(
    'saves status and activity with the transaction client',
    async (handler) => {
      const res = { json: vi.fn() };
      const next = vi.fn();
      await handler(
        { params: { id: 't1' }, body: { status: 'done' }, user: { id: 'u1' } },
        res,
        next
      );
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(tx.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'done', completedAt: expect.any(Date) }),
        })
      );
      expect(tx.taskActivity.create).toHaveBeenCalledWith({
        data: {
          taskId: 't1',
          userId: 'u1',
          action: 'status_changed',
          detail: 'todo → done',
        },
      });
      expect(res.json).toHaveBeenCalledWith({ task: { id: 't1', status: 'done' } });
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('does not return success when writing the activity fails', async () => {
    const error = new Error('Activity write failed');
    tx.taskActivity.create.mockRejectedValue(error);
    const res = { json: vi.fn() };
    const next = vi.fn();
    await updateTaskStatus(
      { params: { id: 't1' }, body: { status: 'done' }, user: { id: 'u1' } },
      res,
      next
    );
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
