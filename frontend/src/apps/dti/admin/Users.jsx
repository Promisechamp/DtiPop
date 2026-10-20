// src/admin/AdminUsers.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  BarChart3,
  Trash2,
  UserCheck,
  MapPin,
  Calendar,
  CircleArrowOutUpRight,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import BanModal from './BanModal';
import AdminUserStats from './Users-stats';
import Select from '@/reusables/Select';
import FilterBar, {
  ColumnStepper,
  ViewToggle,
} from '@/reusables/FilterBar';
import { usePageState } from '@/hooks/usePageState';

const ITEMS_PER_PAGE = 20;

/* ============================================================
   PAGE CONFIG (stable references — never redefine inside component)
============================================================ */

const URL_DEFAULTS = {
  search: '',
  role: '',
  verified: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
};

const FILTER_KEYS = ['search', 'role', 'verified', 'sortBy', 'sortOrder'];

/* ============================================================
   SKELETON
============================================================ */

const UsersSkeleton = () => (
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
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-40 animate-pulse rounded-xl bg-ink-200" />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
              <div className="h-10 w-10 animate-pulse rounded-full bg-ink-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink-100" />
                <div className="h-2.5 w-1/4 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-ink-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
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
   STATUS / ROLE HELPERS
============================================================ */

const getRoleBadge = (role) => {
  const badges = {
    super_admin: 'border-danger-200 bg-danger-50 text-danger-700',
    admin: 'border-primary-200 bg-primary-50 text-primary-700',
    user: 'border-ink-200 bg-ink-50 text-ink-600',
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
  if (user.ban_status === 'banned') {
    return 'border-danger-200 bg-danger-50 text-danger-700';
  }
  if (user.ban_status === 'deleted') {
    return 'border-ink-200 bg-ink-50 text-ink-400';
  }
  if (user.email_verified) {
    return 'border-success-200 bg-success-50 text-success-700';
  }
  return 'border-warning-200 bg-warning-50 text-warning-700';
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

const AdminUsers = () => {
  /* ---------- URL + localStorage state (via usePageState) ---------- */
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
    namespace: 'admin.users',
    urlDefaults: URL_DEFAULTS,
    filterKeys: FILTER_KEYS,
  });

  const {
    search,
    role: roleFilter,
    verified: verifiedFilter,
    sortBy,
    sortOrder,
    page: currentPage,
  } = filters;

  /* ---------- data state ---------- */
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ---------- debounced search (fetch only) ---------- */
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  /* ---------- modals ---------- */
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState('');

  const [statsModal, setStatsModal] = useState({
    isOpen: false,
    userId: null,
    defaultTab: 'analytics',
  });

  const openStatsModal = (userId, tab = 'analytics') =>
    setStatsModal({ isOpen: true, userId, defaultTab: tab });

  const closeStatsModal = () =>
    setStatsModal({ isOpen: false, userId: null, defaultTab: 'analytics' });

  /* ---------- grid style derived from persisted gridCols ---------- */
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }),
    [gridCols]
  );

  /* ============================================================
     FILTER OPTIONS
  ============================================================ */

  const roleOptions = useMemo(
    () => [
      { value: '', label: 'All Roles', icon: Users },
      { value: 'user', label: 'User', icon: User },
      { value: 'admin', label: 'Admin', icon: ShieldCheck },
      { value: 'super_admin', label: 'Super Admin', icon: ShieldAlert },
    ],
    []
  );

  const verifiedOptions = useMemo(
    () => [
      { value: '', label: 'All Users', icon: Users },
      { value: 'true', label: 'Verified', icon: CheckCircle },
      { value: 'false', label: 'Unverified', icon: Clock },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'created_at', label: 'Newest First', icon: ArrowDown },
      { value: 'full_name', label: 'Name A-Z', icon: ArrowUpDown },
      { value: 'email', label: 'Email', icon: User },
      { value: 'role', label: 'Role', icon: Shield },
    ],
    []
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter) count++;
    if (verifiedFilter) count++;
    if (sortBy !== 'created_at') count++;
    if (sortOrder !== 'desc') count++;
    return count;
  }, [roleFilter, verifiedFilter, sortBy, sortOrder]);

  const hasActiveFilters =
    Boolean(roleFilter) ||
    Boolean(verifiedFilter) ||
    Boolean(search) ||
    sortBy !== 'created_at' ||
    sortOrder !== 'desc';

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        ...(debouncedSearch && { search: debouncedSearch }),
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
  }, [
    currentPage,
    debouncedSearch,
    roleFilter,
    verifiedFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const clearAllFilters = () => setFilters({ ...URL_DEFAULTS });

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

  /* ============================================================
     HELPERS
  ============================================================ */

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /* ============================================================
     STATS
  ============================================================ */

  const stats = useMemo(
    () => ({
      total,
      admins: users.filter(
        (u) => u.role === 'admin' || u.role === 'super_admin'
      ).length,
      verified: users.filter((u) => u.email_verified).length,
      banned: users.filter((u) => u.ban_status === 'banned').length,
    }),
    [users, total]
  );

  /* ============================================================
     ACTIVE FILTER CHIPS
  ============================================================ */

  const activeFilterChips = [
    roleFilter && {
      key: 'role',
      label: getRoleLabel(roleFilter),
      onRemove: () => setFilters({ role: '' }),
    },
    verifiedFilter && {
      key: 'verified',
      label: verifiedFilter === 'true' ? 'Verified' : 'Unverified',
      onRemove: () => setFilters({ verified: '' }),
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

  if (loading && users.length === 0) return <UsersSkeleton />;

  /* ============================================================
     MENU ITEMS BUILDER
  ============================================================ */

  const buildMenuItems = (user) => [
    {
      key: 'view',
      icon: Eye,
      label: 'View Details',
      onClick: () => {
        setSelectedUser(user);
        setShowUserModal(true);
      },
    },
    {
      key: 'stats',
      icon: BarChart3,
      label: 'View Stats',
      onClick: () => openStatsModal(user.id, 'analytics'),
    },
    {
      key: 'role',
      icon: Shield,
      label: 'Change Role',
      onClick: () => {
        setSelectedUser(user);
        setShowRoleModal(true);
        setNewRole(user.role || 'user');
      },
    },
    {
      key: 'ban',
      icon: user.ban_status === 'banned' ? UserCheck : UserX,
      label: user.ban_status === 'banned' ? 'Unban User' : 'Ban User',
      onClick: () => {
        setSelectedUser(user);
        setShowBanModal(true);
      },
    },
    ...(user.role !== 'super_admin'
      ? [
          { key: 'divider-delete', divider: true },
          {
            key: 'delete',
            icon: Trash2,
            label: 'Delete',
            danger: true,
            onClick: () => {
              setSelectedUser(user);
              setShowDeleteModal(true);
            },
          },
        ]
      : []),
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
                <Users size={14} />
                <span>User management</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                User Management
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>{total.toLocaleString()} users</span>
                <span className="text-ink-300">·</span>
                <span>Manage platform accounts and access</span>
              </p>
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.total}
            subtext="Across the platform"
            icon={Users}
            tone="ink"
          />
          <StatCard
            label="Admins"
            value={stats.admins}
            subtext="Current page"
            icon={ShieldCheck}
            tone="primary"
          />
          <StatCard
            label="Verified"
            value={stats.verified}
            subtext="Current page"
            icon={CheckCircle}
            tone="success"
          />
          <StatCard
            label="Banned"
            value={stats.banned}
            subtext="Current page"
            icon={UserX}
            tone="danger"
          />
        </section>

        {/* FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search users by name or email..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchUsers}
          refreshing={loading}
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
              options={roleOptions}
              value={roleFilter}
              onChange={(v) => setFilters({ role: v })}
              placeholder="All Roles"
              showIcon
            />

            <Select
              options={verifiedOptions}
              value={verifiedFilter}
              onChange={(v) => setFilters({ verified: v })}
              placeholder="All Users"
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink-500">
            {users.length === total
              ? total === 1
                ? '1 user'
                : `${total.toLocaleString()} users`
              : `Showing ${users.length} of ${total.toLocaleString()} users`}
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
        {users.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Users size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                No users found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters to find the user you are looking for.'
                  : 'No users have registered yet.'}
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
                      User
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Location
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100">
                  {users.map((user) => {
                    const StatusIconComp = getStatusIcon(user);

                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-ink-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                                <User size={14} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="block truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                              >
                                {user.full_name || 'Anonymous'}
                              </button>

                              <p className="truncate text-[11px] font-bold text-ink-400">
                                {user.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getRoleBadge(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusBadge(
                              user
                            )}`}
                          >
                            <StatusIconComp size={11} />
                            {getStatusLabel(user)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-xs font-bold text-ink-500">
                          {user.location?.country || '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3.5 text-xs font-bold text-ink-500">
                          {formatDate(user.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openStatsModal(user.id, 'analytics')
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="View Stats"
                            >
                              <BarChart3 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRoleModal(true);
                                setNewRole(user.role || 'user');
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                              title="Change Role"
                            >
                              <Shield size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowBanModal(true);
                              }}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                user.ban_status === 'banned'
                                  ? 'text-danger-600 hover:bg-danger-50'
                                  : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                              }`}
                              title={
                                user.ban_status === 'banned'
                                  ? 'Unban User'
                                  : 'Ban User'
                              }
                            >
                              {user.ban_status === 'banned' ? (
                                <UserCheck size={15} />
                              ) : (
                                <UserX size={15} />
                              )}
                            </button>

                            <ActionMenu
                              items={buildMenuItems(user)}
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
            {users.map((user) => {
              const StatusIconComp = getStatusIcon(user);

              return (
                <motion.div
                  key={user.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="group flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                            <User size={14} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="block truncate text-left text-sm font-extrabold text-ink-950 transition hover:text-primary-600"
                          >
                            {user.full_name || 'Anonymous'}
                          </button>

                          <p className="truncate text-[11px] font-bold text-ink-400">
                            {user.email || 'No email'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusBadge(
                          user
                        )}`}
                      >
                        <StatusIconComp size={11} />
                        {getStatusLabel(user)}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-ink-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {user.location?.country || 'N/A'}
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openStatsModal(user.id, 'analytics')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="View Stats"
                      >
                        <BarChart3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                          setNewRole(user.role || 'user');
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        title="Change Role"
                      >
                        <Shield size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowBanModal(true);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          user.ban_status === 'banned'
                            ? 'text-danger-600 hover:bg-danger-50'
                            : 'text-ink-400 hover:bg-ink-50 hover:text-primary-600'
                        }`}
                        title={
                          user.ban_status === 'banned'
                            ? 'Unban User'
                            : 'Ban User'
                        }
                      >
                        {user.ban_status === 'banned' ? (
                          <UserCheck size={15} />
                        ) : (
                          <UserX size={15} />
                        )}
                      </button>

                      <ActionMenu
                        items={buildMenuItems(user)}
                        placement="top"
                        align="right"
                      />
                    </div>

                    {user.role !== 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </motion.div>
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
              users
            </p>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setFilters({ page: p })}
            />
          </div>
        )}
      </div>

      {/* ============================================================
          MODALS
      ============================================================ */}

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
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-ink-950">
                User Details
              </h2>

              <div className="ml-auto flex items-center gap-3">
                <Link
                  to={`/admin/users-profile/${selectedUser?.id || ''}`}
                  className="shrink-0 text-ink-400 transition hover:text-primary-600"
                  title="View user details"
                >
                  <CircleArrowOutUpRight size={15} />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
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
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border border-ink-100 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
                  <User size={18} />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-ink-950">
                  {selectedUser.full_name || 'Anonymous'}
                </h3>

                <p className="truncate text-xs font-bold text-ink-500">
                  {selectedUser.email}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${getRoleBadge(
                      selectedUser.role
                    )}`}
                  >
                    {getRoleLabel(selectedUser.role)}
                  </span>

                  {(() => {
                    const StatusIconComp = getStatusIcon(selectedUser);
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${getStatusBadge(
                          selectedUser
                        )}`}
                      >
                        <StatusIconComp size={10} />
                        {getStatusLabel(selectedUser)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Location
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {selectedUser.location?.country || 'Not specified'}
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Country
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {selectedUser.country || 'Not specified'}
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Phone
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {selectedUser.phone || 'Not specified'}
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Joined
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-950">
                  {formatDate(selectedUser.created_at)}
                </p>
              </div>
            </div>

            {selectedUser.bio && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Bio
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-ink-700">
                  {selectedUser.bio}
                </p>
              </div>
            )}

            {selectedUser.ban_status === 'banned' && (
              <div className="space-y-1 rounded-2xl border border-danger-200 bg-danger-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-danger-600">
                  Ban Information
                </p>

                <p className="mt-1 text-sm font-bold text-danger-700">
                  <span className="font-extrabold">Reason:</span>{' '}
                  {selectedUser.ban_reason || 'No reason provided'}
                </p>

                <p className="text-xs font-medium text-danger-600">
                  <span className="font-extrabold">Banned at:</span>{' '}
                  {formatDate(selectedUser.banned_at)}
                </p>

                {selectedUser.ban_duration &&
                  selectedUser.ban_duration !== 'permanent' && (
                    <p className="text-xs font-medium text-danger-600">
                      <span className="font-extrabold">Duration:</span>{' '}
                      {selectedUser.ban_duration}
                    </p>
                  )}

                {selectedUser.ban_count > 0 && (
                  <p className="text-xs font-medium text-danger-500">
                    <span className="font-extrabold">Ban Count:</span>{' '}
                    {selectedUser.ban_count}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

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
          <div className="space-y-5">
            <p className="text-sm font-medium text-ink-500">
              Change role for{' '}
              <span className="font-extrabold text-ink-950">
                {selectedUser.full_name}
              </span>
            </p>

            <div className="space-y-2">
              {[
                { value: 'user', label: 'User', icon: User, color: 'ink' },
                {
                  value: 'admin',
                  label: 'Admin',
                  icon: ShieldCheck,
                  color: 'primary',
                },
                {
                  value: 'super_admin',
                  label: 'Super Admin',
                  icon: ShieldAlert,
                  color: 'danger',
                },
              ].map(({ value, label, icon: IconComponent, color }) => {
                const isSelected = newRole === value;

                const colorMap = {
                  ink: 'border-ink-400 bg-ink-50 text-ink-700',
                  primary: 'border-primary-400 bg-primary-50 text-primary-700',
                  danger: 'border-danger-400 bg-danger-50 text-danger-700',
                };

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewRole(value)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? colorMap[color]
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
                      <IconComponent size={15} />
                    </span>

                    <span className="text-sm font-extrabold">{label}</span>

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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole('');
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRoleChange}
                disabled={
                  actionLoading || !newRole || newRole === selectedUser.role
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Changing...
                  </>
                ) : (
                  'Change Role'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

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
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-danger-900">
                  Delete this user?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                  Are you sure you want to delete{' '}
                  <strong>{selectedUser.full_name}</strong>? This action cannot
                  be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading || selectedUser.role === 'super_admin'}
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
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AdminUserStats
        isOpen={statsModal.isOpen}
        userId={statsModal.userId}
        onClose={closeStatsModal}
        defaultTab={statsModal.defaultTab}
      />
    </div>
  );
};

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

export default AdminUsers;