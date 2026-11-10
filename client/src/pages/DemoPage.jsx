import { useAuth } from '../hooks/useAuth.js';

export default function DemoPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Demo Workspace</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}. This is your empty demo view.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {['Projects', 'Tasks', 'Invoices'].map((label) => (
          <div key={label} className="rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm text-gray-500 dark:text-gray-400">{label}</h2>
            <p className="mt-2 text-3xl font-bold dark:text-white">0</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <h2 className="font-semibold">No agency data is available here</h2>
        <p className="mt-2 text-sm">Public demo accounts cannot view clients, team members or administrator records. Password changes and resets are disabled.</p>
        <p className="mt-3 text-sm">For a team or client account, contact your agency administrator.</p>
      </div>
    </div>
  );
}
