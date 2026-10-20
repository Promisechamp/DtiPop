// src/admin/AdminApplications.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  User,
  Calendar,
  MapPin,
  Eye,
  Check,
  X,
  CircleArrowOutUpRight,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Slash,
  Filter,
  Grid3x3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import {
  ITEM_CATEGORIES,
  APPLICATION_STATUS_DISPLAY,
  getCategoryByValue,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import Select from '@/reusables/Select';
import FilterBar, { ColumnStepper, ViewToggle } from '@/reusables/FilterBar';
import { usePageState } from '@/hooks/usePageState';

const ITEMS_PER_PAGE = 20;

/* ============================================================
   PAGE CONFIG — stable module-level refs
============================================================ */

const URL_DEFAULTS = {
  search: '',
  status: '',
  category: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
};

const FILTER_KEYS = ['search', 'status', 'category', 'sortBy', 'sortOrder'];

const FILTER_RESET = {
  search: '',
  status: '',
  category: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
};

/* ============================================================
   HELPERS
============================================================ */

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

const getApplicationBadge = (status) => {
  const display = getApplicationStatusDisplay(status);

  const colorMap = {
    green: 'border-success-200 bg-success-50 text-success-700',
    yellow: 'border-warning-200 bg-warning-50 text-warning-700',
    red: 'border-danger-200 bg-danger-50 text-danger-700',
    blue: 'border-primary-200 bg-primary-50 text-primary-700',
    gray: 'border-ink-200 bg-ink-50 text-ink-600',
  };

  const labelMap = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  return {
    classes: colorMap[display?.color] || colorMap.gray,
    label: display?.label || labelMap[status] || status,
    icon: display?.icon,
  };
};

/* ============================================================
   SKELETON — unchanged
============================================================ */

const ApplicationsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="space-y-7">
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
                {Array.from({ length: 5 }).map((_, j) => (
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
    </div>
  </div>
);

/* ============================================================
   STAT CARD — unchanged
============================================================ */

function StatCard({ label, value, subtext, icon: Icon, tone = 'ink' }) {
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
   APPLICATION CARD — unchanged
============================================================ */

function ApplicationCard({ app, onViewDetails, onStatusUpdate, onDelete }) {
  const badge = getApplicationBadge(app.status);
  const category = getCategoryByValue(app.item?.category);

  return (
    <div className="group flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {app.applicant?.avatar_url ? (
              <img
                src={app.applicant.avatar_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                <User size={14} />
              </div>
            )}

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onViewDetails(app)}
                className="block truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
              >
                {app.applicant?.full_name || 'Anonymous'}
              </button>
              <p className="truncate text-[11px] font-bold text-ink-400">
                {app.applicant?.email || 'No email'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>

        <div>
          <p className="truncate text-sm font-extrabold text-ink-950">
            {app.item?.title || 'Unknown Item'}
          </p>
          {category && (
            <div className="mt-1 flex items-center gap-1.5">
              {renderIcon(category.icon, 'h-3 w-3', category.color)}
              <span className="text-[11px] font-bold text-ink-500">
                {category.label}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-ink-500">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatDate(app.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {app.applicant?.location?.country || 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onViewDetails(app)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
            title="View Details"
          >
            <Eye size={15} />
          </button>

          {app.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => onStatusUpdate(app, 'accepted')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-success-50 hover:text-success-600"
                title="Accept"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => onStatusUpdate(app, 'rejected')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                title="Reject"
              >
                <X size={15} />
              </button>
            </>
          )}

          <Link
            to={`/item/${app.item?.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
            title="View Item"
          >
            <CircleArrowOutUpRight size={15} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => onDelete(app)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AdminApplications = () => {
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
    namespace: 'admin.applications',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    search,
    status: statusFilter,
    category: categoryFilter,
    sortBy,
    sortOrder,
    page: currentPage,
  } = filters;

  /* ---------- debounced search for fetch throttle only ---------- */
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ---------- grid style derived from persisted gridCols ---------- */
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }),
    [gridCols]
  );

  /* ---------- data state ---------- */
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ---------- modals ---------- */
  const [showAppModal, setShowAppModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  /* ---------- select options ---------- */
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: Filter },
      ...Object.entries(APPLICATION_STATUS_DISPLAY).map(
        ([value, display]) => ({
          value,
          label: display.label,
          icon: display.icon,
          color: display.color,
        })
      ),
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories', icon: Grid3x3 },
      ...ITEM_CATEGORIES.map((cat) => ({
        value: cat.value,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
      })),
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'created_at', label: 'Newest First', icon: ArrowDown },
      { value: 'status', label: 'Status', icon: ArrowUpDown },
    ],
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (categoryFilter) count++;
    if (sortBy !== 'created_at') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [statusFilter, categoryFilter, sortBy, sortOrder]);

  const hasActiveFilters =
    Boolean(statusFilter) ||
    Boolean(categoryFilter) ||
    Boolean(search) ||
    sortBy !== 'created_at' ||
    sortOrder !== 'desc';

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getApplications(params);
      const data = response.data || {};

      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setShowAppModal(true);
  };

  const handleStatusUpdate = (app, status) => {
    setSelectedApp(app);
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedApp || !newStatus) return;
    setActionLoading(true);
    try {
      await adminAPI.updateApplicationStatus(selectedApp.id, newStatus);
      toast.success(`Application ${newStatus} successfully`);
      setShowStatusModal(false);
      setSelectedApp(null);
      setNewStatus('');
      fetchApplications();
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Failed to update application'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (app) => {
    setSelectedApp(app);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await adminAPI.adminDeleteApplication(selectedApp.id);
      toast.success('Application deleted successfully');
      setShowDeleteModal(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Failed to delete application'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(
    () => ({
      total,
      pending: applications.filter((a) => a.status === 'pending').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      cancelled: applications.filter((a) => a.status === 'cancelled').length,
    }),
    [applications, total]
  );

  /* ============================================================
     ACTIVE FILTER CHIPS
  ============================================================ */

  const activeFilterChips = [
    statusFilter && {
      key: 'status',
      label: getApplicationStatusDisplay(statusFilter)?.label || statusFilter,
      onRemove: () => setFilters({ status: '' }),
    },
    categoryFilter && {
      key: 'category',
      label: getCategoryByValue(categoryFilter)?.label || categoryFilter,
      onRemove: () => setFilters({ category: '' }),
    },
    search && {
      key: 'search',
      label: `Search: ${search}`,
      onRemove: () => setFilters({ search: '' }),
    },
    sortBy !== 'created_at' && {
      key: 'sort',
      label: sortOptions.find((o) => o.value === sortBy)?.label || sortBy,
      onRemove: () => setFilters({ sortBy: 'created_at' }),
    },
    sortOrder !== 'desc' && {
      key: 'order',
      label: sortOrder === 'asc' ? 'Ascending' : 'Descending',
      onRemove: () => setFilters({ sortOrder: 'desc' }),
    },
  ].filter(Boolean);

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading && applications.length === 0)
    return <ApplicationsSkeleton />;

  /* ============================================================
     MENU ITEMS
  ============================================================ */

  const buildMenuItems = (app) => [
    {
      key: 'view',
      icon: Eye,
      label: 'View Details',
      onClick: () => handleViewDetails(app),
    },
    {
      key: 'view-item',
      icon: CircleArrowOutUpRight,
      label: 'View on Site',
      onClick: () => {
        window.open(`/item/${app.item?.id}`, '_blank', 'noopener,noreferrer');
      },
    },
    ...(app.status === 'pending'
      ? [
          {
            key: 'accept',
            icon: Check,
            label: 'Accept',
            onClick: () => handleStatusUpdate(app, 'accepted'),
          },
          {
            key: 'reject',
            icon: X,
            label: 'Reject',
            onClick: () => handleStatusUpdate(app, 'rejected'),
          },
        ]
      : []),
    { key: 'divider-delete', divider: true },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(app),
    },
  ];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* HEADER */}
        <header className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <FileText size={14} />
                <span>Application management</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Application Management
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>{total.toLocaleString()} applications</span>
                <span className="text-ink-300">·</span>
                <span>Review and manage submissions</span>
              </p>
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            subtext="Across the platform"
            icon={FileText}
            tone="ink"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            subtext="Current page"
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            subtext="Current page"
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            subtext="Current page"
            icon={XCircle}
            tone="danger"
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            subtext="Current page"
            icon={Slash}
            tone="primary"
          />
        </section>

        {/* FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search by applicant name or item title..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchApplications}
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink-500">
            {applications.length === total
              ? total === 1
                ? '1 application'
                : `${total.toLocaleString()} applications`
              : `Showing ${applications.length} of ${total.toLocaleString()} applications`}
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
        {applications.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <FileText size={27} />
              </div>
              <h2 className="mt-5 text-lg font-black text-ink-950">
                No applications found
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters to find the applications you are looking for.'
                  : 'No applications have been submitted yet.'}
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
                      Applicant
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Item
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Category
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Applied
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100">
                  {applications.map((app) => {
                    const badge = getApplicationBadge(app.status);
                    const category = getCategoryByValue(app.item?.category);

                    return (
                      <tr
                        key={app.id}
                        className="transition hover:bg-ink-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {app.applicant?.avatar_url ? (
                              <img
                                src={app.applicant.avatar_url}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                                <User size={14} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handleViewDetails(app)}
                                className="block truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                              >
                                {app.applicant?.full_name || 'Anonymous'}
                              </button>
                              <p className="truncate text-[11px] font-bold text-ink-400">
                                {app.applicant?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="max-w-xs truncate text-sm font-extrabold text-ink-950">
                            {app.item?.title || 'Unknown Item'}
                          </p>
                        </td>

                        <td className="px-5 py-3.5">
                          {category ? (
                            <div className="flex items-center gap-1.5">
                              {renderIcon(
                                category.icon,
                                'h-3.5 w-3.5',
                                category.color
                              )}
                              <span className="text-xs font-bold text-ink-600">
                                {category.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-ink-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500">
                          {formatDate(app.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(app)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>

                            {app.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(app, 'accepted')
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-success-50 hover:text-success-600"
                                title="Accept"
                              >
                                <Check size={15} />
                              </button>
                            )}

                            {app.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(app, 'rejected')
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                                title="Reject"
                              >
                                <X size={15} />
                              </button>
                            )}

                            <Link
                              to={`/item/${app.item?.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Item"
                            >
                              <CircleArrowOutUpRight size={15} />
                            </Link>

                            <ActionMenu
                              items={buildMenuItems(app)}
                              placement="top"
                              align="right"
                            />
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
            {applications.map((app) => (
              <motion.div
                key={app.id}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <ApplicationCard
                  app={app}
                  onViewDetails={handleViewDetails}
                  onStatusUpdate={handleStatusUpdate}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-ink-500">
              Showing{' '}
              <span className="font-extrabold text-ink-700">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-extrabold text-ink-700">
                {Math.min(currentPage * ITEMS_PER_PAGE, total)}
              </span>{' '}
              of{' '}
              <span className="font-extrabold text-ink-700">
                {total.toLocaleString()}
              </span>{' '}
              applications
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
          APPLICATION DETAILS MODAL — unchanged
      ============================================================ */}

      <Modal
        isOpen={showAppModal}
        onClose={() => {
          setShowAppModal(false);
          setSelectedApp(null);
        }}
        showCloseButton={false}
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-ink-950">
                Application Details
              </h2>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  to={`/admin/users-profile/${selectedApp.applicant?.id || ''}`}
                  className="shrink-0 text-ink-400 transition hover:text-primary-600"
                  title="View user profile"
                >
                  <CircleArrowOutUpRight size={15} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowAppModal(false);
                    setSelectedApp(null);
                  }}
                  className="shrink-0 text-ink-400 transition hover:text-primary-600"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <hr className="border-ink-100" />

            <div className="flex items-center gap-4">
              {selectedApp.applicant?.avatar_url ? (
                <img
                  src={selectedApp.applicant.avatar_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border border-ink-100 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                  <User size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-ink-950">
                  {selectedApp.applicant?.full_name || 'Anonymous'}
                </h3>
                <p className="truncate text-xs font-bold text-ink-500">
                  {selectedApp.applicant?.email || 'No email'}
                </p>
                <div className="mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
                      getApplicationBadge(selectedApp.status).classes
                    }`}
                  >
                    {getApplicationBadge(selectedApp.status).label}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Applied For
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                {selectedApp.item?.title || 'Unknown Item'}
              </p>
              {selectedApp.item?.category && (
                <div className="mt-1 flex items-center gap-1.5">
                  {(() => {
                    const cat = getCategoryByValue(
                      selectedApp.item.category
                    );
                    return cat
                      ? renderIcon(cat.icon, 'h-3.5 w-3.5', cat.color)
                      : null;
                  })()}
                  <span className="text-[11px] font-bold text-ink-500">
                    {getCategoryByValue(selectedApp.item.category)?.label ||
                      selectedApp.item.category}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Location
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {selectedApp.applicant?.location?.country || 'Not specified'}
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Applied Date
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {formatDate(selectedApp.created_at)}
                </p>
              </div>
            </div>

            {selectedApp.message && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Message
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-sm font-medium leading-6 text-ink-700">
                  {selectedApp.message}
                </p>
              </div>
            )}

            {selectedApp.applicant && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Rating
                  </p>
                  <p className="mt-0.5 text-base font-black text-ink-950">
                    {selectedApp.applicant.rating || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Items Given
                  </p>
                  <p className="mt-0.5 text-base font-black text-ink-950">
                    {selectedApp.applicant.items_given || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Items Received
                  </p>
                  <p className="mt-0.5 text-base font-black text-ink-950">
                    {selectedApp.applicant.items_received || 0}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAppModal(false);
                  setSelectedApp(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Close
              </button>
              {selectedApp.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppModal(false);
                      handleStatusUpdate(selectedApp, 'rejected');
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700"
                  >
                    <X size={15} />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppModal(false);
                      handleStatusUpdate(selectedApp, 'accepted');
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success-600 px-4 text-sm font-extrabold text-white transition hover:bg-success-700"
                  >
                    <Check size={15} />
                    Accept
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          STATUS UPDATE MODAL — unchanged
      ============================================================ */}

      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          if (actionLoading) return;
          setShowStatusModal(false);
          setSelectedApp(null);
          setNewStatus('');
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedApp && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-ink-950">
                {newStatus === 'accepted'
                  ? 'Accept Application'
                  : 'Reject Application'}
              </h2>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedApp(null);
                  setNewStatus('');
                }}
                className="ml-auto shrink-0 text-ink-400 transition hover:text-primary-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <hr className="border-ink-100" />

            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  newStatus === 'accepted'
                    ? 'bg-success-50 text-success-600'
                    : 'bg-danger-50 text-danger-600'
                }`}
              >
                {newStatus === 'accepted' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <XCircle size={20} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-6 text-ink-700">
                  {newStatus === 'accepted' ? 'Accept' : 'Reject'} application
                  from{' '}
                  <span className="font-extrabold text-ink-950">
                    {selectedApp.applicant?.full_name || 'Anonymous'}
                  </span>
                  ?
                </p>
                <p className="text-[11px] font-bold text-ink-400">
                  For: {selectedApp.item?.title || 'Unknown Item'}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedApp(null);
                  setNewStatus('');
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusUpdate}
                disabled={actionLoading}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  newStatus === 'accepted'
                    ? 'bg-success-600 hover:bg-success-700'
                    : 'bg-danger-600 hover:bg-danger-700'
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : newStatus === 'accepted' ? (
                  <>
                    <Check size={15} />
                    Accept
                  </>
                ) : (
                  <>
                    <X size={15} />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          DELETE CONFIRMATION MODAL — unchanged
      ============================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (actionLoading) return;
          setShowDeleteModal(false);
          setSelectedApp(null);
        }}
        title="Delete Application"
        size="sm"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this application?
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete the application from{' '}
                  <strong>
                    {selectedApp.applicant?.full_name || 'Anonymous'}
                  </strong>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedApp(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={actionLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Application
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

export default AdminApplications;