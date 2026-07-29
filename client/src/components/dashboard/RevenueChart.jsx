// RevenueChart — a Recharts bar chart of top clients by paid revenue, shown on the
// admin dashboard. Expects data like [{ name, revenue }].
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function RevenueChart({ data = [] }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-semibold text-brand-navy dark:text-gray-100">Top Clients by Revenue</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Bar dataKey="revenue" fill="#2B6CB0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
