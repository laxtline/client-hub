// Toaster — renders the active toasts in a fixed corner stack.
// Reads from ToastContext; each toast is colour-coded by type and can be
// dismissed early by clicking the ✕. Pure Tailwind, no external dependency.
import { useToast } from '../../hooks/useToast.js';

const STYLES = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-brand-navy text-white',
};

const ICONS = {
  success: '✓',
  error: '!',
  info: 'i',
};

export default function Toaster() {
  const { toasts, remove } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ring-black/5 ${
            STYLES[t.type] || STYLES.info
          }`}
        >
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
            {ICONS[t.type] || ICONS.info}
          </span>
          <p className="flex-1 text-sm leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="ml-1 flex-shrink-0 text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
