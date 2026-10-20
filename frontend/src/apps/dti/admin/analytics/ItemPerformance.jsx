// src/admin/AnalyticsItemPerformance.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  FileText,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Package,
  AlertCircle,
  Users,
  List,
  PieChart,
  ExternalLink,
  Inbox,
  User,
  ChevronLeft,
  ChevronRight,
  CircleArrowOutUpRight,
  Activity,
  Target,
  CheckCircle2,
  BarChart3,
  Layers3,
  Info,
  Sparkles,
  Gauge,
  PackageCheck,
  Hourglass,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';

import {
  ITEM_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  ITEM_STATUS_DISPLAY,
  getCategoryByValue,
  getStatusDisplay,
} from '@/utils/constants';

import Select from '@/reusables/Select';
import FilterBar, { ColumnStepper, ViewToggle } from '@/reusables/FilterBar';
import { usePageState } from '@/hooks/usePageState';

const ITEMS_PER_PAGE = 10;

/* ============================================================
   PAGE CONFIG — stable module-level refs
============================================================ */

const URL_DEFAULTS = {
  tab: 'overview',
  range: '30d',
  search: '',
  status: 'all',
  category: 'all',
  sortBy: 'views',
  sortOrder: 'desc',
  page: 1,
};

const FILTER_KEYS = [
  'tab',
  'range',
  'search',
  'status',
  'category',
  'sortBy',
  'sortOrder',
];

const FILTER_RESET = {
  search: '',
  status: 'all',
  category: 'all',
  sortBy: 'views',
  sortOrder: 'desc',
  page: 1,
};

/* ============================================================
   HELPERS
============================================================ */

const number = (value) => Number(value || 0).toLocaleString();

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
  if (icon.includes('toy') || icon.includes('game')) {
    return Sparkles;
  }
  if (icon.includes('sport') || icon.includes('fitness')) {
    return Target;
  }
  if (icon.includes('baby') || icon.includes('child')) {
    return Users;
  }
  if (icon.includes('car') || icon.includes('vehicle')) {
    return PackageCheck;
  }
  return Package;
};

const getStatusClasses = (status, appsCount) => {
  if (!appsCount && status === 'active') {
    return {
      label: 'No applications',
      classes: 'bg-warning-50 text-warning-700 border-warning-200',
      dot: 'bg-warning-500',
    };
  }

  const display = getStatusDisplay(status);

  const colorMap = {
    green: {
      classes: 'bg-success-50 text-success-700 border-success-200',
      dot: 'bg-success-500',
    },
    yellow: {
      classes: 'bg-warning-50 text-warning-700 border-warning-200',
      dot: 'bg-warning-500',
    },
    blue: {
      classes: 'bg-primary-50 text-primary-700 border-primary-200',
      dot: 'bg-primary-500',
    },
    red: {
      classes: 'bg-danger-50 text-danger-700 border-danger-200',
      dot: 'bg-danger-500',
    },
    gray: {
      classes: 'bg-ink-50 text-ink-600 border-ink-200',
      dot: 'bg-ink-400',
    },
  };

  const mapped = colorMap[display?.color] || colorMap.gray;

  return {
    label: display?.label || status || 'Unknown',
    classes: mapped.classes,
    dot: mapped.dot,
  };
};

const formatDateStatic = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/* ============================================================
   SKELETON
============================================================ */

const ItemPerformanceSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="space-y-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-64 animate-pulse rounded-xl bg-ink-200" />
        </div>

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

        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-9 flex-1 animate-pulse rounded-xl bg-ink-100"
              />
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-6 h-5 w-56 animate-pulse rounded bg-ink-200" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-2 h-3 w-40 rounded bg-ink-200" />
                <div className="h-3 w-full rounded-full bg-ink-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   QUICK STAT
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
        {typeof value === 'number' ? number(value) : value}
      </p>
      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </div>
  );
}

/* ============================================================
   PERFORMANCE FUNNEL (unchanged)
============================================================ */

