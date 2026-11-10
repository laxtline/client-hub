import prisma from '../config/db.js';

export function projectScope(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'client') return { client: { linkedUserId: user.id } };
  if (user.role === 'team_member') return { tasks: { some: { assignedToUserId: user.id } } };
  return { id: '__none__' };
}

export async function canReadTask(user, taskId) {
  const where = { id: taskId, project: projectScope(user) };
  if (user.role === 'team_member') where.assignedToUserId = user.id;
  return !!(await prisma.task.findFirst({ where, select: { id: true } }));
}

export async function canAssignTask(userId) {
  if (!userId) return true;
  return !!(await prisma.user.findFirst({
    where: { id: userId, role: 'team_member', disabled: false }, select: { id: true },
  }));
}
