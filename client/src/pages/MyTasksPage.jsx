import { useState } from 'react';
import { Link } from 'react-router-dom';
import { taskApi } from '../api/taskApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFetch } from '../hooks/useFetch.js';
import { fmtDate, daysUntil, deadlineLabel } from '../utils/helpers.js';
import Badge from '../components/common/Badge.jsx';
import Loader from '../components/common/Loader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');

  const { data, loading, error } = useFetch(
    (signal) => taskApi.listMine({ status: status || undefined }, signal),
    [status]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">{user?.role === 'team_member' ? 'Team Dashboard' : 'My Tasks'}</h1>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter tasks by status"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : data.tasks.length === 0 ? (
        <EmptyState
          title="Nothing assigned to you"
          message="Tasks assigned to you will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((t) => {
                const days = daysUntil(t.dueDate);
                const overdue = t.status !== 'done' && days !== null && days < 0;

                return (
                  <tr key={t.id} className="border-t dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${t.project.id}`}
                        className="text-brand-blue hover:underline"
                      >
                        {t.project.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={t.priority} />
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        overdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {fmtDate(t.dueDate)}
                      <span className="block text-xs text-gray-400 dark:text-gray-500">
                        {deadlineLabel(t.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
