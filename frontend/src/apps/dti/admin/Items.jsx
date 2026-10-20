// src/admin/AdminItems.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  Clock,
  Trophy,
  Flag,
  XCircle,
  Circle,
  Star,
  Slash,
  LayoutGrid,
  Eye,
  ShieldCheck,
  Trash2,
  Image as ImageIcon,
  CircleArrowOutUpRight,
  AlertTriangle,
  MinusCircle,
  ArrowDown,
  ArrowUp,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Inbox,
  X,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUS_DISPLAY,
  ITEM_MODERATION_ACTIONS,
  MODERATION_COLOR_CLASSES,
  getCategoryByValue,
  getConditionByValue,
  getStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

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
  status: '',
  category: '',
  condition: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  tab: 'all',
};

const FILTER_KEYS = [
  'search',
  'status',
  'category',
  'condition',
  'sortBy',
  'sortOrder',
  'tab',
];

// "Clear filters" keeps the user on their current tab
const FILTER_RESET = {
  search: '',
  status: '',
  category: '',
  condition: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
};

/* ============================================================
   HELPERS
============================================================ */

const getFeaturedData = (item) => ({
  is_featured: item?.featured?.is_featured === true,
  can_apply: item?.featured?.can_apply === true,
  featured_at: item?.featured?.featured_at || null,
});

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

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'active':
      return CheckCircle2;
    case 'pending':
      return Clock;
    case 'completed':
      return Trophy;
    case 'cancelled':
      return XCircle;
    default:
      return Circle;
  }
};

const getStatusBadge = (itemStatus, appsCount) => {
  if (!appsCount && itemStatus === 'active') {
    return {
      label: 'No Apps',
      Icon: MinusCircle,
      classes: 'border-warning-200 bg-warning-50 text-warning-700',
    };
  }

  const display = getStatusDisplay(itemStatus);

  const colorMap = {
    green: 'border-success-200 bg-success-50 text-success-700',
    yellow: 'border-warning-200 bg-warning-50 text-warning-700',
    blue: 'border-primary-200 bg-primary-50 text-primary-700',
    red: 'border-danger-200 bg-danger-50 text-danger-700',
    gray: 'border-ink-200 bg-ink-50 text-ink-600',
  };

  return {
    label: display?.label || itemStatus,
    Icon: getStatusIconComponent(itemStatus),
    classes: colorMap[display?.color] || colorMap.gray,
  };
};

/* ============================================================
   SKELETON / STAT CARD / EMPTY — unchanged
============================================================ */

const ItemsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="space-y-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-48 animate-pulse rounded-xl bg-ink-200" />
        </div>

        <div className="h-12 w-full animate-pulse rounded-lg bg-ink-100" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-16 animate-pulse rounded-full bg-ink-100" />
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
          <div className="h-11 animate-pulse bg-ink-50" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-t border-ink-100 px-5 py-3.5"
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-ink-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink-100" />
                <div className="h-2.5 w-1/4 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="hidden h-3 w-20 animate-pulse rounded bg-ink-100 sm:block" />
              <div className="hidden h-5 w-16 animate-pulse rounded-full bg-ink-100 md:block" />
              <div className="h-3 w-14 animate-pulse rounded bg-ink-100" />
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
    </div>
  </div>
);

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
    </div>
  );
}

