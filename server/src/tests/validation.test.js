import { describe, it, expect, vi } from 'vitest';
import { validate, optionalDate } from '../middleware/validateRequest.js';
import { paginationSchema, validateQuery } from '../middleware/validateQuery.js';

describe('request validation', () => {
  it('reads pagination from query parameters without replacing the body', () => {
    const req = { query: { page: '2', limit: '8' }, body: { unchanged: true } };
    const next = vi.fn();
    validateQuery(paginationSchema())(req, {}, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.query).toEqual({ page: 2, limit: 8 });
    expect(req.body).toEqual({ unchanged: true });
  });

  it('rejects invalid pagination before it reaches Prisma', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    validateQuery(paginationSchema())({ query: { page: '-1' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('continues to validate request bodies by default', () => {
    const req = { body: { page: '3' } };
    validate(paginationSchema())(req, {}, vi.fn());
    expect(req.body.page).toBe(3);
  });

  it('allows clearing a date and rejects malformed dates', () => {
    for (const value of [null, undefined, '', '2026-11-05']) {
      expect(optionalDate.safeParse(value).success).toBe(true);
    }
    expect(optionalDate.safeParse('not-a-date').success).toBe(false);
  });
});
