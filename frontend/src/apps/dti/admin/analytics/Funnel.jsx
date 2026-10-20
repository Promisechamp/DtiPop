// src/admin/AnalyticsFunnel.jsx

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
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { adminAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';

/* ============================================================
   CONSTANTS
============================================================ */

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
    color: 'bg-success-500',
    soft: 'bg-success-50',
    border: 'border-success-200',
    text: 'text-success-600',
    bar: 'from-success-400 to-success-500',
  },
  {
    key: 'completed',
    label: 'Donations Completed',
    shortLabel: 'Completed',
    description: 'Accepted donations that reached successful completion.',
    icon: Trophy,
    tone: 'success',
    color: 'bg-success-600',
    soft: 'bg-success-50',
    border: 'border-success-200',
    text: 'text-success-700',
    bar: 'from-success-500 to-success-600',
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

/* ============================================================
   FORMATTERS
============================================================ */

const formatNumber = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString();
};

const formatPercent = (value, digits = 1) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0%';
  return `${number.toFixed(digits)}%`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ============================================================
   SKELETON
============================================================ */

const FunnelSkeleton = () => (
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
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-64 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-24 animate-pulse rounded-full bg-ink-100" />
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
              </div>
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-ink-100" />
              <div className="mt-1.5 h-2.5 w-32 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* FUNNEL */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="mb-7 h-5 w-48 animate-pulse rounded bg-ink-200" />

          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-2 h-3 w-40 rounded bg-ink-200" />
                <div className="h-16 rounded-2xl bg-ink-100" />
              </div>
            ))}
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 h-5 w-40 animate-pulse rounded bg-ink-200" />
              <div className="h-[280px] animate-pulse rounded-xl bg-ink-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   EMPTY CHART
============================================================ */

const EmptyChart = () => (
  <div className="flex h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60">
    <BarChart3 className="mb-3 h-9 w-9 text-ink-300" />
    <p className="text-sm font-bold text-ink-500">No trend data available</p>
    <p className="mt-1 text-xs font-medium text-ink-400">
      Try a different date range.
    </p>
  </div>
);

/* ============================================================
   STAT CARD (matches AdminUsers)
============================================================ */

const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  trend,
  tone = 'primary',
}) => {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
    brand: { color: 'text-brand-600', bg: 'bg-brand-50' },
  };

  const style = tones[tone] || tones.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
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
        {value}
      </p>

      {description && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">
          {description}
        </p>
      )}

      {trend !== undefined && trend !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold">
          {Number(trend) >= 0 ? (
            <TrendingUp size={11} className="text-success-500" />
          ) : (
            <TrendingDown size={11} className="text-danger-500" />
          )}

          <span
            className={
              Number(trend) >= 0 ? 'text-success-600' : 'text-danger-600'
            }
          >
            {Math.abs(Number(trend)).toFixed(1)}%
          </span>

          <span className="text-ink-400">from previous stage</span>
        </div>
      )}
    </motion.div>
  );
};

/* ============================================================
   SECTION HEADING
============================================================ */

const SectionHeading = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon size={15} strokeWidth={2.2} />
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
   FUNNEL STAGE
