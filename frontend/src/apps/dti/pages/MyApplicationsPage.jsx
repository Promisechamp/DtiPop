import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Inbox,
  Tag,
  Repeat,
  MessageCircle,
  Package,
  Flag,
  Copy,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { applicationsAPI, chatAPI, itemsAPI } from '@/services/api/dtiApi';

import ChatModal from '@/pages/chat/ChatModal';
import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import SupportModal from '../components/common/SupportModal';

import { useBreakpoint } from '@/reusables/Breakpoint';
import Select from '@/reusables/Select';
import FilterBar, { ColumnStepper, useResponsiveGrid } from '@/reusables/FilterBar';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_DISPLAY,
} from '@/utils/constants';

/* -------------------------------------------------------------------------- */
/* SKELETON                                                                   */
/* -------------------------------------------------------------------------- */

const MyApplicationsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-12 w-36 animate-pulse rounded-2xl bg-ink-200" />
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

        {/* FILTER BAR */}
        <div className="rounded-3xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="h-12 flex-1 animate-pulse rounded-2xl bg-ink-100" />
            <div className="flex gap-2">
              <div className="h-12 w-32 animate-pulse rounded-2xl bg-ink-100" />
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-2.5 w-24 animate-pulse rounded-full bg-ink-100" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-ink-100" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-24 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <div className="flex gap-1">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                </div>
                <div className="h-9 w-20 animate-pulse rounded-xl bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* STATUS HELPERS                                                             */
/* -------------------------------------------------------------------------- */

const getApplicationStatusDisplay = (status) =>
  APPLICATION_STATUS_DISPLAY?.[status] || {
    label: status || 'Unknown',
  };

