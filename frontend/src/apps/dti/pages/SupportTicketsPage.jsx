import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Search,
  Filter,
  Plus,
  Clock,
  Repeat,
  CheckCircle2,
  XCircle,
  Circle,
  MessageCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  LogIn,
  Inbox,
  RefreshCw,
  Loader2,
  ArrowDown,
  ArrowUp,
  Package,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { supportAPI } from '@/services/api/dtiApi';
import SupportModal from '../components/common/SupportModal';
import TicketMessagesModal from '../components/common/TicketMessagesModal';

import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import ActionMenu from '@/reusables/ActionMenu';
import FilterBar, {
  ColumnStepper,
  useResponsiveGrid,
} from '@/reusables/FilterBar';
import {
  TICKET_STATUS_DISPLAY,
  getReasonLabel,
  formatTicketDate,
} from '@/utils/constants';

/* ============================================================
   STATUS HELPERS
============================================================ */

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'open':
      return Clock;
    case 'in_progress':
      return Repeat;
    case 'resolved':
      return CheckCircle2;
    case 'closed':
      return XCircle;
    default:
      return Circle;
  }
};

const getStatusDisplay = (status) =>
  TICKET_STATUS_DISPLAY?.[status] || {
    label: status || 'Unknown',
    color: 'gray',
  };

const getStatusBadgeClasses = (status) => {
  const display = TICKET_STATUS_DISPLAY?.[status];
  const colorMap = {
    green: 'border-success-200 bg-success-50 text-success-700',
    yellow: 'border-warning-200 bg-warning-50 text-warning-700',
    blue: 'border-primary-200 bg-primary-50 text-primary-700',
    red: 'border-danger-200 bg-danger-50 text-danger-700',
    gray: 'border-ink-200 bg-ink-50 text-ink-600',
  };
  return colorMap[display?.color] || colorMap.gray;
};

/* ============================================================
   SUPPORT REASONS
============================================================ */

const DONOR_SUPPORT_REASONS = [
  { value: 'winner_unresponsive', label: 'Winner is unresponsive' },
  { value: 'winner_no_show', label: "Winner didn't show up for pickup" },
  {
    value: 'winner_dispute',
    label: 'Dispute with winner over item condition',
  },
  { value: 'shipping_issue', label: 'Issue with shipping/delivery' },
  { value: 'item_damaged', label: 'Item was damaged during shipping' },
  { value: 'other', label: 'Other' },
];

const WINNER_SUPPORT_REASONS = [
  { value: 'donor_unresponsive', label: 'Donor is unresponsive' },
  { value: 'donor_no_show', label: "Donor didn't show up for pickup" },
  { value: 'donor_dispute', label: 'Dispute with donor over item condition' },
  { value: 'shipping_issue', label: 'Issue with shipping/delivery' },
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'other', label: 'Other' },
];

const APPLICANT_SUPPORT_REASONS = [
  { value: 'donor_unresponsive', label: 'Donor is unresponsive' },
  { value: 'donor_no_show', label: "Donor didn't show up for pickup" },
  { value: 'donor_dispute', label: 'Dispute with donor over item condition' },
  { value: 'application_question', label: 'Question about my application' },
  { value: 'other', label: 'Other' },
];

const USER_SUPPORT_REASONS = [
  { value: 'general_question', label: 'General Question' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'ban_appeal', label: 'Ban Appeal' },
  { value: 'other', label: 'Other' },
];

/* ============================================================
   SKELETON
============================================================ */

