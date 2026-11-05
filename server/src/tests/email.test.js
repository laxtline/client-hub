import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));
vi.mock('../utils/logger.js', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('SMTP transport', () => {
  it.each([
    [465, true],
    [587, false],
  ])('uses the correct secure setting on port %s', async (port, secure) => {
    vi.resetModules();
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_PORT', String(port));
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn() });
    await import('../services/emailService.js');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port, secure })
    );
  });
});
