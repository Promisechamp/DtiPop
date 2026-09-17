import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { favoritesAPI } from '@/services/api/dtiApi';

import Modal from '@/reusables/Modal';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import Select from '@/reusables/Select';
import { ITEM_STATUS_DISPLAY } from '@/utils/constants';

// ============================================================
// Skeleton
// ============================================================
const FavoritesSkeleton = () => (
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
        <div className="h-11 w-32 rounded-xl bg-ink-200 animate-pulse" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-ink-100/80 bg-ink-50 p-4 shadow-sm">
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
      <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-ink-50 shadow-sm">
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
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50 shadow-sm">
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
// Status Helpers
// ============================================================
const getStatusDisplay = (status) =>
  ITEM_STATUS_DISPLAY?.[status] || {
    label: status || 'Unknown',
    icon: 'bi-circle',
    color: 'bg-ink-50 text-ink-600 border-ink-200',
  };

// ============================================================
// Main Component
// ============================================================
const FavoritesPage = () => {
  const breakpoint = useBreakpoint();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [favorites, setFavorites] = useState([]);
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

  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearing, setClearing] = useState(false);

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
    return count;
  }, [filterStatus, sortBy]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: 'bi-funnel' },
      ...Object.entries(ITEM_STATUS_DISPLAY).map(([value, display]) => ({
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

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await favoritesAPI.getAll();
      const favoritesData = response.data?.favorites || response.data || [];
      setFavorites(favoritesData);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      setError(err.response?.data?.error || 'Failed to load favorites');
      toast.error('Failed to load favorites');
      setFavorites([]);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // URL query parameter sync
  useEffect(() => {
    const urlStatus = searchParams.get('sort-status');
    if (urlStatus) {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  // Filter & Sort logic
  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    if (filterStatus) {
      result = result.filter((item) => item.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return sortBy === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return result;
  }, [favorites, filterStatus, searchTerm, sortBy]);

  const totalItems = filteredFavorites.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFavorites.slice(start, start + itemsPerPage);
  }, [filteredFavorites, currentPage]);

  // Stats
  const stats = useMemo(
    () => ({
      total: favorites.length,
      active: favorites.filter((i) => i.status === 'active').length,
      pending: favorites.filter((i) => i.status === 'pending').length,
      completed: favorites.filter((i) => i.status === 'completed').length,
    }),
    [favorites]
  );

  const handleRemoveItem = (itemId) => {
    setFavorites((prev) => prev.filter((item) => item.item_id !== itemId));
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await favoritesAPI.clearAll();
      setFavorites([]);
      toast.success('All favorites cleared');
      setShowClearAllModal(false);
    } catch (err) {
      toast.error('Failed to clear favorites');
      fetchFavorites();
    } finally {
      setClearing(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2">
        <PageNavigation />
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50 p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <i className="bi bi-heart text-2xl" />
            </div>
            <h3 className="text-lg font-extrabold text-ink-800">Sign in to View Favorites</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              Save items you love and come back to them anytime.
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

  if (loading) return <FavoritesSkeleton />;

  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      <PageNavigation />

      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
                Your saved items
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              My Favorites
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>

          {favorites.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <i className="bi bi-trash" />
              Clear All
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Favorites" value={stats.total} icon="bi-heart" color="text-rose-600" bg="bg-rose-50" />
          <StatCard label="Active" value={stats.active} icon="bi-check-circle" color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Pending" value={stats.pending} icon="bi-clock" color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Completed" value={stats.completed} icon="bi-check-circle-fill" color="text-sky-600" bg="bg-sky-50" />
        </div>

        {/* FILTER TOOLBAR */}
        <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-ink-50 shadow-sm">
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
                  Filter & Sort Favorites
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'All items visible'}
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
                      placeholder="Search by title, category, or description..."
                      className="w-full rounded-xl border border-ink-100 bg-ink-50 py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
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
        {favorites.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50 p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-heart text-2xl" />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No favorites yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                Start browsing items and click the heart icon to save them here.
              </p>
              <Link
                to="/browse"
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-search text-xs" />
                Browse Items
              </Link>
            </div>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50 p-12 text-center shadow-sm">
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
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm hover:bg-ink-50"
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
              {paginatedItems.map((item) => (
                <motion.div
                  key={item.id || item.item_id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <FavoriteCard item={item} onRemove={handleRemoveItem} />
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
                  of <span className="font-bold text-ink-600">{totalItems}</span> favorites
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

        {/* CLEAR ALL MODAL */}
        <Modal
          isOpen={showClearAllModal}
          onClose={() => setShowClearAllModal(false)}
          title="Clear All Favorites"
          size="sm"
        >
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <i className="bi bi-exclamation-triangle text-xl" />
              </div>
              <div>
                <p className="text-sm leading-relaxed text-ink-600">
                  Are you sure you want to remove all {favorites.length} {favorites.length === 1 ? 'item' : 'items'} from your favorites? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={clearing}
                className="flex-1 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                {clearing ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// ============================================================
// Favorite Card Sub-component
// ============================================================
const FavoriteCard = ({ item, onRemove }) => {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (removing) return;

    setRemoving(true);
    try {
      await favoritesAPI.remove(item.item_id);
      toast.success('Removed from favorites');
      onRemove?.(item.item_id);
    } catch (err) {
      toast.error('Failed to remove from favorites');
    } finally {
      setRemoving(false);
    }
  };

  const imageUrl = item.images?.[0] || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400&h=300&fit=crop';
  const itemDetailId = item.item_id || item.id;
  const statusDisplay = getStatusDisplay(item.status);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-ink-50 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <button
        onClick={handleRemove}
        disabled={removing}
        aria-label="Remove from favorites"
        className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 bg-ink-50/95 text-rose-500 shadow-sm backdrop-blur-sm transition hover:bg-rose-50 hover:border-rose-200"
      >
        {removing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        ) : (
          <i className="bi bi-heart-fill text-sm" />
        )}
      </button>

      <Link to={`/item/${itemDetailId}`} className="block">
        <div className="relative h-32 sm:h-44 w-full overflow-hidden bg-ink-100">
          <img
            src={imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md bg-ink-50/95 ${statusDisplay.color}`}>
            <i className={`bi ${statusDisplay.icon} text-[9px]`} />
            {statusDisplay.label}
          </span>
        </div>

        <div className="p-3 sm:p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500 truncate">
              {item.condition}
            </span>
            {item.category && (
              <>
                <span className="text-ink-300">·</span>
                <span className="text-[10px] text-ink-400 truncate">{item.category}</span>
              </>
            )}
          </div>
          <h3 className="line-clamp-2 text-sm sm:text-base font-extrabold leading-snug text-ink-900">
            {item.title}
          </h3>
        </div>
      </Link>
    </div>
  );
};

// ============================================================
// Stat Card
// ============================================================
function StatCard({ label, value, icon, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-ink-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
    <div className="flex items-center gap-1 rounded-xl border border-ink-100/80 bg-ink-50 p-1 shadow-sm">
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

export default FavoritesPage;