function EmptyState({ filtered, onReset, icon: Icon = Inbox, title, description }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          <Icon size={27} />
        </div>
        <h2 className="mt-5 text-lg font-black text-ink-950">
          {filtered ? 'No matching items' : title}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {filtered
            ? 'Try adjusting your search or filters to find the item you are looking for.'
            : description}
        </p>
        {filtered && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <RefreshCw size={15} />
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AdminItems = () => {
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
    namespace: 'admin.items',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    search,
    status: statusFilter,
    category: categoryFilter,
    condition: conditionFilter,
    sortBy,
    sortOrder,
    page: currentPage,
    tab: activeTab,
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [featuredItems, setFeaturedItems] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  /* ---------- modals ---------- */
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModerateModal, setShowModerateModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [moderateAction, setModerateAction] = useState('');
  const [moderateReason, setModerateReason] = useState('');
  const [featureCanApply, setFeatureCanApply] = useState(false);

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    flagged: 0,
  });

  /* ---------- derived filter counts ---------- */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (categoryFilter) count++;
    if (conditionFilter) count++;
    if (sortBy !== 'created_at') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [statusFilter, categoryFilter, conditionFilter, sortBy, sortOrder]);

  const hasActiveFilters =
    Boolean(statusFilter) ||
    Boolean(categoryFilter) ||
    Boolean(conditionFilter) ||
    Boolean(search) ||
    sortBy !== 'created_at' ||
    sortOrder !== 'desc';

  /* ---------- select options ---------- */
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: 'bi-funnel' },
      ...Object.entries(ITEM_STATUS_DISPLAY).map(([value, display]) => ({
        value,
        label: display.label,
        icon: display.icon,
        color: display.color,
      })),
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories', icon: 'bi-grid' },
      ...ITEM_CATEGORIES.map((category) => ({
        value: category.value,
        label: category.label,
        icon: category.icon,
        color: category.color,
      })),
    ],
    []
  );

  const conditionOptions = useMemo(
    () => [
      { value: '', label: 'All Conditions', icon: 'bi-funnel' },
      ...ITEM_CONDITIONS.map((condition) => ({
        value: condition.value,
        label: condition.label,
        icon: condition.icon,
        color: condition.color,
      })),
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'created_at', label: 'Newest First', icon: 'bi-sort-down' },
      { value: 'title', label: 'Title A-Z', icon: 'bi-sort-alpha-down' },
      { value: 'views_count', label: 'Most Views', icon: 'bi-eye' },
      {
        value: 'applications_count',
        label: 'Most Applications',
        icon: 'bi-people',
      },
    ],
    []
  );

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(conditionFilter && { condition: conditionFilter }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getItems(params);
      const data = response.data || {};
      const fetchedItems = data.items || [];
      const fetchedTotal = Number(data.total) || 0;

      setItems(fetchedItems);
      setTotal(fetchedTotal);
      setTotalPages(Math.ceil(fetchedTotal / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    statusFilter,
    categoryFilter,
    conditionFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchFeaturedItems = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const response = await adminAPI.getItems({
        limit: 100,
        offset: 0,
        featured: true,
      });
      const data = response.data || {};
      setFeaturedItems(data.items || []);
    } catch (error) {
      console.error('Error fetching featured items:', error);
      toast.error('Failed to load featured items');
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const response = await adminAPI.getAnalyticsOverview();
      const stats = response.data?.data?.items || {};

      setGlobalStats({
        total: stats.total ?? total,
        active: stats.active ?? 0,
        pending: stats.pending ?? 0,
        completed: stats.completed ?? 0,
        flagged: stats.flagged ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch global stats:', error);
      setGlobalStats({
        total,
        active: items.filter((i) => i.status === 'active').length,
        pending: items.filter((i) => i.status === 'pending').length,
        completed: items.filter((i) => i.status === 'completed').length,
        flagged: items.filter((i) => i.is_flagged === true).length,
      });
    }
  }, [total, items]);

  useEffect(() => {
    if (activeTab === 'all') fetchItems();
  }, [fetchItems, activeTab]);

  useEffect(() => {
    fetchFeaturedItems();
  }, [fetchFeaturedItems]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const clearAllFilters = () => setFilters({ ...FILTER_RESET });

  const refreshAfterMutation = async () => {
    await Promise.all([fetchItems(), fetchGlobalStats(), fetchFeaturedItems()]);
  };

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const openModerateModal = (item) => {
    setSelectedItem(item);
    setModerateAction('');
    setModerateReason('');
    setShowModerateModal(true);
  };

  const openFeatureModal = (item) => {
    const featured = getFeaturedData(item);
    setSelectedItem(item);
    setFeatureCanApply(featured.can_apply);
    setShowFeatureModal(true);
    setShowModerateModal(false);
  };

  const closeModerationState = () => {
    setShowModerateModal(false);
    setSelectedItem(null);
    setModerateAction('');
    setModerateReason('');
  };

  const closeFeatureState = () => {
    setShowFeatureModal(false);
    setSelectedItem(null);
    setModerateAction('');
    setModerateReason('');
    setFeatureCanApply(false);
  };

  const handleModerateItem = async () => {
    if (!selectedItem || !moderateAction) return;
    if (moderateAction === 'feature') {
      openFeatureModal(selectedItem);
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.moderateItem(selectedItem.id, {
        action: moderateAction,
        reason: moderateReason || undefined,
      });

      const actionLabels = {
        approve: 'approved',
        reject: 'rejected',
        cancel: 'cancelled',
        complete: 'completed',
        unfeature: 'unfeatured',
        flag: 'flagged',
        unflag: 'unflagged',
        allow_apply: 'opened for applications',
        disable_apply: 'closed for applications',
      };

      toast.success(
        `Item ${actionLabels[moderateAction] || 'updated'} successfully`
      );

      closeModerationState();
      await refreshAfterMutation();
    } catch (error) {
      console.error('Moderation error:', error);
      toast.error(error.response?.data?.error || 'Failed to moderate item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeatureItem = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await adminAPI.moderateItem(selectedItem.id, {
        action: 'feature',
        can_apply: featureCanApply,
      });
      toast.success(
        featureCanApply
          ? 'Item featured — applications are open'
          : 'Item featured — applications are disabled'
      );
      closeFeatureState();
      await refreshAfterMutation();
    } catch (error) {
      console.error('Feature error:', error);
      toast.error(error.response?.data?.error || 'Failed to feature item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteItem(selectedItem.id);
      toast.success('Item deleted successfully');
      setShowDeleteModal(false);
      setSelectedItem(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete item');
    } finally {
      setActionLoading(false);
    }
  };

  /* ============================================================
     ACTIVE FILTER CHIPS
  ============================================================ */

  const activeFilterChips = [
    statusFilter && {
      key: 'status',
      label: getStatusDisplay(statusFilter).label || statusFilter,
      onRemove: () => setFilters({ status: '' }),
    },
    categoryFilter && {
      key: 'category',
      label: getCategoryByValue(categoryFilter)?.label || categoryFilter,
      onRemove: () => setFilters({ category: '' }),
    },
    conditionFilter && {
      key: 'condition',
      label: getConditionByValue(conditionFilter)?.label || conditionFilter,
      onRemove: () => setFilters({ condition: '' }),
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
     MENU ITEMS
  ============================================================ */

  const buildMenuItems = (item) => [
    {
      key: 'view',
      icon: Eye,
      label: 'View Details',
      onClick: () => openItemDetails(item),
    },
    {
      key: 'moderate',
      icon: ShieldCheck,
      label: 'Moderate',
      onClick: () => openModerateModal(item),
    },
    {
      key: 'view-site',
      icon: CircleArrowOutUpRight,
      label: 'View on Site',
      onClick: () => {
        window.open(`/item/${item.id}`, '_blank', 'noopener,noreferrer');
      },
    },
    { key: 'divider-delete', divider: true },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Delete',
      danger: true,
      onClick: () => {
        setSelectedItem(item);
        setShowDeleteModal(true);
      },
    },
  ];

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading && items.length === 0 && activeTab === 'all') {
    return <ItemsSkeleton />;
  }

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
                <Package size={14} />
                <span>Item management</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Item Management
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>{total.toLocaleString()} items</span>
                <span className="text-ink-300">·</span>
                <span>Manage and moderate listings</span>
              </p>
            </div>
          </div>
        </header>

        {/* TABS */}
        <div className="mb-7 flex w-full items-center justify-between gap-3 border-b border-ink-100 pb-2">
          <button
            type="button"
            onClick={() => setFilters({ tab: 'all' })}
            className={`group relative flex items-center gap-2.5 pb-2 text-xs font-extrabold transition-colors ${
              activeTab === 'all'
                ? 'text-ink-950'
                : 'text-ink-400 hover:text-ink-700'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary-50 text-primary-600'
                  : 'bg-ink-100/60 text-ink-400 group-hover:bg-ink-100'
              }`}
            >
              <LayoutGrid size={14} />
            </span>
            <span>All Items</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-ink-100 text-ink-500'
              }`}
            >
              {total.toLocaleString()}
            </span>
            {activeTab === 'all' && (
              <motion.span
                layoutId="activeUnderlineTab"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-primary-600"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilters({ tab: 'featured' })}
            className={`group relative flex items-center gap-2.5 pb-2 text-xs font-extrabold transition-colors ${
              activeTab === 'featured'
                ? 'text-ink-950'
                : 'text-ink-400 hover:text-ink-700'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                activeTab === 'featured'
                  ? 'bg-warning-50 text-warning-600'
                  : 'bg-ink-100/60 text-ink-400 group-hover:bg-warning-50/60'
              }`}
            >
              <Star
                size={14}
                fill={activeTab === 'featured' ? 'currentColor' : 'none'}
              />
            </span>
            <span>Featured</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                activeTab === 'featured'
                  ? 'bg-warning-100 text-warning-800'
                  : 'bg-warning-50 text-warning-700'
              }`}
            >
              {featuredLoading ? '···' : featuredItems.length}
            </span>
            {activeTab === 'featured' && (
              <motion.span
                layoutId="activeUnderlineTab"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-warning-500"
              />
            )}
          </button>
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          {activeTab === 'featured' ? (
            <motion.div
              key="featured"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <FeaturedItemsSection
                items={featuredItems}
                loading={featuredLoading}
                onView={openItemDetails}
                onModerate={openModerateModal}
                formatDate={formatDate}
                gridCols={gridCols}
                setGridCols={setGridCols}
                gridStyle={gridStyle}
              />
            </motion.div>
          ) : (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-7"
            >
              {/* STATS */}
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Total" value={globalStats.total} icon={Package} tone="ink" />
                <StatCard label="Active" value={globalStats.active} icon={CheckCircle2} tone="success" />
                <StatCard label="Pending" value={globalStats.pending} icon={Clock} tone="warning" />
                <StatCard label="Completed" value={globalStats.completed} icon={Trophy} tone="primary" />
                <StatCard label="Flagged" value={globalStats.flagged} icon={Flag} tone="danger" />
                <StatCard label="Featured" value={featuredItems.length} icon={Star} tone="warning" />
              </section>

              {/* FILTER BAR */}
              <FilterBar
                searchValue={search}
                onSearchChange={(v) => setFilters({ search: v })}
                searchPlaceholder="Search by title, description, or category..."
                filtersOpen={filtersExpanded}
                onToggleFilters={() => setFiltersExpanded((v) => !v)}
                activeFilterCount={activeFilterCount}
                onRefresh={fetchItems}
                refreshing={loading}
                activeFilters={activeFilterChips}
                onClearAll={clearAllFilters}
																rightSlot={<ViewToggle value={viewMode} onChange={setViewMode} />}
              >
                <div
                  className={`grid gap-4 ${
                    viewMode === 'cards'
                      ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                      : 'md:grid-cols-2 lg:grid-cols-4'
                  }`}
                >
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(v) => setFilters({ status: v })}
                    placeholder="All Statuses"
                    showIcon
                  />

                  <Select
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={(v) => setFilters({ category: v })}
                    placeholder="All Categories"
                    showIcon
                    searchable
                  />

                  <Select
                    options={conditionOptions}
                    value={conditionFilter}
                    onChange={(v) => setFilters({ condition: v })}
                    placeholder="All Conditions"
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
                  {items.length === total
                    ? total === 1
                      ? '1 item'
                      : `${total.toLocaleString()} items`
                    : `Showing ${items.length} of ${total.toLocaleString()} items`}
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

              {/* LIST / GRID */}
              {items.length === 0 ? (
                <EmptyState
                  filtered={hasActiveFilters}
                  onReset={clearAllFilters}
                  icon={Package}
                  title="No items yet"
                  description="No items have been listed yet."
                />
              ) : viewMode === 'table' ? (
                <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60">
                          <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Item
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Category
                          </th>
                          <th className="hidden px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 md:table-cell">
                            Condition
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Status
                          </th>
                          <th className="hidden px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 sm:table-cell">
                            Views
                          </th>
                          <th className="hidden px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 sm:table-cell">
                            Apps
                          </th>
                          <th className="hidden whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400 lg:table-cell">
                            Listed
                          </th>
                          <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-ink-100">
                        {items.map((item) => {
                          const badge = getStatusBadge(
                            item.status,
                            item.applications_count
                          );
                          const category = getCategoryByValue(item.category);
                          const condition = getConditionByValue(item.condition);
                          const featured = getFeaturedData(item);
                          const BadgeIcon = badge.Icon;

                          return (
                            <tr
                              key={item.id}
                              className="transition hover:bg-ink-50/60"
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                                    {item.images?.[0] ? (
                                      <img
                                        src={item.images[0]}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-ink-300">
                                        <ImageIcon size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => openItemDetails(item)}
                                      className="block max-w-xs truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                                    >
                                      {item.title}
                                    </button>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-400">
                                      <span>{item.donor?.full_name || 'User'}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                      {item.is_flagged && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full border border-danger-200 bg-danger-50 px-1.5 py-0.5 text-[9px] font-extrabold text-danger-700">
                                          <Flag size={9} fill="currentColor" />
                                          Flagged
                                        </span>
                                      )}
                                      {featured.is_featured && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full border border-warning-200 bg-warning-50 px-1.5 py-0.5 text-[9px] font-extrabold text-warning-700">
                                          <Star size={9} fill="currentColor" />
                                          Featured
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  {category &&
                                    renderIcon(
                                      category.icon,
                                      'h-3.5 w-3.5',
                                      category.color
                                    )}
                                  <span className="text-xs font-bold text-ink-600">
                                    {category?.label || item.category}
                                  </span>
                                </div>
                              </td>

                              <td className="hidden whitespace-nowrap px-5 py-3.5 text-center md:table-cell">
                                {condition && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-1 text-[10px] font-extrabold text-ink-600"
                                    title={condition.label}
                                  >
                                    {renderIcon(
                                      condition.icon,
                                      'h-3 w-3',
                                      condition.color
                                    )}
                                    <span>{condition.label}</span>
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.classes}`}
                                >
                                  <BadgeIcon size={10} />
                                  {badge.label}
                                </span>
                              </td>

                              <td className="hidden px-5 py-3.5 text-center text-xs font-bold text-ink-600 sm:table-cell">
                                {item.views_count?.toLocaleString() || 0}
                              </td>

                              <td className="hidden px-5 py-3.5 text-center sm:table-cell">
                                <span
                                  className={`text-xs font-extrabold ${
                                    !item.applications_count
                                      ? 'text-warning-600'
                                      : 'text-ink-800'
                                  }`}
                                >
                                  {item.applications_count?.toLocaleString() || 0}
                                </span>
                              </td>

                              <td className="hidden whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500 lg:table-cell">
                                {formatDate(item.created_at)}
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openItemDetails(item)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                                    title="View Details"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openModerateModal(item)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                                    title="Moderate"
                                  >
                                    <ShieldCheck size={15} />
                                  </button>
                                  <Link
                                    to={`/item/${item.id}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                                    title="View on Site"
                                  >
                                    <CircleArrowOutUpRight size={15} />
                                  </Link>
                                  <ActionMenu
                                    items={buildMenuItems(item)}
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
                <motion.div
                  className="grid gap-4"
                  animate={gridStyle}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {items.map((item) => {
                    const badge = getStatusBadge(
                      item.status,
                      item.applications_count
                    );
                    const category = getCategoryByValue(item.category);
                    const featured = getFeaturedData(item);
                    const BadgeIcon = badge.Icon;
                    const imageUrl = item.images?.[0] || null;

                    return (
                      <motion.article
                        key={item.id}
                        layout
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                      >
                        <div className="relative h-48 w-full overflow-hidden bg-ink-50">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
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
                              <BadgeIcon size={10} />
                              {badge.label}
                            </span>
                          </div>
                          <div className="absolute right-3 top-3 flex gap-1">
                            {item.is_flagged && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-danger-200 bg-danger-50/95 px-1.5 py-0.5 text-[9px] font-extrabold text-danger-700 backdrop-blur-sm">
                                <Flag size={9} fill="currentColor" />
                                Flagged
                              </span>
                            )}
                            {featured.is_featured && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-warning-200 bg-warning-50/95 px-1.5 py-0.5 text-[9px] font-extrabold text-warning-700 backdrop-blur-sm">
                                <Star size={9} fill="currentColor" />
                                Featured
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col space-y-2 p-4">
                          <button
                            type="button"
                            onClick={() => openItemDetails(item)}
                            className="line-clamp-1 text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                          >
                            {item.title}
                          </button>
                          <div className="flex items-center gap-1.5">
                            {category &&
                              renderIcon(
                                category.icon,
                                'h-3 w-3',
                                category.color
                              )}
                            <span className="text-[11px] font-bold text-ink-400">
                              {category?.label || item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
                            <span className="truncate">
                              {item.donor?.full_name || 'User'}
                            </span>
                            <span className="text-ink-300">·</span>
                            <span className="text-ink-400">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          {featured.is_featured && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-extrabold ${
                                  featured.can_apply
                                    ? 'border-success-200 bg-success-50 text-success-700'
                                    : 'border-ink-200 bg-ink-50 text-ink-600'
                                }`}
                              >
                                {featured.can_apply ? (
                                  <CheckCircle2 size={10} />
                                ) : (
                                  <Slash size={10} />
                                )}
                                {featured.can_apply
                                  ? 'Applications Open'
                                  : 'Applications Closed'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
                          <div className="flex items-center gap-3 text-[11px] font-bold text-ink-500">
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {item.views_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {item.applications_count || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openItemDetails(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModerateModal(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Moderate"
                            >
                              <ShieldCheck size={15} />
                            </button>
                            <Link
                              to={`/item/${item.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View on Site"
                            >
                              <CircleArrowOutUpRight size={15} />
                            </Link>
                            <ActionMenu
                              items={buildMenuItems(item)}
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
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                    items
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setFilters({ page })}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          ITEM DETAILS MODAL
      ============================================================ */}

      <Modal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setSelectedItem(null);
        }}
        showCloseButton={false}
        size="lg"
      >
        {selectedItem && (
          <ItemDetailsContent
            item={selectedItem}
            onClose={() => {
              setShowItemModal(false);
              setSelectedItem(null);
            }}
            onModerate={() => {
              setShowItemModal(false);
              setModerateAction('');
              setModerateReason('');
              setShowModerateModal(true);
            }}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
            getStatusBadge={getStatusBadge}
          />
        )}
      </Modal>

      {/* ============================================================
          MODERATION MODAL
      ============================================================ */}

      <Modal
        isOpen={showModerateModal}
        onClose={() => {
          if (!actionLoading) closeModerationState();
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-ink-950">
                  Moderate Item
                </h2>
                <p className="mt-1 text-xs font-bold text-ink-400">
                  Choose an action for this listing.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={closeModerationState}
                className="shrink-0 text-ink-400 transition hover:text-primary-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
              <p className="text-xs font-medium text-ink-500">
                Moderating{' '}
                <span className="font-extrabold text-ink-950">
                  {selectedItem.title}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              {ITEM_MODERATION_ACTIONS.map(({ action, label, icon, color }) => {
                const isSelected = moderateAction === action;
                const colorClasses =
                  MODERATION_COLOR_CLASSES[color] ||
                  'border-primary-400 bg-primary-50 text-primary-700';

                return (
                  <button
                    type="button"
                    key={action}
                    onClick={() => setModerateAction(action)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                      isSelected
                        ? colorClasses
                        : 'border-transparent bg-ink-50 text-ink-700 hover:bg-ink-100'
                    }`}
                  >
                    {renderIcon(icon, 'h-4 w-4', '')}
                    <span className="text-sm font-extrabold">{label}</span>
                    {isSelected && (
                      <CheckCircle2
                        size={15}
                        className="ml-auto text-current opacity-70"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {(moderateAction === 'reject' ||
              moderateAction === 'flag' ||
              moderateAction === 'cancel') && (
              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                  Reason
                </label>
                <textarea
                  value={moderateReason}
                  onChange={(e) => setModerateReason(e.target.value)}
                  placeholder={`Enter reason for ${
                    moderateAction === 'reject'
                      ? 'rejecting'
                      : moderateAction === 'cancel'
                      ? 'cancelling'
                      : 'flagging'
                  }...`}
                  rows={3}
                  className="input-field resize-none text-sm font-medium"
                />
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={closeModerationState}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModerateItem}
                disabled={actionLoading || !moderateAction}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Applying...
                  </>
                ) : moderateAction === 'feature' ? (
                  <>
                    <Star size={15} fill="currentColor" />
                    Continue
                  </>
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          FEATURE CONFIGURATION MODAL
      ============================================================ */}

      <Modal
        isOpen={showFeatureModal}
        onClose={() => {
          if (!actionLoading) closeFeatureState();
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedItem && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-ink-950">
                  Feature Item
                </h2>
                <p className="mt-1 text-xs font-bold text-ink-400">
                  Configure this featured listing.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={closeFeatureState}
                className="shrink-0 text-ink-400 transition hover:text-primary-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-warning-100 bg-warning-50/60 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-warning-100 bg-white">
                {selectedItem.images?.[0] ? (
                  <img
                    src={selectedItem.images[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-warning-300">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink-950">
                  {selectedItem.title}
                </p>
                <p className="text-[11px] font-bold text-ink-500">
                  This item will appear in Featured Items.
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-extrabold text-ink-800">
                Allow applications?
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-ink-400">
                Choose whether users should be allowed to submit applications
                for this featured item.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeatureCanApply(true)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    featureCanApply
                      ? 'border-success-400 bg-success-50 text-success-700'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-success-200 hover:bg-success-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CheckCircle2 size={18} />
                    {featureCanApply && (
                      <CheckCircle2 size={14} className="text-success-600" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-extrabold">Yes</p>
                  <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                    Applications allowed
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFeatureCanApply(false)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    !featureCanApply
                      ? 'border-ink-400 bg-ink-50 text-ink-800'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:bg-ink-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Slash size={18} />
                    {!featureCanApply && (
                      <CheckCircle2 size={14} className="text-ink-600" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-extrabold">No</p>
                  <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                    Applications disabled
                  </p>
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowFeatureModal(false);
                  setShowModerateModal(true);
                  setModerateAction('feature');
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFeatureItem}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-warning-600 px-4 text-sm font-extrabold text-white transition hover:bg-warning-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Featuring...
                  </>
                ) : (
                  <>
                    <Star size={15} fill="currentColor" />
                    Feature Item
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          DELETE MODAL
      ============================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!actionLoading) {
            setShowDeleteModal(false);
            setSelectedItem(null);
          }
        }}
        title="Delete Item"
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
                  Delete this item?
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete{' '}
                  <strong>"{selectedItem.title}"</strong>? This action cannot
                  be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
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
                    Delete
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
   FEATURED ITEMS SECTION
============================================================ */

function FeaturedItemsSection({
  items,
  loading,
  onView,
  onModerate,
  formatDate,
  gridCols,
  setGridCols,
  gridStyle,
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
          >
            <div className="h-48 animate-pulse bg-ink-100" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
              <div className="h-12 animate-pulse rounded-xl bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        filtered={false}
        icon={Star}
        title="No featured items"
        description="Items marked as featured will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
            <Star size={15} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-base font-black text-ink-950">
              Featured Items
            </h2>
            <p className="text-[11px] font-bold text-ink-400">
              {items.length} featured item{items.length !== 1 ? 's' : ''}{' '}
              currently displayed
            </p>
          </div>
        </div>
        <ColumnStepper
          label="Grid columns"
          value={gridCols}
          onChange={setGridCols}
          min={1}
          max={4}
        />
      </div>

      <motion.div
        className="grid gap-4"
        animate={gridStyle}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const badge = getStatusBadge(
              item.status,
              item.applications_count
            );
            const canApply = item.featured?.can_apply === true;
            const featuredAt = item.featured?.featured_at;
            const category = getCategoryByValue(item.category);
            const BadgeIcon = badge.Icon;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex flex-col rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50"
                  >
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-300">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onView(item)}
                        className="truncate text-left text-sm font-black text-ink-950 hover:text-primary-600"
                      >
                        {item.title}
                      </button>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${badge.classes}`}
                      >
                        <BadgeIcon size={9} />
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                      {item.donor?.full_name || 'Anonymous'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[9px] font-extrabold text-ink-600">
                        {category?.label || item.category || 'General'}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold ${
                          canApply ? 'text-success-600' : 'text-ink-400'
                        }`}
                      >
                        {canApply
                          ? '• Applications Open'
                          : '• Applications Closed'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] font-bold text-ink-500">
                  <div className="flex items-center gap-4">
                    <span>
                      Views:{' '}
                      <strong className="font-extrabold text-ink-800">
                        {item.views_count?.toLocaleString() || 0}
                      </strong>
                    </span>
                    <span>
                      Apps:{' '}
                      <strong className="font-extrabold text-ink-800">
                        {item.applications_count?.toLocaleString() || 0}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-ink-400">
                    {formatDate(featuredAt)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onModerate(item)}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 text-xs font-extrabold text-white transition hover:bg-primary-700"
                >
                  <ShieldCheck size={14} />
                  Moderate Item
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ============================================================
   ITEM DETAILS CONTENT — unchanged
============================================================ */

function ItemDetailsContent({
  item,
  onClose,
  onModerate,
  formatDate,
  formatDateTime,
  getStatusBadge,
}) {
  const badge = getStatusBadge(item.status, item.applications_count);
  const category = getCategoryByValue(item.category);
  const condition = getConditionByValue(item.condition);
  const featured = getFeaturedData(item);
  const BadgeIcon = badge.Icon;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-ink-950">Item Details</h2>
          <p className="mt-1 text-xs font-bold text-ink-400">
            Full listing information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/item/${item.id}`}
            className="shrink-0 text-ink-400 transition hover:text-primary-600"
            title="View on site"
          >
            <CircleArrowOutUpRight size={15} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-ink-400 transition hover:text-primary-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="border-t border-ink-100" />

      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
          {item.images?.[0] ? (
            <img
              src={item.images[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-ink-950">
            {item.title}
          </h3>
          <p className="truncate text-xs font-bold text-ink-500">
            By {item.donor?.full_name || 'Anonymous'} ·{' '}
            {formatDate(item.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.classes}`}
            >
              <BadgeIcon size={10} />
              {badge.label}
            </span>
            <span className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10px] font-extrabold text-ink-600">
              {category?.label || item.category || 'Uncategorized'}
            </span>
            <span className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10px] font-extrabold text-ink-600">
              {condition?.label || item.condition || 'Unknown'}
            </span>
            {featured.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[10px] font-extrabold text-warning-700">
                <Star size={10} fill="currentColor" />
                Featured
              </span>
            )}
          </div>
        </div>
      </div>

      {featured.is_featured && (
        <div className="rounded-2xl border border-warning-200 bg-warning-50/60 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
              <Star size={14} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-warning-700">
                Featured Configuration
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-extrabold ${
                    featured.can_apply
                      ? 'border-success-200 bg-success-50 text-success-700'
                      : 'border-ink-200 bg-white text-ink-600'
                  }`}
                >
                  {featured.can_apply ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <Slash size={10} />
                  )}
                  {featured.can_apply ? 'Can Apply' : 'Cannot Apply'}
                </span>
                {featured.featured_at && (
                  <span className="text-[10px] font-bold text-warning-700">
                    Featured {formatDateTime(featured.featured_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Views
          </p>
          <p className="mt-0.5 text-lg font-black text-ink-950">
            {item.views_count?.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Applications
          </p>
          <p className="mt-0.5 text-lg font-black text-ink-950">
            {item.applications_count?.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Listed
          </p>
          <p className="mt-0.5 text-sm font-black text-ink-950">
            {formatDate(item.created_at)}
          </p>
        </div>
      </div>

      {item.description && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-ink-700">
            {item.description}
          </p>
        </div>
      )}

      {(item.weight_kg ||
        item.length_cm ||
        item.width_cm ||
        item.height_cm) && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Dimensions
          </p>
          <p className="mt-1 text-sm font-extrabold text-ink-700">
            {item.weight_kg && `${item.weight_kg}kg`}
            {item.length_cm && ` · ${item.length_cm}cm`}
            {item.width_cm && ` × ${item.width_cm}cm`}
            {item.height_cm && ` × ${item.height_cm}cm`}
          </p>
        </div>
      )}

      {item.is_flagged && item.flag_reason && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3">
          <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-danger-700">
            <Flag size={11} fill="currentColor" />
            Flagged
          </p>
          <p className="mt-1 text-sm font-bold text-danger-700">
            {item.flag_reason}
          </p>
        </div>
      )}

      {item.rejection_reason && (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-warning-700">
            Rejection Reason
          </p>
          <p className="mt-1 text-sm font-bold text-warning-700">
            {item.rejection_reason}
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onModerate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
        >
          <ShieldCheck size={15} />
          Moderate
        </button>
      </div>
    </div>
  );
}

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

export default AdminItems;