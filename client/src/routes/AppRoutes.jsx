import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { defaultRoute } from '../utils/helpers.js';

import ProtectedRoute from '../components/layout/ProtectedRoute.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Loader from '../components/common/Loader.jsx';

import Login from '../pages/Login.jsx';

const Signup = lazy(() => import('../pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard.jsx'));
const ClientDashboard = lazy(() => import('../pages/ClientDashboard.jsx'));
const ClientsPage = lazy(() => import('../pages/ClientsPage.jsx'));
const MyTasksPage = lazy(() => import('../pages/MyTasksPage.jsx'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage.jsx'));
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage.jsx'));
const InvoicesPage = lazy(() => import('../pages/InvoicesPage.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));
const DemoPage = lazy(() => import('../pages/DemoPage.jsx'));
const ChangePassword = lazy(() => import('../pages/ChangePassword.jsx'));
const AccountsPage = lazy(() => import('../pages/AccountsPage.jsx'));

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? defaultRoute(user.role) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/change-password" element={<ProtectedRoute allowPasswordChange><ChangePassword /></ProtectedRoute>} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute roles={['admin']}>
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

          <Route
            path="/client"
            element={
              <ProtectedRoute roles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/team" element={<ProtectedRoute roles={['team_member']}><MyTasksPage /></ProtectedRoute>} />
          <Route path="/demo" element={<ProtectedRoute roles={['demo']}><DemoPage /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute roles={['admin']}><AccountsPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute roles={['admin', 'team_member', 'client']}><ProjectsPage /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute roles={['admin', 'team_member', 'client']}><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute roles={['admin', 'client']}><InvoicesPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
