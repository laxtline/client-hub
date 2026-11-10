import logger from '../utils/logger.js';

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

const OPTIONAL = [
  'GROQ_API_KEY', 
  'RAZORPAY_KEY_ID', 
  'IMAGEKIT_PRIVATE_KEY', 
  'SMTP_HOST', 
];

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Set them in your .env (see server/.env.example) and restart.');
    process.exit(1);
  }

  // Do not start production with a short signing secret.
  if ((process.env.JWT_SECRET || '').length < 16) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('JWT_SECRET is too short for production — use 32+ random chars.');
      process.exit(1);
    }
    logger.warn('JWT_SECRET is short — use a long random string in production.');
  }

  const optionalMissing = OPTIONAL.filter((k) => !process.env[k]);
  if (optionalMissing.length) {
    logger.info(
      `Optional integrations not configured: ${optionalMissing.join(', ')} (features disabled).`
    );
  }
}
