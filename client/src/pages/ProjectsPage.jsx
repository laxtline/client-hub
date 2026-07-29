// ProjectsPage — lists projects (admin/team see all; clients see only their own,
// enforced by the backend). Admins get a status filter and a "New Project" modal.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../api/projectApi.js';
import { clientApi } from '../api/clientApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../hooks/useAuth.js';
import { isAdmin } from '../utils/roleGuards.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDate } from '../utils/dateHelpers.js';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import InputField from '../components/common/InputField.jsx';
import Modal from '../components/common/Modal.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';

const EMPTY_FORM = { clientId: '', title: '', description: '', budget: '', deadline: '', status: 'not_started' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    () => projectApi.list({ status: status || undefined, page, limit: 9 }),
    [status, page]
  );

  // Admins need the client list to assign a project to a client.
  useEffect(() => {
    if (admin && modalOpen) {
      clientApi.list({ limit: 100 }).then(({ data: d }) => setClients(d.clients)).catch(() => {});
    }
  }, [admin, modalOpen]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await projectApi.create(form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
          {admin ? 'Projects' : 'My Projects'}
        </h1>
        {admin && <Button onClick={() => setModalOpen(true)}>+ New Project</Button>}
      </div>

      <select
        value={status}
        onChange={(e) => {
          setPage(1);
          setStatus(e.target.value);
        }}
        aria-label="Filter projects by status"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All statuses</option>
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="on_hold">On Hold</option>
      </select>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : data.projects.length === 0 ? (
        <EmptyState title="No projects" message="Projects will appear here once created." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-medium text-gray-800 dark:text-gray-100">{p.title}</h3>
                  <Badge value={p.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.client?.name}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full bg-brand-blue" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{p.progress}% complete</span>
                  <span>{formatCurrency(p.budget)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Deadline: {formatDate(p.deadline)}
                </p>
              </Link>
            ))}
          </div>
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {/* New project modal (admin only) */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-3">
          <InputField label="Client" as="select" name="clientId" value={form.clientId} onChange={change} required>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </InputField>
          <InputField label="Title" name="title" value={form.title} onChange={change} required />
          <InputField label="Description" name="description" as="textarea" value={form.description} onChange={change} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Budget (₹)" name="budget" type="number" value={form.budget} onChange={change} />
            <InputField label="Deadline" name="deadline" type="date" value={form.deadline} onChange={change} />
          </div>
          <InputField label="Status" as="select" name="status" value={form.status} onChange={change}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </InputField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
