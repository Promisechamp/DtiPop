import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  PenLine,
  Trash2,
  AlertTriangle,
  Grid,
  Table,
  Minus,
  Plus as PlusIcon,
  X,
  Eye,
} from 'lucide-react';

import { itemDiscussionsAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import { useBreakpoint } from '@/reusables/Breakpoint';

const ITEMS_PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dismissed: 'bg-ink-50 text-ink-600 border-ink-200',
};

// ============================================================
// Skeleton (matches AdminSupport)
// ============================================================
const ReportsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="animate-pulse">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-ink-200" />
            <div className="h-3 w-40 rounded bg-ink-200" />
          </div>
          <div className="h-9 w-56 rounded bg-ink-200" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-ink-200" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm">
            <div className="animate-pulse">
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 rounded bg-ink-200" />
                <div className="h-9 w-9 rounded-xl bg-ink-200" />
              </div>
              <div className="mt-2 h-8 w-12 rounded bg-ink-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-xl bg-ink-200" />
            <div>
              <div className="h-4 w-36 rounded bg-ink-200" />
              <div className="mt-1.5 h-3 w-28 rounded bg-ink-200" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-ink-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
            <div className="h-9 w-24 rounded-xl bg-ink-200 animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-ink-200 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm"
          >
            <div className="space-y-3 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-ink-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-ink-200" />
                  <div className="h-3 w-1/3 rounded bg-ink-200" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-ink-200" />
              <div className="h-3 w-4/5 rounded bg-ink-200" />
              <div className="h-16 rounded-xl bg-ink-200" />
            </div>
            <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-3 flex gap-2 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-ink-200" />
              <div className="h-8 w-8 rounded-lg bg-ink-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const ItemDiscussionReports = ({ embedded = false }) => {
  const breakpoint = useBreakpoint();

  const [reports, setReports] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('cards');
  const [gridCols, setGridCols] = useState(4);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReport, setDeleteReport] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const getDefaultCols = useCallback((bp) => {
    if (bp === 'xs' || bp === 'sm') return 1;
    if (bp === 'md') return 2;
    if (bp === 'lg') return 3;
    if (bp === 'xl' || bp === '2xl') return 4;
    return 4;
  }, []);

  useEffect(() => {
    if (!isCustomCols) setGridCols(getDefaultCols(breakpoint));
  }, [breakpoint, isCustomCols, getDefaultCols]);

  const fetchReports = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = { status: filter === 'all' ? undefined : filter, limit: 100 };
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

  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (filter !== 'all') result = result.filter((r) => r.status === filter);
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
    return result;
  }, [reports, filter, search]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCount = (status) =>
    status === 'all' ? reports.length : reports.filter((r) => r.status === status).length;

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: getCount('pending'),
      reviewed: getCount('reviewed'),
      resolved: getCount('resolved'),
      dismissed: getCount('dismissed'),
    }),
    [reports]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter !== 'all') count++;
    if (search) count++;
    return count;
  }, [filter, search]);

  const handleStatusUpdate = async () => {
    if (!selectedReport || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await itemDiscussionsAPI.adminUpdateReportStatus(selectedReport.id, newStatus);
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

  const handleStatClick = (status) => {
    if (filter !== status) {
      setFilter(status);
      setCurrentPage(1);
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setFilter('all');
    setCurrentPage(1);
  };

  if (initialLoading) {
    return embedded ? (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 rounded bg-ink-200" />
                <div className="h-9 w-9 rounded-xl bg-ink-200" />
              </div>
              <div className="mt-2 h-8 w-12 rounded bg-ink-200" />
            </div>
          ))}
        </div>
        <div className="h-16 rounded-2xl border border-ink-100/80 bg-white" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl border border-ink-100/80 bg-white" />
          ))}
        </div>
      </div>
    ) : (
      <ReportsSkeleton />
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-ink-50/30 px-2'}>
      <div className="space-y-8">
        {/* HEADER — hidden when embedded in AdminModeration tabs */}
        {!embedded && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Moderation
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Community Reports
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                {stats.total} total reports · Reports from item discussions
              </p>
            </div>
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Flag}
            color="text-ink-700"
            bg="bg-ink-50"
            active={filter === 'all'}
            onClick={() => handleStatClick('all')}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50"
            active={filter === 'pending'}
            onClick={() => handleStatClick('pending')}
          />
          <StatCard
            label="Reviewed"
            value={stats.reviewed}
            icon={Eye}
            color="text-blue-600"
            bg="bg-blue-50"
            active={filter === 'reviewed'}
            onClick={() => handleStatClick('reviewed')}
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={CheckCircle}
            color="text-emerald-600"
            bg="bg-emerald-50"
            active={filter === 'resolved'}
            onClick={() => handleStatClick('resolved')}
          />
          <StatCard
            label="Dismissed"
            value={stats.dismissed}
            icon={XCircle}
            color="text-ink-500"
            bg="bg-ink-50"
            active={filter === 'dismissed'}
            onClick={() => handleStatClick('dismissed')}
          />
        </div>

        {/* FILTER TOOLBAR */}
        <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="flex items-center gap-3 text-left transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                <Filter size={16} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-ink-800">Filters & Search</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'No active filters'}
                  {search && ' · Search active'}
                </p>
              </div>
            </button>

            <div className="flex items-center justify-between gap-3 border-t border-ink-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}

              {/* VIEW TOGGLE */}
              {viewMode === 'table' ? (
                <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      viewMode === 'table'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <Table size={14} />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      viewMode === 'cards'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <Grid size={14} />
                    <span>Cards</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('table')}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition text-ink-500 hover:text-ink-800"
                  >
                    <Table size={14} />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCustomCols(true);
                      setGridCols(Math.max(1, gridCols - 1));
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                    title="Fewer columns"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="min-w-[1.5rem] px-2 text-center text-xs font-bold text-ink-700">
                    {gridCols}
                  </span>
                  <button
                    onClick={() => {
                      setIsCustomCols(true);
                      setGridCols(Math.min(4, gridCols + 1));
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                    title="More columns"
                  >
                    <PlusIcon size={12} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="rounded-xl border border-ink-200/80 bg-ink-100 px-3.5 py-2 text-xs font-bold text-ink-700 shadow-sm hover:bg-ink-50"
              >
                <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
                {filtersExpanded ? (
                  <ChevronUp size={10} className="ml-1 inline" />
                ) : (
                  <ChevronDown size={10} className="ml-1 inline" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded Filter Area */}
          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden border-t border-ink-100"
              >
                <div className="space-y-4 bg-ink-50/20 px-5 py-4">
                  <div className="relative">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by reporter, reported user, reason, or message..."
                      className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                    />
                  </div>
                  {(activeFilterCount > 0 || search) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <X size={14} />
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTENT */}
        {filteredReports.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <Flag size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No reports found</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                {filter !== 'all' || search
                  ? 'Try adjusting your filters or search term.'
                  : 'No community reports available right now.'}
              </p>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <motion.div
            className="grid gap-4"
            animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {paginatedReports.map((report) => {
              const message = report.message || {};
              const author = message.author || {};
              const isDeleted = message.is_deleted || false;

              return (
                <motion.div
                  key={report.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {report.reporter?.avatar_url ? (
                          <img
                            src={report.reporter.avatar_url}
                            alt={report.reporter?.full_name || 'Reporter'}
                            className="h-10 w-10 rounded-full object-cover border border-ink-100 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 border border-ink-200 shrink-0 text-xs font-bold text-ink-600">
                            {(report.reporter?.full_name || 'U').charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/admin/users-profile/${report.reporter?.id}`}
                            className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition"
                            title={report.reporter?.full_name || 'Unknown'}
                          >
                            {report.reporter?.full_name || 'Unknown'}
                          </Link>
                          <p className="truncate text-xs text-ink-400 mt-0.5">
                            {new Date(report.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                          STATUS_COLORS[report.status] || 'bg-ink-50 text-ink-600 border-ink-200'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    {/* Reported user */}
                    <div>
                      <span className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                        Reported User
                      </span>
                      {author.id ? (
                        <Link
                          to={`/admin/users-profile/${author.id}`}
                          className="mt-0.5 block truncate text-sm font-bold text-ink-800 hover:text-primary-600 transition"
                          title={author.full_name || 'Unknown'}
                        >
                          {author.full_name || 'Unknown'}
                        </Link>
                      ) : (
                        <p className="mt-0.5 text-sm text-ink-400 italic">Unknown</p>
                      )}
                    </div>

                    {/* Message */}
                    {message.id && (
                      <div>
                        <span className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                          Message
                        </span>
                        <Link
                          to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                          className="mt-0.5 block text-sm text-ink-600 hover:text-primary-600 transition line-clamp-2 leading-relaxed"
                          title={message.content || ''}
                        >
                          {isDeleted ? (
                            <span className="text-ink-400 italic line-through">
                              [deleted] {message.content}
                            </span>
                          ) : (
                            message.content
                          )}
                        </Link>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <span className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                        Reason
                      </span>
                      <p
                        className="mt-0.5 text-sm font-bold text-ink-800 truncate"
                        title={report.reason || 'No reason'}
                      >
                        {report.reason || 'No reason'}
                      </p>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-3 flex items-center justify-between gap-2 rounded-b-2xl">
                    {message.id ? (
                      <Link
                        to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                        className="inline-flex h-9 items-center gap-2 px-3.5 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 shadow-xs transition"
                      >
                        <MessageCircle size={14} />
                        <span>View</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-400 italic">No message</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openStatusModal(report)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 hover:bg-ink-100 hover:text-primary-600 transition shadow-xs"
                        title="Change Status"
                      >
                        <PenLine size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteReport(report);
                          setShowDeleteModal(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition shadow-xs"
                        title="Delete Report"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ink-50/80 border-b border-ink-200/60 text-[11px] font-black uppercase tracking-wider text-ink-500">
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Reported User</th>
                    <th className="py-3 px-4">Message</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 text-xs text-ink-700">
                  {paginatedReports.map((report) => {
                    const message = report.message || {};
                    const author = message.author || {};
                    const isDeleted = message.is_deleted || false;

                    return (
                      <tr key={report.id} className="hover:bg-primary-50/20 transition group">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {report.reporter?.avatar_url ? (
                              <img
                                src={report.reporter.avatar_url}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-ink-200"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center text-[10px] font-bold text-ink-600">
                                {(report.reporter?.full_name || 'U').charAt(0)}
                              </div>
                            )}
                            <Link
                              to={`/admin/users-profile/${report.reporter?.id}`}
                              className="font-bold text-ink-800 hover:text-primary-600 hover:underline transition truncate"
                              title={report.reporter?.full_name || 'Unknown'}
                            >
                              {report.reporter?.full_name || 'Unknown'}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {author.id ? (
                            <div className="flex items-center gap-2">
                              {author.avatar_url ? (
                                <img
                                  src={author.avatar_url}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-ink-200"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center text-[10px] font-bold text-ink-600">
                                  {(author.full_name || 'U').charAt(0)}
                                </div>
                              )}
                              <Link
                                to={`/admin/users-profile/${author.id}`}
                                className="font-bold text-ink-800 hover:text-primary-600 hover:underline transition truncate"
                                title={author.full_name || 'Unknown'}
                              >
                                {author.full_name || 'Unknown'}
                              </Link>
                            </div>
                          ) : (
                            <span className="text-ink-400 italic">Unknown</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px]">
                          {message.id ? (
                            <Link
                              to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                              className="block text-ink-600 hover:text-primary-600 transition truncate"
                              title={message.content || ''}
                            >
                              {isDeleted ? (
                                <span className="text-ink-400 italic line-through">
                                  [deleted] {message.content}
                                </span>
                              ) : (
                                message.content
                              )}
                            </Link>
                          ) : (
                            <span className="text-ink-400 italic">Message not found</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="capitalize font-medium">{report.reason}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              STATUS_COLORS[report.status] ||
                              'bg-ink-50 text-ink-600 border-ink-200'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-ink-500 font-medium">
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {message.id && (
                              <Link
                                to={`/admin/discussions/item/${message.item_id}?message=${message.id}&case=reported`}
                                className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-primary-200"
                                title="View Discussion"
                              >
                                <MessageCircle size={12} />
                                <span>View</span>
                              </Link>
                            )}
                            <button
                              onClick={() => openStatusModal(report)}
                              className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-ink-100 rounded-lg transition"
                              title="Change Status"
                            >
                              <PenLine size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteReport(report);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Report"
                            >
                              <Trash2 size={14} />
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-ink-400">
              Showing{' '}
              <span className="font-bold text-ink-600">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-bold text-ink-600">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-ink-600">
                {filteredReports.length.toLocaleString()}
              </span>{' '}
              reports
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedReport(null);
          setNewStatus('');
        }}
        title="Change Report Status"
        size="sm"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-ink-50/50 rounded-xl border border-ink-100/60 shadow-sm">
              <p className="text-sm font-extrabold text-ink-900 truncate">
                {selectedReport.reason || 'Report'}
              </p>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  STATUS_COLORS[selectedReport.status] ||
                  'bg-ink-50 text-ink-600 border-ink-200'
                }`}
              >
                {selectedReport.status}
              </span>
            </div>
            {selectedReport.message?.content && (
              <div className="bg-ink-50/60 p-3 rounded-xl border border-ink-100 max-h-24 overflow-y-auto">
                <p className="text-xs text-ink-600 line-clamp-3 leading-relaxed">
                  {selectedReport.message.content}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {STATUS_OPTIONS.filter((opt) => opt.value !== 'all').map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewStatus(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                    newStatus === opt.value
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                      : 'border-ink-200 hover:border-ink-300 bg-white text-ink-700'
                  }`}
                >
                  <div className="flex-1 text-left">
                    <p className="text-sm font-extrabold capitalize">{opt.label}</p>
                  </div>
                  {newStatus === opt.value && (
                    <CheckCircle size={16} className="text-primary-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedReport(null);
                  setNewStatus('');
                }}
                className="flex-1 px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={
                  updatingStatus || !newStatus || newStatus === selectedReport.status
                }
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatus ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
          setShowDeleteModal(false);
          setDeleteReport(null);
        }}
        title="Delete Report"
        size="sm"
      >
        {deleteReport && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-rose-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-ink-600">
                  Are you sure you want to delete this report?
                </p>
                <p className="text-xs text-ink-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-ink-50/50 rounded-xl p-3 border border-ink-100/60">
              <p className="text-xs font-bold text-ink-700">
                {deleteReport.reason || 'Report'}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {new Date(deleteReport.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReport(null);
                }}
                className="flex-1 px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Trash2 size={14} />
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

// ============================================================
// Helper Components
// ============================================================

const StatCard = ({
  label,
  value,
  icon: Icon,
  color = 'text-ink-700',
  bg = 'bg-ink-50',
  active,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`group rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-left w-full ${
        active
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
          : 'border-ink-100/80 bg-white hover:border-primary-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-bold ${active ? 'text-primary-700' : 'text-ink-500'}`}>
          {label}
        </p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border border-ink-100/60`}
        >
          <Icon className={color} size={16} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </button>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
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
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-ink-100/80 bg-white p-1 shadow-sm">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronLeft size={14} />
      </button>
      {getPageNumbers().map((page, index) =>
        page === '...' ? (
          <span
            key={`dots-${index}`}
            className="flex h-8 w-8 items-center justify-center text-xs font-medium text-ink-300"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold transition-all ${
              currentPage === page
                ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white shadow-sm'
                : 'text-ink-500 hover:bg-ink-50 hover:text-primary-600'
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default ItemDiscussionReports;
