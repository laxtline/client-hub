// Badge — a small colored pill for statuses, priorities, and AI risk flags.
// Centralizes the snake_case→label + color mapping so it's consistent app-wide.

// Maps backend enum values to a readable label + Tailwind color classes.
// Each palette carries a dark-mode variant: the light tints are unreadable on a
// dark card, which is what made statuses disappear in dark mode.
const GRAY = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
const BLUE = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
const GREEN = 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
const AMBER = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
const RED = 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
const PURPLE = 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';

const STYLES = {
  // Project / task status
  not_started: { label: 'Not Started', cls: GRAY },
  in_progress: { label: 'In Progress', cls: BLUE },
  completed: { label: 'Completed', cls: GREEN },
  on_hold: { label: 'On Hold', cls: AMBER },
  todo: { label: 'To Do', cls: GRAY },
  review: { label: 'Review', cls: PURPLE },
  done: { label: 'Done', cls: GREEN },
  // Priority
  low: { label: 'Low', cls: GRAY },
  medium: { label: 'Medium', cls: BLUE },
  high: { label: 'High', cls: RED },
  // Invoice status
  pending: { label: 'Pending', cls: AMBER },
  paid: { label: 'Paid', cls: GREEN },
  overdue: { label: 'Overdue', cls: RED },
  // AI risk flag
  on_track: { label: 'On Track', cls: GREEN },
  at_risk: { label: 'At Risk', cls: AMBER },
  delayed: { label: 'Delayed', cls: RED },
  unknown: { label: 'Unknown', cls: GRAY },
};

export default function Badge({ value }) {
  const style = STYLES[value] || { label: value, cls: GRAY };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.cls}`}>
      {style.label}
    </span>
  );
}
