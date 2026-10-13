// components/layout/AppShell.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
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
import ChatDrawer from '../chat/ChatDrawer';
import ChatButton from '../chat/ChatButton';

import logo from '@/assets/dti.png';
import popLogo from '@/assets/popLogo3.png';

/* =========================================================
   Sidebar navigation item (desktop + mobile)
========================================================= */

const SidebarItem = ({
  to,
  label,
  icon,
  badge,
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

          {badge != null && badge > 0 && (
            <span className="ml-auto rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-black text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}

          {isActive && (
            <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary-600" />
          )}
        </>
      )}
    </RouterNavLink>
  );
};

/* =========================================================
   Top bar icon button
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
   Brand
========================================================= */

const Brand = ({ homePath, compact = false }) => {
  return (
    <Link
      to={homePath}
      className="group flex shrink-0 items-center gap-2.5"
      aria-label="Don't Trash It home"
    >
      <img
        src={logo}
        alt="Don't Trash It"
        className="rounded-lg"
        style={{ height: compact ? 32 : 36 }}
      />

      <div className="hidden leading-none sm:block">
        <div className="text-[14px] font-extrabold tracking-[-0.02em] text-ink-900">
          Don't Trash It
        </div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Give it another life
        </div>
      </div>
    </Link>
  );
};

/* =========================================================
   AppShell (layout + nav)
========================================================= */

