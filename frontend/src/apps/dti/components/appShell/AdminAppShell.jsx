// components/layout/AdminAppShell.jsx

import React, {
  useState,
  useEffect,
} from 'react';

import {
  Link,
  NavLink as RouterNavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import NotificationBell from '../../components/common/NotificationBell';

import logo from '@/assets/dti.png';

/* =========================================================
   Sidebar item (matches public AppShell)
========================================================= */

const SidebarItem = ({
  to,
  label,
  icon,
  onClick,
}) => {
  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        group relative flex items-center gap-3
        rounded-xl px-3 py-2.5
        text-sm font-bold
        transition-all duration-200
        ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
        }
      `}
    >
      {({ isActive }) => (
        <>
          <span
            className={`
              flex h-8 w-8 shrink-0 items-center justify-center
              rounded-lg transition-all duration-200
              ${
                isActive
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:text-primary-600'
              }
            `}
          >
            <i className={`bi ${icon} text-[15px]`} />
          </span>

          <span className="truncate">{label}</span>

          {isActive && (
            <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary-600" />
          )}
        </>
      )}
    </RouterNavLink>
  );
};

/* =========================================================
   Topbar icon button (matches public AppShell)
========================================================= */

const IconButton = ({
  to,
  onClick,
  icon,
  label,
  isActive = false,
}) => {
  const className = `
    group flex h-9 w-9 items-center justify-center
    rounded-xl border transition-all duration-200
    ${
      isActive
        ? 'border-primary-100 bg-primary-50 text-primary-700'
        : 'border-transparent text-ink-400 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-800'
    }
  `;

  const content = (
    <i
      className={`
        bi ${icon} text-[16px]
        transition-transform duration-200
        group-hover:scale-105
      `}
    />
  );

  if (to) {
    return (
      <Link to={to} aria-label={label} title={label} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={className}
    >
      {content}
    </button>
  );
};

/* =========================================================
   Brand (matches public AppShell)
========================================================= */

const Brand = ({ homePath }) => (
  <Link
    to={homePath}
    className="group flex shrink-0 items-center gap-2.5"
    aria-label="Don't Trash It admin"
  >
    <img
      src={logo}
      alt="Don't Trash It"
      className="rounded-lg"
      style={{ height: 32 }}
    />

    <div className="hidden leading-none sm:block">
      <div className="text-[14px] font-extrabold tracking-[-0.02em] text-ink-900">
        Don't Trash It
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary-600">
        Admin Panel
      </div>
    </div>
  </Link>
);

/* =========================================================
   AdminAppShell
========================================================= */

const AdminAppShell = () => {
  const [isOpen, setIsOpen] = useState(false);          // mobile drawer
  const [loggingOut, setLoggingOut] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /* -------------------------------------------------------
     Nav groups
  ------------------------------------------------------- */

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/admin/users', label: 'Users', icon: 'bi-people' },
    { to: '/admin/items', label: 'Items', icon: 'bi-box-seam' },
    { to: '/admin/applications', label: 'Applications', icon: 'bi-file-text' },
    { to: '/admin/winners', label: 'Winners', icon: 'bi-trophy' },
    { to: '/admin/support', label: 'Support Tickets', icon: 'bi-ticket-perforated' },
  ];

  const analyticsItems = [
    { to: '/admin/analytics', label: 'Overview', icon: 'bi-graph-up' },
    { to: '/admin/analytics/funnel', label: 'Funnel', icon: 'bi-funnel' },
    { to: '/admin/analytics/items-performance', label: 'Item Performance', icon: 'bi-bar-chart' },
    { to: '/admin/analytics/user-insights', label: 'User Insights', icon: 'bi-people' },
    { to: '/admin/analytics/fulfilment', label: 'Fulfilment', icon: 'bi-truck' },
  ];

  const systemItems = [
    { to: '/admin/api-reference', label: 'API Reference', icon: 'bi-code-square' },
    { to: '/admin/settings', label: 'Settings', icon: 'bi-gear' },
  ];

  /* -------------------------------------------------------
     Active helpers
  ------------------------------------------------------- */

  const isExactActive = (path) =>
    location.pathname === path ||
    location.pathname === `${path}/`;

  const isSectionActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(`${path}/`);

  const isOnAnalytics = location.pathname.startsWith('/admin/analytics');

  /* -------------------------------------------------------
     Effects
  ------------------------------------------------------- */

  useEffect(() => {
    if (isOnAnalytics) setAnalyticsOpen(true);
  }, [isOnAnalytics]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* -------------------------------------------------------
     Sign out
  ------------------------------------------------------- */

  const handleSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      setIsOpen(false);
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const closeMobile = () => setIsOpen(false);

  /* -------------------------------------------------------
     Sidebar content (shared)
  ------------------------------------------------------- */

  const renderSidebarContent = (onNavigate) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-3">
        <Brand homePath="/admin" />
      </div>

      {/* Scroll */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Workspace */}
        <div className="mt-2">
          <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
            Workspace
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="my-4 h-px bg-ink-100" />

        {/* Analytics */}
        <div>
          <button
            type="button"
            onClick={() => setAnalyticsOpen((prev) => !prev)}
            className={`
              group flex w-full items-center gap-3
              rounded-xl px-3 py-2.5 text-left text-sm font-bold
              transition-all duration-200
              ${
                isOnAnalytics
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }
            `}
          >
            <span
              className={`
                flex h-8 w-8 items-center justify-center rounded-lg
                transition-all duration-200
                ${
                  isOnAnalytics
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:text-primary-600'
                }
              `}
            >
              <i className="bi bi-graph-up-arrow text-[15px]" />
            </span>

            <span className="flex-1 truncate">Analytics</span>

            <i
              className={`bi bi-chevron-${
                analyticsOpen ? 'up' : 'down'
              } text-[10px] text-ink-400`}
            />
          </button>

          <AnimatePresence initial={false}>
            {analyticsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-7 mt-1 pl-3 border-l border-ink-100 space-y-0.5">
                  {analyticsItems.map((item) => {
                    const active = isExactActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={`
                          flex items-center gap-2.5 rounded-lg
                          px-3 py-2 text-sm transition-all
                          ${
                            active
                              ? 'bg-primary-50 text-primary-700 font-extrabold'
                              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 font-semibold'
                          }
                        `}
                      >
                        <i
                          className={`
                            ${item.icon} text-sm w-4 text-center
                            ${active ? 'text-primary-600' : ''}
                          `}
                        />
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="my-4 h-px bg-ink-100" />

        {/* System */}
        <div>
          <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
            System
          </p>
          <div className="space-y-0.5">
            {systemItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — user card + visit site */}
      <div className="border-t border-ink-100 px-3 py-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-bold text-ink-700 transition-colors hover:bg-ink-50"
        >
          <i className="bi bi-globe" />
          View public site
        </Link>

        <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Admin"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-400">
              <i className="bi bi-person text-base" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-ink-900">
              {profile?.full_name || 'Administrator'}
            </p>
            <p className="truncate text-[11px] font-bold text-primary-600">
              Administrator
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            aria-label="Sign out"
            title={loggingOut ? 'Signing out' : 'Sign out'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-danger disabled:opacity-50"
          >
            <i
              className={`bi ${
                loggingOut ? 'bi-arrow-repeat animate-spin' : 'bi-box-arrow-right'
              } text-[13px]`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <>
      <div className="min-h-screen bg-ink-50">
        {/* =================================================
            DESKTOP SIDEBAR — same width & style as public
        ================================================= */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-ink-100 bg-white lg:block">
          {renderSidebarContent()}
        </aside>

        {/* =================================================
            MAIN COLUMN
        ================================================= */}
        <div className="lg:pl-[260px]">
          {/* TOP BAR */}
          <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
            <div className="flex h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
              {/* Mobile: brand */}
              <div className="flex items-center gap-3 lg:hidden">
                <Brand homePath="/admin" />
              </div>

              {/* Desktop: search */}
              <div className="hidden lg:flex lg:flex-1 lg:items-center">
                <div className="relative w-full max-w-md">
                  <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search users, items, applications…"
                    className="h-10 w-full rounded-xl border border-ink-100 bg-ink-50 pl-9 pr-3 text-sm font-medium text-ink-800 placeholder:text-ink-400 focus:border-primary-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                  />
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1.5">
                <div className="hidden lg:flex lg:items-center lg:gap-0.5">
                  <IconButton
                    to="/admin/notifications"
                    icon="bi-bell"
                    label="Notifications"
                  />
                  <IconButton
                    to="/admin/settings"
                    icon="bi-gear"
                    label="Settings"
                    isActive={isSectionActive('/admin/settings')}
                  />
                </div>

                <div className="flex h-9 w-9 items-center justify-center">
                  <NotificationBell />
                </div>

                {/* Mobile menu toggle */}
                <button
                  type="button"
                  onClick={() => setIsOpen((v) => !v)}
                  aria-label={isOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isOpen}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-xl border
                    transition-all duration-200 lg:hidden
                    ${
                      isOpen
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-ink-100 bg-ink-50 text-ink-700 hover:bg-ink-100'
                    }
                  `}
                >
                  <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} text-xl`} />
                </button>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="min-h-[calc(100vh-64px)]">
            <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* =================================================
          MOBILE DRAWER — slides from left like public
      ================================================= */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm lg:hidden"
              onClick={closeMobile}
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-ink-100 bg-white shadow-large lg:hidden"
            >
              {renderSidebarContent(closeMobile)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminAppShell;