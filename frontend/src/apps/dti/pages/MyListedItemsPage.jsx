import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  PackageCheck,
  Eye,
  Users,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleArrowOutUpRight,
  Package,
  Gift,
  Inbox,
  Search,
} from 'lucide-react';

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

import FilterBar, {
  ColumnStepper,
  useResponsiveGrid,
} from '@/reusables/FilterBar';
import logo from '@/assets/popLogo1.png';

/* ============================================================
   STATUS ICON MAP
============================================================ */

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'active':
      return CheckCircle2;
    case 'pending':
      return Clock;
    case 'completed':
      return PackageCheck;
    case 'cancelled':
      return XCircle;
    default:
      return Circle;
  }
};

/* ============================================================
   SKELETON
============================================================ */

const MyListedItemsSkeleton = () => (
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
            <div className="h-8 w-40 animate-pulse rounded bg-ink-200" />
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
              className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="h-48 w-full animate-pulse bg-ink-100" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                  <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
                </div>
                <div className="flex gap-2 border-t border-ink-100 pt-3">
                  <div className="h-8 flex-1 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-8 flex-1 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-8 w-8 animate-pulse rounded-xl bg-ink-100" />
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

const MyListedItemsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { to } = makePaths(DTI_BASE);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { gridCols, setGridCols, gridStyle } = useResponsiveGrid({
    min: 1,
    max: 4,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  /* ============================================================
     FILTER OPTIONS
  ============================================================ */

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: Filter },
      ...Object.entries(ITEM_STATUS_DISPLAY).map(([value, display]) => ({
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
      { value: 'most_views', label: 'Most Views', icon: Eye },
      { value: 'most_applications', label: 'Most Applications', icon: Users },
    ],
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [filterStatus, sortBy]);

  const hasActiveFilters = Boolean(filterStatus) || Boolean(searchTerm);

  /* ============================================================
     FETCH ITEMS
  ============================================================ */

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
        pendingApplications:
          item.applications?.filter((app) => app.status === 'pending')
            .length || 0,
        acceptedApplications:
          item.applications?.filter((app) => app.status === 'accepted')
            .length || 0,
        rejectedApplications:
          item.applications?.filter((app) => app.status === 'rejected')
            .length || 0,
        isFromPop:
          item.source_type === 'pop_purchase' && item.source_purchase_id,
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

  /* ============================================================
     FILTERING + SORTING
  ============================================================ */

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (filterStatus) {
      result = result.filter((item) => item.status === filterStatus);
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
        result.sort(
          (a, b) => (b.applicationCount || 0) - (a.applicationCount || 0)
        );
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

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(
    () => ({
      total: filteredItems.length,
      active: filteredItems.filter((item) => item.status === 'active').length,
      pending: filteredItems.filter((item) => item.status === 'pending').length,
      completed: filteredItems.filter((item) => item.status === 'completed')
        .length,
      totalViews: filteredItems.reduce(
        (sum, item) => sum + (item.views_count || 0),
        0
      ),
      totalApplications: filteredItems.reduce(
        (sum, item) => sum + (item.applicationCount || 0),
        0
      ),
      fromPop: filteredItems.filter((item) => item.isFromPop).length,
    }),
    [filteredItems]
  );

  /* ============================================================
     STATUS CHANGE
  ============================================================ */

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

  /* ============================================================
     DELETE
  ============================================================ */

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
    navigate(to(`/my-listed-items/applications?itemId=${itemId}`));
  };

  /* ============================================================
     DATE
  ============================================================ */

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /* ============================================================
     STATUS BADGE
  ============================================================ */

  const getStatusBadge = (status) => {
    const display = getStatusDisplay(status);
    const colorMap = {
      green: 'border-success-200 bg-success-50 text-success-700',
      yellow: 'border-warning-200 bg-warning-50 text-warning-700',
      blue: 'border-primary-200 bg-primary-50 text-primary-700',
      red: 'border-danger-200 bg-danger-50 text-danger-700',
      gray: 'border-ink-200 bg-ink-50 text-ink-600',
    };

    return {
      classes: colorMap[display?.color] || colorMap.gray,
      label: display?.label || status,
      Icon: getStatusIconComponent(status),
    };
  };

  /* ============================================================
     CLEAR FILTERS
  ============================================================ */

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return <MyListedItemsSkeleton />;
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
                <Package size={14} />
                <span>Your listings dashboard</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                My Items
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Manage your active donations, monitor insights, and review
                applicant activity.
              </p>
            </div>

            <Link
              to={to("/create")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>New Item</span>
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Listed"
            value={stats.total}
            icon={Package}
            tone="primary"
          />

          <StatCard
            label="Active Items"
            value={stats.active}
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={Clock}
            tone="warning"
          />

          <StatCard
            label="Total Engagement"
            value={stats.totalApplications}
            subtext={`${stats.totalViews} total views`}
            icon={Users}
            tone="ink"
          />

          <StatCard
            label="From POP"
            value={stats.fromPop}
            icon={Gift}
            tone="primary"
          />
        </div>

        {/* FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search item title, category or description..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchItems}
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
              {filteredItems.length === 1
                ? '1 item'
                : `${filteredItems.length} items`}
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

        {/* EMPTY STATE */}
        {filteredItems.length === 0 ? (
          <EmptyState
            filtered={hasActiveFilters}
            onReset={clearAllFilters}
          />
        ) : (
          <>
            {/* GRID */}
            <motion.div
              className="grid gap-4"
              animate={gridStyle}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {paginatedItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const category = getCategoryByValue(item.category);
                const BadgeIcon = badge.Icon;

                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
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
                          <div className="flex h-full w-full items-center justify-center text-ink-300">
                            <ImageIcon size={30} />
                          </div>
                        )}

                        <div className="absolute left-3 top-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-md bg-white/90 ${badge.classes}`}
                          >
                            <BadgeIcon size={11} />
                            {badge.label}
                          </span>
                        </div>

                        {/* POP SOURCE BADGE */}
                        {item.isFromPop && (
                          <div className="absolute bottom-3 left-3 z-10">
                            <a
                              href={
                                user
                                  ? `/app/pop/purchases/${item.source_purchase_id}`
                                  : '/app/pop'
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-ink-600 shadow-sm backdrop-blur-sm transition-colors hover:border-primary-200 hover:bg-white hover:text-primary-600"
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
                              <CircleArrowOutUpRight
                                size={11}
                                className="opacity-60"
                              />
                            </a>
                          </div>
                        )}

                        {item.pendingApplications > 0 && (
                          <div className="absolute right-3 top-3">
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2 py-1 text-[10px] font-extrabold text-warning-700 backdrop-blur-md">
                              <Clock size={10} />
                              {item.pendingApplications} pending
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CARD CONTENT */}
                      <div className="space-y-2 p-4">
                        <div className="flex items-center gap-1.5">
                          {category &&
                            renderIcon(
                              category.icon,
                              'h-3 w-3',
                              category.color
                            )}
                          <span className="text-[11px] font-bold text-ink-400">
                            {item.category}
                          </span>
                        </div>

                        <Link
                          to={to(`/item/${item.id}`)}
                          className="block line-clamp-1 text-sm font-black text-ink-950 transition group-hover:text-primary-600"
                        >
                          {item.title}
                        </Link>

                        <p className="line-clamp-2 text-xs font-medium leading-5 text-ink-500">
                          {item.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-ink-500">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex items-center gap-1"
                            title="Views"
                          >
                            <Eye size={12} className="text-ink-400" />
                            {item.viewCount || 0}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleViewApplications(item.id)}
                            className="flex items-center gap-1 font-extrabold text-primary-600 hover:text-primary-700"
                            title="Applications"
                          >
                            <Users size={12} />
                            {item.applicationCount || 0} requests
                          </button>
                        </div>

                        <span className="font-bold text-ink-400">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
                        
																								<Link
  to={to(`/edit-item/${item.id}`)}
  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white py-2 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
>
  <Pencil size={12} />
  Edit
</Link>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowStatusModal(true);
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-100 bg-primary-50 py-2 text-xs font-extrabold text-primary-700 transition hover:bg-primary-100"
                        >
                          <RefreshCw size={12} />
                          Status
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-danger-100 bg-danger-50 text-danger-600 transition hover:bg-danger-100"
                          title="Delete Item"
                          aria-label="Delete item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
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
                  items
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
            <p className="text-sm font-medium leading-relaxed text-ink-500">
              Change availability status for{' '}
              <span className="font-extrabold text-ink-800">
                "{selectedItem.title}"
              </span>
            </p>

            <div className="space-y-2">
              {['active', 'pending', 'completed', 'cancelled'].map((status) => {
                const display = getStatusDisplay(status);
                const isSelected = selectedItem.status === status;
                const StatusIcon = getStatusIconComponent(status);

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(selectedItem.id, status)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-ink-100 bg-ink-50/60 text-ink-700 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-white text-primary-600 shadow-sm'
                          : 'bg-white text-ink-400'
                      }`}
                    >
                      <StatusIcon size={15} />
                    </span>

                    <span className="text-sm font-extrabold">
                      {display.label}
                    </span>

                    {isSelected && (
                      <CheckCircle2
                        size={15}
                        className="ml-auto text-primary-600"
                      />
                    )}
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
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this listing?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete{' '}
                  <strong>"{selectedItem.title}"</strong>? This action cannot be
                  undone.
                </p>

                {selectedItem.pendingApplications > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-warning-700">
                    <AlertCircle size={12} />
                    {selectedItem.pendingApplications} pending application(s)
                    will be affected.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Keep Item
              </button>

              <button
                type="button"
                onClick={handleDeleteItem}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700"
              >
                <Trash2 size={15} />
                Delete Listing
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

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

      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ filtered, onReset }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          {filtered ? <Search size={27} /> : <Inbox size={27} />}
        </div>

        <h2 className="mt-5 text-lg font-black text-ink-950">
          {filtered ? 'No matching items' : 'No items listed yet'}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {filtered
            ? 'Try adjusting your search or filters to find the item you are looking for.'
            : "You haven't listed any items yet. Start sharing items with your community!"}
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
              to={to("/create")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
            >
              <Plus size={16} />
              List your first item
            </Link>
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

export default MyListedItemsPage;