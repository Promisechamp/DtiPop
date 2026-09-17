import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreVertical,
  PenLine,
  Mailbox,
  Trash2,
  Box,
  AlertTriangle,
  Grid,
  Table,
  Minus,
  Plus as PlusIcon,
  X,
  CircleArrowOutUpRight
} from 'lucide-react';

import { supportAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import TicketMessagesModal from '@/apps/dti/components/common/TicketMessagesModal';
import { useBreakpoint } from '@/reusables/Breakpoint';
import {
  TICKET_STATUS_DISPLAY,
  getTicketStatusDisplay,
  getTicketStatusBadgeClass,
  getReasonLabel,
  formatTicketDate,
} from '@/utils/constants';

const ITEMS_PER_PAGE = 20;

const STATUS_OPTIONS = Object.entries(TICKET_STATUS_DISPLAY).map(([value, display]) => ({
  value,
  label: display.label,
  icon: display.icon,
  color: display.color,
}));

// ============================================================
// Skeleton
// ============================================================
const SupportSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">

    <div className="space-y-8">
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
          <div key={i} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
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
// Main Component
// ============================================================
const AdminSupport = ({ hidePageNav = false, embedded = false }) => {
  const breakpoint = useBreakpoint();

  const [tickets, setTickets] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [dropdownTicket, setDropdownTicket] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('cards');
  const [gridCols, setGridCols] = useState(4);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [openingTicketId, setOpeningTicketId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTicket, setStatusTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTicket, setDeleteTicket] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const [descModalContent, setDescModalContent] = useState({ title: '', text: '' });

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

  const fetchTickets = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await supportAPI.adminGetAllTickets({ limit: 100 });
      setTickets(response.data?.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Replace the outside-click effect:
useEffect(() => {
  if (dropdownOpen === null) return;
  const handleClickOutside = (e) => {
    // Ignore clicks on the trigger OR on the portaled menu
    if (
      e.target.closest('.ticket-dropdown-container') ||
      e.target.closest('.ticket-dropdown-menu')
    ) {
      return;
    }
    setDropdownOpen(null);
    setDropdownPosition(null);
    setDropdownTicket(null);
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [dropdownOpen]);


		
  // Close or reposition dropdown on scroll/resize
  useEffect(() => {
    if (dropdownOpen === null) return;
    const handleScrollOrResize = () => {
      setDropdownOpen(null);
      setDropdownPosition(null);
      setDropdownTicket(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [dropdownOpen]);

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (filter !== 'all') result = result.filter(t => t.status === filter);
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(t =>
        getReasonLabel(t.reason).toLowerCase().includes(term) ||
        t.reporter?.full_name?.toLowerCase().includes(term) ||
        t.item?.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [tickets, filter, search]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCount = (status) =>
    status === 'all' ? tickets.length : tickets.filter((t) => t.status === status).length;

  const stats = useMemo(() => ({
    total: tickets.length,
    open: getCount('open'),
    in_progress: getCount('in_progress'),
    resolved: getCount('resolved'),
    closed: getCount('closed'),
  }), [tickets]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter !== 'all') count++;
    if (search) count++;
    return count;
  }, [filter, search]);

  const openMessages = async (ticket) => {
    if (openingTicketId) return;
    setDropdownOpen(null);
    setDropdownPosition(null);
    setDropdownTicket(null);
    setOpeningTicketId(ticket.id);
    try {
      const response = await supportAPI.getTicket(ticket.id);
      const fullTicket = response.data?.ticket || response.data || ticket;
      if (fullTicket) {
        if (fullTicket.replies && !fullTicket.messages) fullTicket.messages = fullTicket.replies;
      }
      setSelectedTicket(fullTicket);
      setShowMessagesModal(true);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      const ticketWithMessages = { ...ticket };
      if (ticket.replies && !ticket.messages) ticketWithMessages.messages = ticket.replies;
      setSelectedTicket(ticketWithMessages);
      setShowMessagesModal(true);
      toast.error('Could not load full ticket details, showing cached data');
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
      const updated = response.data?.ticket || response.data;
      if (updated) {
        if (updated.replies && !updated.messages) updated.messages = updated.replies;
        setSelectedTicket(updated);
      }
      fetchTickets();
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTicket || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await supportAPI.updateTicketStatus(statusTicket.id, newStatus);
      toast.success(`Status updated to ${getTicketStatusDisplay(newStatus).label}`);
      await fetchTickets();
      setShowStatusModal(false);
      setStatusTicket(null);
      setNewStatus('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTicket) return;
    setDeleting(true);
    try {
      await supportAPI.deleteTicket(deleteTicket.id);
      toast.success('Ticket deleted');
      setShowDeleteModal(false);
      setDeleteTicket(null);
      await fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  const openEmailClient = (ticket) => {
    const subject = encodeURIComponent(`Support Ticket: ${getReasonLabel(ticket.reason)}`);
    const body = encodeURIComponent(
      `Ticket ID: ${ticket.id}\nStatus: ${getTicketStatusDisplay(ticket.status).label}\n\n` +
      `Description:\n${ticket.description || 'No description'}\n\n` +
      `View: ${window.location.origin}/admin/moderation`
    );
    window.location.href = `mailto:${ticket.reporter?.email || ''}?subject=${subject}&body=${body}`;
    setDropdownOpen(null);
    setDropdownPosition(null);
    setDropdownTicket(null);
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

  const handleDropdownToggle = (e, ticket) => {
    e.stopPropagation();
    if (dropdownOpen === ticket.id) {
      setDropdownOpen(null);
      setDropdownPosition(null);
      setDropdownTicket(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      // Position dropdown above the button
      const dropdownWidth = 208; // w-52 = 13rem = 208px
      let left = rect.right - dropdownWidth;
      // Ensure dropdown doesn't go off screen on the left
      if (left < 10) left = 10;
      // Ensure dropdown doesn't go off screen on the right
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: left,
      });
      setDropdownOpen(ticket.id);
      setDropdownTicket(ticket);
    }
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
      <SupportSkeleton />
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
                  Support Management
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Support Tickets
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                {stats.total} total tickets · Manage user support requests
              </p>
            </div>
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Ticket}
            color="text-ink-700"
            bg="bg-ink-50"
            active={filter === 'all'}
            onClick={() => handleStatClick('all')}
          />
          <StatCard
            label="Open"
            value={stats.open}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50"
            active={filter === 'open'}
            onClick={() => handleStatClick('open')}
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            icon={RefreshCw}
            color="text-blue-600"
            bg="bg-blue-50"
            active={filter === 'in_progress'}
            onClick={() => handleStatClick('in_progress')}
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
            label="Closed"
            value={stats.closed}
            icon={XCircle}
            color="text-ink-500"
            bg="bg-ink-50"
            active={filter === 'closed'}
            onClick={() => handleStatClick('closed')}
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
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by reason, reporter name, or item..."
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
        {filteredTickets.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <Ticket size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No tickets found</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                {filter !== 'all' || search ? 'Try adjusting your filters or search term.' : 'No support requests available right now.'}
              </p>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <motion.div
            className="grid gap-4"
            animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {paginatedTickets.map((ticket) => {
              const statusDisplay = getTicketStatusDisplay(ticket.status);
              const isOpening = openingTicketId === ticket.id;
              const isDropdownOpen = dropdownOpen === ticket.id;

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {ticket.item?.images?.[0] ? (
                          <img
                            src={ticket.item.images[0]}
                            alt={ticket.item.title || 'Item'}
                            className="img h-12 w-12 rounded-xl border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="img flex h-12 w-12 items-center justify-center rounded-xl bg-ink-50 border border-ink-100">
                            <Box className="text-ink-400" size={20} />
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
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${getTicketStatusBadgeClass(ticket.status)}`}
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
                            className="img h-5 w-5 rounded-full object-cover ring-1 ring-ink-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="img flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600 flex-shrink-0">
                            {(ticket.reporter?.full_name || 'U').charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-ink-700 truncate">
                          {ticket.reporter?.full_name || 'User'}
                        </span>
                      </div>
                      <span className={`capitalize inline-block px-1.5 py-0.2 text-[9px] font-extrabold rounded-full ${
                                ticket.reporter_type === 'donor' ? 'bg-sky-50 text-sky-700' :
                                ticket.reporter_type === 'winner' ? 'bg-primary-50 text-primary-700' :
																																ticket.reporter_type === 'applicant' ? 'bg-danger-50 text-danger-700' :
                                'bg-brand-100 text-brand-600'
                              }`}>
                                {ticket.reporter_type === 'unknown' ?  'User' : ticket.reporter_type}
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
                      onClick={() => openMessages(ticket)}
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
                          <MessageCircle size={14} />
                          <span>{ticket.replies?.length > 0 ? `${ticket.replies.length} replies` : 'Chat'}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setStatusTicket(ticket);
                          setNewStatus(ticket.status);
                          setShowStatusModal(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 hover:bg-ink-100 hover:text-primary-600 transition shadow-xs"
                        title="Change Status"
                      >
                        <PenLine size={14} />
                      </button>
                      <button
                        onClick={() => openEmailClient(ticket)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 hover:bg-ink-100 hover:text-primary-600 transition shadow-xs"
                        title="Email User"
                      >
                        <Mailbox size={14} />
                      </button>
                      <div className="ticket-dropdown-container relative">
                        <button
                          onClick={(e) => handleDropdownToggle(e, ticket)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-ink-200/70 text-ink-500 hover:bg-ink-100 hover:text-primary-600 transition shadow-xs"
                          aria-label="More actions"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
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
                    <th className="py-3 px-4">Reason / Item</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 text-xs text-ink-700">
                  {paginatedTickets.map((ticket) => {
                    const statusDisplay = getTicketStatusDisplay(ticket.status);
                    const isOpening = openingTicketId === ticket.id;
                    return (
                      <tr key={ticket.id} className="hover:bg-primary-50/20 transition group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {ticket.item?.images?.[0] ? (
                              <img src={ticket.item.images[0]} alt="" className="img w-8 h-8 rounded-lg object-cover ring-1 ring-ink-200 flex-shrink-0" />
                            ) : (
                              <div className="img w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center text-ink-400 flex-shrink-0">
                                <Box size={16} />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[200px]">
                              <p className="font-extrabold text-ink-900 truncate">{getReasonLabel(ticket.reason)}</p>
                              {ticket.item?.title && (
                                <p className="text-[11px] text-ink-400 truncate">{ticket.item.title}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {ticket.reporter?.avatar_url ? (
                              <img src={ticket.reporter.avatar_url} alt="" className="img w-6 h-6 rounded-full object-cover ring-1 ring-ink-200" />
                            ) : (
                              <div className="img w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center text-[10px] font-bold text-ink-600">
                                {(ticket.reporter?.full_name || 'U').charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-ink-800">{ticket.reporter?.full_name || 'User'}</p>
                              <span className={`capitalize inline-block px-1.5 py-0.2 text-[9px] font-extrabold rounded ${
                                ticket.reporter_type === 'donor' ? 'bg-sky-50 text-sky-700' :
                                ticket.reporter_type === 'winner' ? 'bg-primary-50 text-primary-700' :
																																ticket.reporter_type === 'applicant' ? 'bg-danger-50 text-danger-700' :
                                'bg-brand-100 text-brand-600'
                              }`}>
                                {ticket.reporter_type === 'unknown' ?  'User' : ticket.reporter_type}
                              </span>
																														
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-[220px]">
                          {ticket.description ? (
                            <button
  onClick={() => {
    setDescModalContent({
      title: getReasonLabel(ticket.reason),
      text: ticket.description,
    });
    setShowDescModal(true);
  }}
  className="text-left text-ink-600 hover:text-primary-600 transition block truncate w-full group/desc"
  title="Click to view full description"
>
  <span className="truncate flex gap-2">
    {ticket.description.length > 25
      ? ticket.description.slice(0, 25) + '…'
      : ticket.description}{' '}
    <CircleArrowOutUpRight size={10} className="text-[10px] text-primary-600" />
  </span>
</button>
                          ) : (
                            <span className="text-ink-300 italic">No description</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getTicketStatusBadgeClass(ticket.status)}`}>
                            <i className={`bi ${statusDisplay.icon} text-[10px]`}></i>
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-ink-500 font-medium">
                          {formatTicketDate(ticket.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openMessages(ticket)}
                              disabled={isOpening}
                              className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-primary-200"
                              title="Open Chat"
                            >
                              {isOpening ? (
                                <span className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <>
                                  <MessageCircle size={12} />
                                  <span>Chat</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setStatusTicket(ticket);
                                setNewStatus(ticket.status);
                                setShowStatusModal(true);
                              }}
                              className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-ink-100 rounded-lg transition"
                              title="Change Status"
                            >
                              <PenLine size={14} />
                            </button>
                            <button
                              onClick={() => openEmailClient(ticket)}
                              className="p-1.5 text-ink-500 hover:text-primary-600 hover:bg-ink-100 rounded-lg transition"
                              title="Email User"
                            >
                              <Mailbox size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTicket(ticket);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Ticket"
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
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)}
              </span>{' '}
              of <span className="font-bold text-ink-600">{filteredTickets.length.toLocaleString()}</span> tickets
            </p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* DROPDOWN PORTAL */}
      {dropdownOpen && dropdownPosition && dropdownTicket && createPortal(
        <div 
          className="fixed z-[9999] ticket-dropdown-menu"
          style={{
            bottom: dropdownPosition.bottom,
            left: dropdownPosition.left,
          }}
        >
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-52 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-xl shadow-ink-900/10 backdrop-blur-md"
            >
              <div className="space-y-0.5">
                <div className="px-3 py-2 border-b border-ink-100/60 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-ink-400">
                    Quick Actions
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                    setDropdownTicket(null);
                    openMessages(dropdownTicket);
                  }}
                  className="w-full group flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold text-ink-700 transition hover:bg-primary-50/80 hover:text-primary-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition">
                      <MessageCircle size={14} />
                    </div>
                    <span>Open Chat</span>
                  </div>
                  {dropdownTicket.replies?.length > 0 && (
                    <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-extrabold text-primary-700">
                      {dropdownTicket.replies.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                    setDropdownTicket(null);
                    setStatusTicket(dropdownTicket);
                    setNewStatus(dropdownTicket.status);
                    setShowStatusModal(true);
                  }}
                  className="w-full group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-ink-700 transition hover:bg-primary-50/80 hover:text-primary-700 cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-50 text-ink-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                    <PenLine size={14} />
                  </div>
                  <span>Change Status</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                    setDropdownTicket(null);
                    openEmailClient(dropdownTicket);
                  }}
                  className="w-full group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-ink-700 transition hover:bg-primary-50/80 hover:text-primary-700 cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-50 text-ink-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                    <Mailbox size={14} />
                  </div>
                  <span>Email User</span>
                </button>

                <div className="my-1.5 border-t border-ink-100/80" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                    setDropdownTicket(null);
                    setDeleteTicket(dropdownTicket);
                    setShowDeleteModal(true);
                  }}
                  className="w-full group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50 cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition">
                    <Trash2 size={14} />
                  </div>
                  <span>Delete Ticket</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* MODALS */}
      <Modal
        isOpen={showDescModal}
        onClose={() => setShowDescModal(false)}
        title={descModalContent.title || 'Ticket Description'}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-ink-50/60 p-4 rounded-xl border border-ink-100 max-h-80 overflow-y-auto">
            <p className="text-sm text-ink-800 whitespace-pre-wrap leading-relaxed">{descModalContent.text}</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setShowDescModal(false)} className="px-5 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition text-xs">
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setStatusTicket(null); setNewStatus(''); }}
        title="Change Ticket Status"
        size="sm"
      >
        {statusTicket && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-ink-50/50 rounded-xl border border-ink-100/60 shadow-sm">
              <p className="text-sm font-extrabold text-ink-900 truncate">{getReasonLabel(statusTicket.reason)}</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTicketStatusBadgeClass(statusTicket.status)}`}>
                {getTicketStatusDisplay(statusTicket.status).label}
              </span>
            </div>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setNewStatus(option.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                    newStatus === option.value
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                      : 'border-ink-200 hover:border-ink-300 bg-white text-ink-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${newStatus === option.value ? 'bg-primary-100' : 'bg-ink-100'}`}>
                    <i className={`bi ${option.icon} ${newStatus === option.value ? 'text-primary-600' : 'text-ink-400'}`}></i>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-extrabold">{option.label}</p>
                  </div>
                  {newStatus === option.value && (
                    <CheckCircle size={16} className="text-primary-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowStatusModal(false); setStatusTicket(null); setNewStatus(''); }}
                className="flex-1 px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus || !newStatus || newStatus === statusTicket.status}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatus ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
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
        onClose={() => { setShowDeleteModal(false); setDeleteTicket(null); }}
        title="Delete Ticket"
        size="sm"
      >
        {deleteTicket && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-rose-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-ink-600">Are you sure you want to delete this ticket?</p>
                <p className="text-xs text-ink-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-ink-50/50 rounded-xl p-3 border border-ink-100/60">
              <p className="text-xs font-bold text-ink-700">{getReasonLabel(deleteTicket.reason)}</p>
              <p className="text-xs text-ink-500 mt-0.5">{formatTicketDate(deleteTicket.created_at)}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTicket(null); }}
                className="flex-1 px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
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

      <TicketMessagesModal
									isOpen={showMessagesModal}
									onClose={() => {
											setShowMessagesModal(false);
											setSelectedTicket(null);
									}}
									ticket={selectedTicket}
									onReply={handleSendReply}
									sending={sendingReply}
									isAdminView={true}
							/>


    </div>
  );
};

// ============================================================
// Helper Components
// ============================================================

const StatCard = ({ label, value, icon: Icon, color = 'text-ink-700', bg = 'bg-ink-50', active, onClick }) => {
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border border-ink-100/60`}>
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
          currentPage === 1 ? 'cursor-not-allowed text-ink-200' : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronLeft size={14} />
      </button>
      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`dots-${index}`} className="flex h-8 w-8 items-center justify-center text-xs font-medium text-ink-300">
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
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          currentPage === totalPages ? 'cursor-not-allowed text-ink-200' : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default AdminSupport;