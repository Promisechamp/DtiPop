import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
import {
  CircleArrowOutUpRight,
  Trash2,
  Grid3x3,
  Star,
  StarHalf,
  Package,
  CheckCircle2,
  Clock,
  Trophy,
  Flag,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  Minus,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  XCircle,
  Image as ImageIcon,
  Eye,
  ShieldCheck,
  MoreVertical,
  Slash,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { useBreakpoint } from '@/reusables/Breakpoint';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';

const ITEMS_PER_PAGE = 20;

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

/* ============================================================
   SKELETON
============================================================ */

const ItemsSkeleton = () => (
  <div className="space-y-5">
    <PageNavigationSkeleton />
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-2.5 w-28 animate-pulse rounded bg-ink-100" />
      <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
      <div className="h-4 w-72 animate-pulse rounded bg-ink-100" />
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-ink-100 bg-white" />
      ))}
    </div>

    {/* Toolbar skeleton */}
    <div className="h-20 animate-pulse rounded-2xl border border-ink-100 bg-white" />

    {/* Table skeleton */}
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="h-12 animate-pulse bg-ink-50" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-5 border-t border-ink-50 px-5 py-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-ink-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 animate-pulse rounded bg-ink-100" />
            <div className="h-2.5 w-28 animate-pulse rounded bg-ink-100" />
          </div>
          <div className="hidden h-3 w-20 animate-pulse rounded bg-ink-100 sm:block" />
          <div className="hidden h-3 w-16 animate-pulse rounded bg-ink-100 md:block" />
          <div className="h-3 w-14 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AdminItems = () => {
  const breakpoint = useBreakpoint();

  /* ----------------------------------------------------------
     ITEMS
  ---------------------------------------------------------- */

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  /* ----------------------------------------------------------
     SEARCH / FILTERS
  ---------------------------------------------------------- */

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  /* ----------------------------------------------------------
     TABS
  ---------------------------------------------------------- */

  const [activeTab, setActiveTab] = useState('all');

  const [featuredItems, setFeaturedItems] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  /* ----------------------------------------------------------
     UI
  ---------------------------------------------------------- */

  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [viewMode, setViewMode] = useState('table');

  // Grid columns for "All Items" card view
  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);

  // Grid columns for "Featured" tab
  const [gridColsFeatured, setGridColsFeatured] = useState(2);
  const [isCustomColsFeatured, setIsCustomColsFeatured] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);

  /* ----------------------------------------------------------
     MODALS
  ---------------------------------------------------------- */

  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [showModerateModal, setShowModerateModal] = useState(false);

  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [moderateAction, setModerateAction] = useState('');
  const [moderateReason, setModerateReason] = useState('');

  const [featureCanApply, setFeatureCanApply] = useState(false);

  /* ----------------------------------------------------------
     GLOBAL STATS
  ---------------------------------------------------------- */

  const [globalStats, setGlobalStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    flagged: 0,
  });


  /* ==========================================================
     RESPONSIVE COLUMNS
  ========================================================== */

  const getDefaultCols = useCallback((bp) => {
    if (bp === 'xs' || bp === 'sm') return 1;
    if (bp === 'md') return 2;
    if (bp === 'lg') return 3;
    if (bp === 'xl' || bp === '2xl') return 4;
    return 2;
  }, []);

  // All Items grid columns
  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // Featured grid columns
  useEffect(() => {
    if (!isCustomColsFeatured) {
      setGridColsFeatured(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomColsFeatured, getDefaultCols]);

  /* ==========================================================
     SEARCH DEBOUNCE
  ========================================================== */

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearch(trimmed);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ==========================================================
     ACTIVE FILTER COUNT
  ========================================================== */

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (categoryFilter) count++;
    if (conditionFilter) count++;
    if (sortBy !== 'created_at') count++;
    return count;
  }, [statusFilter, categoryFilter, conditionFilter, sortBy]);

  /* ==========================================================
     OPTIONS
  ========================================================== */

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
      { value: 'applications_count', label: 'Most Applications', icon: 'bi-people' },
    ],
    []
  );

  /* ==========================================================
     CLOSE ACTION MENUS
  ========================================================== */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.action-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  /* ==========================================================
     FETCH NORMAL ITEMS
  ========================================================== */

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(conditionFilter && { condition: conditionFilter }),
        sortBy,
        sortOrder,
      };
      const response = await adminAPI.getItems(params);
      const data = response.data || {};
      const fetchedItems = data.items || [];
      setItems(fetchedItems);
      const fetchedTotal = Number(data.total) || 0;
      setTotal(fetchedTotal);
      setTotalPages(Math.ceil(fetchedTotal / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, categoryFilter, conditionFilter, sortBy, sortOrder]);

  /* ==========================================================
     FETCH FEATURED ITEMS
  ========================================================== */

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

  /* ==========================================================
     FETCH GLOBAL STATS
  ========================================================== */

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
        active: items.filter((item) => item.status === 'active').length,
        pending: items.filter((item) => item.status === 'pending').length,
        completed: items.filter((item) => item.status === 'completed').length,
        flagged: items.filter((item) => item.is_flagged === true).length,
      });
    }
  }, [total, items]);

  /* ==========================================================
     EFFECTS
  ========================================================== */

  useEffect(() => {
    if (activeTab === 'all') {
      fetchItems();
    }
  }, [fetchItems, activeTab]);

  // Fetch featured items on mount (and keep in sync), so the tab badge
  // always reflects the real featured count — not only after the tab is opened.
  useEffect(() => {
    fetchFeaturedItems();
  }, [fetchFeaturedItems]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  /* ==========================================================
     FILTER HANDLERS
  ========================================================== */

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setConditionFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  /* ==========================================================
     STATUS BADGE
  ========================================================== */

  const getStatusBadge = (itemStatus, appsCount) => {
    if (!appsCount && itemStatus === 'active') {
      return {
        label: 'No Apps',
        icon: 'bi-dash-circle',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    const display = getStatusDisplay(itemStatus);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      blue: 'bg-sky-50 text-sky-700 border-sky-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      label: display?.label || itemStatus,
      icon: display?.icon || 'bi-circle',
      classes: colorMap[display?.color] || colorMap.gray,
    };
  };

  /* ==========================================================
     OPEN MODERATION
  ========================================================== */

  const openModerateModal = (item) => {
    setSelectedItem(item);
    setModerateAction('');
    setModerateReason('');
    setShowModerateModal(true);
    setOpenMenuId(null);
  };

  /* ==========================================================
     OPEN FEATURE MODAL
  ========================================================== */

  const openFeatureModal = (item) => {
    const featured = getFeaturedData(item);
    setSelectedItem(item);
    setFeatureCanApply(featured.can_apply);
    setShowFeatureModal(true);
    setShowModerateModal(false);
  };

  /* ==========================================================
     HANDLE MODERATION
  ========================================================== */

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
        unfeature: 'unfeatured',
        flag: 'flagged',
        unflag: 'unflagged',
      };
      toast.success(`Item ${actionLabels[moderateAction] || 'updated'} successfully`);
      closeModerationState();
      await refreshAfterMutation();
    } catch (error) {
      console.error('Moderation error:', error);
      toast.error(error.response?.data?.error || 'Failed to moderate item');
    } finally {
      setActionLoading(false);
    }
  };

  /* ==========================================================
     FEATURE ITEM
  ========================================================== */

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

  /* ==========================================================
     DELETE ITEM
  ========================================================== */

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

  /* ==========================================================
     REFRESH AFTER MUTATION
  ========================================================== */

  const refreshAfterMutation = async () => {
    const requests = [fetchItems(), fetchGlobalStats(), fetchFeaturedItems()];
    await Promise.all(requests);
  };

  /* ==========================================================
     CLOSE MODERATION
  ========================================================== */

  const closeModerationState = () => {
    setShowModerateModal(false);
    setSelectedItem(null);
    setModerateAction('');
    setModerateReason('');
  };

  /* ==========================================================
     CLOSE FEATURE
  ========================================================== */

  const closeFeatureState = () => {
    setShowFeatureModal(false);
    setSelectedItem(null);
    setModerateAction('');
    setModerateReason('');
    setFeatureCanApply(false);
  };

  /* ==========================================================
     OPEN ITEM DETAILS
  ========================================================== */

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setShowItemModal(true);
    setOpenMenuId(null);
  };

  /* ==========================================================
     LOADING SCREEN
  ========================================================== */

  if (loading && items.length === 0 && activeTab === 'all') {
    return <ItemsSkeleton />;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-5">
      {/* ======================================================
          HEADER
      ====================================================== */}
      <PageNavigation />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Item management
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
            Item Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total.toLocaleString()} items · Manage and moderate listings
          </p>
        </div>
      </div>

      {/* ======================================================
          TABS (redesigned — animated sliding indicator)
      ====================================================== */}

      <div className="flex justify-between px-5 w-full items-center gap-3 border-b border-ink-200/60 bg-transparent px-1 pb-2">
  {/* All Items Tab */}
  <button
    type="button"
    onClick={() => setActiveTab('all')}
    className={`group relative flex items-center gap-2.5 pb-2 text-xs font-bold transition-colors ${
      activeTab === 'all' ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700'
    }`}
  >
    <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
      activeTab === 'all' ? 'bg-primary-50 text-primary-600' : 'bg-ink-100/60 text-ink-400 group-hover:bg-ink-100'
    }`}>
      <Grid3x3 className="h-4 w-4" />
    </div>
    <span>All Items</span>
    <motion.span
      key={`all-${total}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
        activeTab === 'all' ? 'bg-primary-100/60 text-primary-700' : 'bg-ink-100 text-ink-500'
      }`}
    >
      {total.toLocaleString()}
    </motion.span>

    {activeTab === 'all' && (
      <motion.div
        layoutId="activeUnderlineTab"
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute -bottom-2 inset-x-0 h-0.5 bg-primary-600 rounded-full"
      />
    )}
  </button>

  {/* Featured Tab */}
  <button
    type="button"
    onClick={() => setActiveTab('featured')}
    className={`group relative flex items-center gap-2.5 pb-2 text-xs font-bold transition-colors ${
      activeTab === 'featured' ? 'text-ink-900' : 'text-ink-400 hover:text-amber-700'
    }`}
  >
    <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
      activeTab === 'featured' ? 'bg-amber-50 text-amber-600' : 'bg-ink-100/60 text-ink-400 group-hover:bg-amber-50/60'
    }`}>
      <Star className={`h-4 w-4 ${activeTab === 'featured' ? 'fill-current text-amber-500' : ''}`} />
    </div>
    <span>Featured</span>
    <motion.span
      key={`featured-${featuredItems.length}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
        activeTab === 'featured' ? 'bg-amber-100/80 text-amber-800' : 'bg-amber-100/40 text-amber-700'
      }`}
    >
      {featuredLoading ? '···' : featuredItems.length}
    </motion.span>

    {activeTab === 'featured' && (
      <motion.div
        layoutId="activeUnderlineTab"
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute -bottom-2 inset-x-0 h-0.5 bg-amber-500 rounded-full"
      />
    )}
  </button>
