import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
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
  ChevronDown,
  Clock3,
  CircleAlert,
  CircleCheck,
  Grid2X2,
  Hourglass,
  PackageCheck,
  PieChart,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
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
import {
  PageNavigation,
  PageNavigationSkeleton,
} from '@/reusables/PageNavigation';

// ============================================================
// Constants
// ============================================================

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

// ============================================================
// Skeleton
// ============================================================

const FulfilmentSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />

    <div className="animate-pulse">
      <div className="h-3 w-32 rounded-full bg-ink-200 mb-3" />
      <div className="h-9 w-64 rounded-lg bg-ink-200 mb-2" />
      <div className="h-4 w-80 max-w-full rounded bg-ink-200" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-ink-100/80 bg-white p-4 sm:p-5"
        >
          <div className="flex justify-between mb-4">
            <div className="h-3 w-20 rounded bg-ink-200" />
            <div className="h-9 w-9 rounded-xl bg-ink-200" />
          </div>
          <div className="h-8 w-16 rounded bg-ink-200 mb-2" />
          <div className="h-3 w-28 rounded bg-ink-200" />
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-ink-100/80 bg-white p-5 sm:p-6">
      <div className="h-5 w-44 rounded bg-ink-200 mb-5" />
      <div className="h-64 rounded-xl bg-ink-100" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(2)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-ink-100/80 bg-white p-5"
        >
          <div className="h-5 w-36 rounded bg-ink-200 mb-5" />

          {[...Array(3)].map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-3 py-3"
            >
              <div className="h-9 w-9 rounded-xl bg-ink-200" />
              <div className="flex-1">
                <div className="h-3 w-3/4 rounded bg-ink-200 mb-2" />
                <div className="h-2.5 w-1/3 rounded bg-ink-200" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Reusable Surface
// ============================================================

const Surface = ({
  children,
  className = '',
}) => (
  <div
    className={`
      rounded-2xl
      border border-ink-100/80
      bg-white
      shadow-sm
      ${className}
    `}
  >
    {children}
  </div>
);

// ============================================================
// Section Header
// ============================================================

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 border border-primary-100">
        <Icon
          size={17}
          strokeWidth={2.3}
          className="text-primary-600"
        />
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-ink-900">
          {title}
        </h3>

        {description && (
          <p className="mt-0.5 text-xs font-medium text-ink-400">
            {description}
          </p>
        )}
      </div>
    </div>

    {action}
  </div>
);

// ============================================================
// Quick Stat
// ============================================================

