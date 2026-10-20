// src/admin/ItemDiscussionReports.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  PenLine,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter as FilterIcon,
} from 'lucide-react';

import { itemDiscussionsAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import FilterBar, { ColumnStepper, ViewToggle } from '@/reusables/FilterBar';
import { usePageState } from '@/hooks/usePageState';

const ITEMS_PER_PAGE = 20;

/* ============================================================
   PAGE CONFIG — stable module-level refs
============================================================ */

const URL_DEFAULTS = {
  search: '',
  filter: 'all',
  sortBy: 'newest',
  sortOrder: 'desc',
  page: 1,
};

const FILTER_KEYS = ['search', 'filter', 'sortBy', 'sortOrder'];

const FILTER_RESET = {
  search: '',
  filter: 'all',
  sortBy: 'newest',
  sortOrder: 'desc',
  page: 1,
};

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'yellow' },
  { value: 'reviewed', label: 'Reviewed', icon: Eye, color: 'blue' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' },
  { value: 'dismissed', label: 'Dismissed', icon: XCircle, color: 'gray' },
];

const statusFilterOptions = [
  { value: 'all', label: 'All Statuses', icon: FilterIcon },
  ...STATUS_OPTIONS.map(({ value, label, icon }) => ({ value, label, icon })),
];

const sortOptions = [
  { value: 'newest', label: 'Newest First', icon: ArrowDown },
  { value: 'oldest', label: 'Oldest First', icon: ArrowUp },
  { value: 'status', label: 'Status', icon: ArrowUpDown },
];

