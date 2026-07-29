// ProtectedRoute — gate that blocks routes for users who aren't logged in or
// don't have an allowed role. CONCEPT: it wraps route elements and either renders
// them, redirects to /login, or redirects to the user's own dashboard.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { defaultRouteForRole } from '../../utils/roleGuards.js';
import Loader from '../common/Loader.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait until the saved token has been checked, so we don't bounce a valid user.
  if (loading) return <Loader label="Checking session…" />;

  // Not logged in → send to login, remembering where they were headed.
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Logged in but wrong role → send them to their own dashboard instead.
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />;
  }

  return children;
}
