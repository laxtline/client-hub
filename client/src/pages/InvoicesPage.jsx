// InvoicesPage — admin sees all invoices and can create one; clients see only
// their own and can pay a pending invoice via mock payment flow (demo mode).
import { useState } from 'react';
import { invoiceApi } from '../api/invoiceApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../hooks/useAuth.js';
import { isAdmin, isClient } from '../utils/roleGuards.js';
import InvoiceTable from '../components/invoices/InvoiceTable.jsx';
import InvoiceForm from '../components/invoices/InvoiceForm.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useInvoiceUpdates } from '../hooks/useInvoiceUpdates.js';

export default function InvoicesPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const client = isClient(user);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    (signal) => invoiceApi.list({ status: statusFilter || undefined, page, limit: 10 }, signal),
    [statusFilter, page]
  );
  useInvoiceUpdates(refetch);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
          {client ? 'My Invoices' : 'Invoices'}
        </h1>
        {admin && <Button onClick={() => setModalOpen(true)}>+ New Invoice</Button>}
      </div>

      <select
        value={statusFilter}
        onChange={(e) => {
          setPage(1);
          setStatusFilter(e.target.value);
        }}
        aria-label="Filter invoices by status"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : data.invoices.length === 0 ? (
        <EmptyState title="No invoices" message="Invoices will appear here once created." />
      ) : (
        <>
          <InvoiceTable invoices={data.invoices} canPay={client} onPaid={refetch} />
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {/* New invoice modal (admin only) */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Invoice">
        <InvoiceForm
          onCreated={() => {
            setModalOpen(false);
            refetch();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