const getStatusBadgeClass = (status) => {
  const map = {
    pending: 'border-warning-200 bg-warning-50 text-warning-700',
    reviewed: 'border-primary-200 bg-primary-50 text-primary-700',
    resolved: 'border-success-200 bg-success-50 text-success-700',
    dismissed: 'border-ink-200 bg-ink-50 text-ink-600',
  };
  return map[status] || map.dismissed;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/* ============================================================
   SKELETON
============================================================ */

const ReportsSkeleton = ({ embedded = false }) => {
  const content = (
    <div className="space-y-7">
      {!embedded && (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-40 animate-pulse rounded-xl bg-ink-200" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      <div className="rounded-3xl border border-ink-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="h-12 flex-1 animate-pulse rounded-2xl bg-ink-100" />
          <div className="flex gap-2">
            <div className="h-12 w-32 animate-pulse rounded-2xl bg-ink-100" />
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-ink-100 px-5 py-4 last:border-0"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-ink-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink-100" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-ink-100" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-ink-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 w-8 animate-pulse rounded-lg bg-ink-100"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px]">{content}</div>
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'ink',
  active = false,
  onClick,
}) {
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
      className={`group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md ${
        active
          ? 'border-primary-400 ring-2 ring-primary-500/20'
          : 'border-ink-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`truncate text-xs font-bold ${
            active ? 'text-primary-700' : 'text-ink-500'
          }`}
        >
          {label}
        </p>
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
   MAIN COMPONENT
============================================================ */

const ItemDiscussionReports = ({ embedded = false }) => {
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
    namespace: 'admin.itemDiscussionReports',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    search,
    filter,
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
  const [reports, setReports] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- modals ---------- */
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReport, setDeleteReport] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchReports = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = {
        status: filter === 'all' ? undefined : filter,
        limit: 100,
      };
      const response = await itemDiscussionsAPI.adminGetReports(params);
      setReports(response.data?.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /* ============================================================
     FILTERED + SORTED (client-side narrowing)
  ============================================================ */

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (filter !== 'all') {
      result = result.filter((r) => r.status === filter);
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.message?.content?.toLowerCase().includes(term) ||
          r.reporter?.full_name?.toLowerCase().includes(term) ||
          r.message?.author?.full_name?.toLowerCase().includes(term) ||
          r.reason?.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'status') {
      result.sort((a, b) => {
        const order = ['pending', 'reviewed', 'resolved', 'dismissed'];
        const cmp = order.indexOf(a.status) - order.indexOf(b.status);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (sortBy === 'oldest') {
      result.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    } else {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return result;
  }, [reports, filter, search, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(() => {
    const acc = {
      total: reports.length,
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };
    reports.forEach((r) => {
      if (acc[r.status] !== undefined) acc[r.status]++;
    });
    return acc;
  }, [reports]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter !== 'all') count++;
    if (search) count++;
    if (sortBy !== 'newest') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [filter, search, sortBy, sortOrder]);

  const hasActiveFilters =
    filter !== 'all' ||
    Boolean(search) ||
    sortBy !== 'newest' ||
    sortOrder !== 'desc';

  const activeFilterChips = [
    filter !== 'all' && {
      key: 'status',
      label: STATUS_OPTIONS.find((s) => s.value === filter)?.label || filter,
      onRemove: () => setFilters({ filter: 'all' }),
    },
    search && {
      key: 'search',
      label: `Search: ${search}`,
      onRemove: () => setFilters({ search: '' }),
    },
    sortBy !== 'newest' && {
      key: 'sort',
      label: sortOptions.find((o) => o.value === sortBy)?.label || sortBy,
      onRemove: () => setFilters({ sortBy: 'newest' }),
    },
    sortOrder !== 'desc' && {
      key: 'order',
      label: sortOrder === 'asc' ? 'Ascending' : 'Descending',
      onRemove: () => setFilters({ sortOrder: 'desc' }),
    },
  ].filter(Boolean);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const handleStatusUpdate = async () => {
    if (!selectedReport || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await itemDiscussionsAPI.adminUpdateReportStatus(
        selectedReport.id,
        newStatus
      );
      toast.success('Status updated');
      await fetchReports();
      setShowStatusModal(false);
      setSelectedReport(null);
      setNewStatus('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReport) return;
    setDeleting(true);
    try {
      await itemDiscussionsAPI.adminDeleteReport(deleteReport.id);
      toast.success('Report deleted');
      await fetchReports();
      setShowDeleteModal(false);
      setDeleteReport(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete report');
    } finally {
      setDeleting(false);
    }
  };

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setShowStatusModal(true);
  };

  const openDeleteModal = (report) => {
    setDeleteReport(report);
    setShowDeleteModal(true);
  };

  const handleStatClick = (status) => {
    if (filter !== status) {
      setFilters({ filter: status });
    }
  };

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  /* ============================================================
     LOADING
  ============================================================ */

  if (initialLoading) return <ReportsSkeleton embedded={embedded} />;

  /* ============================================================
     RENDER
  ============================================================ */

  const outerClass = embedded ? '' : 'min-h-full bg-transparent';
  const innerClass = embedded
    ? 'space-y-7'
    : 'mx-auto w-full max-w-[1500px] space-y-7';

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        {/* HEADER — hidden when embedded */}
        {!embedded && (
          <header>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  <Flag size={14} />
                  <span>Community moderation</span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  Community Reports
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                  <span>{stats.total.toLocaleString()} reports</span>
                  <span className="text-ink-300">·</span>
                  <span>Reports from item discussions</span>
                </p>
              </div>
            </div>
          </header>
        )}

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            subtext="All reports"
            icon={Flag}
            tone="ink"
            active={filter === 'all'}
            onClick={() => handleStatClick('all')}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            subtext="Awaiting review"
            icon={Clock}
            tone="warning"
            active={filter === 'pending'}
            onClick={() => handleStatClick('pending')}
          />
          <StatCard
            label="Reviewed"
            value={stats.reviewed}
            subtext="Being reviewed"
            icon={Eye}
            tone="primary"
            active={filter === 'reviewed'}
            onClick={() => handleStatClick('reviewed')}
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            subtext="Resolved reports"
            icon={CheckCircle}
            tone="success"
            active={filter === 'resolved'}
            onClick={() => handleStatClick('resolved')}
          />
          <StatCard
            label="Dismissed"
            value={stats.dismissed}
            subtext="Dismissed reports"
            icon={XCircle}
            tone="ink"
            active={filter === 'dismissed'}
            onClick={() => handleStatClick('dismissed')}
          />
        </section>

        {/* FILTER BAR */}
        <FilterBar
          searchValue={search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search by reporter, reported user, reason, or message..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchReports}
          refreshing={refreshing}
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
              options={statusFilterOptions}
              value={filter}
              onChange={(value) => setFilters({ filter: value })}
              placeholder="All Statuses"
              showIcon
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
            {filteredReports.length === stats.total
              ? stats.total === 1
                ? '1 report'
                : `${stats.total.toLocaleString()} reports`
              : `Showing ${filteredReports.length} of ${stats.total.toLocaleString()} reports`}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* EMPTY */}
        {filteredReports.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Flag size={27} />
              </div>
              <h2 className="mt-5 text-lg font-black text-ink-950">
                No reports found
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters to find the reports you are looking for.'
                  : 'No community reports have been submitted yet.'}
              </p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/60">
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Reporter
                    </th>
                    <th className="hidden px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 md:table-cell">
                      Reported User
                    </th>
                    <th className="hidden px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 lg:table-cell">
                      Message
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Reason
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Status
                    </th>
                    <th className="hidden whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 sm:table-cell">
                      Date
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100">
                  {paginatedReports.map((report) => {
                    const message = report.message || {};
                    const author = message.author || {};
                    const isDeleted = message.is_deleted || false;

                    return (
                      <tr
                        key={report.id}
                        className="transition hover:bg-ink-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {report.reporter?.avatar_url ? (
                              <img
                                src={report.reporter.avatar_url}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-[10px] font-extrabold text-ink-500">
                                {(report.reporter?.full_name || 'U').charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                to={`/admin/users-profile/${
                                  report.reporter?.id || ''
                                }`}
                                className="block truncate text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                                title={report.reporter?.full_name || 'Unknown'}
                              >
                                {report.reporter?.full_name || 'Unknown'}
                              </Link>
                              <p className="truncate text-[11px] font-bold text-ink-400">
                                {formatDate(report.created_at)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-5 py-3.5 md:table-cell">
                          {author.id ? (
                            <div className="flex items-center gap-2">
                              {author.avatar_url ? (
                                <img
                                  src={author.avatar_url}
                                  alt=""
                                  className="h-7 w-7 shrink-0 rounded-full border border-ink-100 object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-[10px] font-extrabold text-ink-500">
                                  {(author.full_name || 'U').charAt(0)}
                                </div>
                              )}
                              <Link
                                to={`/admin/users-profile/${author.id}`}
                                className="truncate text-xs font-extrabold text-ink-800 transition hover:text-primary-600"
                                title={author.full_name || 'Unknown'}
                              >
                                {author.full_name || 'Unknown'}
                              </Link>
                            </div>
                          ) : (
                            <span className="text-xs font-bold italic text-ink-300">
                              Unknown
                            </span>
                          )}
                        </td>

                        <td className="hidden px-5 py-3.5 lg:table-cell">
                          {message.id ? (
                            <Link
                              to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                              className="block max-w-[220px] truncate text-xs font-bold text-ink-500 transition hover:text-primary-600"
                              title={message.content || ''}
                            >
                              {isDeleted ? (
                                <span className="line-through text-ink-400">
                                  [deleted] {message.content}
                                </span>
                              ) : (
                                message.content
                              )}
                            </Link>
                          ) : (
                            <span className="text-xs font-bold italic text-ink-300">
                              Message not found
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="truncate text-sm font-extrabold capitalize text-ink-950">
                            {report.reason || 'No reason'}
                          </p>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold capitalize ${getStatusBadgeClass(
                              report.status
                            )}`}
                          >
                            {report.status}
                          </span>
                        </td>

                        <td className="hidden whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500 sm:table-cell">
                          {formatDate(report.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {message.id && (
                              <Link
                                to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 text-[11px] font-extrabold text-primary-700 transition hover:bg-primary-100"
                                title="View Discussion"
                              >
                                <MessageCircle size={12} />
                                <span>View</span>
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => openStatusModal(report)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Change Status"
                            >
                              <PenLine size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(report)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                              title="Delete Report"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* GRID VIEW */
          <motion.div
            className="grid gap-4"
            animate={gridStyle}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {paginatedReports.map((report) => {
              const message = report.message || {};
              const author = message.author || {};
              const isDeleted = message.is_deleted || false;

              return (
                <motion.article
                  key={report.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        {report.reporter?.avatar_url ? (
                          <img
                            src={report.reporter.avatar_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-[10px] font-extrabold text-ink-500">
                            {(report.reporter?.full_name || 'U').charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/admin/users-profile/${
                              report.reporter?.id || ''
                            }`}
                            className="block truncate text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                            title={report.reporter?.full_name || 'Unknown'}
                          >
                            {report.reporter?.full_name || 'Unknown'}
                          </Link>
                          <p className="truncate text-[11px] font-bold text-ink-400">
                            {formatDate(report.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold capitalize ${getStatusBadgeClass(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Reported User
                      </p>
                      {author.id ? (
                        <Link
                          to={`/admin/users-profile/${author.id}`}
                          className="mt-0.5 block truncate text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                          title={author.full_name || 'Unknown'}
                        >
                          {author.full_name || 'Unknown'}
                        </Link>
                      ) : (
                        <p className="mt-0.5 text-[11px] font-bold italic text-ink-400">
                          Unknown
                        </p>
                      )}
                    </div>

                    {message.id && (
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                          Message
                        </p>
                        <Link
                          to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                          className="mt-0.5 block line-clamp-2 text-[11px] font-bold leading-5 text-ink-500 transition hover:text-primary-600"
                          title={message.content || ''}
                        >
                          {isDeleted ? (
                            <span className="line-through text-ink-400">
                              [deleted] {message.content}
                            </span>
                          ) : (
                            message.content
                          )}
                        </Link>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Reason
                      </p>
                      <p className="mt-0.5 truncate text-sm font-extrabold capitalize text-ink-950">
                        {report.reason || 'No reason'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
                    {message.id ? (
                      <Link
                        to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 text-[11px] font-extrabold text-primary-700 transition hover:bg-primary-100"
                      >
                        <MessageCircle size={12} />
                        <span>View</span>
                      </Link>
                    ) : (
                      <span className="text-[11px] font-bold italic text-ink-400">
                        No message
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openStatusModal(report)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="Change Status"
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(report)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                        title="Delete Report"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-ink-500">
              Showing{' '}
              <span className="font-extrabold text-ink-700">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-extrabold text-ink-700">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredReports.length
                )}
              </span>{' '}
              of{' '}
              <span className="font-extrabold text-ink-700">
                {filteredReports.length.toLocaleString()}
              </span>{' '}
              reports
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ page })}
            />
          </div>
        )}
      </div>

      {/* ============================================================
          MODALS (unchanged)
      ============================================================ */}

      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          if (updatingStatus) return;
          setShowStatusModal(false);
          setSelectedReport(null);
          setNewStatus('');
        }}
        title="Change Report Status"
        size="sm"
      >
        {selectedReport && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
              <p className="min-w-0 truncate text-sm font-extrabold capitalize text-ink-950">
                {selectedReport.reason || 'Report'}
              </p>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${getStatusBadgeClass(
                  selectedReport.status
                )}`}
              >
                {selectedReport.status}
              </span>
            </div>

            {selectedReport.message?.content && (
              <div className="max-h-24 overflow-y-auto rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-xs font-bold leading-5 text-ink-600">
                  {selectedReport.message.content}
                </p>
              </div>
            )}

            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const isSelected = newStatus === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setNewStatus(option.value)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-ink-100 bg-ink-50/60 text-ink-700 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-white shadow-sm text-primary-600'
                          : 'bg-white text-ink-400'
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 text-sm font-extrabold capitalize">
                      {option.label}
                    </span>
                    {isSelected && (
                      <CheckCircle size={15} className="text-primary-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedReport(null);
                  setNewStatus('');
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={
                  updatingStatus ||
                  !newStatus ||
                  newStatus === selectedReport.status
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingStatus ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (deleting) return;
          setShowDeleteModal(false);
          setDeleteReport(null);
        }}
        title="Delete Report"
        size="sm"
      >
        {deleteReport && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this report?
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete the report{' '}
                  <strong className="capitalize">
                    "{deleteReport.reason || 'Report'}"
                  </strong>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
              <p className="text-xs font-extrabold capitalize text-ink-700">
                {deleteReport.reason || 'Report'}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-ink-500">
                {formatDate(deleteReport.created_at)}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReport(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ============================================================
   PAGINATION — unchanged
============================================================ */

function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

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

export default ItemDiscussionReports;