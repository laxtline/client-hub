// InvoicesPage — admin sees all invoices and can create one; clients see only
// their own and can pay a pending invoice via Razorpay (test mode). The actual
// "mark as paid" happens server-side through the verified webhook, so after the
// checkout closes we just refresh to reflect any status change.
import { useState } from 'react';
import { invoiceApi } from '../api/invoiceApi.js';
import { paymentApi } from '../api/paymentApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { isAdmin, isClient } from '../utils/roleGuards.js';
import InvoiceTable from '../components/invoices/InvoiceTable.jsx';
import InvoiceForm from '../components/invoices/InvoiceForm.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';

// Lazily inject the Razorpay checkout script once, returning a promise.
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const admin = isAdmin(user);
  const client = isClient(user);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    () => invoiceApi.list({ status: statusFilter || undefined, page, limit: 10 }),
    [statusFilter, page]
  );

  // Open the Razorpay checkout for an unpaid invoice.
  // Every step can fail (offline, gateway not configured, invoice already
  // paid); previously a rejection here vanished as an unhandled promise and
  // the button appeared to do nothing.
  async function handlePay(invoice) {
    if (paying) return; // guard against a double click opening two checkouts
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error('Could not load the payment gateway. Check your connection and retry.');
        return;
      }

      // Ask the backend to create a gateway order (returns key + order id + amount).
      const { data: order } = await paymentApi.createOrder(invoice.id);

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ClientHub',
        description: `Invoice ${invoice.id}`,
        order_id: order.orderId,
        // The real status update arrives via the server webhook; refresh on close.
        handler: () => {
          toast.info('Payment received — updating your invoice…');
          setTimeout(refetch, 1500);
        },
        modal: { ondismiss: () => toast.info('Payment cancelled.') },
        theme: { color: '#1F355E' },
      });
      rzp.on('payment.failed', (res) =>
        toast.error(res?.error?.description || 'Payment failed. Please try again.')
      );
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the payment. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
          {admin ? 'Invoices' : 'My Invoices'}
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
          <InvoiceTable invoices={data.invoices} canPay={client} onPay={handlePay} />
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
