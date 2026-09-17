// src/admin/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/services/api/dtiApi';
import { getCategoryByValue, getStatusDisplay, getApplicationStatusDisplay } from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';


// ============================================
// Skeleton Loader (Unified)
// ============================================
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="animate-pulse">
      <div className="h-8 bg-ink-200 rounded w-48 mb-2"></div>
      <div className="h-4 bg-ink-200 rounded w-64"></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-ink-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-ink-200 rounded w-16 mb-1"></div>
            </div>
            <div className="w-11 h-11 rounded-full bg-ink-200"></div>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
          <div className="h-5 bg-ink-200 rounded w-32 mb-4"></div>
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex items-center gap-3 py-3 border-b border-ink-50">
              <div className="w-9 h-9 rounded-lg bg-ink-200 shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-ink-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-ink-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-ink-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Main Component
// ============================================
const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: { total: 0, newToday: 0 },
    items: { total: 0, active: 0, pending: 0 },
    applications: { total: 0, pending: 0 },
    winners: { total: 0, thisWeek: 0 },
    viewsToday: 0,
  });
  const [recentItems, setRecentItems] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDashboardStats();
      const data = response.data.data || response.data || {};

      setStats({
        users: data.users || { total: 0, newToday: 0 },
        items: data.items || { total: 0, active: 0, pending: 0 },
        applications: data.applications || { total: 0, pending: 0 },
        winners: data.winners || { total: 0, thisWeek: 0 },
        viewsToday: data.viewsToday || data.views?.today || 0,
      });

      setRecentItems(data.recentItems || []);
      setRecentUsers(data.recentUsers || []);
      setRecentApplications(data.recentApplications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status) => {
    const display = getStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      blue: 'bg-sky-50 text-sky-700 border-sky-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      classes: colorMap[display?.color] || colorMap.gray,
      label: display?.label || status,
    };
  };

  const getAppStatusBadge = (status) => {
    const display = getApplicationStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      classes: colorMap[display?.color] || colorMap.gray,
      label: display?.label || status,
    };
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              Admin overview
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900">
            Dashboard
          </h1>
          <p className="text-sm text-ink-500">
            Welcome back, {user?.full_name || 'Admin'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="New Users Today"
          value={stats.users.newToday}
          icon="bi-person-plus"
          link="/admin/users"
        />
        <StatCard
          label="Active Items"
          value={stats.items.active}
          icon="bi-box-seam"
          link="/admin/items"
        />
        <StatCard
          label="Pending Appl.."
          value={stats.applications.pending}
          icon="bi-file-text"
          link="/admin/applications"
          highlight={stats.applications.pending > 0}
        />
        <StatCard
          label="Views Today"
          value={stats.viewsToday}
          icon="bi-eye"
        />
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total Users" value={stats.users.total} icon="bi-people" />
        <MiniStat label="Total Items" value={stats.items.total} icon="bi-box-seam" />
        <MiniStat label="Total Apps" value={stats.applications.total} icon="bi-file-text" />
        <MiniStat label="Winners" value={stats.winners.total} icon="bi-trophy" sub={`${stats.winners.thisWeek} this week`} />
      </div>

      {/* Recent Items + Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Items */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
              <i className="bi bi-box-seam text-primary-600"></i>
              Recent Items
            </h3>
            <Link to="/admin/items" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-ink-50">
            {recentItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm font-medium text-ink-400">No recent items</div>
            ) : (
              recentItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const category = getCategoryByValue(item.category);
                return (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-primary-50/20 transition group">
                    <div className="img w-9 h-9 rounded-xl bg-ink-100 overflow-hidden shrink-0 border border-ink-100">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="bi bi-image text-ink-300 text-xs"></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-ink-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {category && renderIcon(category.icon, 'w-3 h-3', category.color)}
                        <span className="text-xs font-medium text-ink-400">{item.category}</span>
                        <span className="text-ink-300">·</span>
                        <span className="text-xs font-medium text-ink-400">{getTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <Link
                      to={`/item/${item.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-400 hover:text-primary-600"
                    >
                      <i className="bi bi-arrow-up-right-square text-sm"></i>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
              <i className="bi bi-file-text text-primary-600"></i>
              Recent Applications
            </h3>
            <Link to="/admin/applications" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-ink-50">
            {recentApplications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm font-medium text-ink-400">No recent applications</div>
            ) : (
              recentApplications.map((app) => {
                const badge = getAppStatusBadge(app.status);
                return (
                  <div key={app.id} className="px-5 py-3 flex items-center gap-3 hover:bg-primary-50/20 transition group">
                    {app.applicant?.avatar_url ? (
                      <img src={app.applicant.avatar_url} alt="" className="img w-8 h-8 rounded-full object-cover shrink-0 border border-ink-100" />
                    ) : (
                      <div className="img w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center shrink-0 border border-ink-200">
                        <i className="bi bi-person text-ink-400 text-sm"></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-ink-900 truncate">
                        {app.applicant?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs font-medium text-ink-400 truncate">
                        Applied for: {app.item?.title || 'Unknown Item'} · {getTimeAgo(app.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Users + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink-700 flex items-center gap-2">
              <i className="bi bi-people text-primary-600"></i>
              Recent Users
            </h3>
            <Link to="/admin/users" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-ink-50">
            {recentUsers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm font-medium text-ink-400">No recent users</div>
            ) : (
              recentUsers.map((usr) => (
                <div key={usr.id} className="px-5 py-3 flex items-center gap-3 hover:bg-primary-50/20 transition">
                  {usr.avatar_url ? (
                    <img src={usr.avatar_url} alt="" className="img w-8 h-8 rounded-full object-cover shrink-0 border border-ink-100" />
                  ) : (
                    <div className="img w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center shrink-0 border border-ink-200">
                      <i className="bi bi-person text-ink-400 text-sm"></i>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-ink-900 truncate">{usr.full_name || 'Anonymous'}</p>
                    <p className="text-xs font-medium text-ink-400 truncate">{usr.email || 'No email'} · {getTimeAgo(usr.created_at)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    usr.role === 'admin' || usr.role === 'super_admin'
                      ? 'bg-primary-50 text-primary-700 border-primary-200'
                      : 'bg-ink-50 text-ink-600 border-ink-200'
                  }`}>
                    {usr.role || 'user'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-ink-700 mb-4 flex items-center gap-2">
            <i className="bi bi-lightning text-primary-600"></i>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction to="/admin/users" icon="bi-people" label="Users" />
            <QuickAction to="/admin/items" icon="bi-box-seam" label="Items" />
            <QuickAction to="/admin/applications" icon="bi-file-text" label="Applications" />
            <QuickAction to="/admin/winners" icon="bi-trophy" label="Winners" />
            <QuickAction to="/admin/analytics" icon="bi-graph-up" label="Analytics" />
            <QuickAction to="/admin/support" icon="bi-ticket-perforated" label="Support" />
            <QuickAction to="/admin/settings" icon="bi-gear" label="Settings" />
            <QuickAction to="/admin/api-reference" icon="bi-code-square" label="API Docs" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================ */
/* Helper Components (Unified) */
/* ============================================ */

function StatCard({ label, value, icon, link, highlight }) {
  const content = (
    <div className={`bg-white rounded-2xl border ${highlight ? 'border-amber-200' : 'border-ink-100/80'} shadow-sm p-5 hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink-500">{label}</p>
          <p className={`text-2xl font-extrabold mt-1 ${highlight ? 'text-amber-600' : 'text-primary-600'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${highlight ? 'bg-amber-50' : 'bg-primary-50'} flex items-center justify-center border ${highlight ? 'border-amber-200' : 'border-primary-100'}`}>
          <i className={`bi ${icon} ${highlight ? 'text-amber-600' : 'text-primary-600'} text-lg`}></i>
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link} className="block">{content}</Link>;
  }
  return content;
}

function MiniStat({ label, value, icon, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-3">
      <div className="flex items-center gap-2">
        <i className={`bi ${icon} text-primary-600 text-sm`}></i>
        <span className="text-xs font-bold text-ink-500">{label}</span>
      </div>
      <p className="text-lg font-extrabold text-ink-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs font-medium text-ink-400">{sub}</p>}
    </div>
  );
}

function QuickAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:border-primary-200 hover:bg-primary-50/50 transition group shadow-sm"
    >
      <div className="w-9 h-9 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition border border-primary-100">
        <i className={`bi ${icon} text-primary-600 text-sm`}></i>
      </div>
      <span className="text-sm font-extrabold text-ink-700">{label}</span>
    </Link>
  );
}

export default AdminDashboard;