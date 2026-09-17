import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Users,
  Box,
  FileText,
  Trophy,
  Eye,
  CheckCircle,
  Truck,
  TrendingUp,
  Maximize2,
  PieChart,
  Funnel,
  BarChart3
} from 'lucide-react';
import { adminAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';

// ============================================================
// Skeleton Loader
// ============================================================
const OverviewSkeleton = () => (
  <div className="space-y-5">
    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded w-48 mb-2" />
      <div className="h-4 bg-ink-200 rounded w-32" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="h-4 bg-ink-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-ink-200 rounded w-16"></div>
              <div className="h-3 bg-ink-200 rounded w-16 mt-1"></div>
            </div>
            <div className="w-12 h-12 rounded-full bg-ink-200"></div>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
          <div className="flex items-start gap-4 mt-3">
            <div className="w-10 h-10 rounded-xl bg-ink-200 shrink-0"></div>
            <div className="flex-1">
              <div className="h-3 bg-ink-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-ink-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-ink-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
          <div className="h-4 bg-ink-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-ink-200 rounded w-20 mb-2"></div>
          <div className="h-3 bg-ink-200 rounded w-24"></div>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="h-5 bg-ink-200 rounded w-40"></div>
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="h-8 w-16 bg-ink-200 rounded-md"></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="h-4 bg-ink-200 rounded w-32 mb-3"></div>
          <div className="h-[220px] bg-ink-100 rounded-xl"></div>
        </div>
        <div>
          <div className="h-4 bg-ink-200 rounded w-32 mb-3"></div>
          <div className="h-[220px] bg-ink-100 rounded-xl"></div>
        </div>
        <div className="lg:col-span-2">
          <div className="h-4 bg-ink-200 rounded w-32 mb-3"></div>
          <div className="h-[200px] bg-ink-100 rounded-xl"></div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-ink-200 rounded w-32"></div>
            <div className="h-4 bg-ink-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((_, j) => (
              <div key={j}>
                <div className="flex items-center justify-between mb-1">
                  <div className="h-4 bg-ink-200 rounded w-20"></div>
                  <div className="h-4 bg-ink-200 rounded w-16"></div>
                </div>
                <div className="h-2 bg-ink-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-ink-200 rounded w-40"></div>
        <div className="h-4 bg-ink-200 rounded w-16"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <div className="h-4 bg-ink-200 rounded w-24"></div>
              <div className="h-4 bg-ink-200 rounded w-16"></div>
            </div>
            <div className="h-2 bg-ink-200 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 animate-pulse">
      <div className="h-5 bg-ink-200 rounded w-40 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-ink-100/60">
            <div className="w-9 h-9 rounded-xl bg-ink-200"></div>
            <div className="flex-1">
              <div className="h-4 bg-ink-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-ink-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const AnalyticsOverview = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [stats, setStats] = useState({
    users: { total: 0, newToday: 0 },
    items: { total: 0, active: 0, pending: 0, completed: 0, cancelled: 0 },
    applications: { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 },
    winners: { total: 0, thisWeek: 0 },
    views: { unique: 0, total: 0, today: 0 },
  });
  const [categoryStats, setCategoryStats] = useState([]);
  const [timeseries, setTimeseries] = useState([]);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAnalyticsOverview(range);
      const data = response.data.data || response.data;

      setStats({
        users: data.users || { total: 0, newToday: 0 },
        items: data.items || { total: 0, active: 0, pending: 0, completed: 0, cancelled: 0 },
        applications: data.applications || { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 },
        winners: data.winners || { total: 0, thisWeek: 0 },
        views: data.views || { unique: 0, total: 0, today: 0 },
      });
      setCategoryStats(data.categories || []);
      setTimeseries(data.timeseries || []);
    } catch (error) {
      console.error('Analytics overview error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  const openModal = (type, data) => {
    setModalData(data);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  if (loading) {
    return <OverviewSkeleton />;
  }

  // Calculate derived metrics
  const acceptanceRate = stats.applications.total > 0
    ? ((stats.applications.accepted / stats.applications.total) * 100).toFixed(1)
    : '0.0';

  const fulfilmentRate = stats.applications.accepted > 0
    ? ((stats.items.completed / stats.applications.accepted) * 100).toFixed(1)
    : '0.0';

  const viewToApplyRate = stats.views.unique > 0
    ? ((stats.applications.total / stats.views.unique) * 100).toFixed(1)
    : '0.0';

  const chartData = timeseries.map(point => ({
    ...point,
    dateLabel: point.date?.slice(5) || point.date,
    fullDate: point.date,
  }));

  return (
    <div className="space-y-6">
      {/* Header (Unified) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Analytics
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
            Analytics Overview
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Platform health, conversion rates and key trends
          </p>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={stats.users.total}
          sub={`+${stats.users.newToday} today`}
          icon={Users}
          color="primary"
          onViewDetails={() => openModal('users', { stats })}
        />
        <KpiCard
          label="Total Items"
          value={stats.items.total}
          sub={`${stats.items.active} active`}
          icon={Box}
          color="primary"
          onViewDetails={() => openModal('items', { stats })}
        />
        <KpiCard
          label="Applications"
          value={stats.applications.total}
          sub={`${stats.applications.pending} pending`}
          icon={FileText}
          color="primary"
          onViewDetails={() => openModal('applications', { stats })}
        />
        <KpiCard
          label="Winners"
          value={stats.winners.total}
          sub={`${stats.winners.thisWeek} this week`}
          icon={Trophy}
          color="primary"
          onViewDetails={() => openModal('winners', { stats })}
        />
      </div>

      {/* Conversion metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="View → Apply"
          value={`${viewToApplyRate}%`}
          description={`${stats.applications.total.toLocaleString()} applications from ${stats.views.unique.toLocaleString()} unique views`}
          icon={Eye}
          onViewDetails={() => openModal('views', { stats, timeseries })}
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${acceptanceRate}%`}
          description={`${stats.applications.accepted.toLocaleString()} of ${stats.applications.total.toLocaleString()} accepted`}
          icon={CheckCircle}
          onViewDetails={() => openModal('acceptance', { stats, timeseries })}
        />
        <MetricCard
          title="Fulfilment Rate"
          value={`${fulfilmentRate}%`}
          description={`${stats.items.completed.toLocaleString()} completed from ${stats.applications.accepted.toLocaleString()} accepted`}
          icon={Truck}
          onViewDetails={() => openModal('fulfilment', { stats, timeseries })}
        />
      </div>

      {/* Views stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Unique Views"
          value={stats.views.unique.toLocaleString()}
          subtext="items.views_count (cooldown)"
          onViewDetails={() => openModal('viewsDetail', { stats, timeseries })}
        />
        <StatCard
          label="Total View Events"
          value={stats.views.total.toLocaleString()}
          subtext="All recorded views"
          onViewDetails={() => openModal('viewsDetail', { stats, timeseries })}
        />
        <StatCard
          label="Views Today"
          value={stats.views.today.toLocaleString()}
          subtext="Today only"
          onViewDetails={() => openModal('viewsDetail', { stats, timeseries })}
        />
      </div>

      {/* ========== TRENDS OVER TIME ========== */}
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends over time
          </h3>
          <div className="flex items-center gap-1 bg-ink-100 rounded-xl p-1">
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  range === r
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        </div>

        {timeseries.length === 0 ? (
          <p className="text-center text-ink-400 py-12 text-sm font-medium">
            No time-series data available for this period.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Users + Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-ink-500">New Users & Items</p>
                <button
                  onClick={() => openModal('usersItemsChart', { timeseries, chartData })}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="users" name="New Users" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="items" name="New Items" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Applications + Views */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-ink-500">Applications & Views</p>
                <button
                  onClick={() => openModal('appsViewsChart', { timeseries, chartData })}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="views" name="Views" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Completed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-ink-500">Completed Donations</p>
                <button
                  onClick={() => openModal('completedChart', { timeseries, chartData })}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, fill: '#4338ca' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Status Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusSection
          title="Items by Status"
          icon={Box}
          onViewDetails={() => openModal('itemsStatus', { stats })}
        >
          <StatusRow label="Active" count={stats.items.active} total={stats.items.total} color="bg-emerald-500" />
          <StatusRow label="Pending" count={stats.items.pending} total={stats.items.total} color="bg-amber-400" />
          <StatusRow label="Completed" count={stats.items.completed} total={stats.items.total} color="bg-primary-600" />
          <StatusRow label="Cancelled" count={stats.items.cancelled} total={stats.items.total} color="bg-rose-400" />
        </StatusSection>

        <StatusSection
          title="Applications by Status"
          icon={FileText}
          onViewDetails={() => openModal('appsStatus', { stats })}
        >
          <StatusRow label="Pending" count={stats.applications.pending} total={stats.applications.total} color="bg-amber-400" />
          <StatusRow label="Accepted" count={stats.applications.accepted} total={stats.applications.total} color="bg-emerald-500" />
          <StatusRow label="Rejected" count={stats.applications.rejected} total={stats.applications.total} color="bg-rose-400" />
          <StatusRow label="Cancelled" count={stats.applications.cancelled} total={stats.applications.total} color="bg-ink-400" />
        </StatusSection>
      </div>

      {/* Category Distribution */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Items by Category
            </h3>
            <button
              onClick={() => openModal('categories', { categoryStats, stats })}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryStats.slice(0, 8).map((cat, index) => {
              const count = parseInt(cat.count) || 0;
              const pct = stats.items.total > 0 ? Math.round((count / stats.items.total) * 100) : 0;
              const barColors = ['bg-primary-600', 'bg-primary-500', 'bg-primary-400', 'bg-brand-500', 'bg-primary-700', 'bg-brand-400', 'bg-primary-300', 'bg-brand-600'];
              return (
                <div key={cat.category || index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-600 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${barColors[index % barColors.length]}`}></span>
                      {cat.category || 'Other'}
                    </span>
                    <span className="font-extrabold text-ink-900">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-ink-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${barColors[index % barColors.length]} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
        <h3 className="text-sm font-extrabold text-ink-700 mb-4">Explore deeper analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/admin/analytics/funnel" icon={Funnel} title="Funnel" desc="Views → Apply → Win" />
          <QuickLink to="/admin/analytics/items-performance" icon={BarChart3} title="Item Performance" desc="Top & weak listings" />
          <QuickLink to="/admin/analytics/user-insights" icon={Users} title="User Insights" desc="Donors & applicants" />
          <QuickLink to="/admin/analytics/fulfilment" icon={Truck} title="Fulfilment" desc="Accept → Received" />
        </div>
      </div>

      {/* ========== MODALS (Unified) ========== */}
      <Modal isOpen={activeModal === 'users'} onClose={closeModal} title="Users Detail" size="lg">
        <UsersDetailModal data={modalData} />
      </Modal>

      <Modal isOpen={activeModal === 'items'} onClose={closeModal} title="Items Detail" size="lg">
        <ItemsDetailModal data={modalData} />
      </Modal>

      <Modal isOpen={activeModal === 'applications'} onClose={closeModal} title="Applications Detail" size="lg">
        <ApplicationsDetailModal data={modalData} />
      </Modal>

      <Modal isOpen={activeModal === 'winners'} onClose={closeModal} title="Winners Detail" size="lg">
        <WinnersDetailModal data={modalData} />
      </Modal>

      <Modal isOpen={activeModal === 'usersItemsChart'} onClose={closeModal} title="Users & Items Trend" size="xl">
        <ChartExpandedModal data={modalData} chartType="usersItems" />
      </Modal>

      <Modal isOpen={activeModal === 'appsViewsChart'} onClose={closeModal} title="Applications & Views Trend" size="xl">
        <ChartExpandedModal data={modalData} chartType="appsViews" />
      </Modal>

      <Modal isOpen={activeModal === 'completedChart'} onClose={closeModal} title="Completed Donations Trend" size="xl">
        <ChartExpandedModal data={modalData} chartType="completed" />
      </Modal>

      <Modal isOpen={activeModal === 'itemsStatus'} onClose={closeModal} title="Items Status Breakdown" size="md">
        <StatusDetailModal data={modalData} type="items" />
      </Modal>

      <Modal isOpen={activeModal === 'appsStatus'} onClose={closeModal} title="Applications Status Breakdown" size="md">
        <StatusDetailModal data={modalData} type="applications" />
      </Modal>

      <Modal isOpen={activeModal === 'categories'} onClose={closeModal} title="All Categories" size="lg">
        <CategoriesDetailModal data={modalData} />
      </Modal>
    </div>
  );
};

/* ---------- Helper Components (Unified) ---------- */

function KpiCard({ label, value, sub, icon: Icon, color = 'primary', onViewDetails }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  const bgClass = colorMap[color] || colorMap.primary;
  return (
    <div className="group bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 hover:shadow-md transition-all relative">
      <button
        onClick={onViewDetails}
        className="absolute top-3 left-3 text-xs text-ink-400 hover:text-primary-600 transition"
        title="View details"
      />
      <div className="flex items-center justify-between mt-3">
        <div>
          <p className="text-xs font-bold text-ink-500">{label}</p>
          <p className="text-2xl font-extrabold text-ink-900">{Number(value).toLocaleString()}</p>
          {sub && <p className="text-xs font-bold text-primary-600 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center border border-ink-100/60`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, icon: Icon, onViewDetails }) {
  return (
    <div className="group bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 hover:shadow-md transition-all relative">
      <button
        onClick={onViewDetails}
        className="absolute top-3 left-3 text-xs text-ink-400 hover:text-primary-600 transition"
        title="View details"
      />
      <div className="flex items-start gap-4 mt-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
          {Icon && <Icon className="w-5 h-5 text-primary-600" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-500">{title}</p>
          <p className="text-xl font-extrabold text-ink-900 mt-0.5">{value}</p>
          <p className="text-xs font-medium text-ink-400 mt-1 line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, onViewDetails }) {
  return (
    <div className="group bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5 hover:shadow-md transition-all relative">
      <button
        onClick={onViewDetails}
        className="absolute top-3 left-3 text-xs text-ink-400 hover:text-primary-600 transition"
        title="View details"
      />
      <p className="text-xs font-bold text-ink-500 mt-3">{label}</p>
      <p className="text-2xl font-extrabold text-primary-600 mt-1">{value}</p>
      <p className="text-xs font-medium text-ink-400 mt-1">{subtext}</p>
    </div>
  );
}

function StatusSection({ title, icon: Icon, children, onViewDetails }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h3>
        <button
          onClick={onViewDetails}
          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Expand
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatusRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-bold text-ink-600">{label}</span>
        <span className="font-extrabold text-ink-900">
          {Number(count).toLocaleString()} <span className="text-ink-400 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:border-primary-200 hover:bg-primary-50/60 transition group shadow-sm"
    >
      <div className="w-9 h-9 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition border border-primary-100">
        {Icon && <Icon className="w-4 h-4 text-primary-600" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-ink-700 truncate">{title}</p>
        <p className="text-xs font-medium text-ink-400 truncate">{desc}</p>
      </div>
    </Link>
  );
}

/* ---------- Modal Content Components (Unified) ---------- */

function UsersDetailModal({ data }) {
  if (!data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const { users } = data.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Total Users</p>
          <p className="text-2xl font-extrabold text-ink-900">{users.total.toLocaleString()}</p>
        </div>
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">New Today</p>
          <p className="text-2xl font-extrabold text-primary-600">+{users.newToday.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ItemsDetailModal({ data }) {
  if (!data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const { items } = data.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Total Items</p>
          <p className="text-2xl font-extrabold text-ink-900">{items.total.toLocaleString()}</p>
        </div>
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Active</p>
          <p className="text-2xl font-extrabold text-emerald-600">{items.active.toLocaleString()}</p>
        </div>
      </div>
      <StatusSection title="Items by Status" icon={Box}>
        <StatusRow label="Active" count={items.active} total={items.total} color="bg-emerald-500" />
        <StatusRow label="Pending" count={items.pending} total={items.total} color="bg-amber-400" />
        <StatusRow label="Completed" count={items.completed} total={items.total} color="bg-primary-600" />
        <StatusRow label="Cancelled" count={items.cancelled} total={items.total} color="bg-rose-400" />
      </StatusSection>
    </div>
  );
}

function ApplicationsDetailModal({ data }) {
  if (!data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const { applications } = data.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Total Applications</p>
          <p className="text-2xl font-extrabold text-ink-900">{applications.total.toLocaleString()}</p>
        </div>
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Pending</p>
          <p className="text-2xl font-extrabold text-amber-600">{applications.pending.toLocaleString()}</p>
        </div>
      </div>
      <StatusSection title="Applications by Status" icon={FileText}>
        <StatusRow label="Pending" count={applications.pending} total={applications.total} color="bg-amber-400" />
        <StatusRow label="Accepted" count={applications.accepted} total={applications.total} color="bg-emerald-500" />
        <StatusRow label="Rejected" count={applications.rejected} total={applications.total} color="bg-rose-400" />
        <StatusRow label="Cancelled" count={applications.cancelled} total={applications.total} color="bg-ink-400" />
      </StatusSection>
    </div>
  );
}

function WinnersDetailModal({ data }) {
  if (!data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const { winners } = data.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">Total Winners</p>
          <p className="text-2xl font-extrabold text-ink-900">{winners.total.toLocaleString()}</p>
        </div>
        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-200/60 shadow-sm">
          <p className="text-sm font-bold text-ink-600">This Week</p>
          <p className="text-2xl font-extrabold text-primary-600">{winners.thisWeek.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ChartExpandedModal({ data, chartType }) {
  if (!data?.chartData) return <p className="text-ink-500 font-medium">No data available</p>;
  const { chartData } = data;

  return (
    <div className="space-y-4">
      {chartType === 'usersItems' && (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="users" name="New Users" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="items" name="New Items" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {chartType === 'appsViews' && (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="applications" name="Applications" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="views" name="Views" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {chartType === 'completed' && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StatusDetailModal({ data, type }) {
  if (!data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const stats = type === 'items' ? data.stats.items : data.stats.applications;

  return (
    <div className="space-y-3">
      {type === 'items' ? (
        <>
          <StatusRow label="Active" count={stats.active} total={stats.total} color="bg-emerald-500" />
          <StatusRow label="Pending" count={stats.pending} total={stats.total} color="bg-amber-400" />
          <StatusRow label="Completed" count={stats.completed} total={stats.total} color="bg-primary-600" />
          <StatusRow label="Cancelled" count={stats.cancelled} total={stats.total} color="bg-rose-400" />
        </>
      ) : (
        <>
          <StatusRow label="Pending" count={stats.pending} total={stats.total} color="bg-amber-400" />
          <StatusRow label="Accepted" count={stats.accepted} total={stats.total} color="bg-emerald-500" />
          <StatusRow label="Rejected" count={stats.rejected} total={stats.total} color="bg-rose-400" />
          <StatusRow label="Cancelled" count={stats.cancelled} total={stats.total} color="bg-ink-400" />
        </>
      )}
    </div>
  );
}

function CategoriesDetailModal({ data }) {
  if (!data?.categoryStats || !data?.stats) return <p className="text-ink-500 font-medium">No data available</p>;
  const { categoryStats, stats } = data;

  return (
    <div className="space-y-4">
      {categoryStats.map((cat, index) => {
        const count = parseInt(cat.count) || 0;
        const pct = stats.items.total > 0 ? Math.round((count / stats.items.total) * 100) : 0;
        const barColors = ['bg-primary-600', 'bg-primary-500', 'bg-primary-400', 'bg-brand-500', 'bg-primary-700', 'bg-brand-400', 'bg-primary-300', 'bg-brand-600'];
        return (
          <div key={cat.category || index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-600 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${barColors[index % barColors.length]}`}></span>
                {cat.category || 'Other'}
              </span>
              <span className="font-extrabold text-ink-900">{count.toLocaleString()} ({pct}%)</span>
            </div>
            <div className="w-full bg-ink-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnalyticsOverview;
