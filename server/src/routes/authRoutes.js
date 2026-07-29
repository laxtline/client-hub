// Auth routes — public endpoints (rate-limited) + /me (protected).
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  signup,
  login,
  me,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';

const router = Router();

// Zod schemas validate input before it reaches the controller.
// SECURITY: public signup never accepts a role — everyone registers as a
// team member. Admins come from the seed; client logins are created by an admin.
const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const forgotSchema = z.object({
  email: z.string().email(),
});
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', authLimiter, validate(forgotSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), resetPassword);
router.get('/me', authenticate, me);

export default router;
