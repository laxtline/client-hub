import { useState } from 'react';
import { accountApi } from '../api/accountApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../hooks/useToast.js';
import { roleLabel } from '../utils/helpers.js';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';
import Loader from '../components/common/Loader.jsx';
import TemporaryLogin from '../components/common/TemporaryLogin.jsx';

export default function AccountsPage() {
  const { data, loading, error, refetch } = useFetch((signal) => accountApi.list(signal), []);
  const { toast } = useToast();
  const [credentials, setCredentials] = useState(null);
  const [busy, setBusy] = useState(false);

  async function createTeam(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setCredentials(null);
    try {
      const { data: result } = await accountApi.createTeam({ name: fields.get('name'), email: fields.get('email') });
      setCredentials(result.credentials);
      form.reset();
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not create account.'); }
    finally { setBusy(false); }
  }

  async function resetPassword(user) {
    if (!window.confirm(`Create a new temporary password for ${user.email}? Their existing sessions will end.`)) return;
    setBusy(true);
    setCredentials(null);
    try {
      const { data: result } = await accountApi.resetPassword(user.id);
      setCredentials(result.credentials);
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not reset password.'); }
    finally { setBusy(false); }
  }

  async function toggleAccount(user) {
    if (!window.confirm(`${user.disabled ? 'Enable' : 'Disable'} ${user.email}?`)) return;
    setBusy(true);
    try {
      await accountApi.setDisabled(user.id, !user.disabled);
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update account.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Team &amp; Accounts</h1>
      <TemporaryLogin credentials={credentials} onClose={() => setCredentials(null)} />
      <section className="rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 font-semibold dark:text-white">Create a team account</h2>
        <form onSubmit={createTeam} className="flex flex-wrap items-end gap-3">
          <InputField label="Full name" name="name" minLength={2} maxLength={100} required />
          <InputField label="Email" name="email" type="email" required />
          <Button type="submit" disabled={busy}>Create team account</Button>
        </form>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Create client logins from the Clients page. Current passwords are never shown.</p>
      </section>
      {loading ? <Loader /> : error ? <p role="alert" className="text-red-600">{error}</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-left text-sm dark:text-gray-200">
            <thead><tr className="border-b dark:border-gray-700">
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody>{data.users.map((user) => (
              <tr key={user.id} className="border-b dark:border-gray-700">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{roleLabel(user.role)}</td>
                <td className="px-4 py-3">{user.disabled ? 'Disabled' : user.isDemo ? 'Seed demo (password locked)' : user.mustChangePassword ? 'Password change required' : 'Active'}</td>
                <td className="flex flex-wrap gap-2 px-4 py-3">
                  <Button variant="secondary" disabled={busy || user.disabled || user.isDemo || user.role === 'demo'} onClick={() => resetPassword(user)}>Reset password</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => toggleAccount(user)}>{user.disabled ? 'Enable' : 'Disable'}</Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {data.users.length === 0 && <p className="p-4 text-gray-500">No team or client accounts yet.</p>}
        </div>
      )}
    </div>
  );
}
