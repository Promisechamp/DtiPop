// src/admin/AdminDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  RefreshCw,
  UserPlus,
  Users,
  Package,
  FileText,
  Trophy,
  Eye,
  Image as ImageIcon,
  User,
  ArrowRight,
  ArrowUpRight,
  Zap,
  BarChart3,
  Ticket,
  Settings as SettingsIcon,
  Code,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/services/api/dtiApi';
import {
  getCategoryByValue,
  getStatusDisplay,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

/* ============================================================================
   SKELETON
============================================================================ */

const DashboardSkeleton = () => (
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
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-32 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
              </div>
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* ACTIVITY GRID */}
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="border-b border-ink-100 p-5">
                <div className="h-4 w-40 animate-pulse rounded bg-ink-200" />
              </div>
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-ink-100" />
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded-full bg-ink-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* SECONDARY GRID */}
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="border-b border-ink-100 p-5">
                <div className="h-4 w-36 animate-pulse rounded bg-ink-200" />
              </div>
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-12 animate-pulse rounded-xl bg-ink-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================================
   STATUS HELPERS — semantic tones
============================================================================ */

const getStatusToneClasses = (color) => {
  const map = {
    green: 'border-success-200 bg-success-50 text-success-700',
    yellow: 'border-warning-200 bg-warning-50 text-warning-700',
    blue: 'border-primary-200 bg-primary-50 text-primary-700',
    red: 'border-danger-200 bg-danger-50 text-danger-700',
    gray: 'border-ink-200 bg-ink-50 text-ink-600',
  };
  return map[color] || map.gray;
};

const getStatusBadge = (status) => {
  const display = getStatusDisplay(status);
  return {
    classes: getStatusToneClasses(display?.color),
    label: display?.label || status,
  };
};

const getAppStatusBadge = (status) => {
  const display = getApplicationStatusDisplay(status);
  return {
    classes: getStatusToneClasses(display?.color),
    label: display?.label || status,
  };
};

/* ============================================================================
   HELPERS
============================================================================ */

