import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { publicUser, userFields } from '../utils/accounts.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: userFields,
    });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (user.disabled || (decoded.version ?? 0) !== user.sessionVersion) {
      return res.status(401).json({ message: 'Session ended. Please sign in again.' });
    }

    req.user = publicUser(user);
    req.sessionVersion = user.sessionVersion;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next(err);
  }
}

export function requireWorkspaceAccess(req, res, next) {
  if (req.user.role === 'demo') {
    return res.status(403).json({ message: 'Demo accounts cannot access agency data.' });
  }
  if (req.user.mustChangePassword) {
    return res.status(403).json({ message: 'Set your new password first.', code: 'PASSWORD_CHANGE_REQUIRED' });
  }
  if (!['admin', 'team_member', 'client'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Workspace access is not available.' });
  }
  next();
}
