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
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // basic checks before hitting the server
  function validateFields(email, password) {
    const errors = {};
    if (!email) {
      errors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = fields.get('email').trim();
    const password = fields.get('password');

    // validate first
    const errors = validateFields(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError('');
    setIsSubmitting(true);
    try {
      const { data } = await authApi.login({ email, password });
      login(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.name?.split(' ')[0] || 'there'}!`);
      const dest = data.user.mustChangePassword ? '/change-password'
        : data.user.role === 'demo' ? '/demo'
        : location.state?.from?.pathname || defaultRoute(data.user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <InputField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            required
            error={fieldErrors.email}
            onChange={() => setFieldErrors((prev) => ({ ...prev, email: '' }))}
          />

          {/* password field with eye toggle */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={6}
                placeholder="Enter your password"
                onChange={() => setFieldErrors((prev) => ({ ...prev, password: '' }))}
                className={
                  'w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 ' +
                  'focus:ring-brand-blue dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 ' +
                  (fieldErrors.password || error
                    ? 'border-red-400'
                    : 'border-gray-300 dark:border-gray-600')
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  // eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</span>
            )}
            {error && !fieldErrors.password && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
            )}
          </div>

          {/* forgot password link */}
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-brand-blue hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Contact your agency admin to create an account or reset your password.
        </p>

        {/* demo credentials in a collapsible section */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            <span>Try the demo</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${showDemo ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDemo && (
            <div className="mt-2 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900/50 dark:text-gray-200">
              <p className="break-all">Email: <span className="font-medium">demo@clienthub.example</span></p>
              <p className="break-all">Password: <span className="font-medium">Demo@ClientHub123</span></p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Opens an empty demo workspace. Agency records and password changes are unavailable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