const AppShell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    user,
    profile,
    signOut,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const mobileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  /* -------------------------------------------------------
     Home destination
  ------------------------------------------------------- */

  const homePath = useMemo(() => {
    if (!isAuthenticated || !user) return '/';
    if (user.role === 'admin' || user.role === 'super_admin') return '/admin';
    if (user.role === 'user') return '/dashboard';
    return '/';
  }, [isAuthenticated, user]);

  /* -------------------------------------------------------
     Navigation groups
  ------------------------------------------------------- */

  const publicLinks = useMemo(
    () => [
      { to: '/browse', label: 'Browse', icon: 'bi-grid' },
      { to: '/winners', label: 'Winners', icon: 'bi-trophy' },
      { to: '/how-it-works', label: 'How It Works', icon: 'bi-question-circle' },
      { to: '/about', label: 'About', icon: 'bi-info-circle' },
    ],
    []
  );

  const accountLinks = useMemo(
    () => [
      { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
      { to: '/my-listed-items', label: 'My Listed Items', icon: 'bi-box-seam' },
      { to: '/my-applications', label: 'My Applications', icon: 'bi-file-earmark-text' },
      { to: '/favorites', label: 'Favorites', icon: 'bi-heart' },
      { to: '/support-tickets', label: 'Support Tickets', icon: 'bi-ticket-perforated' },
      { to: '/ratings', label: 'Rating & Review', icon: 'bi-star-half' },
    ],
    []
  );

  const settingsLinks = useMemo(
    () => [
      { to: '/profile', label: 'Profile', icon: 'bi-person' },
      { to: '/settings', label: 'Settings', icon: 'bi-gear' },
    ],
    []
  );

  /* -------------------------------------------------------
     Active route helper
  ------------------------------------------------------- */

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  /* -------------------------------------------------------
     Close helpers
  ------------------------------------------------------- */

  const closeMobileMenu = () => setIsOpen(false);

  /* -------------------------------------------------------
     Close on outside click
  ------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      const target = event.target;

      if (
        mobileMenuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /* -------------------------------------------------------
     Close on route change
  ------------------------------------------------------- */

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  /* -------------------------------------------------------
     Lock body scroll
  ------------------------------------------------------- */

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
     Escape key
  ------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  /* -------------------------------------------------------
     Sign out
  ------------------------------------------------------- */

  const handleSignOut = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await signOut();
      setIsOpen(false);
      setIsChatOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  /* -------------------------------------------------------
     Sidebar (shared between desktop fixed + mobile drawer)
  ------------------------------------------------------- */

  const renderSidebarContent = (onNavigate) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-3">
        <Brand homePath={homePath} compact />
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Explore */}
        <div className="mt-2">
          <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
            Explore
          </p>
          <div className="space-y-0.5">
            {publicLinks.map((item) => (
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

        {isAuthenticated && (
          <>
            <div className="my-4 h-px bg-ink-100" />

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
                Your account
              </p>
              <div className="space-y-0.5">
                {accountLinks.map((item) => (
                  <SidebarItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onClick={onNavigate}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.();
                    setIsChatOpen(true);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink-600 transition-all duration-200 hover:bg-ink-50 hover:text-ink-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 transition-all duration-200 group-hover:bg-white group-hover:text-primary-600">
                    <i className="bi bi-chat-dots text-[15px]" />
                  </span>
                  <span>Messages</span>
                </button>
              </div>
            </div>

            <div className="my-4 h-px bg-ink-100" />

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
                Settings
              </p>
              <div className="space-y-0.5">
                {settingsLinks.map((item) => (
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-ink-100 px-3 py-3">
        {isAuthenticated ? (
          <div className="space-y-2">

            <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-400">
                  <i className="bi bi-person text-base" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-ink-900">
                  {profile?.full_name || user?.email || 'Your account'}
                </p>
                <p className="truncate text-[11px] text-ink-400">
                  {user?.email || 'Member'}
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
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              onClick={onNavigate}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50"
            >
              <i className="bi bi-box-arrow-in-right" />
              Sign in
            </Link>
            <Link
              to="/register"
              onClick={onNavigate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              Get started
              <i className="bi bi-arrow-up-right" />
            </Link>
          </div>
        )}

        {/* Partner logos */}
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-ink-100 pt-4">
          <a
            href="/app/pop"
            className="flex items-center gap-1.5 rounded-md p-1.5 opacity-80 transition-opacity hover:opacity-100"
            title="Proof of Purchase"
          >
            <img
              src={popLogo}
              alt="Proof of Purchase"
              className="h-7 w-7 rounded-md object-contain"
            />
          </a>
          <a
            href="/app/dti"
            className="flex items-center gap-1.5 rounded-md p-1.5 opacity-80 transition-opacity hover:opacity-100"
            title="Don't Trash It"
          >
            <img
              src={logo}
              alt="Don't Trash It"
              className="h-7 w-7 rounded-md object-contain"
            />
          </a>
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
        {/* ===================================================
            DESKTOP SIDEBAR
        =================================================== */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-ink-100 bg-white lg:block">
          {renderSidebarContent()}
        </aside>

        {/* ===================================================
            MAIN COLUMN
        =================================================== */}
        <div className="lg:pl-[260px]">
          {/* TOP BAR */}
          <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
            <div className="flex h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
              {/* Mobile: brand + menu */}
              <div className="flex items-center gap-3 lg:hidden">
                <Brand homePath={homePath} compact />
              </div>

              {/* Desktop: search / spacer */}
              <div className="hidden lg:flex lg:flex-1 lg:items-center">
                <div className="relative w-full max-w-md">
                  <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search gifts, people, categories…"
                    className="h-10 w-full rounded-xl border border-ink-100 bg-ink-50 pl-9 pr-3 text-sm font-medium text-ink-800 placeholder:text-ink-400 focus:border-primary-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                  />
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1.5">
                {isAuthenticated && (
                  <>
                    <div className="hidden lg:flex lg:items-center lg:gap-0.5">
                      <IconButton
                        to="/favorites"
                        icon={isActive('/favorites') ? 'bi-heart-fill' : 'bi-heart'}
                        label="Favorites"
                        isActive={isActive('/favorites')}
                      />
                      <IconButton
                        to="/support-tickets"
                        icon="bi-ticket-perforated"
                        label="Support"
                        isActive={isActive('/support-tickets')}
                      />
                      <IconButton
                        onClick={() => setIsChatOpen(true)}
                        icon="bi-chat-dots"
                        label="Messages"
                      />
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center">
                      <NotificationBell />
                    </div>

                    <Link
                      to="/create"
                      className="hidden lg:inline-flex group ml-1 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                        <i className="bi bi-plus-lg text-[10px]" />
                      </span>
                      List Item
                    </Link>
                  </>
                )}

                {!isAuthenticated && (
                  <>
                    <Link
                      to="/login"
                      className="hidden lg:inline-block rounded-xl px-3 py-2 text-sm font-bold text-ink-500 transition-colors hover:text-ink-900"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      className="hidden lg:inline-flex group items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
                    >
                      Get started
                      <i className="bi bi-arrow-up-right text-[11px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </>
                )}

                {/* Mobile menu toggle */}
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setIsOpen((value) => !value)}
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
            <Outlet />
          </main>
        </div>
      </div>

      {/* ===================================================
          MOBILE DRAWER
      =================================================== */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm lg:hidden"
              onClick={closeMobileMenu}
            />

            <motion.aside
              ref={mobileMenuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-ink-100 bg-white shadow-large lg:hidden"
            >
              {renderSidebarContent(closeMobileMenu)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================================================
          CHAT
      =================================================== */}
      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      {isAuthenticated && <ChatButton onClick={() => setIsChatOpen(true)} />}
    </>
  );
};

export default AppShell;