// Verifies the JWT on protected routes and attaches the user to req.user.
// CONCEPT (JWT): a signed token the client sends in the Authorization header;
// we verify the signature to trust the user's identity without a DB session.
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

/**
 * Express middleware: rejects the request unless a valid Bearer token is present.
 * On success, sets req.user = { id, role, name, email }.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    // Throws if the token is invalid or expired. Pinning the algorithm stops
    // an attacker substituting a token signed with a different scheme.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Re-fetch the user so a deleted/disabled account can't keep access
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
