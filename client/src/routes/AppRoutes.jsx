// AppRoutes — the single place that maps URLs to pages. Public auth routes are
// open; everything else is wrapped in ProtectedRoute (and DashboardLayout) so only
// the right roles can reach each page. "/" redirects users to their own dashboard.
//
// PERFORMANCE: pages are loaded lazily. Recharts alone is ~400 kB and used only
// by the two dashboards — statically importing them made every visitor download
// it before the login form could paint. React.lazy defers each page's chunk
// until its route is actually visited.
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { defaultRouteForRole } from '../utils/roleGuards.js';

import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Loader from '../components/common/Loader.jsx';

// Login is the first paint for signed-out users, so it stays in the main bundle.
import Login from '../pages/Login.jsx';

const Signup = lazy(() => import('../pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.jsx'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard.jsx'));
const ClientDashboard = lazy(() => import('../pages/ClientDashboard.jsx'));
const ClientsPage = lazy(() => import('../pages/ClientsPage.jsx'));
const MyTasksPage = lazy(() => import('../pages/MyTasksPage.jsx'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage.jsx'));
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage.jsx'));
const InvoicesPage = lazy(() => import('../pages/InvoicesPage.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

// Sends "/" to the correct dashboard (or login if signed out).
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? defaultRouteForRole(user.role) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    // One boundary for every lazy route: shows the same spinner the pages use
    // while a chunk downloads, so a route change never flashes a blank screen.
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Authenticated app (shared shell) */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin + team only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin', 'team_member']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute roles={['admin', 'team_member']}>
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute roles={['admin', 'team_member']}>
                <MyTasksPage />
              </ProtectedRoute>
            }
          />

          {/* Client only */}
          <Route
            path="/client"
            element={
              <ProtectedRoute roles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />

          {/* Shared (backend enforces tenant isolation) */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
