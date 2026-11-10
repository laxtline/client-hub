import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { defaultRoute } from '../utils/helpers.js';
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
      login(data.user, data.accessToken);
      navigate(defaultRoute(data.user.role), { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        setError('An account with this email already exists.');
      } else {
        setError(err.response?.data?.message || 'Signup failed.');
      }
      console.log('Signup error:', err);
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
        <h1 className="mb-6 text-center text-xl font-bold text-brand-navy dark:text-white">
          Create a demo account
        </h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Demo accounts open an empty workspace. They cannot access agency data or change/reset passwords.
          Team and client accounts are created by the agency administrator.
        </p>

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
            label="Password (min 8 characters)"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            minLength={8}
            required
          />
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
