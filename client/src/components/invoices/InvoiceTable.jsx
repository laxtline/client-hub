// InvoiceTable — lists invoices with status, amount, and actions: download PDF,
// and (for pending invoices) a "Pay Now" button that opens a mock payment modal.
import { useState, useRef } from 'react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDate } from '../../utils/dateHelpers.js';
import { invoiceApi } from '../../api/invoiceApi.js';
import { paymentApi } from '../../api/paymentApi.js';
import PaymentModal from './PaymentModal.jsx';

export default function InvoiceTable({ invoices, canPay = false, onPaid }) {
  const { toast } = useToast();
  const [paidIds, setPaidIds] = useState(new Set());
  const paymentInFlight = useRef(false);
  const [downloading, setDownloading] = useState(null);
  const [paying, setPaying] = useState(null);
  const [modalInvoice, setModalInvoice] = useState(null);

  // Download the streamed PDF blob as a file.
  async function downloadPdf(id) {
    setDownloading(id);
    try {
      const res = await invoiceApi.downloadPdf(id);

      // responseType is 'blob' so res.data is already a Blob
      const blob = res.data;
      const contentType = blob?.type || '';

      if (!contentType.includes('application/pdf')) {
        // try to read error message from blob if it's actually JSON
        let errorMsg = 'Server returned an error instead of PDF';
        if (blob && contentType.includes('application/json')) {
          try {
            const text = await blob.text();
            const parsed = JSON.parse(text);
            errorMsg = parsed.message || errorMsg;
          } catch {
            // ignore parse errors
          }
        }
        throw new Error(errorMsg);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // give browser time to start download before revoking
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      let message = err.message || 'Could not download the PDF.';
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          message = JSON.parse(await data.text()).message || message;
        } catch {
          /* binary error */
        }
      }
      toast.error(message);
    } finally {
      setDownloading(null);
    }
  }

  function openPayModal(invoice) {
    setModalInvoice(invoice);
  }

  async function confirmPayment() {
    if (!modalInvoice || paymentInFlight.current) return;
    paymentInFlight.current = true;
    setPaying(modalInvoice.id);
    try {
      await paymentApi.simulate(modalInvoice.id, modalInvoice.totalAmount);
      toast.success('Payment recorded (demo mode)');
      // Optimistically update the invoice status in the list
      setPaidIds((prev) => new Set([...prev, modalInvoice.id]));
      setModalInvoice(null);
      onPaid?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not process payment.');
    } finally {
      paymentInFlight.current = false;
      setPaying(null);
    }
  }

  function closeModal() {
    if (paymentInFlight.current) return;
    setModalInvoice(null);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t dark:border-gray-700">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {inv.project?.title || '—'}
                </td>
                <td className="px-4 py-3 font-medium dark:text-gray-100">
                  {formatCurrency(inv.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <Badge value={paidIds.has(inv.id) ? 'paid' : inv.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(inv.dueDate)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => downloadPdf(inv.id)}
                      disabled={downloading === inv.id}
                    >
                      {downloading === inv.id ? 'Downloading…' : 'Download PDF'}
                    </Button>
                    {canPay && inv.status !== 'paid' && !paidIds.has(inv.id) && (
                      <Button variant="success" onClick={() => openPayModal(inv)}>
                        Pay Now
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        invoice={modalInvoice}
        open={!!modalInvoice}
        onClose={closeModal}
        onConfirm={confirmPayment}
        isLoading={paying === modalInvoice?.id}
      />
    </>
  );
}
