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
  refresh,
  logout,
} from '../controllers/authController.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
});
const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});
const forgotSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', authLimiter, validate(forgotSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), resetPassword);
router.get('/me', authenticate, me);

export default router;
