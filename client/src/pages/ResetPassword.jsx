// ResetPassword page — reached via the emailed link (?token=...). Sets a new
// password using that token, then sends the user to login.
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import Logo from '../components/common/Logo.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold text-brand-navy dark:text-white">Choose a new password</h1>

        {!token ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">Missing reset token.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="New password (min 6 chars)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-brand-blue hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
