import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/api/supabase';
import Select from '@/reusables/Select';
import Modal from '@/reusables/Modal';
import {
  ITEM_STATUS_DISPLAY,
  getStatusDisplay,
  getCategoryByValue,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import { PageNavigation } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import {
  CircleArrowOutUpRight,
} from "lucide-react";
import logo from '@/assets/popLogo1.png';


// ============================================================
// Skeleton
// ============================================================
const MyListedItemsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">
    <div className="animate-pulse">
      <div className="flex items-center gap-2.5 bg-ink-50 py-10">
        <div className="h-10 w-24 rounded-xl bg-ink-200" />
        <div className="h-6 w-px bg-ink-200" />
        <div className="h-10 w-24 rounded-xl bg-ink-200" />
      </div>
    </div>

    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="animate-pulse">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-ink-200" />
            <div className="h-3 w-40 rounded bg-ink-200" />
          </div>
          <div className="h-9 w-40 rounded bg-ink-200 sm:w-48" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-ink-200" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-ink-200 animate-pulse" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
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

      {/* ITEM GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="h-48 w-full animate-pulse bg-ink-200" />
            <div className="space-y-2 p-4 animate-pulse">
              <div className="h-3 w-20 rounded bg-ink-200" />
              <div className="h-5 w-3/4 rounded bg-ink-200" />
              <div className="h-3 w-full rounded bg-ink-200" />
              <div className="h-3 w-2/3 rounded bg-ink-200" />
            </div>
            <div className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-4">
              <div className="flex items-center justify-between animate-pulse">
                <div className="h-3 w-28 rounded bg-ink-200" />
                <div className="h-3 w-20 rounded bg-ink-200" />
              </div>
              <div className="flex gap-2 border-t border-ink-100 pt-3 animate-pulse">
                <div className="h-8 flex-1 rounded-xl bg-ink-200" />
                <div className="h-8 flex-1 rounded-xl bg-ink-200" />
                <div className="h-8 w-8 rounded-xl bg-ink-200" />
              </div>
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
const MyListedItemsPage = () => {
  const breakpoint = useBreakpoint();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [gridCols, setGridCols] = useState(3);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // ============================================================
  // Responsive columns
  // ============================================================
  const getDefaultCols = useCallback((bp) => {
    if (bp === 'xs' || bp === 'sm') return 1;
    if (bp === 'md') return 2;
    if (bp === 'lg' || bp === 'xl' || bp === '2xl') return 3;
    return 3;
  }, []);

  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // ============================================================
  // Filter options
  // ============================================================
  const statusOptions = [
    {
      value: '',
      label: 'All Statuses',
      icon: 'bi-funnel',
    },
    ...Object.entries(ITEM_STATUS_DISPLAY).map(([value, display]) => ({
      value,
      label: display.label,
      icon: display.icon,
      color: display.color,
    })),
  ];

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
    {
      value: 'most_views',
      label: 'Most Views',
      icon: 'bi-eye',
    },
    {
      value: 'most_applications',
      label: 'Most Applications',
      icon: 'bi-people',
    },
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [filterStatus, sortBy]);

  // ============================================================
  // Fetch items
  // ============================================================
  const fetchItems = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          donor:profiles!donor_id (
            id,
            full_name,
            email,
            location
          ),
          applications:applications (
            id,
            status,
            applicant_id,
            created_at
          )
        `)
        .eq('donor_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      const processed = (data || []).map((item) => ({
        ...item,
        applicationCount: item.applications?.length || 0,
        viewCount: item.views_count || 0,
        pendingApplications: item.applications?.filter(
          (app) => app.status === 'pending'
        ).length || 0,
        acceptedApplications: item.applications?.filter(
          (app) => app.status === 'accepted'
        ).length || 0,
        rejectedApplications: item.applications?.filter(
          (app) => app.status === 'rejected'
        ).length || 0,
        // Check if this item came from POP
        isFromPop: item.source_type === 'pop_purchase' && item.source_purchase_id,
      }));

      setAllItems(processed);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load your items');
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ============================================================
  // Filtering + sorting
  // ============================================================
  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (filterStatus) {
      result = result.filter(
        (item) => item.status === filterStatus
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'most_views':
        result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'most_applications':
        result.sort((a, b) => (b.applicationCount || 0) - (a.applicationCount || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return result;
  }, [allItems, filterStatus, searchTerm, sortBy]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  // ============================================================
  // Stats
  // ============================================================
  const stats = useMemo(
    () => ({
      total: filteredItems.length,
      active: filteredItems.filter((item) => item.status === 'active').length,
      pending: filteredItems.filter((item) => item.status === 'pending').length,
      completed: filteredItems.filter((item) => item.status === 'completed').length,
      totalViews: filteredItems.reduce((sum, item) => sum + (item.views_count || 0), 0),
      totalApplications: filteredItems.reduce(
        (sum, item) => sum + (item.applicationCount || 0),
        0
      ),
      fromPop: filteredItems.filter((item) => item.isFromPop).length,
    }),
    [filteredItems]
  );

  // ============================================================
  // Status
  // ============================================================
  const handleStatusChange = async (itemId, newStatus) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Status updated to ${getStatusDisplay(newStatus).label}`);

      setAllItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );

      setShowStatusModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update item status');
    }
  };

  // ============================================================
  // Delete
  // ============================================================
  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Item deleted successfully');

      setAllItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleViewApplications = (itemId) => {
    navigate(`/applications-to-my-item?itemId=${itemId}`);
  };

  // ============================================================
  // Date
  // ============================================================
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ============================================================
  // Status Badge
  // ============================================================
  const getStatusBadge = (status) => {
    const display = getStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      blue: 'bg-sky-50 text-sky-700 border-sky-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };

    return {
      classes: colorMap[display?.color] || colorMap.gray,
      label: display?.label || status,
      icon: display?.icon || 'bi-circle',
    };
  };

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return <MyListedItemsSkeleton />;
  }

  // ============================================================
  // PAGE
  // ============================================================
  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      <PageNavigation />

      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                Your listings dashboard
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              My Items
            </h1>

            <p className="mt-1 text-sm text-ink-500">
              Manage your active donations, monitor insights, and review applicant activity.
            </p>
          </div>

          <Link
            to="/create"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
              <i className="bi bi-plus-lg text-[11px]" />
            </span>
            New Item
            <i className="bi bi-arrow-up-right text-[10px] opacity-70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Listed"
            value={stats.total}
            icon="bi-box-seam"
            color="text-primary-600"
            bg="bg-primary-50"
          />

          <StatCard
            label="Active Items"
            value={stats.active}
            icon="bi-check-circle"
            color="text-emerald-600"
            bg="bg-emerald-50"
          />

          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon="bi-clock"
            color="text-amber-600"
            bg="bg-amber-50"
          />

          <StatCard
            label="Total Engagement"
            value={stats.totalApplications}
            subtext={`${stats.totalViews} total views`}
            icon="bi-people"
            color="text-sky-600"
            bg="bg-sky-50"
          />

          <StatCard
            label="From POP"
            value={stats.fromPop}
            icon="bi-box"
            color="text-purple-600"
            bg="bg-purple-50"
          />
        </div>

        {/* FILTER TOOLBAR - Added relative and z-30 to prevent dropdown clipping */}
        <div className="relative z-30 overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="flex items-center gap-3 text-left transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                <i className="bi bi-funnel text-sm" />
              </div>

              <div>
                <p className="text-sm font-extrabold text-ink-800">
                  Filter & Sort Listings
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'All items visible'}
                  {searchTerm && ' · Search query active'}
                </p>
              </div>
            </button>

            <div className="flex items-center justify-between gap-3 border-t border-ink-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}

              <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCols(true);
                    setGridCols(Math.max(1, gridCols - 1));
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
                    setGridCols(Math.min(4, gridCols + 1));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700"
                  title="More columns"
                >
                  <i className="bi bi-plus-lg text-xs" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
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
                className="overflow-visible border-t border-ink-100"
              >
                {/* overflow-visible allows select dropdown menus to pop out cleanly */}
                <div className="space-y-4 bg-ink-50/20 px-5 py-4 overflow-visible">
                  <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search item title, category or description..."
                      className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row relative z-40">
                    <Select
                      options={statusOptions}
                      value={filterStatus}
                      onChange={(value) => setFilterStatus(value)}
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
                        onClick={() => {
                          setSearchTerm('');
                          setFilterStatus('');
                          setSortBy('newest');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <i className="bi bi-x-circle" />
                        Reset Filters & Search
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* EMPTY STATE */}
        {filteredItems.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-box-seam text-2xl" />
              </div>

              <h3 className="text-lg font-extrabold text-ink-800">
                No items found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                {searchTerm || filterStatus
                  ? 'No listings match your current filters or search terms. Try clearing them.'
                  : "You haven't listed any items yet. Start sharing items with your community!"}
              </p>

              {!searchTerm && !filterStatus ? (
                <Link
                  to="/create"
                  className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <i className="bi bi-plus-lg text-xs" />
                  List Your First Item
                  <i className="bi bi-arrow-up-right text-[10px] opacity-70" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('');
                  }}
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
              {paginatedItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const category = getCategoryByValue(item.category);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md relative z-10"
                  >
                    <div>
                      {/* IMAGE */}
                      <div className="relative h-48 w-full overflow-hidden bg-ink-50">
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <i className="bi bi-image text-3xl text-ink-300" />
                          </div>
                        )}

                        <div className="absolute left-3 top-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md bg-white/90 ${badge.classes}`}
                          >
                            <i className={`bi ${badge.icon} text-[10px]`} />
                            {badge.label}
                          </span>
                        </div>

                        {/* POP SOURCE BADGE */}
                        {item.isFromPop && (
                <div className="absolute bottom-4 left-4 z-10">
                  <a
                    href={ user? `/app/pop/purchases/${item.source_purchase_id}` : "/app/pop" }
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-ink-600 shadow-lg border border-ink-100/80 hover:bg-white hover:text-primary-600 hover:border-primary-200 transition-colors"
                    title="Donated from POP purchase"
                  >
                    <img
                      src={logo}
                      alt="POP"
                      className="logo h-3.5 w-3.5 rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span>Donated via POP</span>
                    < CircleArrowOutUpRight className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              )}

                        {item.pendingApplications > 0 && (
                          <div className="absolute right-3 top-3">
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 shadow-sm backdrop-blur-md">
                              <i className="bi bi-clock text-[10px]" />
                              {item.pendingApplications} pending
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CARD CONTENT */}
                      <div className="space-y-2 p-4">
                        <div className="flex items-center gap-1.5">
                          {category && renderIcon(category.icon, 'h-3 w-3', category.color)}
                          <span className="text-xs font-medium text-ink-400">{item.category}</span>
                        </div>

                        <Link
                          to={`/item/${item.id}`}
                          className="block line-clamp-1 text-base font-extrabold text-ink-800 hover:text-primary-600"
                        >
                          {item.title}
                        </Link>

                        <p className="line-clamp-2 text-xs text-ink-500">
                          {item.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1" title="Views">
                            <i className="bi bi-eye text-ink-400" />
                            {item.viewCount || 0}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleViewApplications(item.id)}
                            className="flex items-center gap-1 font-bold text-primary-600 hover:underline"
                            title="Applications"
                          >
                            <i className="bi bi-people" />
                            {item.applicationCount || 0} requests
                          </button>
                        </div>

                        <span>{formatDate(item.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-1">
                        <Link
                          to={`/edit-item/${item.id}`}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white py-2 text-xs font-bold text-ink-700 shadow-sm hover:bg-ink-50"
                        >
                          <i className="bi bi-pencil" />
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowStatusModal(true);
                          }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-100 bg-primary-50 py-2 text-xs font-bold text-primary-700 hover:bg-primary-100"
                        >
                          <i className="bi bi-arrow-repeat" />
                          Status
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Delete Item"
                        >
                          <i className="bi bi-trash text-xs" />
                        </button>
                      </div>
                    </div>
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
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  –
                  <span className="font-bold text-ink-600">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold text-ink-600">{totalItems}</span> items
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

        {/* STATUS MODAL */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedItem(null);
          }}
          title="Update Item Status"
          size="sm"
        >
          {selectedItem && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-500">
                Change availability status for{' '}
                <span className="font-extrabold text-ink-800">
                  "{selectedItem.title}"
                </span>
              </p>

              <div className="space-y-2">
                {['active', 'pending', 'completed', 'cancelled'].map((status) => {
                  const display = getStatusDisplay(status);
                  const isSelected = selectedItem.status === status;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(selectedItem.id, status)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-transparent bg-ink-50/60 text-ink-700 hover:border-ink-100 hover:bg-white'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-white text-primary-600 shadow-sm' : 'bg-white text-ink-400'
                        }`}
                      >
                        <i className={`bi ${display.icon}`} />
                      </span>

                      <span className="font-bold">{display.label}</span>

                      {isSelected && <i className="bi bi-check-circle-fill ml-auto text-primary-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedItem(null);
          }}
          title="Confirm Deletion"
          size="sm"
        >
          {selectedItem && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                  <i className="bi bi-exclamation-triangle text-xl" />
                </div>

                <div>
                  <p className="text-sm leading-relaxed text-ink-600">
                    Are you sure you want to delete{' '}
                    <span className="font-extrabold text-ink-900">
                      "{selectedItem.title}"
                    </span>
                    ? This action cannot be undone.
                  </p>

                  {selectedItem.pendingApplications > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <i className="bi bi-exclamation-circle" />
                      {selectedItem.pendingApplications} pending application(s) will be affected.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteItem}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <i className="bi bi-trash text-xs" />
                  Delete Listing
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
// Stat Card
// ============================================================
function StatCard({
  label,
  value,
  subtext,
  icon,
  color = 'text-ink-700',
  bg = 'bg-ink-50',
}) {
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

      {subtext && <p className="mt-0.5 text-[10px] font-medium text-ink-400">{subtext}</p>}
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
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
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
        onClick={() => onPageChange(currentPage - 1)}
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
        <i className="bi bi-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default MyListedItemsPage;
