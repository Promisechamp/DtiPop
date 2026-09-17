import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api/dtiApi';
import { supabase } from '@/services/api/supabase';
import { toast } from 'sonner';
import WinnerNoticeModal from './WinnerNoticeModal';

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
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };

    case 'pending':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };

    case 'rejected':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };

    case 'completed':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
      };

    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] ${meta.bg} ${meta.text} ${meta.border}`}
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
  <div className="min-h-screen">
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="animate-pulse space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-8 w-64 rounded-lg bg-slate-100" />
            <div className="h-4 w-80 rounded bg-slate-100" />
          </div>

          <div className="flex gap-3">
            <div className="h-11 w-28 rounded-xl bg-slate-100" />
            <div className="h-11 w-36 rounded-xl bg-slate-100" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-2xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>

        {/* Content */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <div className="h-[500px] rounded-2xl bg-slate-50" />
            <div className="h-[330px] rounded-2xl bg-slate-50" />
          </div>

          <div className="space-y-6">
            <div className="h-64 rounded-2xl bg-slate-50" />
            <div className="h-64 rounded-2xl bg-slate-50" />
          </div>
        </div>
      </div>
    </main>
  </div>
);

/* =========================================================
   STAT CARD
========================================================= */

const ModernStat = ({
  label,
  value,
  icon,
  iconClass,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.35,
      delay,
    }}
    whileHover={{
      y: -2,
    }}
    className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
  >
    <div className="flex items-center justify-between">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        <i className={`bi ${icon} text-base`} />
      </div>

      <span className="text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </span>
    </div>

    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <i className="bi bi-arrow-up-right text-[10px] text-slate-200 transition-colors group-hover:text-slate-400" />
    </div>
  </motion.div>
);

/* =========================================================
   SECTION HEADER
========================================================= */

const SectionHeader = ({
  eyebrow,
  title,
  count,
  action,
  onAction,
}) => (
  <div className="flex items-center justify-between px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {eyebrow}
        </p>

        <h2 className="mt-0.5 truncate text-base font-bold tracking-tight text-slate-900">
          {title}
        </h2>
      </div>

      {typeof count === 'number' && (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
          {count}
        </span>
      )}
    </div>

    {action && (
      <button
        type="button"
        onClick={onAction}
        className="ml-3 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700"
      >
        <span className="hidden sm:inline">{action}</span>
        <i className="bi bi-arrow-right text-[10px]" />
      </button>
    )}
  </div>
);

/* =========================================================
   QUICK LINK
========================================================= */

const QuickLink = ({
  icon,
  label,
  description,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
      <i className={`bi ${icon} text-sm`} />
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-slate-700 group-hover:text-slate-900">
        {label}
      </span>

      {description && (
        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
          {description}
        </span>
      )}
    </span>

    <i className="bi bi-chevron-right text-[10px] text-slate-300 transition-colors group-hover:text-slate-500" />
  </button>
);

/* =========================================================
   LISTING CARD
========================================================= */

const ModernListingCard = ({
  item,
  index,
  onClick,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
      }}
      whileHover={{
        y: -3,
      }}
      whileTap={{
        scale: 0.99,
      }}
      className="group w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.images?.[0] ? (
          <motion.img
            src={item.images[0]}
            alt={item.title || ''}
            className="h-full w-full object-cover"
            whileHover={{
              scale: 1.04,
            }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <i className="bi bi-image text-3xl" />
          </div>
        )}

        {/* Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Status */}
        <div className="absolute left-3 top-3">
          <StatusBadge status={item.status} />
        </div>

        {/* Hover action */}
        <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-lg bg-white text-slate-700 opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <i className="bi bi-arrow-up-right text-xs" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate text-sm font-bold text-slate-900">
          {item.title || 'Untitled item'}
        </h3>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-400">
            Listed {formatDate(item.created_at)}
          </span>

          <i className="bi bi-arrow-right text-xs text-slate-300 transition-colors group-hover:text-primary-600" />
        </div>
      </div>
    </motion.button>
  );
};

/* =========================================================
   APPLICATION ROW
========================================================= */

const ModernApplicationRow = ({
  app,
  index,
  onClick,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{
        opacity: 0,
        x: -6,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
      }}
      className="group flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-0 hover:bg-slate-50/70"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
        <i className="bi bi-box-seam text-sm" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {app.items?.title || 'Unknown item'}
        </p>

        <p className="mt-1 truncate text-[10px] text-slate-400">
          Request #{String(app.id).slice(0, 6).toUpperCase()}
          {' · '}
          {formatDate(app.created_at)}
        </p>
      </div>

      {/* Status */}
      <div className="hidden sm:block">
        <StatusBadge status={app.status} />
      </div>

      {/* Arrow */}
      <i className="bi bi-chevron-right text-[10px] text-slate-300 transition-colors group-hover:text-slate-600" />
    </motion.button>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <motion.div
    initial={{
      opacity: 0,
    }}
    animate={{
      opacity: 1,
    }}
    className="flex min-h-[280px] flex-col items-center justify-center px-6 py-14 text-center"
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
      <i className={`bi ${icon} text-xl`} />
    </div>

    <h3 className="mt-4 text-base font-bold text-slate-900">
      {title}
    </h3>

    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
      {description}
    </p>

    {actionLabel && (
      <motion.button
        type="button"
        onClick={onAction}
        whileHover={{
          y: -1,
        }}
        whileTap={{
          scale: 0.98,
        }}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700"
      >
        <i className="bi bi-plus-lg" />
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

  const [showVerificationModal, setShowVerificationModal] =
    useState(false);

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

      /* -------------------------------------------------------
         PROFILE
      ------------------------------------------------------- */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error(
          'Dashboard profile error:',
          profileError
        );
      }

      setProfile(profileData);

      /* -------------------------------------------------------
         DONOR ITEMS
      ------------------------------------------------------- */

      const {
        data: itemsData,
        error: itemsError,
      } = await supabase
        .from('items')
        .select('*')
        .eq('donor_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (itemsError) {
        console.error(
          'Dashboard items error:',
          itemsError
        );
      }

      /* -------------------------------------------------------
         RECEIVED ITEMS
      ------------------------------------------------------- */

      const {
        data: receivedItemsData,
        error: receivedItemsError,
      } = await supabase
        .from('items')
        .select('*')
        .eq('winner_id', user.id)
        .eq('status', 'completed')
        .order('created_at', {
          ascending: false,
        });

      if (receivedItemsError) {
        console.error(
          'Dashboard received items error:',
          receivedItemsError
        );
      }

      /* -------------------------------------------------------
         APPLICATIONS
      ------------------------------------------------------- */

      const {
        data: applicationsData,
        error: applicationsError,
      } = await supabase
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
        .order('created_at', {
          ascending: false,
        });

      if (applicationsError) {
        console.error(
          'Dashboard applications error:',
          applicationsError
        );
      }

      /* -------------------------------------------------------
         NORMALIZE
      ------------------------------------------------------- */

      const allItems = itemsData || [];

      const receivedItems = receivedItemsData || [];

      const allApplications = applicationsData || [];

      const activeItems = allItems.filter(
        (item) => item.status === 'active'
      );

      const completedItems = allItems.filter(
        (item) => item.status === 'completed'
      );

      const pendingApplications = allApplications.filter(
        (application) =>
          application.status === 'pending'
      );

      /* -------------------------------------------------------
         STATS
      ------------------------------------------------------- */

      setStats({
        itemsGiven: completedItems.length,
        itemsReceived: receivedItems.length,
        pendingApplications:
          pendingApplications.length,
        activeItems: activeItems.length,
      });

      /* -------------------------------------------------------
         LISTINGS
      ------------------------------------------------------- */

      setListedItems(activeItems.slice(0, 6));

      setTotalListedItems(activeItems.length);

      /* -------------------------------------------------------
         APPLICATIONS
      ------------------------------------------------------- */

      setRecentApplications(
        allApplications.slice(0, 5)
      );

      setTotalApplications(
        allApplications.length
      );
    } catch (error) {
      console.error(
        'Error fetching dashboard data:',
        error
      );

      toast.error(
        'Unable to load your dashboard'
      );
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
      toast.error(
        'Unable to determine your email address.'
      );
      return;
    }

    setResending(true);

    try {
      await authAPI.resendVerification(
        user.email
      );

      toast.success(
        'Verification email resent! Check your inbox.'
      );

      setShowVerificationModal(false);
      setPendingAction(null);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          'Failed to resend verification email'
      );
    } finally {
      setResending(false);
    }
  };

  const checkVerification = (action) => {
    if (
      (action === 'create' ||
        action === 'request') &&
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
      navigate('/create');
    }
  };

  const handleBrowse = () => {
    navigate('/browse');
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
      <div className="min-h-screen text-slate-900">

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">

          {/* =================================================
              HEADER
          ================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-7 border-b border-slate-100 pb-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-600">
                    Dashboard
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Welcome back, {firstName}
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  Here's what's happening with your items
                  and requests.
                </p>
              </div>

              <div className="flex gap-2.5">
                <motion.button
                  type="button"
                  onClick={handleBrowse}
                  whileHover={{
                    y: -1,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <i className="bi bi-search" />
                  Browse
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleCreateItem}
                  whileHover={{
                    y: -1,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700"
                >
                  <i className="bi bi-plus-lg" />
                  List an item
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* =================================================
              STATS
          ================================================== */}

          <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ModernStat
              label="Items given"
              value={stats.itemsGiven}
              icon="bi-gift"
              iconClass="bg-primary-50 text-primary-600"
              delay={0}
            />

            <ModernStat
              label="Items received"
              value={stats.itemsReceived}
              icon="bi-box-seam"
              iconClass="bg-sky-50 text-sky-600"
              delay={0.05}
            />

            <ModernStat
              label="Active listings"
              value={stats.activeItems}
              icon="bi-grid"
              iconClass="bg-emerald-50 text-emerald-600"
              delay={0.1}
            />

            <ModernStat
              label="Pending requests"
              value={stats.pendingApplications}
              icon="bi-clock"
              iconClass="bg-amber-50 text-amber-600"
              delay={0.15}
            />
          </section>

          {/* =================================================
              CONTENT GRID
          ================================================== */}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

            {/* =================================================
                MAIN COLUMN
            ================================================== */}

            <div className="min-w-0 space-y-6">

              {/* =================================================
                  LISTINGS
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <SectionHeader
                  eyebrow="Your items"
                  title="Active listings"
                  count={totalListedItems}
                  action="View all"
                  onAction={() =>
                    navigate('/my-listed-items')
                  }
                />

                {listedItems.length > 0 ? (
                  <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {listedItems.map(
                      (item, index) => (
                        <ModernListingCard
                          key={item.id}
                          item={item}
                          index={index}
                          onClick={() =>
                            navigate(
                              `/item/${item.id}`
                            )
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-100">
                    <EmptyState
                      icon="bi-box-seam"
                      title="Nothing listed yet"
                      description="List something useful and give it another life in the community."
                      actionLabel="Start listing"
                      onAction={
                        handleCreateItem
                      }
                    />
                  </div>
                )}
              </section>

              {/* =================================================
                  RECENT APPLICATIONS
              ================================================== */}

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <SectionHeader
                  eyebrow="Activity"
                  title="Recent requests"
                  count={totalApplications}
                  action="View all"
                  onAction={() =>
                    navigate('/my-applications')
                  }
                />

                {recentApplications.length >
                0 ? (
                  <div className="border-t border-slate-100">
                    {recentApplications.map(
                      (app, index) => (
                        <ModernApplicationRow
                          key={app.id}
                          app={app}
                          index={index}
                          onClick={() =>
                            navigate(
                              `/item/${app.item_id}`
                            )
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-100">
                    <EmptyState
                      icon="bi-send"
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

              {/* =================================================
                  PROFILE
              ================================================== */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: 8,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.35,
                }}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3">

                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                        <span className="font-bold">
                          {getInitials(
                            profile?.full_name
                          )}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {profile?.full_name ||
                          'User'}
                      </h3>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {profile?.email ||
                          user?.email ||
                          'Account'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate('/profile')
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <i className="bi bi-arrow-up-right text-xs" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 p-4">

                  {profile?.email_verified ? (
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                        <i className="bi bi-patch-check-fill" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-emerald-800">
                          Email verified
                        </p>

                        <p className="mt-0.5 text-[10px] text-emerald-600">
                          Your account is verified
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAction(
                          'create'
                        );
                        setShowVerificationModal(
                          true
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                        <i className="bi bi-envelope-exclamation" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-amber-800">
                          Verify your email
                        </p>

                        <p className="mt-0.5 text-[10px] leading-4 text-amber-600">
                          Required to list or
                          request items
                        </p>
                      </div>

                      <i className="bi bi-chevron-right text-xs text-amber-500" />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* =================================================
                  QUICK ACCESS
              ================================================== */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: 8,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.35,
                  delay: 0.05,
                }}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Quick access
                  </h3>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Shortcuts to your account
                  </p>
                </div>

                <div className="p-2">
                  <QuickLink
                    icon="bi-person"
                    label="My profile"
                    description="Manage your profile"
                    onClick={() =>
                      navigate('/profile')
                    }
                  />

                  <QuickLink
                    icon="bi-heart"
                    label="Saved items"
                    description="Items you've saved"
                    onClick={() =>
                      navigate('/favorites')
                    }
                  />

                  <QuickLink
                    icon="bi-box-seam"
                    label="My listings"
                    description="Manage your listings"
                    onClick={() =>
                      navigate(
                        '/my-listed-items'
                      )
                    }
                  />

                  <QuickLink
                    icon="bi-send"
                    label="My requests"
                    description="Track your requests"
                    onClick={() =>
                      navigate(
                        '/my-applications'
                      )
                    }
                  />
                </div>
              </motion.div>

              {/* =================================================
                  CTA
              ================================================== */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.35,
                  delay: 0.1,
                }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-lg shadow-primary-500/20"
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <i className="bi bi-stars" />
                  </div>

                  <h3 className="mt-5 text-base font-bold">
                    Give something a second life.
                  </h3>

                  <p className="mt-1.5 text-xs leading-5 text-white/70">
                    Someone in the community might
                    need what you're no longer using.
                  </p>

                  <button
                    type="button"
                    onClick={
                      handleCreateItem
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50"
                  >
                    List an item
                    <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </motion.div>
            </aside>
          </div>
        </main>

        {/* =====================================================
            VERIFICATION MODAL
        ====================================================== */}

        <AnimatePresence>
          {showVerificationModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-4 py-6">

              {/* Backdrop */}
              <motion.button
                type="button"
                aria-label="Close verification modal"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={() => {
                  setShowVerificationModal(
                    false
                  );
                  setPendingAction(null);
                }}
                className="fixed inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
              />

              {/* Modal */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 15,
                  scale: 0.97,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 28,
                }}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                {/* Header */}
                <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <i className="bi bi-envelope-exclamation text-lg" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowVerificationModal(
                          false
                        );
                        setPendingAction(null);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <i className="bi bi-x-lg text-xs" />
                    </button>
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                    Verify your email
                  </h3>

                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    {pendingAction ===
                    'create'
                      ? 'Please verify your email before listing an item.'
                      : 'Please verify your email before requesting an item.'}
                  </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 sm:px-7">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <i className="bi bi-info-circle mt-0.5 text-amber-600" />

                      <p className="text-xs leading-5 text-amber-900">
                        We sent a verification
                        email to{' '}
                        <strong className="break-all font-semibold">
                          {user?.email}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <motion.button
                      type="button"
                      onClick={
                        handleResendVerification
                      }
                      disabled={resending}
                      whileHover={{
                        y: -1,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send" />
                          Resend email
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={() => {
                        setShowVerificationModal(
                          false
                        );
                        setPendingAction(null);
                      }}
                      whileHover={{
                        y: -1,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Maybe later
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <WinnerNoticeModal />
    </>
  );
};

export default DashboardPage;