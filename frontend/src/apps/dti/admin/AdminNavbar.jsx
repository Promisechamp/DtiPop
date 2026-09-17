import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '../components/common/NotificationBell';
import logo from '@/assets/dti.png';

const AdminNavbar = ({ isOpen, setIsOpen }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      description: 'Overview & stats',
      exact: true,
    },
    {
      to: '/admin/users',
      label: 'Users',
      icon: 'bi-people',
      description: 'Manage community',
    },
    {
      to: '/admin/items',
      label: 'Items',
      icon: 'bi-box-seam',
      description: 'Manage listings',
    },
    {
      to: '/admin/applications',
      label: 'Applications',
      icon: 'bi-file-text',
      description: 'Review applications',
    },
    {
      to: '/admin/winners',
      label: 'Winners',
      icon: 'bi-trophy',
      description: 'Celebrate winners',
    },
    {
      to: '/admin/support',
      label: 'Support Tickets',
      icon: 'bi-ticket-perforated',
      description: 'Help the community',
    },
  ];

  const analyticsItems = [
    {
      to: '/admin/analytics',
      label: 'Overview',
      icon: 'bi-graph-up',
      description: 'Platform trends',
      exact: true,
    },
    {
      to: '/admin/analytics/funnel',
      label: 'Funnel',
      icon: 'bi-funnel',
      description: 'Views → Apply → Win',
    },
    {
      to: '/admin/analytics/items-performance',
      label: 'Item Performance',
      icon: 'bi-bar-chart',
      description: 'Listing performance',
    },
    {
      to: '/admin/analytics/user-insights',
      label: 'User Insights',
      icon: 'bi-people',
      description: 'Community behaviour',
    },
    {
      to: '/admin/analytics/fulfilment',
      label: 'Fulfilment',
      icon: 'bi-truck',
      description: 'Accepted → Received',
    },
  ];

  const bottomItems = [
    {
      to: '/admin/api-reference',
      label: 'API Reference',
      icon: 'bi-code-square',
      description: 'Developer docs',
    },
    {
      to: '/admin/settings',
      label: 'Settings',
      icon: 'bi-gear',
      description: 'Admin settings',
    },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path || location.pathname === `${path}/`;
    }
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    const depth = path.split('/').filter(Boolean).length;
    if (depth > 2) {
      return location.pathname === path || location.pathname === `${path}/`;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isOnAnalytics = location.pathname.startsWith('/admin/analytics');

  useEffect(() => {
    if (isOnAnalytics) setAnalyticsOpen(true);
  }, [isOnAnalytics]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setLoggingOut(false);
      setMobileOpen(false);
    }
  };

  const renderLogo = ({ mobile = false } = {}) => (
    <Link
      to="/admin"
      className={`flex items-center ${mobile ? 'gap-2.5' : 'gap-3'} shrink-0`}
    >
      <div className='relative w-10 h-10 '>
        <img src={logo} alt='logo' className='rounded-md border logo'/>
      </div>

      {mobile ? (
        <div>
          <span className="text-lg font-extrabold text-ink-900 tracking-tight">
            Admin
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-ink-400 -mt-0.5">
            Control Panel
          </span>
        </div>
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="block text-lg font-extrabold text-ink-900 tracking-tight leading-none">
                Don't Trash It
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-primary-600 font-bold mt-1">
                Admin Panel
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Link>
  );

  const renderNavItem = (item, mobile = false) => {
    const active = isActive(item.to, item.exact);

    if (mobile) {
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
            active
              ? 'bg-primary-50 text-primary-700'
              : 'text-ink-700 hover:bg-ink-50'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              active
                ? 'bg-primary-100 text-primary-600'
                : 'bg-ink-100 text-ink-500 group-hover:bg-ink-200'
            }`}
          >
            <i className={`${item.icon} text-base`} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">
              {item.label}
            </p>
            <p className="text-xs text-ink-400 truncate">
              {item.description}
            </p>
          </div>

          {active && (
            <i className="bi bi-chevron-right text-xs text-primary-500" />
          )}
        </Link>
      );
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        title={!isOpen ? item.label : undefined}
        className={`relative group flex items-center rounded-xl transition-all duration-200 ${
          isOpen
            ? 'gap-3 px-2.5 py-2.5 justify-start'
            : 'justify-center py-2.5'
        } ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-primary-600" />
        )}

        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            active
              ? 'bg-primary-100 text-primary-600'
              : 'text-ink-500 group-hover:text-ink-700'
          }`}
        >
          <i className={`${item.icon} text-base`} />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap min-w-0"
            >
              <span className="block text-sm font-bold truncate">
                {item.label}
              </span>
              <span
                className={`block text-[11px] truncate ${
                  active ? 'text-primary-600/70' : 'text-ink-400'
                }`}
              >
                {item.description}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {active && !isOpen && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-600" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* =========================================================
          DESKTOP SIDEBAR
      ========================================================== */}
      <motion.aside
        animate={{ width: isOpen ? 280 : 78 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex fixed top-0 left-0 h-[100dvh] z-40 bg-white border-r border-ink-100/80 shadow-sm flex-col overflow-hidden"
      >
        {/* Header – Logo left, NotificationBell right */}
        <div className="h-16 shrink-0 px-3 flex items-center justify-between ">
          {renderLogo()}

          {/* Notification bell – right side (desktop) */}
          <div className={`flex items-center ${isOpen ? 'pr-1' : 'justify-center w-full absolute right-0 pr-3'}`}>
            <NotificationBell />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {/* Main */}
          <div className="mb-5">
            <AnimatePresence>
              {isOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2 mb-2 text-[10px] uppercase tracking-widest font-extrabold text-ink-400"
                >
                  Workspace
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1">
              {navItems.map((item) => renderNavItem(item))}
            </div>
          </div>

          {/* Analytics */}
          <div className="mb-5">
            <button
              onClick={() => setAnalyticsOpen((prev) => !prev)}
              title={!isOpen ? 'Analytics' : undefined}
              className={`relative w-full flex items-center rounded-xl transition-all ${
                isOpen
                  ? 'gap-3 px-2.5 py-2.5 justify-start'
                  : 'justify-center py-2.5'
              } ${
                isOnAnalytics
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              {isOnAnalytics && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-primary-600" />
              )}

              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isOnAnalytics
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-ink-500'
                }`}
              >
                <i className="bi bi-graph-up-arrow text-base" />
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-hidden text-left whitespace-nowrap"
                  >
                    <span className="block text-sm font-bold">
                      Analytics
                    </span>
                    <span className="block text-[11px] text-ink-400">
                      Platform insights
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {isOpen && (
                <i
                  className={`bi bi-chevron-${
                    analyticsOpen ? 'up' : 'down'
                  } text-xs text-ink-400`}
                />
              )}
            </button>

            <AnimatePresence>
              {analyticsOpen && isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-7 pl-4 mt-1.5 border-l border-ink-100 flex flex-col gap-0.5">
                    {analyticsItems.map((item) => {
                      const active = isActive(item.to, item.exact);

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            active
                              ? 'bg-primary-50 text-primary-700 font-extrabold'
                              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                          }`}
                        >
                          <i
                            className={`${item.icon} text-sm w-4 text-center ${
                              active ? 'text-primary-600' : ''
                            }`}
                          />

                          <span className="truncate font-semibold">
                            {item.label}
                          </span>

                          {active && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed analytics */}
            {!isOpen && analyticsOpen && (
              <div className="mt-1 flex flex-col gap-0.5">
                {analyticsItems.map((item) => {
                  const active = isActive(item.to, item.exact);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={item.label}
                      className={`relative flex items-center justify-center py-2 rounded-lg ${
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-ink-500 hover:bg-ink-50'
                      }`}
                    >
                      <i className={`${item.icon} text-sm`} />

                      {active && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-600" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* System */}
          <div className="pt-4 border-t border-ink-100/60">
            <AnimatePresence>
              {isOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2 mb-2 text-[10px] uppercase tracking-widest font-extrabold text-ink-400"
                >
                  System
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1">
              {bottomItems.map((item) => renderNavItem(item))}
            </div>
          </div>
        </div>

        {/* Admin identity */}
        <div className="shrink-0 border-t border-ink-100/60 p-2.5">
          <div
            className={`bg-ink-50/50 rounded-xl p-2 ${
              isOpen
                ? 'flex items-center gap-3'
                : 'flex justify-center'
            }`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Admin"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center shrink-0">
                <i className="bi bi-person text-ink-500" />
              </div>
            )}

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-extrabold text-ink-900 truncate">
                    {profile?.full_name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-primary-600 font-bold">
                    Administrator
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            title={!isOpen ? 'Sign out' : undefined}
            className={`mt-1 w-full flex items-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors ${
              isOpen
                ? 'gap-3 px-2.5 py-2.5 justify-start'
                : 'justify-center py-2.5'
            }`}
          >
            <i className="bi bi-box-arrow-right text-lg w-5 text-center shrink-0" />

            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-bold whitespace-nowrap overflow-hidden"
                >
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* =========================================================
          COLLAPSE BUTTON
      ========================================================== */}
      <motion.button
        animate={{ left: isOpen ? 280 : 78 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle sidebar"
        className="hidden md:flex fixed top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-7 h-7 rounded-full bg-white border border-ink-100 shadow-sm items-center justify-center text-ink-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
      >
        <i
          className={`bi ${
            isOpen ? 'bi-chevron-left' : 'bi-chevron-right'
          } text-xs`}
        />
      </motion.button>

      {/* =========================================================
          MOBILE NAVBAR
      ========================================================== */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="h-16 px-4 flex items-center justify-between">
          {renderLogo({ mobile: true })}

          {/* Right side: NotificationBell + hamburger */}
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-ink-50 transition-colors"
            >
              <i
                className={`bi ${
                  mobileOpen ? 'bi-x-lg' : 'bi-list'
                } text-xl text-ink-700`}
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-t border-ink-100 overflow-hidden bg-white"
            >
              <div className="px-4 py-4 max-h-[calc(100dvh-64px)] overflow-y-auto">
                {/* Profile */}
                <div className="flex items-center gap-3 p-3 mb-4 bg-ink-50/50 rounded-xl border border-ink-100/60">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Admin"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ink-100 flex items-center justify-center">
                      <i className="bi bi-person text-ink-500 text-lg" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-extrabold text-ink-900 text-sm truncate">
                      {profile?.full_name || 'Administrator'}
                    </p>
                    <p className="text-xs text-primary-600 font-bold">
                      Administrator
                    </p>
                  </div>
                </div>

                <p className="text-[10px] uppercase tracking-widest font-extrabold text-ink-400 px-2 mb-2">
                  Workspace
                </p>

                <div className="flex flex-col gap-1">
                  {navItems.map((item) => renderNavItem(item, true))}
                </div>

                {/* Analytics mobile */}
                <div className="mt-5 pt-4 border-t border-ink-100">
                  <button
                    onClick={() => setAnalyticsOpen((prev) => !prev)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      isOnAnalytics
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isOnAnalytics
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      <i className="bi bi-graph-up-arrow" />
                    </div>

                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">Analytics</p>
                      <p className="text-xs text-ink-400">Platform insights</p>
                    </div>

                    <i
                      className={`bi bi-chevron-${
                        analyticsOpen ? 'up' : 'down'
                      } text-xs text-ink-400`}
                    />
                  </button>

                  <AnimatePresence>
                    {analyticsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-7 pl-4 mt-1.5 border-l border-ink-100 flex flex-col gap-0.5">
                          {analyticsItems.map((item) => {
                            const active = isActive(item.to, item.exact);

                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                                  active
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-ink-600 hover:bg-ink-50'
                                }`}
                              >
                                <i
                                  className={`${item.icon} text-sm w-4 text-center`}
                                />

                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate">
                                    {item.label}
                                  </p>
                                  <p className="text-xs text-ink-400 truncate">
                                    {item.description}
                                  </p>
                                </div>

                                {active && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* System */}
                <div className="mt-5 pt-4 border-t border-ink-100">
                  <p className="text-[10px] uppercase tracking-widest font-extrabold text-ink-400 px-2 mb-2">
                    System
                  </p>

                  <div className="flex flex-col gap-1">
                    {bottomItems.map((item) => renderNavItem(item, true))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-ink-100 flex flex-col gap-1">
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-ink-700 hover:bg-ink-50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center">
                      <i className="bi bi-globe text-ink-500" />
                    </div>

                    <div>
                      <p className="font-bold text-sm">View Website</p>
                      <p className="text-xs text-ink-400">Return to public site</p>
                    </div>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    disabled={loggingOut}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                      <i className="bi bi-box-arrow-right" />
                    </div>

                    <div>
                      <p className="font-bold text-sm">
                        {loggingOut ? 'Signing out...' : 'Sign out'}
                      </p>
                      <p className="text-xs text-rose-400">End admin session</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default AdminNavbar;