function QuickStat({
  label,
  value,
  icon: Icon,
  subtext,
  highlight = false,
  trend,
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={`
        group relative overflow-hidden
        rounded-2xl
        border
        ${
          highlight
            ? 'border-amber-200'
            : 'border-ink-100/80'
        }
        bg-white
        p-4 sm:p-5
        shadow-sm
        transition-shadow hover:shadow-md
      `}
    >
      {highlight && (
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-amber-400/10 blur-xl" />
      )}

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
            {label}
          </p>

          <div
            className={`
              flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border
              ${
                highlight
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-primary-100 bg-primary-50 text-primary-600'
              }
            `}
          >
            <Icon size={17} strokeWidth={2.3} />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <p
            className={`
              text-2xl sm:text-3xl font-black tracking-tight
              ${
                highlight
                  ? 'text-amber-600'
                  : 'text-ink-900'
              }
            `}
          >
            {typeof value === 'number'
              ? value.toLocaleString()
              : value}
          </p>

          {trend && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
              <TrendingUp size={11} />
              {trend}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs font-medium text-ink-400">
          {subtext}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================
// Timeline Step
// ============================================================

const TimelineStep = ({
  label,
  value,
  icon: Icon,
  isActive,
  isCompleted,
  color,
}) => {
  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center gap-3 sm:gap-4
        rounded-2xl border p-4
        transition-all
        ${
          isCompleted
            ? 'border-emerald-200/70 bg-emerald-50/70'
            : isActive
              ? 'border-amber-200/70 bg-amber-50/70'
              : 'border-ink-100/80 bg-ink-50/50'
        }
      `}
    >
      <div
        className={`
          flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
          ${
            isCompleted
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
              : isActive
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-ink-200 text-ink-500'
          }
        `}
      >
        {isCompleted ? (
          <Check size={19} strokeWidth={2.8} />
        ) : (
          <Icon size={19} strokeWidth={2.3} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink-900">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-medium text-ink-400">
          {isCompleted
            ? 'Completed'
            : isActive
              ? 'In progress'
              : 'Pending'}
        </p>
      </div>

      <div className="text-right">
        <p
          className={`text-xl sm:text-2xl font-black ${color}`}
        >
          {value.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
          items
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Empty State
// ============================================================

const EmptyState = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="py-14 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100">
      <Icon
        size={24}
        strokeWidth={1.8}
        className="text-ink-400"
      />
    </div>

    <p className="text-sm font-extrabold text-ink-700">
      {title}
    </p>

    {description && (
      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-ink-400">
        {description}
      </p>
    )}
  </div>
);

// ============================================================
// Main Component
// ============================================================

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

  // ==========================================================
  // Fetch
  // ==========================================================

  const fetchFulfilment = useCallback(async () => {
    setLoading(true);

    try {
      const response =
        await adminAPI.getFulfilmentAnalytics(range);

      const data = response?.data?.data || response?.data || {};

      console.log('📊 Fulfilment data:', data);

      setCompletionTimes(data.completionTimes || []);
      setStuckItems(data.stuckItems || []);
      setCategorySuccessRates(
        data.categorySuccessRates || []
      );
      setCompletionTrends(data.completionTrends || []);

      setSummary({
        totalCompleted: data.summary?.totalCompleted || 0,
        avgDaysToComplete:
          data.summary?.avgDaysToComplete || 0,
        stuckPendingItems:
          data.summary?.stuckPendingItems || 0,
      });
    } catch (error) {
      console.error('Fulfilment error:', error);

      toast.error(
        'Failed to load fulfilment analytics'
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchFulfilment();
  }, [fetchFulfilment]);

  // ==========================================================
  // Derived data
  // ==========================================================

  const acceptedCount = completionTimes.length;

  const quantityFillRate = useMemo(() => {
    if (!completionTimes.length) {
      return {
        rate: 0,
        filled: 0,
        total: 0,
      };
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
    const completed = Math.min(
      summary.totalCompleted || 0,
      accepted
    );

    const dropOff = Math.max(
      accepted - completed,
      0
    );

    const dropOffRate =
      accepted > 0
        ? Number(((dropOff / accepted) * 100).toFixed(1))
        : 0;

    return {
      accepted,
      completed,
      dropOff,
      dropOffRate,
    };
  }, [completionTimes, summary.totalCompleted]);

  const timelineData = useMemo(() => {
    const accepted = completionTimes.length;

    const donorMarked = completionTimes.filter(
      (item) => Number(item.daysToComplete || 0) > 0
    ).length;

    const completed = Math.min(
      summary.totalCompleted || 0,
      accepted
    );

    const avgCompletion =
      completionTimes.length > 0
        ? completionTimes.reduce(
            (sum, item) =>
              sum + Number(item.daysToComplete || 0),
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
          color: 'text-emerald-600',
          avgDays: 0,
        },
        {
          label: 'Donor Marked Given',
          value: donorMarked,
          icon: PackageCheck,
          isCompleted:
            donorMarked > 0 &&
            donorMarked >= accepted,
          isActive:
            donorMarked > 0 &&
            donorMarked < accepted,
          color: 'text-amber-600',
          avgDays: Math.round(avgCompletion * 0.4),
        },
        {
          label: 'Winner Confirmed',
          value: completed,
          icon: Trophy,
          isCompleted:
            completed > 0 &&
            completed >= donorMarked,
          isActive:
            completed > 0 &&
            completed < donorMarked,
          color: 'text-emerald-700',
          avgDays: Math.round(avgCompletion * 0.6),
        },
      ],

      totalAvgDays:
        Number(summary.avgDaysToComplete || 0),
    };
  }, [completionTimes, summary]);

  const chartData = useMemo(
    () =>
      completionTrends.map((point) => ({
        ...point,
        dateLabel:
          point.date?.slice(5) || point.date,
        fullDate: point.date,
      })),
    [completionTrends]
  );

  // ==========================================================
  // Helpers
  // ==========================================================

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  if (loading) {
    return <FulfilmentSkeleton />;
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="space-y-5">
      <PageNavigation />

      {/* =====================================================
          Header
      ===================================================== */}

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />

            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Fulfilment analytics
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-[-0.035em] text-ink-900 sm:text-3xl">
            Fulfilment Analytics
          </h1>

          <p className="mt-1 max-w-xl text-sm font-medium text-ink-500">
            Track the journey from accepted donation to
            successful receipt.
          </p>
        </div>

        {/* Range */}
        <div className="inline-flex w-fit items-center rounded-xl border border-ink-100 bg-ink-50 p-1">
          {RANGES.map((item) => {
            const active = range === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`
                  rounded-lg px-3 py-1.5 text-xs font-extrabold
                  transition-all
                  ${
                    active
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-ink-500 hover:text-ink-800'
                  }
                `}
              >
                <span className="sm:hidden">
                  {item.value}
                </span>

                <span className="hidden sm:inline">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* =====================================================
          Stats
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <QuickStat
          label="Total Completed"
          value={summary.totalCompleted}
          icon={Trophy}
          subtext="successful donations"
        />

        <QuickStat
          label="Avg Completion"
          value={`${summary.avgDaysToComplete}d`}
          icon={Clock3}
          subtext="accept → receipt"
        />

        <QuickStat
          label="Stuck Items"
          value={summary.stuckPendingItems}
          icon={Hourglass}
          subtext="pending over 14 days"
          highlight={
            summary.stuckPendingItems > 0
          }
        />

        <QuickStat
          label="Drop-off Rate"
          value={`${dropOffAfterAcceptance.dropOffRate}%`}
          icon={TrendingDown}
          subtext={`${dropOffAfterAcceptance.dropOff} lost after acceptance`}
          highlight={
            dropOffAfterAcceptance.dropOffRate > 30
          }
        />
      </div>

      {/* =====================================================
          Tabs
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50/60 p-1.5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key)
                }
                className={`
                  relative flex shrink-0 items-center gap-2
                  rounded-xl px-3 py-2.5
                  text-xs sm:text-sm font-extrabold
                  transition-all
                  ${
                    active
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-ink-500 hover:bg-white/70 hover:text-ink-800'
                  }
                `}
              >
                <Icon
                  size={15}
                  strokeWidth={2.3}
                />

                <span className="hidden sm:inline">
                  {tab.label}
                </span>

                <span className="sm:hidden">
                  {tab.shortLabel}
                </span>

                {tab.key === 'stuck' &&
                  summary.stuckPendingItems > 0 && (
                    <span className="min-w-5 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-center text-[9px] font-black text-rose-600">
                      {summary.stuckPendingItems}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          Content
      ===================================================== */}

      <AnimatePresence mode="wait">
        {/* ===================================================
            Overview
        =================================================== */}

        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{
              duration: 0.2,
            }}
            className="space-y-5"
          >
            {/* Completion Chart */}

            <Surface className="p-5 sm:p-6">
              <SectionHeader
                icon={BarChart3}
                title="Completions over time"
                description={`Successful donations during the selected ${range} period`}
              />

              {completionTrends.length > 0 ? (
                <div className="mt-5 h-[260px] sm:h-[300px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 8,
                        right: 4,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="currentColor"
                        className="text-ink-100"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="dateLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 10,
                        }}
                        className="fill-ink-400"
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        tick={{
                          fontSize: 10,
                        }}
                        className="fill-ink-400"
                      />

                      <Tooltip
                        cursor={{
                          fill: 'rgba(99,102,241,0.05)',
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          background: '#ffffff',
                          fontSize: 12,
                          boxShadow:
                            '0 8px 24px rgba(0,0,0,0.08)',
                        }}
                        labelFormatter={(
                          label,
                          payload
                        ) =>
                          payload?.[0]?.payload
                            ?.fullDate || label
                        }
                      />

                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#6366f1"
                        radius={[
                          5,
                          5,
                          0,
                          0,
                        ]}
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

            {/* Quantity + Drop-off */}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Quantity */}

              <Surface className="p-5 sm:p-6">
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
                        stroke="currentColor"
                        strokeWidth="11"
                        className="text-ink-100"
                      />

                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="11"
                        strokeLinecap="round"
                        strokeDasharray={`${quantityFillRate.rate * 3.1416} 314.16`}
                        className="text-primary-500 transition-all duration-1000"
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
                    <strong className="font-black text-ink-900">
                      {quantityFillRate.filled}
                    </strong>{' '}
                    of{' '}
                    <strong className="font-black text-ink-900">
                      {quantityFillRate.total}
                    </strong>{' '}
                    items filled all quantities
                  </p>
                </div>
              </Surface>

              {/* Drop-off */}

              <Surface className="p-5 sm:p-6">
                <SectionHeader
                  icon={TrendingDown}
                  title="Drop-off after acceptance"
                  description="Where accepted donations fail to reach completion"
                />

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <Users size={15} />
                      </div>

                      <span className="text-sm font-bold text-ink-700">
                        Accepted
                      </span>
                    </div>

                    <span className="text-lg font-black text-emerald-600">
                      {dropOffAfterAcceptance.accepted}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-rose-500">
                    <ArrowDown size={15} />

                    <span>
                      {dropOffAfterAcceptance.dropOff}{' '}
                      lost
                    </span>

                    <span className="rounded-full bg-rose-50 px-1.5 py-0.5">
                      {dropOffAfterAcceptance.dropOffRate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/70 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-200 text-ink-600">
                        <CircleCheck size={15} />
                      </div>

                      <span className="text-sm font-bold text-ink-700">
                        Completed
                      </span>
                    </div>

                    <span className="text-lg font-black text-ink-900">
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
                          100 -
                            dropOffAfterAcceptance.dropOffRate,
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
                            100 -
                              dropOffAfterAcceptance.dropOffRate,
                            0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Surface>
            </div>

            {/* Recent completions */}

            <Surface className="overflow-hidden">
              <div className="border-b border-ink-100/80 p-5">
                <SectionHeader
                  icon={CircleCheck}
                  title="Recent completions"
                  description="Latest successfully fulfilled donations"
                />
              </div>

              {completionTimes.length > 0 ? (
                <div className="divide-y divide-ink-100/70">
                  {completionTimes
                    .slice(0, 5)
                    .map((item, index) => (
                      <div
                        key={
                          item.itemId || index
                        }
                        className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-primary-50/30"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[10px] font-black text-ink-400">
                          {String(
                            index + 1
                          ).padStart(2, '0')}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink-900">
                            {item.title ||
                              'Untitled item'}
                          </p>

                          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-ink-400">
                            <span>
                              {item.applicationsCount ||
                                0}{' '}
                              application
                              {(item.applicationsCount ||
                                0) !== 1
                                ? 's'
                                : ''}
                            </span>

                            {item.completedAt && (
                              <>
                                <span>·</span>
                                <span>
                                  {formatDate(
                                    item.completedAt
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">
                            {item.daysToComplete || 0}
                            d
                          </p>

                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
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
            Timeline
        =================================================== */}

        {activeTab === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{
              duration: 0.2,
            }}
            className="space-y-5"
          >
            {/* Overall */}

            <Surface className="relative overflow-hidden p-6 sm:p-8 text-center">
              <div className="absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-16 rounded-full bg-primary-500/10 blur-3xl" />

              <div className="relative">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50">
                  <Clock3
                    size={20}
                    className="text-primary-600"
                  />
                </div>

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-ink-400">
                  Average fulfilment time
                </p>

                <p className="mt-1 text-5xl font-black tracking-[-0.05em] text-primary-600 sm:text-6xl">
                  {timelineData.totalAvgDays}d
                </p>

                <p className="mt-2 text-xs font-medium text-ink-400">
                  Acceptance → receipt confirmation
                </p>
              </div>
            </Surface>

            {/* Stages */}

            <Surface className="p-5 sm:p-6">
              <SectionHeader
                icon={Hourglass}
                title="Fulfilment journey"
                description="How donations progress through each stage"
              />

              <div className="mt-6">
                {timelineData.stages.map(
                  (stage, index) => (
                    <div key={stage.label}>
                      <TimelineStep
                        {...stage}
                      />

                      {index <
                        timelineData.stages.length -
                          1 && (
                        <div className="flex items-center justify-center py-2.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-ink-400">
                            <div className="h-6 w-px bg-ink-200" />

                            <ArrowDown size={13} />

                            <span>
                              ~
                              {stage.avgDays ||
                                '?'}
                              d
                            </span>

                            <div className="h-6 w-px bg-ink-200" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </Surface>

            {/* Distribution */}

            {completionTimes.length > 0 && (
              <Surface className="p-5 sm:p-6">
                <SectionHeader
                  icon={BarChart3}
                  title="Completion time distribution"
                  description="How long successful donations take to complete"
                />

                <div className="mt-6 space-y-4">
                  {[
                    {
                      label: 'Same day',
                      count:
                        completionTimes.filter(
                          (item) =>
                            Number(
                              item.daysToComplete || 0
                            ) <= 1
                        ).length,
                    },
                    {
                      label: '2–3 days',
                      count:
                        completionTimes.filter(
                          (item) => {
                            const days =
                              Number(
                                item.daysToComplete ||
                                  0
                              );

                            return (
                              days >= 2 &&
                              days <= 3
                            );
                          }
                        ).length,
                    },
                    {
                      label: '4–7 days',
                      count:
                        completionTimes.filter(
                          (item) => {
                            const days =
                              Number(
                                item.daysToComplete ||
                                  0
                              );

                            return (
                              days >= 4 &&
                              days <= 7
                            );
                          }
                        ).length,
                    },
                    {
                      label: '1–2 weeks',
                      count:
                        completionTimes.filter(
                          (item) => {
                            const days =
                              Number(
                                item.daysToComplete ||
                                  0
                              );

                            return (
                              days >= 8 &&
                              days <= 14
                            );
                          }
                        ).length,
                    },
                    {
                      label: '2–4 weeks',
                      count:
                        completionTimes.filter(
                          (item) => {
                            const days =
                              Number(
                                item.daysToComplete ||
                                  0
                              );

                            return (
                              days >= 15 &&
                              days <= 28
                            );
                          }
                        ).length,
                    },
                    {
                      label: '1+ month',
                      count:
                        completionTimes.filter(
                          (item) =>
                            Number(
                              item.daysToComplete || 0
                            ) >= 29
                        ).length,
                    },
                  ].map((bucket) => {
                    const pct =
                      completionTimes.length
                        ? (bucket.count /
                            completionTimes.length) *
                          100
                        : 0;

                    return (
                      <div key={bucket.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-ink-600">
                            {bucket.label}
                          </span>

                          <span className="text-xs font-black text-ink-900">
                            {bucket.count}{' '}
                            <span className="font-medium text-ink-400">
                              ({pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                          <motion.div
                            initial={{
                              width: 0,
                            }}
                            animate={{
                              width: `${Math.max(
                                pct,
                                bucket.count
                                  ? 2
                                  : 0
                              )}%`,
                            }}
                            transition={{
                              duration: 0.6,
                            }}
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
            Stuck
        =================================================== */}

        {activeTab === 'stuck' && (
          <motion.div
            key="stuck"
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{
              duration: 0.2,
            }}
          >
            <Surface className="overflow-hidden">
              <div className="border-b border-ink-100/80 p-5">
                <SectionHeader
                  icon={CircleAlert}
                  title="Stuck items"
                  description="Donations pending for more than 14 days"
                  action={
                    summary.stuckPendingItems >
                      0 ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
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
                <div className="divide-y divide-ink-100/70">
                  {stuckItems.map(
                    (item, index) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-primary-50/30"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[10px] font-black text-ink-400">
                          {String(
                            index + 1
                          ).padStart(2, '0')}
                        </span>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                          <Box
                            size={16}
                            strokeWidth={2.2}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink-900">
                            {item.title ||
                              'Untitled item'}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-400">
                            {item.category ||
                              'Uncategorised'}
                            {' · '}
                            {item.donor?.full_name ||
                              'Anonymous'}
                            {' · '}
                            {item.applications_count ||
                              0}{' '}
                            apps
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-rose-500">
                            {getDaysStuck(
                              item.created_at
                            )}
                            d
                          </p>

                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                            stuck
                          </p>
                        </div>

                        <Link
                          to={`/item/${item.id}`}
                          aria-label={`View ${item.title || 'item'}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 opacity-60 transition-all hover:bg-primary-50 hover:text-primary-600 group-hover:opacity-100"
                        >
                          <ArrowUpRight
                            size={16}
                          />
                        </Link>
                      </div>
                    )
                  )}
                </div>
              )}
            </Surface>
          </motion.div>
        )}

        {/* ===================================================
            Categories
        =================================================== */}

        {activeTab === 'categories' && (
          <motion.div
            key="categories"
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{
              duration: 0.2,
            }}
            className="space-y-3"
          >
            {categorySuccessRates.length ===
            0 ? (
              <Surface>
                <EmptyState
                  icon={PieChart}
                  title="No category data available"
                  description="Category performance will appear here once there is enough fulfilment activity."
                />
              </Surface>
            ) : (
              categorySuccessRates.map(
                (cat, index) => {
                  const rate = Math.min(
                    Math.max(
                      Number(
                        cat.successRate || 0
                      ),
                      0
                    ),
                    100
                  );

                  const strong = rate >= 70;
                  const medium =
                    rate >= 40 && rate < 70;

                  return (
                    <motion.div
                      key={cat.category}
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.04,
                      }}
                    >
                      <Surface className="p-5 transition-shadow hover:shadow-md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                              <Boxes
                                size={17}
                              />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-extrabold text-ink-900">
                                {cat.category}
                              </h3>

                              <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                                {cat.total || 0}{' '}
                                total donation
                                {(cat.total || 0) !==
                                1
                                  ? 's'
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`
                              inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black
                              ${
                                strong
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : medium
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                              }
                            `}
                          >
                            {strong ? (
                              <TrendingUp
                                size={11}
                              />
                            ) : (
                              <TrendingDown
                                size={11}
                              />
                            )}

                            {rate.toFixed(1)}%
                            success
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                            <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
                              Total
                            </p>

                            <p className="mt-1 text-xl font-black text-ink-900">
                              {(
                                cat.total || 0
                              ).toLocaleString()}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3">
                            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600/70">
                              Completed
                            </p>

                            <p className="mt-1 text-xl font-black text-emerald-600">
                              {(
                                cat.completed ||
                                0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-ink-400">
                              Success rate
                            </span>

                            <span className="text-[10px] font-black text-ink-600">
                              {rate.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                            <motion.div
                              initial={{
                                width: 0,
                              }}
                              animate={{
                                width: `${Math.max(
                                  rate,
                                  rate > 0
                                    ? 2
                                    : 0
                                )}%`,
                              }}
                              transition={{
                                duration: 0.6,
                              }}
                              className={`
                                h-full rounded-full
                                ${
                                  strong
                                    ? 'bg-emerald-500'
                                    : medium
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                                }
                              `}
                            />
                          </div>
                        </div>
                      </Surface>
                    </motion.div>
                  );
                }
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Helpers
// ============================================================

const getDaysStuck = (createdAt) => {
  if (!createdAt) return 0;

  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - created.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
};

export default AnalyticsFulfilment;
