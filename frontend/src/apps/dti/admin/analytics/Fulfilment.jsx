// src/admin/AnalyticsFulfilment.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  Box,
  Boxes,
  Check,
  CheckCircle2,
  Clock3,
  CircleAlert,
  CircleCheck,
  Hourglass,
  PackageCheck,
  PieChart,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Grid2X2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import { adminAPI } from '@/services/api/dtiApi';

/* ============================================================
   CONSTANTS
============================================================ */

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const TABS = [
  {
    key: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: Grid2X2,
  },
  {
    key: 'timeline',
    label: 'Fulfilment Timeline',
    shortLabel: 'Timeline',
    icon: Hourglass,
  },
  {
    key: 'stuck',
    label: 'Stuck Items',
    shortLabel: 'Stuck',
    icon: CircleAlert,
  },
  {
    key: 'categories',
    label: 'Category Success',
    shortLabel: 'Categories',
    icon: PieChart,
  },
];

/* ============================================================
   SKELETON
============================================================ */

const FulfilmentSkeleton = () => (
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
          <div className="h-11 w-48 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* STATS */}
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

        {/* TABS */}
        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 flex-1 animate-pulse rounded-xl bg-ink-100"
              />
            ))}
          </div>
        </div>

        {/* CHART */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-5 h-5 w-44 animate-pulse rounded bg-ink-100" />
          <div className="h-64 animate-pulse rounded-xl bg-ink-100" />
        </div>

        {/* TWO COLUMNS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-5 h-5 w-36 animate-pulse rounded bg-ink-100" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 py-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                    <div className="flex-1">
                      <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-ink-100" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-ink-100" />
                    </div>
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
   SURFACE (card shell)
============================================================ */

const Surface = ({ children, className = '' }) => (
  <div
    className={`rounded-[26px] border border-ink-100 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

/* ============================================================
   SECTION HEADER
============================================================ */

const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon size={15} strokeWidth={2.3} />
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-ink-950">{title}</h3>

        {description && (
          <p className="mt-0.5 text-[11px] font-bold text-ink-400">
            {description}
          </p>
        )}
      </div>
    </div>

    {action}
  </div>
);

/* ============================================================
   QUICK STAT (matches AdminUsers StatCard)
============================================================ */

function QuickStat({
  label,
  value,
  icon: Icon,
  subtext,
  tone = 'ink',
  trend,
}) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };

  const style = tones[tone] || tones.ink;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold text-ink-500">{label}</p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
        >
          <Icon size={15} className={style.color} />
        </span>
      </div>

      <div className="flex items-end gap-2">
        <p className={`mt-2 text-2xl font-black tracking-tight ${style.color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>

        {trend && (
          <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] font-extrabold text-success-600">
            <TrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </div>
  );
}

/* ============================================================
   TIMELINE STEP
============================================================ */

const TimelineStep = ({ label, value, icon: Icon, isActive, isCompleted, color }) => {
  return (
    <div
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 transition-all sm:gap-4 ${
        isCompleted
          ? 'border-success-200 bg-success-50'
          : isActive
          ? 'border-warning-200 bg-warning-50'
          : 'border-ink-100 bg-ink-50/50'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isCompleted
            ? 'bg-success-500 text-white'
            : isActive
            ? 'bg-warning-500 text-white'
            : 'bg-ink-200 text-ink-500'
        }`}
      >
        {isCompleted ? (
          <Check size={19} strokeWidth={2.8} />
        ) : (
          <Icon size={19} strokeWidth={2.3} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink-950">{label}</p>

        <p className="mt-0.5 text-[11px] font-bold text-ink-400">
          {isCompleted ? 'Completed' : isActive ? 'In progress' : 'Pending'}
        </p>
      </div>

      <div className="text-right">
        <p className={`text-xl font-black ${color} sm:text-2xl`}>
          {value.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
          items
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex min-h-[300px] items-center justify-center px-6 py-12">
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
        <Icon size={27} />
      </div>

      <h2 className="mt-5 text-lg font-black text-ink-950">{title}</h2>

      {description && (
        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {description}
        </p>
      )}
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AnalyticsFulfilment = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const [completionTimes, setCompletionTimes] = useState([]);
  const [stuckItems, setStuckItems] = useState([]);
  const [categorySuccessRates, setCategorySuccessRates] = useState([]);
  const [completionTrends, setCompletionTrends] = useState([]);

  const [summary, setSummary] = useState({
    totalCompleted: 0,
    avgDaysToComplete: 0,
    stuckPendingItems: 0,
  });

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchFulfilment = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getFulfilmentAnalytics(range);
      const data = response?.data?.data || response?.data || {};

      setCompletionTimes(data.completionTimes || []);
      setStuckItems(data.stuckItems || []);
      setCategorySuccessRates(data.categorySuccessRates || []);
      setCompletionTrends(data.completionTrends || []);

      setSummary({
        totalCompleted: data.summary?.totalCompleted || 0,
        avgDaysToComplete: data.summary?.avgDaysToComplete || 0,
        stuckPendingItems: data.summary?.stuckPendingItems || 0,
      });
    } catch (error) {
      console.error('Fulfilment error:', error);
      toast.error('Failed to load fulfilment analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchFulfilment();
  }, [fetchFulfilment]);

  /* ============================================================
     DERIVED DATA
  ============================================================ */

  const quantityFillRate = useMemo(() => {
    if (!completionTimes.length) {
      return { rate: 0, filled: 0, total: 0 };
    }

    const total = completionTimes.length;

    const filled = completionTimes.filter(
      (item) => Number(item.applicationsCount || 0) > 0
    ).length;

    return {
      rate: Number(((filled / total) * 100).toFixed(1)),
      filled,
      total,
    };
  }, [completionTimes]);

  const dropOffAfterAcceptance = useMemo(() => {
    const accepted = completionTimes.length;
    const completed = Math.min(summary.totalCompleted || 0, accepted);
    const dropOff = Math.max(accepted - completed, 0);
    const dropOffRate =
      accepted > 0
        ? Number(((dropOff / accepted) * 100).toFixed(1))
        : 0;

    return { accepted, completed, dropOff, dropOffRate };
  }, [completionTimes, summary.totalCompleted]);

  const timelineData = useMemo(() => {
    const accepted = completionTimes.length;

    const donorMarked = completionTimes.filter(
      (item) => Number(item.daysToComplete || 0) > 0
    ).length;

    const completed = Math.min(summary.totalCompleted || 0, accepted);

    const avgCompletion =
      completionTimes.length > 0
        ? completionTimes.reduce(
            (sum, item) => sum + Number(item.daysToComplete || 0),
            0
          ) / completionTimes.length
        : 0;

    return {
      stages: [
        {
          label: 'Accepted',
          value: accepted,
          icon: CheckCircle2,
          isCompleted: accepted > 0,
          isActive: false,
          color: 'text-success-600',
          avgDays: 0,
        },
        {
          label: 'Donor Marked Given',
          value: donorMarked,
          icon: PackageCheck,
          isCompleted: donorMarked > 0 && donorMarked >= accepted,
          isActive: donorMarked > 0 && donorMarked < accepted,
          color: 'text-warning-600',
          avgDays: Math.round(avgCompletion * 0.4),
        },
        {
          label: 'Winner Confirmed',
          value: completed,
          icon: Trophy,
          isCompleted: completed > 0 && completed >= donorMarked,
          isActive: completed > 0 && completed < donorMarked,
          color: 'text-success-600',
          avgDays: Math.round(avgCompletion * 0.6),
        },
      ],

      totalAvgDays: Number(summary.avgDaysToComplete || 0),
    };
  }, [completionTimes, summary]);

  const chartData = useMemo(
    () =>
      completionTrends.map((point) => ({
        ...point,
        dateLabel: point.date?.slice(5) || point.date,
        fullDate: point.date,
      })),
    [completionTrends]
  );

  /* ============================================================
     HELPERS
  ============================================================ */

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) return <FulfilmentSkeleton />;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Boxes size={14} />
                <span>Fulfilment analytics</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Fulfilment Analytics
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Acceptance to receipt</span>
                <span className="text-ink-300">·</span>
                <span>Track the journey from accepted donation to receipt</span>
              </p>
            </div>

            {/* RANGE */}
            <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
              {RANGES.map((item) => {
                const active = range === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRange(item.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                      active
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <span className="sm:hidden">{item.value}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickStat
            label="Total Completed"
            value={summary.totalCompleted}
            icon={Trophy}
            subtext="successful donations"
            tone="primary"
          />

          <QuickStat
            label="Avg Completion"
            value={`${summary.avgDaysToComplete}d`}
            icon={Clock3}
            subtext="accept → receipt"
            tone="ink"
          />

          <QuickStat
            label="Stuck Items"
            value={summary.stuckPendingItems}
            icon={Hourglass}
            subtext="pending over 14 days"
            tone={summary.stuckPendingItems > 0 ? 'warning' : 'ink'}
          />

          <QuickStat
            label="Drop-off Rate"
            value={`${dropOffAfterAcceptance.dropOffRate}%`}
            icon={TrendingDown}
            subtext={`${dropOffAfterAcceptance.dropOff} lost after acceptance`}
            tone={dropOffAfterAcceptance.dropOffRate > 30 ? 'danger' : 'ink'}
          />
        </section>

        {/* =====================================================
            TABS
        ===================================================== */}

        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all sm:text-sm ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.3} />

                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>

                  {tab.key === 'stuck' && summary.stuckPendingItems > 0 && (
                    <span
                      className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-black ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'border border-danger-200 bg-danger-50 text-danger-700'
                      }`}
                    >
                      {summary.stuckPendingItems}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <AnimatePresence mode="wait">
          {/* ===================================================
              OVERVIEW
          =================================================== */}

          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* COMPLETION CHART */}
              <Surface className="p-5">
                <SectionHeader
                  icon={BarChart3}
                  title="Completions over time"
                  description={`Successful donations during the selected ${range} period`}
                />

                {completionTrends.length > 0 ? (
                  <div className="mt-5 h-[260px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />

                        <XAxis
                          dataKey="dateLabel"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                          interval="preserveStartEnd"
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        />

                        <Tooltip
                          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          labelFormatter={(label, payload) =>
                            payload?.[0]?.payload?.fullDate || label
                          }
                        />

                        <Bar
                          dataKey="completed"
                          name="Completed"
                          fill="#6366f1"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No completion data yet"
                    description="Completed donations will appear here once there is activity."
                  />
                )}
              </Surface>

              {/* QUANTITY + DROP-OFF */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* QUANTITY */}
                <Surface className="p-5">
                  <SectionHeader
                    icon={Boxes}
                    title="Quantity fill rate"
                    description="How often accepted items fulfil the requested quantity"
                  />

                  <div className="mt-6 flex flex-col items-center">
                    <div className="relative h-36 w-36">
                      <svg
                        className="h-36 w-36 -rotate-90"
                        viewBox="0 0 120 120"
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="11"
                        />

                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="11"
                          strokeLinecap="round"
                          strokeDasharray={`${quantityFillRate.rate * 3.1416} 314.16`}
                          className="transition-all duration-1000"
                        />
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black tracking-tight text-primary-600">
                          {quantityFillRate.rate}%
                        </span>

                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-400">
                          filled
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-center text-sm font-medium text-ink-500">
                      <strong className="font-black text-ink-950">
                        {quantityFillRate.filled}
                      </strong>{' '}
                      of{' '}
                      <strong className="font-black text-ink-950">
                        {quantityFillRate.total}
                      </strong>{' '}
                      items filled all quantities
                    </p>
                  </div>
                </Surface>

                {/* DROP-OFF */}
                <Surface className="p-5">
                  <SectionHeader
                    icon={TrendingDown}
                    title="Drop-off after acceptance"
                    description="Where accepted donations fail to reach completion"
                  />

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-success-200 bg-success-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-100 text-success-600">
                          <Users size={15} />
                        </div>

                        <span className="text-sm font-extrabold text-ink-700">
                          Accepted
                        </span>
                      </div>

                      <span className="text-lg font-black text-success-600">
                        {dropOffAfterAcceptance.accepted}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-1 text-xs font-extrabold text-danger-500">
                      <ArrowDown size={15} />

                      <span>{dropOffAfterAcceptance.dropOff} lost</span>

                      <span className="rounded-full bg-danger-50 px-1.5 py-0.5">
                        {dropOffAfterAcceptance.dropOffRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-200 text-ink-600">
                          <CircleCheck size={15} />
                        </div>

                        <span className="text-sm font-extrabold text-ink-700">
                          Completed
                        </span>
                      </div>

                      <span className="text-lg font-black text-ink-950">
                        {dropOffAfterAcceptance.completed}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          Completion retention
                        </span>

                        <span className="text-xs font-black text-primary-600">
                          {Math.max(
                            100 - dropOffAfterAcceptance.dropOffRate,
                            0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-primary-500 transition-all duration-700"
                          style={{
                            width: `${Math.max(
                              100 - dropOffAfterAcceptance.dropOffRate,
                              0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Surface>
              </div>

              {/* RECENT COMPLETIONS */}
              <Surface className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                  <SectionHeader
                    icon={CircleCheck}
                    title="Recent completions"
                    description="Latest successfully fulfilled donations"
                  />
                </div>

                {completionTimes.length > 0 ? (
                  <div className="divide-y divide-ink-100">
                    {completionTimes.slice(0, 5).map((item, index) => (
                      <div
                        key={item.itemId || index}
                        className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-[10px] font-extrabold text-ink-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink-950">
                            {item.title || 'Untitled item'}
                          </p>

                          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-ink-400">
                            <span>
                              {item.applicationsCount || 0} application
                              {(item.applicationsCount || 0) !== 1 ? 's' : ''}
                            </span>

                            {item.completedAt && (
                              <>
                                <span>·</span>
                                <span>{formatDate(item.completedAt)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-success-600">
                            {item.daysToComplete || 0}d
                          </p>

                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                            to complete
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CircleCheck}
                    title="No completed donations yet"
                  />
                )}
              </Surface>
            </motion.div>
          )}

          {/* ===================================================
              TIMELINE
          =================================================== */}

          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* OVERALL */}
              <Surface className="relative overflow-hidden p-6 text-center">
                <div className="relative">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Clock3 size={20} />
                  </div>

                  <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                    Average fulfilment time
                  </p>

                  <p className="mt-1 text-5xl font-black tracking-tight text-primary-600 sm:text-6xl">
                    {timelineData.totalAvgDays}d
                  </p>

                  <p className="mt-2 text-[11px] font-bold text-ink-400">
                    Acceptance → receipt confirmation
                  </p>
                </div>
              </Surface>

              {/* STAGES */}
              <Surface className="p-5">
                <SectionHeader
                  icon={Hourglass}
                  title="Fulfilment journey"
                  description="How donations progress through each stage"
                />

                <div className="mt-6">
                  {timelineData.stages.map((stage, index) => (
                    <div key={stage.label}>
                      <TimelineStep {...stage} />

                      {index < timelineData.stages.length - 1 && (
                        <div className="flex items-center justify-center py-2.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-ink-400">
                            <div className="h-6 w-px bg-ink-200" />
                            <ArrowDown size={13} />
                            <span>~{stage.avgDays || '?'}d</span>
                            <div className="h-6 w-px bg-ink-200" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Surface>

              {/* DISTRIBUTION */}
              {completionTimes.length > 0 && (
                <Surface className="p-5">
                  <SectionHeader
                    icon={BarChart3}
                    title="Completion time distribution"
                    description="How long successful donations take to complete"
                  />

                  <div className="mt-6 space-y-4">
                    {[
                      {
                        label: 'Same day',
                        count: completionTimes.filter(
                          (item) => Number(item.daysToComplete || 0) <= 1
                        ).length,
                      },
                      {
                        label: '2–3 days',
                        count: completionTimes.filter((item) => {
                          const days = Number(item.daysToComplete || 0);
                          return days >= 2 && days <= 3;
                        }).length,
                      },
                      {
                        label: '4–7 days',
                        count: completionTimes.filter((item) => {
                          const days = Number(item.daysToComplete || 0);
                          return days >= 4 && days <= 7;
                        }).length,
                      },
                      {
                        label: '1–2 weeks',
                        count: completionTimes.filter((item) => {
                          const days = Number(item.daysToComplete || 0);
                          return days >= 8 && days <= 14;
                        }).length,
                      },
                      {
                        label: '2–4 weeks',
                        count: completionTimes.filter((item) => {
                          const days = Number(item.daysToComplete || 0);
                          return days >= 15 && days <= 28;
                        }).length,
                      },
                      {
                        label: '1+ month',
                        count: completionTimes.filter(
                          (item) => Number(item.daysToComplete || 0) >= 29
                        ).length,
                      },
                    ].map((bucket) => {
                      const pct = completionTimes.length
                        ? (bucket.count / completionTimes.length) * 100
                        : 0;

                      return (
                        <div key={bucket.label}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-ink-600">
                              {bucket.label}
                            </span>

                            <span className="text-xs font-black text-ink-950">
                              {bucket.count}{' '}
                              <span className="font-bold text-ink-400">
                                ({pct.toFixed(0)}%)
                              </span>
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.max(
                                  pct,
                                  bucket.count ? 2 : 0
                                )}%`,
                              }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full bg-primary-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Surface>
              )}
            </motion.div>
          )}

          {/* ===================================================
              STUCK
          =================================================== */}

          {activeTab === 'stuck' && (
            <motion.div
              key="stuck"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Surface className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                  <SectionHeader
                    icon={CircleAlert}
                    title="Stuck items"
                    description="Donations pending for more than 14 days"
                    action={
                      summary.stuckPendingItems > 0 ? (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[10px] font-extrabold text-warning-700">
                          <Hourglass size={11} />
                          Needs attention
                        </span>
                      ) : null
                    }
                  />
                </div>

                {stuckItems.length === 0 ? (
                  <EmptyState
                    icon={CircleCheck}
                    title="No stuck items"
                    description="Everything is moving along normally."
                  />
                ) : (
                  <div className="divide-y divide-ink-100">
                    {stuckItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-[10px] font-extrabold text-ink-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
                          <Box size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink-950">
                            {item.title || 'Untitled item'}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                            {item.category || 'Uncategorised'}
                            {' · '}
                            {item.donor?.full_name || 'Anonymous'}
                            {' · '}
                            {item.applications_count || 0} apps
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-danger-600">
                            {getDaysStuck(item.created_at)}d
                          </p>

                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                            stuck
                          </p>
                        </div>

                        <Link
                          to={`/item/${item.id}`}
                          aria-label={`View ${item.title || 'item'}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 opacity-60 transition hover:bg-primary-50 hover:text-primary-600 group-hover:opacity-100"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </Surface>
            </motion.div>
          )}

          {/* ===================================================
              CATEGORIES
          =================================================== */}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {categorySuccessRates.length === 0 ? (
                <Surface>
                  <EmptyState
                    icon={PieChart}
                    title="No category data available"
                    description="Category performance will appear here once there is enough fulfilment activity."
                  />
                </Surface>
              ) : (
                categorySuccessRates.map((cat, index) => {
                  const rate = Math.min(
                    Math.max(Number(cat.successRate || 0), 0),
                    100
                  );

                  const strong = rate >= 70;
                  const medium = rate >= 40 && rate < 70;

                  return (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Surface className="p-5 transition hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                              <Boxes size={17} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-extrabold text-ink-950">
                                {cat.category}
                              </h3>

                              <p className="mt-0.5 text-[11px] font-bold text-ink-400">
                                {cat.total || 0} total donation
                                {(cat.total || 0) !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                              strong
                                ? 'border-success-200 bg-success-50 text-success-700'
                                : medium
                                ? 'border-warning-200 bg-warning-50 text-warning-700'
                                : 'border-danger-200 bg-danger-50 text-danger-700'
                            }`}
                          >
                            {strong ? (
                              <TrendingUp size={11} />
                            ) : (
                              <TrendingDown size={11} />
                            )}
                            {rate.toFixed(1)}% success
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                              Total
                            </p>

                            <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
                              {(cat.total || 0).toLocaleString()}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-success-200 bg-success-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-success-700">
                              Completed
                            </p>

                            <p className="mt-0.5 text-lg font-black tracking-tight text-success-600">
                              {(cat.completed || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                              Success rate
                            </span>

                            <span className="text-[10px] font-black text-ink-600">
                              {rate.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.max(rate, rate > 0 ? 2 : 0)}%`,
                              }}
                              transition={{ duration: 0.6 }}
                              className={`h-full rounded-full ${
                                strong
                                  ? 'bg-success-500'
                                  : medium
                                  ? 'bg-warning-500'
                                  : 'bg-danger-500'
                              }`}
                            />
                          </div>
                        </div>
                      </Surface>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ============================================================
   HELPERS
============================================================ */

const getDaysStuck = (createdAt) => {
  if (!createdAt) return 0;

  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
  );
};

export default AnalyticsFulfilment;