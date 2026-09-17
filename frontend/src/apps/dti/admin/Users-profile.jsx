import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  UserX,
  UserMinus,
  CheckCircle,
  Clock,
  User,
  ArrowLeft,
  Shield,
  Pencil,
  UserCheck,
  Trash2,
  Gift,
  Package,
  FileText,
  IdCard,
  BookOpen,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Image as ImageIcon,
  CircleArrowOutUpRight,
  Inbox,
  ShieldCheck,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

import { adminAPI } from '@/services/api/dtiApi';
import {
  getCategoryByValue,
  getStatusDisplay,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import BanModal from './BanModal';
import AdminUserStats from './Users-stats';

// ============================================================
// Skeleton
// ============================================================
const ProfileSkeleton = () => (
  <div className="">
    <div className="space-y-5">
      <PageNavigationSkeleton />
      {/* PROFILE CARD */}
      <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
        <div className="h-28 animate-pulse bg-gradient-to-r from-primary-100 via-brand-100 to-primary-50" />
        <div className="px-5 pb-6 sm:px-6 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="h-20 w-20 shrink-0 rounded-2xl border-4 border-white bg-ink-200 animate-pulse sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-2 animate-pulse">
              <div className="h-6 w-48 rounded bg-ink-200" />
              <div className="h-4 w-64 rounded bg-ink-200" />
              <div className="h-3 w-32 rounded bg-ink-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-xl bg-ink-200 animate-pulse" />
              <div className="h-9 w-20 rounded-xl bg-ink-200 animate-pulse" />
            </div>
          </div>
        </div>
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
              <div className="mt-1 h-3 w-24 rounded bg-ink-200" />
            </div>
          </div>
        ))}
      </div>

      {/* DETAILS + SIDEBAR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-ink-100/80 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="animate-pulse">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-ink-200" />
                <div className="h-5 w-32 rounded bg-ink-200" />
              </div>
              <div className="h-5 w-12 rounded bg-ink-200" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div key={i} className="flex items-center justify-between border-b border-ink-50 pb-3">
                  <div className="h-3 w-20 rounded bg-ink-200" />
                  <div className="h-4 w-32 rounded bg-ink-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          {[1, 2].map((section) => (
            <div key={section} className="rounded-2xl border border-ink-100/80 bg-white p-5 shadow-sm">
              <div className="animate-pulse">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-ink-200" />
                    <div className="h-5 w-20 rounded bg-ink-200" />
                  </div>
                  <div className="h-5 w-12 rounded bg-ink-200" />
                </div>
                <div className="h-4 w-full rounded bg-ink-200" />
                <div className="mt-2 h-4 w-4/5 rounded bg-ink-200" />
                <div className="mt-2 h-4 w-3/5 rounded bg-ink-200" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIST SECTIONS */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-ink-200" />
                  <div className="h-5 w-32 rounded bg-ink-200" />
                </div>
                <div className="h-5 w-16 rounded bg-ink-200" />
              </div>
            </div>
          </div>
          <div className="divide-y divide-ink-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-10 w-10 rounded-xl bg-ink-200 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-1 animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-ink-200" />
                  <div className="h-3 w-1/2 rounded bg-ink-200" />
                </div>
                <div className="h-5 w-16 rounded-full bg-ink-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Stat Card
// ============================================================
function StatCard({ label, value, icon: Icon, color = 'text-primary-600', bg = 'bg-primary-50', subtext }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`${color} h-4 w-4`} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtext && <p className="mt-0.5 text-xs font-medium text-ink-400">{subtext}</p>}
    </div>
  );
}

