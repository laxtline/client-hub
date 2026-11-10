import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { defaultRoute } from '../utils/helpers.js';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function ChangePassword() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (user?.isDemo || user?.role === 'demo') return <Navigate to={defaultRoute(user.role)} replace />;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await authApi.changePassword({ currentPassword: form.get('currentPassword'), password: form.get('password') });
      login(data.user, data.accessToken);
      navigate(defaultRoute(data.user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update password.');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow dark:bg-gray-800 dark:text-gray-100">
        <h1 className="text-xl font-bold">{user?.mustChangePassword ? 'Set your new password' : 'Change password'}</h1>
        <p className="my-4 text-sm text-gray-500 dark:text-gray-400">
          {user?.mustChangePassword ? 'Enter the temporary password from your administrator, then choose your own password to continue.' : 'Use your current password to choose a new one.'}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <InputField label={user?.mustChangePassword ? 'Temporary password' : 'Current password'} name="currentPassword" type="password" autoComplete="current-password" required />
          <InputField label="New password" name="password" type="password" minLength={8} autoComplete="new-password" required />
          <InputField label="Confirm new password" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</Button>
        </form>
        <div className="mt-4 flex gap-4 text-sm text-brand-blue">
          {!user?.mustChangePassword && <Link to={defaultRoute(user.role)}>Back to dashboard</Link>}
          <button onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
