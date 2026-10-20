import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Package,
  LayoutGrid,
  Clock,
  Search,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Image as ImageIcon,
  Send,
  User,
  Heart,
  BadgeCheck,
  MailWarning,
  Info,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api/dtiApi';
import { supabase } from '@/services/api/supabase';
import { toast } from 'sonner';
import Modal from '@/reusables/Modal';
import WinnerNoticeModal from '../components/common/WinnerNoticeModal';

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date) => {
  if (!date) return 'N/A';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return 'U';

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const getStatusMeta = (status) => {
  switch (status) {
    case 'active':
    case 'accepted':
      return {
        wrapper: 'border-success-200 bg-success-50 text-success-700',
        dot: 'bg-success-500',
      };

    case 'pending':
      return {
        wrapper: 'border-warning-200 bg-warning-50 text-warning-700',
        dot: 'bg-warning-500',
      };

    case 'rejected':
      return {
        wrapper: 'border-danger-200 bg-danger-50 text-danger-700',
        dot: 'bg-danger-500',
      };

    case 'completed':
      return {
        wrapper: 'border-primary-200 bg-primary-50 text-primary-700',
        dot: 'bg-primary-500',
      };

    default:
      return {
        wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
        dot: 'bg-ink-400',
      };
  }
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${meta.wrapper}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {status || 'Unknown'}
    </span>
  );
};

/* =========================================================
   SKELETON
========================================================= */

const DashboardSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-28 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-72 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="flex gap-2.5">
            <div className="h-12 w-28 animate-pulse rounded-2xl bg-ink-200" />
            <div className="h-12 w-36 animate-pulse rounded-2xl bg-ink-200" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-ink-100 bg-white p-4 shadow-sm">
              <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-52 animate-pulse rounded-2xl bg-ink-100"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-ink-100 bg-white p-4 shadow-sm">
              <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-2xl bg-ink-100"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="h-44 animate-pulse rounded-[26px] bg-ink-100" />
            <div className="h-64 animate-pulse rounded-[26px] bg-ink-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* =========================================================
   STAT CARD (mirrors MyApplicationsPage StatCard)
========================================================= */

const StatCard = ({ label, value, icon: Icon, tone = 'ink', delay = 0 }) => {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };
  const style = tones[tone] || tones.ink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
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
    </motion.div>
  );
};

/* =========================================================
   SECTION HEADER
========================================================= */

const SectionHeader = ({ eyebrow, title, count, action, onAction }) => (
  <div className="flex items-center justify-between gap-3 px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
          {eyebrow}
        </p>

        <h2 className="mt-0.5 truncate text-base font-black tracking-tight text-ink-950">
          {title}
        </h2>
      </div>

      {typeof count === 'number' && (
        <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-extrabold text-ink-600">
          {count}
        </span>
      )}
    </div>

    {action && (
      <button
        type="button"
        onClick={onAction}
        className="ml-3 inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-primary-600 transition-colors hover:text-primary-700"
      >
        <span className="hidden sm:inline">{action}</span>
        <ArrowRight size={12} />
      </button>
    )}
  </div>
);

/* =========================================================
   QUICK LINK
========================================================= */

