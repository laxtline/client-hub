// ForgotPassword page — asks for an email and triggers the reset link. The server
// always responds success (so attackers can't probe which emails exist), so we
// show the same confirmation regardless.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import Logo from '../components/common/Logo.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold text-brand-navy dark:text-white">Reset your password</h1>

        {sent ? (
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            If that email exists, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
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
