import { Router } from 'express';
import { authenticate, requireWorkspaceAccess } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateRequest.js';
import { listAccounts, createTeamAccount, resetAccountPassword, setAccountDisabled } from '../controllers/accountController.js';

const router = Router();
router.use(authenticate, requireWorkspaceAccess, authorize('admin'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function validateTeam(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const errors = [];
  if (name.length < 2 || name.length > 100) errors.push('Name must be 2–100 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.push('Valid email required');
  return errors.length ? { valid: false, errors } : { valid: true, data: { name, email } };
}

router.get('/', listAccounts);
router.post('/team', validate(validateTeam), createTeamAccount);
router.post('/:id/reset-password', resetAccountPassword);
router.patch('/:id/status', validate((body) => typeof body.disabled === 'boolean'
  ? { valid: true, data: { disabled: body.disabled } }
  : { valid: false, errors: ['disabled must be true or false'] }), setAccountDisabled);

export default router;