function PerformanceFunnel({ views, applications, zeroApplications }) {
  const conversion = getConversionRate(views, applications);

  const stages = [
    {
      label: 'Listing reach',
      value: views,
      icon: Eye,
      description: 'People who viewed the available listings.',
      color: 'primary',
      width: 100,
    },
    {
      label: 'Application interest',
      value: applications,
      icon: MousePointerClick,
      description: 'Views that turned into an application.',
      color: 'brand',
      width:
        views > 0
          ? Math.max((applications / views) * 100, applications > 0 ? 8 : 0)
          : 0,
    },
    {
      label: 'Conversion',
      value: conversion,
      suffix: '%',
      icon: Target,
      description: 'Overall application rate from views.',
      color: 'success',
      width: Math.max(Math.min(conversion * 4, 100), conversion > 0 ? 8 : 0),
    },
  ];

  const barColors = {
    primary: 'bg-primary-500',
    brand: 'bg-brand-500',
    success: 'bg-success-500',
  };

  return (
    <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
      <div className="border-b border-ink-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Gauge size={15} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                Performance journey
              </span>
            </div>
            <h2 className="text-base font-black tracking-tight text-ink-950">
              How listings move from views to applications
            </h2>
            <p className="mt-1 max-w-2xl text-xs font-bold leading-5 text-ink-500">
              Where listing attention turns into application activity. A large
              gap between views and applications usually means the listing
              needs stronger information, presentation, or relevance.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-primary-200 bg-primary-50/60 px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600">
              Conversion rate
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-primary-700">
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-ink-950">
                        {stage.label}
                      </p>
                      <p className="truncate text-[11px] font-bold text-ink-400">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-lg font-black tracking-tight text-ink-950">
                    {number(stage.value)}
                    {stage.suffix || ''}
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.width}%` }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.1,
                      ease: 'easeOut',
                    }}
                    className={`h-full rounded-full ${
                      barColors[stage.color] || barColors.primary
                    }`}
                  />
                </div>
                {index < stages.length - 1 && (
                  <div className="ml-4 mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    <ChevronDown size={12} />
                    <span>
                      {index === 0
                        ? `${number(
                            Math.max(views - applications, 0)
                          )} views did not become applications`
                        : `${percent(conversion)} of viewed listings generated applications`}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 border-t border-ink-100 pt-5 sm:grid-cols-3">
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
    </section>
  );
}

function FunnelInsight({ icon: Icon, label, value, text, warning }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? 'border-warning-200 bg-warning-50'
          : 'border-ink-100 bg-ink-50/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={13}
          className={warning ? 'text-warning-600' : 'text-ink-500'}
        />
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          {label}
        </span>
      </div>
      <p
        className={`mt-1.5 text-xl font-black tracking-tight ${
          warning ? 'text-warning-700' : 'text-ink-950'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-ink-400">{text}</p>
    </div>
  );
}

/* ============================================================
   PERFORMANCE LIST ROW (unchanged)
============================================================ */

