import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { defaultRoute } from '../utils/helpers.js';
import Logo from '../components/common/Logo.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const credentials = {
      email: fields.get('email').trim(),
      password: fields.get('password'),
    };

    setError('');
    setIsSubmitting(true);
    try {
      const { data } = await authApi.login(credentials);
      login(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.name?.split(' ')[0] || 'there'}!`);
      const dest = data.user.mustChangePassword ? '/change-password'
        : data.user.role === 'demo' ? '/demo'
        : location.state?.from?.pathname || defaultRoute(data.user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-brand-navy dark:text-white">
          Welcome back
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Sign in to your ClientHub account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={error}
            minLength={6}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Account banwane ya password reset karwane ke liye apne agency administrator se contact karein.
        </p>
        <div className="mt-4 text-center text-sm">
          <Link to="/signup" className="text-brand-blue hover:underline">
            Create a demo account
          </Link>
        </div>
        <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900/50 dark:text-gray-200">
          <h2 className="font-semibold">Public demo login</h2>
          <p className="mt-2 break-all">Email: demo@clienthub.example</p>
          <p className="break-all">Password: Demo@ClientHub123</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Opens an empty demo workspace. Agency records and password changes are unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}
