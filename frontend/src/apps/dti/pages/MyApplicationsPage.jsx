import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { applicationsAPI, chatAPI, itemsAPI } from '@/services/api/dtiApi';

import ChatDrawer from '../components/chat/ChatDrawer';
import Modal from '@/reusables/Modal';
import SupportModal from '../components/common/SupportModal';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_DISPLAY,
} from '@/utils/constants';

// ============================================================
// Skeleton
// Matches the real page structure, spacing, widths and heights
// ============================================================
const MyApplicationsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">
    {/* REUSABLE PAGE NAVIGATION SKELETON */}
    <PageNavigationSkeleton />

    {/* PAGE CONTENT */}
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="animate-pulse">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-ink-200" />
            <div className="h-3 w-40 rounded bg-ink-200" />
          </div>

          <div className="h-9 w-48 rounded bg-ink-200" />

          <div className="mt-2 h-4 w-72 max-w-full rounded bg-ink-200" />
        </div>

        <div className="h-11 w-32 rounded-xl bg-ink-200 animate-pulse" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm"
          >
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

      {/* FILTER TOOLBAR */}
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

      {/* APPLICATION GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm"
          >
            <div className="space-y-3 p-4 animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-ink-200" />
                  <div className="space-y-1">
                    <div className="h-4 w-28 rounded bg-ink-200" />
                    <div className="h-3 w-20 rounded bg-ink-200" />
                  </div>
                </div>
                <div className="h-5 w-20 rounded-full bg-ink-200" />
              </div>

              <div className="h-8 w-full rounded bg-ink-200" />

              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-ink-200" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 p-3 animate-pulse">
              <div className="flex gap-1">
                <div className="h-8 w-8 rounded-lg bg-ink-200" />
                <div className="h-8 w-8 rounded-lg bg-ink-200" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-ink-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// Select
// ============================================================
function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  showIcon = false,
  className = '',
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-ink-100 bg-white px-4 py-3 pr-10 text-sm font-semibold text-ink-700 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
      >
        {options.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label || placeholder}
          </option>
        ))}
      </select>

      {showIcon && selected?.icon ? (
        <i
          className={`bi ${selected.icon} pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 text-sm text-ink-400 sm:block`}
        />
      ) : null}

      <i className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400" />
    </div>
  );
}

// ============================================================
// Status helper
// ============================================================
const getApplicationStatusDisplay = (status) =>
  APPLICATION_STATUS_DISPLAY?.[status] || {
    label: status || 'Unknown',
    icon: 'bi-circle',
    color: 'gray',
  };

// ============================================================
// Main Component
// ============================================================
const MyApplicationsPage = () => {
  const breakpoint = useBreakpoint();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [expandedApp, setExpandedApp] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedApp, setReceivedApp] = useState(null);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [receivedApps, setReceivedApps] = useState(new Set());

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportApp, setSupportApp] = useState(null);

  // ============================================================
  // Responsive columns
  // ============================================================
  const getDefaultCols = useCallback((bp) => {
    if (bp === 'xs' || bp === 'sm') return 1;
    if (bp === 'md') return 2;
    if (bp === 'lg') return 3;
    if (bp === 'xl' || bp === '2xl') return 4;
    return 4;
  }, []);

  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // ============================================================
  // Filters
  // ============================================================
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filterStatus) count += 1;
    if (sortBy !== 'newest') count += 1;

    return count;
  }, [filterStatus, sortBy]);

  const statusOptions = useMemo(
    () => [
      {
        value: '',
        label: 'All Statuses',
        icon: 'bi-funnel',
      },
      ...Object.values(APPLICATION_STATUSES).map((statusValue) => ({
        value: statusValue,
        label:
          APPLICATION_STATUS_DISPLAY?.[statusValue]?.label ||
          statusValue,
        icon:
          APPLICATION_STATUS_DISPLAY?.[statusValue]?.icon ||
          'bi-circle',
        color:
          APPLICATION_STATUS_DISPLAY?.[statusValue]?.color ||
          'gray',
      })),
    ],
    []
  );

  const sortOptions = [
    {
      value: 'newest',
      label: 'Newest First',
      icon: 'bi-sort-down',
    },
    {
      value: 'oldest',
      label: 'Oldest First',
      icon: 'bi-sort-up',
    },
  ];

  // ============================================================
  // Fetch
  // ============================================================
  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const response = await applicationsAPI.getMy();

      setAllApplications(
        Array.isArray(response?.data?.applications)
          ? response.data.applications
          : []
      );
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load your applications');
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ============================================================
  // URL status filter
  // ============================================================
  useEffect(() => {
    const urlStatus = searchParams.get('sort-status');

    if (
      urlStatus &&
      Object.values(APPLICATION_STATUSES).includes(urlStatus)
    ) {
      setFilterStatus(urlStatus);
    } else {
      setFilterStatus('');
    }
  }, [searchParams]);

  useEffect(() => {
    const currentStatus = searchParams.get('sort-status');

    if (filterStatus) {
      if (currentStatus !== filterStatus) {
        setSearchParams(
          { 'sort-status': filterStatus },
          { replace: true }
        );
      }
    } else if (currentStatus) {
      setSearchParams({}, { replace: true });
    }
  }, [filterStatus, searchParams, setSearchParams]);

  // ============================================================
  // Reset pagination
  // ============================================================
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  // ============================================================
  // Close dropdown
  // ============================================================
  useEffect(() => {
    if (!dropdownOpen) return;

    const handler = (event) => {
      if (!event.target.closest('[data-dropdown-menu]')) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [dropdownOpen]);

  // ============================================================
  // Filter / sort
  // ============================================================
  const filteredApplications = useMemo(() => {
    let result = [...allApplications];

    if (filterStatus) {
      result = result.filter(
        (app) => app.status === filterStatus
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();

      result = result.filter((app) => {
        const title = app.item?.title || '';
        const category = app.item?.category || '';
        const message = app.message || '';

        return (
          title.toLowerCase().includes(term) ||
          category.toLowerCase().includes(term) ||
          message.toLowerCase().includes(term)
        );
      });
    }

    result.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();

      return sortBy === 'oldest'
        ? aDate - bDate
        : bDate - aDate;
    });

    return result;
  }, [
    allApplications,
    filterStatus,
    searchTerm,
    sortBy,
  ]);

  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return filteredApplications.slice(
      start,
      start + itemsPerPage
    );
  }, [filteredApplications, currentPage]);

  // ============================================================
  // Stats
  // ============================================================
  const stats = useMemo(
    () => ({
      total: allApplications.length,

      pending: allApplications.filter(
        (a) => a.status === APPLICATION_STATUSES.PENDING
      ).length,

      accepted: allApplications.filter(
        (a) => a.status === APPLICATION_STATUSES.ACCEPTED
      ).length,

      notSelected: allApplications.filter(
        (a) => a.status === APPLICATION_STATUSES.NOT_SELECTED
      ).length,

      cancelled: allApplications.filter(
        (a) => a.status === APPLICATION_STATUSES.CANCELLED
      ).length,
    }),
    [allApplications]
  );

  // ============================================================
  // Helpers
  // ============================================================
  const getStatusBadge = useCallback((status) => {
    const display = getApplicationStatusDisplay(status);

    const colorMap = {
      green:
        'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow:
        'bg-amber-50 text-amber-700 border-amber-200',
      red:
        'bg-rose-50 text-rose-700 border-rose-200',
      gray:
        'bg-ink-50 text-ink-600 border-ink-200',
    };

    return {
      classes:
        colorMap[display.color] || colorMap.gray,
      label: display.label || status,
      icon: display.icon || 'bi-circle',
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return 'N/A';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canConfirmReceipt = (app) => {
    const item = app.item || {};

    return (
      app.status === APPLICATION_STATUSES.ACCEPTED &&
      item.status === 'pending' &&
      Boolean(item.donor_confirmed_at) &&
      !receivedApps.has(app.id) &&
      item.status !== 'completed'
    );
  };

  const isWaitingForDonor = (app) => {
    const item = app.item || {};

    return (
      app.status === APPLICATION_STATUSES.ACCEPTED &&
      (item.status === 'pending' ||
        item.status === 'active') &&
      !item.donor_confirmed_at &&
      !receivedApps.has(app.id)
    );
  };

  const isItemCompleted = (app) => {
    const item = app.item || {};

    return (
      item.status === 'completed' ||
      receivedApps.has(app.id)
    );
  };

  // ============================================================
  // Actions
  // ============================================================
  const handleCancelApplication = async () => {
    if (!selectedApplication) return;

    setActionLoading(true);

    try {
      await applicationsAPI.cancel(
        selectedApplication.id
      );

      toast.success('Application cancelled successfully');

      setAllApplications((prev) =>
        prev.map((application) =>
          application.id === selectedApplication.id
            ? {
                ...application,
                status:
                  APPLICATION_STATUSES.CANCELLED,
              }
            : application
        )
      );

      setShowCancelModal(false);
      setSelectedApplication(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          'Failed to cancel application'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsReceived = async () => {
    if (!receivedApp?.item?.id) return;

    setReceivedLoading(true);

    try {
      await itemsAPI.confirmReceivedByWinner(
        receivedApp.item.id
      );

      toast.success(
        '🎉 Receipt confirmed! Donation complete!'
      );

      setReceivedApps((prev) => {
        const next = new Set(prev);
        next.add(receivedApp.id);
        return next;
      });

      await fetchApplications();

      setShowReceivedModal(false);
      setReceivedApp(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          'Failed to confirm receipt'
      );
    } finally {
      setReceivedLoading(false);
    }
  };

  const handleOpenChat = async (app) => {
    const item = app.item || {};

    if (!item.id) {
      toast.error('Item information missing');
      return;
    }

    if (
      app.status !== APPLICATION_STATUSES.PENDING &&
      app.status !== APPLICATION_STATUSES.ACCEPTED
    ) {
      toast.error(
        'Chat is only available for pending or accepted applications'
      );
      return;
    }

    if (!user?.id) {
      toast.error('Please sign in to use chat');
      return;
    }

    try {
      const response =
        await chatAPI.getOrCreateConversationWithApplicant(
          item.id,
          user.id
        );

      const data = response?.data;

      if (!data?.conversation?.id) {
        throw new Error('Invalid conversation response');
      }

      setChatConversation({
        conversationId: data.conversation.id,
        otherUser: data.other_user || item.donor,
        item,
        isDonor: data.is_donor || false,
      });

      setIsChatOpen(true);
      setDropdownOpen(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          'Failed to open chat'
      );
    }
  };

  const openSupportModal = (app) => {
    setSupportApp(app);
    setShowSupportModal(true);
    setDropdownOpen(null);
  };

  const copyItemId = async (itemId) => {
    if (!itemId) {
      toast.error('No item ID');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(itemId);
      } else {
        const textarea =
          document.createElement('textarea');

        textarea.value = itemId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      toast.success('Item ID copied to clipboard!');
    } catch {
      toast.error('Failed to copy Item ID');
    }

    setDropdownOpen(null);
  };

  const toggleDropdown = (id) => {
    setDropdownOpen((current) =>
      current === id ? null : id
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return <MyApplicationsSkeleton />;
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      {/* ======================================================
          PAGE NAVIGATION
      ====================================================== */}
      <PageNavigation />

      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-400" />

              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                Your applications dashboard
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              My Applications
            </h1>

            <p className="mt-1 text-sm text-ink-500">
              Track items you have applied to receive from
              the community.
            </p>
          </div>

          <Link
            to="/browse"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <i className="bi bi-search text-base" />
            Browse Items
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Applications"
            value={stats.total}
            icon="bi-file-text"
            color="text-ink-900"
            bg="bg-ink-50"
          />

          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon="bi-clock-history"
            color="text-amber-600"
            bg="bg-amber-50"
          />

          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon="bi-check-circle-fill"
            color="text-emerald-600"
            bg="bg-emerald-50"
          />

          <StatCard
            label="Not Selected"
            value={stats.notSelected}
            icon="bi-dash-circle"
            color="text-ink-500"
            bg="bg-ink-50"
          />

          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon="bi-x-circle"
            color="text-rose-500"
            bg="bg-rose-50"
          />
        </div>

        {/* FILTER TOOLBAR */}
        <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                setFiltersExpanded((value) => !value)
              }
              className="flex items-center gap-3 text-left transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                <i className="bi bi-funnel text-sm" />
              </div>

              <div>
                <p className="text-sm font-extrabold text-ink-800">
                  Filter & Sort Applications
                </p>

                <p className="mt-0.5 text-xs text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${
                        activeFilterCount > 1 ? 's' : ''
                      }`
                    : 'All applications visible'}

                  {searchTerm && ' · Search active'}
                </p>
              </div>
            </button>

            <div className="flex items-center justify-between gap-3 border-t border-ink-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}

              {/* GRID CONTROLS */}
              <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCols(true);
                    setGridCols((value) =>
                      Math.max(1, value - 1)
                    );
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                  title="Fewer columns"
                >
                  <i className="bi bi-dash-lg text-xs" />
                </button>

                <span className="min-w-[1.5rem] px-2 text-center text-xs font-bold text-ink-700">
                  {gridCols} cols
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCols(true);
                    setGridCols((value) =>
                      Math.min(4, value + 1)
                    );
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                  title="More columns"
                >
                  <i className="bi bi-plus-lg text-xs" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFiltersExpanded((value) => !value)
                }
                className="rounded-xl border border-ink-200/80 bg-ink-100 px-3.5 py-2 text-xs font-bold text-ink-700 shadow-sm hover:bg-ink-50"
              >
                <span>
                  {filtersExpanded ? 'Hide' : 'Expand'}
                </span>

                <i
                  className={`bi bi-chevron-${
                    filtersExpanded ? 'up' : 'down'
                  } ml-1 text-[10px]`}
                />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {filtersExpanded && (
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
                  ease: 'easeInOut',
                }}
                className="overflow-hidden border-t border-ink-100"
              >
                <div className="space-y-4 bg-ink-50/20 px-5 py-4">
                  <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search by item title, category, or message..."
                      className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Select
                      options={statusOptions}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder="All Statuses"
                      showIcon
                      className="w-full sm:flex-1"
                    />

                    <Select
                      options={sortOptions}
                      value={sortBy}
                      onChange={setSortBy}
                      placeholder="Sort By"
                      showIcon
                      className="w-full sm:flex-1"
                    />
                  </div>

                  {(activeFilterCount > 0 ||
                    searchTerm) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <i className="bi bi-x-circle" />
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* EMPTY STATE */}
        {filteredApplications.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-inbox text-2xl" />
              </div>

              <h3 className="text-lg font-extrabold text-ink-800">
                No applications found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                {searchTerm || filterStatus
                  ? 'No applications match your current filters or search terms. Try clearing them.'
                  : "You haven't applied to any community items yet. Explore available listings!"}
              </p>

              {!searchTerm && !filterStatus ? (
                <Link
                  to="/browse"
                  className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <i className="bi bi-search text-xs" />
                  Explore Available Items
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm hover:bg-ink-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* GRID */}
            <motion.div
              className="grid gap-4"
              animate={{
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
            >
              {paginatedApplications.map((app) => {
                const badge = getStatusBadge(app.status);
                const item = app.item || {};

                const isExpanded =
                  expandedApp === app.id;

                const canChat =
                  app.status ===
                    APPLICATION_STATUSES.ACCEPTED ||
                  app.status ===
                    APPLICATION_STATUSES.PENDING;

                const canCancel =
                  app.status ===
                  APPLICATION_STATUSES.PENDING;

                const canReinterest =
                  app.status ===
                    APPLICATION_STATUSES.PENDING &&
                  item.status === 'active';

                const showConfirmReceipt =
                  canConfirmReceipt(app);

                const isMenuOpen =
                  dropdownOpen === app.id;

                return (
                  <motion.div
                    key={app.id}
                    layout
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="group flex flex-col justify-between overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="space-y-3 p-4">
                        {/* CARD HEADER */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <Link
                              to={`/item/${item.id}`}
                              className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50 p-1 shadow-sm"
                            >
                              {item.images?.[0] ? (
                                <img
                                  src={item.images[0]}
                                  alt={item.title || 'Item'}
                                  className="h-full w-full rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <i className="bi bi-image text-ink-300" />
                                </div>
                              )}
                            </Link>

                            <div className="min-w-0">
                              <Link
                                to={`/item/${item.id}`}
                                className="block truncate text-sm font-extrabold text-ink-900 transition hover:text-primary-600"
                              >
                                {item.title ||
                                  'Untitled Item'}
                              </Link>

                              <p className="truncate text-xs font-medium text-ink-400">
                                Applied{' '}
                                {formatDate(
                                  app.created_at
                                )}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.classes}`}
                          >
                            <i
                              className={`bi ${badge.icon} text-[10px]`}
                            />
                            {badge.label}
                          </span>
                        </div>

                        {/* MESSAGE */}
                        {app.message && (
                          <p className="line-clamp-2 text-xs text-ink-500">
                            <span className="font-medium">
                              Note:
                            </span>{' '}
                            {app.message}
                          </p>
                        )}

                        {/* CATEGORY */}
                        <div className="flex items-center justify-between text-xs font-medium text-ink-500">
                          <span className="flex items-center gap-1">
                            <i className="bi bi-tag" />
                            {item.category ||
                              'Uncategorized'}
                          </span>

                          {app.reinterest_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                              <i className="bi bi-arrow-repeat" />
                              {app.reinterest_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTION BAR */}
                    <div className="relative flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 p-3">
                      <div className="flex items-center gap-1">
                        {canChat && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenChat(app)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                            title="Chat"
                          >
                            <i className="bi bi-chat-dots text-sm" />
                          </button>
                        )}

                        {showConfirmReceipt && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceivedApp(app);
                              setShowReceivedModal(true);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-all hover:bg-emerald-50"
                            title="Confirm Receipt"
                          >
                            <i className="bi bi-box-seam text-sm" />
                          </button>
                        )}

                        {/* MENU */}
                        <div
                          className="relative"
                          data-dropdown-menu
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleDropdown(app.id)
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                              isMenuOpen
                                ? 'bg-primary-50 text-primary-600'
                                : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                            }`}
                            aria-label="More actions"
                          >
                            <i className="bi bi-three-dots-vertical text-sm" />
                          </button>

                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  scale: 0.95,
                                  y: -4,
                                }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  y: 0,
                                }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.95,
                                  y: -4,
                                }}
                                transition={{
                                  duration: 0.15,
                                }}
                                className="absolute left-0 top-full z-[999] mt-2 w-48 origin-top-left overflow-hidden rounded-xl border border-ink-100/80 bg-white py-1.5 shadow-lg"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSupportModal(app)
                                  }
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                                    <i className="bi bi-flag text-xs" />
                                  </span>
                                  Report Issue
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    copyItemId(item.id)
                                  }
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                    <i className="bi bi-clipboard text-xs" />
                                  </span>
                                  Copy Item ID
                                </button>

                                {canReinterest && (
                                  <Link
                                    to={`/redeclare-interest/${app.id}`}
                                    onClick={() =>
                                      setDropdownOpen(null)
                                    }
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                  >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                      <i className="bi bi-arrow-repeat text-xs" />
                                    </span>
                                    Re-declare Interest
                                  </Link>
                                )}

                                {canCancel && (
                                  <>
                                    <div className="my-1 h-px bg-ink-100" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedApplication(
                                          app
                                        );
                                        setShowCancelModal(
                                          true
                                        );
                                        setDropdownOpen(null);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                        <i className="bi bi-x-circle text-xs" />
                                      </span>
                                      Cancel Application
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedApp(
                            isExpanded ? null : app.id
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-ink-50 hover:text-primary-600"
                        aria-label="Toggle details"
                      >
                        <i
                          className={`bi bi-chevron-${
                            isExpanded ? 'up' : 'down'
                          } text-xs`}
                        />
                      </button>
                    </div>

                    {/* EXPANDED DETAILS */}
                    <AnimatePresence>
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
                            duration: 0.2,
                          }}
                          className="overflow-hidden border-t border-ink-100 bg-ink-50/30"
                        >
                          <div className="space-y-3 p-4">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                                Your Message
                              </span>

                              <p className="mt-1 rounded-xl border border-ink-100/60 bg-white p-3 text-sm leading-relaxed text-ink-700">
                                {app.message ||
                                  'No note provided.'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-ink-100/60 bg-white p-3">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                                  Donor
                                </span>

                                <div className="mt-1 flex items-center gap-2">
                                  {item.donor
                                    ?.avatar_url ? (
                                    <img
                                      src={
                                        item.donor
                                          .avatar_url
                                      }
                                      alt=""
                                      className="h-7 w-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                                      {item.donor?.full_name?.charAt(
                                        0
                                      ) || 'D'}
                                    </div>
                                  )}

                                  <span className="text-xs font-bold text-ink-800">
                                    {item.donor
                                      ?.full_name ||
                                      'Community Donor'}
                                  </span>
                                </div>
                              </div>

                              <div className="rounded-xl border border-ink-100/60 bg-white p-3">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                                  Item
                                </span>

                                <div className="mt-1 text-xs text-ink-500">
                                  <span className="font-bold text-ink-800">
                                    Condition:
                                  </span>{' '}
                                  {item.condition ||
                                    'N/A'}

                                  <br />

                                  <span className="font-bold text-ink-800">
                                    Shipping:
                                  </span>{' '}
                                  {item.donor_pays_shipping
                                    ? 'Donor pays'
                                    : 'Winner pays'}
                                </div>
                              </div>
                            </div>

                            {app.status ===
                              APPLICATION_STATUSES.ACCEPTED && (
                              <div className="space-y-2">
                                {isWaitingForDonor(
                                  app
                                ) && (
                                  <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50 p-3 text-xs text-amber-800">
                                    <i className="bi bi-clock-history shrink-0 text-amber-600" />
                                    <span>
                                      Waiting for donor to
                                      mark item as given.
                                    </span>
                                  </div>
                                )}

                                {showConfirmReceipt && (
                                  <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-xs text-emerald-800">
                                    <div className="flex items-center gap-2">
                                      <i className="bi bi-check-circle-fill shrink-0 text-emerald-600" />
                                      <span>
                                        Donor marked as given.
                                        Confirm receipt?
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReceivedApp(
                                          app
                                        );
                                        setShowReceivedModal(
                                          true
                                        );
                                      }}
                                      className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                )}

                                {isItemCompleted(app) && (
                                  <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50 p-3 text-xs text-primary-800">
                                    <i className="bi bi-check-circle-fill shrink-0 text-primary-600" />
                                    <span>
                                      Receipt confirmed! Donation
                                      complete.
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-ink-400">
                  Showing{' '}
                  <span className="font-bold text-ink-600">
                    {(currentPage - 1) *
                      itemsPerPage +
                      1}
                  </span>
                  –
                  <span className="font-bold text-ink-600">
                    {Math.min(
                      currentPage * itemsPerPage,
                      totalItems
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold text-ink-600">
                    {totalItems}
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

        {/* CANCEL MODAL */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedApplication(null);
          }}
          title="Cancel Application"
          size="sm"
        >
          {selectedApplication && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                  <i className="bi bi-exclamation-triangle text-xl" />
                </div>

                <div>
                  <p className="text-sm leading-relaxed text-ink-600">
                    Are you sure you want to cancel your
                    application for{' '}
                    <span className="font-extrabold text-ink-900">
                      "{selectedApplication.item?.title}"
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedApplication(null);
                  }}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
                >
                  Keep Application
                </button>

                <button
                  type="button"
                  onClick={handleCancelApplication}
                  disabled={actionLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {actionLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* RECEIVED MODAL */}
        <Modal
          isOpen={showReceivedModal}
          onClose={() => {
            setShowReceivedModal(false);
            setReceivedApp(null);
          }}
          title="Confirm Receipt"
          size="sm"
        >
          {receivedApp && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                  <i className="bi bi-box-seam text-xl" />
                </div>

                <div>
                  <p className="text-sm leading-relaxed text-ink-600">
                    Have you successfully received{' '}
                    <span className="font-extrabold text-ink-900">
                      "{receivedApp.item?.title}"
                    </span>
                    ? Confirming will close the donation cycle.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceivedModal(false);
                    setReceivedApp(null);
                  }}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
                >
                  Not Yet
                </button>

                <button
                  type="button"
                  onClick={handleMarkAsReceived}
                  disabled={receivedLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {receivedLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Yes, Received'
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* SUPPORT */}
        <SupportModal
          isOpen={showSupportModal}
          onClose={() => {
            setShowSupportModal(false);
            setSupportApp(null);
          }}
          itemId={supportApp?.item?.id}
          applicationId={supportApp?.id}
          applicantId={supportApp?.applicant_id}
          reporterType={
            supportApp?.status ===
            APPLICATION_STATUSES.ACCEPTED
              ? 'winner'
              : 'applicant'
          }
        />

        {/* CHAT */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setChatConversation(null);
          }}
          initialConversation={chatConversation}
        />
      </div>
    </div>
  );
};

// ============================================================
// Stat Card
// ============================================================
function StatCard({
  label,
  value,
  icon,
  color = 'text-ink-700',
  bg = 'bg-ink-50',
}) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">
          {label}
        </p>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}
        >
          <i
            className={`bi ${icon} ${color} text-sm`}
          />
        </div>
      </div>

      <p
        className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}
      >
        {typeof value === 'number'
          ? value.toLocaleString()
          : value}
      </p>
    </div>
  );
}

// ============================================================
// Pagination
// ============================================================
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
    } else {
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
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-ink-100/80 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() =>
          onPageChange(
            currentPage - 1
          )
        }
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <i className="bi bi-chevron-left text-xs" />
      </button>

      {getPageNumbers().map(
        (page, index) =>
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
              onClick={() =>
                onPageChange(page)
              }
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
        onClick={() =>
          onPageChange(
            currentPage + 1
          )
        }
        disabled={
          currentPage === totalPages
        }
        aria-label="Next page"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <i className="bi bi-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default MyApplicationsPage;
