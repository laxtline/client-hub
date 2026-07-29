// InvoiceTable — lists invoices with status, amount, and actions: download the
// PDF, and (for clients on a pending invoice) a "Pay Now" button. Payment itself
// is handled by the parent via onPay so this component stays presentational.
import { useState } from 'react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatDate } from '../../utils/dateHelpers.js';
import { invoiceApi } from '../../api/invoiceApi.js';

export default function InvoiceTable({ invoices, canPay = false, onPay }) {
  const { toast } = useToast();
  // Tracks which row is generating a PDF so the button can't be double-clicked.
  const [downloading, setDownloading] = useState(null);

  // Download the streamed PDF blob as a file.
  async function downloadPdf(id) {
    setDownloading(id);
    try {
      const res = await invoiceApi.downloadPdf(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      // Firefox ignores a click on a link that isn't in the document, and
      // revoking the URL in the same tick cancels the download in Safari —
      // so attach, click, then clean up on the next tick.
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      // Without this the failed request became an unhandled rejection and the
      // user just saw nothing happen.
      toast.error(err.response?.data?.message || 'Could not download the PDF.');
    } finally {
      setDownloading(null);
    }
  }

  return (
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
              <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{inv.project?.title || '—'}</td>
              <td className="px-4 py-3 font-medium dark:text-gray-100">{formatCurrency(inv.totalAmount)}</td>
              <td className="px-4 py-3">
                <Badge value={inv.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.dueDate)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => downloadPdf(inv.id)}
                    disabled={downloading === inv.id}
                  >
                    {downloading === inv.id ? '…' : 'PDF'}
                  </Button>
                  {canPay && inv.status !== 'paid' && (
                    <Button variant="success" onClick={() => onPay(inv)}>
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
  );
}
