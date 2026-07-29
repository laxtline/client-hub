// Modal — a centered dialog with a backdrop. Used for create/edit forms
// and task details. Closes on backdrop click, the × button, or Escape.
// Focus moves into the dialog on open and is kept inside while it is open
// (screen readers announce it via role="dialog" + aria-modal).
import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    // Move focus into the dialog so keyboard/screen-reader users land in it.
    panelRef.current?.focus();
    // Stop the page behind the backdrop from scrolling with the wheel — it made
    // long forms feel like the modal was drifting.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab cycling inside the dialog (a minimal focus trap).
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Give focus back to whatever opened the dialog.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* Stop clicks inside the panel from closing the modal. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl outline-none dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-brand-navy dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && <div className="flex justify-end gap-2 border-t px-5 py-3 dark:border-gray-700">{footer}</div>}
      </div>
    </div>
  );
}
