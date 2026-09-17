import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Filter, 
  Search, 
  Table as TableIcon, 
  LayoutGrid, 
  Plus, 
  Minus, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Eye, 
  Pencil, 
  MoreVertical, 
  Trash2, 
  Box, 
  User, 
  CircleArrowOutUpRight, 
  PlusCircle, 
  Check, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  SortAsc, 
  SortDesc, 
  CalendarRange,
  Image as ImageIcon
} from 'lucide-react';
import { adminAPI } from '@/services/api/dtiApi';
import { renderIcon } from '@/utils/constantHelpers';
import { getCategoryByValue, getConditionByValue } from '@/utils/constants';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import Select from '@/reusables/Select';
import Modal from '@/reusables/Modal';

const ITEMS_PER_PAGE = 20;


// ============================================================
// Skeleton (Unified)
// ============================================================
const WinnersSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />
    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded w-48 mb-2" />
      <div className="h-4 bg-ink-200 rounded w-32" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
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
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-ink-50">
            {/* Item/Winner column: image + text */}
            <div className="flex items-center gap-3 flex-1 min-w-[120px]">
              <div className="w-10 h-10 rounded-xl bg-ink-200 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="h-4 bg-ink-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-ink-200 rounded w-1/2" />
              </div>
            </div>
            {/* Week Range */}
            <div className="w-24 shrink-0">
              <div className="h-4 bg-ink-200 rounded w-full" />
            </div>
            {/* Story */}
            <div className="w-32 shrink-0">
              <div className="h-4 bg-ink-200 rounded w-3/4" />
            </div>
            {/* Created */}
            <div className="w-20 shrink-0">
              <div className="h-4 bg-ink-200 rounded w-full" />
            </div>
            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              {[...Array(3)].map((_, j) => (
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
// Main Component
// ============================================================
const AdminWinners = () => {
  const breakpoint = useBreakpoint();

  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modals
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    item_id: '',
    winner_id: '',
    week_start: '',
    week_end: '',
    story: '',
  });

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

  // Set initial default grid columns on mount and whenever breakpoint changes
  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // ============================================================
  // Click outside dropdown handler
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
    if (dateFrom) count++;
    if (dateTo) count++;
    if (sortBy !== 'created_at') count++;
    return count;
  }, [dateFrom, dateTo, sortBy]);

  const sortOptions = [
    { value: 'created_at', label: 'Newest First', icon: 'bi-sort-down' },
    { value: 'week_start', label: 'Week Start', icon: 'bi-calendar-week' },
  ];

  // Fetch winners
  const fetchWinners = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(search && search.trim() && { search: search.trim() }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getWinners(params);
      const data = response.data;
      setWinners(data.winners || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching winners:', error);
      toast.error('Failed to load winners');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchWinners();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const clearAllFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // CRUD handlers
  const handleCreateWinner = async () => {
    if (!formData.item_id || !formData.winner_id) {
      toast.error('Item ID and Winner ID are required');
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.createWinner(formData);
      toast.success('Winner created successfully!');
      setShowCreateModal(false);
      setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
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
      toast.success('Winner updated successfully!');
      setShowEditModal(false);
      setSelectedWinner(null);
      setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const openCreateModal = () => {
    setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
    setShowCreateModal(true);
  };

  // Stats
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

  if (loading && winners.length === 0) return <WinnersSkeleton />;

  return (
    <div className="space-y-4">
      <PageNavigation />

      {/* ========== HEADER ========== */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Winner management
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
            Winner Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total.toLocaleString()} winners · Manage platform winners
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            Create Winner
          </button>
        </div>
      </div>

      {/* ========== STATS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Winners" value={stats.total} icon={Trophy} />
        <StatCard
          label="Unique Winners"
          value={stats.uniqueWinners}
          icon={Users}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <StatCard
          label="This Week"
          value={stats.thisWeek}
          icon={Calendar}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* ========== FILTER TOOLBAR ========== */}
      <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center gap-3 text-left transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
              <Filter className="w-4 h-4" />
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
                  <TableIcon className="w-3.5 h-3.5" />
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
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition text-ink-500 hover:text-ink-800"
                >
                  <TableIcon className="w-3.5 h-3.5" />
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
                  <Minus className="w-3.5 h-3.5" />
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
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 flex items-center"
            >
              <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
              {filtersExpanded ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
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
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by item title or winner name..."
                    className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-ink-500 block mb-1">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-ink-500 block mb-1">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
                    />
                  </div>
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
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={clearAllFilters}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <X className="w-3.5 h-3.5" />
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
      {winners.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-extrabold text-ink-800">No winners found</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              {search ? 'Try adjusting your search' : 'No winners recorded yet'}
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
                        Item / Winner
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Week Range
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Story
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 whitespace-nowrap">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {winners.map((winner) => {
                      const category = getCategoryByValue(winner.item?.category);
                      const isMenuOpen = openMenuId === winner.id;

                      return (
                        <motion.tr
                          key={winner.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group transition-colors hover:bg-primary-50/20"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="img w-10 h-10 rounded-xl bg-ink-100 overflow-hidden shrink-0 border border-ink-100">
                                {winner.item?.images?.[0] ? (
                                  <img
                                    src={winner.item.images[0]}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Box className="w-4 h-4 text-ink-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <button
                                  onClick={() => {
                                    setSelectedWinner(winner);
                                    setShowWinnerModal(true);
                                  }}
                                  className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition max-w-xs text-left"
                                >
                                  {winner.item?.title || 'Unknown Item'}
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {winner.winner?.avatar_url ? (
                                    <img
                                      src={winner.winner.avatar_url}
                                      alt=""
                                      className="w-4 h-4 rounded-full border border-ink-100"
                                    />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-ink-400" />
                                  )}
                                  <span className="text-xs font-medium text-ink-400">
                                    {winner.winner?.full_name || 'Unknown'}
                                  </span>
                                  {category && (
                                    <>
                                      <span className="text-ink-300">·</span>
                                      {renderIcon(category.icon, 'w-3 h-3', category.color)}
                                      <span className="text-xs font-bold text-ink-600">
                                        {category.label}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="text-sm font-medium text-ink-700">
                              <span>{formatDate(winner.week_start)}</span>
                              <span className="text-ink-400 mx-1">→</span>
                              <span>{formatDate(winner.week_end)}</span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-ink-500 truncate max-w-xs">
                              {winner.story || '—'}
                            </p>
                          </td>

                          <td className="px-5 py-3.5 text-sm font-medium text-ink-500 whitespace-nowrap">
                            {formatDate(winner.created_at)}
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedWinner(winner);
                                  setShowWinnerModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEditModal(winner)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <div className="action-menu relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(isMenuOpen ? null : winner.id);
                                  }}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                    isMenuOpen
                                      ? 'bg-primary-50 text-primary-600'
                                      : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                                  }`}
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-0 top-full z-[999] mt-2 w-48 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-xl shadow-ink-900/10 backdrop-blur-md">
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedWinner(winner);
                                        setShowWinnerModal(true);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                        <Eye className="w-3.5 h-3.5" />
                                      </span>
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        openEditModal(winner);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </span>
                                      Edit
                                    </button>
                                    <div className="my-1 h-px bg-ink-100" />
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedWinner(winner);
                                        setShowDeleteModal(true);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                        <Trash2 className="w-3.5 h-3.5" />
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
              {winners.map((winner) => {
                const category = getCategoryByValue(winner.item?.category);
                const imageUrl = winner.item?.images?.[0] || null;

                return (
                  <motion.div
                    key={winner.id}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100/85 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative h-48 w-full bg-ink-50 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={winner.item?.title || 'Item'}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-ink-300" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md bg-white/90 text-ink-700 border-ink-200">
                          <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          Winner
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-1">
                      <Link
                        to={`/item/${winner.item?.id}`}
                        className="block text-base font-extrabold text-ink-800 line-clamp-1 hover:text-primary-600"
                      >
                        {winner.item?.title || 'Unknown Item'}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        {category && renderIcon(category.icon, 'h-3 w-3', category.color)}
                        <span className="text-xs font-medium text-ink-400">
                          {category?.label || 'Uncategorized'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {winner.winner?.avatar_url ? (
                          <img
                            src={winner.winner.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full border border-ink-100"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 text-ink-400" />
                        )}
                        <span className="text-xs font-bold text-ink-700">
                          {winner.winner?.full_name || 'Unknown'}
                        </span>
                      </div>
                      {winner.story && (
                        <p className="text-xs text-ink-500 line-clamp-2 mt-1">
                          "{winner.story}"
                        </p>
                      )}
                      <p className="text-xs font-medium text-ink-400 mt-1">
                        {formatDate(winner.created_at)}
                      </p>
                    </div>

                    <div className="border-t border-ink-100 bg-ink-50/50 p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedWinner(winner);
                            setShowWinnerModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(winner)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedWinner(winner);
                          setShowDeleteModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ========== PAGINATION ========== */}
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
                of <span className="font-bold text-ink-600">{total.toLocaleString()}</span> winners
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
          MODALS
      ============================================================ */}

      {/* Winner Details Modal */}
      <Modal
        isOpen={showWinnerModal}
        onClose={() => {
          setShowWinnerModal(false);
          setSelectedWinner(null);
        }}
        title="Winner Details"
        size="lg"
      >
        {selectedWinner && (
          <div className="space-y-4">
            <div className="mt-2 flex items-start gap-4">
              <div className="img w-16 h-16 rounded-xl bg-ink-100 overflow-hidden shrink-0 border border-ink-100">
                {selectedWinner.item?.images?.[0] ? (
                  <img
                    src={selectedWinner.item.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Box className="w-6 h-6 text-ink-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-extrabold text-ink-900">
                  {selectedWinner.item?.title || 'Unknown Item'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {selectedWinner.winner?.avatar_url ? (
                    <img
                      src={selectedWinner.winner.avatar_url}
                      alt=""
                      className="w-5 h-5 rounded-full border border-ink-100"
                    />
                  ) : (
                    <User className="w-4 h-4 text-ink-400" />
                  )}
                  <span className="text-sm font-bold text-ink-700">
                    {selectedWinner.winner?.full_name || 'Unknown Winner'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Week Start</p>
                <p className="text-sm font-bold text-ink-900">{formatDate(selectedWinner.week_start)}</p>
              </div>
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Week End</p>
                <p className="text-sm font-bold text-ink-900">{formatDate(selectedWinner.week_end)}</p>
              </div>
            </div>

            {selectedWinner.story && (
              <div>
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider mb-1">Story</p>
                <p className="text-sm font-bold text-ink-700 bg-ink-50/50 rounded-xl border border-ink-100/60 p-3">
                  {selectedWinner.story}
                </p>
              </div>
            )}

            {selectedWinner.item && (
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Item Details</p>
                  <Link
                    to={`/item/${selectedWinner.item.id}`}
                    className="text-ink-400 hover:text-primary-600 shrink-0"
                    title="View item details"
                  >
                    <CircleArrowOutUpRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-ink-600 flex items-center gap-1.5 font-medium">
                    <span className="font-extrabold text-ink-700">Category:</span>
                    {(() => {
                      const cat = getCategoryByValue(selectedWinner.item.category);
                      return cat ? (
                        <>
                          {renderIcon(cat.icon, 'w-3.5 h-3.5', cat.color)}
                          <span>{cat.label}</span>
                        </>
                      ) : (
                        <span>{selectedWinner.item.category || 'N/A'}</span>
                      );
                    })()}
                  </p>
                  <p className="text-ink-600 flex items-center gap-1.5 font-medium">
                    <span className="font-extrabold text-ink-700">Condition:</span>
                    {(() => {
                      const cond = getConditionByValue(selectedWinner.item.condition);
                      return cond ? (
                        <>
                          {renderIcon(cond.icon, 'w-3.5 h-3.5', cond.color)}
                          <span>{cond.label}</span>
                        </>
                      ) : (
                        <span>{selectedWinner.item.condition || 'N/A'}</span>
                      );
                    })()}
                  </p>
                  <p className="text-ink-600 flex items-center gap-1.5 font-medium">
                    <span className="font-extrabold text-ink-700">Donor:</span>
                    {selectedWinner.item.donor?.avatar_url ? (
                      <img
                        src={selectedWinner.item.donor.avatar_url}
                        alt=""
                        className="w-4 h-4 rounded-full border border-ink-100"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-ink-400" />
                    )}
                    <span>{selectedWinner.item.donor?.full_name || 'Anonymous'}</span>
                  </p>
                </div>
              </div>
            )}

            {selectedWinner.winner && (
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Winner Details</p>
                  <Link
                    to={`/admin/users-profile/${selectedWinner.winner.id}`}
                    className="text-ink-400 hover:text-primary-600 shrink-0"
                    title="View user details"
                  >
                    <CircleArrowOutUpRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-ink-600 flex items-center gap-1.5 font-medium">
                    <span className="font-extrabold text-ink-700">Name:</span>
                    {selectedWinner.winner?.avatar_url ? (
                      <img
                        src={selectedWinner.winner.avatar_url}
                        alt=""
                        className="w-4 h-4 rounded-full border border-ink-100"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-ink-400" />
                    )}
                    <span>{selectedWinner.winner.full_name}</span>
                  </p>
                  <p className="text-ink-600 font-medium">
                    <span className="font-extrabold text-ink-700">Location:</span> {selectedWinner.winner.location || 'N/A'}
                  </p>
                  <p className="text-ink-600 font-medium">
                    <span className="font-extrabold text-ink-700">Email:</span> {selectedWinner.winner.email || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-ink-100">
              <button
                onClick={() => {
                  setShowWinnerModal(false);
                  setSelectedWinner(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowWinnerModal(false);
                  openEditModal(selectedWinner);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md"
              >
                Edit Winner
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Winner Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
        }}
        title="Create Winner"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink-500">Create a new winner record.</p>

          <div>
            <label className="text-sm font-extrabold text-ink-700 block mb-1">Item ID *</label>
            <input
              type="text"
              value={formData.item_id}
              onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              placeholder="Enter item UUID..."
              className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
            />
          </div>

          <div>
            <label className="text-sm font-extrabold text-ink-700 block mb-1">Winner ID *</label>
            <input
              type="text"
              value={formData.winner_id}
              onChange={(e) => setFormData({ ...formData, winner_id: e.target.value })}
              placeholder="Enter winner user UUID..."
              className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">Week Start</label>
              <input
                type="date"
                value={formData.week_start}
                onChange={(e) => setFormData({ ...formData, week_start: e.target.value })}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">Week End</label>
              <input
                type="date"
                value={formData.week_end}
                onChange={(e) => setFormData({ ...formData, week_end: e.target.value })}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-extrabold text-ink-700 block mb-1">Story (Optional)</label>
            <textarea
              value={formData.story}
              onChange={(e) => setFormData({ ...formData, story: e.target.value })}
              placeholder="Add story..."
              className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-ink-100">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
              }}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWinner}
              disabled={actionLoading || !formData.item_id || !formData.winner_id}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Create Winner
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Winner Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedWinner(null);
          setFormData({ item_id: '', winner_id: '', week_start: '', week_end: '', story: '' });
        }}
        title="Edit Winner"
        size="md"
      >
        {selectedWinner && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink-500">
              Editing winner for "<span className="font-extrabold text-ink-900">{selectedWinner.item?.title}</span>"
            </p>

            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">Item ID</label>
              <input
                type="text"
                value={formData.item_id}
                disabled
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl bg-ink-50 text-ink-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">Winner ID</label>
              <input
                type="text"
                value={formData.winner_id}
                disabled
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl bg-ink-50 text-ink-500 text-sm cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-extrabold text-ink-700 block mb-1">Week Start</label>
                <input
                  type="date"
                  value={formData.week_start}
                  onChange={(e) => setFormData({ ...formData, week_start: e.target.value })}
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
                />
              </div>
              <div>
                <label className="text-sm font-extrabold text-ink-700 block mb-1">Week End</label>
                <input
                  type="date"
                  value={formData.week_end}
                  onChange={(e) => setFormData({ ...formData, week_end: e.target.value })}
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 bg-white transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">Story</label>
              <textarea
                value={formData.story}
                onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                placeholder="Add story..."
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-ink-100">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedWinner(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWinner}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Update Winner
                  </>
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
          setSelectedWinner(null);
        }}
        title="Delete Winner"
        size="sm"
      >
        {selectedWinner && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-600">
                  Are you sure you want to delete this winner record for "
                  <span className="font-extrabold text-ink-900">{selectedWinner.item?.title}</span>"?
                </p>
                <p className="text-xs font-medium text-ink-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedWinner(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWinner}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Delete Winner'
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
// Helper Components
// ============================================================

function StatCard({ label, value, icon: Icon, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border border-ink-100/60`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

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
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50/60 hover:text-primary-600'
        }`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
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
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default AdminWinners;
