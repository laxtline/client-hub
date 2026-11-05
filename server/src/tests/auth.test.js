// Unit tests for the auth controller (signup / login / JWT / refresh / logout).
// Prisma, the email service, and the DB are mocked so the tests run fast and offline —
// we only verify the auth LOGIC (hashing check, status codes, token issuance, cookie handling).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// A secret must exist before the controller signs/verifies tokens.
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test'; // so cookies aren't forced secure

// Mock the Prisma client used inside the controller.
vi.mock('../config/db.js', () => ({
  default: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
// Mock the email service so no SMTP is touched.
vi.mock('../services/emailService.js', () => ({ sendEmail: vi.fn() }));

import prisma from '../config/db.js';
import { signup, login, refresh, logout, me } from '../controllers/authController.js';

// Build a fake Express res that records status + json payload + cookies.
function mockRes() {
  const cookies = {};
  return {
    statusCode: 200,
    body: null,
    cookies,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      this.cookies[name] = { value: null, options };
      return this;
    },
  };
}

// Build a fake Express req with cookies.
function mockReq(cookies = {}) {
  return { cookies, body: {} };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation((work) => work(prisma));
  prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
});

describe('signup', () => {
  it('rejects an email that already exists with 409', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' }); // already registered
    const res = mockRes();
    await signup({ body: { name: 'A', email: 'a@b.com', password: 'secret1' } }, res, () => {});
    expect(res.statusCode).toBe(409);
  });

  it('creates a user and returns an access token on success', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u2',
      name: 'A',
      email: 'a@b.com',
      role: 'team_member',
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });
    const res = mockRes();
    await signup({ body: { name: 'A', email: 'a@b.com', password: 'secret1' } }, res, () => {});

    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe('a@b.com');
    // The access token must be a valid JWT carrying the user id.
    expect(res.body.accessToken).toBeDefined();
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET);
    expect(decoded.id).toBe('u2');
    // Refresh token should be set in httpOnly cookie.
    expect(res.cookies.refreshToken).toBeDefined();
    expect(res.cookies.refreshToken.value).toBeDefined();
    expect(res.cookies.refreshToken.options.httpOnly).toBe(true);
  });
});

describe('login', () => {
  it('returns 401 for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await login({ body: { email: 'no@one.com', password: 'x' } }, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when the password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u3',
      email: 'a@b.com',
      passwordHash: bcrypt.hashSync('correct-password', 10),
      role: 'admin',
    });
    const res = mockRes();
    await login({ body: { email: 'a@b.com', password: 'wrong-password' } }, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('returns a user + access token when credentials are valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u4',
      name: 'Admin',
      email: 'a@b.com',
      passwordHash: bcrypt.hashSync('correct-password', 10),
      role: 'admin',
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt2' });
    const res = mockRes();
    await login({ body: { email: 'a@b.com', password: 'correct-password' } }, res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.accessToken).toBeDefined();
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET);
    expect(decoded.id).toBe('u4');
    // Refresh token should be set in httpOnly cookie.
    expect(res.cookies.refreshToken).toBeDefined();
    expect(res.cookies.refreshToken.value).toBeDefined();
  });
});

describe('refresh', () => {
  it('allows only one concurrent request to rotate a refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'race-token',
      userId: 'u-race',
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u-race', role: 'client' });
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.refreshToken.create.mockResolvedValue({ id: 'replacement' });
    const responses = [mockRes(), mockRes()];
    await Promise.all(
      responses.map((res) => refresh(mockReq({ refreshToken: 'race-cookie' }), res, vi.fn()))
    );
    expect(responses.map((res) => res.statusCode).sort()).toEqual([200, 401]);
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no refresh token cookie', async () => {
    const res = mockRes();
    await refresh(mockReq({}), res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('rotates refresh token and returns new access token', async () => {
    const rawToken = 'valid-refresh-token';
    // Need to mock the hash function - we'll mock findUnique to return a valid token
    const tokenHash = require('crypto').createHash('sha256').update(rawToken).digest('hex');
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt3',
      tokenHash,
      userId: 'u5',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u5',
      name: 'Test',
      email: 'test@test.com',
      role: 'team_member',
    });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt4' });

    const res = mockRes();
    await refresh(mockReq({ refreshToken: rawToken }), res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res.body.user.id).toBe('u5');
    expect(res.body.accessToken).toBeDefined();
    // New refresh token should be set in cookie.
    expect(res.cookies.refreshToken).toBeDefined();
    // Old token should be revoked.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rt3', revokedAt: null }),
        data: { revokedAt: expect.any(Date) },
      })
    );
  });
});

describe('logout', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    const rawToken = 'valid-refresh-token';
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const res = mockRes();
    // The authenticate middleware would have set req.user, but logout doesn't need it for cookie clearing
    await logout(mockReq({ refreshToken: rawToken }), res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(res.cookies.refreshToken).toBeDefined();
    expect(res.cookies.refreshToken.value).toBeNull(); // cleared
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });
});

describe('me', () => {
  it('returns the authenticated user', async () => {
    const req = { user: { id: 'u1', name: 'Test', email: 'test@test.com', role: 'team_member' } };
    const res = mockRes();
    await me(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.id).toBe('u1');
  });
});
