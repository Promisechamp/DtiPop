// src/admin/AnalyticsUserInsights.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Gift,
  Grid2X2,
  Info,
  PieChart as PieChartIcon,
  Send,
  Trophy,
  User,
  UserRoundCheck,
  Users,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import { adminAPI } from '@/services/api/dtiApi';
import AdminUserStats from '../Users-stats';
import {
  ColumnStepper,
  ViewToggle,
  useResponsiveGrid,
} from '@/reusables/FilterBar';

/* ============================================================
   SKELETON
============================================================ */

const UserInsightsSkeleton = () => (
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
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-52 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
              </div>
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-ink-100" />
              <div className="mt-1.5 h-2.5 w-24 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 flex-1 animate-pulse rounded-xl bg-ink-100"
              />
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-5 h-5 w-36 animate-pulse rounded bg-ink-200" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-ink-100" />
                  <div className="flex-1">
                    <div className="mb-1.5 h-3.5 w-3/4 animate-pulse rounded bg-ink-100" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-ink-100" />
                  </div>
                  <div className="h-4 w-12 animate-pulse rounded bg-ink-100" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   USER AVATAR
============================================================ */

const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClass =
    size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 19 : 17;

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-ink-100 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400`}
    >
      <User size={iconSize} strokeWidth={2} />
    </div>
  );
};

/* ============================================================
   USER ACTIONS
============================================================ */

const UserActions = ({ user, statsTab, openStatsModal }) => (
  <div className="flex items-center justify-center gap-1">
    <Link
      to={`/admin/users-profile/${user?.id || ''}`}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
      title="View user profile"
      aria-label="View user profile"
    >
      <UserRoundCheck size={15} />
    </Link>

    <button
      type="button"
      onClick={() => openStatsModal(user.id, statsTab)}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
      title="View user statistics"
      aria-label="View user statistics"
    >
      <BarChart3 size={15} />
    </button>
  </div>
);

/* ============================================================
   SAFE GET / FORMAT HELPERS
============================================================ */

const safeGet = (obj, path) => {
  if (!obj || !path) return null;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return null;
    }
    current = current[part];
  }

  return current;
};

const formatValue = (val) => {
  if (val === null || val === undefined) return '0';
  const num = Number(val);
  return Number.isNaN(num) ? '0' : num.toLocaleString();
};

/* ============================================================
   USER ROW — TABLE
============================================================ */

const UserRowTable = ({ user, rank, columns, statsTab, openStatsModal }) => {
  return (
    <tr className="transition hover:bg-ink-50/60">
      <td className="px-5 py-3.5 text-xs font-black text-ink-400">{rank}</td>

      <td className="px-5 py-3.5">
        <div className="flex min-w-[190px] items-center gap-3">
          <UserAvatar user={user} size="sm" />

          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink-950">
              {user?.full_name || 'Anonymous'}
            </p>

            <p className="truncate text-[11px] font-bold text-ink-400">
              {user?.location?.country || 'Unknown location'}
            </p>
          </div>
        </div>
      </td>

      {columns.map((col, idx) => (
        <td key={idx} className="whitespace-nowrap px-5 py-3.5 text-right">
          <span className={`text-sm font-extrabold ${col.color || 'text-ink-950'}`}>
            {col.format
              ? col.format(user)
              : formatValue(safeGet(user, col.key))}
          </span>
        </td>
      ))}

      <td className="px-5 py-3.5 text-center">
        <UserActions
          user={user}
          statsTab={statsTab}
          openStatsModal={openStatsModal}
        />
      </td>
    </tr>
  );
};

/* ============================================================
   USER ROW — CARD
============================================================ */

const UserRowCard = ({ user, rank, columns, statsTab, openStatsModal }) => {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-[11px] font-black text-ink-400">
            #{rank}
          </span>

          <UserAvatar user={user} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink-950">
              {user?.full_name || 'Anonymous'}
            </p>

            <p className="truncate text-[11px] font-bold text-ink-400">
              {user?.location?.country || 'Unknown location'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-ink-100 pt-3">
          {columns.map((col, idx) => (
            <div key={idx}>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
                {col.label}
              </p>

              <p className={`mt-0.5 text-sm font-extrabold ${col.color || 'text-ink-950'}`}>
                {col.format
                  ? col.format(user)
                  : formatValue(safeGet(user, col.key))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
        <div className="flex items-center gap-1">
          <Link
            to={`/admin/users-profile/${user?.id || ''}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
            title="View user profile"
          >
            <UserRoundCheck size={15} />
          </Link>

          <button
            type="button"
            onClick={() => openStatsModal(user.id, statsTab)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
            title="View user statistics"
          >
            <BarChart3 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   QUICK STAT (matches AdminUsers StatCard)
============================================================ */

function QuickStat({ label, value, icon: Icon, subtext, tone = 'ink' }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
    brand: { color: 'text-brand-600', bg: 'bg-brand-50' },
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

      <p className={`mt-2 text-2xl font-black tracking-tight ${style.color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

const EmptyState = ({
  icon: Icon = Users,
  title = 'No data available',
  description = 'There is nothing to display for this period.',
}) => (
  <div className="flex min-h-[300px] items-center justify-center px-6 py-12">
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
        <Icon size={27} />
      </div>

      <h2 className="mt-5 text-lg font-black text-ink-950">{title}</h2>

      <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
        {description}
      </p>
    </div>
  </div>
);

/* ============================================================
   SECTION HEADER
============================================================ */

const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 p-5 sm:flex-row sm:items-center">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon size={15} />
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
   SUMMARY ROW
============================================================ */

function SummaryRow({ label, value, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: { bg: 'bg-primary-50', border: 'border-primary-200', icon: 'text-primary-600', value: 'text-ink-950' },
    success: { bg: 'bg-success-50', border: 'border-success-200', icon: 'text-success-600', value: 'text-success-600' },
    danger: { bg: 'bg-danger-50', border: 'border-danger-200', icon: 'text-danger-600', value: 'text-danger-600' },
    warning: { bg: 'bg-warning-50', border: 'border-warning-200', icon: 'text-warning-600', value: 'text-warning-600' },
  };

  const style = tones[tone] || tones.primary;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border p-3 ${style.bg} ${style.border}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={15} className={`shrink-0 ${style.icon}`} />

        <span className="truncate text-sm font-extrabold text-ink-700">
          {label}
        </span>
      </div>

      <span className={`shrink-0 text-lg font-black tracking-tight ${style.value}`}>
        {Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AnalyticsUserInsights = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  /* Data */
  const [topDonors, setTopDonors] = useState([]);
  const [topApplicants, setTopApplicants] = useState([]);
  const [repeatWinners, setRepeatWinners] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);

  const [summary, setSummary] = useState({
    activeDonors: 0,
    activeApplicants: 0,
    bannedUsers: 0,
    verifiedUsers: 0,
  });

  /* UI */
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('table');

  const { gridCols, setGridCols, gridStyle } = useResponsiveGrid({
    min: 1,
    max: 4,
  });

  /* Stats modal */
  const [statsModal, setStatsModal] = useState({
    isOpen: false,
    userId: null,
    defaultTab: 'analytics',
  });

  const openStatsModal = useCallback((userId, tab = 'analytics') => {
    setStatsModal({ isOpen: true, userId, defaultTab: tab });
  }, []);

  const closeStatsModal = useCallback(() => {
    setStatsModal({ isOpen: false, userId: null, defaultTab: 'analytics' });
  }, []);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchUserInsights = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getUserInsights(range);
      const data = response?.data?.data || response?.data || {};

      setTopDonors(data.topDonors || []);
      setTopApplicants(data.topApplicants || []);
      setRepeatWinners(data.repeatWinners || []);
      setUserGrowth(data.userGrowth || []);

      setSummary(
        data.summary || {
          activeDonors: 0,
          activeApplicants: 0,
          bannedUsers: 0,
          verifiedUsers: 0,
        }
      );
    } catch (error) {
      console.error('User insights error:', error);
      toast.error('Failed to load user insights');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchUserInsights();
  }, [fetchUserInsights]);

  /* ============================================================
     DERIVED
  ============================================================ */

  const highRejectionUsers = useMemo(() => {
    return (topApplicants || [])
      .filter((user) => {
        const total =
          (user.accepted_count || 0) + (user.rejected_count || 0);
        if (total === 0) return false;
        const rejectionRate = ((user.rejected_count || 0) / total) * 100;
        return rejectionRate > 50;
      })
      .map((user) => {
        const total =
          (user.accepted_count || 0) + (user.rejected_count || 0);
        return {
          ...user,
          rejectionRate:
            total > 0
              ? (((user.rejected_count || 0) / total) * 100).toFixed(1)
              : 0,
        };
      })
      .sort(
        (a, b) =>
          parseFloat(b.rejectionRate) - parseFloat(a.rejectionRate)
      )
      .slice(0, 10);
  }, [topApplicants]);

  const newVsReturningData = useMemo(() => {
    if (!userGrowth.length) return [];

    const totalNew = userGrowth.reduce(
      (sum, d) => sum + (d.newUsers || 0),
      0
    );

    const totalUsers =
      (summary.activeDonors || 0) + (summary.activeApplicants || 0);

    const returning = Math.max(0, totalUsers - totalNew);

    return [
      { name: 'New Users', value: totalNew, color: '#6366f1' },
      { name: 'Returning Users', value: returning, color: '#8b5cf6' },
    ];
  }, [userGrowth, summary]);

  const chartData = useMemo(
    () =>
      userGrowth.map((point) => ({
        ...point,
        dateLabel: point.date?.slice(5) || point.date,
        fullDate: point.date,
      })),
    [userGrowth]
  );

  const listTabs = ['donors', 'applicants', 'winners', 'rejection'];
  const showViewToggle = listTabs.includes(activeTab);

  /* ============================================================
     COLUMN DEFINITIONS
  ============================================================ */

  const getColumns = useCallback((tab) => {
    switch (tab) {
      case 'donors':
        return [
          { key: 'items_given_count', label: 'Items Given', color: 'text-primary-600' },
          { key: 'rating', label: 'Rating', color: 'text-warning-600' },
        ];
      case 'applicants':
        return [
          { key: 'total_applications', label: 'Total Apps', color: 'text-primary-600' },
          { key: 'accepted_count', label: 'Accepted', color: 'text-success-600' },
        ];
      case 'winners':
        return [
          { key: 'wins_count', label: 'Items Won', color: 'text-warning-600' },
        ];
      case 'rejection':
        return [
          {
            key: 'rejectionRate',
            label: 'Rejection Rate',
            color: 'text-danger-600',
            format: (user) => `${user.rejectionRate || 0}%`,
          },
          { key: 'total_applications', label: 'Total Apps', color: 'text-ink-600' },
        ];
      default:
        return [];
    }
  }, []);

  const getStatsTab = useCallback((tab) => {
    switch (tab) {
      case 'donors':
        return 'items';
      case 'applicants':
        return 'applications';
      case 'winners':
        return 'wins';
      case 'rejection':
      default:
        return 'analytics';
    }
  }, []);

  /* ============================================================
     LIST RENDERER
  ============================================================ */

  const renderList = useCallback(
    (data, tab) => {
      const columns = getColumns(tab);
      const statsTab = getStatsTab(tab);

      if (!data?.length) {
        return (
          <EmptyState
            icon={tab === 'rejection' ? AlertTriangle : Users}
          />
        );
      }

      if (viewMode === 'table') {
        return (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  <th className="w-8 px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                    #
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                    User
                  </th>

                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400"
                    >
                      {col.label}
                    </th>
                  ))}

                  <th className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-100">
                {data.map((user, index) => (
                  <UserRowTable
                    key={user.id}
                    user={user}
                    rank={index + 1}
                    columns={columns}
                    statsTab={statsTab}
                    openStatsModal={openStatsModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      return (
        <motion.div
          className="grid gap-4 p-4"
          animate={gridStyle}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {data.map((user, index) => (
            <motion.div
              key={user.id}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <UserRowCard
                user={user}
                rank={index + 1}
                columns={columns}
                statsTab={statsTab}
                openStatsModal={openStatsModal}
              />
            </motion.div>
          ))}
        </motion.div>
      );
    },
    [getColumns, getStatsTab, viewMode, gridStyle, openStatsModal]
  );

  const renderOverviewRow = (user, rank, tab, columns) => (
    <UserRowTable
      key={user.id}
      user={user}
      rank={rank}
      columns={columns}
      statsTab={getStatsTab(tab)}
      openStatsModal={openStatsModal}
    />
  );

  /* ============================================================
     TABS
  ============================================================ */

  const tabs = [
    { key: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Grid2X2 },
    { key: 'donors', label: 'Top Donors', shortLabel: 'Donors', icon: Gift },
    { key: 'applicants', label: 'Top Applicants', shortLabel: 'Applicants', icon: Send },
    { key: 'winners', label: 'Repeat Winners', shortLabel: 'Winners', icon: Trophy },
    { key: 'rejection', label: 'High Rejection', shortLabel: 'Rejection', icon: AlertTriangle },
  ];

  const RANGES = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
  ];

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) return <UserInsightsSkeleton />;

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
                <Users size={14} />
                <span>Analytics · User insights</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                User Insights
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Donor and applicant behaviour</span>
                <span className="text-ink-300">·</span>
                <span>Top contributors, repeat winners, rejection patterns</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {showViewToggle && (
                <>
                  <ViewToggle value={viewMode} onChange={setViewMode} />

                  {viewMode === 'cards' && (
                    <ColumnStepper
                      label="Columns"
                      value={gridCols}
                      onChange={setGridCols}
                      min={1}
                      max={4}
                    />
                  )}
                </>
              )}

              <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
                {RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
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
          </div>
        </header>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickStat
            label="Active Donors"
            value={summary.activeDonors}
            icon={Gift}
            subtext="listed items"
            tone="primary"
          />

          <QuickStat
            label="Active Applicants"
            value={summary.activeApplicants}
            icon={Send}
            subtext="submitted applications"
            tone="primary"
          />

          <QuickStat
            label="Repeat Winners"
            value={repeatWinners.length}
            icon={Trophy}
            subtext="won multiple items"
            tone="warning"
          />

          <QuickStat
            label="Verified Users"
            value={summary.verifiedUsers}
            icon={UserCheck}
            subtext="email verified"
            tone="success"
          />
        </section>

        {/* TABS */}
        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.2} />

                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          {/* ====================================================
              OVERVIEW
          ==================================================== */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* User Growth */}
              {userGrowth.length > 0 && (
                <section className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <SectionHeader
                    icon={Activity}
                    title="User Growth"
                    description="New registrations over the selected period"
                  />

                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="userGrowthFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6366f1"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6366f1"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />

                        <YAxis
                          tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />

                        <Tooltip
                          cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
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

                        <Area
                          type="monotone"
                          dataKey="newUsers"
                          name="New Users"
                          stroke="#6366f1"
                          fill="url(#userGrowthFill)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* New vs Returning + Summary */}
              {newVsReturningData.length > 0 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
                    <SectionHeader
                      icon={PieChartIcon}
                      title="New vs Returning"
                      description="User activity composition"
                    />

                    <div className="p-5">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={newVsReturningData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {newVsReturningData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>

                          <Tooltip
                            formatter={(value) => Number(value).toLocaleString()}
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #e2e8f0',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          />

                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
                    <SectionHeader
                      icon={Info}
                      title="User Summary"
                      description="Current platform snapshot"
                    />

                    <div className="space-y-3 p-5">
                      <SummaryRow
                        label="Total Active Users"
                        value={
                          (summary.activeDonors || 0) +
                          (summary.activeApplicants || 0)
                        }
                        icon={Users}
                        tone="primary"
                      />

                      <SummaryRow
                        label="Verified Users"
                        value={summary.verifiedUsers}
                        icon={CheckCircle2}
                        tone="success"
                      />

                      <SummaryRow
                        label="Banned Users"
                        value={summary.bannedUsers}
                        icon={AlertTriangle}
                        tone="danger"
                      />

                      <SummaryRow
                        label="Repeat Winners"
                        value={repeatWinners.length}
                        icon={Trophy}
                        tone="warning"
                      />
                    </div>
                  </section>
                </div>
              )}

              {/* Top Donors */}
              {topDonors.length > 0 && (
                <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <SectionHeader
                    icon={Gift}
                    title="Top Donors"
                    description="Highest item contributors"
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('donors')}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                      >
                        View all
                        <ChevronRight size={12} />
                      </button>
                    }
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60">
                          <th className="w-8 px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            #
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            User
                          </th>
                          <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Items Given
                          </th>
                          <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Rating
                          </th>
                          <th className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-ink-100">
                        {topDonors.slice(0, 5).map((user, index) =>
                          renderOverviewRow(user, index + 1, 'donors', [
                            {
                              key: 'items_given_count',
                              label: 'Items Given',
                              color: 'text-primary-600',
                            },
                            {
                              key: 'rating',
                              label: 'Rating',
                              color: 'text-warning-600',
                            },
                          ])
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Top Applicants */}
              {topApplicants.length > 0 && (
                <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <SectionHeader
                    icon={Send}
                    title="Top Applicants"
                    description="Most active applicants"
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('applicants')}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                      >
                        View all
                        <ChevronRight size={12} />
                      </button>
                    }
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60">
                          <th className="w-8 px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            #
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            User
                          </th>
                          <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Total Apps
                          </th>
                          <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Accepted
                          </th>
                          <th className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-ink-100">
                        {topApplicants.slice(0, 5).map((user, index) =>
                          renderOverviewRow(user, index + 1, 'applicants', [
                            {
                              key: 'total_applications',
                              label: 'Total Apps',
                              color: 'text-primary-600',
                            },
                            {
                              key: 'accepted_count',
                              label: 'Accepted',
                              color: 'text-success-600',
                            },
                          ])
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ====================================================
              DONORS
          ==================================================== */}
          {activeTab === 'donors' && (
            <motion.div
              key="donors"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  icon={Gift}
                  title="Top Donors"
                  description={`${topDonors.length.toLocaleString()} users · Highest item contributors`}
                />

                {renderList(topDonors, 'donors')}
              </section>
            </motion.div>
          )}

          {/* ====================================================
              APPLICANTS
          ==================================================== */}
          {activeTab === 'applicants' && (
            <motion.div
              key="applicants"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  icon={Send}
                  title="Top Applicants"
                  description={`${topApplicants.length.toLocaleString()} users · Most active applicants`}
                />

                {renderList(topApplicants, 'applicants')}
              </section>
            </motion.div>
          )}

          {/* ====================================================
              WINNERS
          ==================================================== */}
          {activeTab === 'winners' && (
            <motion.div
              key="winners"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  icon={Trophy}
                  title="Repeat Winners"
                  description={`${repeatWinners.length.toLocaleString()} users · Won multiple items`}
                />

                {renderList(repeatWinners, 'winners')}
              </section>
            </motion.div>
          )}

          {/* ====================================================
              REJECTION
          ==================================================== */}
          {activeTab === 'rejection' && (
            <motion.div
              key="rejection"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  icon={AlertTriangle}
                  title="High Rejection Rates"
                  description="Users with more than 50% application rejection"
                />

                {renderList(highRejectionUsers, 'rejection')}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          USER STATS MODAL
      ============================================================ */}

      <AdminUserStats
        isOpen={statsModal.isOpen}
        userId={statsModal.userId}
        onClose={closeStatsModal}
        defaultTab={statsModal.defaultTab}
      />
    </div>
  );
};

export default AnalyticsUserInsights;