// Rate limiters protect against brute-force and abuse.
// `authLimiter` is strict (applied to login/signup); `apiLimiter` is general.
import rateLimit from 'express-rate-limit';

// Max 10 auth attempts per 15 minutes per IP — slows password guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

// General API limit to keep the server healthy.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
