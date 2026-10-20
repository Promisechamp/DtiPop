// src/admin/AdminWinners.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  CalendarRange,
  Eye,
  Pencil,
  Trash2,
  Box,
  User,
  CircleArrowOutUpRight,
  PlusCircle,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  X,
  Image as ImageIcon,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import { renderIcon } from '@/utils/constantHelpers';
import { getCategoryByValue, getConditionByValue } from '@/utils/constants';
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
  dateFrom: '',
  dateTo: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
};

const FILTER_KEYS = ['search', 'dateFrom', 'dateTo', 'sortBy', 'sortOrder'];

const FILTER_RESET = {
  search: '',
  dateFrom: '',
  dateTo: '',
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

/* ============================================================
   SKELETON
============================================================ */

const WinnersSkeleton = () => (
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
          <div className="flex gap-2">
            <div className="h-11 w-36 animate-pulse rounded-xl bg-ink-200" />
            <div className="h-11 w-40 animate-pulse rounded-xl bg-ink-200" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
              <div className="h-5 w-24 animate-pulse rounded-full bg-ink-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
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
    </div>
  </div>
);

/* ============================================================
   STAT CARD
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
   MAIN COMPONENT
============================================================ */

const AdminWinners = () => {
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
    namespace: 'admin.winners',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    search,
    dateFrom,
    dateTo,
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
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ---------- modals ---------- */
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ---------- form state ---------- */
  const [formData, setFormData] = useState({
    item_id: '',
    winner_id: '',
    week_start: '',
    week_end: '',
    story: '',
  });

  /* ---------- select options ---------- */
  const sortOptions = useMemo(
    () => [
      { value: 'created_at', label: 'Newest First', icon: ArrowDown },
      { value: 'week_start', label: 'Week Start', icon: CalendarRange },
    ],
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (sortBy !== 'created_at') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(search) ||
    sortBy !== 'created_at' ||
    sortOrder !== 'desc';

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getWinners(params);
      const data = response.data || {};

      setWinners(data.winners || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching winners:', error);
      toast.error('Failed to load winners');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  const openCreateModal = () => {
    setFormData({
      item_id: '',
      winner_id: '',
      week_start: '',
      week_end: '',
      story: '',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (winner) => {
    setSelectedWinner(winner);
    setFormData({
      item_id: winner.item_id || '',
      winner_id: winner.winner_id || '',
      week_start: winner.week_start ? winner.week_start.split('T')[0] : '',
      week_end: winner.week_end ? winner.week_end.split('T')[0] : '',
      story: winner.story || '',
    });
    setShowEditModal(true);
  };

  const handleCreateWinner = async () => {
    if (!formData.item_id || !formData.winner_id) {
      toast.error('Item ID and Winner ID are required');
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.createWinner(formData);
      toast.success('Winner created successfully');
      setShowCreateModal(false);
      setFormData({
        item_id: '',
        winner_id: '',
        week_start: '',
        week_end: '',
        story: '',
      });
      fetchWinners();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create winner');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWinner = async () => {
    if (!selectedWinner) return;
    setActionLoading(true);
    try {
      await adminAPI.updateWinner(selectedWinner.id, formData);
      toast.success('Winner updated successfully');
      setShowEditModal(false);
      setSelectedWinner(null);
      setFormData({
        item_id: '',
        winner_id: '',
        week_start: '',
        week_end: '',
        story: '',
      });
      fetchWinners();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update winner');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWinner = async () => {
    if (!selectedWinner) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteWinner(selectedWinner.id);
      toast.success('Winner deleted successfully');
      setShowDeleteModal(false);
      setSelectedWinner(null);
      fetchWinners();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete winner');
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
      uniqueWinners: new Set(winners.map((w) => w.winner_id)).size,
      thisWeek: winners.filter((w) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return new Date(w.created_at) >= weekStart;
      }).length,
    }),
    [winners, total]
  );

  /* ============================================================
     ACTIVE FILTER CHIPS
  ============================================================ */

  const activeFilterChips = [
    dateFrom && {
      key: 'dateFrom',
      label: `From: ${formatDate(dateFrom)}`,
      onRemove: () => setFilters({ dateFrom: '' }),
    },
    dateTo && {
      key: 'dateTo',
      label: `To: ${formatDate(dateTo)}`,
      onRemove: () => setFilters({ dateTo: '' }),
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

  if (loading && winners.length === 0) return <WinnersSkeleton />;

  /* ============================================================
     MENU ITEMS
  ============================================================ */

  const buildMenuItems = (winner) => [
    {
      key: 'view',
      icon: Eye,
      label: 'View Details',
      onClick: () => {
        setSelectedWinner(winner);
        setShowWinnerModal(true);
      },
    },
    {
      key: 'edit',
      icon: Pencil,
      label: 'Edit',
      onClick: () => openEditModal(winner),
    },
    ...(winner.item?.id
      ? [
          {
            key: 'view-item',
            icon: CircleArrowOutUpRight,
            label: 'View on Site',
            onClick: () => {
              window.open(
                `/item/${winner.item.id}`,
                '_blank',
                'noopener,noreferrer'
              );
            },
          },
        ]
      : []),
    { key: 'divider-delete', divider: true },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Delete',
      danger: true,
      onClick: () => {
        setSelectedWinner(winner);
        setShowDeleteModal(true);
      },
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
                <Trophy size={14} />
                <span>Winner management</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Winner Management
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>{total.toLocaleString()} winners</span>
                <span className="text-ink-300">·</span>
                <span>Manage platform winners</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
              >
                <PlusCircle size={15} />
                Create Winner
              </button>
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            label="Total Winners"
            value={stats.total}
            subtext="Across the platform"
            icon={Trophy}
            tone="ink"
          />
          <StatCard
            label="Unique Winners"
            value={stats.uniqueWinners}
            subtext="Current page"
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="This Week"
            value={stats.thisWeek}
            subtext="Current page"
            icon={Calendar}
            tone="success"
          />
        </section>

        {/* FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search by item title or winner name..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchWinners}
          refreshing={loading}
          activeFilters={activeFilterChips}
          onClearAll={clearAllFilters}
										rightSlot={<ViewToggle value={viewMode} onChange={setViewMode} />}
        >
          <div
            className={`grid gap-4 ${
              viewMode === 'cards'
                ? 'md:grid-cols-2 lg:grid-cols-4'
                : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
                className="input-field"
              />
            </div>

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
            {winners.length === total
              ? total === 1
                ? '1 winner'
                : `${total.toLocaleString()} winners`
              : `Showing ${winners.length} of ${total.toLocaleString()} winners`}
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
        {winners.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Trophy size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                No winners found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters to find the winners you are looking for.'
                  : 'No winners have been recorded yet.'}
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
                      Item / Winner
                    </th>
                    <th className="hidden whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 md:table-cell">
                      Week Range
                    </th>
                    <th className="hidden px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 lg:table-cell">
                      Story
                    </th>
                    <th className="hidden whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 sm:table-cell">
                      Created
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100">
                  {winners.map((winner) => {
                    const category = getCategoryByValue(
                      winner.item?.category
                    );

                    return (
                      <tr
                        key={winner.id}
                        className="transition hover:bg-ink-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                              {winner.item?.images?.[0] ? (
                                <img
                                  src={winner.item.images[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-ink-300">
                                  <Box size={14} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWinner(winner);
                                  setShowWinnerModal(true);
                                }}
                                className="block max-w-xs truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                              >
                                {winner.item?.title || 'Unknown Item'}
                              </button>

                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-400">
                                {winner.winner?.avatar_url ? (
                                  <img
                                    src={winner.winner.avatar_url}
                                    alt=""
                                    className="h-4 w-4 rounded-full border border-ink-100 object-cover"
                                  />
                                ) : (
                                  <User size={12} />
                                )}
                                <span className="truncate">
                                  {winner.winner?.full_name || 'Unknown'}
                                </span>

                                {category && (
                                  <>
                                    <span className="text-ink-300">·</span>
                                    {renderIcon(
                                      category.icon,
                                      'h-3 w-3',
                                      category.color
                                    )}
                                    <span className="text-ink-500">
                                      {category.label}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="hidden whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500 md:table-cell">
                          <span>{formatDate(winner.week_start)}</span>
                          <span className="mx-1 text-ink-300">→</span>
                          <span>{formatDate(winner.week_end)}</span>
                        </td>

                        <td className="hidden px-5 py-3.5 lg:table-cell">
                          <p className="max-w-xs truncate text-xs font-bold text-ink-500">
                            {winner.story || '—'}
                          </p>
                        </td>

                        <td className="hidden whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500 sm:table-cell">
                          {formatDate(winner.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWinner(winner);
                                setShowWinnerModal(true);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(winner)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>

                            <ActionMenu
                              items={buildMenuItems(winner)}
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
            {winners.map((winner) => {
              const category = getCategoryByValue(winner.item?.category);
              const imageUrl = winner.item?.images?.[0] || null;

              return (
                <motion.article
                  key={winner.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-ink-50">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={winner.item?.title || 'Item'}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-300">
                        <ImageIcon size={30} />
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50/95 px-2.5 py-1 text-[10px] font-extrabold text-warning-700 backdrop-blur-sm">
                        <Trophy size={10} fill="currentColor" />
                        Winner
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col space-y-2 p-4">
                    <Link
                      to={`/item/${winner.item?.id}`}
                      className="line-clamp-1 text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                    >
                      {winner.item?.title || 'Unknown Item'}
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {category &&
                        renderIcon(category.icon, 'h-3 w-3', category.color)}
                      <span className="text-[11px] font-bold text-ink-400">
                        {category?.label || 'Uncategorized'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {winner.winner?.avatar_url ? (
                        <img
                          src={winner.winner.avatar_url}
                          alt=""
                          className="h-5 w-5 rounded-full border border-ink-100 object-cover"
                        />
                      ) : (
                        <User size={14} className="text-ink-400" />
                      )}
                      <span className="text-[11px] font-bold text-ink-700">
                        {winner.winner?.full_name || 'Unknown'}
                      </span>
                    </div>

                    {winner.story && (
                      <p className="line-clamp-2 text-[11px] font-bold text-ink-500">
                        "{winner.story}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-bold text-ink-500">
                      <span className="flex items-center gap-1">
                        <CalendarRange size={11} />
                        {formatDate(winner.week_start)}
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(winner.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWinner(winner);
                          setShowWinnerModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(winner)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>

                      <ActionMenu
                        items={buildMenuItems(winner)}
                        placement="top"
                        align="right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWinner(winner);
                        setShowDeleteModal(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
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
              winners
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
          WINNER DETAILS MODAL
      ============================================================ */}

      <Modal
        isOpen={showWinnerModal}
        onClose={() => {
          setShowWinnerModal(false);
          setSelectedWinner(null);
        }}
        showCloseButton={false}
        size="lg"
      >
        {selectedWinner && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-ink-950">
                Winner Details
              </h2>

              <div className="ml-auto flex items-center gap-3">
                {selectedWinner.item?.id && (
                  <Link
                    to={`/item/${selectedWinner.item.id}`}
                    className="shrink-0 text-ink-400 transition hover:text-primary-600"
                    title="View item details"
                  >
                    <CircleArrowOutUpRight size={15} />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    setSelectedWinner(null);
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
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                {selectedWinner.item?.images?.[0] ? (
                  <img
                    src={selectedWinner.item.images[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-300">
                    <Box size={20} />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-ink-950">
                  {selectedWinner.item?.title || 'Unknown Item'}
                </h3>

                <div className="mt-1 flex items-center gap-1.5">
                  {selectedWinner.winner?.avatar_url ? (
                    <img
                      src={selectedWinner.winner.avatar_url}
                      alt=""
                      className="h-5 w-5 rounded-full border border-ink-100 object-cover"
                    />
                  ) : (
                    <User size={14} className="text-ink-400" />
                  )}
                  <span className="truncate text-xs font-bold text-ink-500">
                    {selectedWinner.winner?.full_name || 'Unknown Winner'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Week Start
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {formatDate(selectedWinner.week_start)}
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Week End
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {formatDate(selectedWinner.week_end)}
                </p>
              </div>
            </div>

            {selectedWinner.story && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Story
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-sm font-medium leading-6 text-ink-700">
                  {selectedWinner.story}
                </p>
              </div>
            )}

            {selectedWinner.item && (
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Item Details
                  </p>
                  {selectedWinner.item.id && (
                    <Link
                      to={`/item/${selectedWinner.item.id}`}
                      className="shrink-0 text-ink-400 transition hover:text-primary-600"
                      title="View item"
                    >
                      <CircleArrowOutUpRight size={13} />
                    </Link>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">
                      Category:
                    </span>
                    {(() => {
                      const cat = getCategoryByValue(
                        selectedWinner.item.category
                      );
                      return cat ? (
                        <>
                          {renderIcon(cat.icon, 'h-3.5 w-3.5', cat.color)}
                          <span>{cat.label}</span>
                        </>
                      ) : (
                        <span>{selectedWinner.item.category || 'N/A'}</span>
                      );
                    })()}
                  </p>

                  <p className="flex items-center gap-1.5 font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">
                      Condition:
                    </span>
                    {(() => {
                      const cond = getConditionByValue(
                        selectedWinner.item.condition
                      );
                      return cond ? (
                        <>
                          {renderIcon(cond.icon, 'h-3.5 w-3.5', cond.color)}
                          <span>{cond.label}</span>
                        </>
                      ) : (
                        <span>{selectedWinner.item.condition || 'N/A'}</span>
                      );
                    })()}
                  </p>

                  <p className="flex items-center gap-1.5 font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">Donor:</span>
                    {selectedWinner.item.donor?.avatar_url ? (
                      <img
                        src={selectedWinner.item.donor.avatar_url}
                        alt=""
                        className="h-4 w-4 rounded-full border border-ink-100 object-cover"
                      />
                    ) : (
                      <User size={13} className="text-ink-400" />
                    )}
                    <span>
                      {selectedWinner.item.donor?.full_name || 'Anonymous'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {selectedWinner.winner && (
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Winner Details
                  </p>
                  {selectedWinner.winner.id && (
                    <Link
                      to={`/admin/users-profile/${selectedWinner.winner.id}`}
                      className="shrink-0 text-ink-400 transition hover:text-primary-600"
                      title="View user"
                    >
                      <CircleArrowOutUpRight size={13} />
                    </Link>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">Name:</span>
                    {selectedWinner.winner.avatar_url ? (
                      <img
                        src={selectedWinner.winner.avatar_url}
                        alt=""
                        className="h-4 w-4 rounded-full border border-ink-100 object-cover"
                      />
                    ) : (
                      <User size={13} className="text-ink-400" />
                    )}
                    <span>{selectedWinner.winner.full_name}</span>
                  </p>

                  <p className="font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">
                      Location:
                    </span>{' '}
                    {selectedWinner.winner.location || 'N/A'}
                  </p>

                  <p className="font-bold text-ink-600">
                    <span className="font-extrabold text-ink-700">Email:</span>{' '}
                    {selectedWinner.winner.email || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowWinnerModal(false);
                  setSelectedWinner(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowWinnerModal(false);
                  openEditModal(selectedWinner);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
              >
                <Pencil size={15} />
                Edit Winner
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          CREATE WINNER MODAL
      ============================================================ */}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          if (actionLoading) return;
          setShowCreateModal(false);
          setFormData({
            item_id: '',
            winner_id: '',
            week_start: '',
            week_end: '',
            story: '',
          });
        }}
        title="Create Winner"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink-500">
            Create a new winner record.
          </p>

          <div>
            <label className="label">Item ID *</label>
            <input
              type="text"
              value={formData.item_id}
              onChange={(e) =>
                setFormData({ ...formData, item_id: e.target.value })
              }
              placeholder="Enter item UUID..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Winner ID *</label>
            <input
              type="text"
              value={formData.winner_id}
              onChange={(e) =>
                setFormData({ ...formData, winner_id: e.target.value })
              }
              placeholder="Enter winner user UUID..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Week Start</label>
              <input
                type="date"
                value={formData.week_start}
                onChange={(e) =>
                  setFormData({ ...formData, week_start: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Week End</label>
              <input
                type="date"
                value={formData.week_end}
                onChange={(e) =>
                  setFormData({ ...formData, week_end: e.target.value })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Story (Optional)</label>
            <textarea
              value={formData.story}
              onChange={(e) =>
                setFormData({ ...formData, story: e.target.value })
              }
              placeholder="Add story..."
              className="input-field resize-none"
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                setShowCreateModal(false);
                setFormData({
                  item_id: '',
                  winner_id: '',
                  week_start: '',
                  week_end: '',
                  story: '',
                });
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCreateWinner}
              disabled={
                actionLoading || !formData.item_id || !formData.winner_id
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle size={15} />
                  Create Winner
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================
          EDIT WINNER MODAL
      ============================================================ */}

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          if (actionLoading) return;
          setShowEditModal(false);
          setSelectedWinner(null);
          setFormData({
            item_id: '',
            winner_id: '',
            week_start: '',
            week_end: '',
            story: '',
          });
        }}
        title="Edit Winner"
        size="md"
      >
        {selectedWinner && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink-500">
              Editing winner for "
              <span className="font-extrabold text-ink-950">
                {selectedWinner.item?.title}
              </span>
              "
            </p>

            <div>
              <label className="label">Item ID</label>
              <input
                type="text"
                value={formData.item_id}
                disabled
                className="input-field cursor-not-allowed bg-ink-50 text-ink-500"
              />
            </div>

            <div>
              <label className="label">Winner ID</label>
              <input
                type="text"
                value={formData.winner_id}
                disabled
                className="input-field cursor-not-allowed bg-ink-50 text-ink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Week Start</label>
                <input
                  type="date"
                  value={formData.week_start}
                  onChange={(e) =>
                    setFormData({ ...formData, week_start: e.target.value })
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Week End</label>
                <input
                  type="date"
                  value={formData.week_end}
                  onChange={(e) =>
                    setFormData({ ...formData, week_end: e.target.value })
                  }
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label">Story</label>
              <textarea
                value={formData.story}
                onChange={(e) =>
                  setFormData({ ...formData, story: e.target.value })
                }
                placeholder="Add story..."
                className="input-field resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedWinner(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateWinner}
                disabled={actionLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Update Winner
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          DELETE CONFIRMATION MODAL
      ============================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (actionLoading) return;
          setShowDeleteModal(false);
          setSelectedWinner(null);
        }}
        title="Delete Winner"
        size="sm"
      >
        {selectedWinner && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this winner?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete the winner record for{' '}
                  <strong>"{selectedWinner.item?.title}"</strong>? This action
                  cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedWinner(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteWinner}
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
                    Delete Winner
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

export default AdminWinners;