import { useState } from 'react';
import { clientApi } from '../api/clientApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.js';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';
import Modal from '../components/common/Modal.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { isAdmin } from '../utils/helpers.js';
import TemporaryLogin from '../components/common/TemporaryLogin.jsx';

const EMPTY_FORM = {
  name: '',
  companyName: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
};

export default function ClientsPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const debouncedSearch = useDebounce(search);

  const { data, loading, error, refetch } = useFetch(
    (signal) => clientApi.list({ search: debouncedSearch, status, page, limit: 8 }, signal),
    [debouncedSearch, status, page]
  );

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: result } = await clientApi.create(form);
      setCredentials(result.credentials);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      toast.success(`Client "${form.name}" created`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create client');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id) {
    try {
      await clientApi.archive(id);
      toast.success('Client archived');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not archive client');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Clients</h1>
        {admin && <Button onClick={() => setModalOpen(true)}>+ Add Client</Button>}
      </div>

      <TemporaryLogin credentials={credentials} onClose={() => setCredentials(null)} />
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by name or company…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : data.clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          message={
            admin ? 'Try a different search, or add a new client.' : 'Try a different search.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} className="border-t dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.companyName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.contactEmail || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c._count?.projects ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {admin && status === 'active' && (
                        <Button variant="secondary" onClick={() => handleArchive(c.id)}>
                          Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Client">
        <form onSubmit={handleCreate} className="space-y-3">
          <InputField label="Name" name="name" value={form.name} onChange={change} required />
          <InputField
            label="Company"
            name="companyName"
            value={form.companyName}
            onChange={change}
          />
          <InputField
            label="Contact email"
            name="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={change}
            required
          />
          <InputField
            label="Contact phone"
            name="contactPhone"
            value={form.contactPhone}
            onChange={change}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">A linked client login and temporary password will be created automatically.</p>
          <InputField
            label="Notes"
            name="notes"
            as="textarea"
            value={form.notes}
            onChange={change}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
