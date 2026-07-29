// Tests for the global error handler — it decides what every failed request
// looks like to the user, so a regression here turns a clear 409 back into an
// opaque "Something went wrong" and hides real problems.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import multer from 'multer';

vi.mock('../utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { errorHandler, notFound } from '../middleware/errorHandler.js';

const req = { method: 'POST', originalUrl: '/api/clients' };

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

const ORIGINAL_ENV = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe('notFound', () => {
  it('returns 404 naming the unmatched route', () => {
    const res = mockRes();
    notFound({ method: 'GET', originalUrl: '/api/nope' }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('/api/nope');
  });
});

describe('errorHandler', () => {
  it('maps a Prisma unique-constraint violation to 409', () => {
    const res = mockRes();
    errorHandler({ code: 'P2002', message: 'Unique constraint failed' }, req, res, () => {});
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already taken/i);
  });

  it('maps a Prisma missing-record error to 404', () => {
    const res = mockRes();
    errorHandler({ code: 'P2025', message: 'Record to update not found' }, req, res, () => {});
    expect(res.statusCode).toBe(404);
  });

  it('maps an oversized upload to 413 rather than 500', () => {
    const res = mockRes();
    errorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), req, res, () => {});
    expect(res.statusCode).toBe(413);
    expect(res.body.message).toMatch(/too large/i);
  });

  it('maps a rejected non-image upload to 400', () => {
    const res = mockRes();
    errorHandler(new Error('Only image files are allowed'), req, res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('honours an explicit statusCode on the error', () => {
    const res = mockRes();
    const err = new Error('Nope');
    err.statusCode = 403;
    errorHandler(err, req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Nope');
  });

  it('hides the internal message and detail on a 500 in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    errorHandler(new Error('connect ECONNREFUSED 10.0.0.5:5432'), req, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Something went wrong on our end');
    // Leaking infrastructure detail to clients is the bug this guards against.
    expect(res.body.detail).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });

  it('includes the detail outside production to aid debugging', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    errorHandler(new Error('boom'), req, res, () => {});
    expect(res.body.detail).toBe('boom');
  });
});
