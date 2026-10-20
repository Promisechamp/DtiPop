// src/admin/AdminUserProfile.jsx

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
import Modal from '@/reusables/Modal';
import BanModal from './BanModal';
import AdminUserStats from './Users-stats';

/* ============================================================
   SKELETON
============================================================ */

const ProfileSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-ink-200" />
        </div>

        {/* PROFILE CARD */}
        <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
          <div className="h-28 animate-pulse bg-ink-100" />

          <div className="px-5 pb-6 pt-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl border-4 border-white bg-ink-200 sm:h-24 sm:w-24" />

              <div className="flex-1 animate-pulse space-y-2">
                <div className="h-6 w-48 rounded bg-ink-200" />
                <div className="h-4 w-64 rounded bg-ink-200" />
                <div className="h-3 w-32 rounded bg-ink-200" />
              </div>

              <div className="flex gap-2">
                <div className="h-9 w-20 animate-pulse rounded-xl bg-ink-200" />
                <div className="h-9 w-16 animate-pulse rounded-xl bg-ink-200" />
                <div className="h-9 w-16 animate-pulse rounded-xl bg-ink-200" />
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
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
              <div className="mt-1.5 h-2.5 w-24 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* DETAILS + SIDEBAR */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="h-4 w-12 animate-pulse rounded bg-ink-100" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-ink-100 pb-3"
                >
                  <div className="h-3 w-20 animate-pulse rounded bg-ink-100" />
                  <div className="h-3.5 w-32 animate-pulse rounded bg-ink-100" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                    <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full animate-pulse rounded bg-ink-100" />
                  <div className="h-3.5 w-4/5 animate-pulse rounded bg-ink-100" />
                  <div className="h-3.5 w-3/5 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LISTS */}
        {Array.from({ length: 3 }).map((_, section) => (
          <div
            key={section}
            className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
          >
            <div className="border-b border-ink-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-ink-100" />
              </div>
            </div>

            <div className="divide-y divide-ink-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-ink-100" />
                  <div className="flex-1 space-y-1.5 animate-pulse">
                    <div className="h-3.5 w-3/4 rounded bg-ink-100" />
                    <div className="h-2.5 w-1/2 rounded bg-ink-100" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
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
    brand: { color: 'text-brand-600', bg: 'bg-brand-50' },
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
   DETAIL ROW
============================================================ */

function DetailRow({ label, value, badge, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs font-bold text-ink-500">{label}</span>

      <span className="max-w-[65%] text-right text-sm font-extrabold text-ink-950">
        {badge ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge}`}
          >
            {Icon && <Icon size={10} />}
            {value}
          </span>
        ) : (
          value || '—'
        )}
      </span>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon size={15} />
        </div>

        <h3 className="truncate text-sm font-extrabold text-ink-950">
          {title}
        </h3>
      </div>

      {action}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

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

  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsDefaultTab, setStatsDefaultTab] = useState('items');

  const [editForm, setEditForm] = useState({
    full_name: '',
    location: '',
    country: '',
    phone: '',
    bio: '',
  });

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const response = await adminAPI.getUser(userId);
      if (!response?.data) throw new Error('No data received from server');

      const userData =
        response.data.user || response.data.profile || response.data;
      const applications = userData.applications || [];

      setProfile({
        ...userData,
        items_given: userData.items_given || [],
        items_received: userData.items_received || [],
        applications,
        wins: userData.wins || [],
        items_given_count:
          userData.items_given_count ?? userData.items_given?.length ?? 0,
        items_received_count:
          userData.items_received_count ??
          userData.items_received?.length ??
          0,
        applications_count:
          userData.applications_count ?? applications.length ?? 0,
        pending_applications:
          userData.pending_applications ??
          applications.filter((item) => item.status === 'pending').length,
        wins_count: userData.wins_count ?? userData.wins?.length ?? 0,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(
        error?.response?.data?.error || 'Failed to load user profile'
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const handleBan = async (id, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(id, banData);
      toast.success('User banned successfully');
      await fetchProfile();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to ban user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (id, banData) => {
    setActionLoading(true);
    try {
      await adminAPI.banUser(id, banData);
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
      toast.error(
        error?.response?.data?.error || 'Failed to update profile'
      );
    } finally {
      setActionLoading(false);
    }
  };

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
    if (user?.ban_status === 'banned')
      return 'border-danger-200 bg-danger-50 text-danger-700';
    if (user?.ban_status === 'deleted')
      return 'border-ink-200 bg-ink-50 text-ink-400';
    if (user?.email_verified)
      return 'border-success-200 bg-success-50 text-success-700';
    return 'border-warning-200 bg-warning-50 text-warning-700';
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
      green: 'border-success-200 bg-success-50 text-success-700',
      yellow: 'border-warning-200 bg-warning-50 text-warning-700',
      blue: 'border-primary-200 bg-primary-50 text-primary-700',
      red: 'border-danger-200 bg-danger-50 text-danger-700',
      gray: 'border-ink-200 bg-ink-50 text-ink-600',
    };
    return {
      label: badge?.label || status,
      className: colorMap[badge?.color] || colorMap.gray,
    };
  };

  const getApplicationBadge = (status) => {
    const badge = getApplicationStatusDisplay(status);
    const colorMap = {
      green: 'border-success-200 bg-success-50 text-success-700',
      yellow: 'border-warning-200 bg-warning-50 text-warning-700',
      blue: 'border-primary-200 bg-primary-50 text-primary-700',
      red: 'border-danger-200 bg-danger-50 text-danger-700',
      gray: 'border-ink-200 bg-ink-50 text-ink-600',
    };
    return {
      label: badge?.label || status,
      className: colorMap[badge?.color] || colorMap.gray,
    };
  };

  const roleOptions = [
    {
      value: 'user',
      label: 'User',
      icon: User,
      description: 'Standard account permissions',
      selectedClasses: 'border-ink-400 bg-ink-50 text-ink-700',
      iconColor: 'text-ink-500',
    },
    {
      value: 'admin',
      label: 'Admin',
      icon: Shield,
      description: 'Administrative access',
      selectedClasses: 'border-primary-400 bg-primary-50 text-primary-700',
      iconColor: 'text-primary-600',
    },
    {
      value: 'super_admin',
      label: 'Super Admin',
      icon: ShieldCheck,
      description: 'Full system permissions',
      selectedClasses: 'border-danger-400 bg-danger-50 text-danger-700',
      iconColor: 'text-danger-600',
    },
  ];

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) return <ProfileSkeleton />;

  /* ============================================================
     NOT FOUND
  ============================================================ */

  if (!profile) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto w-full max-w-[1500px] space-y-7">
          <header>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              <User size={14} />
              <span>User management</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              User Profile
            </h1>
          </header>

          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <UserX size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                User Not Found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                The requested user does not exist or could not be loaded.
              </p>

              <Link
                to="/admin/users"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                <ArrowLeft size={15} />
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        {/* HEADER */}
        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <User size={14} />
                <span>User management</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                User Profile
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>Account details, activity and permissions</span>
              </p>
            </div>

            <Link
              to="/admin/users"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <ArrowLeft size={15} />
              Back to Users
            </Link>
          </div>
        </header>

        {/* PROFILE HERO */}
        <section className="relative overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-primary-500 via-brand-500 to-primary-600" />

          <div className="px-5 pb-6 sm:px-6">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-ink-100 text-ink-400 shadow-lg sm:h-24 sm:w-24">
                    <User size={48} />
                  </div>
                )}

                <span
                  className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white ${
                    profile.ban_status === 'banned'
                      ? 'bg-danger-500'
                      : profile.email_verified
                      ? 'bg-success-500'
                      : 'bg-warning-500'
                  }`}
                >
                  {(() => {
                    const Icon = getStatusIcon(profile);
                    return <Icon size={11} className="text-white" />;
                  })()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-ink-950">
                    {profile.full_name || 'Anonymous'}
                  </h2>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getRoleBadge(
                      profile.role
                    )}`}
                  >
                    {getRoleLabel(profile.role)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusBadge(
                      profile
                    )}`}
                  >
                    {(() => {
                      const Icon = getStatusIcon(profile);
                      return <Icon size={10} />;
                    })()}
                    {getStatusLabel(profile)}
                  </span>
                </div>

                <p className="mt-1 truncate text-xs font-bold text-ink-500">
                  {profile.email || 'No email address'}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    Joined {formatDate(profile.created_at)}
                  </span>

                  {profile.location && (
                    <>
                      <span className="text-ink-300">·</span>
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {profile.location}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(true);
                    setNewRole(profile.role || 'user');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-extrabold text-primary-700 transition hover:bg-primary-100"
                >
                  <Shield size={14} />
                  Role
                </button>

                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  <Pencil size={14} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setShowBanModal(true)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                    profile.ban_status === 'banned'
                      ? 'border-success-200 bg-success-50 text-success-700 hover:bg-success-100'
                      : 'border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100'
                  }`}
                >
                  {profile.ban_status === 'banned' ? (
                    <UserCheck size={14} />
                  ) : (
                    <UserX size={14} />
                  )}
                  {profile.ban_status === 'banned' ? 'Unban' : 'Ban'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={profile.role === 'super_admin'}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-extrabold text-danger-700 transition hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Items Given"
            value={profile.items_given_count || 0}
            icon={Gift}
            subtext="Donated items"
            tone="ink"
          />

          <StatCard
            label="Items Received"
            value={profile.items_received_count || 0}
            icon={Package}
            subtext="Items won"
            tone="success"
          />

          <StatCard
            label="Applications"
            value={profile.applications_count || 0}
            icon={FileText}
            subtext="All applications"
            tone="primary"
          />

          <StatCard
            label="Pending"
            value={profile.pending_applications || 0}
            icon={Clock}
            subtext="Awaiting review"
            tone="warning"
          />
        </section>

        {/* DETAILS + SIDEBAR */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* USER DETAILS */}
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm lg:col-span-3">
            <SectionHeader
              icon={IdCard}
              title="User Details"
              action={
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              }
            />

            <div className="space-y-3 p-5">
              <DetailRow
                label="Full Name"
                value={profile.full_name || 'Not specified'}
              />
              <DetailRow
                label="Email"
                value={profile.email || 'Not specified'}
              />
              <DetailRow
                label="Phone"
                value={profile.phone || 'Not specified'}
              />
              <DetailRow
                label="Location"
                value={profile.location || 'Not specified'}
              />
              <DetailRow
                label="Country"
                value={profile.country || 'Not specified'}
              />
              <DetailRow
                label="Role"
                value={getRoleLabel(profile.role)}
                badge={getRoleBadge(profile.role)}
              />
              <DetailRow
                label="Status"
                value={getStatusLabel(profile)}
                badge={getStatusBadge(profile)}
                icon={getStatusIcon(profile)}
              />
              <DetailRow
                label="Email Verified"
                value={profile.email_verified ? 'Yes' : 'No'}
              />
              <DetailRow
                label="Joined"
                value={formatDate(profile.created_at)}
              />
              <DetailRow
                label="Rating"
                value={`${profile.rating || 0} (${
                  profile.rating_count || 0
                } reviews)`}
              />

              {profile.ban_count > 0 && (
                <DetailRow label="Ban Count" value={profile.ban_count} />
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4 lg:col-span-2">
            {/* BIO */}
            <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
              <SectionHeader
                icon={BookOpen}
                title="About"
                action={
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    {profile.bio ? 'Edit' : 'Add'}
                  </button>
                }
              />

              <div className="p-5">
                {profile.bio ? (
                  <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-ink-700">
                    {profile.bio}
                  </p>
                ) : (
                  <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4 text-center">
                    <BookOpen
                      size={24}
                      className="mx-auto text-ink-300"
                    />
                    <p className="mt-2 text-[11px] font-bold italic text-ink-400">
                      No bio provided
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* BAN INFORMATION */}
            {profile.ban_status === 'banned' && (
              <div className="overflow-hidden rounded-[26px] border border-danger-200 bg-danger-50 shadow-sm">
                <div className="flex items-center gap-2 border-b border-danger-200 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                    <ShieldAlert size={15} />
                  </div>

                  <h3 className="text-sm font-extrabold text-danger-900">
                    Ban Information
                  </h3>
                </div>

                <div className="space-y-3 p-5">
                  <DetailRow
                    label="Reason"
                    value={profile.ban_reason || 'No reason provided'}
                  />
                  <DetailRow
                    label="Banned At"
                    value={formatDate(profile.banned_at)}
                  />

                  {profile.ban_duration &&
                    profile.ban_duration !== 'permanent' && (
                      <DetailRow
                        label="Duration"
                        value={profile.ban_duration}
                      />
                    )}

                  {profile.banned_until &&
                    profile.ban_duration !== 'permanent' && (
                      <DetailRow
                        label="Auto-unban"
                        value={formatDate(profile.banned_until)}
                      />
                    )}

                  {profile.banned_by_name && (
                    <DetailRow
                      label="Banned By"
                      value={profile.banned_by_name}
                    />
                  )}
                </div>
              </div>
            )}

            {/* USER STATS */}
            <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
              <SectionHeader icon={BarChart3} title="User Stats" />

              <div className="grid grid-cols-2 gap-2 p-4">
                {[
                  {
                    id: 'items',
                    label: 'Items',
                    count: profile.items_given_count || 0,
                    icon: Package,
                  },
                  {
                    id: 'applications',
                    label: 'Applications',
                    count: profile.applications_count || 0,
                    icon: FileText,
                  },
                  {
                    id: 'wins',
                    label: 'Wins',
                    count: profile.wins_count || 0,
                    icon: Trophy,
                  },
                  {
                    id: 'analytics',
                    label: 'Analytics',
                    count: null,
                    icon: TrendingUp,
                  },
                ].map(({ id, label, count, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setStatsModalOpen(true);
                      setStatsDefaultTab(id);
                    }}
                    className="group flex w-full items-center justify-between rounded-2xl border border-ink-100 bg-white p-3 text-left transition hover:border-ink-200 hover:bg-ink-50/60 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                        <Icon size={15} />
                      </div>

                      <span className="truncate text-xs font-extrabold text-ink-700">
                        {label}
                      </span>
                    </div>

                    {count !== null && (
                      <span className="ml-2 text-xs font-extrabold text-ink-400">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS GIVEN */}
        {profile.items_given?.length > 0 && (
          <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={Gift}
              title={`Items Given (${profile.items_given.length})`}
              action={
                profile.items_given.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatsModalOpen(true);
                      setStatsDefaultTab('items');
                    }}
                    className="text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    View all
                  </button>
                ) : null
              }
            />

            <div className="divide-y divide-ink-100">
              {profile.items_given.slice(0, 5).map((item) => {
                const category = getCategoryByValue(item.category);
                const badge = getItemBadge(item.status);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-300">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-950">
                        {item.title || 'Untitled Item'}
                      </p>

                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-400">
                        {category &&
                          renderIcon(
                            category.icon,
                            'h-3 w-3',
                            category.color
                          )}
                        <span className="truncate">
                          {item.category || 'Uncategorized'}
                        </span>
                        <span className="text-ink-300">·</span>
                        <span className="shrink-0">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-extrabold sm:inline-flex ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    <Link
                      to={`/item/${item.id}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                      aria-label="View item"
                    >
                      <CircleArrowOutUpRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ITEMS RECEIVED */}
        {profile.items_received?.length > 0 && (
          <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={Package}
              title={`Items Received (${profile.items_received.length})`}
              action={
                profile.items_received.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatsModalOpen(true);
                      setStatsDefaultTab('wins');
                    }}
                    className="text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    View all
                  </button>
                ) : null
              }
            />

            <div className="divide-y divide-ink-100">
              {profile.items_received.slice(0, 5).map((item) => {
                const category = getCategoryByValue(item.category);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-300">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-950">
                        {item.title || 'Untitled Item'}
                      </p>

                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-400">
                        {category &&
                          renderIcon(
                            category.icon,
                            'h-3 w-3',
                            category.color
                          )}
                        <span className="truncate">
                          {item.category || 'Uncategorized'}
                        </span>
                        <span className="text-ink-300">·</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>

                    <Link
                      to={`/item/${item.id}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                      aria-label="View item"
                    >
                      <CircleArrowOutUpRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* APPLICATIONS */}
        {profile.applications?.length > 0 && (
          <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={FileText}
              title={`Applications (${profile.applications.length})`}
              action={
                profile.applications.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatsModalOpen(true);
                      setStatsDefaultTab('applications');
                    }}
                    className="text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                  >
                    View all
                  </button>
                ) : null
              }
            />

            <div className="divide-y divide-ink-100">
              {profile.applications.slice(0, 5).map((app) => {
                const badge = getApplicationBadge(app.status);

                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-950">
                        {app.item?.title || 'Unknown Item'}
                      </p>

                      <p className="mt-0.5 text-[11px] font-bold text-ink-400">
                        Applied {formatDate(app.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    {app.item?.id && (
                      <Link
                        to={`/item/${app.item.id}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
                        aria-label="View item"
                      >
                        <CircleArrowOutUpRight size={15} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {!profile.items_given?.length &&
          !profile.items_received?.length &&
          !profile.applications?.length && (
            <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                  <Inbox size={27} />
                </div>

                <h2 className="mt-5 text-lg font-black text-ink-950">
                  No activity yet
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                  This user hasn't created any items or applications.
                </p>
              </div>
            </div>
          )}
      </div>

      {/* ============================================================
          BAN MODAL
      ============================================================ */}

      <BanModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        user={profile}
        onBan={handleBan}
        onUnban={handleUnban}
        loading={actionLoading}
        title="Ban User"
      />

      {/* ============================================================
          EDIT PROFILE MODAL
      ============================================================ */}

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          if (actionLoading) return;
          setShowEditModal(false);
        }}
        title="Edit Profile"
        size="md"
      >
        <form onSubmit={handleEditProfile} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
              Full Name
            </label>

            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              className="input-field"
              placeholder="Enter full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Location
              </label>

              <input
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="input-field"
                placeholder="City, State"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Country
              </label>

              <input
                type="text"
                value={editForm.country}
                onChange={(e) =>
                  setEditForm({ ...editForm, country: e.target.value })
                }
                className="input-field"
                placeholder="Country"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
              Phone
            </label>

            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              className="input-field"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
              Bio
            </label>

            <textarea
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
              rows={4}
              className="input-field resize-none"
              placeholder="Write something about this user..."
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================
          ROLE MODAL
      ============================================================ */}

      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setNewRole('');
        }}
        title="Change User Role"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm font-medium text-ink-500">
            Choose a new role for{' '}
            <span className="font-extrabold text-ink-950">
              {profile?.full_name || profile?.email}
            </span>
          </p>

          <div className="space-y-2">
            {roleOptions.map((role) => {
              const RoleIcon = role.icon;
              const isSelected = newRole === role.value;

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setNewRole(role.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? role.selectedClasses
                      : 'border-ink-100 bg-ink-50/60 text-ink-700 hover:bg-white'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isSelected
                        ? 'bg-white shadow-sm'
                        : 'bg-white text-ink-400'
                    }`}
                  >
                    <RoleIcon
                      size={15}
                      className={isSelected ? role.iconColor : ''}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{role.label}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-ink-400">
                      {role.description}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle
                      size={15}
                      className="text-primary-600"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowRoleModal(false);
                setNewRole('');
              }}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleRoleChange}
              disabled={
                actionLoading || !newRole || newRole === profile?.role
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Changing...
                </>
              ) : (
                <>
                  <Shield size={15} />
                  Change Role
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================
          DELETE MODAL
      ============================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (actionLoading) return;
          setShowDeleteModal(false);
        }}
        title="Delete User"
        size="sm"
      >
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
                Are you sure you want to permanently delete{' '}
                <strong>{profile.full_name || 'this user'}</strong>? This action
                cannot be undone.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
              Account
            </p>

            <p className="mt-0.5 text-sm font-extrabold text-ink-950">
              {profile.full_name || 'Anonymous'}
            </p>

            <p className="text-[11px] font-bold text-ink-400">
              {profile.email || 'No email'}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={actionLoading || profile.role === 'super_admin'}
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
      </Modal>

      {/* ============================================================
          USER STATS MODAL
      ============================================================ */}

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