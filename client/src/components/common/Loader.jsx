// Loader — a small spinner shown while data is loading, so pages never sit blank.
export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500 dark:text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-blue" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
