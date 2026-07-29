// Unit tests for the auth controller (signup / login / JWT). Prisma, the email
// service, and the DB are mocked so the tests run fast and offline — we only
// verify the auth LOGIC (hashing check, status codes, token issuance).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// A secret must exist before the controller signs/verifies tokens.
process.env.JWT_SECRET = 'test-secret';

// Mock the Prisma client used inside the controller.
vi.mock('../config/db.js', () => ({
  default: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
// Mock the email service so no SMTP is touched.
vi.mock('../services/emailService.js', () => ({ sendEmail: vi.fn() }));

import prisma from '../config/db.js';
import { signup, login } from '../controllers/authController.js';

// Build a fake Express res that records status + json payload.
function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signup', () => {
  it('rejects an email that already exists with 409', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' }); // already registered
    const res = mockRes();
    await signup({ body: { name: 'A', email: 'a@b.com', password: 'secret1' } }, res, () => {});
    expect(res.statusCode).toBe(409);
  });

  it('creates a user and returns a JWT on success', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u2', name: 'A', email: 'a@b.com', role: 'team_member' });
    const res = mockRes();
    await signup({ body: { name: 'A', email: 'a@b.com', password: 'secret1' } }, res, () => {});

    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe('a@b.com');
    // The token must be a valid JWT carrying the user id.
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('u2');
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

  it('returns a user + token when credentials are valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u4',
      name: 'Admin',
      email: 'a@b.com',
      passwordHash: bcrypt.hashSync('correct-password', 10),
      role: 'admin',
    });
    const res = mockRes();
    await login({ body: { email: 'a@b.com', password: 'correct-password' } }, res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('admin');
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('u4');
  });
});
