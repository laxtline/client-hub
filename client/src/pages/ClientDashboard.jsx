// ClientDashboard — the client portal home. Shows their projects with progress,
// invoice counts, and the latest AI progress summary (with history). If the AI
// fell back (riskFlag "unknown"), a subtle "AI summary unavailable" note appears.
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analyticsApi.js';
import { aiApi } from '../api/aiApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatDate, deadlineLabel } from '../utils/dateHelpers.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import Badge from '../components/common/Badge.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useEffect, useState } from 'react';

export default function ClientDashboard() {
  const { data, loading, error } = useFetch(() => analyticsApi.client(), []);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  // Once we know the client's first project, load its AI summary + history.
  useEffect(() => {
    const firstProject = data?.projects?.[0];
    if (!firstProject) return;
    let active = true; // ignore stale responses after re-fetch/unmount
    aiApi
      .get(firstProject.id)
      .then(({ data: d }) => {
        if (!active) return;
        setSummary(d.latest);
        setHistory(d.history || []);
      })
      .catch(() => {
        if (active) setSummary(null);
      });
    return () => {
      active = false;
    };
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white">My Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="My Projects" value={data.projects.length} icon="📁" />
        <StatsCard label="Pending Invoices" value={data.pendingInvoices} icon="⏳" accent="text-amber-600" />
        <StatsCard label="Overdue Invoices" value={data.overdueInvoices ?? 0} icon="⚠️" accent="text-red-600" />
        <StatsCard label="Paid Invoices" value={data.paidInvoices} icon="✅" accent="text-brand-green" />
      </div>

      {/* AI progress summary */}
      <section className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-navy dark:text-gray-100">🤖 AI Progress Summary</h2>
          {summary && <Badge value={summary.riskFlag} />}
        </div>

        {summary ? (
          <>
            {summary.riskFlag === 'unknown' && (
              <p className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                AI summary unavailable — showing a basic status instead
              </p>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-200">{summary.summaryText}</p>
            <p className="mt-2 text-xs text-gray-400">Generated {formatDate(summary.generatedAt)}</p>

            {history.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-blue">
                  Past summaries ({history.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge value={h.riskFlag} />
                        <span className="text-xs text-gray-400 dark:text-gray-400">
                          {formatDate(h.generatedAt)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{h.summaryText}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No AI summary yet for your projects.
          </p>
        )}
      </section>

      {/* Project list with progress + deadlines */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy dark:text-gray-100">My Projects</h2>
        {data.projects.length === 0 ? (
          <EmptyState title="No projects yet" message="Your projects will appear here." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800 dark:text-gray-100">{p.title}</h3>
                  <span className="text-sm font-semibold text-brand-blue">{p.progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full bg-brand-blue" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Deadline: {formatDate(p.deadline)} ({deadlineLabel(p.deadline)})
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
