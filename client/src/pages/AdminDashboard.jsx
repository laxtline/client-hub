// AdminDashboard — KPI tiles + revenue/status charts for the agency owner.
// Pulls aggregated numbers from /analytics/admin.
import { analyticsApi } from '../api/analyticsApi.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import RevenueChart from '../components/dashboard/RevenueChart.jsx';
import ProgressChart from '../components/dashboard/ProgressChart.jsx';
import Loader from '../components/common/Loader.jsx';

export default function AdminDashboard() {
  const { data, loading, error } = useFetch(() => analyticsApi.admin(), []);

  if (loading) return <Loader />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Admin Dashboard</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} icon="💰" accent="text-brand-green" />
        <StatsCard label="Pending Payments" value={formatCurrency(data.pendingPayments)} icon="⏳" accent="text-amber-600" />
        <StatsCard
          label={`Overdue${data.overdueCount ? ` (${data.overdueCount})` : ''}`}
          value={formatCurrency(data.overduePayments)}
          icon="⚠️"
          accent="text-red-600"
        />
        <StatsCard label="Total Clients" value={data.totalClients} icon="👥" />
        <StatsCard label="Active Projects" value={data.activeProjects} icon="🚧" />
        <StatsCard label="Completed Projects" value={data.completedProjects} icon="✅" accent="text-brand-green" />
        <StatsCard label="Total Projects" value={data.totalProjects} icon="📁" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart data={data.topClients} />
        <ProgressChart active={data.activeProjects} completed={data.completedProjects} />
      </div>
    </div>
  );
}