const QuickLink = ({ icon: Icon, label, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-ink-50"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
      <Icon size={15} />
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-sm font-extrabold text-ink-800 group-hover:text-ink-950">
        {label}
      </span>

      {description && (
        <span className="mt-0.5 block truncate text-[10px] font-medium text-ink-400">
          {description}
        </span>
      )}
    </span>

    <ChevronRight
      size={13}
      className="text-ink-300 transition-colors group-hover:text-ink-500"
    />
  </button>
);

/* =========================================================
   LISTING CARD
========================================================= */

const ModernListingCard = ({ item, index, onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      className="group w-full overflow-hidden rounded-2xl border border-ink-100 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
        {item.images?.[0] ? (
          <img
            src={item.images[0]}
            alt={item.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <ImageIcon size={26} />
          </div>
        )}

        {/* Status */}
        <div className="absolute left-3 top-3">
          <StatusBadge status={item.status} />
        </div>

        {/* Hover action */}
        <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-xl bg-white text-ink-700 opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={14} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate text-sm font-black text-ink-950 transition group-hover:text-primary-600">
          {item.title || 'Untitled item'}
        </h3>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-ink-400">
            Listed {formatDate(item.created_at)}
          </span>

          <ArrowRight
            size={13}
            className="text-ink-300 transition-colors group-hover:text-primary-600"
          />
        </div>
      </div>
    </motion.button>
  );
};

/* =========================================================
   APPLICATION ROW
========================================================= */

const ModernApplicationRow = ({ app, index, onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="group flex w-full items-center gap-3 border-b border-ink-100 px-5 py-4 text-left transition-colors last:border-0 hover:bg-ink-50/70"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
        <Package size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-950">
          {app.items?.title || 'Unknown item'}
        </p>

        <p className="mt-1 truncate text-[10px] font-medium text-ink-400">
          Request #{String(app.id).slice(0, 6).toUpperCase()}
          {' · '}
          {formatDate(app.created_at)}
        </p>
      </div>

      <div className="hidden sm:block">
        <StatusBadge status={app.status} />
      </div>

      <ChevronRight
        size={13}
        className="text-ink-300 transition-colors group-hover:text-ink-600"
      />
    </motion.button>
  );
};

/* =========================================================
   EMPTY STATE (matches MyApplicationsPage EmptyState pattern)
========================================================= */

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex min-h-[280px] flex-col items-center justify-center px-6 py-14 text-center"
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
      <Icon size={27} />
    </div>

    <h3 className="mt-5 text-lg font-black text-ink-950">{title}</h3>

    <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-ink-500">
      {description}
    </p>

    {actionLabel && (
      <motion.button
        type="button"
        onClick={onAction}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700"
      >
        <Plus size={16} strokeWidth={2.5} />
        {actionLabel}
      </motion.button>
    )}
  </motion.div>
);

/* =========================================================
   MAIN DASHBOARD
========================================================= */

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { to } = makePaths(DTI_BASE);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    itemsGiven: 0,
    itemsReceived: 0,
    pendingApplications: 0,
    activeItems: 0,
  });

  const [listedItems, setListedItems] = useState([]);
  const [totalListedItems, setTotalListedItems] = useState(0);

  const [recentApplications, setRecentApplications] = useState([]);
  const [totalApplications, setTotalApplications] = useState(0);

  const [profile, setProfile] = useState(null);

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [resending, setResending] = useState(false);

  /* =========================================================
     FETCH DATA
  ========================================================= */

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Dashboard profile error:', profileError);
      }

      setProfile(profileData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Dashboard items error:', itemsError);
      }

      const { data: receivedItemsData, error: receivedItemsError } =
        await supabase
          .from('items')
          .select('*')
          .eq('winner_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

      if (receivedItemsError) {
        console.error('Dashboard received items error:', receivedItemsError);
      }

      const { data: applicationsData, error: applicationsError } =
        await supabase
          .from('applications')
          .select(`
            *,
            items:item_id (
              title,
              images,
              status
            )
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Dashboard applications error:', applicationsError);
      }

      const allItems = itemsData || [];
      const receivedItems = receivedItemsData || [];
      const allApplications = applicationsData || [];

      const activeItems = allItems.filter((item) => item.status === 'active');
      const completedItems = allItems.filter(
        (item) => item.status === 'completed'
      );
      const pendingApplications = allApplications.filter(
        (application) => application.status === 'pending'
      );

      setStats({
        itemsGiven: completedItems.length,
        itemsReceived: receivedItems.length,
        pendingApplications: pendingApplications.length,
        activeItems: activeItems.length,
      });

      setListedItems(activeItems.slice(0, 6));
      setTotalListedItems(activeItems.length);

      setRecentApplications(allApplications.slice(0, 5));
      setTotalApplications(allApplications.length);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Unable to load your dashboard');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 250);
    }
  };

  /* =========================================================
     VERIFICATION
  ========================================================= */

  const handleResendVerification = async () => {
    if (!user?.email) {
      toast.error('Unable to determine your email address.');
      return;
    }

    setResending(true);

    try {
      await authAPI.resendVerification(user.email);
      toast.success('Verification email resent! Check your inbox.');
      setShowVerificationModal(false);
      setPendingAction(null);
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Failed to resend verification email'
      );
    } finally {
      setResending(false);
    }
  };

  const checkVerification = (action) => {
    if (
      (action === 'create' || action === 'request') &&
      !profile?.email_verified
    ) {
      setPendingAction(action);
      setShowVerificationModal(true);
      return false;
    }
    return true;
  };

  const handleCreateItem = () => {
    if (checkVerification('create')) {
      navigate(to('/create'));
    }
  };

  const handleBrowse = () => {
    navigate(to('/browse'));
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* =========================================================
     USER
  ========================================================= */

  const firstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : 'User';

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <div className="min-h-full bg-transparent">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* =================================================
              HEADER
          ================================================== */}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mb-7"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  <LayoutGrid size={14} />
                  <span>Your dashboard</span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  Welcome back, {firstName}
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                  Here's what's happening with your items and requests.
                </p>
              </div>

              <div className="flex shrink-0 gap-2.5">
                <motion.button
                  type="button"
                  onClick={handleBrowse}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-3 text-sm font-extrabold text-ink-700 shadow-sm transition hover:bg-ink-50"
                >
                  <Search size={16} strokeWidth={2.5} />
                  Browse
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleCreateItem}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <Plus size={17} strokeWidth={2.5} />
                  List an item
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* =================================================
              STATS
          ================================================== */}

          <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Items given"
              value={stats.itemsGiven}
              icon={Gift}
              tone="success"
              delay={0}
            />

            <StatCard
              label="Items received"
              value={stats.itemsReceived}
              icon={Package}
              tone="primary"
              delay={0.05}
            />

            <StatCard
              label="Active listings"
              value={stats.activeItems}
              icon={LayoutGrid}
              tone="ink"
              delay={0.1}
            />

            <StatCard
              label="Pending requests"
              value={stats.pendingApplications}
              icon={Clock}
              tone="warning"
              delay={0.15}
            />
          </section>

          {/* =================================================
              CONTENT GRID
          ================================================== */}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* =================================================
                MAIN COLUMN
            ================================================== */}

            <div className="min-w-0 space-y-6">
              {/* LISTINGS */}
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  eyebrow="Your items"
                  title="Active listings"
                  count={totalListedItems}
                  action="View all"
                  onAction={() => navigate(to('/my-listed-items'))}
                />

                {listedItems.length > 0 ? (
                  <div className="grid gap-4 border-t border-ink-100 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {listedItems.map((item, index) => (
                      <ModernListingCard
                        key={item.id}
                        item={item}
                        index={index}
                        onClick={() => navigate(to(`/item/${item.id}`))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-ink-100">
                    <EmptyState
                      icon={Package}
                      title="Nothing listed yet"
                      description="List something useful and give it another life in the community."
                      actionLabel="Start listing"
                      onAction={handleCreateItem}
                    />
                  </div>
                )}
              </section>

              {/* RECENT APPLICATIONS */}
              <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  eyebrow="Activity"
                  title="Recent requests"
                  count={totalApplications}
                  action="View all"
                  onAction={() => navigate(to('/my-applications'))}
                />

                {recentApplications.length > 0 ? (
                  <div className="border-t border-ink-100">
                    {recentApplications.map((app, index) => (
                      <ModernApplicationRow
                        key={app.id}
                        app={app}
                        index={index}
                        onClick={() => navigate(to(`/item/${app.item_id}`))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-ink-100">
                    <EmptyState
                      icon={Send}
                      title="No requests yet"
                      description="Browse the community to find something useful."
                      actionLabel="Browse items"
                      onAction={handleBrowse}
                    />
                  </div>
                )}
              </section>
            </div>

            {/* =================================================
                SIDEBAR
            ================================================== */}

            <aside className="space-y-6">
              {/* PROFILE */}
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-ink-100"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                        <span className="text-sm font-black">
                          {getInitials(profile?.full_name)}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-ink-950">
                        {profile?.full_name || 'User'}
                      </h3>

                      <p className="mt-0.5 truncate text-xs font-medium text-ink-400">
                        {profile?.email || user?.email || 'Account'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(to('/profile'))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                      aria-label="Open profile"
                    >
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-ink-100 p-4">
                  {profile?.email_verified ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-success-50 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-success-600 shadow-sm">
                        <BadgeCheck size={15} />
                      </div>

                      <div>
                        <p className="text-xs font-extrabold text-success-800">
                          Email verified
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-success-600">
                          Your account is verified
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAction('create');
                        setShowVerificationModal(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl bg-warning-50 p-3 text-left transition hover:bg-warning-100"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-warning-600 shadow-sm">
                        <MailWarning size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-warning-800">
                          Verify your email
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium leading-4 text-warning-600">
                          Required to list or request items
                        </p>
                      </div>

                      <ChevronRight size={13} className="text-warning-500" />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* QUICK ACCESS */}
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  delay: 0.05,
                }}
                className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
              >
                <div className="border-b border-ink-100 px-5 py-4">
                  <h3 className="text-sm font-black text-ink-950">
                    Quick access
                  </h3>

                  <p className="mt-1 text-[10px] font-bold text-ink-400">
                    Shortcuts to your account
                  </p>
                </div>

                <div className="p-2">
                  <QuickLink
                    icon={User}
                    label="My profile"
                    description="Manage your profile"
                    onClick={() => navigate(to('/profile'))}
                  />

                  <QuickLink
                    icon={Heart}
                    label="Saved items"
                    description="Items you've saved"
                    onClick={() => navigate(to('/favorites'))}
                  />

                  <QuickLink
                    icon={Package}
                    label="My listings"
                    description="Manage your listings"
                    onClick={() => navigate(to('/my-listed-items'))}
                  />

                  <QuickLink
                    icon={Send}
                    label="My requests"
                    description="Track your requests"
                    onClick={() => navigate(to('/my-applications'))}
                  />
                </div>
              </motion.div>

              {/* CTA — plain primary color */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  delay: 0.1,
                }}
                className="rounded-[26px] bg-primary-600 p-5 text-white shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <Gift size={17} />
                </div>

                <h3 className="mt-5 text-base font-black">
                  Give something a second life.
                </h3>

                <p className="mt-1.5 text-xs font-medium leading-5 text-white/70">
                  Someone in the community might need what you're no longer
                  using.
                </p>

                <button
                  type="button"
                  onClick={handleCreateItem}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-primary-700 transition hover:bg-primary-50"
                >
                  List an item
                  <ArrowRight size={13} />
                </button>
              </motion.div>
            </aside>
          </div>
        </div>
      </div>

      {/* =====================================================
          VERIFICATION MODAL
      ====================================================== */}

      <Modal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setPendingAction(null);
        }}
        title="Verify your email"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-warning-200 bg-warning-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
              <MailWarning size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-warning-900">
                Verification required
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-warning-700">
                {pendingAction === 'create'
                  ? 'Please verify your email before listing an item.'
                  : 'Please verify your email before requesting an item.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-ink-500" />

            <p className="text-xs font-medium leading-5 text-ink-600">
              We sent a verification email to{' '}
              <strong className="break-all font-extrabold text-ink-800">
                {user?.email}
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowVerificationModal(false);
                setPendingAction(null);
              }}
              disabled={resending}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Maybe later
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Resend email
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <WinnerNoticeModal />
    </>
  );
};

export default DashboardPage;