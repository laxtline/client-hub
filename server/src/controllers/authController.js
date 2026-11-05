import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { sendEmail } from '../services/emailService.js';

const resetTtl = 60 * 60 * 1000;
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
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: accessTtl,
  });
}

async function issueRefreshToken(userId, db = prisma) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + refreshTtl);

  await db.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return rawToken;
}

async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (!claimed.count) return null;
    const newRefreshTokenRaw = await issueRefreshToken(user.id, tx);
    return { user, newAccessToken: signAccessToken(user), newRefreshTokenRaw };
  });
}

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'team_member' },
      select: { id: true, name: true, email: true, role: true },
    });

    const accessToken = signAccessToken(user);
    const refreshTokenRaw = await issueRefreshToken(user.id);

    res.cookie('refreshToken', refreshTokenRaw, getRefreshCookieOptions());

    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };

    const accessToken = signAccessToken(safeUser);
    const refreshTokenRaw = await issueRefreshToken(user.id);

    res.cookie('refreshToken', refreshTokenRaw, getRefreshCookieOptions());

    res.json({ user: safeUser, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) return res.status(401).json({ message: 'Refresh token required' });

    const result = await rotateRefreshToken(rawToken);
    if (!result) {
      res.clearCookie('refreshToken', getRefreshCookieOptions(false));
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    res.cookie('refreshToken', result.newRefreshTokenRaw, getRefreshCookieOptions());

    res.json({ user: result.user, accessToken: result.newAccessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
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

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + resetTtl),
        },
      });
      const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: 'Reset your ClientHub password',
        html: `<p>Click to reset your password (valid 1 hour):</p><a href="${link}">${link}</a>`,
      });
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const entry = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: entry.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!claimed.count) return false;
      await tx.user.update({ where: { id: entry.userId }, data: { passwordHash } });
      await tx.refreshToken.updateMany({
        where: { userId: entry.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    });
    if (!updated) return res.status(400).json({ message: 'Invalid or expired reset token' });
    res.json({ message: 'Password updated, you can now log in.' });
  } catch (err) {
    next(err);
  }
}