</div>



      {/* ======================================================
          CONTENT
      ====================================================== */}

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
              formatDateTime={formatDateTime}
              getStatusBadge={getStatusBadge}
              // Grid controls
              gridCols={gridColsFeatured}
              setGridCols={setGridColsFeatured}
              isCustomCols={isCustomColsFeatured}
              setIsCustomCols={setIsCustomColsFeatured}
              getDefaultCols={getDefaultCols}
              breakpoint={breakpoint}
            />
          </motion.div>
        ) : (
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* ==================================================
                STATS
            ================================================== */}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total" value={globalStats.total} icon={Package} />
              <StatCard
                label="Active"
                value={globalStats.active}
                icon={CheckCircle2}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <StatCard
                label="Pending"
                value={globalStats.pending}
                icon={Clock}
                color="text-amber-600"
                bg="bg-amber-50"
              />
              <StatCard
                label="Completed"
                value={globalStats.completed}
                icon={Trophy}
                color="text-sky-600"
                bg="bg-sky-50"
              />
              <StatCard
                label="Flagged"
                value={globalStats.flagged}
                icon={Flag}
                color="text-rose-600"
                bg="bg-rose-50"
              />
              <StatCard
                label="Featured"
                value={featuredItems.length}
                icon={Star}
                color="text-amber-600"
                bg="bg-amber-50"
              />
            </div>

            {/* ==================================================
                FILTER TOOLBAR
            ================================================== */}

            <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((value) => !value)}
                  className="flex items-center gap-3 text-left transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                    <Filter className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-ink-800">Filters & Search</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {activeFilterCount > 0
                        ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                        : 'No active filters'}
                      {searchInput && ' · Search active'}
                    </p>
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3 border-t border-ink-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-black text-white">
                      {activeFilterCount}
                    </span>
                  )}

                  {/* View mode */}
                  {viewMode === 'table' ? (
                    <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          viewMode === 'table'
                            ? 'bg-white text-primary-700 shadow-sm'
                            : 'text-ink-500 hover:text-ink-800'
                        }`}
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:text-ink-800"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Cards</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center rounded-xl border border-ink-200/80 bg-ink-100 p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-ink-500 transition hover:text-ink-800"
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCols(true);
                          setGridCols((value) => Math.max(1, value - 1));
                        }}
                        disabled={gridCols <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Fewer columns"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.5rem] px-2 text-center text-xs font-bold text-ink-700">
                        {gridCols}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCols(true);
                          setGridCols((value) => Math.min(4, value + 1));
                        }}
                        disabled={gridCols >= 4}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white/50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-30"
                        title="More columns"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setFiltersExpanded((value) => !value)}
                    className="rounded-xl border border-ink-200/80 bg-ink-100 px-3.5 py-2 text-xs font-bold text-ink-700 shadow-sm transition hover:bg-ink-50"
                  >
                    <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
                    {filtersExpanded ? (
                      <ChevronUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 inline h-3 w-3" />
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
                    <div className="space-y-4 bg-ink-50/20 px-5 py-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder="Search items by title, description, category..."
                          className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                        />
                      </div>

                      {/* Filters */}
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Select
                          options={statusOptions}
                          value={statusFilter}
                          onChange={handleFilterChange(setStatusFilter)}
                          placeholder="All Statuses"
                          showIcon
                          className="w-full sm:flex-1"
                        />
                        <Select
                          options={categoryOptions}
                          value={categoryFilter}
                          onChange={handleFilterChange(setCategoryFilter)}
                          placeholder="All Categories"
                          showIcon
                          searchable
                          className="w-full sm:flex-1"
                        />
                        <Select
                          options={conditionOptions}
                          value={conditionFilter}
                          onChange={handleFilterChange(setConditionFilter)}
                          placeholder="All Conditions"
                          showIcon
                          className="w-full sm:flex-1"
                        />
                      </div>

                      {/* Sort */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Select
                          options={sortOptions}
                          value={sortBy}
                          onChange={(value) => {
                            setSortBy(value);
                            setCurrentPage(1);
                          }}
                          placeholder="Sort By"
                          showIcon
                          className="w-full sm:w-48"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSortOrder((value) => (value === 'asc' ? 'desc' : 'asc'));
                            setCurrentPage(1);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition hover:bg-ink-50"
                          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                          {sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {(activeFilterCount > 0 || searchInput) && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ==================================================
                EMPTY
            ================================================== */}

            {items.length === 0 ? (
              <EmptyItemsState
                search={searchInput}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                conditionFilter={conditionFilter}
              />
            ) : (
              <>
                {/* ==================================================
                    TABLE
                ================================================== */}

                {viewMode === 'table' ? (
                  <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-ink-100 bg-ink-50/60">
                            <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Item
                            </th>
                            <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Category
                            </th>
                            <th className="w-20 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Condition
                            </th>
                            <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Status
                            </th>
                            <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Views
                            </th>
                            <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Apps
                            </th>
                            <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Listed
                            </th>
                            <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-ink-50">
                          {items.map((item) => {
                            const badge = getStatusBadge(item.status, item.applications_count);
                            const category = getCategoryByValue(item.category);
                            const condition = getConditionByValue(item.condition);
                            const featured = getFeaturedData(item);
                            const isMenuOpen = openMenuId === item.id;

                            return (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="group transition-colors hover:bg-primary-50/20"
                              >
                                {/* Item */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-100">
                                      {item.images?.[0] ? (
                                        <img
                                          src={item.images[0]}
                                          alt=""
                                          className="img h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <ImageIcon className="img h-4 w-4 text-ink-300" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => openItemDetails(item)}
                                        className="block max-w-xs truncate text-left text-sm font-extrabold text-ink-900 transition hover:text-primary-600"
                                      >
                                        {item.title}
                                      </button>
                                      <div className="mt-0.5 flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-ink-400">
                                          {item.donor?.full_name || 'User'}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                        {item.is_flagged && (
                                          <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                            <Flag className="h-3 w-3 fill-current" />
                                            Flagged
                                          </span>
                                        )}
                                        {featured.is_featured && (
                                          <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                            <Star className="h-3 w-3 fill-current" />
                                            Featured
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Category */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    {category &&
                                      renderIcon(category.icon, 'h-4 w-4', category.color)}
                                    <span className="text-sm font-bold text-ink-600">
                                      {category?.label || item.category}
                                    </span>
                                  </div>
                                </td>

                                {/* Condition */}
                                <td className="whitespace-nowrap px-4 py-3.5 text-center text-[10px]">
                                  {condition && (
                                    <span
                                      title={condition.label}
                                      className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-1.5"
                                    >
                                      {renderIcon(condition.icon, 'h-4 w-4', condition.color)}
                                      <span className="inline">{condition.label}</span>
                                    </span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.classes}`}
                                  >
                                    <i className={`bi ${badge.icon} text-[10px]`} />
                                    {badge.label}
                                  </span>
                                </td>

                                {/* Views */}
                                <td className="px-4 py-3.5 text-center text-sm font-bold text-ink-600">
                                  {item.views_count?.toLocaleString() || 0}
                                </td>

                                {/* Apps */}
                                <td className="px-4 py-3.5 text-center">
                                  <span
                                    className={`text-sm font-extrabold ${
                                      !item.applications_count ? 'text-amber-500' : 'text-ink-700'
                                    }`}
                                  >
                                    {item.applications_count?.toLocaleString() || 0}
                                  </span>
                                </td>

                                {/* Listed */}
                                <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-ink-500">
                                  {formatDate(item.created_at)}
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openItemDetails(item)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                      title="View Details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openModerateModal(item)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                      title="Moderate"
                                    >
                                      <ShieldCheck className="h-4 w-4" />
                                    </button>
                                    <Link
                                      to={`/item/${item.id}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                      title="View on Site"
                                    >
                                      <CircleArrowOutUpRight className="h-4 w-4" />
                                    </Link>

                                    <div className="action-menu relative">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(isMenuOpen ? null : item.id);
                                        }}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                          isMenuOpen
                                            ? 'bg-primary-50 text-primary-600'
                                            : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                                        }`}
                                        aria-label="More actions"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>

                                      {isMenuOpen && (
                                        <div className="absolute right-0 top-full z-[999] mt-2 w-52 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-xl shadow-ink-900/10">
                                          <button
                                            type="button"
                                            onClick={() => openItemDetails(item)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                          >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                              <Eye className="h-3.5 w-3.5" />
                                            </span>
                                            View Details
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => openModerateModal(item)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                          >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                              <ShieldCheck className="h-3.5 w-3.5" />
                                            </span>
                                            Moderate
                                          </button>

                                          <div className="my-1 h-px bg-ink-100" />

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setSelectedItem(item);
                                              setShowDeleteModal(true);
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                          >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                              <Trash2 className="h-3.5 w-3.5" />
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
                  /* ==================================================
                     CARD VIEW (All Items)
                  ================================================== */

                  <motion.div
                    className="grid gap-4"
                    animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    {items.map((item) => {
                      const badge = getStatusBadge(item.status, item.applications_count);
                      const category = getCategoryByValue(item.category);
                      const featured = getFeaturedData(item);
                      const imageUrl = item.images?.[0] || null;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md"
                        >
                          <div className="relative h-48 w-full overflow-hidden bg-ink-50">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.title}
                                className="img h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon className="img h-8 w-8 text-ink-300" />
                              </div>
                            )}

                            <div className="absolute left-3 top-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md ${badge.classes}`}
                              >
                                <i className={`bi ${badge.icon} text-[10px]`} />
                                {badge.label}
                              </span>
                            </div>

                            <div className="absolute right-3 top-3 flex gap-1">
                              {item.is_flagged && (
                                <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50/90 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 backdrop-blur-sm">
                                  <Flag className="h-3 w-3 fill-current" />
                                  Flagged
                                </span>
                              )}
                              {featured.is_featured && (
                                <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 backdrop-blur-sm">
                                  <Star className="h-3 w-3 fill-current" />
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col space-y-2 p-4">
                            <button
                              type="button"
                              onClick={() => openItemDetails(item)}
                              className="line-clamp-1 text-left text-base font-extrabold text-ink-800 hover:text-primary-600"
                            >
                              {item.title}
                            </button>

                            <div className="flex items-center gap-1.5">
                              {category && renderIcon(category.icon, 'h-3 w-3', category.color)}
                              <span className="text-xs font-medium text-ink-400">
                                {category?.label || item.category}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-xs font-medium text-ink-500">
                                {item.donor?.full_name || 'User'}
                              </span>
                              <span className="text-ink-300">·</span>
                              <span className="text-xs font-medium text-ink-400">
                                {formatDate(item.created_at)}
                              </span>
                            </div>

                            {featured.is_featured && (
                              <div className="mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                                    featured.can_apply
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                      : 'border-ink-200 bg-ink-50 text-ink-500'
                                  }`}
                                >
                                  {featured.can_apply ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <Slash className="h-3 w-3" />
                                  )}
                                  {featured.can_apply
                                    ? 'Applications Open'
                                    : 'Applications Closed'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 p-3">
                            <div className="flex items-center gap-3 text-xs font-medium text-ink-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {item.views_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <i className="bi bi-people" />
                                {item.applications_count || 0}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openItemDetails(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openModerateModal(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="Moderate"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                              <Link
                                to={`/item/${item.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View on Site"
                              >
                                <CircleArrowOutUpRight className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowDeleteModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* ==================================================
                    PAGINATION
                ================================================== */}

                {totalPages > 1 && (
                  <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-ink-400">
                      Showing{' '}
                      <span className="font-bold text-ink-600">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{' '}
                      –{' '}
                      <span className="font-bold text-ink-600">
                        {Math.min(currentPage * ITEMS_PER_PAGE, total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-bold text-ink-600">{total.toLocaleString()}</span> items
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          ITEM DETAILS MODAL
      ======================================================== */}

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

      {/* ========================================================
          MODERATION MODAL
      ======================================================== */}

      <Modal
        isOpen={showModerateModal}
        onClose={() => {
          if (!actionLoading) closeModerationState();
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedItem && (
          <>
            <div className="flex">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Moderate Item</h2>
                <p className="mt-1 text-xs text-ink-400">Choose an action for this listing.</p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                className="ml-auto text-ink-400 hover:text-primary-600 disabled:opacity-50"
                onClick={closeModerationState}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <hr className="my-4 border-ink-100" />

            <p className="text-sm font-medium text-ink-500">
              Moderate "
              <span className="font-extrabold text-ink-900">{selectedItem.title}</span>"
            </p>

            <div className="mt-4 space-y-2">
              {ITEM_MODERATION_ACTIONS.map(({ action, label, icon, color }) => {
                const isSelected = moderateAction === action;
                const colorClasses =
                  MODERATION_COLOR_CLASSES[color] ||
                  'bg-primary-50 border-primary-500 text-primary-700';
                return (
                  <button
                    type="button"
                    key={action}
                    onClick={() => setModerateAction(action)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition flex items-center gap-3 ${
                      isSelected
                        ? colorClasses
                        : 'border-transparent bg-ink-50 text-ink-700 hover:bg-ink-100'
                    }`}
                  >
                    <i className={`bi ${icon}`} />
                    <span className="font-bold">{label}</span>
                    {action === 'feature' && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>

            {(moderateAction === 'reject' || moderateAction === 'flag') && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-extrabold text-ink-700">Reason</label>
                <textarea
                  value={moderateReason}
                  onChange={(e) => setModerateReason(e.target.value)}
                  placeholder={`Enter reason for ${
                    moderateAction === 'reject' ? 'rejecting' : 'flagging'
                  }...`}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none shadow-sm transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
                  rows={3}
                />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={closeModerationState}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModerateItem}
                disabled={actionLoading || !moderateAction}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    {moderateAction === 'feature' ? (
                      <>
                        <Star className="h-4 w-4 fill-current" />
                        Continue
                      </>
                    ) : (
                      'Apply'
                    )}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ========================================================
          FEATURE CONFIGURATION MODAL
      ======================================================== */}

      <Modal
        isOpen={showFeatureModal}
        onClose={() => {
          if (!actionLoading) closeFeatureState();
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedItem && (
          <div>
            <div className="flex items-start">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Feature Item</h2>
                <p className="mt-1 text-xs font-medium text-ink-400">
                  Configure this featured listing.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={closeFeatureState}
                className="ml-auto text-ink-400 transition hover:text-primary-600 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <hr className="my-4 border-ink-100" />

            {/* Item */}
            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-amber-100 bg-white">
                {selectedItem.images?.[0] ? (
                  <img src={selectedItem.images[0]} alt="" className="img h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-300">
                    <ImageIcon className="img h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink-900">{selectedItem.title}</p>
                <p className="text-xs text-ink-500">This item will appear in Featured Items.</p>
              </div>
            </div>

            {/* Can apply */}
            <div className="mt-5">
              <p className="text-sm font-extrabold text-ink-800">
                Can users apply for this featured item?
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-ink-400">
                Choose whether users should be allowed to submit applications for this item.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {/* YES */}
                <button
                  type="button"
                  onClick={() => setFeatureCanApply(true)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    featureCanApply
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-5 w-5" />
                    {featureCanApply && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <p className="mt-2 text-sm font-extrabold">Yes</p>
                  <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                    Applications are allowed
                  </p>
                </button>

                {/* NO */}
                <button
                  type="button"
                  onClick={() => setFeatureCanApply(false)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    !featureCanApply
                      ? 'border-ink-400 bg-ink-50 text-ink-800 shadow-sm'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:bg-ink-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Slash className="h-5 w-5" />
                    {!featureCanApply && <CheckCircle2 className="h-4 w-4 text-ink-600" />}
                  </div>
                  <p className="mt-2 text-sm font-extrabold">No</p>
                  <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                    Applications are disabled
                  </p>
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowFeatureModal(false);
                  setShowModerateModal(true);
                  setModerateAction('feature');
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFeatureItem}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Star className="h-4 w-4 fill-current" />
                    Feature Item
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          DELETE MODAL
      ======================================================== */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!actionLoading) {
            setShowDeleteModal(false);
            setSelectedItem(null);
          }
        }}
        showCloseButton={false}
        size="sm"
      >
        {selectedItem && (
          <>
            <div className="flex">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Delete Item</h2>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                className="ml-auto text-ink-400 hover:text-primary-600"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <hr className="my-4 border-ink-100" />

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-600">
                  Are you sure you want to delete "
                  <span className="font-extrabold text-ink-900">{selectedItem.title}</span>"?
                </p>
                <p className="mt-1 text-xs font-medium text-ink-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({ label, value, icon: IconComponent, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100/60 ${bg}`}>
          <IconComponent className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY ITEMS
============================================================ */

function EmptyItemsState({ search, statusFilter, categoryFilter, conditionFilter }) {
  const hasFilters = search || statusFilter || categoryFilter || conditionFilter;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

      <div className="relative">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-extrabold text-ink-800">No items found</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
          {hasFilters ? 'Try adjusting your filters' : 'No items have been listed yet'}
        </p>
      </div>
    </motion.div>
  );
}

/* ============================================================
   FEATURED ITEMS SECTION (REDESIGNED)
============================================================ */

function FeaturedItemsSection({
  items,
  loading,
  onView,
  onModerate,
  formatDate,
  formatDateTime,
  getStatusBadge,
  gridCols,
  setGridCols,
  isCustomCols,
  setIsCustomCols,
  getDefaultCols,
  breakpoint,
}) {
  // If not custom, sync with breakpoint (handled in parent via useEffect)
  // but we also allow manual changes here

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-500 shadow-sm">
            <Star className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-extrabold text-ink-800">No featured items</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
            Items marked as featured will appear here.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 px-4">
  {/* Header with original column controls */}
  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <Star className="h-4 w-4 fill-current" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-ink-900">Featured Items</h2>
        <p className="text-xs text-ink-400">
          {items.length} featured item{items.length !== 1 ? 's' : ''} currently displayed
        </p>
      </div>
    </div>

    {/* Grid column controls (Original layout) */}
    <div >
       <div className="inline-flex items-center gap-2 rounded-xl bg-ink-50/80 p-1 border border-ink-200/60 shadow-xs">
							  <button
    type="button"
    onClick={() => {
      setIsCustomCols(true);
      setGridCols((value) => Math.max(1, value - 1));
    }}
    disabled={gridCols <= 1}
    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-600 shadow-xs transition hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
    title="Fewer columns"
  >
    <Minus className="h-3.5 w-3.5" />
  </button>
  
  <span className="min-w-[1.25rem] text-center text-xs font-extrabold text-ink-800">
    {gridCols}
  </span>
  
  <button
    type="button"
    onClick={() => {
      setIsCustomCols(true);
      setGridCols((value) => Math.min(4, value + 1));
    }}
    disabled={gridCols >= 4}
    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-600 shadow-xs transition hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
    title="More columns"
  >
    <Plus className="h-3.5 w-3.5" />
  </button>
  
  <button
    type="button"
    onClick={() => {
      setIsCustomCols(false);
      setGridCols(getDefaultCols(breakpoint));
    }}
    className="ml-1 px-2 py-1 text-[11px] font-semibold text-ink-400 hover:text-ink-700 transition-colors"
  >
    Reset
  </button>
							</div>
    </div>

  </div>

  {/* Clean Horizontal/Row-Card Hybrid Layout */}
  <motion.div
    className="grid gap-4"
    animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  >
    <AnimatePresence mode="popLayout">
      {items.map((item) => {
        const badge = getStatusBadge(item.status, item.applications_count);
        const canApply = item.featured?.can_apply === true;
        const featuredAt = item.featured?.featured_at;

        return (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-200 transition-all hover:shadow-md"
          >
            {/* Top row: Image thumbnail, Title, Status */}
            <div className="flex items-start gap-4">
              <div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100 cursor-pointer"
                onClick={() => onView(item)}
              >
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-ink-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="truncate text-sm font-bold text-ink-900 hover:text-primary-600 text-left"
                  >
                    {item.title}
                  </button>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.classes}`}>
                    <i className={`bi ${badge.icon}`} />
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-400">
                  {item.donor?.full_name || 'Anonymous'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
                    {getCategoryByValue(item.category)?.label || item.category || 'General'}
                  </span>
                  <span className={`text-[10px] font-semibold ${canApply ? 'text-emerald-600' : 'text-ink-400'}`}>
                    {canApply ? '• Applications Open' : '• Applications Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics and Meta row */}
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-ink-500">Views:</span> <strong className="text-ink-800">{item.views_count?.toLocaleString() || 0}</strong>
                </div>
                <div>
                  <span className="text-ink-500">Apps:</span> <strong className="text-ink-800">{item.applications_count?.toLocaleString() || 0}</strong>
                </div>
              </div>
              <div className="text-[10px] text-ink-400">
                {formatDate(featuredAt)}
              </div>
            </div>

            {/* Action button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onModerate(item)}
                className="flex items-center justify-center gap-2 rounded-xl bg-ink-500 p-2.5 text-xs font-bold text-white transition hover:bg-primary-600"
              >
                <ShieldCheck className="h-4 w-4" />
                Moderate Item
              </button>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </motion.div>
</div>

  );
}

/* ============================================================
   ITEM DETAILS
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start">
        <div>
          <h2 className="text-lg font-extrabold text-ink-900">Item Details</h2>
          <p className="mt-1 text-xs text-ink-400">Full listing information</p>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <Link to={`/item/${item.id}`} className="text-ink-400 hover:text-primary-600" title="View on site">
            <CircleArrowOutUpRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-primary-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <hr className="border-ink-100" />

      {/* Main info */}
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-100">
          {item.images?.[0] ? (
            <img src={item.images[0]} alt="" className="img h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="img h-6 w-6 text-ink-300" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold text-ink-900">{item.title}</h3>
          <p className="text-sm font-medium text-ink-500">
            By {item.donor?.full_name || 'Anonymous'} · {formatDate(item.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.classes}`}
            >
              <i className={`bi ${badge.icon}`} />
              {badge.label}
            </span>
            <span className="rounded-full border border-ink-200 bg-ink-100 px-2.5 py-1 text-[10px] font-bold text-ink-700">
              {category?.label || item.category || 'Uncategorized'}
            </span>
            <span className="rounded-full border border-ink-200 bg-ink-100 px-2.5 py-1 text-[10px] font-bold text-ink-700">
              {condition?.label || item.condition || 'Unknown'}
            </span>
            {featured.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Featured configuration */}
      {featured.is_featured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                Featured Configuration
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                    featured.can_apply
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-ink-200 bg-white text-ink-500'
                  }`}
                >
                  {featured.can_apply ? (
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  ) : (
                    <Slash className="mr-1 inline h-3 w-3" />
                  )}
                  {featured.can_apply ? 'Can Apply' : 'Cannot Apply'}
                </span>
                {featured.featured_at && (
                  <span className="text-[10px] font-medium text-amber-700">
                    Featured {formatDateTime(featured.featured_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">Views</p>
          <p className="text-lg font-extrabold text-ink-900">
            {item.views_count?.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Applications
          </p>
          <p className="text-lg font-extrabold text-ink-900">
            {item.applications_count?.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-ink-100/60 bg-ink-50/50 p-3 text-center shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">Listed</p>
          <p className="text-lg font-extrabold text-ink-900">{formatDate(item.created_at)}</p>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-relaxed text-ink-700">
            {item.description}
          </p>
        </div>
      )}

      {/* Dimensions */}
      {(item.weight_kg || item.length_cm || item.width_cm || item.height_cm) && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Dimensions
          </p>
          <p className="mt-1 text-sm font-bold text-ink-700">
            {item.weight_kg && `${item.weight_kg}kg`}
            {item.length_cm && ` · ${item.length_cm}cm`}
            {item.width_cm && ` × ${item.width_cm}cm`}
            {item.height_cm && ` × ${item.height_cm}cm`}
          </p>
        </div>
      )}

      {/* Flag */}
      {item.is_flagged && item.flag_reason && (
        <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-3 shadow-sm">
          <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-600">
            <Flag className="h-3 w-3" />
            Flagged
          </p>
          <p className="mt-1 text-sm font-bold text-rose-700">{item.flag_reason}</p>
        </div>
      )}

      {/* Rejection */}
      {item.rejection_reason && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-3 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
            Rejection Reason
          </p>
          <p className="mt-1 text-sm font-bold text-amber-700">{item.rejection_reason}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 border-t border-ink-100 pt-4">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50">
          Close
        </button>
        <button
          type="button"
          onClick={onModerate}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md"
        >
          <ShieldCheck className="h-4 w-4" />
          Moderate
        </button>
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
    <div className="flex items-center gap-1">
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
        <ChevronLeft className="h-4 w-4" />
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
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default AdminItems;
