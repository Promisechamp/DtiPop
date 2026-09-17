import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { supportAPI } from '@/services/api/dtiApi';
import SupportModal from '../components/common/SupportModal';
import TicketMessagesModal from '../components/common/TicketMessagesModal';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import Modal from '@/reusables/Modal';
import { useBreakpoint } from '@/reusables/Breakpoint';
import { TICKET_STATUS_DISPLAY, STATUS_COLOR_CLASSES, getReasonLabel, formatTicketDate } from '@/utils/constants';

// ============================================================
// Skeleton
// ============================================================
const SupportTicketsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">
    <PageNavigationSkeleton />

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
        <div className="h-11 w-36 rounded-xl bg-ink-200 animate-pulse" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm">
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

      {/* GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="space-y-3 p-4 animate-pulse">
              <div className="h-32 bg-ink-200 rounded-xl" />
              <div className="h-4 w-3/4 rounded bg-ink-200" />
              <div className="h-3 w-1/2 rounded bg-ink-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// Select - Using the same as FavoritesPage
// ============================================================
function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  showIcon = false,
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-ink-100 bg-white px-4 py-3 pr-10 text-sm font-semibold text-ink-700 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label || placeholder}
          </option>
        ))}
      </select>

      {showIcon && (
        <i className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400" />
      )}
    </div>
  );
}

// ============================================================
// Support Reasons
// ============================================================
const DONOR_SUPPORT_REASONS = [
  { value: 'winner_unresponsive', label: 'Winner is unresponsive' },
  { value: 'winner_no_show', label: "Winner didn't show up for pickup" },
  { value: 'winner_dispute', label: 'Dispute with winner over item condition' },
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

// ============================================================
// Status Helpers
// ============================================================
const getStatusDisplay = (status) =>
  TICKET_STATUS_DISPLAY?.[status] || {
    label: status || 'Unknown',
    icon: 'bi-circle',
    color: 'gray',
  };

// ============================================================
// Main Component
// ============================================================
const SupportTicketsPage = () => {
  const breakpoint = useBreakpoint();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [gridCols, setGridCols] = useState(4);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal states
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [openingTicketId, setOpeningTicketId] = useState(null);

  // Edit ticket states
  const [editingTicket, setEditingTicket] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);

  // Delete ticket states
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Responsive columns setup
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

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count += 1;
    if (sortBy !== 'newest') count += 1;
    if (searchTerm) count += 1;
    return count;
  }, [filterStatus, sortBy, searchTerm]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: 'bi-funnel' },
      ...Object.entries(TICKET_STATUS_DISPLAY).map(([value, display]) => ({
        value,
        label: display.label,
        icon: display.icon,
      })),
    ],
    []
  );

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: 'bi-sort-down' },
    { value: 'oldest', label: 'Oldest First', icon: 'bi-sort-up' },
  ];

  // Fetch tickets
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

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.ticket-dropdown-container')) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Filter & Sort logic
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

  // Stats
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
    setDropdownOpen(null);
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
    setDropdownOpen(null);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2">
        <PageNavigation />
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <i className="bi bi-ticket-perforated text-2xl" />
            </div>
            <h3 className="text-lg font-extrabold text-ink-800">Sign in to View Tickets</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              Submit support requests and track your tickets.
            </p>
            <Link
              to="/login"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <i className="bi bi-box-arrow-in-right" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <SupportTicketsSkeleton />;

  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      <PageNavigation />

      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                Help Center & Support
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              Support Tickets
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} submitted
            </p>
          </div>

          <button
            onClick={() => setShowSupportModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <i className="bi bi-plus-lg text-xs" />
            Create Ticket
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Total Tickets" value={stats.total} icon="bi-ticket-perforated" color="text-ink-900" bg="bg-ink-50" />
          <StatCard label="Open" value={stats.open} icon="bi-clock-history" color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="In Progress" value={stats.inProgress} icon="bi-arrow-repeat" color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Resolved" value={stats.resolved} icon="bi-check-circle-fill" color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Closed" value={stats.closed} icon="bi-x-circle" color="text-ink-500" bg="bg-ink-50" />
        </div>

        {/* FILTER TOOLBAR */}
        <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setFiltersExpanded((val) => !val)}
              className="flex items-center gap-3 text-left transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                <i className="bi bi-funnel text-sm" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-ink-800">
                  Filter & Sort Tickets
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'All tickets visible'}
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
                    setGridCols((val) => Math.max(1, val - 1));
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
                    setGridCols((val) => Math.min(4, val + 1));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                  title="More columns"
                >
                  <i className="bi bi-plus-lg text-xs" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFiltersExpanded((val) => !val)}
                className="rounded-xl border border-ink-200/80 bg-ink-100 px-3.5 py-2 text-xs font-bold text-ink-700 shadow-sm hover:bg-ink-50"
              >
                <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
                <i className={`bi bi-chevron-${filtersExpanded ? 'up' : 'down'} ml-1 text-[10px]`} />
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
                <div className="space-y-4 bg-ink-50/20 px-5 py-4">
                  <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by reason, description, or item name..."
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

                  {(activeFilterCount > 0 || searchTerm) && (
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

        {/* GRID VIEW OR EMPTY STATE */}
        {tickets.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-ticket-perforated text-2xl" />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No support tickets yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                Need help? Create a support ticket and our team will assist you.
              </p>
              <button
                onClick={() => setShowSupportModal(true)}
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-plus-lg text-xs" />
                Create Ticket
              </button>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-ink-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300 shadow-sm">
                <i className="bi bi-search text-2xl" />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No matches found</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                Try adjusting your search or filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm hover:bg-ink-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              className="grid gap-4"
              animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
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
                    dropdownOpen={dropdownOpen === ticket.id}
                    setDropdownOpen={(id) => setDropdownOpen(id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-ink-400">
                  Showing{' '}
                  <span className="font-bold text-ink-600">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  –
                  <span className="font-bold text-ink-600">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>{' '}
                  of <span className="font-bold text-ink-600">{totalItems}</span> tickets
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

        {/* MODALS */}
        <SupportModal
          isOpen={showSupportModal}
          onClose={() => setShowSupportModal(false)}
          reporterType="unknown"
          onSuccess={fetchTickets}
        />
								
								
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

        
        {/* Edit Modal */}
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
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                  <i className="bi bi-pencil text-xl" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-ink-600">
                    Update the details of your support request below.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-ink-700 mb-1.5">
                  Support Reason <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={editReason}
                  onChange={setEditReason}
                  options={getAllReasons()}
                  placeholder="Select a reason…"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-ink-700 mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  placeholder="Provide additional details..."
                  className="w-full rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editingLoading}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={editingLoading || !editReason}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {editingLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
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
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                  <i className="bi bi-exclamation-triangle text-xl" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-ink-600">
                    Are you sure you want to delete this ticket? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                <p className="text-sm font-extrabold text-ink-800">
                  {getReasonLabel(deletingTicket.reason)}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">
                  Created on {formatTicketDate(deletingTicket.created_at)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingLoading}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deletingLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {deletingLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

// ============================================================
// Ticket Card Sub-component
// ============================================================
const TicketCard = ({ ticket, onOpenMessages, onEdit, onDelete, isOpening, dropdownOpen, setDropdownOpen }) => {
  const [expanded, setExpanded] = useState(false);
  const statusDisplay = getStatusDisplay(ticket.status);
  const statusBadgeClass = STATUS_COLOR_CLASSES[statusDisplay.color] || STATUS_COLOR_CLASSES.gray;
  const canEditDelete = ticket.status === 'resolved' || ticket.status === 'closed';

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen ? null : ticket.id);
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {ticket.item?.images?.[0] ? (
              <img
                src={ticket.item.images[0]}
                alt={ticket.item.title || 'Item'}
                className="h-12 w-12 rounded-xl border border-ink-100 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-50 border border-ink-100">
                <i className="bi bi-box text-ink-400 text-xl" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink-900">
                {getReasonLabel(ticket.reason)}
              </p>
              <p className="truncate text-xs text-ink-400 mt-0.5">
                {formatTicketDate(ticket.created_at)}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${statusBadgeClass}`}
          >
            <i className={`bi ${statusDisplay.icon} text-[9px]`} />
            {statusDisplay.label}
          </span>
        </div>

        {/* Description */}
        {ticket.description && (
          <p className="mt-3 text-sm text-ink-600 line-clamp-2 leading-relaxed">
            {ticket.description}
          </p>
        )}

        {/* Footer meta */}
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink-500">
          <div className="flex items-center gap-2 min-w-0">
            {ticket.reporter?.avatar_url ? (
              <img
                src={ticket.reporter.avatar_url}
                alt={ticket.reporter?.full_name || 'Reporter'}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-ink-200 flex-shrink-0"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600 flex-shrink-0">
                {(ticket.reporter?.full_name || 'U').charAt(0)}
              </div>
            )}
            <span className="font-semibold text-ink-700 truncate">
              {ticket.reporter?.full_name || 'Unknown'}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
              ticket.reporter_type === 'donor'
                ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                : ticket.reporter_type === 'winner'
                ? 'bg-primary-50 text-primary-700 border border-primary-200/60'
                : 'bg-ink-100 text-ink-600 border border-ink-200/60'
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
          <div className="mt-2 text-xs text-ink-500 truncate pt-2 border-t border-ink-50">
            <span className="font-medium">Item:</span> {ticket.item.title}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-3 flex items-center justify-between gap-2 rounded-b-2xl">
        <button
          onClick={() => onOpenMessages(ticket)}
          disabled={isOpening}
          className={`inline-flex h-9 items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition ${
            isOpening
              ? 'bg-ink-100 text-ink-400 cursor-wait'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 shadow-xs'
          }`}
        >
          {isOpening ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-400 border-t-transparent" />
          ) : (
            <>
              <i className="bi bi-chat-dots text-sm" />
              <span>{ticket.replies?.length > 0 ? `${ticket.replies.length} replies` : 'Chat'}</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <div className="ticket-dropdown-container relative z-30">
            <button
              onClick={toggleDropdown}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 hover:bg-ink-100 hover:text-primary-600 transition shadow-xs"
              aria-label="More actions"
            >
              <i className="bi bi-three-dots-vertical text-xs" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl border border-ink-100 shadow-xl py-2 z-50">
                <button
                  onClick={() => onEdit(ticket)}
                  className={`w-full px-4 py-2.5 text-left text-xs font-bold transition flex items-center gap-2.5 ${
                    canEditDelete
                      ? 'text-ink-700 hover:bg-primary-50/70'
                      : 'text-ink-300 cursor-not-allowed'
                  }`}
                  disabled={!canEditDelete}
                  title={!canEditDelete ? 'Only resolved or closed tickets can be edited.' : ''}
                >
                  <i className={`bi bi-pencil ${canEditDelete ? 'text-primary-500' : 'text-ink-300'}`} />
                  Edit Ticket
                </button>
                <button
                  onClick={() => onDelete(ticket)}
                  className={`w-full px-4 py-2.5 text-left text-xs font-bold transition flex items-center gap-2.5 ${
                    canEditDelete
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-ink-300 cursor-not-allowed'
                  }`}
                  disabled={!canEditDelete}
                  title={!canEditDelete ? 'Only resolved or closed tickets can be deleted.' : ''}
                >
                  <i className={`bi bi-trash ${canEditDelete ? 'text-rose-500' : 'text-ink-300'}`} />
                  Delete Ticket
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 transition hover:bg-ink-100 hover:text-primary-600 shadow-xs"
            aria-label="Toggle details"
          >
            <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} text-xs`} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-ink-100 bg-ink-50/40 p-5 space-y-4 rounded-b-2xl"
          >
            <div>
              <span className="text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">Full Description</span>
              <p className="mt-1.5 text-sm text-ink-700 bg-white p-3.5 rounded-xl border border-ink-100/70 leading-relaxed shadow-xs">
                {ticket.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-ink-100/70 shadow-xs">
                <span className="text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">Reporter Info</span>
                <div className="flex items-center gap-2.5 mt-2">
                  {ticket.reporter?.avatar_url ? (
                    <img
                      src={ticket.reporter.avatar_url}
                      alt={ticket.reporter?.full_name || 'Reporter'}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                      {(ticket.reporter?.full_name || 'U').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-800 truncate">
                      {ticket.reporter?.full_name || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-ink-400 capitalize">{ticket.reporter_type}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-ink-100/70 shadow-xs">
                <span className="text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">Associated Item</span>
                {ticket.item ? (
                  <div className="mt-1.5">
                    <Link
                      to={`/item/${ticket.item.id}`}
                      className="text-xs font-bold text-ink-800 hover:text-primary-600 transition truncate block"
                    >
                      {ticket.item.title}
                    </Link>
                    <p className="text-[10px] text-ink-400 mt-0.5">{ticket.item.category}</p>
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 mt-1.5">Not linked to any item</p>
                )}
              </div>
            </div>

            {ticket.replies?.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-ink-100/70 shadow-xs">
                <span className="text-[10px] font-extrabold text-ink-400 uppercase tracking-wider">
                  Latest Message Preview
                </span>
                <p className="text-xs text-ink-700 mt-1.5">
                  {ticket.replies[ticket.replies.length - 1]?.message?.substring(0, 120)}
                  {ticket.replies[ticket.replies.length - 1]?.message?.length > 120 ? '...' : ''}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Stat Card
// ============================================================
function StatCard({ label, value, icon, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
          <i className={`bi ${icon} ${color} text-sm`} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ============================================================
// Pagination
// ============================================================
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
    <div className="flex items-center gap-1 rounded-xl border border-ink-100/80 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === 1 ? 'cursor-not-allowed text-ink-200' : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <i className="bi bi-chevron-left text-xs" />
      </button>

      {getPageNumbers().map((page, index) =>
        page === '...' ? (
          <span key={`dots-${index}`} className="flex h-8 w-8 items-center justify-center text-xs font-medium text-ink-300">
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold transition-all ${
              currentPage === page ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50 hover:text-primary-600'
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
          currentPage === totalPages ? 'cursor-not-allowed text-ink-200' : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <i className="bi bi-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default SupportTicketsPage;