// src/admin/AdminSupport.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Ticket,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageCircle,
  PenLine,
  Mailbox,
  Trash2,
  Box,
  AlertTriangle,
  CircleArrowOutUpRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { supportAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import Select from '@/reusables/Select';
import TicketMessagesModal from '@/apps/dti/components/common/TicketMessagesModal';
import FilterBar, { ColumnStepper, ViewToggle } from '@/reusables/FilterBar';
import { usePageState } from '@/hooks/usePageState';
import {
  TICKET_STATUS_DISPLAY,
  getTicketStatusDisplay,
  getTicketStatusBadgeClass,
  getReasonLabel,
  formatTicketDate,
} from '@/utils/constants';

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

const STATUS_OPTIONS = Object.entries(TICKET_STATUS_DISPLAY).map(
  ([value, display]) => ({
    value,
    label: display.label,
    icon: display.icon,
    color: display.color,
  })
);

const statusFilterOptions = [
  { value: 'all', label: 'All Statuses', icon: FilterIcon },
  ...STATUS_OPTIONS,
];

const sortOptions = [
  { value: 'newest', label: 'Newest First', icon: ArrowDown },
  { value: 'oldest', label: 'Oldest First', icon: ArrowUp },
  { value: 'status', label: 'Status', icon: ArrowUpDown },
];

const getReporterTypeBadge = (reporterType) => {
  const map = {
    donor: 'bg-brand-50 text-brand-700',
    winner: 'bg-primary-50 text-primary-700',
    applicant: 'bg-danger-50 text-danger-700',
  };
  return map[reporterType] || 'bg-ink-50 text-ink-600';
};

/* ============================================================
   SKELETON — unchanged
============================================================ */

const SupportSkeleton = ({ embedded = false }) => {
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
            <div className="h-10 w-10 animate-pulse rounded-xl bg-ink-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink-100" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-ink-100" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-ink-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, j) => (
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
   STAT CARD — unchanged
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

const AdminSupport = ({ hidePageNav = false, embedded = false }) => {
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
    namespace: 'admin.support',
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
  const [tickets, setTickets] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- modals / local UI ---------- */
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
  const [descModalContent, setDescModalContent] = useState({
    title: '',
    text: '',
  });

  /* ============================================================
     FETCH
  ============================================================ */

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

  /* ============================================================
     FILTERED + SORTED (client-side — kept as-is)
  ============================================================ */

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (filter !== 'all') {
      result = result.filter((t) => t.status === filter);
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (t) =>
          getReasonLabel(t.reason).toLowerCase().includes(term) ||
          t.reporter?.full_name?.toLowerCase().includes(term) ||
          t.item?.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'status') {
      result.sort((a, b) => {
        const order = ['open', 'in_progress', 'resolved', 'closed'];
        const cmp = order.indexOf(a.status) - order.indexOf(b.status);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (sortBy === 'oldest') {
      result.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    } else if (sortBy === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return result;
  }, [tickets, filter, search, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(() => {
    const acc = {
      total: tickets.length,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };
    tickets.forEach((t) => {
      if (acc[t.status] !== undefined) acc[t.status]++;
    });
    return acc;
  }, [tickets]);

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
      label: getTicketStatusDisplay(filter)?.label || filter,
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

  const openMessages = async (ticket) => {
    if (openingTicketId) return;
    setOpeningTicketId(ticket.id);
    try {
      const response = await supportAPI.getTicket(ticket.id);
      const fullTicket = response.data?.ticket || response.data || ticket;
      if (fullTicket) {
        if (fullTicket.replies && !fullTicket.messages)
          fullTicket.messages = fullTicket.replies;
      }
      setSelectedTicket(fullTicket);
      setShowMessagesModal(true);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      const ticketWithMessages = { ...ticket };
      if (ticket.replies && !ticket.messages)
        ticketWithMessages.messages = ticket.replies;
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
        if (updated.replies && !updated.messages)
          updated.messages = updated.replies;
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
      toast.success(
        `Status updated to ${getTicketStatusDisplay(newStatus).label}`
      );
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
    const subject = encodeURIComponent(
      `Support Ticket: ${getReasonLabel(ticket.reason)}`
    );
    const body = encodeURIComponent(
      `Ticket ID: ${ticket.id}\nStatus: ${
        getTicketStatusDisplay(ticket.status).label
      }\n\n` +
        `Description:\n${ticket.description || 'No description'}\n\n` +
        `View: ${window.location.origin}/admin/moderation`
    );
    window.location.href = `mailto:${
      ticket.reporter?.email || ''
    }?subject=${subject}&body=${body}`;
  };

  const handleStatClick = (status) => {
    if (filter !== status) {
      setFilters({ filter: status });
    }
  };

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  const openStatusModal = (ticket) => {
    setStatusTicket(ticket);
    setNewStatus(ticket.status);
    setShowStatusModal(true);
  };

  const openDeleteModal = (ticket) => {
    setDeleteTicket(ticket);
    setShowDeleteModal(true);
  };

  const openDescModal = (ticket) => {
    setDescModalContent({
      title: getReasonLabel(ticket.reason),
      text: ticket.description,
    });
    setShowDescModal(true);
  };

  /* ============================================================
     MENU ITEMS
  ============================================================ */

  const buildMenuItems = (ticket) => [
    {
      key: 'chat',
      icon: MessageCircle,
      label: 'Open Chat',
      onClick: () => openMessages(ticket),
    },
    {
      key: 'status',
      icon: PenLine,
      label: 'Change Status',
      onClick: () => openStatusModal(ticket),
    },
    {
      key: 'email',
      icon: Mailbox,
      label: 'Email User',
      onClick: () => openEmailClient(ticket),
    },
    { key: 'divider-delete', divider: true },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Delete Ticket',
      danger: true,
      onClick: () => openDeleteModal(ticket),
    },
  ];

  /* ============================================================
     LOADING
  ============================================================ */

  if (initialLoading) return <SupportSkeleton embedded={embedded} />;

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
                  <Ticket size={14} />
                  <span>Support management</span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  Support Tickets
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                  <span>{stats.total.toLocaleString()} tickets</span>
                  <span className="text-ink-300">·</span>
                  <span>Manage user support requests</span>
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
            subtext="All tickets"
            icon={Ticket}
            tone="ink"
            active={filter === 'all'}
            onClick={() => handleStatClick('all')}
          />
          <StatCard
            label="Open"
            value={stats.open}
            subtext="Awaiting response"
            icon={Clock}
            tone="warning"
            active={filter === 'open'}
            onClick={() => handleStatClick('open')}
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            subtext="Being handled"
            icon={RefreshCw}
            tone="primary"
            active={filter === 'in_progress'}
            onClick={() => handleStatClick('in_progress')}
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            subtext="Resolved tickets"
            icon={CheckCircle}
            tone="success"
            active={filter === 'resolved'}
            onClick={() => handleStatClick('resolved')}
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            subtext="Closed tickets"
            icon={XCircle}
            tone="ink"
            active={filter === 'closed'}
            onClick={() => handleStatClick('closed')}
          />
        </section>

        {/* FILTER BAR */}
        <FilterBar
          searchValue={search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search by reason, reporter, item, or description..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchTickets}
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
            {filteredTickets.length === stats.total
              ? stats.total === 1
                ? '1 ticket'
                : `${stats.total.toLocaleString()} tickets`
              : `Showing ${filteredTickets.length} of ${stats.total.toLocaleString()} tickets`}
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
        {filteredTickets.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Ticket size={27} />
              </div>
              <h2 className="mt-5 text-lg font-black text-ink-950">
                No tickets found
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters to find the tickets you are looking for.'
                  : 'No support requests have been submitted yet.'}
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
                      Reason / Item
                    </th>
                    <th className="hidden px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 md:table-cell">
                      Reporter
                    </th>
                    <th className="hidden px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 lg:table-cell">
                      Description
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
                  {paginatedTickets.map((ticket) => {
                    const statusDisplay = getTicketStatusDisplay(
                      ticket.status
                    );
                    const isOpening = openingTicketId === ticket.id;

                    return (
                      <tr
                        key={ticket.id}
                        className="transition hover:bg-ink-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {ticket.item?.images?.[0] ? (
                              <img
                                src={ticket.item.images[0]}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-xl border border-ink-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-100 bg-ink-50 text-ink-400">
                                <Box size={14} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-ink-950">
                                {getReasonLabel(ticket.reason)}
                              </p>
                              {ticket.item?.title && (
                                <p className="truncate text-[11px] font-bold text-ink-400">
                                  {ticket.item.title}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-5 py-3.5 md:table-cell">
                          <div className="flex items-center gap-2">
                            {ticket.reporter?.avatar_url ? (
                              <img
                                src={ticket.reporter.avatar_url}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-full border border-ink-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-[10px] font-extrabold text-ink-500">
                                {(ticket.reporter?.full_name || 'U').charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-ink-800">
                                {ticket.reporter?.full_name || 'User'}
                              </p>
                              <span
                                className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-extrabold capitalize ${getReporterTypeBadge(
                                  ticket.reporter_type
                                )}`}
                              >
                                {ticket.reporter_type === 'unknown'
                                  ? 'User'
                                  : ticket.reporter_type}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-5 py-3.5 lg:table-cell">
                          {ticket.description ? (
                            <button
                              type="button"
                              onClick={() => openDescModal(ticket)}
                              className="group/desc flex max-w-[220px] items-center gap-1 truncate text-left text-xs font-bold text-ink-500 transition hover:text-primary-600"
                              title="Click to view full description"
                            >
                              <span className="truncate">
                                {ticket.description.length > 40
                                  ? ticket.description.slice(0, 40) + '…'
                                  : ticket.description}
                              </span>
                              <CircleArrowOutUpRight
                                size={11}
                                className="shrink-0 text-primary-500"
                              />
                            </button>
                          ) : (
                            <span className="text-xs font-bold italic text-ink-300">
                              No description
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getTicketStatusBadgeClass(
                              ticket.status
                            )}`}
                          >
                            <i
                              className={`bi ${statusDisplay.icon} text-[9px]`}
                            />
                            {statusDisplay.label}
                          </span>
                        </td>

                        <td className="hidden whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500 sm:table-cell">
                          {formatTicketDate(ticket.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openMessages(ticket)}
                              disabled={isOpening}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition ${
                                isOpening
                                  ? 'cursor-wait border-ink-200 bg-ink-50 text-ink-400'
                                  : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                              }`}
                              title="Open chat"
                            >
                              {isOpening ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-400 border-t-transparent" />
                              ) : (
                                <>
                                  <MessageCircle size={12} />
                                  <span>Chat</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openStatusModal(ticket)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Change Status"
                            >
                              <PenLine size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEmailClient(ticket)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Email User"
                            >
                              <Mailbox size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(ticket)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                              title="Delete Ticket"
                            >
                              <Trash2 size={15} />
                            </button>

                            <ActionMenu
                              items={buildMenuItems(ticket)}
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
            {paginatedTickets.map((ticket) => {
              const statusDisplay = getTicketStatusDisplay(ticket.status);
              const isOpening = openingTicketId === ticket.id;

              return (
                <motion.article
                  key={ticket.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        {ticket.item?.images?.[0] ? (
                          <img
                            src={ticket.item.images[0]}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                            <Box size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-ink-950">
                            {getReasonLabel(ticket.reason)}
                          </p>
                          <p className="truncate text-[11px] font-bold text-ink-400">
                            {formatTicketDate(ticket.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getTicketStatusBadgeClass(
                          ticket.status
                        )}`}
                      >
                        <i
                          className={`bi ${statusDisplay.icon} text-[9px]`}
                        />
                        {statusDisplay.label}
                      </span>
                    </div>

                    {ticket.description && (
                      <p className="line-clamp-2 text-[11px] font-bold text-ink-500">
                        {ticket.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-bold text-ink-500">
                      <div className="flex min-w-0 items-center gap-2">
                        {ticket.reporter?.avatar_url ? (
                          <img
                            src={ticket.reporter.avatar_url}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-[9px] font-extrabold text-ink-500">
                            {(ticket.reporter?.full_name || 'U').charAt(0)}
                          </div>
                        )}
                        <span className="truncate text-ink-700">
                          {ticket.reporter?.full_name || 'User'}
                        </span>
                      </div>
                      <span
                        className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold capitalize ${getReporterTypeBadge(
                          ticket.reporter_type
                        )}`}
                      >
                        {ticket.reporter_type === 'unknown'
                          ? 'User'
                          : ticket.reporter_type}
                      </span>
                    </div>

                    {ticket.item?.title && (
                      <div className="border-t border-ink-100 pt-2 text-[11px] font-bold text-ink-500">
                        <span className="text-ink-400">Item:</span>{' '}
                        <span className="truncate text-ink-700">
                          {ticket.item.title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openMessages(ticket)}
                      disabled={isOpening}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition ${
                        isOpening
                          ? 'cursor-wait border-ink-200 bg-ink-50 text-ink-400'
                          : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {isOpening ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-400 border-t-transparent" />
                      ) : (
                        <>
                          <MessageCircle size={12} />
                          <span>
                            {ticket.replies?.length > 0
                              ? `${ticket.replies.length} replies`
                              : 'Chat'}
                          </span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openStatusModal(ticket)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="Change Status"
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEmailClient(ticket)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="Email User"
                      >
                        <Mailbox size={15} />
                      </button>
                      <ActionMenu
                        items={buildMenuItems(ticket)}
                        placement="top"
                        align="right"
                      />
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
                  filteredTickets.length
                )}
              </span>{' '}
              of{' '}
              <span className="font-extrabold text-ink-700">
                {filteredTickets.length.toLocaleString()}
              </span>{' '}
              tickets
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
          MODALS (all unchanged)
      ============================================================ */}

      <Modal
        isOpen={showDescModal}
        onClose={() => setShowDescModal(false)}
        title={descModalContent.title || 'Ticket Description'}
        size="md"
      >
        <div className="space-y-4">
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
            <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-ink-700">
              {descModalContent.text}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDescModal(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          if (updatingStatus) return;
          setShowStatusModal(false);
          setStatusTicket(null);
          setNewStatus('');
        }}
        title="Change Ticket Status"
        size="sm"
      >
        {statusTicket && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
              <p className="min-w-0 truncate text-sm font-extrabold text-ink-950">
                {getReasonLabel(statusTicket.reason)}
              </p>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${getTicketStatusBadgeClass(
                  statusTicket.status
                )}`}
              >
                {getTicketStatusDisplay(statusTicket.status).label}
              </span>
            </div>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const isSelected = newStatus === option.value;
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
                          ? 'bg-white shadow-sm'
                          : 'bg-white text-ink-400'
                      }`}
                    >
                      <i
                        className={`bi ${option.icon} ${
                          isSelected ? 'text-primary-600' : 'text-ink-400'
                        }`}
                      />
                    </span>
                    <span className="flex-1 text-sm font-extrabold">
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
                  setStatusTicket(null);
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
                  newStatus === statusTicket.status
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
          setDeleteTicket(null);
        }}
        title="Delete Ticket"
        size="sm"
      >
        {deleteTicket && (
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
                  Are you sure you want to delete the ticket{' '}
                  <strong>"{getReasonLabel(deleteTicket.reason)}"</strong>? This
                  action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
              <p className="text-xs font-extrabold text-ink-700">
                {getReasonLabel(deleteTicket.reason)}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-ink-500">
                {formatTicketDate(deleteTicket.created_at)}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTicket(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
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

export default AdminSupport;