// Auth controller — handles request/response only (no business logic leaks here).
// CONCEPT (bcrypt): one-way hashes passwords so even if the DB leaks, the
// original passwords stay secret. CONCEPT (JWT): a signed login token.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { sendEmail } from '../services/emailService.js';

// How long a password reset link stays valid.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Reset tokens are stored HASHED in the database (see PasswordResetToken in
// schema.prisma). Hashing means a database leak yields no usable reset links,
// and using a table instead of an in-memory Map means a server restart — or a
// second instance behind a load balancer — doesn't invalidate a link the user
// already has in their inbox.
function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: sign a JWT for a given user.
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/signup — register a new team-member account.
// SECURITY: the role is hard-coded server-side; accepting it from the request
// body would let anyone grant themselves admin (privilege escalation).
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'team_member' },
      select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login — verify credentials and return a token.
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Same generic message whether email or password is wrong (avoids user enumeration)
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ user: safeUser, token: signToken(safeUser) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — return the currently authenticated user.
export async function me(req, res) {
  res.json({ user: req.user });
}

// POST /api/auth/forgot-password — email a reset link.
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond 200 so attackers can't tell which emails exist.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      // Requesting a new link invalidates any older unused one, so a forwarded
      // or leaked earlier email can't still be redeemed.
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashResetToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
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

// POST /api/auth/reset-password — set a new password using a valid token.
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    // Look the token up by its hash — the raw value is never stored.
    const entry = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
    });
    // Same generic message for unknown, already-used and expired tokens.
    if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // One transaction: if either write fails, the token is not burned and the
    // password is not half-changed.
    await prisma.$transaction([
      prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      }),
    ]);
    res.json({ message: 'Password updated, you can now log in.' });
  } catch (err) {
    next(err);
  }
}
