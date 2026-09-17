import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  CheckCircle, 
  Clock, 
  UserX, 
  UserMinus, 
  Funnel, 
  Table, 
  Grid, 
  Minus, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  XCircle, 
  Eye, 
  BarChart3, 
  MoreVertical, 
  Trash2, 
  UserCheck, 
  MapPin, 
  Calendar, 
  CircleArrowOutUpRight, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { adminAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import BanModal from './BanModal';
import AdminUserStats from './Users-stats';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { useBreakpoint } from '@/reusables/Breakpoint';
import Select from '@/reusables/Select';


const ITEMS_PER_PAGE = 20;

// ============================================================
// Skeleton (Unified)
// ============================================================
const UsersSkeleton = () => (
  <div className="space-y-5">
		   <PageNavigationSkeleton/>
    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded w-48 mb-2"></div>
      <div className="h-4 bg-ink-200 rounded w-32"></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4">
          <div className="h-4 bg-ink-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-ink-200 rounded w-16"></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm">
      <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-ink-200"></div>
        <div className="h-5 bg-ink-200 rounded w-24"></div>
      </div>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-ink-50">
          <div className="w-10 h-10 rounded-full bg-ink-200 shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-ink-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-ink-200 rounded w-1/3"></div>
          </div>
          <div className="h-6 bg-ink-200 rounded w-16 shrink-0"></div>
          <div className="h-6 bg-ink-200 rounded w-20 shrink-0"></div>
          <div className="h-5 bg-ink-200 rounded w-24 shrink-0"></div>
          <div className="h-5 bg-ink-200 rounded w-20 shrink-0"></div>
          <div className="flex gap-1">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="w-8 h-8 rounded-xl bg-ink-200"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const AdminUsers = () => {
  const breakpoint = useBreakpoint();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [gridCols, setGridCols] = useState(2);
  const [isCustomCols, setIsCustomCols] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Stats Modal state
  const [statsModal, setStatsModal] = useState({
    isOpen: false,
    userId: null,
    defaultTab: 'analytics'
  });
  const openStatsModal = (userId, tab = 'analytics') =>
    setStatsModal({ isOpen: true, userId, defaultTab: tab });
  const closeStatsModal = () =>
    setStatsModal({ isOpen: false, userId: null, defaultTab: 'analytics' });

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

  useEffect(() => {
    if (!isCustomCols) {
      setGridCols(getDefaultCols(breakpoint));
    }
  }, [breakpoint, isCustomCols, getDefaultCols]);

  // ============================================================
  // Click outside dropdown
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
    if (roleFilter) count++;
    if (verifiedFilter) count++;
    if (sortBy !== 'created_at') count++;
    return count;
  }, [roleFilter, verifiedFilter, sortBy]);

  // Filter options
  const roleOptions = useMemo(
    () => [
      { value: '', label: 'All Roles', icon: Users },
      { value: 'user', label: 'User', icon: User },
      { value: 'admin', label: 'Admin', icon: ShieldCheck },
      { value: 'super_admin', label: 'Super Admin', icon: ShieldAlert },
    ],
    []
  );

  const verifiedOptions = [
    { value: '', label: 'All Users', icon: Users },
    { value: 'true', label: 'Verified', icon: CheckCircle, color: 'emerald' },
    { value: 'false', label: 'Unverified', icon: Clock, color: 'amber' },
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Newest First', icon: ArrowDown },
    { value: 'full_name', label: 'Name A-Z', icon: ArrowUpDown },
    { value: 'email', label: 'Email', icon: User },
    { value: 'role', label: 'Role', icon: Shield },
  ];

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(search && search.trim() && { search: search.trim() }),
        ...(roleFilter && { role: roleFilter }),
        ...(verifiedFilter && { verified: verifiedFilter }),
        sortBy,
        sortOrder,
      };

      const response = await adminAPI.getUsers(params);
      const data = response.data;

      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, verifiedFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearch('');
    setRoleFilter('');
    setVerifiedFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Handlers for user actions
  const handleBanUser = async (userId, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(userId, banData);
      toast.success('User banned successfully');
      setShowBanModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to ban user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(userId, banData);
      toast.success('User unbanned successfully');
      setShowBanModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unban user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    setActionLoading(true);
    try {
      await adminAPI.changeUserRole(selectedUser.id, { role: newRole });
      toast.success(`User role changed to ${newRole}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
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

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: 'bg-rose-50 text-rose-700 border-rose-200',
      admin: 'bg-primary-50 text-primary-700 border-primary-200',
      user: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return badges[role] || badges.user;
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      user: 'User',
    };
    return labels[role] || role || 'User';
  };

  const getStatusBadge = (user) => {
    if (user.ban_status === 'banned') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (user.ban_status === 'deleted') return 'bg-ink-50 text-ink-400 border-ink-200';
    if (user.email_verified) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getStatusLabel = (user) => {
    if (user.ban_status === 'banned') return 'Banned';
    if (user.ban_status === 'deleted') return 'Deleted';
    if (user.email_verified) return 'Active';
    return 'Unverified';
  };

  const getStatusIcon = (user) => {
    if (user.ban_status === 'banned') return UserX;
    if (user.ban_status === 'deleted') return UserMinus;
    if (user.email_verified) return CheckCircle;
    return Clock;
  };

  // Stats
  const stats = useMemo(
    () => ({
      total,
      admins: users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length,
      verified: users.filter((u) => u.email_verified).length,
      banned: users.filter((u) => u.ban_status === 'banned').length,
    }),
    [users, total]
  );

  if (loading && users.length === 0) return <UsersSkeleton />;

  return (
    <div className="space-y-5">
      <PageNavigation />

      {/* ========== HEADER ========== */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              User management
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
            User Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total.toLocaleString()} users · Manage platform users
          </p>
        </div>
      </div>

      {/* ========== STATS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total} icon={Users} />
        <StatCard
          label="Admins"
          value={stats.admins}
          icon={ShieldCheck}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <StatCard
          label="Active"
          value={stats.verified}
          icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Banned"
          value={stats.banned}
          icon={UserX}
          color="text-rose-600"
          bg="bg-rose-50"
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
              <Funnel className="w-4 h-4" />
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
                  <Table className="w-3.5 h-3.5" />
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
                  <Grid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition text-ink-500 hover:text-ink-800"
                >
                  <Table className="w-3.5 h-3.5" />
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
                  <Minus className="w-3 h-3" />
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
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="bg-ink-100 p-1 rounded-xl border border-ink-200/80 shadow-sm px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50 flex items-center"
            >
              <span>{filtersExpanded ? 'Hide' : 'Expand'}</span>
              {filtersExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
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
                    placeholder="Search users by name or email..."
                    className="w-full rounded-xl border border-ink-100 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select
                    options={roleOptions}
                    value={roleFilter}
                    onChange={handleFilterChange(setRoleFilter)}
                    placeholder="All Roles"
                    showIcon
                    className="w-full sm:flex-1"
                  />
                  <Select
                    options={verifiedOptions}
                    value={verifiedFilter}
                    onChange={handleFilterChange(setVerifiedFilter)}
                    placeholder="All Users"
                    showIcon
                    className="w-full sm:flex-1"
                  />
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
                    {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </button>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={clearAllFilters}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
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
      {users.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <Users className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-extrabold text-ink-800">No users found</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              {search || roleFilter || verifiedFilter
                ? 'Try adjusting your filters'
                : 'No users have registered yet'}
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
                        User
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Role
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Location
                      </th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-ink-400 whitespace-nowrap">
                        Joined
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {users.map((user) => {
                      const isMenuOpen = openMenuId === user.id;
                      const StatusIconComp = getStatusIcon(user);

                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group transition-colors hover:bg-primary-50/20"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt=""
                                  className="img h-8 w-8 rounded-full object-cover shrink-0 border border-ink-100 shadow-sm"
                                />
                              ) : (
                                <div className="img h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center shrink-0 border border-ink-200">
                                  <User className="w-4 h-4 text-ink-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserModal(true);
                                  }}
                                  className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition"
                                >
                                  {user.full_name || 'Anonymous'}
                                </button>
                                <p className="truncate text-xs font-medium text-ink-400">
                                  {user.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadge(
                                user
                              )}`}
                            >
                              <StatusIconComp className="w-3 h-3" />
                              {getStatusLabel(user)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-sm font-medium text-ink-500">
                            {user.location || '-'}
                          </td>

                          <td className="px-5 py-3.5 text-sm font-medium text-ink-500 whitespace-nowrap">
                            {formatDate(user.created_at)}
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openStatsModal(user.id, 'analytics')}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="View Stats"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRoleModal(true);
                                  setNewRole(user.role || 'user');
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                                title="Change Role"
                              >
                                <Shield className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                  user.ban_status === 'banned'
                                    ? 'text-rose-600 hover:bg-rose-50/60'
                                    : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                                }`}
                                title={user.ban_status === 'banned' ? 'Unban User' : 'Ban User'}
                              >
                                {user.ban_status === 'banned' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </button>

                              <div className="action-menu relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(isMenuOpen ? null : user.id);
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
                                        setSelectedUser(user);
                                        setShowUserModal(true);
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
                                        setSelectedUser(user);
                                        setShowRoleModal(true);
                                        setNewRole(user.role || 'user');
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                        <Shield className="w-3.5 h-3.5" />
                                      </span>
                                      Change Role
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedUser(user);
                                        setShowBanModal(true);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50/60 hover:text-rose-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                        <UserX className="w-3.5 h-3.5" />
                                      </span>
                                      {user.ban_status === 'banned' ? 'Unban User' : 'Ban User'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        openStatsModal(user.id, 'analytics');
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-50/60 hover:text-primary-700"
                                    >
                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                      </span>
                                      View Stats
                                    </button>
                                    {user.role !== 'super_admin' && (
                                      <>
                                        <div className="my-1 h-px bg-ink-100" />
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setSelectedUser(user);
                                            setShowDeleteModal(true);
                                          }}
                                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                        >
                                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </span>
                                          Delete
                                        </button>
                                      </>
                                    )}
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
            /* ========== GRID VIEW ========== */
            <motion.div
              className="grid gap-4"
              animate={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {users.map((user) => {
                const StatusIconComp = getStatusIcon(user);
                return (
                  <motion.div
                    key={user.id}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="img h-8 w-8 rounded-full object-cover border border-ink-100 shadow-sm"
                            />
                          ) : (
                            <div className="img h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
                              <User className="w-4 h-4 text-ink-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="block truncate text-sm font-extrabold text-ink-900 hover:text-primary-600 transition"
                            >
                              {user.full_name || 'Anonymous'}
                            </button>
                            <p className="truncate text-xs font-medium text-ink-400">
                              {user.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadge(
                            user
                          )}`}
                        >
                          <StatusIconComp className="w-3 h-3" />
                          {getStatusLabel(user)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {user.location || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-ink-100 bg-ink-50/50 p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStatsModal(user.id, 'analytics')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                          title="View Stats"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                            setNewRole(user.role || 'user');
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-primary-50/60 hover:text-primary-600"
                          title="Change Role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                            user.ban_status === 'banned'
                              ? 'text-rose-600 hover:bg-rose-50/60'
                              : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                          }`}
                          title={user.ban_status === 'banned' ? 'Unban User' : 'Ban User'}
                        >
                          {user.ban_status === 'banned' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                      {user.role !== 'super_admin' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-rose-50/60 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                of <span className="font-bold text-ink-600">{total.toLocaleString()}</span> users
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

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        showCloseButton={false}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">User Details</h2>
              </div>
              <div className="flex gap-5 ml-auto items-center">
                <Link
                  to={`/admin/users-profile/${selectedUser?.id || ''}`}
                  className="text-ink-400 hover:text-primary-600 shrink-0"
                  title="View user details"
                >
                  <CircleArrowOutUpRight className="w-4 h-4" />
                </Link>
                <X
                  className="w-4 h-4 text-ink-400 hover:text-primary-600 shrink-0 cursor-pointer"
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                />
              </div>
            </div>

            <hr className="border-ink-100" />

            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt=""
                  className="img w-8 h-8 rounded-full object-cover shrink-0 border border-ink-100 shadow-sm"
                />
              ) : (
                <div className="img w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center shrink-0 border border-ink-200">
                  <User className="w-4 h-4 text-ink-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-ink-900">
                  {selectedUser.full_name || 'Anonymous'}
                </h3>
                <p className="text-sm font-medium text-ink-500">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                      selectedUser.role
                    )}`}
                  >
                    {getRoleLabel(selectedUser.role)}
                  </span>
                  {(() => {
                    const StatusIconComp = getStatusIcon(selectedUser);
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          selectedUser
                        )}`}
                      >
                        <StatusIconComp className="w-3 h-3" />
                        {getStatusLabel(selectedUser)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-5">
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Location</p>
                <p className="text-sm font-bold text-ink-900">{selectedUser.location || 'Not specified'}</p>
              </div>
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Country</p>
                <p className="text-sm font-bold text-ink-900">{selectedUser.country || 'Not specified'}</p>
              </div>
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Phone</p>
                <p className="text-sm font-bold text-ink-900">{selectedUser.phone || 'Not specified'}</p>
              </div>
              <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Joined</p>
                <p className="text-sm font-bold text-ink-900">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>

            {selectedUser.bio && (
              <div>
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Bio</p>
                <p className="text-sm font-bold text-ink-700">{selectedUser.bio}</p>
              </div>
            )}

            {selectedUser.ban_status === 'banned' && (
              <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 space-y-1 shadow-sm">
                <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Ban Information</p>
                <p className="text-sm font-bold text-rose-700 mt-1">
                  <span className="font-extrabold">Reason:</span> {selectedUser.ban_reason || 'No reason provided'}
                </p>
                <p className="text-xs font-medium text-rose-500">
                  <span className="font-extrabold">Banned at:</span> {formatDate(selectedUser.banned_at)}
                </p>
                {selectedUser.ban_duration && selectedUser.ban_duration !== 'permanent' && (
                  <p className="text-xs font-medium text-rose-500">
                    <span className="font-extrabold">Duration:</span> {selectedUser.ban_duration}
                  </p>
                )}
                {selectedUser.ban_count > 0 && (
                  <p className="text-xs font-medium text-rose-400">
                    <span className="font-extrabold">Ban Count:</span> {selectedUser.ban_count}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Ban Modal */}
      <BanModal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onBan={handleBanUser}
        onUnban={handleUnbanUser}
        title="Ban User"
        size="md"
        loading={actionLoading}
      />

      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
          setNewRole('');
        }}
        title="Change User Role"
        size="sm"
      >
        {selectedUser && (
          <>
            <p className="text-sm font-medium text-ink-500 mb-4">
              Change role for <span className="font-extrabold text-ink-900">{selectedUser.full_name}</span>
            </p>
            <div className="space-y-2">
              {[
                { value: 'user', label: 'User', icon: User, color: 'ink' },
                { value: 'admin', label: 'Admin', icon: ShieldCheck, color: 'primary' },
                {
                  value: 'super_admin',
                  label: 'Super Admin',
                  icon: ShieldAlert,
                  color: 'rose',
                },
              ].map(({ value, label, icon: IconComponent, color }) => {
                const isSelected = newRole === value;
                const colorMap = {
                  ink: 'bg-ink-50 border-ink-500 text-ink-700',
                  primary: 'bg-primary-50 border-primary-500 text-primary-700',
                  rose: 'bg-rose-50 border-rose-500 text-rose-700',
                };
                return (
                  <button
                    key={value}
                    onClick={() => setNewRole(value)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition border-2 flex items-center gap-3 ${
                      isSelected
                        ? colorMap[color] || 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'hover:bg-ink-50 border-transparent text-ink-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {label}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary-600 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole('');
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={actionLoading || !newRole || newRole === selectedUser.role}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Change Role'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="sm"
      >
        {selectedUser && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-600">
                  Are you sure you want to delete <span className="font-extrabold text-ink-900">{selectedUser.full_name}</span>?
                </p>
                <p className="text-xs font-medium text-ink-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading || selectedUser.role === 'super_admin'}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ========== USER STATS MODAL ========== */}
      <AdminUserStats
        isOpen={statsModal.isOpen}
        userId={statsModal.userId}
        onClose={closeStatsModal}
        defaultTab={statsModal.defaultTab}
      />
    </div>
  );
};

// ============================================================
// Helper Components
// ============================================================

function StatCard({ label, value, icon: IconComponent, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border border-ink-100/60`}>
          <IconComponent className={`w-4 h-4 ${color}`} />
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
        <ChevronLeft className="w-4 h-4" />
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
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default AdminUsers;
