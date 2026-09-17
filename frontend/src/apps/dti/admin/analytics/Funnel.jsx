import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Eye,
  FileText,
  Flag,
  Maximize2,
  Package,
  RefreshCw,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { adminAPI } from '@/services/api/dtiApi';
import {
  PageNavigation,
  PageNavigationSkeleton,
} from '@/reusables/PageNavigation';
import Modal from '@/reusables/Modal';

const STAGE_CONFIG = [
  {
    key: 'listed',
    label: 'Items Listed',
    shortLabel: 'Listed',
    description: 'Items successfully published and available for donation.',
    icon: Package,
    tone: 'primary',
    color: 'bg-primary-600',
    soft: 'bg-primary-50',
    border: 'border-primary-200',
    text: 'text-primary-600',
    bar: 'from-primary-500 to-primary-600',
  },
  {
    key: 'viewed',
    label: 'Items Viewed',
    shortLabel: 'Viewed',
    description: 'People who opened and viewed a listed item.',
    icon: Eye,
    tone: 'primary',
    color: 'bg-primary-500',
    soft: 'bg-primary-50',
    border: 'border-primary-200',
    text: 'text-primary-500',
    bar: 'from-primary-400 to-primary-500',
  },
  {
    key: 'applied',
    label: 'Applications',
    shortLabel: 'Applied',
    description: 'People who expressed interest and applied to receive an item.',
    icon: FileText,
    tone: 'brand',
    color: 'bg-brand-500',
    soft: 'bg-brand-50',
    border: 'border-brand-200',
    text: 'text-brand-600',
    bar: 'from-brand-400 to-brand-500',
  },
  {
    key: 'accepted',
    label: 'Applications Accepted',
    shortLabel: 'Accepted',
    description: 'Applications approved by the donor or administrator.',
    icon: CheckCircle2,
    tone: 'success',
    color: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    bar: 'from-emerald-400 to-emerald-500',
  },
  {
    key: 'completed',
    label: 'Donations Completed',
    shortLabel: 'Completed',
    description: 'Accepted donations that reached successful completion.',
    icon: Trophy,
    tone: 'success',
    color: 'bg-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    bar: 'from-emerald-500 to-emerald-600',
  },
];

const RANGE_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const DEFAULT_STAGES = {
  listed: 0,
  viewed: 0,
  applied: 0,
  accepted: 0,
  completed: 0,
};

const DEFAULT_RATES = {
  viewRate: 0,
  applicationRate: 0,
  acceptanceRate: 0,
  completionRate: 0,
};

const formatNumber = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString();
};

const formatPercent = (value, digits = 1) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return '0%';
  }

  return `${number.toFixed(digits)}%`;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const FunnelSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />

    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="animate-pulse">
        <div className="mb-3 h-3 w-32 rounded bg-ink-200" />
        <div className="mb-2 h-9 w-64 rounded-lg bg-ink-200" />
        <div className="h-4 w-96 max-w-full rounded bg-ink-200" />
      </div>

      <div className="h-10 w-72 rounded-xl bg-ink-200 animate-pulse" />
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-ink-100 bg-white p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-ink-200" />
            <div className="h-9 w-9 rounded-xl bg-ink-200" />
          </div>

          <div className="mb-2 h-8 w-24 rounded bg-ink-200" />
          <div className="h-3 w-32 rounded bg-ink-200" />
        </div>
      ))}
    </div>

    <div className="rounded-3xl border border-ink-100 bg-white p-6">
      <div className="mb-7 h-5 w-48 rounded bg-ink-200 animate-pulse" />

      <div className="space-y-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="animate-pulse">
            <div className="mb-2 h-3 w-40 rounded bg-ink-200" />
            <div className="h-16 rounded-2xl bg-ink-100" />
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-ink-100 bg-white p-6"
        >
          <div className="mb-5 h-5 w-40 rounded bg-ink-200 animate-pulse" />
          <div className="h-[280px] rounded-xl bg-ink-100 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyChart = () => (
  <div className="flex h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60">
    <BarChart3 className="mb-3 h-9 w-9 text-ink-300" />
    <p className="text-sm font-bold text-ink-500">
      No trend data available
    </p>
    <p className="mt-1 text-xs font-medium text-ink-400">
      Try a different date range.
    </p>
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  trend,
  accent = 'primary',
}) => {
  const accentClasses = {
    primary: {
      icon: 'bg-primary-50 text-primary-600',
      value: 'text-primary-600',
    },
    brand: {
      icon: 'bg-brand-50 text-brand-600',
      value: 'text-brand-600',
    },
    success: {
      icon: 'bg-emerald-50 text-emerald-600',
      value: 'text-emerald-600',
    },
    warning: {
      icon: 'bg-amber-50 text-amber-600',
      value: 'text-amber-600',
    },
  };

  const classes = accentClasses[accent] || accentClasses.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-400">
            {label}
          </p>

          <p className={`mt-2 text-3xl font-black tracking-tight ${classes.value}`}>
            {value}
          </p>

          <p className="mt-1 text-xs font-medium text-ink-400">
            {description}
          </p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>

      {trend !== undefined && trend !== null && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold">
          {Number(trend) >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}

          <span
            className={
              Number(trend) >= 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }
          >
            {Math.abs(Number(trend)).toFixed(1)}%
          </span>

          <span className="font-medium text-ink-400">
            from previous stage
          </span>
        </div>
      )}
    </motion.div>
  );
};

