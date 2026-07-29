// validateEnv — fail fast on misconfiguration.
// Checks that the environment variables the app truly needs are present before
// the server starts. Missing REQUIRED vars abort the boot with a clear message;
// missing OPTIONAL vars only log a warning (those features degrade gracefully).
import logger from '../utils/logger.js';

// Vars the app cannot run correctly without.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

// Vars that enable extra features; the app runs fine without them.
const OPTIONAL = [
  'GROQ_API_KEY', // AI weekly report (falls back to a template)
  'RAZORPAY_KEY_ID', // online payments
  'IMAGEKIT_PRIVATE_KEY', // client logo uploads
  'SMTP_HOST', // outgoing email
];

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Set them in your .env (see server/.env.example) and restart.');
    process.exit(1);
  }

  // A short/guessable HMAC secret lets anyone forge login tokens, so a weak
  // secret is a hard failure in production (warning-only in dev).
  if ((process.env.JWT_SECRET || '').length < 16) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('JWT_SECRET is too short for production — use 32+ random chars.');
      process.exit(1);
    }
    logger.warn('JWT_SECRET is short — use a long random string in production.');
  }

  const optionalMissing = OPTIONAL.filter((k) => !process.env[k]);
  if (optionalMissing.length) {
    logger.info(`Optional integrations not configured: ${optionalMissing.join(', ')} (features disabled).`);
  }
}
