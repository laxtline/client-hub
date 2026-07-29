// Signup page — registers a new team-member account (client logins are created
// by an admin when adding a client; the admin account comes from the seed).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { defaultRouteForRole } from '../utils/roleGuards.js';
import Logo from '../components/common/Logo.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.signup(form);
      login(data.user, data.token);
      navigate(defaultRouteForRole(data.user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
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
        <h1 className="mb-6 text-center text-xl font-bold text-brand-navy dark:text-white">Create your account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Full name" name="name" value={form.name} onChange={change} required />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            required
          />
          <InputField
            label="Password (min 6 chars)"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            minLength={6}
            required
          />
          {/* New signups are always team members — admin is seeded, client
              logins are created by an admin (prevents privilege escalation). */}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
