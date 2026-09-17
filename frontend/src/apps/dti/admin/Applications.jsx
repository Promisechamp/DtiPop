import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  Grid,
  Grid3x3,
  Table as TableIcon,
  ChevronUp,
  ChevronDown,
  Search,
  SortDesc,
  SortAsc,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Star,
  Plus,
  Minus
} from 'lucide-react';
import { adminAPI } from '@/services/api/dtiApi';
import {
  ITEM_CATEGORIES,
  APPLICATION_STATUS_DISPLAY,
  getCategoryByValue,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';

const ITEMS_PER_PAGE = 20;

// ============================================================
// Helpers
// ============================================================

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusBadge = (status) => {
  const display = getApplicationStatusDisplay(status);
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    gray: 'bg-ink-50 text-ink-600 border-ink-200',
  };
  return {
    classes: colorMap[display?.color] || colorMap.gray,
    label: display?.label || status,
    icon: display?.icon,
  };
};

// ============================================================
// Skeleton (Unified)
// ============================================================
const ApplicationsSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />
    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded w-48 mb-2" />
      <div className="h-4 bg-ink-200 rounded w-32" />
    </div>
    {/* Stats - already responsive */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4">
          <div className="h-3 bg-ink-200 rounded w-16 mb-2" />
          <div className="h-6 bg-ink-200 rounded w-10" />
        </div>
      ))}
    </div>
    {/* Table skeleton with horizontal scroll on small screens */}
    <div className="overflow-x-auto rounded-2xl border border-ink-100/80 bg-white shadow-sm">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ink-200" />
          <div className="h-5 bg-ink-200 rounded w-24" />
        </div>
        {/* Skeleton rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-ink-50">
            <div className="w-10 h-10 rounded-full bg-ink-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-ink-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-ink-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-ink-200 rounded w-16 shrink-0" />
            <div className="h-6 bg-ink-200 rounded w-20 shrink-0" />
            <div className="h-5 bg-ink-200 rounded w-24 shrink-0" />
            <div className="flex gap-1 shrink-0">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-8 h-8 rounded-xl bg-ink-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);


// ============================================================
// Application Card for Grid View
// ============================================================
const ApplicationCard = ({ app, onViewDetails, onStatusUpdate, onDelete }) => {
  const badge = getStatusBadge(app.status);
  const category = getCategoryByValue(app.item?.category);

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-4 space-y-3">
        {/* Header: avatar + name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {app.applicant?.avatar_url ? (
              <img
                src={app.applicant.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-ink-100 shadow-sm"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
                <User className="h-4 w-4 text-ink-400" />
              </div>
            )}
            <div className="min-w-0">
              <button
                onClick={() => onViewDetails(app)}
                className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition"
              >
                {app.applicant?.full_name || 'Anonymous'}
              </button>
              <p className="truncate text-xs font-medium text-ink-400">
                {app.applicant?.email || 'No email'}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Item details */}
        <div>
          <p className="text-sm font-extrabold text-ink-900 truncate">
            {app.item?.title || 'Unknown Item'}
          </p>
          {category && (
            <div className="flex items-center gap-1.5 mt-1">
              {renderIcon(category.icon, 'h-3 w-3', category.color)}
              <span className="text-xs font-bold text-ink-600">{category.label}</span>
            </div>
          )}
        </div>

        {/* Date and location */}
        <div className="flex items-center justify-between text-xs font-medium text-ink-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(app.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {app.applicant?.location || 'N/A'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-ink-100 bg-ink-50/50 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewDetails(app)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {app.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusUpdate(app, 'accepted')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-emerald-50/60 hover:text-emerald-600"
                title="Accept"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => onStatusUpdate(app, 'rejected')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          <Link
            to={`/item/${app.item?.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
            title="View Item"
          >
            <CircleArrowOutUpRight className="h-4 w-4" />
          </Link>
        </div>
        <button
          onClick={() => onDelete(app)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================
const AdminApplications = () => {
  const breakpoint = useBreakpoint();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modals
  const [showAppModal, setShowAppModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // ============================================================
  // Responsive default columns
  // ============================================================
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
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // ============================================================
  // Click outside dropdown
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.action-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (categoryFilter) count++;
    if (sortBy !== 'created_at') count++;
    return count;
  }, [statusFilter, categoryFilter, sortBy]);

  // Filter options from constants
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: Filter },
      ...Object.entries(APPLICATION_STATUS_DISPLAY).map(([value, display]) => ({
        value,
        label: display.label,
        icon: display.icon,
        color: display.color,
      })),
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

  const sortOptions = [
    { value: 'created_at', label: 'Newest First', icon: SortDesc },
    { value: 'status', label: 'Status', icon: Filter },
  ];

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(search && search.trim() && { search: search.trim() }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getApplications(params);
      const data = response.data;

      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchApplications();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Handlers
  const handleStatusUpdate = async (app, status) => {
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
      toast.error(error.response?.data?.error || 'Failed to update application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (app) => {
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
      toast.error(error.response?.data?.error || 'Failed to delete application');
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
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

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setShowAppModal(true);
  };

  if (loading && applications.length === 0) return <ApplicationsSkeleton />;

  return (
    <div className="space-y-5 pb-10">
      <PageNavigation />

      {/* ========== HEADER (Unified) ========== */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Application management
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
            Application Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total.toLocaleString()} applications · Review and manage
          </p>
        </div>
      </div>

      {/* ========== STATS (Unified) ========== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total"
          value={stats.total}
          icon={FileText}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          label="Accepted"
          value={stats.accepted}
          icon={CheckCircle2}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="text-rose-600"
          bg="bg-rose-50"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={Slash}
          color="text-ink-500"
          bg="bg-ink-50"
        />
      </div>

      {/* ========== FILTER TOOLBAR (Unified) ========== */}
      <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center gap-3 text-left transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink-800">
                Filters & Search
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {activeFilterCount > 0
                  ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                  : 'No active filters'}
                {search && ' · Search active'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3 justify-between sm:justify-end border-t border-ink-50 pt-3 sm:border-0 sm:pt-0">
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}

            {/* ===== UNIQUE VIEW TOGGLE ===== */}
            {viewMode === 'table' ? (
              <div className="flex items-center bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'cards'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition text-ink-500 hover:text-ink-800"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => {
                    setIsCustomCols(true);
                    setGridCols(Math.max(1, gridCols - 1));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 hover:bg-white/50 hover:text-primary-700 transition"
                  title="Fewer columns"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-xs font-bold text-ink-700 min-w-[1.5rem] text-center">
                  {gridCols}
                </span>
                <button
                  onClick={() => {
                    setIsCustomCols(true);
                    setGridCols(Math.min(4, gridCols + 1));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 hover:bg-white/50 hover:text-primary-700 transition"
                  title="More columns"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 flex items-center"
            >
              <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
              {filtersExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {filtersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-ink-100"
            >
              <div className="space-y-4 px-5 py-4 bg-ink-50/20">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 h-4 w-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by applicant name, item title..."
                    className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={handleFilterChange(setStatusFilter)}
                    placeholder="All Statuses"
                    showIcon
                    className="w-full sm:flex-1"
                  />
                  <Select
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={handleFilterChange(setCategoryFilter)}
                    placeholder="All Categories"
                    showIcon
                    searchable
                    className="w-full sm:flex-1"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    options={sortOptions}
                    value={sortBy}
                    onChange={setSortBy}
                    placeholder="Sort By"
                    showIcon
                    className="w-full sm:w-48"
                  />
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition hover:bg-ink-50"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </button>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={clearAllFilters}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== EMPTY STATE ========== */}
      {applications.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <FileText className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-extrabold text-ink-800">No applications found</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              {search || statusFilter || categoryFilter
                ? 'Try adjusting your filters'
                : 'No applications yet'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ========== TABLE VIEW ========== */}
          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60">
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Applicant
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Item
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Category
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 whitespace-nowrap">
                        Applied
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {applications.map((app) => {
                      const badge = getStatusBadge(app.status);
                      const category = getCategoryByValue(app.item?.category);
                      const isMenuOpen = openMenuId === app.id;

                      return (
                        <motion.tr
                          key={app.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group transition-colors hover:bg-primary-50/20"
                        >
                          {/* Applicant */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {app.applicant?.avatar_url ? (
                                <img
                                  src={app.applicant.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover border border-ink-100 shadow-sm"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
                                  <User className="h-4 w-4 text-ink-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <button
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setShowAppModal(true);
                                  }}
                                  className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition"
                                >
                                  {app.applicant?.full_name || 'Anonymous'}
                                </button>
                                <p className="truncate text-xs font-medium text-ink-400">
                                  {app.applicant?.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Item */}
                          <td className="px-5 py-3.5">
                            <p className="truncate text-sm font-extrabold text-ink-900 max-w-xs">
                              {app.item?.title || 'Unknown Item'}
                            </p>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-3.5">
                            {category ? (
                              <div className="flex items-center gap-1.5">
                                {renderIcon(category.icon, 'h-3 w-3', category.color)}
                                <span className="text-sm font-bold text-ink-600">
                                  {category.label}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-ink-400">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          {/* Applied Date */}
                          <td className="px-5 py-3.5 text-sm font-medium text-ink-500 whitespace-nowrap">
                            {formatDate(app.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowAppModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusUpdate(app, 'accepted')}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-emerald-50/60 hover:text-emerald-600"
                                  title="Accept"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}

                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusUpdate(app, 'rejected')}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}

                              <Link
                                to={`/item/${app.item?.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Item"
                              >
                                <CircleArrowOutUpRight className="h-4 w-4" />
                              </Link>

                              {/* Dropdown Menu */}
                              <div className="action-menu relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(isMenuOpen ? null : app.id);
                                  }}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                    isMenuOpen
                                      ? 'bg-primary-50 text-primary-600'
                                      : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                                  }`}
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-0 top-full z-[999] mt-2 w-48 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-xl shadow-ink-900/10 backdrop-blur-md">
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedApp(app);
                                        setShowAppModal(true);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                        <Eye className="h-3.5 w-3.5" />
                                      </span>
                                      View Details
                                    </button>

                                    {app.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleStatusUpdate(app, 'accepted');
                                          }}
                                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-emerald-50/60 hover:text-emerald-700"
                                        >
                                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                                            <Check className="h-3.5 w-3.5" />
                                          </span>
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleStatusUpdate(app, 'rejected');
                                          }}
                                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-rose-50/60 hover:text-rose-700"
                                        >
                                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                            <X className="h-3.5 w-3.5" />
                                          </span>
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    <div className="my-1 h-px bg-ink-100" />
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleDelete(app);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </span>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ========== GRID VIEW with dynamic columns & animations ========== */
            <motion.div
              className="grid gap-4"
              animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
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

          {/* ========== PAGINATION (Unified) ========== */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
              <p className="text-xs font-medium text-ink-400">
                Showing{' '}
                <span className="font-bold text-ink-600">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>
                –
                <span className="font-bold text-ink-600">
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)}
                </span>{' '}
                of{' '}
                <span className="font-bold text-ink-600">
                  {total.toLocaleString()}
                </span>{' '}
                applications
              </p>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* ============================================================
          MODALS (Unified)
      ============================================================ */}

      {/* Application Details Modal */}
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
            <div className="flex">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Application Details</h2>
              </div>
              <div className="flex gap-5 ml-auto items-center">
                <Link
                  to={`/admin/users-profile/${selectedApp.applicant?.id}`}
                  className="text-ink-400 hover:text-primary-600 shrink-0"
                  title="View User Profile"
                >
                  <CircleArrowOutUpRight className="h-4 w-4" />
                </Link>
                <X
                  className="h-4 w-4 text-ink-400 hover:text-primary-600 shrink-0 cursor-pointer"
                  onClick={() => {
                    setShowAppModal(false);
                    setSelectedApp(null);
                  }}
                />
              </div>
            </div>

            <hr className="border-ink-100" />

            <div className="flex items-start gap-4">
              {selectedApp.applicant?.avatar_url ? (
                <img
                  src={selectedApp.applicant.avatar_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border border-ink-100 shadow-sm"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
                  <User className="h-6 w-6 text-ink-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-ink-900">
                    {selectedApp.applicant?.full_name || 'Anonymous'}
                  </h3>
                </div>
                <p className="text-sm font-medium text-ink-500">
                  {selectedApp.applicant?.email || 'No email'}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      getStatusBadge(selectedApp.status).classes
                    }`}
                  >
                    {getStatusBadge(selectedApp.status).label}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-4">
              <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                Applied For
              </p>
              <p className="text-sm font-extrabold text-ink-900">
                {selectedApp.item?.title || 'Unknown Item'}
              </p>
              {selectedApp.item?.category && (
                <div className="mt-1 flex items-center gap-1.5">
                  {(() => {
                    const cat = getCategoryByValue(selectedApp.item.category);
                    return cat ? renderIcon(cat.icon, 'h-4 w-4', cat.color) : null;
                  })()}
                  <span className="text-xs font-bold text-ink-500">
                    {selectedApp.item.category}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                  Location
                </p>
                <p className="text-sm font-bold text-ink-900">
                  {selectedApp.applicant?.location || 'Not specified'}
                </p>
              </div>
              <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                  Applied Date
                </p>
                <p className="text-sm font-bold text-ink-900">
                  {formatDate(selectedApp.created_at)}
                </p>
              </div>
            </div>

            {selectedApp.message && (
              <div>
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                  Message
                </p>
                <p className="text-sm font-bold text-ink-700 rounded-xl border border-ink-100/60 bg-ink-50/50 p-3">
                  {selectedApp.message}
                </p>
              </div>
            )}

            {selectedApp.applicant && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                    Rating
                  </p>
                  <p className="text-sm font-extrabold text-ink-900">
                    {selectedApp.applicant.rating || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                    Items Given
                  </p>
                  <p className="text-sm font-extrabold text-ink-900">
                    {selectedApp.applicant.items_given || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center">
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">
                    Items Received
                  </p>
                  <p className="text-sm font-extrabold text-ink-900">
                    {selectedApp.applicant.items_received || 0}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-ink-100">
              <button
                onClick={() => {
                  setShowAppModal(false);
                  setSelectedApp(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Close
              </button>
              {selectedApp.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setShowAppModal(false);
                      handleStatusUpdate(selectedApp, 'accepted');
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      setShowAppModal(false);
                      handleStatusUpdate(selectedApp, 'rejected');
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedApp(null);
          setNewStatus('');
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedApp && (
          <>
            <div className="flex items-center">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">
                  {newStatus === 'accepted' ? 'Accept Application' : 'Reject Application'}
                </h2>
              </div>
              <X
                className="h-4 w-4 text-ink-400 hover:text-primary-600 shrink-0 cursor-pointer ml-auto"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedApp(null);
                  setNewStatus('');
                }}
              />
            </div>
            <hr className="border-ink-100 my-3" />

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  newStatus === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}
              >
                {newStatus === 'accepted' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-600">
                  {newStatus === 'accepted' ? (
                    <>
                      Accept application from{' '}
                      <span className="font-extrabold text-ink-900">
                        {selectedApp.applicant?.full_name || 'Anonymous'}
                      </span>
                      ?
                    </>
                  ) : (
                    <>
                      Reject application from{' '}
                      <span className="font-extrabold text-ink-900">
                        {selectedApp.applicant?.full_name || 'Anonymous'}
                      </span>
                      ?
                    </>
                  )}
                </p>
                <p className="text-xs text-ink-400">
                  For: {selectedApp.item?.title || 'Unknown Item'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedApp(null);
                  setNewStatus('');
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={actionLoading}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2 ${
                  newStatus === 'accepted'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600'
                }`}
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  newStatus === 'accepted' ? 'Accept' : 'Reject'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedApp(null);
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedApp && (
          <>
            <div className="flex items-center">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Delete Application</h2>
              </div>
              <X
                className="h-4 w-4 text-ink-400 hover:text-primary-600 shrink-0 cursor-pointer ml-auto"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedApp(null);
                }}
              />
            </div>
            <hr className="border-ink-100 my-3" />

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-ink-600">
                  Are you sure you want to delete this application from{' '}
                  <span className="font-extrabold text-ink-900">
                    {selectedApp.applicant?.full_name || 'Anonymous'}
                  </span>
                  ?
                </p>
                <p className="text-xs text-ink-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedApp(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

// ============================================================
// Stat Card Component (Unified)
// ============================================================
function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-ink-700',
  bg = 'bg-ink-50',
}) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border border-ink-100/60`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ============================================================
// Pagination Component (Unified)
// ============================================================
function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-ink-100/80 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
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
            type="button"
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
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default AdminApplications;
