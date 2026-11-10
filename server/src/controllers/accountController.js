import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { passwordLocked, publicUser, revokeSessions, temporaryPassword, userFields } from '../utils/accounts.js';
import { disconnectUser } from '../sockets/socketHandler.js';

export async function listAccounts(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['team_member', 'client'] } },
      select: userFields, orderBy: { createdAt: 'desc' },
    });
    res.json({ users: users.map((user) => ({ ...publicUser(user), disabled: user.disabled })) });
  } catch (err) { next(err); }
}

export async function createTeamAccount(req, res, next) {
  try {
    const { name, email } = req.body;
    const password = temporaryPassword();
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: 'team_member', createdByAdmin: true, mustChangePassword: true },
      select: userFields,
    });
    // Only return this once; the database keeps the hash.
    res.status(201).json({ user: publicUser(user), credentials: { email, temporaryPassword: password } });
  } catch (err) { next(err); }
}

export async function resetAccountPassword(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || !['team_member', 'client'].includes(user.role)) {
      return res.status(404).json({ message: 'Team or client account not found.' });
    }
    if (passwordLocked(user)) return res.status(403).json({ message: 'Demo passwords cannot be reset.' });
    if (user.disabled) return res.status(400).json({ message: 'Enable this account before resetting its password.' });
    const password = temporaryPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
      });
      await revokeSessions(tx, user.id);
    });
    disconnectUser(user.id);
    res.json({ credentials: { email: user.email, temporaryPassword: password } });
  } catch (err) { next(err); }
}

export async function setAccountDisabled(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || !['team_member', 'client'].includes(user.role)) {
      return res.status(404).json({ message: 'Team or client account not found.' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id }, data: { disabled: req.body.disabled, sessionVersion: { increment: 1 } },
      });
      await revokeSessions(tx, user.id);
    });
    disconnectUser(user.id);
    res.json({ message: req.body.disabled ? 'Account disabled.' : 'Account enabled.' });
  } catch (err) { next(err); }
}
