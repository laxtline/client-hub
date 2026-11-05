// EmptyState — friendly placeholder shown when a list has no items, so the user
// sees guidance instead of a blank area.
export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-600 dark:bg-gray-800">
      <p className="text-base font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
