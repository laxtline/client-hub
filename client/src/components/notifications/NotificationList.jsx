// NotificationList — the dropdown contents for the bell: shows recent
// notifications, lets the user mark one (or all) as read, and deep-links to the
// related item when clicked.
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateHelpers.js';

export default function NotificationList({ items, onMarkRead, onMarkAll, onClose }) {
  const navigate = useNavigate();

  // Mark as read, navigate to the linked page, and close the dropdown.
  function handleClick(n) {
    if (!n.isRead) onMarkRead(n.id);
    if (n.link) navigate(n.link);
    onClose?.();
  }

  return (
    <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b px-4 py-2 dark:border-gray-700">
        <span className="text-sm font-semibold text-brand-navy dark:text-gray-100">Notifications</span>
        <button onClick={onMarkAll} className="text-xs text-brand-blue hover:underline">
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            You're all caught up 🎉
          </p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`block w-full border-b px-4 py-3 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                n.isRead
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'bg-brand-light/40 font-medium text-gray-800 dark:bg-gray-700/50 dark:text-gray-100'
              }`}
            >
              <span className="block">{n.message}</span>
              <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
                {formatDate(n.createdAt)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
