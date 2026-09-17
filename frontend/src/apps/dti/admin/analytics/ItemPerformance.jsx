import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  Eye,
  FileText,
  ChevronUp,
  ChevronDown,
  Grid3X3,
  AlertTriangle,
  Clock3,
  Package,
  AlertCircle,
  Users,
  List,
  PieChart,
  Table2,
  LayoutGrid,
  Minus,
  Plus,
  ExternalLink,
  Inbox,
  User,
  ChevronLeft,
  ChevronRight,
  CircleArrowOutUpRight,
  Activity,
  Target,
  CheckCircle2,
  CircleAlert,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers3,
  Search,
  SlidersHorizontal,
  Info,
  Sparkles,
  Gauge,
  CircleDot,
  PackageCheck,
  Hourglass,
  MousePointerClick,
  X,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';

import {
  ITEM_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  ITEM_STATUS_DISPLAY,
  getCategoryByValue,
  getStatusDisplay,
} from '@/utils/constants';

import {
  PageNavigation,
  PageNavigationSkeleton,
} from '@/reusables/PageNavigation';

import { useBreakpoint } from '@/reusables/Breakpoint';
import Select from '@/reusables/Select';

const ITEMS_PER_PAGE = 10;

/* ============================================================
   Helpers
============================================================ */

const number = (value) =>
  Number(value || 0).toLocaleString();

const percent = (value, digits = 1) =>
  `${Number(value || 0).toFixed(digits)}%`;

const getConversionRate = (views, applications) => {
  const v = Number(views || 0);
  const a = Number(applications || 0);

  if (!v) return 0;

  return Math.min((a / v) * 100, 100);
};

const getCategoryIcon = (iconName) => {
  const icon = String(iconName || '').toLowerCase();

  /*
   * Supports existing category definitions without depending
   * on Bootstrap icon rendering.
   */
  if (
    icon.includes('food') ||
    icon.includes('utensil') ||
    icon.includes('restaurant')
  ) {
    return Package;
  }

  if (
    icon.includes('book') ||
    icon.includes('education') ||
    icon.includes('school')
  ) {
    return FileText;
  }

  if (
    icon.includes('cloth') ||
    icon.includes('shirt') ||
    icon.includes('fashion')
  ) {
    return Layers3;
  }

  if (
    icon.includes('elect') ||
    icon.includes('phone') ||
    icon.includes('laptop')
  ) {
    return Activity;
  }

  if (
    icon.includes('furniture') ||
    icon.includes('house') ||
    icon.includes('home')
  ) {
    return Package;
  }

  if (
    icon.includes('toy') ||
    icon.includes('game')
  ) {
    return Sparkles;
  }

  if (
    icon.includes('sport') ||
    icon.includes('fitness')
  ) {
    return Target;
  }

  if (
    icon.includes('baby') ||
    icon.includes('child')
  ) {
    return Users;
  }

  if (
    icon.includes('car') ||
    icon.includes('vehicle')
  ) {
    return PackageCheck;
  }

  return Package;
};