const FunnelStage = ({
  stage,
  index,
  total,
  value,
  startValue,
  previousValue,
  expanded,
  onToggle,
}) => {
  const Icon = stage.icon;

  const retention =
    startValue > 0 ? (value / startValue) * 100 : index === 0 ? 100 : 0;

  const stageConversion =
    previousValue > 0 ? (value / previousValue) * 100 : index === 0 ? 100 : 0;

  const dropoff =
    previousValue > 0
      ? ((previousValue - value) / previousValue) * 100
      : 0;

  const lost = Math.max(previousValue - value, 0);

  const width =
    index === 0
      ? 100
      : clamp(18 + retention * 0.82, 18, 100);

  return (
    <div>
      {index > 0 && (
        <div className="relative flex items-center justify-center py-3">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink-200" />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${
                dropoff >= 50
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-amber-200 bg-amber-50 text-amber-600'
              }`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span>{formatPercent(dropoff)} drop-off</span>
            </div>

            <span className="mt-1 text-[10px] font-bold text-ink-400">
              {formatNumber(lost)} lost
            </span>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.08 }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="group w-full text-left"
          aria-expanded={expanded}
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stage.soft} ${stage.text}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink-800">
                  {stage.label}
                </p>

                <p className="truncate text-[11px] font-medium text-ink-400">
                  {stage.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-black tracking-tight text-ink-900">
                  {formatNumber(value)}
                </p>

                <p className={`text-[10px] font-black uppercase tracking-wider ${stage.text}`}>
                  {index === 0 ? '100% starting point' : `${formatPercent(retention)} retained`}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-400 transition group-hover:bg-ink-100 group-hover:text-ink-700">
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>

          <div className="relative h-16 overflow-hidden rounded-2xl border border-ink-100 bg-ink-50/70">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{
                duration: 0.9,
                delay: index * 0.08,
                ease: 'easeOut',
              }}
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stage.bar} opacity-90`}
            />

            <div className="absolute inset-0 flex items-center justify-between px-5">
              <div className="flex items-center gap-2 text-white">
                <Icon className="h-4 w-4" strokeWidth={2.4} />

                <span className="text-xs font-black uppercase tracking-wider">
                  {stage.shortLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-white">
                {index > 0 && (
                  <span className="hidden rounded-full bg-black/10 px-2 py-1 text-[10px] font-black sm:inline-flex">
                    {formatPercent(stageConversion)} conversion
                  </span>
                )}

                <ArrowRight className="h-4 w-4 opacity-70" />
              </div>
            </div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className={`mt-3 rounded-2xl border ${stage.border} ${stage.soft} p-4`}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-400">
                      Stage volume
                    </p>
                    <p className="mt-1 text-lg font-black text-ink-900">
                      {formatNumber(value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-400">
                      Retained from start
                    </p>
                    <p className={`mt-1 text-lg font-black ${stage.text}`}>
                      {formatPercent(retention)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-400">
                      Stage conversion
                    </p>
                    <p className="mt-1 text-lg font-black text-ink-900">
                      {index === 0 ? '—' : formatPercent(stageConversion)}
                    </p>
                  </div>
                </div>

                {index > 0 && (
                  <div className="mt-4 border-t border-ink-200/60 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-ink-500">
                        Previous stage
                      </span>

                      <span className="font-black text-ink-800">
                        {formatNumber(previousValue)} → {formatNumber(value)}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${clamp(stageConversion, 0, 100)}%` }}
                        transition={{ duration: 0.7 }}
                        className={`h-full rounded-full bg-gradient-to-r ${stage.bar}`}
                      />
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-ink-400">
                      {formatNumber(lost)} people/items did not move from{' '}
                      <span className="font-bold">{STAGE_CONFIG[index - 1].shortLabel}</span>{' '}
                      to <span className="font-bold">{stage.shortLabel}</span>.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {index === total - 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-ink-100" />

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600">
            <CircleCheck className="h-3.5 w-3.5" />
            Successful outcome
          </div>

          <div className="h-px flex-1 bg-ink-100" />
        </div>
      )}
    </div>
  );
};

const DropoffCard = ({ dropoff, index, onClick }) => {
  const isCritical = dropoff.dropoff >= 50;
  const isModerate = dropoff.dropoff >= 30;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isCritical
          ? 'border-rose-200'
          : isModerate
            ? 'border-amber-200'
            : 'border-ink-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-ink-400">
            Drop-off #{index + 1}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-bold text-ink-600">
              {dropoff.from}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
            <span className="text-xs font-bold text-ink-600">
              {dropoff.to}
            </span>
          </div>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            isCritical
              ? 'bg-rose-50 text-rose-500'
              : isModerate
                ? 'bg-amber-50 text-amber-500'
                : 'bg-ink-50 text-ink-400'
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p
            className={`text-3xl font-black tracking-tight ${
              isCritical
                ? 'text-rose-500'
                : isModerate
                  ? 'text-amber-500'
                  : 'text-ink-800'
            }`}
          >
            {formatPercent(dropoff.dropoff)}
          </p>

          <p className="mt-1 text-[11px] font-medium text-ink-400">
            {formatNumber(dropoff.lost)} lost
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
            isCritical
              ? 'bg-rose-50 text-rose-600'
              : isModerate
                ? 'bg-amber-50 text-amber-600'
                : 'bg-ink-50 text-ink-500'
          }`}
        >
          {isCritical ? 'Critical' : isModerate ? 'Watch' : 'Healthy'}
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamp(dropoff.dropoff, 0, 100)}%` }}
          transition={{ duration: 0.7, delay: index * 0.06 }}
          className={`h-full rounded-full ${
            isCritical
              ? 'bg-rose-400'
              : isModerate
                ? 'bg-amber-400'
                : 'bg-ink-400'
          }`}
        />
      </div>
    </motion.button>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-ink-400">
        {label}
      </p>

      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex min-w-[130px] items-center justify-between gap-5"
          >
            <span className="text-xs font-medium text-ink-500">
              {entry.name}
            </span>

            <span className="text-xs font-black text-ink-900">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FunnelCharts = ({ chartData, onExpand }) => {
  if (!chartData.length) {
    return (
      <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
        <SectionHeading
          icon={BarChart3}
          title="Trend analysis"
          description="See how activity changes throughout the selected period."
          action={
            <button
              type="button"
              onClick={onExpand}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-600 transition hover:bg-primary-50"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand
            </button>
          }
        />

        <EmptyChart />
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
      <SectionHeading
        icon={BarChart3}
        title="Trend analysis"
        description="See how activity changes throughout the selected period."
        action={
          <button
            type="button"
            onClick={onExpand}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-600 transition hover:bg-primary-50"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </button>
        }
      />

      <div className="mt-7 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Users className="h-3.5 w-3.5" />
            </div>

            <div>
              <p className="text-xs font-black text-ink-700">
                Funnel activity
              </p>
              <p className="text-[10px] font-medium text-ink-400">
                Daily volume by stage
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="listedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="viewedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-ink-100"
              />

              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend
                wrapperStyle={{
                  fontSize: 10,
                  paddingTop: 8,
                }}
              />

              <Area
                type="monotone"
                dataKey="items"
                name="Listed"
                stroke="currentColor"
                fill="url(#listedFill)"
                className="text-primary-600"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="viewed"
                name="Viewed"
                stroke="currentColor"
                fill="url(#viewedFill)"
                className="text-primary-400"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="applied"
                name="Applied"
                stroke="currentColor"
                fill="none"
                className="text-brand-500"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Target className="h-3.5 w-3.5" />
            </div>

            <div>
              <p className="text-xs font-black text-ink-700">
                Outcome activity
              </p>
              <p className="text-[10px] font-medium text-ink-400">
                Applications through completion
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-ink-100"
              />

              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend
                wrapperStyle={{
                  fontSize: 10,
                  paddingTop: 8,
                }}
              />

              <Bar
                dataKey="applied"
                name="Applied"
                fill="currentColor"
                className="text-brand-500"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />

              <Line
                type="monotone"
                dataKey="accepted"
                name="Accepted"
                stroke="currentColor"
                className="text-primary-500"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="currentColor"
                className="text-emerald-600"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

const SectionHeading = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>

      <div>
        <h2 className="text-sm font-black text-ink-800">
          {title}
        </h2>

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

const AnalyticsFunnel = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [conversionRates, setConversionRates] = useState(DEFAULT_RATES);
  const [timeseries, setTimeseries] = useState([]);

  const [expandedStage, setExpandedStage] = useState(null);
  const [expandedDropoff, setExpandedDropoff] = useState(null);
  const [showChartModal, setShowChartModal] = useState(false);

  const fetchFunnel = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getFunnelAnalytics(range);
      const data = response?.data?.data || response?.data || {};

      setStages({
        ...DEFAULT_STAGES,
        ...(data.stages || {}),
      });

      setConversionRates({
        ...DEFAULT_RATES,
        ...(data.conversionRates || {}),
      });

      setTimeseries(Array.isArray(data.timeseries) ? data.timeseries : []);
    } catch (error) {
      console.error('Funnel analytics error:', error);
      toast.error('Failed to load funnel analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  const handleRangeChange = (newRange) => {
    if (newRange === range) {
      return;
    }

    setRange(newRange);
    setExpandedStage(null);
    setExpandedDropoff(null);
  };

  const overallRate = useMemo(() => {
    if (!stages.listed) {
      return 0;
    }

    return (Number(stages.completed || 0) / Number(stages.listed)) * 100;
  }, [stages]);

  const stageData = useMemo(
    () =>
      STAGE_CONFIG.map((stage) => ({
        ...stage,
        value: Number(stages[stage.key] || 0),
      })),
    [stages]
  );

  const dropoffs = useMemo(
    () =>
      stageData.slice(1).map((stage, index) => {
        const previous = stageData[index].value;
        const dropoff =
          previous > 0
            ? ((previous - stage.value) / previous) * 100
            : 0;

        return {
          from: stageData[index].label,
          to: stage.label,
          fromKey: stageData[index].key,
          toKey: stage.key,
          dropoff: Math.max(dropoff, 0),
          lost: Math.max(previous - stage.value, 0),
          previous,
          current: stage.value,
        };
      }),
    [stageData]
  );

  const biggestDropoff = useMemo(() => {
    if (!dropoffs.length) {
      return null;
    }

    return dropoffs.reduce((largest, current) =>
      current.dropoff > largest.dropoff ? current : largest
    );
  }, [dropoffs]);

  const strongestStage = useMemo(() => {
    if (!dropoffs.length) {
      return null;
    }

    return dropoffs.reduce((strongest, current) =>
      current.dropoff < strongest.dropoff ? current : strongest
    );
  }, [dropoffs]);

  const chartData = useMemo(
    () =>
      timeseries.map((point) => ({
        ...point,
        dateLabel: point.date?.slice(5) || point.date,
        fullDate: point.date,
      })),
    [timeseries]
  );

  if (loading) {
    return <FunnelSkeleton />;
  }

  return (
    <div className="space-y-5 pb-8">
      <PageNavigation />

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-500" />

            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
              Analytics / Conversion
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-[-0.04em] text-ink-900 sm:text-4xl">
            Donation Funnel
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
            Understand how items move from being listed to becoming
            successfully completed donations — and identify exactly where
            people are dropping off.
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-sm sm:w-auto">
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeChange(option.value)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                  range === option.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchFunnel}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700 disabled:opacity-50"
            aria-label="Refresh analytics"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-brand-50 p-6 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                <Target className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Overall conversion
                </p>

                <p className="text-xs font-bold text-ink-500">
                  Listed → Completed
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-5xl font-black tracking-[-0.05em] text-primary-700">
                {formatPercent(overallRate)}
              </span>

              <span className="mb-1 text-sm font-bold text-ink-500">
                of listed items become completed donations
              </span>
            </div>

            <p className="mt-3 max-w-xl text-xs font-medium leading-5 text-ink-500">
              Out of{' '}
              <strong className="font-black text-ink-800">
                {formatNumber(stages.listed)}
              </strong>{' '}
              listed items,{' '}
              <strong className="font-black text-ink-800">
                {formatNumber(stages.completed)}
              </strong>{' '}
              have reached the final stage in this period.
            </p>
          </div>

          <div className="flex shrink-0 justify-center">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg
                viewBox="0 0 120 120"
                className="h-32 w-32 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="49"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-primary-100"
                />

                <motion.circle
                  cx="60"
                  cy="60"
                  r="49"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 49}
                  initial={{
                    strokeDashoffset: 2 * Math.PI * 49,
                  }}
                  animate={{
                    strokeDashoffset:
                      2 * Math.PI * 49 * (1 - clamp(overallRate, 0, 100) / 100),
                  }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="text-primary-600"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Check className="mb-1 h-5 w-5 text-primary-600" />
                <span className="text-[9px] font-black uppercase tracking-wider text-ink-400">
                  Complete
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-primary-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
              Listings
            </p>
            <p className="mt-1 text-lg font-black text-ink-900">
              {formatNumber(stages.listed)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
              Views
            </p>
            <p className="mt-1 text-lg font-black text-ink-900">
              {formatNumber(stages.viewed)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
              Applications
            </p>
            <p className="mt-1 text-lg font-black text-ink-900">
              {formatNumber(stages.applied)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-ink-400">
              Completed
            </p>
            <p className="mt-1 text-lg font-black text-emerald-600">
              {formatNumber(stages.completed)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Eye}
          label="List → View"
          value={formatPercent(conversionRates.viewRate)}
          description="Visitors who viewed a listing"
          accent="primary"
        />

        <StatCard
          icon={FileText}
          label="View → Apply"
          value={formatPercent(conversionRates.applicationRate)}
          description="Viewers who submitted an application"
          accent="brand"
        />

        <StatCard
          icon={CheckCircle2}
          label="Apply → Accept"
          value={formatPercent(conversionRates.acceptanceRate)}
          description="Applications that were approved"
          accent="success"
        />

        <StatCard
          icon={Trophy}
          label="Accept → Complete"
          value={formatPercent(conversionRates.completionRate)}
          description="Accepted donations completed"
          accent="success"
        />
      </section>

      <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-7">
        <SectionHeading
          icon={Flag}
          title="How the journey performs"
          description="Each stage shows volume, retention, and conversion. Click any stage for details."
        />

        <div className="mt-8">
          <div className="mb-6 hidden grid-cols-[minmax(0,1fr)_auto] gap-4 px-2 sm:grid">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.15em] text-ink-400">
              <span>Journey progression</span>
              <span>Retention from start</span>
            </div>

            <span className="w-8" />
          </div>

          <div className="mx-auto max-w-4xl">
            {stageData.map((stage, index) => (
              <FunnelStage
                key={stage.key}
                stage={stage}
                index={index}
                total={stageData.length}
                value={stage.value}
                startValue={stageData[0].value}
                previousValue={index > 0 ? stageData[index - 1].value : 0}
                expanded={expandedStage === stage.key}
                onToggle={() =>
                  setExpandedStage(
                    expandedStage === stage.key ? null : stage.key
                  )
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-7">
        <SectionHeading
          icon={TrendingDown}
          title="Where are you losing people?"
          description="The largest drop-offs are the stages that deserve the most attention."
        />

        {biggestDropoff ? (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-rose-500">
                    Biggest drop-off
                  </p>

                  <h3 className="mt-1 text-lg font-black text-rose-800">
                    {biggestDropoff.from} → {biggestDropoff.to}
                  </h3>

                  <p className="mt-2 max-w-xl text-xs font-medium leading-5 text-rose-700/80">
                    This is currently the largest point of friction in the
                    journey.{' '}
                    <strong className="font-black">
                      {formatNumber(biggestDropoff.lost)}
                    </strong>{' '}
                    did not progress to the next stage, representing a{' '}
                    <strong className="font-black">
                      {formatPercent(biggestDropoff.dropoff)}
                    </strong>{' '}
                    drop-off.
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-rose-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${clamp(biggestDropoff.dropoff, 0, 100)}%`,
                  }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-rose-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Zap className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-ink-400">
                    Strongest transition
                  </p>

                  <h3 className="mt-1 text-sm font-black text-ink-800">
                    {strongestStage?.from} → {strongestStage?.to}
                  </h3>

                  <p className="mt-2 text-xs font-medium leading-5 text-ink-500">
                    This transition has the lowest drop-off in the current
                    funnel.
                  </p>

                  <p className="mt-3 text-2xl font-black text-emerald-600">
                    {formatPercent(100 - (strongestStage?.dropoff || 0))}
                    <span className="ml-1 text-xs font-bold text-ink-400">
                      retained
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-200 p-8 text-center">
            <Target className="mx-auto mb-2 h-7 w-7 text-ink-300" />
            <p className="text-sm font-bold text-ink-500">
              Not enough data to identify drop-offs.
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dropoffs.map((dropoff, index) => (
            <DropoffCard
              key={`${dropoff.fromKey}-${dropoff.toKey}`}
              dropoff={dropoff}
              index={index}
              onClick={() =>
                setExpandedDropoff(
                  expandedDropoff === index + 1 ? null : index + 1
                )
              }
            />
          ))}
        </div>
      </section>

      <FunnelCharts
        chartData={chartData}
        onExpand={() => setShowChartModal(true)}
      />

      <Modal
        isOpen={showChartModal}
        onClose={() => setShowChartModal(false)}
        title="Funnel Trend Analysis"
        size="xl"
      >
        <div className="space-y-7">
          <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <BarChart3 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-ink-800">
                  Daily funnel activity
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-ink-500">
                  Compare listing activity with views, applications,
                  acceptances, and completed donations throughout the selected
                  period.
                </p>
              </div>
            </div>
          </div>

          {chartData.length ? (
            <>
              <ResponsiveContainer width="100%" height={420}>
                <AreaChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-ink-100"
                  />

                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip content={<ChartTooltip />} />

                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="items"
                    name="Listed"
                    stroke="currentColor"
                    fill="currentColor"
                    className="text-primary-600"
                    fillOpacity={0.08}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="viewed"
                    name="Viewed"
                    stroke="currentColor"
                    fill="currentColor"
                    className="text-primary-400"
                    fillOpacity={0.06}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="applied"
                    name="Applied"
                    stroke="currentColor"
                    fill="currentColor"
                    className="text-brand-500"
                    fillOpacity={0.07}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Accepted"
                    stroke="currentColor"
                    fill="currentColor"
                    className="text-primary-500"
                    fillOpacity={0.06}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="currentColor"
                    fill="currentColor"
                    className="text-emerald-600"
                    fillOpacity={0.08}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {stageData.map((stage) => {
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.key}
                      className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4 text-center"
                    >
                      <div
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${stage.soft} ${stage.text}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-ink-400">
                        {stage.shortLabel}
                      </p>

                      <p className="mt-0.5 text-lg font-black text-ink-900">
                        {formatNumber(stage.value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyChart />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AnalyticsFunnel;