const getApplicationStatusStyle = (status) => {
  const key = String(status || '').toLowerCase();

  const map = {
    [String(APPLICATION_STATUSES.PENDING).toLowerCase()]: {
      wrapper: 'border-warning-200 bg-warning-50 text-warning-700',
      dot: 'bg-warning-500',
    },
    [String(APPLICATION_STATUSES.ACCEPTED).toLowerCase()]: {
      wrapper: 'border-success-200 bg-success-50 text-success-700',
      dot: 'bg-success-500',
    },
    [String(APPLICATION_STATUSES.NOT_SELECTED).toLowerCase()]: {
      wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
      dot: 'bg-ink-400',
    },
    [String(APPLICATION_STATUSES.CANCELLED).toLowerCase()]: {
      wrapper: 'border-danger-200 bg-danger-50 text-danger-700',
      dot: 'bg-danger-500',
    },
  };

  const fallback = {
    wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
    dot: 'bg-ink-400',
  };

  return map[key] || fallback;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const MyApplicationsPage = () => {
  const breakpoint = useBreakpoint();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  
		const { gridCols, setGridCols, gridStyle } = useResponsiveGrid({ min: 1, max: 4 });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [expandedApp, setExpandedApp] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedApp, setReceivedApp] = useState(null);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [receivedApps, setReceivedApps] = useState(new Set());

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [openingChatId, setOpeningChatId] = useState(null);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportApp, setSupportApp] = useState(null);

  
		

  /* ---------------------------------------------------------------------- */
  /* Filters                                                                */
  /* ---------------------------------------------------------------------- */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count += 1;
    if (sortBy !== 'newest') count += 1;
    return count;
  }, [filterStatus, sortBy]);

  const hasActiveFilters = Boolean(filterStatus) || Boolean(searchTerm);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: SlidersHorizontal },
      ...Object.values(APPLICATION_STATUSES).map((statusValue) => {
        const display = getApplicationStatusDisplay(statusValue);
        return {
          value: statusValue,
          label: display.label || statusValue,
          icon:
            statusValue === APPLICATION_STATUSES.PENDING
              ? Clock
              : statusValue === APPLICATION_STATUSES.ACCEPTED
              ? CheckCircle2
              : statusValue === APPLICATION_STATUSES.CANCELLED
              ? XCircle
              : MinusCircle,
        };
      }),
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'newest', label: 'Newest First', icon: ArrowDown },
      { value: 'oldest', label: 'Oldest First', icon: ArrowUp },
    ],
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Fetch                                                                  */
  /* ---------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------- */
  /* URL status filter                                                      */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const urlStatus = searchParams.get('sort-status');
    if (urlStatus && Object.values(APPLICATION_STATUSES).includes(urlStatus)) {
      setFilterStatus(urlStatus);
    } else {
      setFilterStatus('');
    }
  }, [searchParams]);

  useEffect(() => {
    const currentStatus = searchParams.get('sort-status');
    if (filterStatus) {
      if (currentStatus !== filterStatus) {
        setSearchParams({ 'sort-status': filterStatus }, { replace: true });
      }
    } else if (currentStatus) {
      setSearchParams({}, { replace: true });
    }
  }, [filterStatus, searchParams, setSearchParams]);

  /* ---------------------------------------------------------------------- */
  /* Reset pagination                                                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  /* ---------------------------------------------------------------------- */
  /* Filter/sort                                                            */
  /* ---------------------------------------------------------------------- */
  const filteredApplications = useMemo(() => {
    let result = [...allApplications];

    if (filterStatus) {
      result = result.filter((app) => app.status === filterStatus);
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
      return sortBy === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return result;
  }, [allApplications, filterStatus, searchTerm, sortBy]);

  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  /* ---------------------------------------------------------------------- */
  /* Stats                                                                  */
  /* ---------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */
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
      (item.status === 'pending' || item.status === 'active') &&
      !item.donor_confirmed_at &&
      !receivedApps.has(app.id)
    );
  };

  const isItemCompleted = (app) => {
    const item = app.item || {};
    return item.status === 'completed' || receivedApps.has(app.id);
  };

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */
  const handleCancelApplication = async () => {
    if (!selectedApplication) return;
    setActionLoading(true);
    try {
      await applicationsAPI.cancel(selectedApplication.id);
      toast.success('Application cancelled successfully');
      setAllApplications((prev) =>
        prev.map((application) =>
          application.id === selectedApplication.id
            ? { ...application, status: APPLICATION_STATUSES.CANCELLED }
            : application
        )
      );
      setShowCancelModal(false);
      setSelectedApplication(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || 'Failed to cancel application'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsReceived = async () => {
    if (!receivedApp?.item?.id) return;
    setReceivedLoading(true);
    try {
      await itemsAPI.confirmReceivedByWinner(receivedApp.item.id);
      toast.success('🎉 Receipt confirmed! Donation complete!');
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
        error?.response?.data?.error || 'Failed to confirm receipt'
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

    setOpeningChatId(app.id);
    const loadingToastId = toast.loading('Opening chat…');

    try {
      const response = await chatAPI.getOrCreateConversationWithApplicant(
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

      toast.dismiss(loadingToastId);
      setIsChatOpen(true);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(error?.response?.data?.error || 'Failed to open chat');
    } finally {
      setOpeningChatId(null);
    }
  };

  const openSupportModal = (app) => {
    setSupportApp(app);
    setShowSupportModal(true);
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
        const textarea = document.createElement('textarea');
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
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */
  if (loading) {
    return <MyApplicationsSkeleton />;
  }

  /* ---------------------------------------------------------------------- */
  /* Active filter chips                                                    */
  /* ---------------------------------------------------------------------- */
  const activeFilterChips = [
    filterStatus && {
      key: 'status',
      label: getApplicationStatusDisplay(filterStatus).label || filterStatus,
      onRemove: () => setFilterStatus(''),
    },
    searchTerm && {
      key: 'search',
      label: `Search: ${searchTerm}`,
      onRemove: () => setSearchTerm(''),
    },
    sortBy !== 'newest' && {
      key: 'sort',
      label: sortOptions.find((o) => o.value === sortBy)?.label || sortBy,
      onRemove: () => setSortBy('newest'),
    },
  ].filter(Boolean);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="min-h-full bg-transparent">


      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <FileText size={14} />
                <span>Your applications dashboard</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                My Applications
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Track items you have applied to receive from the community.
              </p>
            </div>

            <Link
              to="/browse"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
            >
              <Search size={17} strokeWidth={2.5} />
              <span>Browse Items</span>
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Applications"
            value={stats.total}
            icon={FileText}
            tone="ink"
          />
          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Not Selected"
            value={stats.notSelected}
            icon={MinusCircle}
            tone="ink"
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            tone="danger"
          />
        </div>

        {/* SEARCH + FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by item title, category, or message..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchApplications}
          refreshing={loading}
          activeFilters={activeFilterChips}
          onClearAll={clearAllFilters}
        >
          <div className="grid gap-4 md:grid-cols-3">
												<Select
														options={statusOptions}
														value={filterStatus}
														onChange={setFilterStatus}
														placeholder="All Statuses"
														showIcon
												/>
										
												<Select
														options={sortOptions}
														value={sortBy}
														onChange={setSortBy}
														placeholder="Sort By"
														showIcon
												/>
										
												<ColumnStepper
														label="Grid columns"
														value={gridCols}
														onChange={setGridCols}
														min={1}
														max={4}
														
												/>
										</div>
        </FilterBar>

        {/* RESULT SUMMARY */}
        {!loading && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-ink-500">
              {filteredApplications.length === 1
                ? '1 application'
                : `${filteredApplications.length} applications`}
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
        )}

        {/* EMPTY */}
        {filteredApplications.length === 0 ? (
          <EmptyState filtered={hasActiveFilters} onReset={clearAllFilters} />
        ) : (
          <>
            {/* GRID */}
												<motion.div
              className="grid gap-4"
              animate={gridStyle}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >

              {paginatedApplications.map((app) => {
                const item = app.item || {};
                const isExpanded = expandedApp === app.id;

                const canChat =
                  app.status === APPLICATION_STATUSES.ACCEPTED ||
                  app.status === APPLICATION_STATUSES.PENDING;

                const canCancel = app.status === APPLICATION_STATUSES.PENDING;

                const canReinterest =
                  app.status === APPLICATION_STATUSES.PENDING &&
                  item.status === 'active';

                const showConfirmReceipt = canConfirmReceipt(app);
                const isOpeningThisChat = openingChatId === app.id;

                const menuItems = [
                  {
                    key: 'report',
                    icon: Flag,
                    label: 'Report Issue',
                    onClick: () => openSupportModal(app),
                  },
                  {
                    key: 'copy',
                    icon: Copy,
                    label: 'Copy Item ID',
                    onClick: () => copyItemId(item.id),
                  },
                  ...(canReinterest
                    ? [
                        {
                          key: 'reinterest',
                          icon: Repeat,
                          label: 'Re-declare Interest',
                          to: `/redeclare-interest/${app.id}`,
                        },
                      ]
                    : []),
                  ...(canCancel
                    ? [
                        { key: 'divider-cancel', divider: true },
                        {
                          key: 'cancel',
                          icon: XCircle,
                          label: 'Cancel Application',
                          danger: true,
                          onClick: () => {
                            setSelectedApplication(app);
                            setShowCancelModal(true);
                          },
                        },
                      ]
                    : []),
                ];

                return (
                  <motion.article
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="group relative flex flex-col justify-between rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                  >
                    <ApplicationCardBody
                      app={app}
                      item={item}
                      isExpanded={isExpanded}
                      onToggle={() =>
                        setExpandedApp(isExpanded ? null : app.id)
                      }
                      onOpenChat={() => handleOpenChat(app)}
                      onConfirmReceipt={() => {
                        setReceivedApp(app);
                        setShowReceivedModal(true);
                      }}
                      isOpeningChat={isOpeningThisChat}
                      canChat={canChat}
                      showConfirmReceipt={showConfirmReceipt}
                      menuItems={menuItems}
                      formatDate={formatDate}
                      isWaitingForDonor={isWaitingForDonor}
                      isItemCompleted={isItemCompleted}
                    />
                  </motion.article>
                );
              })}
            </motion.div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-ink-500">
                  Showing{' '}
                  <span className="font-extrabold text-ink-700">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  –
                  <span className="font-extrabold text-ink-700">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-extrabold text-ink-700">
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
      </div>

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
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Cancel this application?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Your application for{' '}
                  <strong>"{selectedApplication.item?.title}"</strong> will be
                  withdrawn. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedApplication(null);
                }}
                disabled={actionLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Application
              </button>

              <button
                type="button"
                onClick={handleCancelApplication}
                disabled={actionLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Yes, Cancel
                  </>
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
            <div className="flex items-start gap-4 rounded-2xl border border-success-200 bg-success-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
                <Package size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-success-900">
                  Confirm you received this item?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-success-700">
                  Have you successfully received{' '}
                  <strong>"{receivedApp.item?.title}"</strong>? Confirming will
                  close the donation cycle.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowReceivedModal(false);
                  setReceivedApp(null);
                }}
                disabled={receivedLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Not Yet
              </button>

              <button
                type="button"
                onClick={handleMarkAsReceived}
                disabled={receivedLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success-600 px-4 text-sm font-extrabold text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {receivedLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Yes, Received
                  </>
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
          supportApp?.status === APPLICATION_STATUSES.ACCEPTED
            ? 'winner'
            : 'applicant'
        }
      />

      {/* CHAT */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        conversationId={
          chatConversation?.id ||
          chatConversation?.conversation_id ||
          chatConversation?.conversationId ||
          null
        }
        currentUserId={user?.id}
        currentUserName={user?.full_name || user?.fullName}
        otherParticipant={
          chatConversation?.otherParticipant ||
          chatConversation?.other_participant ||
          chatConversation?.other_user ||
          chatConversation?.otherUser ||
          null
        }
        showDtiOptions={true}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* APPLICATION CARD                                                           */
/* -------------------------------------------------------------------------- */

function ApplicationCardBody({
  app,
  item,
  isExpanded,
  onToggle,
  onOpenChat,
  onConfirmReceipt,
  isOpeningChat,
  canChat,
  showConfirmReceipt,
  menuItems,
  formatDate,
  isWaitingForDonor,
  isItemCompleted,
}) {
  const status = getApplicationStatusStyle(app.status);
  const display = getApplicationStatusDisplay(app.status);

  return (
    <>
      <div className="p-4">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/item/${item.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.title || 'Item'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink-300">
                  <ImageIcon size={18} />
                </span>
              )}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-ink-950 transition group-hover:text-primary-600">
                {item.title || 'Untitled Item'}
              </span>
              <span className="mt-1 block truncate text-[11px] font-bold text-ink-400">
                Applied {formatDate(app.created_at)}
              </span>
            </span>
          </Link>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${status.wrapper}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {display.label}
          </span>
        </div>

        {/* MESSAGE */}
        {app.message && (
          <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-ink-500">
            <span className="font-extrabold text-ink-700">Note:</span>{' '}
            {app.message}
          </p>
        )}

        {/* CATEGORY + REINTEREST */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
            <Tag size={12} />
            {item.category || 'Uncategorized'}
          </span>

          {app.reinterest_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[10px] font-extrabold text-primary-700">
              <Repeat size={11} />
              {app.reinterest_count}
            </span>
          )}
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-3 py-3">
        <div className="flex items-center gap-1">
          {canChat && (
            <button
              type="button"
              onClick={onOpenChat}
              disabled={isOpeningChat}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 transition hover:bg-primary-50 hover:text-primary-600 disabled:cursor-wait disabled:opacity-60"
              title={isOpeningChat ? 'Opening chat…' : 'Open chat'}
              aria-label="Open chat"
            >
              {isOpeningChat ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <MessageCircle size={15} />
              )}
            </button>
          )}

          {showConfirmReceipt && (
            <button
              type="button"
              onClick={onConfirmReceipt}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-success-600 transition hover:bg-success-50"
              title="Confirm receipt"
              aria-label="Confirm receipt"
            >
              <Package size={15} />
            </button>
          )}

          <ActionMenu items={menuItems} placement="right" align="top" />
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
          aria-label="Toggle details"
        >
          <span>{isExpanded ? 'Hide' : 'Details'}</span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* EXPANDED DETAILS */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-ink-100 bg-ink-50/40"
          >
            <div className="space-y-3 p-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Your message
                </span>
                <p className="mt-1 rounded-2xl border border-ink-100 bg-white p-3 text-xs font-medium leading-relaxed text-ink-700">
                  {app.message || 'No note provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Donor
                  </span>

                  <div className="mt-1.5 flex items-center gap-2">
                    {item.donor?.avatar_url ? (
                      <img
                        src={item.donor.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-black text-ink-600">
                        {item.donor?.full_name?.charAt(0) || 'D'}
                      </span>
                    )}

                    <span className="truncate text-xs font-extrabold text-ink-800">
                      {item.donor?.full_name || 'Community Donor'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Item
                  </span>
                  <div className="mt-1.5 text-[11px] font-medium text-ink-500">
                    <span className="font-extrabold text-ink-800">
                      Condition:
                    </span>{' '}
                    {item.condition || 'N/A'}
                    <br />
                    <span className="font-extrabold text-ink-800">
                      Shipping:
                    </span>{' '}
                    {item.donor_pays_shipping ? 'Donor pays' : 'Winner pays'}
                  </div>
                </div>
              </div>

              {app.status === APPLICATION_STATUSES.ACCEPTED && (
                <div className="space-y-2">
                  {isWaitingForDonor(app) && (
                    <div className="flex items-center gap-2 rounded-2xl border border-warning-200 bg-warning-50 p-3 text-xs font-semibold text-warning-800">
                      <Clock size={14} className="shrink-0 text-warning-600" />
                      <span>Waiting for donor to mark item as given.</span>
                    </div>
                  )}

                  {showConfirmReceipt && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-success-200 bg-success-50 p-3 text-xs font-semibold text-success-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="shrink-0 text-success-600"
                        />
                        <span>Donor marked as given. Confirm receipt?</span>
                      </div>

                      <button
                        type="button"
                        onClick={onConfirmReceipt}
                        className="shrink-0 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-success-700"
                      >
                        Confirm
                      </button>
                    </div>
                  )}

                  {isItemCompleted(app) && (
                    <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-3 text-xs font-semibold text-primary-800">
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-primary-600"
                      />
                      <span>Receipt confirmed! Donation complete.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT CARD                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, icon: Icon, tone = 'ink' }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };
  const style = tones[tone] || tones.ink;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ filtered, onReset }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          {filtered ? <Search size={27} /> : <Inbox size={27} />}
        </div>

        <h2 className="mt-5 text-lg font-black text-ink-950">
          {filtered ? 'No matching applications' : 'No applications yet'}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {filtered
            ? 'Try adjusting your search or filters to find the application you are looking for.'
            : "You haven't applied to any community items yet. Explore available listings to get started."}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {filtered ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <RefreshCw size={15} />
              Clear filters
            </button>
          ) : (
            <Link
              to="/browse"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
            >
              <Search size={16} />
              Browse items
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                 */
/* -------------------------------------------------------------------------- */

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

export default MyApplicationsPage;