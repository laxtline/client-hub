// Pagination — simple Prev / page-x-of-y / Next control for list pages.
import Button from './Button.jsx';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null; // nothing to paginate

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Page {page} of {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