function PerformanceListRow({ item, index, metric = 'views' }) {
  const badge = getStatusClasses(item.status, item.applications_count);
  const category = getCategoryByValue(item.category);
  const CategoryIcon = getCategoryIcon(category?.icon);

  const metricValue =
    metric === 'applications' ? item.applications_count : item.views_count;
  const secondaryValue =
    metric === 'applications' ? item.views_count : item.applications_count;

  return (
    <div className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60 sm:px-6">
      <div className="flex w-5 shrink-0 justify-center text-xs font-black text-ink-300">
        {index + 1}
      </div>

      {item.donor?.avatar_url ? (
        <img
          src={item.donor.avatar_url}
          alt={item.donor.full_name || ''}
          className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
          <User size={14} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-950">
          {item.title || 'Untitled item'}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <CategoryIcon size={12} className="shrink-0 text-primary-500" />
          <span className="truncate text-[11px] font-bold text-ink-400">
            {item.category || 'Other'}
          </span>
          <span className="text-ink-300">·</span>
          <span className="truncate text-[11px] font-bold text-ink-400">
            {item.donor?.full_name || 'Anonymous'}
          </span>
        </div>
      </div>

      <span
        className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-extrabold sm:inline-flex ${badge.classes}`}
      >
        {badge.label}
      </span>

      <div className="w-20 shrink-0 text-right">
        <p className="text-sm font-black text-primary-600">
          {number(metricValue)}
        </p>
        <p className="text-[10px] font-bold text-ink-400">
          {number(secondaryValue)} {metric === 'applications' ? 'views' : 'apps'}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CATEGORY CARD (unchanged)
============================================================ */

function CategoryCard({ category, stats, totalItems, index }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const cat = getCategoryByValue(category);
  const CategoryIcon = getCategoryIcon(cat?.icon);

  const description = CATEGORY_DESCRIPTIONS[category] || '';
  const share = totalItems > 0 ? (stats.total / totalItems) * 100 : 0;
  const conversion = getConversionRate(
    stats.totalViews,
    stats.totalApplications
  );
  const completion =
    stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  const performance =
    conversion >= 5
      ? 'Strong'
      : conversion >= 2
      ? 'Average'
      : stats.totalViews > 0
      ? 'Needs attention'
      : 'No activity';

  const performanceClasses = {
    Strong: 'bg-success-50 text-success-700',
    Average: 'bg-primary-50 text-primary-700',
    'Needs attention': 'bg-warning-50 text-warning-700',
    'No activity': 'bg-ink-50 text-ink-500',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition hover:border-ink-200 hover:shadow-md"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left transition hover:bg-ink-50/60"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <CategoryIcon size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-ink-950">
                {category || 'Other'}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                  performanceClasses[performance]
                }`}
              >
                {performance}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-ink-400">
              {number(stats.total)} listings · {percent(share)} of all listings
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(share, 100)}%` }}
                className="h-full rounded-full bg-primary-500"
              />
            </div>
          </div>
          <div className="shrink-0 text-ink-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniMetric label="Views" value={number(stats.totalViews)} />
          <MiniMetric label="Apps" value={number(stats.totalApplications)} />
          <MiniMetric label="Rate" value={percent(conversion)} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-100 bg-ink-50/50 px-5 pb-5 pt-4">
              {description && (
                <div className="mb-4 flex gap-2 rounded-2xl border border-ink-100 bg-white p-3">
                  <Info size={13} className="mt-0.5 shrink-0 text-primary-500" />
                  <p className="text-[11px] font-bold leading-5 text-ink-500">
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
      <p className="text-[9px] font-extrabold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black text-ink-900">{value}</p>
    </div>
  );
}

function CategoryMetric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
      <Icon size={14} className="mb-2 text-primary-500" />
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   ATTENTION PANEL (unchanged)
============================================================ */

function AttentionPanel({ zeroApplications, pendingItems, totalItems }) {
  const zeroRate = totalItems > 0 ? (zeroApplications / totalItems) * 100 : 0;
  const severity =
    zeroRate >= 20 ? 'high' : zeroRate >= 10 ? 'medium' : 'low';

  const containerClasses =
    severity === 'high'
      ? 'border-danger-200 bg-danger-50'
      : severity === 'medium'
      ? 'border-warning-200 bg-warning-50'
      : 'border-ink-100 bg-white';

  const iconClasses =
    severity === 'high'
      ? 'bg-danger-100 text-danger-600'
      : severity === 'medium'
      ? 'bg-warning-100 text-warning-600'
      : 'bg-primary-50 text-primary-600';

  return (
    <div
      className={`overflow-hidden rounded-[26px] border shadow-sm ${containerClasses}`}
    >
      <div className="border-b border-ink-100 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
          >
            <AlertTriangle size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
              Attention required
            </p>
            <h2 className="mt-1 text-base font-black text-ink-950">
              {severity === 'high'
                ? 'A significant number of listings are not converting'
                : severity === 'medium'
                ? 'Some listings may need attention'
                : 'Listing health looks relatively stable'}
            </h2>
            <p className="mt-1 text-xs font-bold leading-5 text-ink-500">
              Use these signals to identify listings that may need better
              descriptions, images, pricing, categorisation, or moderation.
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

function AttentionMetric({ icon: Icon, value, label, detail, warning }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-tight text-ink-950">
            {number(value)}
          </p>
          <p className="mt-1 text-sm font-extrabold text-ink-800">{label}</p>
          <p className="mt-0.5 text-[11px] font-bold text-ink-400">{detail}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            warning
              ? 'bg-warning-50 text-warning-600'
              : 'bg-ink-50 text-ink-500'
          }`}
        >
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AnalyticsItemPerformance = () => {
  /* ---------- URL + localStorage state ---------- */
  const {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    gridCols,
    setGridCols,
    filtersExpanded,
    setFiltersExpanded,
  } = usePageState({
    namespace: 'admin.analyticsItemPerformance',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    tab: activeTab,
    range,
    search: searchTerm,
    status: statusFilter,
    category: categoryFilter,
    sortBy,
    sortOrder,
    page: currentPage,
  } = filters;

  /* ---------- grid style derived from persisted gridCols ---------- */
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }),
    [gridCols]
  );

  /* ---------- data state ---------- */
  const [loading, setLoading] = useState(true);
  const [topByViews, setTopByViews] = useState([]);
  const [topByApplications, setTopByApplications] = useState([]);
  const [zeroApplicationItems, setZeroApplicationItems] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [allItemsStats, setAllItemsStats] = useState(null);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchItemPerformance = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getItemPerformance(range);
      const data = response?.data?.data || response?.data || {};

      setTopByViews(data.topByViews || []);
      setTopByApplications(data.topByApplications || []);
      setZeroApplicationItems(data.zeroApplicationItems || []);
      setPendingItems(data.stuckItems || []);
      setCategoryPerformance(data.categories || []);

      const allItems = [
        ...(data.topByViews || []),
        ...(data.topByApplications || []),
        ...(data.zeroApplicationItems || []),
        ...(data.stuckItems || []),
      ];

      const uniqueItems = [
        ...new Map(allItems.map((item) => [item.id, item])).values(),
      ];

      const totalApps = uniqueItems.reduce(
        (sum, item) => sum + Number(item.applications_count || 0),
        0
      );
      const zeroApps = uniqueItems.filter(
        (item) =>
          !item.applications_count || Number(item.applications_count) === 0
      ).length;
      const pending = uniqueItems.filter((item) => item.status === 'pending')
        .length;
      const totalViews = uniqueItems.reduce(
        (sum, item) => sum + Number(item.views_count || 0),
        0
      );

      setAllItemsStats({
        totalItems: uniqueItems.length,
        totalApps,
        totalViews,
        avgAppsPerItem:
          uniqueItems.length > 0
            ? (totalApps / uniqueItems.length).toFixed(1)
            : '0',
        conversionRate: getConversionRate(totalViews, totalApps),
        zeroAppCount: zeroApps,
        pendingCount: pending,
      });
    } catch (error) {
      console.error('Item performance error:', error);
      toast.error('Failed to load item performance');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchItemPerformance();
  }, [fetchItemPerformance]);

  /* ============================================================
     COMBINED ITEMS
  ============================================================ */

  const allItems = useMemo(() => {
    const combined = [
      ...topByViews.map((item) => ({ ...item, source: 'topViews' })),
      ...topByApplications.map((item) => ({ ...item, source: 'topApps' })),
      ...zeroApplicationItems.map((item) => ({ ...item, source: 'zeroApps' })),
      ...pendingItems.map((item) => ({ ...item, source: 'pending' })),
    ];

    return [...new Map(combined.map((item) => [item.id, item])).values()];
  }, [topByViews, topByApplications, zeroApplicationItems, pendingItems]);

  /* ============================================================
     FILTER OPTIONS
  ============================================================ */

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All Statuses' },
      ...Object.entries(ITEM_STATUS_DISPLAY).map(([value, display]) => ({
        value,
        label: display.label,
      })),
      { value: 'zeroApps', label: 'No Applications' },
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'All Categories' },
      ...ITEM_CATEGORIES.map((cat) => ({
        value: cat.value,
        label: cat.label,
        description: CATEGORY_DESCRIPTIONS[cat.value] || '',
      })),
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'views', label: 'Most Views', icon: Eye },
      { value: 'applications', label: 'Most Applications', icon: FileText },
      { value: 'date', label: 'Newest First', icon: ArrowDown },
      { value: 'title', label: 'Title A-Z', icon: ArrowUpDown },
    ],
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (searchTerm) count++;
    if (sortBy !== 'views') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [statusFilter, categoryFilter, searchTerm, sortBy, sortOrder]);

  const activeFilterChips = [
    statusFilter !== 'all' && {
      key: 'status',
      label:
        statusOptions.find((o) => o.value === statusFilter)?.label ||
        statusFilter,
      onRemove: () => setFilters({ status: 'all' }),
    },
    categoryFilter !== 'all' && {
      key: 'category',
      label:
        categoryOptions.find((o) => o.value === categoryFilter)?.label ||
        categoryFilter,
      onRemove: () => setFilters({ category: 'all' }),
    },
    searchTerm && {
      key: 'search',
      label: `Search: ${searchTerm}`,
      onRemove: () => setFilters({ search: '' }),
    },
    sortBy !== 'views' && {
      key: 'sort',
      label: sortOptions.find((o) => o.value === sortBy)?.label || sortBy,
      onRemove: () => setFilters({ sortBy: 'views' }),
    },
    sortOrder !== 'desc' && {
      key: 'order',
      label: sortOrder === 'asc' ? 'Ascending' : 'Descending',
      onRemove: () => setFilters({ sortOrder: 'desc' }),
    },
  ].filter(Boolean);

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  /* ============================================================
     FILTERED / SORTED ITEMS
  ============================================================ */

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term) ||
          item.donor?.full_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'zeroApps') {
        result = result.filter(
          (item) =>
            !item.applications_count || Number(item.applications_count) === 0
        );
      } else {
        result = result.filter((item) => item.status === statusFilter);
      }
    }

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'views':
          comparison =
            Number(a.views_count || 0) - Number(b.views_count || 0);
          break;
        case 'applications':
          comparison =
            Number(a.applications_count || 0) -
            Number(b.applications_count || 0);
          break;
        case 'date':
          comparison =
            new Date(a.created_at || 0) - new Date(b.created_at || 0);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
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

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setFilters({ sortOrder: sortOrder === 'desc' ? 'asc' : 'desc' });
    } else {
      setFilters({ sortBy: field, sortOrder: 'desc' });
    }
  };

  /* ============================================================
     CATEGORY STATS
  ============================================================ */

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

    if (Array.isArray(categoryPerformance)) {
      categoryPerformance.forEach((cat) => {
        if (!cat?.category) return;
        map[cat.category] = {
          total: Number(cat.total || 0),
          active: Number(cat.active || 0),
          completed: Number(cat.completed || 0),
          totalViews: Number(cat.totalViews || 0),
          totalApplications: Number(cat.totalApplications || 0),
        };
      });
    }

    return map;
  }, [categoryPerformance]);

  const totalCategoryItems = useMemo(
    () =>
      Object.values(categoryStatsMap).reduce(
        (sum, stats) => sum + Number(stats.total || 0),
        0
      ),
    [categoryStatsMap]
  );

  const categoryChartData = useMemo(() => {
    return Object.entries(categoryStatsMap)
      .filter(([, stats]) => stats.total > 0)
      .map(([name, stats]) => ({
        name: name.length > 15 ? `${name.slice(0, 15)}…` : name,
        fullName: name,
        total: stats.total,
        completed: stats.completed,
        applications: stats.totalApplications,
      }));
  }, [categoryStatsMap]);

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) return <ItemPerformanceSkeleton />;

  const totalViews = allItemsStats?.totalViews || 0;
  const totalApps = allItemsStats?.totalApps || 0;
  const conversionRate = allItemsStats?.conversionRate || 0;
  const zeroApps = allItemsStats?.zeroAppCount || 0;
  const pending = allItemsStats?.pendingCount || 0;

  const RANGES = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
  ];

  const TABS = [
    {
      key: 'overview',
      label: 'Performance Overview',
      short: 'Overview',
      icon: Activity,
    },
    { key: 'all', label: 'All Listings', short: 'All', icon: List },
    {
      key: 'categories',
      label: 'Category Performance',
      short: 'Categories',
      icon: PieChart,
    },
  ];

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
                <BarChart3 size={14} />
                <span>Analytics · Item performance</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Item Performance
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Which listings are performing</span>
                <span className="text-ink-300">·</span>
                <span>Reach, interest, and conversion</span>
              </p>
            </div>

            <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
              {RANGES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilters({ range: value })}
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
        </header>

        {/* KPI CARDS */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickStat
            label="Listings Analyzed"
            value={allItemsStats?.totalItems || 0}
            icon={Package}
            subtext="Items in the current dataset"
            tone="ink"
          />
          <QuickStat
            label="Total Views"
            value={totalViews}
            icon={Eye}
            subtext="Listing attention received"
            tone="primary"
          />
          <QuickStat
            label="Applications"
            value={totalApps}
            icon={FileText}
            subtext={`${allItemsStats?.avgAppsPerItem || '0'} per listing`}
            tone="success"
          />
          <QuickStat
            label="Conversion Rate"
            value={percent(conversionRate)}
            icon={Target}
            subtext="Views becoming applications"
            tone="success"
          />
        </section>

        {/* TABS */}
        <div className="rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilters({ tab: tab.key })}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          {/* ============ OVERVIEW ============ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <PerformanceFunnel
                views={totalViews}
                applications={totalApps}
                zeroApplications={zeroApps}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <div className="border-b border-ink-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <Eye size={15} />
                          </div>
                          <h2 className="text-sm font-extrabold text-ink-950">
                            Most discovered
                          </h2>
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-ink-400">
                          Listings receiving the most attention. High views
                          indicate strong reach, but do not necessarily mean
                          strong conversion.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            tab: 'all',
                            sortBy: 'views',
                            sortOrder: 'desc',
                          })
                        }
                        className="shrink-0 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-ink-100">
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

                <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <div className="border-b border-ink-100 px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-50 text-success-600">
                            <Target size={15} />
                          </div>
                          <h2 className="text-sm font-extrabold text-ink-950">
                            Most effective
                          </h2>
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-ink-400">
                          Listings attracting the most applications. These are
                          useful examples of what is resonating with users.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            tab: 'all',
                            sortBy: 'applications',
                            sortOrder: 'desc',
                          })
                        }
                        className="shrink-0 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-ink-100">
                    {topByApplications.length === 0 ? (
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
                totalItems={allItemsStats?.totalItems || 0}
              />

              {categoryChartData.length > 0 && (
                <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <div className="border-b border-ink-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <BarChart3 size={15} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-extrabold text-ink-950">
                          Category performance
                        </h2>
                        <p className="mt-1 max-w-2xl text-[11px] font-bold leading-5 text-ink-400">
                          Compare how many listings each category contains
                          against how many have reached completion.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={categoryChartData}
                        layout="vertical"
                        margin={{ left: 90, right: 20, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{
                            fontSize: 10,
                            fill: '#94a3b8',
                            fontWeight: 600,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{
                            fontSize: 10,
                            fill: '#94a3b8',
                            fontWeight: 600,
                          }}
                          width={85}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #e2e8f0',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          formatter={(value, name) => [
                            number(value),
                            name === 'completed'
                              ? 'Completed'
                              : 'Total listings',
                          ]}
                          labelFormatter={(label, payload) =>
                            payload?.[0]?.payload?.fullName || label
                          }
                        />
                        <Bar
                          dataKey="total"
                          name="total"
                          radius={[0, 6, 6, 0]}
                          barSize={12}
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={index} fill="#8b5cf6" />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="completed"
                          name="completed"
                          radius={[0, 6, 6, 0]}
                          barSize={12}
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={index} fill="#6366f1" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ============ ALL ITEMS ============ */}
          {activeTab === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <FilterBar
                searchValue={searchTerm}
                onSearchChange={(v) => setFilters({ search: v })}
                searchPlaceholder="Search listings, categories or donors..."
                filtersOpen={filtersExpanded}
                onToggleFilters={() => setFiltersExpanded((v) => !v)}
                activeFilterCount={activeFilterCount}
                onRefresh={fetchItemPerformance}
                refreshing={loading}
                activeFilters={activeFilterChips}
                onClearAll={clearAllFilters}
																rightSlot={<ViewToggle value={viewMode} onChange={setViewMode} />}
              >
                <div
                  className={`grid gap-4 ${
                    viewMode === 'cards'
                      ? 'md:grid-cols-2 lg:grid-cols-4'
                      : 'md:grid-cols-3'
                  }`}
                >
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(v) => setFilters({ status: v })}
                    placeholder="All Statuses"
                    showIcon
                  />

                  <Select
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={(v) => setFilters({ category: v })}
                    placeholder="All Categories"
                    showIcon
                    searchable
                  />

                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        options={sortOptions}
                        value={sortBy}
                        onChange={(v) => setFilters({ sortBy: v })}
                        placeholder="Sort By"
                        showIcon
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
                        })
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
                      title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      {sortOrder === 'asc' ? (
                        <ArrowUp size={15} />
                      ) : (
                        <ArrowDown size={15} />
                      )}
                    </button>
                  </div>

                  {viewMode === 'cards' && (
                    <ColumnStepper
                      label="Grid columns"
                      value={gridCols}
                      onChange={setGridCols}
                      min={1}
                      max={4}
                    />
                  )}

                </div>
              </FilterBar>

              {/* RESULT SUMMARY */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-ink-500">
                  {filteredItems.length === allItems.length
                    ? filteredItems.length === 1
                      ? '1 listing'
                      : `${number(filteredItems.length)} listings`
                    : `Showing ${number(filteredItems.length)} of ${number(
                        allItems.length
                      )} listings`}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* TABLE VIEW */}
              {viewMode === 'table' ? (
                <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60">
                          <SortableHeader label="#" className="w-10" />
                          <SortableHeader label="Listing" />
                          <SortableHeader label="Status" />
                          <SortableHeader
                            label="Views"
                            field="views"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            align="right"
                          />
                          <SortableHeader
                            label="Applications"
                            field="applications"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            align="right"
                          />
                          <SortableHeader
                            label="Listed"
                            field="date"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            align="right"
                          />
                          <SortableHeader label="" className="w-14" />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-ink-100">
                        {paginatedItems.length === 0 ? (
                          <tr>
                            <td colSpan={7}>
                              <EmptyState />
                            </td>
                          </tr>
                        ) : (
                          paginatedItems.map((item, index) => {
                            const badge = getStatusClasses(
                              item.status,
                              item.applications_count
                            );
                            const category = getCategoryByValue(item.category);
                            const CategoryIcon = getCategoryIcon(
                              category?.icon
                            );
                            const globalIndex =
                              (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                            return (
                              <tr
                                key={item.id}
                                className="transition hover:bg-ink-50/60"
                              >
                                <td className="px-5 py-3.5 text-xs font-black text-ink-300">
                                  {globalIndex}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex min-w-[260px] items-center gap-3">
                                    {item.donor?.avatar_url ? (
                                      <img
                                        src={item.donor.avatar_url}
                                        alt=""
                                        className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                                        <User size={14} />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-extrabold text-ink-950">
                                        {item.title}
                                      </p>
                                      <div className="mt-1 flex items-center gap-1.5">
                                        <CategoryIcon
                                          size={11}
                                          className="shrink-0 text-primary-500"
                                        />
                                        <span className="truncate text-[11px] font-bold text-ink-400">
                                          {item.category}
                                        </span>
                                        <span className="text-ink-300">·</span>
                                        <span className="truncate text-[11px] font-bold text-ink-400">
                                          {item.donor?.full_name || 'Anonymous'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.classes}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                                    />
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right text-sm font-black text-ink-950">
                                  {number(item.views_count)}
                                </td>
                                <td
                                  className={`px-5 py-3.5 text-right text-sm font-black ${
                                    !item.applications_count
                                      ? 'text-warning-600'
                                      : 'text-ink-950'
                                  }`}
                                >
                                  {number(item.applications_count)}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-bold text-ink-400">
                                  {formatDateStatic(item.created_at)}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <Link
                                    to={`/item/${item.id}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                                    title="View listing"
                                  >
                                    <ExternalLink size={15} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* CARD GRID */
                <motion.div
                  className="grid gap-4"
                  animate={gridStyle}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {paginatedItems.length === 0 ? (
                    <div className="col-span-full rounded-[26px] border border-dashed border-ink-200 bg-white">
                      <EmptyState />
                    </div>
                  ) : (
                    paginatedItems.map((item) => (
                      <ListingCard key={item.id} item={item} />
                    ))
                  )}
                </motion.div>
              )}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-ink-500">
                    Showing{' '}
                    <span className="font-extrabold text-ink-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>
                    –
                    <span className="font-extrabold text-ink-700">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredItems.length
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-extrabold text-ink-700">
                      {number(filteredItems.length)}
                    </span>
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setFilters({ page })}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ============ CATEGORIES ============ */}
          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <PieChart size={17} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black tracking-tight text-ink-950">
                      Category Performance
                    </h2>
                    <p className="mt-1 max-w-3xl text-xs font-bold leading-5 text-ink-500">
                      Categories show where listing activity is concentrated.
                      Expand a category to see its reach, applications,
                      completion and conversion performance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ITEM_CATEGORIES.map((cat, index) => {
                  const stats = categoryStatsMap[cat.value] || {
                    total: 0,
                    active: 0,
                    completed: 0,
                    totalViews: 0,
                    totalApplications: 0,
                  };
                  return (
                    <CategoryCard
                      key={cat.value}
                      category={cat.value}
                      stats={stats}
                      totalItems={totalCategoryItems}
                      index={index}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ============================================================
   SORTABLE HEADER
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
  const clickable = field && onSort;

  return (
    <th
      className={`px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 ${className} ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${clickable ? 'cursor-pointer select-none hover:text-ink-700' : ''}`}
      onClick={() => clickable && onSort(field)}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        {label}
        {clickable &&
          sortBy === field &&
          (sortOrder === 'desc' ? (
            <ChevronDown size={12} className="text-primary-600" />
          ) : (
            <ChevronUp size={12} className="text-primary-600" />
          ))}
      </span>
    </th>
  );
}

/* ============================================================
   LISTING CARD
============================================================ */

function ListingCard({ item }) {
  const badge = getStatusClasses(item.status, item.applications_count);
  const category = getCategoryByValue(item.category);
  const CategoryIcon = getCategoryIcon(category?.icon);
  const conversion = getConversionRate(
    item.views_count,
    item.applications_count
  );

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      className="group flex min-h-[205px] flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {item.donor?.avatar_url ? (
            <img
              src={item.donor.avatar_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
              <User size={14} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink-950">
              {item.title || 'Untitled listing'}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <CategoryIcon size={11} className="text-primary-500" />
              <span className="truncate text-[11px] font-bold text-ink-400">
                {item.category || 'Other'}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-ink-100 bg-ink-50/50 p-4">
        <div className="grid grid-cols-3 gap-2">
          <CardMetric
            icon={Eye}
            label="Views"
            value={number(item.views_count)}
          />
          <CardMetric
            icon={FileText}
            label="Apps"
            value={number(item.applications_count)}
            warning={!item.applications_count}
          />
          <CardMetric
            icon={Target}
            label="Rate"
            value={percent(conversion)}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-ink-400">
            Listed {formatDateStatic(item.created_at)}
          </span>
          <Link
            to={`/item/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-primary-600 ring-1 ring-ink-200 transition hover:bg-primary-50"
          >
            View listing
            <CircleArrowOutUpRight size={11} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function CardMetric({ icon: Icon, label, value, warning }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-ink-400">
        <Icon size={11} />
        <span className="text-[9px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 text-sm font-black ${
          warning ? 'text-warning-600' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'px-5 py-10' : 'px-5 py-16'
      }`}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
        <Inbox size={22} />
      </div>
      <p className="text-sm font-extrabold text-ink-950">No matching listings</p>
      <p className="mt-1 max-w-xs text-xs font-bold leading-5 text-ink-400">
        Try changing the filters or search criteria to see more results.
      </p>
    </div>
  );
}

/* ============================================================
   PAGINATION
============================================================ */

function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50 hover:text-primary-600'
        }`}
      >
        <ChevronLeft size={14} />
      </button>

      {getPageNumbers().map((page, index) =>
        page === '...' ? (
          <span
            key={`dots-${index}`}
            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-ink-300"
          >
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold transition ${
              currentPage === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-ink-500 hover:bg-ink-50 hover:text-primary-600'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50 hover:text-primary-600'
        }`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default AnalyticsItemPerformance;