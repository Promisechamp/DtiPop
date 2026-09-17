import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  X,
  User,
  Package,
  FileText,
  Trophy,
  BarChart3,
  ImageIcon,
  ArrowUpRight,
} from 'lucide-react';
import { adminAPI } from '@/services/api/dtiApi';
import {
  getCategoryByValue,
  getStatusDisplay,
  getApplicationStatusDisplay
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

/* ============================================================
   Image Modal
============================================================ */
const ImageModal = ({ isOpen, imageUrl, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt="Full size"
          className="h-full w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
};

/* ============================================================
   Item Image
============================================================ */
const ItemImage = ({ images, title, className = 'h-11 w-11' }) => {
  const [showModal, setShowModal] = useState(false);
  const imageUrl = images?.[0] || null;

  return (
    <>
      <div
        className={`${className} shrink-0 cursor-pointer overflow-hidden rounded-xl border border-ink-100 bg-ink-50 shadow-sm transition hover:opacity-90`}
        onClick={() => imageUrl && setShowModal(true)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-ink-300" />
          </div>
        )}
      </div>
      <ImageModal
        isOpen={showModal}
        imageUrl={imageUrl}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

/* ============================================================
   Shared helpers
============================================================ */
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const itemStatusColor = (status) => {
  const colors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-sky-50 text-sky-700 border-sky-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    expired: 'bg-ink-100 text-ink-600 border-ink-200',
  };
  return colors[status] || 'bg-ink-100 text-ink-600 border-ink-200';
};

const appStatusColor = (status) => {
  const colors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    not_selected: 'bg-ink-100 text-ink-600 border-ink-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-ink-100 text-ink-600 border-ink-200',
  };
  return colors[status] || 'bg-ink-100 text-ink-600 border-ink-200';
};

/* ============================================================
   Empty State
============================================================ */
const EmptyState = ({ icon: Icon, label }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-ink-400"
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50">
      <Icon className="h-6 w-6" />
    </div>
    <p className="text-sm font-bold text-ink-700">{label}</p>
  </motion.div>
);

/* ============================================================
   Items Tab
============================================================ */
const ItemsTab = ({ items }) => {
  const grouped = useMemo(() => {
    const groups = {
      active: [],
      pending: [],
      completed: [],
      cancelled: [],
      expired: [],
      other: [],
    };
    (items || []).forEach((item) => {
      const status = item.status || 'other';
      if (groups[status]) groups[status].push(item);
      else groups.other.push(item);
    });
    return groups;
  }, [items]);

  if (!items?.length) {
    return <EmptyState icon={Package} label="No items found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([status, list]) => {
          if (!list.length) return null;
          const display = getStatusDisplay(status);
          return (
            <span
              key={status}
              className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[11px] font-bold text-ink-700"
            >
              {display?.label || status}: {list.length}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const category = getCategoryByValue(item.category);
          const statusDisplay = getStatusDisplay(item.status);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/20"
            >
              <ItemImage
                images={item.images}
                title={item.title}
                className="h-11 w-11 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink-900">
                  {item.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
                  {category &&
                    renderIcon(category.icon, 'h-3 w-3', category.color)}
                  <span className="font-medium text-ink-600">
                    {item.category || 'Uncategorized'}
                  </span>
                  <span className="text-ink-300">·</span>
                  <span>{formatDate(item.created_at)}</span>
                  <span className="text-ink-300">·</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${itemStatusColor(
                      item.status
                    )}`}
                  >
                    {statusDisplay?.label || item.status}
                  </span>
                </div>
              </div>
              <Link
                to={`/item/${item.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   Applications Tab
============================================================ */
const ApplicationsTab = ({ applications }) => {
  const grouped = useMemo(() => {
    const groups = {
      pending: [],
      accepted: [],
      not_selected: [],
      rejected: [],
      cancelled: [],
      other: [],
    };
    (applications || []).forEach((app) => {
      const status = app.status || 'other';
      if (groups[status]) groups[status].push(app);
      else groups.other.push(app);
    });
    return groups;
  }, [applications]);

  if (!applications?.length) {
    return <EmptyState icon={FileText} label="No applications found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([status, list]) => {
          if (!list.length) return null;
          const display = getApplicationStatusDisplay(status);
          return (
            <span
              key={status}
              className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[11px] font-bold text-ink-700"
            >
              {display?.label || status}: {list.length}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        {applications.map((app) => {
          const statusDisplay = getApplicationStatusDisplay(app.status);

          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/20"
            >
              <ItemImage
                images={app.item?.images || []}
                title={app.item?.title || 'Unknown Item'}
                className="h-11 w-11 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink-900">
                  {app.item?.title || 'Unknown Item'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
                  <span className="text-ink-600">Applied: {formatDate(app.created_at)}</span>
                  <span className="text-ink-300">·</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${appStatusColor(
                      app.status
                    )}`}
                  >
                    {statusDisplay?.label || app.status}
                  </span>
                </div>
              </div>
              <Link
                to={`/admin/applications/${app.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   Wins Tab
============================================================ */
const WinsTab = ({ wins }) => {
  if (!wins?.length) {
    return <EmptyState icon={Trophy} label="No wins found" />;
  }

  return (
    <div className="space-y-2">
      {wins.map((win) => {
        const appStatus = win.status || 'accepted';
        const statusDisplay = getApplicationStatusDisplay(appStatus);

        return (
          <motion.div
            key={win.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/20"
          >
            <ItemImage
              images={win.item?.images || []}
              title={win.item?.title || 'Unknown Item'}
              className="h-11 w-11 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-ink-900">
                {win.item?.title || 'Unknown Item'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
                <span className="text-ink-600">Won: {formatDate(win.created_at)}</span>
                {win.item?.category && (
                  <>
                    <span className="text-ink-300">·</span>
                    <span className="text-ink-600">{win.item.category}</span>
                  </>
                )}
                {win.week_start && win.week_end && (
                  <>
                    <span className="text-ink-300">·</span>
                    <span>
                      Week: {formatDate(win.week_start)} –{' '}
                      {formatDate(win.week_end)}
                    </span>
                  </>
                )}
                <span className="text-ink-300">·</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${appStatusColor(
                    appStatus
                  )}`}
                >
                  {statusDisplay?.label || appStatus}
                </span>
              </div>
              {win.story && (
                <p className="mt-1 truncate text-xs font-medium text-ink-500">
                  {win.story}
                </p>
              )}
            </div>
            <Link
              to={`/item/${win.item?.id}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-600"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ============================================================
   Analytics Tab
============================================================ */
const AnalyticsTab = ({ items, applications, wins }) => {
  const categoryData = useMemo(() => {
    const map = {};
    (items || []).forEach((item) => {
      const cat = item.category || 'Other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const statusData = useMemo(() => {
    const map = {};
    (items || []).forEach((item) => {
      const status = item.status || 'unknown';
      map[status] = (map[status] || 0) + 1;
    });
    const colors = {
      active: '#10b981',
      pending: '#f59e0b',
      completed: '#3b82f6',
      cancelled: '#ef4444',
      expired: '#6b7280',
    };
    return Object.entries(map).map(([status, count]) => ({
      status: getStatusDisplay(status)?.label || status,
      count,
      color: colors[status] || '#6b7280',
    }));
  }, [items]);

  const activityData = useMemo(() => {
    const map = {};
    const all = [...(items || []), ...(applications || []), ...(wins || [])];
    all.forEach((item) => {
      const date = item.created_at || item.createdAt;
      if (date) {
        const month = new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        map[month] = (map[month] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [items, applications, wins]);

  const COLORS = ['#6366f1', '#34d399', '#fbbf24', '#f87171', '#94a3b8'];

  if (!items?.length && !applications?.length && !wins?.length) {
    return <EmptyState icon={BarChart3} label="No data available for analytics" />;
  }

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderColor: '#e5e5e5',
    borderRadius: '0.75rem',
    color: '#171717',
    fontSize: '12px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-primary-600">
            {items?.length || 0}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-ink-500">Items</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-sky-600">
            {applications?.length || 0}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-ink-500">
            Applications
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-amber-600">
            {wins?.length || 0}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-ink-500">Wins</p>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-extrabold text-ink-700">
            Item Categories
          </h4>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="category"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {statusData.length > 0 && (
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-extrabold text-ink-700">
            Item Status
          </h4>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.4} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activityData.length > 0 && (
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-extrabold text-ink-700">
            Activity Timeline
          </h4>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   Skeleton
============================================================ */
const UserStatsSkeleton = () => (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-4 border-b border-ink-100 px-6 py-5">
      <div className="h-12 w-12 animate-pulse rounded-full bg-ink-100" />
      <div className="space-y-2">
        <div className="h-5 w-36 animate-pulse rounded bg-ink-100" />
        <div className="h-3.5 w-48 animate-pulse rounded bg-ink-100" />
      </div>
    </div>
    <div className="flex gap-2 border-b border-ink-100 px-6 py-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-9 w-24 animate-pulse rounded-xl bg-ink-100"
        />
      ))}
    </div>
    <div className="flex-1 space-y-3 p-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-50" />
      ))}
    </div>
  </div>
);

/* ============================================================
   MAIN MODAL
============================================================ */
const AdminUserStats = ({
  isOpen,
  userId,
  defaultTab = 'items',
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [wins, setWins] = useState([]);
  const [activeTab, setActiveTab] = useState(defaultTab || 'items');
  const tabRefs = useRef({});

  const VALID_TABS = ['items', 'applications', 'wins', 'analytics'];

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Set / reset active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(
        VALID_TABS.includes(defaultTab) ? defaultTab : 'items'
      );
    }
  }, [isOpen, defaultTab, userId]);

  // Fetch data
  const fetchUserData = useCallback(async () => {
    if (!userId || !isOpen) return;
    setLoading(true);
    try {
      const response = await adminAPI.getUser(userId);
      const data =
        response.data.user || response.data.profile || response.data;
      setProfile(data);
      setItems(data.items_given || []);
      setApplications(data.applications || []);
      setWins(data.wins || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [userId, isOpen]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Scroll active tab into view
  useEffect(() => {
    if (loading) return;
    const activeButton = tabRefs.current[activeTab];
    if (activeButton) {
      requestAnimationFrame(() => {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      });
    }
  }, [activeTab, loading]);

  const tabs = [
    {
      id: 'items',
      label: 'Items',
      icon: Package,
      count: items?.length || 0,
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: FileText,
      count: applications?.length || 0,
    },
    {
      id: 'wins',
      label: 'Wins',
      icon: Trophy,
      count: wins?.length || 0,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      count: null,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'items':
        return <ItemsTab items={items} />;
      case 'applications':
        return <ApplicationsTab applications={applications} />;
      case 'wins':
        return <WinsTab wins={wins} />;
      case 'analytics':
        return (
          <AnalyticsTab
            items={items}
            applications={applications}
            wins={wins}
          />
        );
      default:
        return <ItemsTab items={items} />;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <UserStatsSkeleton />
        ) : !profile ? (
          <div className="flex flex-1 flex-col items-center justify-center text-ink-400">
            <User className="mb-3 h-12 w-12" />
            <p className="font-medium">User not found</p>
          </div>
        ) : (
          <>
            {/* ========== HEADER (fixed) ========== */}
            <div className="shrink-0 border-b border-ink-100 bg-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-12 w-12 shrink-0 rounded-full border-2 border-ink-100 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink-200 bg-ink-100">
                      <User className="h-6 w-6 text-ink-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold capitalize text-ink-900">
                      {profile.full_name || 'Anonymous'}
                    </h2>
                    <p className="truncate text-sm font-medium text-ink-500">
                      {profile.email || 'No email'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quick stats strip */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-lg font-extrabold leading-tight text-primary-700">
                      {items?.length || 0}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-lg font-extrabold leading-tight text-sky-700">
                      {applications?.length || 0}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Apps
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-lg font-extrabold leading-tight text-amber-700">
                      {wins?.length || 0}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Wins
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== TABS (fixed, animated sliding pill) ========== */}
            <div className="shrink-0 border-b border-ink-100 bg-ink-50/40 px-4 py-2.5">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => (tabRefs.current[tab.id] = el)}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-ink-500 hover:text-ink-800'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="userStatsTabIndicator"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 shadow-sm"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <TabIcon className="h-4 w-4" />
                        {tab.label}
                        {tab.count !== null && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-ink-100 text-ink-500'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ========== CONTENT (scrollable) ========== */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="p-5"
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default AdminUserStats;
