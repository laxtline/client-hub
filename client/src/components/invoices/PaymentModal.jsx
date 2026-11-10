import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from '../common/Button.jsx';
import { formatMoney } from '../../utils/helpers.js';

export default function PaymentModal({ invoice, open, onClose, onConfirm, isLoading }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement;
    // Focus after the dialog is on the page.
    setTimeout(() => modalRef.current?.focus(), 0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const focusableArray = Array.from(focusable);
        const first = focusableArray[0];
        const last = focusableArray[focusableArray.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [open]);

  if (!open || !invoice) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="payment-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Confirm Payment
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Invoice</span>
            <span className="font-medium text-gray-900 dark:text-white">{invoice.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Project</span>
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[60%]">
              {invoice.project?.title || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Client</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {invoice.client?.name || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Due</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="flex justify-between text-base border-t pt-2 dark:border-gray-600">
            <span className="font-medium text-gray-700 dark:text-gray-300">Amount</span>
            <span className="font-bold text-brand-navy dark:text-brand-light">
              {formatMoney(invoice.totalAmount)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Includes {invoice.taxRate || 0}% tax
          </p>
        </div>

        <div className="flex items-center gap-2 mb-4 p-3 bg-brand-light/20 dark:bg-brand-blue/10 rounded-lg border border-brand-blue/20 dark:border-brand-blue/30">
          <svg
            className="w-5 h-5 text-brand-blue dark:text-brand-light flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-brand-navy dark:text-brand-light">
            Demo mode — payment simulated
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              'Confirm & Pay'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