const SupportTicketsSkeleton = () => (
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
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-ink-200" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-ink-100" />
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <div className="h-9 w-20 animate-pulse rounded-xl bg-ink-100" />
                <div className="flex gap-1">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const SupportTicketsPage = () => {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { gridCols, setGridCols, gridStyle } = useResponsiveGrid({
    min: 1,
    max: 4,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [openingTicketId, setOpeningTicketId] = useState(null);

  const [editingTicket, setEditingTicket] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);

  const [deletingTicket, setDeletingTicket] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  /* ============================================================
     FILTER OPTIONS
  ============================================================ */

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count += 1;
    if (sortBy !== 'newest') count += 1;
    return count;
  }, [filterStatus, sortBy]);

  const hasActiveFilters = Boolean(filterStatus) || Boolean(searchTerm);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: Filter },
      ...Object.entries(TICKET_STATUS_DISPLAY).map(([value, display]) => ({
        value,
        label: display.label,
        icon: getStatusIconComponent(value),
      })),
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

  /* ============================================================
     FETCH TICKETS
  ============================================================ */

  const fetchTickets = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await supportAPI.getMyTickets();
      const ticketsData = response.data?.tickets || response.data || [];
      setTickets(ticketsData);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError(err.response?.data?.error || 'Failed to load support tickets');
      toast.error('Failed to load tickets');
      setTickets([]);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  /* ============================================================
     FILTER + SORT
  ============================================================ */

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (filterStatus) {
      result = result.filter((ticket) => ticket.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (ticket) =>
          getReasonLabel(ticket.reason).toLowerCase().includes(term) ||
          ticket.description?.toLowerCase().includes(term) ||
          ticket.item?.title?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return sortBy === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return result;
  }, [tickets, filterStatus, searchTerm, sortBy]);

  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      inProgress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      closed: tickets.filter((t) => t.status === 'closed').length,
    }),
    [tickets]
  );

  /* ============================================================
     HELPERS
  ============================================================ */

  const getAllReasons = () => {
    const all = new Map();
    const allReasons = [
      ...DONOR_SUPPORT_REASONS,
      ...WINNER_SUPPORT_REASONS,
      ...APPLICANT_SUPPORT_REASONS,
      ...USER_SUPPORT_REASONS,
    ];
    allReasons.forEach((r) => all.set(r.value, r));
    return Array.from(all.values());
  };

  const canEditOrDelete = (ticket) => {
    return ticket.status === 'resolved' || ticket.status === 'closed';
  };

  /* ============================================================
     HANDLERS
  ============================================================ */

  const openMessages = async (ticket) => {
    if (openingTicketId) return;
    setOpeningTicketId(ticket.id);
    try {
      const response = await supportAPI.getTicket(ticket.id);
      setSelectedTicket(response.data?.ticket || ticket);
      setShowMessagesModal(true);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      toast.error('Failed to load ticket details');
    } finally {
      setOpeningTicketId(null);
    }
  };

  const handleSendReply = async (message) => {
    if (!selectedTicket) return;
    setSendingReply(true);
    try {
      await supportAPI.replyToTicket(selectedTicket.id, message);
      const response = await supportAPI.getTicket(selectedTicket.id);
      setSelectedTicket(response.data?.ticket);
      fetchTickets();
    } catch (err) {
      console.error('Error sending reply:', err);
      toast.error(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const openEditModal = (ticket) => {
    if (!canEditOrDelete(ticket)) {
      toast.warning('You can only edit resolved or closed tickets.');
      return;
    }
    setEditingTicket(ticket);
    setEditReason(ticket.reason);
    setEditDescription(ticket.description || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingTicket) return;
    if (!editReason) {
      toast.error('Please select a reason');
      return;
    }
    setEditingLoading(true);
    try {
      await supportAPI.updateTicket(editingTicket.id, {
        reason: editReason,
        description: editDescription,
      });
      toast.success('Ticket updated successfully');
      setShowEditModal(false);
      setEditingTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('Error updating ticket:', err);
      toast.error(err.response?.data?.error || 'Failed to update ticket');
    } finally {
      setEditingLoading(false);
    }
  };

  const openDeleteModal = (ticket) => {
    if (!canEditOrDelete(ticket)) {
      toast.warning('You can only delete resolved or closed tickets.');
      return;
    }
    setDeletingTicket(ticket);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTicket) return;
    setDeletingLoading(true);
    try {
      await supportAPI.deleteTicket(deletingTicket.id);
      toast.success('Ticket deleted successfully');
      setShowDeleteModal(false);
      setDeletingTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('Error deleting ticket:', err);
      toast.error(err.response?.data?.error || 'Failed to delete ticket');
    } finally {
      setDeletingLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  /* ============================================================
     UNAUTHENTICATED
  ============================================================ */

  if (!user) {
    return (
      <div className="min-h-full bg-transparent">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Ticket size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Sign in to view tickets
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Submit support requests and track your tickets.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return <SupportTicketsSkeleton />;
  }

  /* ============================================================
     ACTIVE FILTER CHIPS
  ============================================================ */

  const activeFilterChips = [
    filterStatus && {
      key: 'status',
      label: getStatusDisplay(filterStatus).label || filterStatus,
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

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Ticket size={14} />
                <span>Help center & support</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Support Tickets
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                {tickets.length}{' '}
                {tickets.length === 1 ? 'ticket' : 'tickets'} submitted
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Create Ticket</span>
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Tickets"
            value={stats.total}
            icon={Ticket}
            tone="ink"
          />

          <StatCard
            label="Open"
            value={stats.open}
            icon={Clock}
            tone="warning"
          />

          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={Repeat}
            tone="primary"
          />

          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            label="Closed"
            value={stats.closed}
            icon={XCircle}
            tone="danger"
          />
        </div>

        {/* FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by reason, description, or item name..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchTickets}
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
        {!loading && tickets.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-ink-500">
              {filteredTickets.length === 1
                ? '1 ticket'
                : `${filteredTickets.length} tickets`}
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

        {/* GRID / EMPTY STATES */}
        {tickets.length === 0 ? (
          <EmptyState
            variant="empty"
            onCreate={() => setShowSupportModal(true)}
          />
        ) : filteredTickets.length === 0 ? (
          <EmptyState variant="filtered" onReset={clearAllFilters} />
        ) : (
          <>
            <motion.div
              className="grid gap-4"
              animate={gridStyle}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {paginatedTickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <TicketCard
                    ticket={ticket}
                    onOpenMessages={openMessages}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                    isOpening={openingTicketId === ticket.id}
                  />
                </motion.div>
              ))}
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
                  tickets
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

      {/* SUPPORT MODAL */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        reporterType="unknown"
        onSuccess={fetchTickets}
      />

      {/* MESSAGES MODAL */}
      <TicketMessagesModal
        isOpen={showMessagesModal}
        onClose={() => {
          setShowMessagesModal(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        currentUser={user}
        onReply={handleSendReply}
        sending={sendingReply}
        isAdminView={false}
      />

      {/* EDIT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTicket(null);
        }}
        title="Edit Support Ticket"
        size="md"
      >
        {editingTicket && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-primary-100 bg-primary-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Pencil size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-primary-900">
                  Update ticket details
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-primary-700">
                  Update the details of your support request below.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Support Reason <span className="text-danger-500">*</span>
              </label>

              <Select
                value={editReason}
                onChange={setEditReason}
                options={getAllReasons()}
                placeholder="Select a reason…"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Detailed Description
              </label>

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                placeholder="Provide additional details..."
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={editingLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={editingLoading || !editReason}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingTicket(null);
        }}
        title="Delete Support Ticket"
        size="sm"
      >
        {deletingTicket && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this ticket?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete this ticket? This action
                  cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="text-sm font-extrabold text-ink-800">
                {getReasonLabel(deletingTicket.reason)}
              </p>

              <p className="mt-0.5 text-xs font-medium text-ink-400">
                Created on {formatTicketDate(deletingTicket.created_at)}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Ticket
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Yes, Delete
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
   TICKET CARD
============================================================ */

const TicketCard = ({ ticket, onOpenMessages, onEdit, onDelete, isOpening }) => {
  const [expanded, setExpanded] = useState(false);

  const statusDisplay = getStatusDisplay(ticket.status);
  const StatusIcon = getStatusIconComponent(ticket.status);
  const badgeClasses = getStatusBadgeClasses(ticket.status);

  const menuItems = [
    {
      key: 'edit',
      icon: Pencil,
      label: 'Edit Ticket',
      onClick: () => onEdit(ticket),
    },
    {
      key: 'divider-delete',
      divider: true,
    },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Delete Ticket',
      danger: true,
      onClick: () => onDelete(ticket),
    },
  ];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      <div className="p-4">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {ticket.item?.images?.[0] ? (
              <img
                src={ticket.item.images[0]}
                alt={ticket.item.title || 'Item'}
                className="h-12 w-12 shrink-0 rounded-2xl border border-ink-100 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300">
                <Package size={18} />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-ink-950">
                {getReasonLabel(ticket.reason)}
              </p>

              <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                {formatTicketDate(ticket.created_at)}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badgeClasses}`}
          >
            <StatusIcon size={11} />
            {statusDisplay.label}
          </span>
        </div>

        {/* DESCRIPTION */}
        {ticket.description && (
          <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-ink-500">
            {ticket.description}
          </p>
        )}

        {/* FOOTER META */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {ticket.reporter?.avatar_url ? (
              <img
                src={ticket.reporter.avatar_url}
                alt={ticket.reporter?.full_name || 'Reporter'}
                className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-ink-200"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-black text-ink-600">
                {(ticket.reporter?.full_name || 'U').charAt(0)}
              </div>
            )}

            <span className="truncate text-[11px] font-bold text-ink-600">
              {ticket.reporter?.full_name || 'Unknown'}
            </span>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
              ticket.reporter_type === 'donor'
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : ticket.reporter_type === 'winner'
                ? 'border-success-200 bg-success-50 text-success-700'
                : 'border-ink-200 bg-ink-100 text-ink-600'
            }`}
          >
            {ticket.reporter_type === 'donor'
              ? 'Donor'
              : ticket.reporter_type === 'winner'
              ? 'Winner'
              : 'Applicant'}
          </span>
        </div>

        {ticket.item?.title && (
          <div className="mt-3 truncate border-t border-ink-100 pt-3 text-[11px] font-medium text-ink-500">
            <span className="font-extrabold text-ink-700">Item:</span>{' '}
            {ticket.item.title}
          </div>
        )}
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenMessages(ticket)}
          disabled={isOpening}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold transition ${
            isOpening
              ? 'cursor-wait border-ink-200 bg-ink-100 text-ink-400'
              : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
          }`}
        >
          {isOpening ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <>
              <MessageCircle size={13} />
              <span>
                {ticket.replies?.length > 0
                  ? `${ticket.replies.length} replies`
                  : 'Chat'}
              </span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <ActionMenu items={menuItems} placement="top" align="top" />

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-100 hover:text-primary-600"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* EXPANDED DETAILS */}
      <AnimatePresence initial={false}>
        {expanded && (
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
                  Full Description
                </span>

                <p className="mt-1.5 rounded-2xl border border-ink-100 bg-white p-3 text-xs font-medium leading-relaxed text-ink-700">
                  {ticket.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Reporter
                  </span>

                  <div className="mt-2 flex items-center gap-2">
                    {ticket.reporter?.avatar_url ? (
                      <img
                        src={ticket.reporter.avatar_url}
                        alt={ticket.reporter?.full_name || 'Reporter'}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-black text-ink-600">
                        {(ticket.reporter?.full_name || 'U').charAt(0)}
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-ink-800">
                        {ticket.reporter?.full_name || 'Unknown'}
                      </p>

                      <p className="text-[10px] font-bold capitalize text-ink-400">
                        {ticket.reporter_type}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Associated Item
                  </span>

                  {ticket.item ? (
                    <div className="mt-1.5">
                      <Link
                        to={`/item/${ticket.item.id}`}
                        className="block truncate text-xs font-extrabold text-ink-800 transition hover:text-primary-600"
                      >
                        {ticket.item.title}
                      </Link>

                      <p className="mt-0.5 text-[10px] font-bold text-ink-400">
                        {ticket.item.category}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs font-medium text-ink-400">
                      Not linked to any item
                    </p>
                  )}
                </div>
              </div>

              {ticket.replies?.length > 0 && (
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Latest Message Preview
                  </span>

                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-ink-700">
                    {ticket.replies[
                      ticket.replies.length - 1
                    ]?.message?.substring(0, 120)}
                    {ticket.replies[ticket.replies.length - 1]?.message
                      ?.length > 120
                      ? '...'
                      : ''}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */

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

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ variant = 'empty', onReset, onCreate }) {
  const isFiltered = variant === 'filtered';

  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          {isFiltered ? <Search size={27} /> : <Inbox size={27} />}
        </div>

        <h2 className="mt-5 text-lg font-black text-ink-950">
          {isFiltered ? 'No matching tickets' : 'No support tickets yet'}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {isFiltered
            ? 'Try adjusting your search or filters to find the ticket you are looking for.'
            : 'Need help? Create a support ticket and our team will assist you.'}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {isFiltered ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <RefreshCw size={15} />
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
            >
              <Plus size={16} />
              Create ticket
            </button>
          )}
        </div>
      </div>
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

export default SupportTicketsPage;