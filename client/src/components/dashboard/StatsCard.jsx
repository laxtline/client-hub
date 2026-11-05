// StatsCard — a single KPI tile (label + big value + optional icon) used to build
// the top row of the dashboards.
export default function StatsCard({ label, value, icon, accent = 'text-brand-navy' }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent} dark:text-white`}>{value}</p>
    </div>
  );
}