============================================================ */

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
    previousValue > 0 ? ((previousValue - value) / previousValue) * 100 : 0;

  const lost = Math.max(previousValue - value, 0);

  const width = index === 0 ? 100 : clamp(18 + retention * 0.82, 18, 100);

  return (
    <div>
      {index > 0 && (
        <div className="relative flex items-center justify-center py-3">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink-200" />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-sm ${
                dropoff >= 50
                  ? 'border-danger-200 bg-danger-50 text-danger-700'
                  : 'border-warning-200 bg-warning-50 text-warning-700'
              }`}
            >
              <ArrowDown size={13} />
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
                <Icon size={17} strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink-950">
                  {stage.label}
                </p>

                <p className="truncate text-[11px] font-bold text-ink-400">
                  {stage.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-black tracking-tight text-ink-950">
                  {formatNumber(value)}
                </p>

                <p
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${stage.text}`}
                >
                  {index === 0
                    ? '100% starting point'
                    : `${formatPercent(retention)} retained`}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-400 transition group-hover:bg-ink-100 group-hover:text-ink-700">
                {expanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
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
                <Icon size={15} strokeWidth={2.4} />

                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {stage.shortLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-white">
                {index > 0 && (
                  <span className="hidden rounded-full bg-black/10 px-2 py-1 text-[10px] font-extrabold sm:inline-flex">
                    {formatPercent(stageConversion)} conversion
                  </span>
                )}

                <ArrowRight size={15} className="opacity-70" />
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
              <div
                className={`mt-3 rounded-2xl border ${stage.border} ${stage.soft} p-4`}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-500">
                      Stage volume
                    </p>
                    <p className="mt-1 text-lg font-black text-ink-950">
                      {formatNumber(value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-500">
                      Retained from start
                    </p>
                    <p className={`mt-1 text-lg font-black ${stage.text}`}>
                      {formatPercent(retention)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-500">
                      Stage conversion
                    </p>
                    <p className="mt-1 text-lg font-black text-ink-950">
                      {index === 0 ? '—' : formatPercent(stageConversion)}
                    </p>
                  </div>
                </div>

                {index > 0 && (
                  <div className="mt-4 border-t border-ink-200/60 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-ink-500">
                        Previous stage
                      </span>

                      <span className="font-extrabold text-ink-800">
                        {formatNumber(previousValue)} → {formatNumber(value)}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${clamp(stageConversion, 0, 100)}%`,
                        }}
                        transition={{ duration: 0.7 }}
                        className={`h-full rounded-full bg-gradient-to-r ${stage.bar}`}
                      />
                    </div>

                    <p className="mt-2 text-[11px] font-bold text-ink-400">
                      {formatNumber(lost)} people/items did not move from{' '}
                      <span className="font-extrabold">
                        {STAGE_CONFIG[index - 1].shortLabel}
                      </span>{' '}
                      to <span className="font-extrabold">{stage.shortLabel}</span>.
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

          <div className="flex items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-success-700">
            <CircleCheck size={13} />
            Successful outcome
          </div>

          <div className="h-px flex-1 bg-ink-100" />
        </div>
      )}
    </div>
  );
};

/* ============================================================
   DROPOFF CARD
============================================================ */

const DropoffCard = ({ dropoff, index }) => {
  const isCritical = dropoff.dropoff >= 50;
  const isModerate = dropoff.dropoff >= 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md ${
        isCritical
          ? 'border-danger-200'
          : isModerate
          ? 'border-warning-200'
          : 'border-ink-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
            Drop-off #{index + 1}
          </p>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="truncate text-xs font-bold text-ink-600">
              {dropoff.from}
            </span>
            <ArrowRight size={11} className="shrink-0 text-ink-300" />
            <span className="truncate text-xs font-bold text-ink-600">
              {dropoff.to}
            </span>
          </div>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isCritical
              ? 'bg-danger-50 text-danger-600'
              : isModerate
              ? 'bg-warning-50 text-warning-600'
              : 'bg-ink-50 text-ink-400'
          }`}
        >
          {isCritical ? (
            <AlertTriangle size={15} />
          ) : (
            <TrendingDown size={15} />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p
            className={`text-2xl font-black tracking-tight ${
              isCritical
                ? 'text-danger-600'
                : isModerate
                ? 'text-warning-600'
                : 'text-ink-900'
            }`}
          >
            {formatPercent(dropoff.dropoff)}
          </p>

          <p className="mt-0.5 text-[10px] font-bold text-ink-400">
            {formatNumber(dropoff.lost)} lost
          </p>
        </div>

        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
            isCritical
              ? 'bg-danger-50 text-danger-700'
              : isModerate
              ? 'bg-warning-50 text-warning-700'
              : 'bg-ink-50 text-ink-600'
          }`}
        >
          {isCritical ? 'Critical' : isModerate ? 'Watch' : 'Healthy'}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamp(dropoff.dropoff, 0, 100)}%` }}
          transition={{ duration: 0.7, delay: index * 0.06 }}
          className={`h-full rounded-full ${
            isCritical
              ? 'bg-danger-500'
              : isModerate
              ? 'bg-warning-500'
              : 'bg-ink-400'
          }`}
        />
      </div>
    </motion.div>
  );
};

/* ============================================================
   CHART TOOLTIP
============================================================ */

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
        {label}
      </p>

      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex min-w-[130px] items-center justify-between gap-5"
          >
            <span className="text-xs font-bold text-ink-500">{entry.name}</span>

            <span className="text-xs font-extrabold text-ink-950">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   FUNNEL CHARTS
============================================================ */

const FunnelCharts = ({ chartData, onExpand }) => {
  if (!chartData.length) {
    return (
      <section className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
        <SectionHeading
          icon={BarChart3}
          title="Trend analysis"
          description="See how activity changes throughout the selected period."
          action={
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
            >
              <Maximize2 size={11} />
              Expand
            </button>
          }
        />

        <div className="mt-5">
          <EmptyChart />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
      <SectionHeading
        icon={BarChart3}
        title="Trend analysis"
        description="See how activity changes throughout the selected period."
        action={
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
          >
            <Maximize2 size={11} />
            Expand
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Users size={13} />
            </div>

            <div>
              <p className="text-xs font-extrabold text-ink-800">
                Funnel activity
              </p>
              <p className="text-[10px] font-bold text-ink-400">
                Daily volume by stage
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="listedFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity={0}
                  />
                </linearGradient>

                <linearGradient
                  id="viewedFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity={0.14}
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, fontWeight: 700 }} />

              <Area
                type="monotone"
                dataKey="items"
                name="Listed"
                stroke="#6366f1"
                fill="url(#listedFill)"
                className="text-primary-600"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="viewed"
                name="Viewed"
                stroke="#818cf8"
                fill="url(#viewedFill)"
                className="text-primary-400"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="applied"
                name="Applied"
                stroke="#8b5cf6"
                fill="none"
                className="text-brand-500"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-50 text-success-600">
              <Target size={13} />
            </div>

            <div>
              <p className="text-xs font-extrabold text-ink-800">
                Outcome activity
              </p>
              <p className="text-[10px] font-bold text-ink-400">
                Applications through completion
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, fontWeight: 700 }} />

              <Bar
                dataKey="applied"
                name="Applied"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />

              <Line
                type="monotone"
                dataKey="accepted"
                name="Accepted"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#059669"
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

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AnalyticsFunnel = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [conversionRates, setConversionRates] = useState(DEFAULT_RATES);
  const [timeseries, setTimeseries] = useState([]);

  const [expandedStage, setExpandedStage] = useState(null);
  const [showChartModal, setShowChartModal] = useState(false);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchFunnel = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminAPI.getFunnelAnalytics(range);
      const data = response?.data?.data || response?.data || {};

      setStages({ ...DEFAULT_STAGES, ...(data.stages || {}) });
      setConversionRates({ ...DEFAULT_RATES, ...(data.conversionRates || {}) });
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
    if (newRange === range) return;
    setRange(newRange);
    setExpandedStage(null);
  };

  /* ============================================================
     DERIVED
  ============================================================ */

  const overallRate = useMemo(() => {
    if (!stages.listed) return 0;
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
          previous > 0 ? ((previous - stage.value) / previous) * 100 : 0;

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
    if (!dropoffs.length) return null;
    return dropoffs.reduce((largest, current) =>
      current.dropoff > largest.dropoff ? current : largest
    );
  }, [dropoffs]);

  const strongestStage = useMemo(() => {
    if (!dropoffs.length) return null;
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

  if (loading) return <FunnelSkeleton />;

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
                <Target size={14} />
                <span>Analytics / Conversion</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Donation Funnel
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Listed to completed</span>
                <span className="text-ink-300">·</span>
                <span>Where people drop off along the journey</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
                {RANGE_OPTIONS.map((option) => {
                  const active = range === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRangeChange(option.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                        active
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-ink-500 hover:text-ink-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={fetchFunnel}
                disabled={loading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
                aria-label="Refresh analytics"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        {/* =====================================================
            OVERALL CONVERSION HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[26px] border border-primary-200 bg-primary-50/50 p-5 shadow-sm sm:p-6">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
                  <Target size={15} />
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                    Overall conversion
                  </p>

                  <p className="text-[11px] font-bold text-ink-500">
                    Listed → Completed
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-4xl font-black tracking-tight text-primary-700 sm:text-5xl">
                  {formatPercent(overallRate)}
                </span>

                <span className="mb-1 text-sm font-bold text-ink-500">
                  of listed items become completed donations
                </span>
              </div>

              <p className="mt-3 max-w-xl text-xs font-bold leading-5 text-ink-500">
                Out of{' '}
                <strong className="font-extrabold text-ink-950">
                  {formatNumber(stages.listed)}
                </strong>{' '}
                listed items,{' '}
                <strong className="font-extrabold text-ink-950">
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
                    stroke="#e0e7ff"
                    strokeWidth="10"
                  />

                  <motion.circle
                    cx="60"
                    cy="60"
                    r="49"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 49}
                    initial={{ strokeDashoffset: 2 * Math.PI * 49 }}
                    animate={{
                      strokeDashoffset:
                        2 *
                        Math.PI *
                        49 *
                        (1 - clamp(overallRate, 0, 100) / 100),
                    }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Check size={20} className="mb-1 text-primary-600" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-ink-500">
                    Complete
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-primary-200/70 pt-5 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Listings
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
                {formatNumber(stages.listed)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Views
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
                {formatNumber(stages.viewed)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Applications
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
                {formatNumber(stages.applied)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Completed
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-success-600">
                {formatNumber(stages.completed)}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            CONVERSION STATS
        ===================================================== */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Eye}
            label="List → View"
            value={formatPercent(conversionRates.viewRate)}
            description="Visitors who viewed a listing"
            tone="primary"
          />

          <StatCard
            icon={FileText}
            label="View → Apply"
            value={formatPercent(conversionRates.applicationRate)}
            description="Viewers who submitted an application"
            tone="brand"
          />

          <StatCard
            icon={CheckCircle2}
            label="Apply → Accept"
            value={formatPercent(conversionRates.acceptanceRate)}
            description="Applications that were approved"
            tone="success"
          />

          <StatCard
            icon={Trophy}
            label="Accept → Complete"
            value={formatPercent(conversionRates.completionRate)}
            description="Accepted donations completed"
            tone="success"
          />
        </section>

        {/* =====================================================
            FUNNEL STAGES
        ===================================================== */}

        <section className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={Flag}
            title="How the journey performs"
            description="Each stage shows volume, retention, and conversion. Click any stage for details."
          />

          <div className="mt-6">
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

        {/* =====================================================
            DROP-OFFS
        ===================================================== */}

        <section className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={TrendingDown}
            title="Where are you losing people?"
            description="The largest drop-offs are the stages that deserve the most attention."
          />

          {biggestDropoff ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-danger-200 bg-danger-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                    <AlertTriangle size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-danger-600">
                      Biggest drop-off
                    </p>

                    <h3 className="mt-1 text-base font-black text-danger-900">
                      {biggestDropoff.from} → {biggestDropoff.to}
                    </h3>

                    <p className="mt-2 max-w-xl text-xs font-bold leading-5 text-danger-700">
                      This is currently the largest point of friction in the
                      journey.{' '}
                      <strong className="font-extrabold">
                        {formatNumber(biggestDropoff.lost)}
                      </strong>{' '}
                      did not progress to the next stage, representing a{' '}
                      <strong className="font-extrabold">
                        {formatPercent(biggestDropoff.dropoff)}
                      </strong>{' '}
                      drop-off.
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-danger-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${clamp(biggestDropoff.dropoff, 0, 100)}%`,
                    }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-danger-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Zap size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-ink-500">
                      Strongest transition
                    </p>

                    <h3 className="mt-1 truncate text-sm font-extrabold text-ink-950">
                      {strongestStage?.from} → {strongestStage?.to}
                    </h3>

                    <p className="mt-2 text-xs font-bold leading-5 text-ink-500">
                      This transition has the lowest drop-off in the current
                      funnel.
                    </p>

                    <p className="mt-3 text-2xl font-black tracking-tight text-success-600">
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

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dropoffs.map((dropoff, index) => (
              <DropoffCard
                key={`${dropoff.fromKey}-${dropoff.toKey}`}
                dropoff={dropoff}
                index={index}
              />
            ))}
          </div>
        </section>

        {/* =====================================================
            CHARTS
        ===================================================== */}

        <FunnelCharts
          chartData={chartData}
          onExpand={() => setShowChartModal(true)}
        />
      </div>

      {/* ============================================================
          CHART MODAL
      ============================================================ */}

      <Modal
        isOpen={showChartModal}
        onClose={() => setShowChartModal(false)}
        title="Funnel Trend Analysis"
        size="xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <BarChart3 size={15} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink-950">
                  Daily funnel activity
                </p>

                <p className="mt-1 text-xs font-bold leading-5 text-ink-500">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip content={<ChartTooltip />} />

                  <Legend wrapperStyle={{ fontWeight: 700 }} />

                  <Area
                    type="monotone"
                    dataKey="items"
                    name="Listed"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.08}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="viewed"
                    name="Viewed"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.06}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="applied"
                    name="Applied"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.07}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Accepted"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.06}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#059669"
                    fill="#059669"
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
                      className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center"
                    >
                      <div
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${stage.soft} ${stage.text}`}
                      >
                        <Icon size={15} />
                      </div>

                      <p className="mt-2 text-[9px] font-extrabold uppercase tracking-wider text-ink-500">
                        {stage.shortLabel}
                      </p>

                      <p className="mt-0.5 text-lg font-black tracking-tight text-ink-950">
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