// ============================================================
// Detail Row
// ============================================================
function DetailRow({ label, value, badge, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-50 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs font-bold text-ink-500">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-extrabold text-ink-900">
        {badge ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${badge}`}>
            {Icon && <Icon className="h-3 w-3" />}
            {value}
          </span>
        ) : (
          value || '—'
        )}
      </span>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
const AdminUserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [showBanModal, setShowBanModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Stats Modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsDefaultTab, setStatsDefaultTab] = useState('items');

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    location: '',
    country: '',
    phone: '',
    bio: '',
  });

  // Fetch Profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const response = await adminAPI.getUser(userId);
      if (!response?.data) throw new Error('No data received from server');

      const userData = response.data.user || response.data.profile || response.data;
      const applications = userData.applications || [];

      const profileWithArrays = {
        ...userData,
        items_given: userData.items_given || [],
        items_received: userData.items_received || [],
        applications,
        wins: userData.wins || [],
        items_given_count: userData.items_given_count ?? userData.items_given?.length ?? 0,
        items_received_count: userData.items_received_count ?? userData.items_received?.length ?? 0,
        applications_count: userData.applications_count ?? applications.length ?? 0,
        pending_applications: userData.pending_applications ?? applications.filter((item) => item.status === 'pending').length,
        wins_count: userData.wins_count ?? userData.wins?.length ?? 0,
      };

      setProfile(profileWithArrays);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(error?.response?.data?.error || 'Failed to load user profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Actions
  const handleBan = async (userId, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(userId, banData);
      toast.success('User banned successfully');
      await fetchProfile();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to ban user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (userId, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(userId, banData);
      toast.success('User unbanned successfully');
      await fetchProfile();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to unban user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!profile || !newRole) return;
    setActionLoading(true);

    try {
      await adminAPI.changeUserRole(profile.id, { role: newRole });
      toast.success(`Role changed to ${newRole}`);
      setShowRoleModal(false);
      setNewRole('');
      await fetchProfile();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!profile) return;
    setActionLoading(true);

    try {
      await adminAPI.deleteUser(profile.id);
      toast.success('User deleted');
      setShowDeleteModal(false);
      navigate('/admin/users');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setActionLoading(true);

    try {
      await adminAPI.updateUser(profile.id, editForm);
      toast.success('Profile updated successfully');
      setShowEditModal(false);
      await fetchProfile();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || '',
      location: profile.location || '',
      country: profile.country || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
    });
    setShowEditModal(true);
  };

  // Helpers
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
    const labels = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' };
    return labels[role] || role || 'User';
  };

  const getStatusBadge = (user) => {
    if (user?.ban_status === 'banned') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (user?.ban_status === 'deleted') return 'bg-ink-50 text-ink-400 border-ink-200';
    if (user?.email_verified) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getStatusLabel = (user) => {
    if (user?.ban_status === 'banned') return 'Banned';
    if (user?.ban_status === 'deleted') return 'Deleted';
    if (user?.email_verified) return 'Active';
    return 'Unverified';
  };

  const getStatusIcon = (user) => {
    if (user?.ban_status === 'banned') return UserX;
    if (user?.ban_status === 'deleted') return UserMinus;
    if (user?.email_verified) return CheckCircle;
    return Clock;
  };

  const getItemBadge = (status) => {
    const badge = getStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      blue: 'bg-sky-50 text-sky-700 border-sky-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      label: badge?.label || status,
      className: colorMap[badge?.color] || colorMap.gray,
    };
  };

  const getApplicationBadge = (status) => {
    const badge = getApplicationStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      label: badge?.label || status,
      className: colorMap[badge?.color] || colorMap.gray,
    };
  };

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  if (loading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2">
        <PageNavigation />
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-ink-100/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300 shadow-sm">
              <UserX className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-extrabold text-ink-800">User Not Found</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              The requested user does not exist or could not be loaded.
            </p>
            <Link
              to="/admin/users"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5 pb-10">
        <PageNavigation />
        {/* PROFILE CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-primary-500 via-brand-500 to-primary-600" />

          <div className="px-5 pb-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end -mt-10">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-ink-100 text-ink-400 shadow-lg sm:h-24 sm:w-24">
                    <User className="h-12 w-12" />
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white ${
                    profile.ban_status === 'banned'
                      ? 'bg-rose-500'
                      : profile.email_verified
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                >
                  {(() => {
                    const Icon = getStatusIcon(profile);
                    return <Icon className="h-3 w-3 text-white" />;
                  })()}
                </span>
              </div>

              {/* User info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
                    {profile.full_name || 'Anonymous'}
                  </h1>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getRoleBadge(profile.role)}`}>
                    {getRoleLabel(profile.role)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusBadge(
                      profile
                    )}`}
                  >
                    {(() => {
                      const Icon = getStatusIcon(profile);
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {getStatusLabel(profile)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-ink-500">{profile.email || 'No email address'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Joined {formatDate(profile.created_at)}
                  </span>
                  {profile.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {profile.location}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    setShowRoleModal(true);
                    setNewRole(profile.role || 'user');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-extrabold text-primary-700 transition hover:bg-primary-100"
                >
                  <Shield className="h-4 w-4" />
                  Role
                </button>
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowBanModal(true)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                    profile.ban_status === 'banned'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {profile.ban_status === 'banned' ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  {profile.ban_status === 'banned' ? 'Unban' : 'Ban'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={profile.role === 'super_admin'}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Items Given"
            value={profile.items_given_count || 0}
            icon={Gift}
            subtext="Donated items"
          />
          <StatCard
            label="Items Received"
            value={profile.items_received_count || 0}
            icon={Package}
            subtext="Items won"
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard
            label="Applications"
            value={profile.applications_count || 0}
            icon={FileText}
            subtext="All applications"
            color="text-brand-600"
            bg="bg-brand-50"
          />
          <StatCard
            label="Pending"
            value={profile.pending_applications || 0}
            icon={Clock}
            subtext="Awaiting review"
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        {/* DETAILS + SIDEBAR */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* User details */}
          <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <IdCard className="h-4 w-4" />
                </div>
                <h3 className="truncate text-sm font-extrabold text-ink-800">User Details</h3>
              </div>
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 hover:text-primary-700"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
            <div className="space-y-3 p-5">
              <DetailRow label="Full Name" value={profile.full_name || 'Not specified'} />
              <DetailRow label="Email" value={profile.email || 'Not specified'} />
              <DetailRow label="Phone" value={profile.phone || 'Not specified'} />
              <DetailRow label="Location" value={profile.location || 'Not specified'} />
              <DetailRow label="Country" value={profile.country || 'Not specified'} />
              <DetailRow label="Role" value={getRoleLabel(profile.role)} badge={getRoleBadge(profile.role)} />
              <DetailRow
                label="Status"
                value={getStatusLabel(profile)}
                badge={getStatusBadge(profile)}
                icon={getStatusIcon(profile)}
              />
              <DetailRow label="Email Verified" value={profile.email_verified ? 'Yes' : 'No'} />
              <DetailRow label="Joined" value={formatDate(profile.created_at)} />
              <DetailRow label="Rating" value={`${profile.rating || 0} (${profile.rating_count || 0} reviews)`} />
              {profile.ban_count > 0 && <DetailRow label="Ban Count" value={profile.ban_count} />}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-2">
            {/* Bio */}
            <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <h3 className="truncate text-sm font-extrabold text-ink-800">About</h3>
                </div>
                <button
                  onClick={openEditModal}
                  className="text-xs font-extrabold text-primary-600"
                >
                  {profile.bio ? 'Edit' : 'Add'}
                </button>
              </div>
              <div className="p-5">
                {profile.bio ? (
                  <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-ink-600">{profile.bio}</p>
                ) : (
                  <div className="rounded-xl bg-ink-50 p-4 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-ink-300" />
                    <p className="mt-2 text-xs font-medium italic text-ink-400">No bio provided</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ban Information */}
            {profile.ban_status === 'banned' && (
              <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/60 shadow-sm">
                <div className="border-b border-rose-200 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-rose-700">
                    <ShieldAlert className="h-4 w-4" />
                    Ban Information
                  </h3>
                </div>
                <div className="space-y-3 p-5">
                  <DetailRow label="Reason" value={profile.ban_reason || 'No reason provided'} />
                  <DetailRow label="Banned At" value={formatDate(profile.banned_at)} />
                  {profile.ban_duration && profile.ban_duration !== 'permanent' && (
                    <DetailRow label="Duration" value={profile.ban_duration} />
                  )}
                  {profile.banned_until && profile.ban_duration !== 'permanent' && (
                    <DetailRow label="Auto-unban" value={formatDate(profile.banned_until)} />
                  )}
                  {profile.banned_by_name && <DetailRow label="Banned By" value={profile.banned_by_name} />}
                </div>
              </div>
            )}

            {/* Stats buttons */}
            <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-ink-800">User Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('items');
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-extrabold text-ink-700">Items</span>
                  </div>
                  <span className="ml-2 text-xs font-extrabold text-ink-400">{profile.items_given_count || 0}</span>
                </button>

                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('applications');
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-extrabold text-ink-700">Applications</span>
                  </div>
                  <span className="ml-2 text-xs font-extrabold text-ink-400">{profile.applications_count || 0}</span>
                </button>

                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('wins');
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-extrabold text-ink-700">Wins</span>
                  </div>
                  <span className="ml-2 text-xs font-extrabold text-ink-400">{profile.wins_count || 0}</span>
                </button>

                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('analytics');
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-extrabold text-ink-700">Analytics</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS GIVEN */}
        {profile.items_given?.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Gift className="h-4 w-4" />
                </div>
                <h3 className="truncate text-sm font-extrabold text-ink-800">
                  Items Given ({profile.items_given.length})
                </h3>
              </div>
              {profile.items_given.length > 5 && (
                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('items');
                  }}
                  className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
                >
                  View all
                </button>
              )}
            </div>
            <div className="divide-y divide-ink-50">
              {profile.items_given.slice(0, 5).map((item) => {
                const category = getCategoryByValue(item.category);
                const badge = getItemBadge(item.status);
                return (
                  <div key={item.id} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-primary-50/20">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-ink-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-900">{item.title || 'Untitled Item'}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {category && renderIcon(category.icon, 'w-3 h-3', category.color)}
                        <span className="truncate text-xs font-medium text-ink-400">{item.category || 'Uncategorized'}</span>
                        <span className="text-ink-300">•</span>
                        <span className="shrink-0 text-xs font-medium text-ink-400">{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    <span className={`hidden rounded-full border px-2 py-1 text-[10px] font-bold sm:inline-flex ${badge.className}`}>
                      {badge.label}
                    </span>
                    <Link
                      to={`/item/${item.id}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-300 transition hover:bg-primary-50 hover:text-primary-600"
                    >
                      <CircleArrowOutUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ITEMS RECEIVED */}
        {profile.items_received?.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Package className="h-4 w-4" />
                </div>
                <h3 className="truncate text-sm font-extrabold text-ink-800">
                  Items Received ({profile.items_received.length})
                </h3>
              </div>
              {profile.items_received.length > 5 && (
                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('wins');
                  }}
                  className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
                >
                  View all
                </button>
              )}
            </div>
            <div className="divide-y divide-ink-50">
              {profile.items_received.slice(0, 5).map((item) => {
                const category = getCategoryByValue(item.category);
                return (
                  <div key={item.id} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-primary-50/20">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-ink-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-900">{item.title || 'Untitled Item'}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {category && renderIcon(category.icon, 'w-3 h-3', category.color)}
                        <span className="truncate text-xs font-medium text-ink-400">{item.category || 'Uncategorized'}</span>
                        <span className="text-ink-300">•</span>
                        <span className="text-xs font-medium text-ink-400">{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    <Link
                      to={`/item/${item.id}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-300 transition hover:bg-primary-50 hover:text-primary-600"
                    >
                      <CircleArrowOutUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APPLICATIONS */}
        {profile.applications?.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="truncate text-sm font-extrabold text-ink-800">
                  Applications ({profile.applications.length})
                </h3>
              </div>
              {profile.applications.length > 5 && (
                <button
                  onClick={() => {
                    setStatsModalOpen(true);
                    setStatsDefaultTab('applications');
                  }}
                  className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
                >
                  View all
                </button>
              )}
            </div>
            <div className="divide-y divide-ink-50">
              {profile.applications.slice(0, 5).map((app) => {
                const badge = getApplicationBadge(app.status);
                return (
                  <div key={app.id} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-primary-50/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-900">{app.item?.title || 'Unknown Item'}</p>
                      <p className="mt-0.5 text-xs font-medium text-ink-400">Applied {formatDate(app.created_at)}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                    {app.item?.id && (
                      <Link
                        to={`/item/${app.item.id}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-300 transition hover:bg-primary-50 hover:text-primary-600"
                      >
                        <CircleArrowOutUpRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!profile.items_given?.length && !profile.items_received?.length && !profile.applications?.length && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-sm font-extrabold text-ink-700">No activity yet</h3>
            <p className="mt-1 text-xs font-medium text-ink-400">This user hasn't created any items or applications.</p>
          </div>
        )}

        {/* MODALS */}

        {/* BAN MODAL */}
        <BanModal
          isOpen={showBanModal}
          onClose={() => setShowBanModal(false)}
          user={profile}
          onBan={handleBan}
          onUnban={handleUnban}
          loading={actionLoading}
          title="Ban User"
        />

        {/* EDIT PROFILE MODAL */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile" size="md">
          <form onSubmit={handleEditProfile} className="space-y-6">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-ink-700">Full Name</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-ink-700">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-ink-700">Country</label>
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  placeholder="Country"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-ink-700">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-ink-700">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={4}
                className="w-full resize-none rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                placeholder="Write something about this user..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* ROLE MODAL */}
        <Modal isOpen={showRoleModal} onClose={() => { setShowRoleModal(false); setNewRole(''); }} title="Change User Role" size="sm">
          <div className="space-y-6">
            <p className="text-sm font-medium text-ink-500">
              Choose a new role for{' '}
              <span className="font-extrabold text-ink-900">{profile?.full_name || profile?.email}</span>
            </p>

            <div className="space-y-2">
              {roleOptions.map((role) => {
                const selected = newRole === role.value;
                const roleStyles = {
                  user: 'border-ink-300 bg-ink-50 text-ink-800',
                  admin: 'border-primary-300 bg-primary-50 text-primary-800',
                  super_admin: 'border-rose-300 bg-rose-50 text-rose-800',
                };

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setNewRole(role.value)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                      selected
                        ? roleStyles[role.value]
                        : 'border-transparent bg-ink-50/50 text-ink-700 hover:border-ink-100 hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      {role.value === 'super_admin' ? (
                        <ShieldCheck className="h-5 w-5 text-rose-600" />
                      ) : role.value === 'admin' ? (
                        <Shield className="h-5 w-5 text-primary-600" />
                      ) : (
                        <User className="h-5 w-5 text-ink-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">{role.label}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                        {role.value === 'super_admin'
                          ? 'Full system permissions'
                          : role.value === 'admin'
                          ? 'Administrative access'
                          : 'Standard account permissions'}
                      </p>
                    </div>
                    {selected && <CheckCircle className="h-5 w-5 text-primary-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t border-ink-100">
              <button
                onClick={() => { setShowRoleModal(false); setNewRole(''); }}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={actionLoading || !newRole || newRole === profile?.role}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Change Role
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* DELETE MODAL */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User" size="sm">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm leading-relaxed text-ink-600">
                  Are you sure you want to permanently delete this user? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-xs font-bold text-ink-400">Account</p>
              <p className="mt-1 text-sm font-extrabold text-ink-900">{profile.full_name || 'Anonymous'}</p>
              <p className="text-xs text-ink-400">{profile.email || 'No email'}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-all hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading || profile.role === 'super_admin'}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* REPLACED STATS MODAL WITH AdminUserStats */}
      </div>

      {/* AdminUserStats - rendered outside the main container but still within the component */}
      <AdminUserStats
        isOpen={statsModalOpen}
        userId={userId}
        defaultTab={statsDefaultTab}
        onClose={() => setStatsModalOpen(false)}
      />
    </div>
  );
};

export default AdminUserProfile;