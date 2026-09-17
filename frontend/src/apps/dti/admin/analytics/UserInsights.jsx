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
  LayoutGrid,
  Minus,
  PieChart as PieChartIcon,
  Plus,
  Send,
  Table2,
  Trophy,
  User,
  UserRoundCheck,
  Users,
  UserCheck,
  X,
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
import {
  PageNavigation,
  PageNavigationSkeleton,
} from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import AdminUserStats from '../Users-stats';

// ============================================================
// Shared styles
// ============================================================

const cardClass =
  'bg-white rounded-2xl border border-ink-100/80 shadow-sm';

const iconButtonClass =
  'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

// ============================================================
// Skeleton
// ============================================================

const UserInsightsSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />

    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded-lg w-48 mb-2" />
      <div className="h-4 bg-ink-200 rounded w-40" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`${cardClass} p-4`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 bg-ink-200 rounded w-20" />
            <div className="w-9 h-9 rounded-xl bg-ink-200" />
          </div>

          <div className="h-8 bg-ink-200 rounded-lg w-16 mb-2" />
          <div className="h-3 bg-ink-200 rounded w-24" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <div
          key={i}
          className={`${cardClass} p-5`}
        >
          <div className="h-5 bg-ink-200 rounded w-36 mb-5" />

          {[...Array(5)].map((_, j) => (
            <div
              key={j}
              className="flex items-center gap-3 py-3"
            >
              <div className="w-9 h-9 rounded-full bg-ink-200 shrink-0" />

              <div className="flex-1">
                <div className="h-4 bg-ink-200 rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-ink-200 rounded w-1/3" />
              </div>

              <div className="h-5 bg-ink-200 rounded w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// User Avatar
// ============================================================

const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
        ? 'w-11 h-11'
        : 'w-9 h-9';

  const iconSize =
    size === 'sm'
      ? 15
      : size === 'lg'
        ? 19
        : 17;

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-ink-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-ink-50 border border-ink-100 flex items-center justify-center shrink-0`}
    >
      <User
        size={iconSize}
        strokeWidth={2}
        className="text-ink-400"
      />
    </div>
  );
};

// ============================================================
// User Actions
// ============================================================

const UserActions = ({
  user,
  statsTab,
  openStatsModal,
}) => (
  <div className="flex items-center justify-center gap-1">
    <Link
      to={`/admin/users-profile/${user?.id || ''}`}
      className={`${iconButtonClass} w-8 h-8 text-ink-400 hover:text-primary-600 hover:bg-primary-50`}
      title="View user profile"
      aria-label="View user profile"
    >
      <UserRoundCheck size={15} />
    </Link>

    <button
      type="button"
      onClick={() => openStatsModal(user.id, statsTab)}
      className={`${iconButtonClass} w-8 h-8 text-ink-400 hover:text-primary-600 hover:bg-primary-50`}
      title="View user statistics"
      aria-label="View user statistics"
    >
      <BarChart3 size={15} />
    </button>
  </div>
);

// ============================================================
// User Row – Table
// ============================================================

const UserRowTable = ({
  user,
  rank,
  columns,
  statsTab,
  openStatsModal,
}) => {
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

    return Number.isNaN(num)
      ? '0'
      : num.toLocaleString();
  };

  return (
    <tr className="group border-b border-ink-50 last:border-0 hover:bg-primary-50/20 transition-colors">
      <td className="px-4 py-3.5 text-xs font-black text-ink-400">
        {rank}
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-[190px]">
          <UserAvatar user={user} size="sm" />

          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink-900 truncate">
              {user?.full_name || 'Anonymous'}
            </p>

            <p className="text-xs font-medium text-ink-400 truncate">
              {user?.location || 'Unknown location'}
            </p>
          </div>
        </div>
      </td>

      {columns.map((col, idx) => (
        <td
          key={idx}
          className="px-4 py-3.5 text-right whitespace-nowrap"
        >
          <span
            className={`text-sm font-extrabold ${
              col.color || 'text-ink-900'
            }`}
          >
            {col.format
              ? col.format(user)
              : formatValue(safeGet(user, col.key))}
          </span>
        </td>
      ))}

      <td className="px-4 py-3.5 text-center">
        <UserActions
          user={user}
          statsTab={statsTab}
          openStatsModal={openStatsModal}
        />
      </td>
    </tr>
  );
};

// ============================================================
// User Row – Card
// ============================================================

const UserRowCard = ({
  user,
  rank,
  columns,
  statsTab,
  openStatsModal,
}) => {
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

    return Number.isNaN(num)
      ? '0'
      : num.toLocaleString();
  };

  return (
    <div
      className={`${cardClass} p-4 h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black text-ink-400 w-6 shrink-0">
          #{rank}
        </span>

        <UserAvatar user={user} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink-900 truncate">
            {user?.full_name || 'Anonymous'}
          </p>

          <p className="text-xs font-medium text-ink-400 truncate">
            {user?.location || 'Unknown location'}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-ink-100 flex items-end justify-between gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {columns.map((col, idx) => (
            <div key={idx}>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink-400">
                {col.label}
              </p>

              <p
                className={`mt-0.5 text-sm font-extrabold ${
                  col.color || 'text-ink-900'
                }`}
              >
                {col.format
                  ? col.format(user)
                  : formatValue(safeGet(user, col.key))}
              </p>
            </div>
          ))}
        </div>

        <UserActions
          user={user}
          statsTab={statsTab}
          openStatsModal={openStatsModal}
        />
      </div>
    </div>
  );
};

// ============================================================
// Quick Stat
// ============================================================

function QuickStat({
  label,
  value,
  icon: Icon,
  subtext,
  highlight = false,
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${cardClass} p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black text-ink-500 uppercase tracking-[0.12em]">
          {label}
        </p>

        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            highlight
              ? 'bg-amber-50 border-amber-200/70'
              : 'bg-primary-50 border-primary-100'
          }`}
        >
          <Icon
            size={17}
            strokeWidth={2.2}
            className={
              highlight
                ? 'text-amber-600'
                : 'text-primary-600'
            }
          />
        </div>
      </div>

      <p
        className={`mt-3 text-2xl font-black tracking-tight ${
          highlight
            ? 'text-amber-600'
            : 'text-ink-900'
        }`}
      >
        {typeof value === 'number'
          ? value.toLocaleString()
          : value}
      </p>

      <p className="mt-1 text-xs font-medium text-ink-400">
        {subtext}
      </p>
    </motion.div>
  );
}

// ============================================================
// View Toggle
// ============================================================

function ViewToggle({
  viewMode,
  setViewMode,
  gridCols,
  setGridCols,
  setIsCustomCols,
}) {
  return (
    <div className="flex items-center bg-ink-50 border border-ink-100 rounded-xl p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          viewMode === 'table'
            ? 'bg-white text-primary-700 shadow-sm border border-ink-100'
            : 'text-ink-500 hover:text-ink-800'
        }`}
      >
        <Table2 size={14} />
        <span>Table</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode('cards')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          viewMode === 'cards'
            ? 'bg-white text-primary-700 shadow-sm border border-ink-100'
            : 'text-ink-500 hover:text-ink-800'
        }`}
      >
        <LayoutGrid size={14} />
        <span>Cards</span>
      </button>

      {viewMode === 'cards' && (
        <>
          <div className="w-px h-5 bg-ink-200 mx-1" />

          <button
            type="button"
            onClick={() => {
              setIsCustomCols(true);
              setGridCols(
                Math.max(1, gridCols - 1)
              );
            }}
            disabled={gridCols <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:bg-white hover:text-primary-700 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Fewer columns"
            aria-label="Fewer columns"
          >
            <Minus size={13} />
          </button>

          <span className="w-5 text-center text-xs font-black text-ink-700">
            {gridCols}
          </span>

          <button
            type="button"
            onClick={() => {
              setIsCustomCols(true);
              setGridCols(
                Math.min(4, gridCols + 1)
              );
            }}
            disabled={gridCols >= 4}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:bg-white hover:text-primary-700 disabled:opacity-30 disabled:pointer-events-none transition"
            title="More columns"
            aria-label="More columns"
          >
            <Plus size={13} />
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

const EmptyState = ({
  icon: Icon = Users,
  title = 'No data available',
  description = 'There is nothing to display for this period.',
}) => (
  <div className="px-5 py-14 text-center">
    <div className="mx-auto w-11 h-11 rounded-2xl bg-ink-50 border border-ink-100 flex items-center justify-center">
      <Icon
        size={19}
        className="text-ink-400"
      />
    </div>

    <p className="mt-3 text-sm font-extrabold text-ink-700">
      {title}
    </p>

    <p className="mt-1 text-xs font-medium text-ink-400 max-w-sm mx-auto">
      {description}
    </p>
  </div>
);

// ============================================================
// Section Header
// ============================================================

const SectionHeader = ({
  icon: Icon,
  title,
  count,
  children,
}) => (
  <div className="p-5 border-b border-ink-100 flex items-center justify-between flex-wrap gap-3">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
        <Icon
          size={15}
          className="text-primary-600"
        />
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-ink-800">
          {title}
        </h3>

        {count !== undefined && (
          <p className="mt-0.5 text-[11px] font-medium text-ink-400">
            {count.toLocaleString()} users
          </p>
        )}
      </div>
    </div>

    {children}
  </div>
);

// ============================================================
// Main Component
// ============================================================

const AnalyticsUserInsights = () => {
  const breakpoint = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  // Data
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

  // UI
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('table');
  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);

  // Stats modal
  const [statsModal, setStatsModal] = useState({
    isOpen: false,
    userId: null,
    defaultTab: 'analytics',
  });

  const openStatsModal = useCallback(
    (userId, tab = 'analytics') => {
      setStatsModal({
        isOpen: true,
        userId,
        defaultTab: tab,
      });
    },
    []
  );

  const closeStatsModal = useCallback(() => {
    setStatsModal({
      isOpen: false,
      userId: null,
      defaultTab: 'analytics',
    });
  }, []);

  // ==========================================================
  // Responsive columns
  // ==========================================================

  const getDefaultCols = useCallback((bp) => {
    if (bp === 'xs' || bp === 'sm') return 1;
    if (bp === 'md') return 2;
    if (bp === 'lg') return 3;
    if (bp === 'xl' || bp === '2xl') return 4;

    return 2;
  }, []);

  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [
    breakpoint,
    isCustomCols,
    getDefaultCols,
  ]);

  // ==========================================================
  // Fetch
  // ==========================================================

  const fetchUserInsights = useCallback(
    async () => {
      setLoading(true);

      try {
        const response =
          await adminAPI.getUserInsights(range);

        const data =
          response?.data?.data ||
          response?.data ||
          {};

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
        console.error(
          'User insights error:',
          error
        );

        toast.error(
          'Failed to load user insights'
        );
      } finally {
        setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    fetchUserInsights();
  }, [fetchUserInsights]);

  // ==========================================================
  // Derived data
  // ==========================================================

  const highRejectionUsers = useMemo(() => {
    return (topApplicants || [])
      .filter((user) => {
        const total =
          (user.accepted_count || 0) +
          (user.rejected_count || 0);

        if (total === 0) return false;

        const rejectionRate =
          ((user.rejected_count || 0) /
            total) *
          100;

        return rejectionRate > 50;
      })
      .map((user) => {
        const total =
          (user.accepted_count || 0) +
          (user.rejected_count || 0);

        return {
          ...user,
          rejectionRate:
            total > 0
              ? (
                  ((user.rejected_count || 0) /
                    total) *
                  100
                ).toFixed(1)
              : 0,
        };
      })
      .sort(
        (a, b) =>
          parseFloat(b.rejectionRate) -
          parseFloat(a.rejectionRate)
      )
      .slice(0, 10);
  }, [topApplicants]);

  const newVsReturningData = useMemo(() => {
    if (!userGrowth.length) return [];

    const totalNew = userGrowth.reduce(
      (sum, d) =>
        sum + (d.newUsers || 0),
      0
    );

    const totalUsers =
      (summary.activeDonors || 0) +
      (summary.activeApplicants || 0);

    const returning = Math.max(
      0,
      totalUsers - totalNew
    );

    return [
      {
        name: 'New Users',
        value: totalNew,
        color: '#4f46e5',
      },
      {
        name: 'Returning Users',
        value: returning,
        color: '#a78bfa',
      },
    ];
  }, [userGrowth, summary]);

  const chartData = useMemo(
    () =>
      userGrowth.map((point) => ({
        ...point,
        dateLabel:
          point.date?.slice(5) ||
          point.date,
        fullDate: point.date,
      })),
    [userGrowth]
  );

  const listTabs = [
    'donors',
    'applicants',
    'winners',
    'rejection',
  ];

  const showViewToggle =
    listTabs.includes(activeTab);

  // ==========================================================
  // Column definitions
  // ==========================================================

  const getColumns = useCallback((tab) => {
    switch (tab) {
      case 'donors':
        return [
          {
            key: 'items_given_count',
            label: 'Items Given',
            color: 'text-primary-600',
          },
          {
            key: 'rating',
            label: 'Rating',
            color: 'text-amber-600',
          },
        ];

      case 'applicants':
        return [
          {
            key: 'total_applications',
            label: 'Total Apps',
            color: 'text-primary-600',
          },
          {
            key: 'accepted_count',
            label: 'Accepted',
            color: 'text-emerald-600',
          },
        ];

      case 'winners':
        return [
          {
            key: 'wins_count',
            label: 'Items Won',
            color: 'text-amber-600',
          },
        ];

      case 'rejection':
        return [
          {
            key: 'rejectionRate',
            label: 'Rejection Rate',
            color: 'text-rose-500',
            format: (user) =>
              `${user.rejectionRate || 0}%`,
          },
          {
            key: 'total_applications',
            label: 'Total Apps',
            color: 'text-ink-600',
          },
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

  // ==========================================================
  // List renderer
  // ==========================================================

  const renderList = useCallback(
    (data, tab) => {
      const columns = getColumns(tab);
      const statsTab = getStatsTab(tab);

      if (!data?.length) {
        return (
          <EmptyState
            icon={
              tab === 'rejection'
                ? AlertTriangle
                : Users
            }
          />
        );
      }

      if (viewMode === 'table') {
        return (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 w-8">
                    #
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                    User
                  </th>

                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400"
                    >
                      {col.label}
                    </th>
                  ))}

                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((user, index) => (
                  <UserRowTable
                    key={user.id}
                    user={user}
                    rank={index + 1}
                    columns={columns}
                    statsTab={statsTab}
                    openStatsModal={
                      openStatsModal
                    }
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
          animate={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        >
          {data.map((user, index) => (
            <motion.div
              key={user.id}
              layout
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
            >
              <UserRowCard
                user={user}
                rank={index + 1}
                columns={columns}
                statsTab={statsTab}
                openStatsModal={
                  openStatsModal
                }
              />
            </motion.div>
          ))}
        </motion.div>
      );
    },
    [
      getColumns,
      getStatsTab,
      viewMode,
      gridCols,
      openStatsModal,
    ]
  );

  // ==========================================================
  // Overview table rows
  // ==========================================================

  const renderOverviewRow = (
    user,
    rank,
    tab,
    columns
  ) => (
    <UserRowTable
      key={user.id}
      user={user}
      rank={rank}
      columns={columns}
      statsTab={getStatsTab(tab)}
      openStatsModal={openStatsModal}
    />
  );

  // ==========================================================
  // Tab config
  // ==========================================================

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      shortLabel: 'Overview',
      icon: Grid2X2,
    },
    {
      key: 'donors',
      label: 'Top Donors',
      shortLabel: 'Donors',
      icon: Gift,
    },
    {
      key: 'applicants',
      label: 'Top Applicants',
      shortLabel: 'Applicants',
      icon: Send,
    },
    {
      key: 'winners',
      label: 'Repeat Winners',
      shortLabel: 'Winners',
      icon: Trophy,
    },
    {
      key: 'rejection',
      label: 'High Rejection',
      shortLabel: 'Rejection',
      icon: AlertTriangle,
    },
  ];

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return <UserInsightsSkeleton />;
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="space-y-5">
      <PageNavigation />

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500" />

            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              User insights
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-ink-900">
            User Insights
          </h1>

          <p className="mt-1 text-sm text-ink-500">
            Donor and applicant behaviour
            analysis
          </p>
        </div>

        {/* Range */}
        <div className="flex items-center gap-1 bg-ink-50 border border-ink-100 rounded-xl p-1 shadow-sm self-start sm:self-auto">
          {['7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                range === r
                  ? 'bg-white text-primary-700 shadow-sm border border-ink-100'
                  : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {r === '7d'
                ? '7 days'
                : r === '30d'
                  ? '30 days'
                  : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================
          QUICK STATS
      ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Active Donors"
          value={summary.activeDonors}
          icon={Gift}
          subtext="listed items"
        />

        <QuickStat
          label="Active Applicants"
          value={summary.activeApplicants}
          icon={Send}
          subtext="submitted applications"
        />

        <QuickStat
          label="Repeat Winners"
          value={repeatWinners.length}
          icon={Trophy}
          subtext="won multiple items"
          highlight
        />

        <QuickStat
          label="Verified Users"
          value={summary.verifiedUsers}
          icon={UserCheck}
          subtext="email verified"
        />
      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="bg-ink-50/70 rounded-2xl border border-ink-100/80 p-1.5 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.key;

            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key)
                }
                className={`group flex items-center gap-2 flex-shrink-0 px-3 sm:px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm border border-primary-100'
                    : 'text-ink-500 hover:text-ink-800 hover:bg-white/60'
                }`}
              >
                <Icon
                  size={15}
                  strokeWidth={2.2}
                />

                <span className="hidden sm:inline">
                  {tab.label}
                </span>

                <span className="sm:hidden text-xs">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          TAB CONTENT
      ====================================================== */}

      <AnimatePresence mode="wait">
        {/* ====================================================
            OVERVIEW
        ==================================================== */}

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
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* User Growth */}
            {userGrowth.length > 0 && (
              <div
                className={`${cardClass} p-5 sm:p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity
                        size={16}
                        className="text-primary-600"
                      />

                      <h3 className="text-sm font-extrabold text-ink-800">
                        User Growth
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-ink-400">
                      New registrations over the
                      selected period
                    </p>
                  </div>
                </div>

                <ResponsiveContainer
                  width="100%"
                  height={280}
                >
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
                          stopColor="#4f46e5"
                          stopOpacity={0.2}
                        />

                        <stop
                          offset="100%"
                          stopColor="#4f46e5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="dateLabel"
                      tick={{
                        fontSize: 11,
                        fill: '#8a8f98',
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: '#8a8f98',
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip
                      cursor={{
                        stroke: '#c7c9d1',
                        strokeDasharray: '4 4',
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        boxShadow:
                          '0 8px 25px rgba(0,0,0,.08)',
                        fontSize: 12,
                      }}
                      labelFormatter={(
                        label,
                        payload
                      ) =>
                        payload?.[0]?.payload
                          ?.fullDate || label
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="newUsers"
                      name="New Users"
                      stroke="#4f46e5"
                      fill="url(#userGrowthFill)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* New vs Returning + Summary */}
            {newVsReturningData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie */}
                <div
                  className={`${cardClass} p-5 sm:p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <PieChartIcon
                      size={16}
                      className="text-primary-600"
                    />

                    <h3 className="text-sm font-extrabold text-ink-800">
                      New vs Returning
                    </h3>
                  </div>

                  <p className="text-xs text-ink-400">
                    User activity composition
                  </p>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >
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
                        {newVsReturningData.map(
                          (entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.color}
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip
                        formatter={(value) =>
                          Number(
                            value
                          ).toLocaleString()
                        }
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div
                  className={`${cardClass} p-5 sm:p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info
                      size={16}
                      className="text-primary-600"
                    />

                    <h3 className="text-sm font-extrabold text-ink-800">
                      User Summary
                    </h3>
                  </div>

                  <p className="text-xs text-ink-400 mb-5">
                    Current platform snapshot
                  </p>

                  <div className="space-y-3">
                    <SummaryRow
                      label="Total Active Users"
                      value={
                        (summary.activeDonors ||
                          0) +
                        (summary.activeApplicants ||
                          0)
                      }
                      icon={Users}
                      className="bg-primary-50 border-primary-100"
                      iconClass="text-primary-600"
                      valueClass="text-ink-900"
                    />

                    <SummaryRow
                      label="Verified Users"
                      value={
                        summary.verifiedUsers
                      }
                      icon={CheckCircle2}
                      className="bg-emerald-50 border-emerald-100"
                      iconClass="text-emerald-600"
                      valueClass="text-emerald-600"
                    />

                    <SummaryRow
                      label="Banned Users"
                      value={
                        summary.bannedUsers
                      }
                      icon={AlertTriangle}
                      className="bg-rose-50 border-rose-100"
                      iconClass="text-rose-600"
                      valueClass="text-rose-600"
                    />

                    <SummaryRow
                      label="Repeat Winners"
                      value={
                        repeatWinners.length
                      }
                      icon={Trophy}
                      className="bg-amber-50 border-amber-100"
                      iconClass="text-amber-600"
                      valueClass="text-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top Donors */}
            {topDonors.length > 0 && (
              <div className={`${cardClass} overflow-hidden`}>
                <div className="p-5 border-b border-ink-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                      <Gift
                        size={15}
                        className="text-primary-600"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-ink-800">
                        Top Donors
                      </h3>

                      <p className="text-[11px] text-ink-400">
                        Highest item contributors
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab('donors')
                    }
                    className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
                  >
                    View all
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-ink-100 bg-ink-50/40">
                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 w-8">
                          #
                        </th>

                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          User
                        </th>

                        <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Items Given
                        </th>

                        <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Rating
                        </th>

                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {topDonors
                        .slice(0, 5)
                        .map((user, index) =>
                          renderOverviewRow(
                            user,
                            index + 1,
                            'donors',
                            [
                              {
                                key: 'items_given_count',
                                label: 'Items Given',
                                color:
                                  'text-primary-600',
                              },
                              {
                                key: 'rating',
                                label: 'Rating',
                                color:
                                  'text-amber-600',
                              },
                            ]
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Applicants */}
            {topApplicants.length > 0 && (
              <div className={`${cardClass} overflow-hidden`}>
                <div className="p-5 border-b border-ink-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                      <Send
                        size={15}
                        className="text-primary-600"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-ink-800">
                        Top Applicants
                      </h3>

                      <p className="text-[11px] text-ink-400">
                        Most active applicants
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        'applicants'
                      )
                    }
                    className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
                  >
                    View all
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-ink-100 bg-ink-50/40">
                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 w-8">
                          #
                        </th>

                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          User
                        </th>

                        <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Total Apps
                        </th>

                        <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Accepted
                        </th>

                        <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {topApplicants
                        .slice(0, 5)
                        .map((user, index) =>
                          renderOverviewRow(
                            user,
                            index + 1,
                            'applicants',
                            [
                              {
                                key: 'total_applications',
                                label: 'Total Apps',
                                color:
                                  'text-primary-600',
                              },
                              {
                                key: 'accepted_count',
                                label: 'Accepted',
                                color:
                                  'text-emerald-600',
                              },
                            ]
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ====================================================
            DONORS
        ==================================================== */}

        {activeTab === 'donors' && (
          <motion.div
            key="donors"
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
            transition={{ duration: 0.2 }}
          >
            <div className={`${cardClass} overflow-hidden`}>
              <SectionHeader
                icon={Gift}
                title="Top Donors"
                count={topDonors.length}
              >
                {showViewToggle && (
                  <ViewToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    setIsCustomCols={
                      setIsCustomCols
                    }
                  />
                )}
              </SectionHeader>

              {renderList(
                topDonors,
                'donors'
              )}
            </div>
          </motion.div>
        )}

        {/* ====================================================
            APPLICANTS
        ==================================================== */}

        {activeTab === 'applicants' && (
          <motion.div
            key="applicants"
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
            transition={{ duration: 0.2 }}
          >
            <div className={`${cardClass} overflow-hidden`}>
              <SectionHeader
                icon={Send}
                title="Top Applicants"
                count={topApplicants.length}
              >
                {showViewToggle && (
                  <ViewToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    setIsCustomCols={
                      setIsCustomCols
                    }
                  />
                )}
              </SectionHeader>

              {renderList(
                topApplicants,
                'applicants'
              )}
            </div>
          </motion.div>
        )}

        {/* ====================================================
            WINNERS
        ==================================================== */}

        {activeTab === 'winners' && (
          <motion.div
            key="winners"
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
            transition={{ duration: 0.2 }}
          >
            <div className={`${cardClass} overflow-hidden`}>
              <SectionHeader
                icon={Trophy}
                title="Repeat Winners"
                count={repeatWinners.length}
              >
                {showViewToggle && (
                  <ViewToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    setIsCustomCols={
                      setIsCustomCols
                    }
                  />
                )}
              </SectionHeader>

              {renderList(
                repeatWinners,
                'winners'
              )}
            </div>
          </motion.div>
        )}

        {/* ====================================================
            REJECTION
        ==================================================== */}

        {activeTab === 'rejection' && (
          <motion.div
            key="rejection"
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
            transition={{ duration: 0.2 }}
          >
            <div className={`${cardClass} overflow-hidden`}>
              <div className="p-5 border-b border-ink-100 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <AlertTriangle
                      size={15}
                      className="text-rose-600"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-ink-800">
                      High Rejection Rates
                    </h3>

                    <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                      Users with more than 50%
                      application rejection
                    </p>
                  </div>
                </div>

                {showViewToggle && (
                  <ViewToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    setIsCustomCols={
                      setIsCustomCols
                    }
                  />
                )}
              </div>

              {renderList(
                highRejectionUsers,
                'rejection'
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================
          USER STATS MODAL
      ====================================================== */}

      <AdminUserStats
        isOpen={statsModal.isOpen}
        userId={statsModal.userId}
        onClose={closeStatsModal}
        defaultTab={statsModal.defaultTab}
      />
    </div>
  );
};

// ============================================================
// Summary Row
// ============================================================

function SummaryRow({
  label,
  value,
  icon: Icon,
  className,
  iconClass,
  valueClass,
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          size={16}
          className={`shrink-0 ${iconClass}`}
        />

        <span className="text-sm font-bold text-ink-600 truncate">
          {label}
        </span>
      </div>

      <span
        className={`text-lg font-black shrink-0 ${valueClass}`}
      >
        {Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

export default AnalyticsUserInsights;