const getTimeAgo = (date) => {
  if (!date) return '';
  const minutes = Math.floor((new Date() - new Date(date)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/* ============================================================================
   STAT CARD
============================================================================ */

function StatCard({ label, value, subtext, icon: Icon, tone = 'ink', to }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };

  const style = tones[tone] || tones.ink;

  const inner = (
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

  if (to) {
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

/* ============================================================================
   SECTION HEADER
============================================================================ */

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon size={14} />
        </span>

        <h3 className="truncate text-sm font-black text-ink-950">{title}</h3>
      </div>

      {action && (
        <Link
          to={action}
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-600 transition hover:text-primary-700"
        >
          View all
          <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

/* ============================================================================
   EMPTY STATE
============================================================================ */

function SectionEmpty({ label = 'Nothing yet' }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
        <Inbox size={18} />
      </div>

      <p className="mt-3 text-xs font-bold text-ink-400">{label}</p>
    </div>
  );
}

/* ============================================================================
   QUICK ACTION
============================================================================ */

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
        <Icon size={14} />
      </span>

      <span className="text-xs font-extrabold text-ink-700 transition group-hover:text-ink-950">
        {label}
      </span>

      <ArrowUpRight
        size={12}
        className="ml-auto shrink-0 text-ink-300 transition group-hover:text-primary-500"
      />
    </Link>
  );
}

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    users: { total: 0, newToday: 0 },
    items: { total: 0, active: 0, pending: 0 },
    applications: { total: 0, pending: 0 },
    winners: { total: 0, thisWeek: 0 },
    viewsToday: 0,
  });

  const [recentItems, setRecentItems] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);

  /* --------------------------------------------------------
     FETCH
  -------------------------------------------------------- */

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getDashboardStats();
      const data = response.data.data || response.data || {};

      setStats({
        users: data.users || { total: 0, newToday: 0 },
        items: data.items || { total: 0, active: 0, pending: 0 },
        applications: data.applications || { total: 0, pending: 0 },
        winners: data.winners || { total: 0, thisWeek: 0 },
        viewsToday: data.viewsToday || data.views?.today || 0,
      });

      setRecentItems(data.recentItems || []);
      setRecentUsers(data.recentUsers || []);
      setRecentApplications(data.recentApplications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  if (loading) return <DashboardSkeleton />;

  /* --------------------------------------------------------
     DERIVED
  -------------------------------------------------------- */

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const primaryStats = [
    {
      label: 'New Users Today',
      value: stats.users.newToday,
      subtext: `${stats.users.total.toLocaleString()} total`,
      icon: UserPlus,
      tone: 'primary',
      to: '/admin/users',
    },
    {
      label: 'Active Items',
      value: stats.items.active,
      subtext: `${stats.items.pending} pending`,
      icon: Package,
      tone: 'success',
      to: '/admin/items',
    },
    {
      label: 'Pending Applications',
      value: stats.applications.pending,
      subtext: `${stats.applications.total.toLocaleString()} total`,
      icon: FileText,
      tone: 'warning',
      to: '/admin/applications',
    },
    {
      label: 'Winners This Week',
      value: stats.winners.thisWeek,
      subtext: `${stats.winners.total.toLocaleString()} all time`,
      icon: Trophy,
      tone: 'primary',
      to: '/admin/winners',
    },
    {
      label: 'Views Today',
      value: stats.viewsToday,
      subtext: 'Live counter',
      icon: Eye,
      tone: 'ink',
    },
  ];

  const quickActions = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/items', icon: Package, label: 'Items' },
    { to: '/admin/applications', icon: FileText, label: 'Applications' },
    { to: '/admin/winners', icon: Trophy, label: 'Winners' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/support', icon: Ticket, label: 'Support' },
    { to: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
    { to: '/admin/api-reference', icon: Code, label: 'API Docs' },
  ];

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* HEADER */}
        <header className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <LayoutDashboard size={14} />
                <span>Admin overview</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Dashboard
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Welcome back, {user?.full_name || 'Admin'}</span>
                <span className="text-ink-300">·</span>
                <span>{todayLabel}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </header>

        {/* PRIMARY STATS */}
        <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          {primaryStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        {/* ACTIVITY GRID */}
        <section className="mb-7 grid gap-4 lg:grid-cols-2">
          {/* RECENT ITEMS */}
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={Package}
              title="Recent Items"
              action="/admin/items"
            />

            <div className="divide-y divide-ink-100">
              {recentItems.length === 0 ? (
                <SectionEmpty label="No recent items" />
              ) : (
                recentItems.map((item) => {
                  const badge = getStatusBadge(item.status);
                  const category = getCategoryByValue(item.category);

                  return (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/60"
                    >
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-300">
                            <ImageIcon size={13} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink-950">
                          {item.title || 'Untitled item'}
                        </p>

                        <div className="mt-0.5 flex items-center gap-1.5">
                          {category &&
                            renderIcon(
                              category.icon,
                              'w-3 h-3',
                              category.color
                            )}

                          <span className="truncate text-[11px] font-bold text-ink-400">
                            {item.category || 'Uncategorized'}
                          </span>

                          <span className="text-ink-300">·</span>

                          <span className="text-[11px] font-bold text-ink-400">
                            {getTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>

                      <Link
                        to={`/item/${item.id}`}
                        aria-label="View item"
                        className="shrink-0 rounded-lg p-1 text-ink-300 opacity-0 transition hover:bg-ink-100 hover:text-primary-600 group-hover:opacity-100"
                      >
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RECENT APPLICATIONS */}
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={FileText}
              title="Recent Applications"
              action="/admin/applications"
            />

            <div className="divide-y divide-ink-100">
              {recentApplications.length === 0 ? (
                <SectionEmpty label="No recent applications" />
              ) : (
                recentApplications.map((app) => {
                  const badge = getAppStatusBadge(app.status);

                  return (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/60"
                    >
                      {app.applicant?.avatar_url ? (
                        <img
                          src={app.applicant.avatar_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full border border-ink-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                          <User size={13} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink-950">
                          {app.applicant?.full_name || 'Anonymous'}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                          Applied for{' '}
                          <span className="text-ink-600">
                            {app.item?.title || 'Unknown Item'}
                          </span>{' '}
                          · {getTimeAgo(app.created_at)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* SECONDARY GRID */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* RECENT USERS */}
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={Users}
              title="Recent Users"
              action="/admin/users"
            />

            <div className="divide-y divide-ink-100">
              {recentUsers.length === 0 ? (
                <SectionEmpty label="No recent users" />
              ) : (
                recentUsers.map((usr) => {
                  const isStaff =
                    usr.role === 'admin' || usr.role === 'super_admin';

                  return (
                    <div
                      key={usr.id}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/60"
                    >
                      {usr.avatar_url ? (
                        <img
                          src={usr.avatar_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full border border-ink-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                          <User size={13} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink-950">
                          {usr.full_name || 'Anonymous'}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                          {usr.email || 'No email'} · {getTimeAgo(usr.created_at)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          isStaff
                            ? 'border-primary-200 bg-primary-50 text-primary-700'
                            : 'border-ink-200 bg-ink-50 text-ink-600'
                        }`}
                      >
                        {isStaff && <ShieldCheck size={9} />}
                        {usr.role || 'user'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader icon={Zap} title="Quick actions" />

            <div className="grid grid-cols-2 gap-2 p-4">
              {quickActions.map((action) => (
                <QuickAction key={action.to} {...action} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;