import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import prisma from '../config/db.js';
import { passwordLocked, publicUser, revokeSessions, userFields } from '../utils/accounts.js';
import { disconnectUser } from '../sockets/socketHandler.js';

const accessTtl = '15m';
const refreshTtl = 7 * 24 * 60 * 60 * 1000;

function getRefreshCookieOptions(includeMaxAge = true) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    ...(includeMaxAge ? { maxAge: refreshTtl } : {}),
    path: '/',
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, version: user.sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: accessTtl }
  );
}

async function issueRefreshToken(userId, db = prisma) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  await db.refreshToken.create({
    data: { tokenHash: hashToken(rawToken), userId, expiresAt: new Date(Date.now() + refreshTtl) },
  });
  return rawToken;
}

function sendSession(res, user, refreshTokenRaw, status = 200) {
  res.cookie('refreshToken', refreshTokenRaw, getRefreshCookieOptions());
  res.status(status).json({ user: publicUser(user), accessToken: signAccessToken(user) });
}

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const session = await prisma.$transaction(async (tx) => {
      // Public signup never creates an agency account.
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: 'demo', isDemo: true }, select: userFields,
      });
      return { user, refreshTokenRaw: await issueRefreshToken(user.id, tx) };
    });
    sendSession(res, session.user, session.refreshTokenRaw, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.disabled || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const session = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: user.id }, select: userFields });
      if (!current || current.disabled || current.sessionVersion !== user.sessionVersion) return null;
      return { user: current, refreshTokenRaw: await issueRefreshToken(user.id, tx) };
    }, { isolationLevel: 'Serializable' });
    if (!session) return res.status(401).json({ message: 'Please sign in again.' });
    sendSession(res, session.user, session.refreshTokenRaw);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) return res.status(401).json({ message: 'Refresh token required' });
    const result = await prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
      if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) return null;
      const user = await tx.user.findUnique({ where: { id: stored.userId }, select: userFields });
      if (!user || user.disabled) return null;
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() },
      });
      if (!claimed.count) return null;
      return { user, refreshTokenRaw: await issueRefreshToken(user.id, tx) };
    }, { isolationLevel: 'Serializable' });
    if (!result) {
      res.clearCookie('refreshToken', getRefreshCookieOptions(false));
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    sendSession(res, result.user, result.refreshTokenRaw);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('refreshToken', getRefreshCookieOptions(false));
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export function forgotPassword(req, res) {
  res.status(403).json({ message: 'Contact your agency administrator for a temporary password. Demo passwords cannot be reset.' });
}

export const resetPassword = forgotPassword;

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (passwordLocked(user) || req.user.role === 'demo') {
      return res.status(403).json({ message: 'Password changes are disabled for demo accounts.' });
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    if (await bcrypt.compare(password, user.passwordHash)) {
      return res.status(400).json({ message: 'Choose a different password.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const session = await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: user.id, sessionVersion: req.sessionVersion, disabled: false },
        data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      });
      if (!claimed.count) return null;
      await revokeSessions(tx, user.id);
      const updated = await tx.user.findUnique({ where: { id: user.id }, select: userFields });
      return { user: updated, refreshTokenRaw: await issueRefreshToken(user.id, tx) };
    });
    if (!session) return res.status(401).json({ message: 'Session ended. Please sign in again.' });
    disconnectUser(user.id);
    sendSession(res, session.user, session.refreshTokenRaw);
  } catch (err) {
    next(err);
  }
}
