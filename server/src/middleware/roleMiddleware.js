// Role-based access control (RBAC). Use after `authenticate` to restrict a route
// to specific roles, e.g. router.post('/', authenticate, authorize('admin'), ...).
// Backend enforcement is essential — frontend guards alone can be bypassed.

/**
 * @param {...string} allowedRoles - roles permitted to access the route
 * @returns Express middleware
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };
}
