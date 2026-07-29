// ProgressChart — a Recharts pie of active vs completed projects for the admin
// dashboard. Expects { active, completed } counts.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#2B6CB0', '#16A34A'];

export default function ProgressChart({ active = 0, completed = 0 }) {
  const data = [
    { name: 'Active', value: active },
    { name: 'Completed', value: completed },
  ];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-semibold text-brand-navy dark:text-gray-100">Project Status</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
