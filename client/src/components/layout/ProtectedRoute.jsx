import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { defaultRoute } from '../../utils/helpers.js';
import Loader from '../common/Loader.jsx';

export default function ProtectedRoute({ children, roles, allowPasswordChange = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for refresh before redirecting to login.
  if (loading) return <Loader label="Checking session…" />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mustChangePassword && !allowPasswordChange) return <Navigate to="/change-password" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultRoute(user.role)} replace />;
  }

  return children;
}
