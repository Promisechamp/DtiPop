// src/admin/AnalyticsOverview.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  BarChart3,
  ArrowRight,
  Activity,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';

/* ============================================================
   SKELETON
============================================================ */

const OverviewSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-44 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
              </div>
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-ink-100" />
              <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                  <div className="h-6 w-16 animate-pulse rounded bg-ink-100" />
                  <div className="h-2.5 w-32 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-5 w-40 animate-pulse rounded bg-ink-100" />
            <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-16 animate-pulse rounded-lg bg-ink-100"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <div className="mb-3 h-3 w-32 animate-pulse rounded bg-ink-100" />
                <div className="h-[220px] animate-pulse rounded-xl bg-ink-100" />
              </div>
            ))}
            <div className="lg:col-span-2">
              <div className="mb-3 h-3 w-32 animate-pulse rounded bg-ink-100" />
              <div className="h-[200px] animate-pulse rounded-xl bg-ink-100" />
            </div>
          </div>
        </div>

        {/* STATUS BREAKDOWNS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="h-3 w-20 animate-pulse rounded bg-ink-100" />
                      <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
                    </div>
                    <div className="h-2 animate-pulse rounded-full bg-ink-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({ label, value, subtext, icon: Icon, tone = 'ink', onClick }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };

  const style = tones[tone] || tones.ink;
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="group w-full rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold text-ink-500">{label}</p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
        >
          <Icon size={15} className={style.color} />
        </span>
      </div>

      <p className={`mt-2 text-2xl font-black tracking-tight ${style.color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </Component>
  );
}

/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({ label, value, subtext, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon size={15} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-ink-950">
            {value}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-ink-400">
            {subtext}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   SECTION CARD
============================================================ */

function SectionCard({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section
      className={`rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-950">
          {Icon && <Icon size={15} className="text-ink-400" />}
          {title}
        </h3>

        {action}
      </div>

      {children}
    </section>
  );
}

/* ============================================================
   STATUS ROW
============================================================ */

function StatusRow({ label, count, total, tone = 'primary' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  const barColors = {
    primary: 'bg-primary-600',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    ink: 'bg-ink-400',
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-ink-600">{label}</span>
        <span className="font-extrabold text-ink-950">
          {Number(count).toLocaleString()}{' '}
          <span className="font-bold text-ink-400">({pct}%)</span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            barColors[tone] || barColors.primary
          }`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   QUICK LINK
============================================================ */

function QuickLink({ to, icon: Icon, title, desc }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
        <Icon size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-950">{title}</p>
        <p className="truncate text-[10px] font-bold text-ink-400">{desc}</p>
      </div>

      <ArrowRight
        size={14}
        className="shrink-0 text-ink-300 transition group-hover:text-primary-600"
      />
    </Link>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AnalyticsOverview = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [stats, setStats] = useState({
    users: { total: 0, newToday: 0 },
    items: { total: 0, active: 0, pending: 0, completed: 0, cancelled: 0 },
    applications: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
    },
    winners: { total: 0, thisWeek: 0 },
    views: { unique: 0, total: 0, today: 0 },
  });
  const [categoryStats, setCategoryStats] = useState([]);
  const [timeseries, setTimeseries] = useState([]);

  /* Modals */
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAnalyticsOverview(range);
      const data = response.data.data || response.data;

      setStats({
        users: data.users || { total: 0, newToday: 0 },
        items:
          data.items || {
            total: 0,
            active: 0,
            pending: 0,
            completed: 0,
            cancelled: 0,
          },
        applications:
          data.applications || {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
            cancelled: 0,
          },
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

  const openModal = (type, data) => {
    setModalData(data);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  /* ============================================================
     DERIVED METRICS
  ============================================================ */

  const acceptanceRate =
    stats.applications.total > 0
      ? ((stats.applications.accepted / stats.applications.total) * 100).toFixed(1)
      : '0.0';

  const fulfilmentRate =
    stats.applications.accepted > 0
      ? ((stats.items.completed / stats.applications.accepted) * 100).toFixed(1)
      : '0.0';

  const viewToApplyRate =
    stats.views.unique > 0
      ? ((stats.applications.total / stats.views.unique) * 100).toFixed(1)
      : '0.0';

  const chartData = useMemo(
    () =>
      timeseries.map((point) => ({
        ...point,
        dateLabel: point.date?.slice(5) || point.date,
        fullDate: point.date,
      })),
    [timeseries]
  );

  const rangeOptions = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
  ];

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) return <OverviewSkeleton />;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        {/* HEADER */}
        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Activity size={14} />
                <span>Analytics</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Analytics Overview
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Platform health</span>
                <span className="text-ink-300">·</span>
                <span>Conversion rates and key trends</span>
              </p>
            </div>

            {/* RANGE SELECTOR */}
            <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
              {rangeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={`flex items-center rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                    range === value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* KPI CARDS */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.users.total}
            subtext={`+${stats.users.newToday} today`}
            icon={Users}
            tone="primary"
            onClick={() => openModal('users', { stats })}
          />
          <StatCard
            label="Total Items"
            value={stats.items.total}
            subtext={`${stats.items.active} active`}
            icon={Box}
            tone="primary"
            onClick={() => openModal('items', { stats })}
          />
          <StatCard
            label="Applications"
            value={stats.applications.total}
            subtext={`${stats.applications.pending} pending`}
            icon={FileText}
            tone="primary"
            onClick={() => openModal('applications', { stats })}
          />
          <StatCard
            label="Winners"
            value={stats.winners.total}
            subtext={`${stats.winners.thisWeek} this week`}
            icon={Trophy}
            tone="primary"
            onClick={() => openModal('winners', { stats })}
          />
        </section>

        {/* CONVERSION METRICS */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard
            label="View → Apply"
            value={`${viewToApplyRate}%`}
            subtext={`${stats.applications.total.toLocaleString()} applications from ${stats.views.unique.toLocaleString()} unique views`}
            icon={Eye}
            onClick={() => openModal('views', { stats, timeseries })}
          />
          <MetricCard
            label="Acceptance Rate"
            value={`${acceptanceRate}%`}
            subtext={`${stats.applications.accepted.toLocaleString()} of ${stats.applications.total.toLocaleString()} accepted`}
            icon={CheckCircle}
            onClick={() => openModal('acceptance', { stats, timeseries })}
          />
          <MetricCard
            label="Fulfilment Rate"
            value={`${fulfilmentRate}%`}
            subtext={`${stats.items.completed.toLocaleString()} completed from ${stats.applications.accepted.toLocaleString()} accepted`}
            icon={Truck}
            onClick={() => openModal('fulfilment', { stats, timeseries })}
          />
        </section>

        {/* VIEWS STATS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Unique Views"
            value={stats.views.unique}
            subtext="items.views_count (cooldown)"
            icon={Eye}
            tone="primary"
            onClick={() => openModal('viewsDetail', { stats, timeseries })}
          />
          <StatCard
            label="Total View Events"
            value={stats.views.total}
            subtext="All recorded views"
            icon={Activity}
            tone="ink"
            onClick={() => openModal('viewsDetail', { stats, timeseries })}
          />
          <StatCard
            label="Views Today"
            value={stats.views.today}
            subtext="Today only"
            icon={TrendingUp}
            tone="success"
            onClick={() => openModal('viewsDetail', { stats, timeseries })}
          />
        </section>

        {/* TRENDS OVER TIME */}
        <SectionCard
          title="Trends over time"
          icon={TrendingUp}
          action={
            <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
              {rangeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={`flex items-center rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                    range === value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {timeseries.length === 0 ? (
            <p className="py-12 text-center text-sm font-bold text-ink-400">
              No time-series data available for this period.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Users + Items */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    New Users &amp; Items
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openModal('usersItemsChart', { timeseries, chartData })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    <Maximize2 size={11} />
                    Expand
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullDate || label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="New Users"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="items"
                      name="New Items"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Applications + Views */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Applications &amp; Views
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openModal('appsViewsChart', { timeseries, chartData })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    <Maximize2 size={11} />
                    Expand
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullDate || label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Area
                      type="monotone"
                      dataKey="applications"
                      name="Applications"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke="#a78bfa"
                      fill="#a78bfa"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Completed */}
              <div className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Completed Donations
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openModal('completedChart', { timeseries, chartData })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    <Maximize2 size={11} />
                    Expand
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullDate || label
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5, fill: '#4338ca' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionCard>

        {/* STATUS BREAKDOWNS */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Items by Status"
            icon={Box}
            action={
              <button
                type="button"
                onClick={() => openModal('itemsStatus', { stats })}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
              >
                <Maximize2 size={11} />
                Expand
              </button>
            }
          >
            <div className="space-y-3">
              <StatusRow
                label="Active"
                count={stats.items.active}
                total={stats.items.total}
                tone="success"
              />
              <StatusRow
                label="Pending"
                count={stats.items.pending}
                total={stats.items.total}
                tone="warning"
              />
              <StatusRow
                label="Completed"
                count={stats.items.completed}
                total={stats.items.total}
                tone="primary"
              />
              <StatusRow
                label="Cancelled"
                count={stats.items.cancelled}
                total={stats.items.total}
                tone="danger"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Applications by Status"
            icon={FileText}
            action={
              <button
                type="button"
                onClick={() => openModal('appsStatus', { stats })}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
              >
                <Maximize2 size={11} />
                Expand
              </button>
            }
          >
            <div className="space-y-3">
              <StatusRow
                label="Pending"
                count={stats.applications.pending}
                total={stats.applications.total}
                tone="warning"
              />
              <StatusRow
                label="Accepted"
                count={stats.applications.accepted}
                total={stats.applications.total}
                tone="success"
              />
              <StatusRow
                label="Rejected"
                count={stats.applications.rejected}
                total={stats.applications.total}
                tone="danger"
              />
              <StatusRow
                label="Cancelled"
                count={stats.applications.cancelled}
                total={stats.applications.total}
                tone="ink"
              />
            </div>
          </SectionCard>
        </section>

        {/* CATEGORY DISTRIBUTION */}
        {categoryStats.length > 0 && (
          <SectionCard
            title="Items by Category"
            icon={PieChart}
            action={
              <button
                type="button"
                onClick={() =>
                  openModal('categories', { categoryStats, stats })
                }
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
              >
                <Maximize2 size={11} />
                View All
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categoryStats.slice(0, 8).map((cat, index) => {
                const count = parseInt(cat.count) || 0;
                const pct =
                  stats.items.total > 0
                    ? Math.round((count / stats.items.total) * 100)
                    : 0;

                const barColors = [
                  'bg-primary-600',
                  'bg-primary-500',
                  'bg-primary-400',
                  'bg-brand-500',
                  'bg-primary-700',
                  'bg-brand-400',
                  'bg-primary-300',
                  'bg-brand-600',
                ];

                return (
                  <div key={cat.category || index}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-ink-600">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            barColors[index % barColors.length]
                          }`}
                        />
                        {cat.category || 'Other'}
                      </span>
                      <span className="font-extrabold text-ink-950">
                        {count.toLocaleString()}{' '}
                        <span className="font-bold text-ink-400">
                          ({pct}%)
                        </span>
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-ink-100">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          barColors[index % barColors.length]
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* QUICK LINKS */}
        <SectionCard title="Explore deeper analytics" icon={BarChart3}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink
              to="/admin/analytics/funnel"
              icon={Funnel}
              title="Funnel"
              desc="Views → Apply → Win"
            />
            <QuickLink
              to="/admin/analytics/items-performance"
              icon={BarChart3}
              title="Item Performance"
              desc="Top & weak listings"
            />
            <QuickLink
              to="/admin/analytics/user-insights"
              icon={Users}
              title="User Insights"
              desc="Donors & applicants"
            />
            <QuickLink
              to="/admin/analytics/fulfilment"
              icon={Truck}
              title="Fulfilment"
              desc="Accept → Received"
            />
          </div>
        </SectionCard>
      </div>

      {/* ============================================================
          MODALS
      ============================================================ */}

      <Modal
        isOpen={activeModal === 'users'}
        onClose={closeModal}
        title="Users Detail"
        size="lg"
      >
        <UsersDetailModal data={modalData} />
      </Modal>

      <Modal
        isOpen={activeModal === 'items'}
        onClose={closeModal}
        title="Items Detail"
        size="lg"
      >
        <ItemsDetailModal data={modalData} />
      </Modal>

      <Modal
        isOpen={activeModal === 'applications'}
        onClose={closeModal}
        title="Applications Detail"
        size="lg"
      >
        <ApplicationsDetailModal data={modalData} />
      </Modal>

      <Modal
        isOpen={activeModal === 'winners'}
        onClose={closeModal}
        title="Winners Detail"
        size="lg"
      >
        <WinnersDetailModal data={modalData} />
      </Modal>

      <Modal
        isOpen={activeModal === 'usersItemsChart'}
        onClose={closeModal}
        title="Users & Items Trend"
        size="xl"
      >
        <ChartExpandedModal data={modalData} chartType="usersItems" />
      </Modal>

      <Modal
        isOpen={activeModal === 'appsViewsChart'}
        onClose={closeModal}
        title="Applications & Views Trend"
        size="xl"
      >
        <ChartExpandedModal data={modalData} chartType="appsViews" />
      </Modal>

      <Modal
        isOpen={activeModal === 'completedChart'}
        onClose={closeModal}
        title="Completed Donations Trend"
        size="xl"
      >
        <ChartExpandedModal data={modalData} chartType="completed" />
      </Modal>

      <Modal
        isOpen={activeModal === 'itemsStatus'}
        onClose={closeModal}
        title="Items Status Breakdown"
        size="md"
      >
        <StatusDetailModal data={modalData} type="items" />
      </Modal>

      <Modal
        isOpen={activeModal === 'appsStatus'}
        onClose={closeModal}
        title="Applications Status Breakdown"
        size="md"
      >
        <StatusDetailModal data={modalData} type="applications" />
      </Modal>

      <Modal
        isOpen={activeModal === 'categories'}
        onClose={closeModal}
        title="All Categories"
        size="lg"
      >
        <CategoriesDetailModal data={modalData} />
      </Modal>
    </div>
  );
};

/* ============================================================
   DETAIL MODAL CONTENT
============================================================ */

function DetailTile({ label, value, tone = 'ink' }) {
  const tones = {
    ink: 'text-ink-950',
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-black tracking-tight ${tones[tone]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function UsersDetailModal({ data }) {
  if (!data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { users } = data.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailTile label="Total Users" value={users.total} tone="ink" />
        <DetailTile
          label="New Today"
          value={`+${users.newToday}`}
          tone="primary"
        />
      </div>
    </div>
  );
}

function ItemsDetailModal({ data }) {
  if (!data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { items } = data.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailTile label="Total Items" value={items.total} tone="ink" />
        <DetailTile label="Active" value={items.active} tone="success" />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          Items by Status
        </p>

        <div className="space-y-3">
          <StatusRow
            label="Active"
            count={items.active}
            total={items.total}
            tone="success"
          />
          <StatusRow
            label="Pending"
            count={items.pending}
            total={items.total}
            tone="warning"
          />
          <StatusRow
            label="Completed"
            count={items.completed}
            total={items.total}
            tone="primary"
          />
          <StatusRow
            label="Cancelled"
            count={items.cancelled}
            total={items.total}
            tone="danger"
          />
        </div>
      </div>
    </div>
  );
}

function ApplicationsDetailModal({ data }) {
  if (!data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { applications } = data.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailTile
          label="Total Applications"
          value={applications.total}
          tone="ink"
        />
        <DetailTile
          label="Pending"
          value={applications.pending}
          tone="warning"
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          Applications by Status
        </p>

        <div className="space-y-3">
          <StatusRow
            label="Pending"
            count={applications.pending}
            total={applications.total}
            tone="warning"
          />
          <StatusRow
            label="Accepted"
            count={applications.accepted}
            total={applications.total}
            tone="success"
          />
          <StatusRow
            label="Rejected"
            count={applications.rejected}
            total={applications.total}
            tone="danger"
          />
          <StatusRow
            label="Cancelled"
            count={applications.cancelled}
            total={applications.total}
            tone="ink"
          />
        </div>
      </div>
    </div>
  );
}

function WinnersDetailModal({ data }) {
  if (!data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { winners } = data.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailTile label="Total Winners" value={winners.total} tone="ink" />
        <DetailTile
          label="This Week"
          value={winners.thisWeek}
          tone="primary"
        />
      </div>
    </div>
  );
}

function ChartExpandedModal({ data, chartType }) {
  if (!data?.chartData)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { chartData } = data;

  const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <div className="space-y-4">
      {chartType === 'usersItems' && (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            <Area
              type="monotone"
              dataKey="users"
              name="New Users"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="items"
              name="New Items"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {chartType === 'appsViews' && (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            <Area
              type="monotone"
              dataKey="applications"
              name="Applications"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Views"
              stroke="#a78bfa"
              fill="#a78bfa"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {chartType === 'completed' && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StatusDetailModal({ data, type }) {
  if (!data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const stats =
    type === 'items' ? data.stats.items : data.stats.applications;

  return (
    <div className="space-y-3">
      {type === 'items' ? (
        <>
          <StatusRow
            label="Active"
            count={stats.active}
            total={stats.total}
            tone="success"
          />
          <StatusRow
            label="Pending"
            count={stats.pending}
            total={stats.total}
            tone="warning"
          />
          <StatusRow
            label="Completed"
            count={stats.completed}
            total={stats.total}
            tone="primary"
          />
          <StatusRow
            label="Cancelled"
            count={stats.cancelled}
            total={stats.total}
            tone="danger"
          />
        </>
      ) : (
        <>
          <StatusRow
            label="Pending"
            count={stats.pending}
            total={stats.total}
            tone="warning"
          />
          <StatusRow
            label="Accepted"
            count={stats.accepted}
            total={stats.total}
            tone="success"
          />
          <StatusRow
            label="Rejected"
            count={stats.rejected}
            total={stats.total}
            tone="danger"
          />
          <StatusRow
            label="Cancelled"
            count={stats.cancelled}
            total={stats.total}
            tone="ink"
          />
        </>
      )}
    </div>
  );
}

function CategoriesDetailModal({ data }) {
  if (!data?.categoryStats || !data?.stats)
    return <p className="text-sm font-bold text-ink-500">No data available</p>;

  const { categoryStats, stats } = data;

  const barColors = [
    'bg-primary-600',
    'bg-primary-500',
    'bg-primary-400',
    'bg-brand-500',
    'bg-primary-700',
    'bg-brand-400',
    'bg-primary-300',
    'bg-brand-600',
  ];

  return (
    <div className="space-y-4">
      {categoryStats.map((cat, index) => {
        const count = parseInt(cat.count) || 0;
        const pct =
          stats.items.total > 0
            ? Math.round((count / stats.items.total) * 100)
            : 0;

        return (
          <div key={cat.category || index}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-ink-600">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    barColors[index % barColors.length]
                  }`}
                />
                {cat.category || 'Other'}
              </span>
              <span className="font-extrabold text-ink-950">
                {count.toLocaleString()}{' '}
                <span className="font-bold text-ink-400">({pct}%)</span>
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-ink-100">
              <div
                className={`h-2 rounded-full ${
                  barColors[index % barColors.length]
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnalyticsOverview;