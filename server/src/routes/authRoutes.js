import { Router } from 'express';
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
  changePassword,
} from '../controllers/authController.js';

const router = Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function validateSignup(body) {
  const errors = [];
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 100) errors.push('Name must be 2–100 characters');
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || body.email.length > 254) errors.push('Valid email required');
  if (!validPassword(body.password)) errors.push('Password must be at least 8 characters and at most 72 bytes');
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: { name: body.name.trim(), email: body.email.trim().toLowerCase(), password: body.password } };
}

function validateLogin(body) {
  const errors = [];
  if (typeof body.email !== 'string' || !body.email.includes('@')) errors.push('Valid email required');
  if (typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password) > 72) errors.push('Password required (max 72 bytes)');
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: { email: body.email.trim().toLowerCase(), password: body.password } };
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 72;
}

function validateChange(body) {
  const errors = [];
  if (typeof body.currentPassword !== 'string' || !body.currentPassword || Buffer.byteLength(body.currentPassword) > 72) errors.push('Current password required (max 72 bytes)');
  if (!validPassword(body.password)) errors.push('New password must be at least 8 characters and at most 72 bytes');
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: { currentPassword: body.currentPassword, password: body.password } };
}

router.post('/signup', authLimiter, validate(validateSignup), signup);
router.post('/login', authLimiter, validate(validateLogin), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', authLimiter, authenticate, validate(validateChange), changePassword);
router.get('/me', authenticate, me);

export default router;