const getStatusClasses = (status, appsCount) => {
  if (!appsCount && status === 'active') {
    return {
      label: 'No applications',
      classes:
        'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    };
  }

  const display = getStatusDisplay(status);

  const colorMap = {
    green: {
      classes:
        'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    yellow: {
      classes:
        'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    blue: {
      classes:
        'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    },
    red: {
      classes:
        'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
    gray: {
      classes:
        'bg-ink-50 text-ink-600 border-ink-300',
      dot: 'bg-ink-400',
    },
  };

  const mapped =
    colorMap[display?.color] || colorMap.gray;

  return {
    label: display?.label || status || 'Unknown',
    classes: mapped.classes,
    dot: mapped.dot,
  };
};

/* ============================================================
   Skeleton
============================================================ */

const ItemPerformanceSkeleton = () => (
  <div className="space-y-6">
    <PageNavigationSkeleton />

    <div className="animate-pulse space-y-3">
      <div className="h-3 w-32 rounded bg-ink-200" />
      <div className="h-9 w-72 rounded-lg bg-ink-200" />
      <div className="h-4 w-96 max-w-full rounded bg-ink-200" />
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-ink-300 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex justify-between">
            <div className="h-3 w-20 rounded bg-ink-200" />
            <div className="h-9 w-9 rounded-xl bg-ink-200" />
          </div>
          <div className="mb-2 h-8 w-20 rounded bg-ink-200" />
          <div className="h-3 w-28 rounded bg-ink-200" />
        </div>
      ))}
    </div>

    <div className="rounded-3xl border border-ink-300 bg-white p-6 shadow-sm">
      <div className="mb-6 h-5 w-56 rounded bg-ink-200" />
      <div className="h-3 w-full rounded-full bg-ink-200" />
      <div className="my-6 h-3 w-4/5 rounded-full bg-ink-200" />
      <div className="h-3 w-3/5 rounded-full bg-ink-200" />
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {[...Array(2)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-ink-300 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 h-5 w-40 rounded bg-ink-200" />
          {[...Array(5)].map((__, row) => (
            <div
              key={row}
              className="flex items-center gap-3 border-t border-ink-50 py-4"
            >
              <div className="h-8 w-8 rounded-full bg-ink-200" />
              <div className="flex-1">
                <div className="mb-2 h-3 w-3/4 rounded bg-ink-200" />
                <div className="h-2.5 w-1/3 rounded bg-ink-200" />
              </div>
              <div className="h-4 w-12 rounded bg-ink-200" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ============================================================
   Quick Stat
============================================================ */

function QuickStat({
  label,
  value,
  icon: Icon,
  subtext,
  highlight = false,
  accent = 'primary',
}) {
  const accentClasses = {
    primary: {
      icon: 'bg-primary-50 text-primary-600 border-primary-100',
      value: 'text-ink-900',
    },
    green: {
      icon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      value: 'text-emerald-700',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-600 border-amber-100',
      value: 'text-amber-700',
    },
    blue: {
      icon: 'bg-sky-50 text-sky-600 border-sky-100',
      value: 'text-sky-700',
    },
  };

  const style =
    accentClasses[highlight ? 'amber' : accent] ||
    accentClasses.primary;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${
        highlight
          ? 'border-amber-200'
          : 'border-ink-300/80'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-400">
          {label}
        </p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p
        className={`text-2xl font-black tracking-tight sm:text-3xl ${
          highlight ? 'text-amber-700' : style.value
        }`}
      >
        {typeof value === 'number'
          ? number(value)
          : value}
      </p>

      <p className="mt-1 text-xs font-medium text-ink-400">
        {subtext}
      </p>
    </motion.div>
  );
}

/* ============================================================
   Performance Funnel
============================================================ */

function PerformanceFunnel({
  views,
  applications,
  zeroApplications,
}) {
  const conversion = getConversionRate(
    views,
    applications
  );

  const stages = [
    {
      label: 'Listing reach',
      value: views,
      icon: Eye,
      description:
        'People who viewed the available listings.',
      color: 'primary',
      width: 100,
    },
    {
      label: 'Application interest',
      value: applications,
      icon: MousePointerClick,
      description:
        'Views that turned into an application.',
      color: 'blue',
      width:
        views > 0
          ? Math.max(
              (applications / views) * 100,
              applications > 0 ? 8 : 0
            )
          : 0,
    },
    {
      label: 'Conversion',
      value: conversion,
      suffix: '%',
      icon: Target,
      description:
        'Overall application rate from views.',
      color: 'green',
      width: Math.max(
        Math.min(conversion * 4, 100),
        conversion > 0 ? 8 : 0
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
      <div className="border-b border-ink-300 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Gauge className="h-4 w-4" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-600">
                Performance journey
              </span>
            </div>

            <h2 className="text-lg font-black tracking-tight text-ink-900">
              How listings move from views to applications
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
              This view shows where listing attention turns into
              actual application activity. A large gap between
              views and applications usually means the listing
              needs stronger information, presentation, or
              relevance.
            </p>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-primary-50/60 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary-600">
              Conversion rate
            </p>
            <p className="mt-1 text-2xl font-black text-primary-700">
              {percent(conversion)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="space-y-5">
          {stages.map((stage, index) => {
            const Icon = stage.icon;

            return (
              <motion.div
                key={stage.label}
                initial={{
                  opacity: 0,
                  x: -10,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: index * 0.08,
                }}
              >
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black text-ink-800">
                        {stage.label}
                      </p>
                      <p className="truncate text-xs font-medium text-ink-400">
                        {stage.description}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-lg font-black text-ink-900">
                    {number(stage.value)}
                    {stage.suffix || ''}
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${stage.width}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.1,
                      ease: 'easeOut',
                    }}
                    className={`h-full rounded-full ${
                      stage.color === 'primary'
                        ? 'bg-primary-500'
                        : stage.color === 'blue'
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>

                {index < stages.length - 1 && (
                  <div className="ml-4 mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    <ChevronDown className="h-3 w-3" />
                    <span>
                      {index === 0
                        ? `${number(
                            Math.max(
                              views - applications,
                              0
                            )
                          )} views did not become applications`
                        : `${percent(conversion)} of viewed listings generated applications`}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 border-t border-ink-300 pt-5 sm:grid-cols-3">
          <FunnelInsight
            icon={Eye}
            label="Reach"
            value={number(views)}
            text="Total listing views"
          />

          <FunnelInsight
            icon={FileText}
            label="Interest"
            value={number(applications)}
            text="Applications received"
          />

          <FunnelInsight
            icon={AlertCircle}
            label="Attention needed"
            value={number(zeroApplications)}
            text="Listings with zero applications"
            warning={zeroApplications > 0}
          />
        </div>
      </div>
    </div>
  );
}

function FunnelInsight({
  icon: Icon,
  label,
  value,
  text,
  warning,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-ink-300 bg-ink-50/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${
            warning
              ? 'text-amber-600'
              : 'text-ink-500'
          }`}
        />

        <span className="text-[10px] font-black uppercase tracking-wider text-ink-400">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 text-xl font-black ${
          warning
            ? 'text-amber-700'
            : 'text-ink-900'
        }`}
      >
        {value}
      </p>

      <p className="mt-0.5 text-xs font-medium text-ink-400">
        {text}
      </p>
    </div>
  );
}

/* ============================================================
   Listing Row
============================================================ */

function PerformanceListRow({
  item,
  index,
  metric = 'views',
}) {
  const badge = getStatusClasses(
    item.status,
    item.applications_count
  );

  const category = getCategoryByValue(
    item.category
  );

  const CategoryIcon = getCategoryIcon(
    category?.icon
  );

  const metricValue =
    metric === 'applications'
      ? item.applications_count
      : item.views_count;

  const secondaryValue =
    metric === 'applications'
      ? item.views_count
      : item.applications_count;

  return (
    <div className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-primary-50/30 sm:px-6">
      <div className="flex w-5 shrink-0 justify-center text-xs font-black text-ink-300">
        {index + 1}
      </div>

      {item.donor?.avatar_url ? (
        <img
          src={item.donor.avatar_url}
          alt={item.donor.full_name || ''}
          className="h-9 w-9 shrink-0 rounded-full border border-ink-300 object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-ink-50">
          <User className="h-4 w-4 text-ink-400" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-ink-900">
          {item.title || 'Untitled item'}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-primary-500" />

          <span className="truncate text-xs font-medium text-ink-400">
            {item.category || 'Other'}
          </span>

          <span className="text-ink-300">·</span>

          <span className="truncate text-xs font-medium text-ink-400">
            {item.donor?.full_name || 'Anonymous'}
          </span>
        </div>
      </div>

      <span
        className={`hidden rounded-full border px-2 py-1 text-[10px] font-bold sm:inline-flex ${badge.classes}`}
      >
        {badge.label}
      </span>

      <div className="w-20 shrink-0 text-right">
        <p className="text-sm font-black text-primary-600">
          {number(metricValue)}
        </p>

        <p className="text-[10px] font-medium text-ink-400">
          {number(secondaryValue)}{' '}
          {metric === 'applications'
            ? 'views'
            : 'apps'}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Category Performance Card
============================================================ */

function CategoryCard({
  category,
  stats,
  totalItems,
  index,
}) {
  const [isExpanded, setIsExpanded] =
    useState(false);

  const cat = getCategoryByValue(category);
  const CategoryIcon = getCategoryIcon(
    cat?.icon
  );

  const description =
    CATEGORY_DESCRIPTIONS[category] || '';

  const share =
    totalItems > 0
      ? (stats.total / totalItems) * 100
      : 0;

  const conversion = getConversionRate(
    stats.totalViews,
    stats.totalApplications
  );

  const completion =
    stats.total > 0
      ? (stats.completed / stats.total) * 100
      : 0;

  const performance =
    conversion >= 5
      ? 'Strong'
      : conversion >= 2
      ? 'Average'
      : stats.totalViews > 0
      ? 'Needs attention'
      : 'No activity';

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.035,
      }}
      className="overflow-hidden rounded-2xl border border-ink-300/80 bg-white shadow-sm transition hover:shadow-md"
    >
      <button
        onClick={() =>
          setIsExpanded(!isExpanded)
        }
        className="w-full p-5 text-left transition hover:bg-ink-50/30"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
            <CategoryIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-ink-900">
                {category || 'Other'}
              </h3>

              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  performance === 'Strong'
                    ? 'bg-emerald-50 text-emerald-700'
                    : performance === 'Average'
                    ? 'bg-sky-50 text-sky-700'
                    : performance ===
                      'Needs attention'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-ink-50 text-ink-500'
                }`}
              >
                {performance}
              </span>
            </div>

            <p className="mt-1 text-xs font-medium text-ink-400">
              {number(stats.total)} listings ·{' '}
              {percent(share)} of all listings
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    share,
                    100
                  )}%`,
                }}
                className="h-full rounded-full bg-primary-500"
              />
            </div>
          </div>

          <div className="shrink-0 text-ink-400">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniMetric
            label="Views"
            value={number(stats.totalViews)}
          />

          <MiniMetric
            label="Apps"
            value={number(
              stats.totalApplications
            )}
          />

          <MiniMetric
            label="Rate"
            value={percent(conversion)}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: 'auto',
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.25,
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-300 bg-ink-50/30 px-5 pb-5 pt-4">
              {description && (
                <div className="mb-4 flex gap-2 rounded-xl border border-ink-300 bg-white p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />

                  <p className="text-xs font-medium leading-5 text-ink-500">
                    {description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CategoryMetric
                  label="Total listings"
                  value={number(stats.total)}
                  icon={Package}
                />

                <CategoryMetric
                  label="Active"
                  value={number(stats.active)}
                  icon={Activity}
                />

                <CategoryMetric
                  label="Completed"
                  value={number(stats.completed)}
                  icon={CheckCircle2}
                />

                <CategoryMetric
                  label="Completion"
                  value={percent(completion)}
                  icon={Target}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-ink-50/70 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-black text-ink-800">
        {value}
      </p>
    </div>
  );
}

function CategoryMetric({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-ink-300 bg-white p-3">
      <Icon className="mb-2 h-4 w-4 text-primary-500" />

      <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-ink-900">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   Attention Panel
============================================================ */

function AttentionPanel({
  zeroApplications,
  pendingItems,
  totalItems,
}) {
  const zeroRate =
    totalItems > 0
      ? (zeroApplications / totalItems) * 100
      : 0;

  const severity =
    zeroRate >= 20
      ? 'high'
      : zeroRate >= 10
      ? 'medium'
      : 'low';

  return (
    <div
      className={`overflow-hidden rounded-3xl border ${
        severity === 'high'
          ? 'border-rose-200 bg-rose-50/50'
          : severity === 'medium'
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-ink-300 bg-white'
      }`}
    >
      <div className="border-b border-current/10 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              severity === 'high'
                ? 'bg-rose-100 text-rose-600'
                : severity === 'medium'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-primary-50 text-primary-600'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-400">
              Attention required
            </p>

            <h2 className="mt-1 text-lg font-black text-ink-900">
              {severity === 'high'
                ? 'A significant number of listings are not converting'
                : severity === 'medium'
                ? 'Some listings may need attention'
                : 'Listing health looks relatively stable'}
            </h2>

            <p className="mt-1 text-sm leading-6 text-ink-500">
              Use these signals to identify listings that
              may need better descriptions, images,
              pricing, categorisation, or moderation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <AttentionMetric
          icon={AlertCircle}
          value={zeroApplications}
          label="Listings with no applications"
          detail={`${percent(zeroRate)} of analyzed listings`}
          warning={zeroRate >= 10}
        />

        <AttentionMetric
          icon={Hourglass}
          value={pendingItems}
          label="Pending listings"
          detail="Awaiting completion or action"
          warning={pendingItems > 5}
        />
      </div>
    </div>
  );
}

function AttentionMetric({
  icon: Icon,
  value,
  label,
  detail,
  warning,
}) {
  return (
    <div className="rounded-2xl border border-ink-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-ink-900">
            {number(value)}
          </p>

          <p className="mt-1 text-sm font-black text-ink-700">
            {label}
          </p>

          <p className="mt-1 text-xs font-medium text-ink-400">
            {detail}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            warning
              ? 'bg-amber-50 text-amber-600'
              : 'bg-ink-50 text-ink-500'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Main Component
============================================================ */

const AnalyticsItemPerformance = () => {
  const breakpoint = useBreakpoint();

  const [loading, setLoading] =
    useState(true);

  const [range, setRange] =
    useState('30d');

  const [topByViews, setTopByViews] =
    useState([]);

  const [topByApplications, setTopByApplications] =
    useState([]);

  const [zeroApplicationItems, setZeroApplicationItems] =
    useState([]);

  const [pendingItems, setPendingItems] =
    useState([]);

  const [categoryPerformance, setCategoryPerformance] =
    useState([]);

  const [allItemsStats, setAllItemsStats] =
    useState(null);

  const [activeTab, setActiveTab] =
    useState('overview');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [categoryFilter, setCategoryFilter] =
    useState('all');

  const [sortBy, setSortBy] =
    useState('views');

  const [sortOrder, setSortOrder] =
    useState('desc');

  const [currentPage, setCurrentPage] =
    useState(1);

  const [viewMode, setViewMode] =
    useState('table');

  const [gridCols, setGridCols] =
    useState(2);

  const [isCustomCols, setIsCustomCols] =
    useState(false);

  /* ----------------------------------------------------------
     Responsive grid
  ---------------------------------------------------------- */

  const getDefaultCols = useCallback(
    (bp) => {
      if (bp === 'xs' || bp === 'sm') return 1;
      if (bp === 'md') return 2;
      if (bp === 'lg') return 3;
      if (bp === 'xl' || bp === '2xl') return 4;

      return 2;
    },
    []
  );

  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(
        getDefaultCols(breakpoint)
      );
    }
  }, [
    breakpoint,
    isCustomCols,
    getDefaultCols,
  ]);

  /* ----------------------------------------------------------
     Fetch
  ---------------------------------------------------------- */

  const fetchItemPerformance =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await adminAPI.getItemPerformance(
            range
          );

        const data =
          response?.data?.data ||
          response?.data ||
          {};

        setTopByViews(
          data.topByViews || []
        );

        setTopByApplications(
          data.topByApplications || []
        );

        setZeroApplicationItems(
          data.zeroApplicationItems || []
        );

        setPendingItems(
          data.stuckItems || []
        );

        setCategoryPerformance(
          data.categories || []
        );

        const allItems = [
          ...(data.topByViews || []),
          ...(data.topByApplications || []),
          ...(data.zeroApplicationItems || []),
          ...(data.stuckItems || []),
        ];

        const uniqueItems = [
          ...new Map(
            allItems.map((item) => [
              item.id,
              item,
            ])
          ).values(),
        ];

        const totalApps =
          uniqueItems.reduce(
            (sum, item) =>
              sum +
              Number(
                item.applications_count || 0
              ),
            0
          );

        const zeroApps =
          uniqueItems.filter(
            (item) =>
              !item.applications_count ||
              Number(
                item.applications_count
              ) === 0
          ).length;

        const pending =
          uniqueItems.filter(
            (item) =>
              item.status === 'pending'
          ).length;

        const totalViews =
          uniqueItems.reduce(
            (sum, item) =>
              sum +
              Number(
                item.views_count || 0
              ),
            0
          );

        setAllItemsStats({
          totalItems:
            uniqueItems.length,
          totalApps,
          totalViews,
          avgAppsPerItem:
            uniqueItems.length > 0
              ? (
                  totalApps /
                  uniqueItems.length
                ).toFixed(1)
              : '0',
          conversionRate:
            getConversionRate(
              totalViews,
              totalApps
            ),
          zeroAppCount: zeroApps,
          pendingCount: pending,
        });
      } catch (error) {
        console.error(
          'Item performance error:',
          error
        );

        toast.error(
          'Failed to load item performance'
        );
      } finally {
        setLoading(false);
      }
    }, [range]);

  useEffect(() => {
    fetchItemPerformance();

    setCurrentPage(1);
    setSearchTerm('');
  }, [fetchItemPerformance]);

  /* ----------------------------------------------------------
     Combined items
  ---------------------------------------------------------- */

  const allItems = useMemo(() => {
    const combined = [
      ...topByViews.map((item) => ({
        ...item,
        source: 'topViews',
      })),

      ...topByApplications.map((item) => ({
        ...item,
        source: 'topApps',
      })),

      ...zeroApplicationItems.map((item) => ({
        ...item,
        source: 'zeroApps',
      })),

      ...pendingItems.map((item) => ({
        ...item,
        source: 'pending',
      })),
    ];

    return [
      ...new Map(
        combined.map((item) => [
          item.id,
          item,
        ])
      ).values(),
    ];
  }, [
    topByViews,
    topByApplications,
    zeroApplicationItems,
    pendingItems,
  ]);

  /* ----------------------------------------------------------
     Filters
  ---------------------------------------------------------- */

  const statusOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'All statuses',
      },

      ...Object.entries(
        ITEM_STATUS_DISPLAY
      ).map(([value, display]) => ({
        value,
        label: display.label,
      })),

      {
        value: 'zeroApps',
        label: 'No applications',
      },
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'All categories',
      },

      ...ITEM_CATEGORIES.map((cat) => ({
        value: cat.value,
        label: cat.label,
        description:
          CATEGORY_DESCRIPTIONS[
            cat.value
          ] || '',
      })),
    ],
    []
  );

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (searchTerm.trim()) {
      const term =
        searchTerm.toLowerCase();

      result = result.filter((item) => {
        return (
          item.title
            ?.toLowerCase()
            .includes(term) ||
          item.category
            ?.toLowerCase()
            .includes(term) ||
          item.donor?.full_name
            ?.toLowerCase()
            .includes(term)
        );
      });
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'zeroApps') {
        result = result.filter(
          (item) =>
            !item.applications_count ||
            Number(
              item.applications_count
            ) === 0
        );
      } else {
        result = result.filter(
          (item) =>
            item.status === statusFilter
        );
      }
    }

    if (categoryFilter !== 'all') {
      result = result.filter(
        (item) =>
          item.category ===
          categoryFilter
      );
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'views':
          comparison =
            Number(a.views_count || 0) -
            Number(b.views_count || 0);
          break;

        case 'applications':
          comparison =
            Number(
              a.applications_count || 0
            ) -
            Number(
              b.applications_count || 0
            );
          break;

        case 'date':
          comparison =
            new Date(
              a.created_at || 0
            ) -
            new Date(
              b.created_at || 0
            );
          break;

        case 'title':
          comparison = (
            a.title || ''
          ).localeCompare(
            b.title || ''
          );
          break;

        default:
          comparison = 0;
      }

      return sortOrder === 'desc'
        ? -comparison
        : comparison;
    });

    return result;
  }, [
    allItems,
    searchTerm,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
  ]);

  const totalPages = Math.ceil(
    filteredItems.length /
      ITEMS_PER_PAGE
  );

  const paginatedItems =
    filteredItems.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,
      currentPage *
        ITEMS_PER_PAGE
    );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(
        sortOrder === 'desc'
          ? 'asc'
          : 'desc'
      );
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }

    setCurrentPage(1);
  };

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

  /* ----------------------------------------------------------
     Categories
  ---------------------------------------------------------- */

  const categoryStatsMap = useMemo(() => {
    const map = {};

    ITEM_CATEGORIES.forEach((cat) => {
      map[cat.value] = {
        total: 0,
        active: 0,
        completed: 0,
        totalViews: 0,
        totalApplications: 0,
      };
    });

    if (
      Array.isArray(
        categoryPerformance
      )
    ) {
      categoryPerformance.forEach(
        (cat) => {
          if (!cat?.category) return;

          map[cat.category] = {
            total: Number(
              cat.total || 0
            ),
            active: Number(
              cat.active || 0
            ),
            completed: Number(
              cat.completed || 0
            ),
            totalViews: Number(
              cat.totalViews || 0
            ),
            totalApplications:
              Number(
                cat.totalApplications ||
                  0
              ),
          };
        }
      );
    }

    return map;
  }, [categoryPerformance]);

  const totalCategoryItems =
    useMemo(
      () =>
        Object.values(
          categoryStatsMap
        ).reduce(
          (sum, stats) =>
            sum +
            Number(stats.total || 0),
          0
        ),
      [categoryStatsMap]
    );

  /* ----------------------------------------------------------
     Chart
  ---------------------------------------------------------- */

  const categoryChartData =
    useMemo(() => {
      return Object.entries(
        categoryStatsMap
      )
        .filter(
          ([, stats]) =>
            stats.total > 0
        )
        .map(([name, stats]) => ({
          name:
            name.length > 15
              ? `${name.slice(
                  0,
                  15
                )}…`
              : name,
          fullName: name,
          total: stats.total,
          completed:
            stats.completed,
          applications:
            stats.totalApplications,
        }));
    }, [categoryStatsMap]);

  if (loading) {
    return <ItemPerformanceSkeleton />;
  }

  const totalViews =
    allItemsStats?.totalViews || 0;

  const totalApps =
    allItemsStats?.totalApps || 0;

  const conversionRate =
    allItemsStats?.conversionRate || 0;

  const zeroApps =
    allItemsStats?.zeroAppCount || 0;

  const pending =
    allItemsStats?.pendingCount || 0;

  return (
    <div className="space-y-5 pb-8">
      <PageNavigation />

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary-100/40 blur-3xl" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <BarChart3 className="h-4 w-4" />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Analytics · Item performance
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-[-0.04em] text-ink-900 sm:text-3xl">
                Understand which listings
                <br className="hidden sm:block" />
                are actually performing.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
                Track listing reach, application
                interest, conversion and problem
                areas. The goal is not just to see
                which items are popular — it is to
                understand where attention is being
                lost.
              </p>
            </div>

            <div className="shrink-0">
              <div className="mb-2 text-right text-[10px] font-black uppercase tracking-wider text-ink-400">
                Analysis period
              </div>

              <div className="flex rounded-2xl border border-ink-300 bg-ink-50 p-1">
                {[
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                  ['90d', '90 days'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() =>
                      setRange(value)
                    }
                    className={`rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 ${
                      range === value
                        ? 'bg-white text-primary-700 shadow-sm ring-1 ring-ink-100'
                        : 'text-ink-400 hover:text-ink-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation strip */}
          <div className="mt-7 grid gap-3 border-t border-ink-300 pt-5 sm:grid-cols-3">
            <ExplanationStep
              number="01"
              icon={Eye}
              title="Reach"
              text="How many people are discovering listings."
            />

            <ExplanationStep
              number="02"
              icon={MousePointerClick}
              title="Interest"
              text="How many viewers take the next step."
            />

            <ExplanationStep
              number="03"
              icon={Target}
              title="Conversion"
              text="How efficiently views become applications."
            />
          </div>
        </div>
      </section>

      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat
          label="Listings analyzed"
          value={
            allItemsStats?.totalItems ||
            0
          }
          icon={Package}
          subtext="Items in the current dataset"
          accent="primary"
        />

        <QuickStat
          label="Total views"
          value={totalViews}
          icon={Eye}
          subtext="Listing attention received"
          accent="blue"
        />

        <QuickStat
          label="Applications"
          value={totalApps}
          icon={FileText}
          subtext={`${allItemsStats?.avgAppsPerItem || '0'} per listing`}
          accent="green"
        />

        <QuickStat
          label="Conversion rate"
          value={percent(
            conversionRate
          )}
          icon={Target}
          subtext="Views becoming applications"
          accent="green"
        />
      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="sticky top-0 z-20 rounded-2xl border border-ink-300/80 bg-white/95 p-1.5 shadow-sm backdrop-blur">
        <div className="flex overflow-x-auto scrollbar-hide">
          {[
            {
              key: 'overview',
              label: 'Performance overview',
              short: 'Overview',
              icon: Activity,
            },
            {
              key: 'all',
              label: 'All listings',
              short: 'All',
              icon: List,
            },
            {
              key: 'categories',
              label: 'Category performance',
              short: 'Categories',
              icon: PieChart,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active =
              activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition sm:px-4 sm:text-sm ${
                  active
                    ? 'bg-ink-900 text-white shadow-sm'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                }`}
              >
                <Icon className="h-4 w-4" />

                <span className="hidden sm:inline">
                  {tab.label}
                </span>

                <span className="sm:hidden">
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <AnimatePresence mode="wait">
        {/* ----------------------------------------------------
            OVERVIEW
        ---------------------------------------------------- */}

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
            className="space-y-6"
          >
            <PerformanceFunnel
              views={totalViews}
              applications={totalApps}
              zeroApplications={zeroApps}
            />

            <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              {/* Top by views */}
              <section className="overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
                <div className="border-b border-ink-300 px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <Eye className="h-4 w-4" />
                        </div>

                        <h2 className="text-sm font-black text-ink-900">
                          Most discovered
                        </h2>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-ink-400">
                        Listings receiving the most
                        attention. High views indicate
                        strong reach, but do not
                        necessarily mean strong conversion.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('all');
                        setSortBy('views');
                        setSortOrder('desc');
                      }}
                      className="shrink-0 text-xs font-black text-primary-600 hover:text-primary-700"
                    >
                      View all
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-ink-50">
                  {topByViews.length === 0 ? (
                    <EmptyState compact />
                  ) : (
                    topByViews
                      .slice(0, 5)
                      .map((item, index) => (
                        <PerformanceListRow
                          key={item.id}
                          item={item}
                          index={index}
                          metric="views"
                        />
                      ))
                  )}
                </div>
              </section>

              {/* Top by applications */}
              <section className="overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
                <div className="border-b border-ink-300 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Target className="h-4 w-4" />
                        </div>

                        <h2 className="text-sm font-black text-ink-900">
                          Most effective
                        </h2>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-ink-400">
                        Listings attracting the most
                        applications. These are useful
                        examples of what is resonating
                        with users.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('all');
                        setSortBy(
                          'applications'
                        );
                        setSortOrder('desc');
                      }}
                      className="shrink-0 text-xs font-black text-primary-600 hover:text-primary-700"
                    >
                      View all
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-ink-50">
                  {topByApplications.length ===
                  0 ? (
                    <EmptyState compact />
                  ) : (
                    topByApplications
                      .slice(0, 5)
                      .map((item, index) => (
                        <PerformanceListRow
                          key={item.id}
                          item={item}
                          index={index}
                          metric="applications"
                        />
                      ))
                  )}
                </div>
              </section>
            </div>

            <AttentionPanel
              zeroApplications={zeroApps}
              pendingItems={pending}
              totalItems={
                allItemsStats?.totalItems ||
                0
              }
            />

            {/* Category chart */}
            {categoryChartData.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
                <div className="border-b border-ink-300 px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <BarChart3 className="h-4 w-4" />
                    </div>

                    <div>
                      <h2 className="text-sm font-black text-ink-900">
                        Category performance
                      </h2>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400">
                        Compare how many listings each
                        category contains against how many
                        have reached completion.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >
                    <BarChart
                      data={
                        categoryChartData
                      }
                      layout="vertical"
                      margin={{
                        left: 90,
                        right: 20,
                        top: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        tick={{
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{
                          fontSize: 10,
                        }}
                        width={85}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        cursor={{
                          fill: '#f8fafc',
                        }}
                        contentStyle={{
                          borderRadius: 14,
                          border:
                            '1px solid #e5e7eb',
                          fontSize: 11,
                        }}
                        formatter={(
                          value,
                          name
                        ) => [
                          number(value),
                          name ===
                          'completed'
                            ? 'Completed'
                            : 'Total listings',
                        ]}
                        labelFormatter={(
                          label,
                          payload
                        ) =>
                          payload?.[0]
                            ?.payload
                            ?.fullName ||
                          label
                        }
                      />

                      <Bar
                        dataKey="total"
                        name="total"
                        radius={[
                          0,
                          6,
                          6,
                          0,
                        ]}
                        barSize={12}
                      >
                        {categoryChartData.map(
                          (_, index) => (
                            <Cell
                              key={index}
                              fill="#a78bfa"
                            />
                          )
                        )}
                      </Bar>

                      <Bar
                        dataKey="completed"
                        name="completed"
                        radius={[
                          0,
                          6,
                          6,
                          0,
                        ]}
                        barSize={12}
                      >
                        {categoryChartData.map(
                          (_, index) => (
                            <Cell
                              key={index}
                              fill="#4f46e5"
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* ----------------------------------------------------
            ALL ITEMS
        ---------------------------------------------------- */}

        {activeTab === 'all' && (
          <motion.div
            key="all"
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
          >
            <section className="overflow-hidden rounded-3xl border border-ink-300/80 bg-white shadow-sm">
              {/* Toolbar */}
              <div className="border-b border-ink-300 p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(
                            e.target.value
                          );
                          setCurrentPage(1);
                        }}
                        placeholder="Search listings, categories or donors..."
                        className="w-full rounded-xl border border-ink-300 bg-ink-100 py-2.5 pl-10 pr-10 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                      />

                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-xs font-bold text-ink-500">
                      <SlidersHorizontal className="h-3.5 w-3.5" />

                      <span>
                        {number(
                          filteredItems.length
                        )}{' '}
                        results
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Select
                        options={
                          statusOptions
                        }
                        value={
                          statusFilter
                        }
                        onChange={(
                          value
                        ) => {
                          setStatusFilter(
                            value
                          );
                          setCurrentPage(
                            1
                          );
                        }}
                        placeholder="All statuses"
                        className="w-full sm:w-44"
                      />

                      <Select
                        options={
                          categoryOptions
                        }
                        value={
                          categoryFilter
                        }
                        onChange={(
                          value
                        ) => {
                          setCategoryFilter(
                            value
                          );
                          setCurrentPage(
                            1
                          );
                        }}
                        placeholder="All categories"
                        searchable
                        showDescription
                        className="w-full sm:w-52"
                      />
                    </div>

                    <div className="flex items-center gap-2 xl:ml-auto">
                      <span className="hidden text-xs font-bold text-ink-400 sm:inline">
                        Display
                      </span>

                      <div className="flex items-center rounded-xl border border-ink-300 bg-ink-50 p-1">
                        <button
                          onClick={() =>
                            setViewMode(
                              'table'
                            )
                          }
                          className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition ${
                            viewMode ===
                            'table'
                              ? 'bg-white text-primary-700 shadow-sm'
                              : 'text-ink-400 hover:text-ink-700'
                          }`}
                        >
                          <Table2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            Table
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setViewMode(
                              'cards'
                            )
                          }
                          className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition ${
                            viewMode ===
                            'cards'
                              ? 'bg-white text-primary-700 shadow-sm'
                              : 'text-ink-400 hover:text-ink-700'
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            Cards
                          </span>
                        </button>

                        {viewMode ===
                          'cards' && (
                          <>
                            <div className="mx-1 h-5 w-px bg-ink-200" />

                            <button
                              onClick={() => {
                                setIsCustomCols(
                                  true
                                );
                                setGridCols(
                                  Math.max(
                                    1,
                                    gridCols -
                                      1
                                  )
                                );
                              }}
                              disabled={
                                gridCols <=
                                1
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-primary-600 disabled:opacity-30"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="w-5 text-center text-xs font-black text-ink-700">
                              {gridCols}
                            </span>

                            <button
                              onClick={() => {
                                setIsCustomCols(
                                  true
                                );
                                setGridCols(
                                  Math.min(
                                    4,
                                    gridCols +
                                      1
                                  )
                                );
                              }}
                              disabled={
                                gridCols >=
                                4
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-primary-600 disabled:opacity-30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              {viewMode ===
              'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-ink-300 bg-ink-50/70">
                        <SortableHeader
                          label="#"
                          className="w-10"
                        />

                        <SortableHeader label="Listing" />

                        <SortableHeader label="Status" />

                        <SortableHeader
                          label="Views"
                          field="views"
                          sortBy={
                            sortBy
                          }
                          sortOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                          align="right"
                        />

                        <SortableHeader
                          label="Applications"
                          field="applications"
                          sortBy={
                            sortBy
                          }
                          sortOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                          align="right"
                        />

                        <SortableHeader
                          label="Listed"
                          field="date"
                          sortBy={
                            sortBy
                          }
                          sortOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                          align="right"
                        />

                        <SortableHeader
                          label=""
                          className="w-14"
                        />
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-ink-50">
                      {paginatedItems.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={
                              7
                            }
                          >
                            <EmptyState />
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map(
                          (
                            item,
                            index
                          ) => {
                            const badge =
                              getStatusClasses(
                                item.status,
                                item.applications_count
                              );

                            const category =
                              getCategoryByValue(
                                item.category
                              );

                            const CategoryIcon =
                              getCategoryIcon(
                                category?.icon
                              );

                            const globalIndex =
                              (currentPage -
                                1) *
                                ITEMS_PER_PAGE +
                              index +
                              1;

                            return (
                              <tr
                                key={
                                  item.id
                                }
                                className="group transition hover:bg-primary-50/20"
                              >
                                <td className="px-5 py-4 text-xs font-black text-ink-300">
                                  {
                                    globalIndex
                                  }
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex min-w-[260px] items-center gap-3">
                                    {item
                                      .donor
                                      ?.avatar_url ? (
                                      <img
                                        src={
                                          item
                                            .donor
                                            .avatar_url
                                        }
                                        alt=""
                                        className="h-9 w-9 shrink-0 rounded-full border border-ink-300 object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-ink-50">
                                        <User className="h-4 w-4 text-ink-400" />
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-ink-900">
                                        {
                                          item.title
                                        }
                                      </p>

                                      <div className="mt-1 flex items-center gap-1.5">
                                        <CategoryIcon className="h-3 w-3 text-primary-500" />

                                        <span className="truncate text-xs font-medium text-ink-400">
                                          {
                                            item.category
                                          }
                                        </span>

                                        <span className="text-ink-300">
                                          ·
                                        </span>

                                        <span className="truncate text-xs font-medium text-ink-400">
                                          {item
                                            .donor
                                            ?.full_name ||
                                            'Anonymous'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${badge.classes}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                                    />

                                    {
                                      badge.label
                                    }
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-right">
                                  <span className="text-sm font-black text-ink-900">
                                    {number(
                                      item.views_count
                                    )}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-right">
                                  <span
                                    className={`text-sm font-black ${
                                      !item.applications_count
                                        ? 'text-amber-600'
                                        : 'text-ink-900'
                                    }`}
                                  >
                                    {number(
                                      item.applications_count
                                    )}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-right text-xs font-medium text-ink-400">
                                  {formatDate(
                                    item.created_at
                                  )}
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <Link
                                    to={`/item/${item.id}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                                    title="View listing"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards */
                <motion.div
                  layout
                  className="grid gap-4 p-4"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  }}
                >
                  {paginatedItems.length ===
                  0 ? (
                    <div className="col-span-full">
                      <EmptyState />
                    </div>
                  ) : (
                    paginatedItems.map(
                      (item) => (
                        <ListingCard
                          key={item.id}
                          item={item}
                        />
                      )
                    )
                  )}
                </motion.div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-300 px-5 py-4">
                  <p className="text-xs font-medium text-ink-400">
                    Showing{' '}
                    <span className="font-black text-ink-700">
                      {(currentPage -
                        1) *
                        ITEMS_PER_PAGE +
                        1}
                      –
                      {Math.min(
                        currentPage *
                          ITEMS_PER_PAGE,
                        filteredItems.length
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-black text-ink-700">
                      {number(
                        filteredItems.length
                      )}
                    </span>
                  </p>

                  <Pagination
                    currentPage={
                      currentPage
                    }
                    totalPages={
                      totalPages
                    }
                    onPageChange={
                      setCurrentPage
                    }
                  />
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* ----------------------------------------------------
            CATEGORIES
        ---------------------------------------------------- */}

        {activeTab ===
          'categories' && (
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
            className="space-y-5"
          >
            <div className="rounded-3xl border border-ink-300/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <PieChart className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-tight text-ink-900">
                    Category performance
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
                    Categories show where listing
                    activity is concentrated. Expand a
                    category to see its reach,
                    applications, completion and
                    conversion performance.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {ITEM_CATEGORIES.map(
                (cat, index) => {
                  const stats =
                    categoryStatsMap[
                      cat.value
                    ] || {
                      total: 0,
                      active: 0,
                      completed: 0,
                      totalViews: 0,
                      totalApplications: 0,
                    };

                  return (
                    <CategoryCard
                      key={cat.value}
                      category={
                        cat.value
                      }
                      stats={stats}
                      totalItems={
                        totalCategoryItems
                      }
                      index={index}
                    />
                  );
                }
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================
   Explanation Step
============================================================ */

function ExplanationStep({
  number: stepNumber,
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-300 bg-ink-50 text-[9px] font-black text-ink-400">
        {stepNumber}
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary-500" />

          <p className="text-xs font-black text-ink-800">
            {title}
          </p>
        </div>

        <p className="mt-1 text-[11px] font-medium leading-5 text-ink-400">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Sortable Header
============================================================ */

function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  align = 'left',
  className = '',
}) {
  const clickable =
    field && onSort;

  return (
    <th
      className={`px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-ink-400 ${className} ${
        align === 'right'
          ? 'text-right'
          : 'text-left'
      } ${
        clickable
          ? 'cursor-pointer select-none hover:text-ink-700'
          : ''
      }`}
      onClick={() =>
        clickable && onSort(field)
      }
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === 'right'
            ? 'justify-end'
            : ''
        }`}
      >
        {label}

        {clickable &&
          sortBy === field &&
          (sortOrder === 'desc' ? (
            <ChevronDown className="h-3 w-3 text-primary-600" />
          ) : (
            <ChevronUp className="h-3 w-3 text-primary-600" />
          ))}
      </span>
    </th>
  );
}

/* ============================================================
   Listing Card
============================================================ */

function ListingCard({ item }) {
  const badge = getStatusClasses(
    item.status,
    item.applications_count
  );

  const category = getCategoryByValue(
    item.category
  );

  const CategoryIcon = getCategoryIcon(
    category?.icon
  );

  const conversion = getConversionRate(
    item.views_count,
    item.applications_count
  );

  return (
    <motion.article
      layout
      whileHover={{
        y: -2,
      }}
      className="group flex min-h-[205px] flex-col overflow-hidden rounded-2xl border border-ink-300/80 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {item.donor?.avatar_url ? (
            <img
              src={item.donor.avatar_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-ink-300 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-ink-50">
              <User className="h-4 w-4 text-ink-400" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-ink-900">
              {item.title ||
                'Untitled listing'}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <CategoryIcon className="h-3 w-3 text-primary-500" />

              <span className="truncate text-xs font-medium text-ink-400">
                {item.category ||
                  'Other'}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-ink-300 bg-ink-50/30 p-4">
        <div className="grid grid-cols-3 gap-2">
          <CardMetric
            icon={Eye}
            label="Views"
            value={number(
              item.views_count
            )}
          />

          <CardMetric
            icon={FileText}
            label="Apps"
            value={number(
              item.applications_count
            )}
            warning={
              !item.applications_count
            }
          />

          <CardMetric
            icon={Target}
            label="Rate"
            value={percent(
              conversion
            )}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-ink-400">
            Listed{' '}
            {formatDateStatic(
              item.created_at
            )}
          </span>

          <Link
            to={`/item/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-primary-600 ring-1 ring-ink-100 transition hover:bg-primary-50"
          >
            View listing
            <CircleArrowOutUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function CardMetric({
  icon: Icon,
  label,
  value,
  warning,
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-ink-400">
        <Icon className="h-3 w-3" />

        <span className="text-[9px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p
        className={`mt-1 text-sm font-black ${
          warning
            ? 'text-amber-600'
            : 'text-ink-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatDateStatic(date) {
  if (!date) return 'N/A';

  return new Date(date).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

/* ============================================================
   Empty State
============================================================ */

function EmptyState({ compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact
          ? 'px-5 py-10'
          : 'px-5 py-16'
      }`}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
        <Inbox className="h-5 w-5" />
      </div>

      <p className="text-sm font-black text-ink-600">
        No matching listings
      </p>

      <p className="mt-1 max-w-xs text-xs font-medium leading-5 text-ink-400">
        Try changing the filters or search
        criteria to see more results.
      </p>
    </div>
  );
}

/* ============================================================
   Pagination
============================================================ */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (
        let i = 1;
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(
      2,
      currentPage - 1
    );

    const end = Math.min(
      totalPages - 1,
      currentPage + 1
    );

    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }

    if (
      currentPage <
      totalPages - 2
    ) {
      pages.push('...');
    }

    pages.push(totalPages);

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-ink-300 bg-white p-1 shadow-sm">
      <button
        onClick={() =>
          onPageChange(
            currentPage - 1
          )
        }
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:text-ink-200"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPageNumbers().map(
        (page, index) =>
          page === '...' ? (
            <span
              key={`dots-${index}`}
              className="flex h-8 w-8 items-center justify-center text-sm font-bold text-ink-400"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() =>
                onPageChange(page)
              }
              className={`h-8 w-8 rounded-lg text-xs font-black transition ${
                currentPage === page
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-primary-600'
              }`}
            >
              {page}
            </button>
          )
      )}

      <button
        onClick={() =>
          onPageChange(
            currentPage + 1
          )
        }
        disabled={
          currentPage ===
          totalPages
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:text-ink-200"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default AnalyticsItemPerformance;