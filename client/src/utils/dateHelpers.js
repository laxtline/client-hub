// Date utilities used by dashboards and detail pages.

// Format an ISO date string as a short, readable date (e.g. "15 Aug 2026").
// Returns '—' for missing dates so the UI never shows "Invalid Date".
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Whole days from now until the given date (negative = overdue). null if no date.
export function daysUntil(value) {
  if (!value) return null;
  const diffMs = new Date(value).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// A friendly relative phrase for a deadline, e.g. "in 12 days" / "3 days overdue".
export function deadlineLabel(value) {
  const days = daysUntil(value);
  if (days === null) return 'No deadline';
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return 'Due today';
  return `in ${days} day(s)`;
}
