// Login page — email/password sign-in. Redirects to the right dashboard based
// on role. Demo credentials are kept out of the UI (see DEMO_LOGINS.txt).
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { defaultRouteForRole } from '../utils/roleGuards.js';
import Logo from '../components/common/Logo.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name?.split(' ')[0] || 'there'}!`);
      // Go back to where the user was headed, or their role's dashboard.
      const dest = location.state?.from?.pathname || defaultRouteForRole(data.user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
      toast.error(msg);
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
        <h1 className="mb-1 text-center text-xl font-bold text-brand-navy dark:text-white">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">Sign in to your ClientHub account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            required
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-blue hover:underline">
            Forgot password?
          </Link>
          <Link to="/signup" className="text-brand-blue hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
