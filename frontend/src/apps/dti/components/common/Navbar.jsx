// components/layout/Navbar.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import { useAuth } from '@/context/AuthContext';

import NotificationBell from './NotificationBell';
import ChatDrawer from '../chat/ChatDrawer';
import ChatButton from '../chat/ChatButton';
import logo from '@/assets/dti.png';
import popLogo from '@/assets/popLogo3.png';

/* =========================================================
   Desktop navigation link
========================================================= */

const NavLink = ({
  to,
  children,
  isActive = false,
}) => {
  return (
    <Link
      to={to}
      className={`
        group relative flex h-16 items-center
        text-[13px] font-bold tracking-[-0.01em]
        transition-colors duration-200
        ${
          isActive
            ? 'text-primary-700'
            : 'text-ink-500 hover:text-ink-900'
        }
      `}
    >
      {children}

      <span
        className={`
          absolute bottom-0 left-1/2 h-[2px]
          -translate-x-1/2 rounded-full
          bg-primary-600
          transition-all duration-200
          ${
            isActive
              ? 'w-full opacity-100'
              : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'
          }
        `}
      />
    </Link>
  );
};

/* =========================================================
   Utility icon button
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
    rounded-xl border
    transition-all duration-200
    ${
      isActive
        ? 'border-primary-100 bg-primary-50 text-primary-700'
        : 'border-transparent text-ink-400 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-800'
    }
  `;

  const content = (
    <i
      className={`
        bi ${icon}
        text-[16px]
        transition-transform duration-200
        group-hover:scale-105
      `}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        title={label}
        className={className}
      >
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
   Mobile navigation item
========================================================= */

const MobileNavItem = ({
  to,
  label,
  icon,
  isActive,
  onClick,
}) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        group flex items-center gap-3
        rounded-xl px-3 py-2.5
        transition-all duration-200
        ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900'
        }
      `}
    >
      <span
        className={`
          flex h-9 w-9 shrink-0 items-center
          justify-center rounded-lg
          transition-all duration-200
          ${
            isActive
              ? 'bg-white text-primary-600 shadow-sm'
              : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:text-primary-600'
          }
        `}
      >
        <i className={`bi ${icon} text-[15px]`} />
      </span>

      <span className="text-sm font-bold">
        {label}
      </span>

      {isActive && (
        <i className="bi bi-chevron-right ml-auto text-[10px] text-primary-500" />
      )}
    </Link>
  );
};

/* =========================================================
   Brand
========================================================= */

const Brand = ({ homePath }) => {
  return (
    <Link
      to={homePath}
      className="group flex shrink-0 items-center gap-2.5"
      aria-label="Don't Trash It home"
    >
      <div className="relative">
        <a href="/" className="brand">
          <img
            src={logo}
            alt="Don't Trash It"
            className="logo rounded-lg"
            style={{ height: 40 }}
          />
        </a>
      </div>

      <div className="hidden leading-none sm:block">
        <div className="text-[15px] font-extrabold tracking-[-0.02em] text-ink-900">
          Don't Trash It
        </div>

        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Give it another life
        </div>
      </div>
    </Link>
  );
};

/* =========================================================
   Navbar
========================================================= */

const Navbar = () => {
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
    if (!isAuthenticated || !user) {
      return '/';
    }

    if (
      user.role === 'admin' ||
      user.role === 'super_admin'
    ) {
      return '/admin';
    }

    if (user.role === 'user') {
      return '/dashboard';
    }

    return '/';
  }, [isAuthenticated, user]);

  /* -------------------------------------------------------
     Public navigation
  ------------------------------------------------------- */

  const publicLinks = useMemo(
    () => [
      { to: '/browse', label: 'Browse' },
      { to: '/winners', label: 'Winners' },
      { to: '/how-it-works', label: 'How It Works' },
      { to: '/about', label: 'About' },
    ],
    []
  );

  /* -------------------------------------------------------
     Authenticated desktop navigation
  ------------------------------------------------------- */

  const primaryAuthLinks = useMemo(
    () => [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/my-listed-items', label: 'My Items' },
      { to: '/my-applications', label: 'Applications' },
    ],
    []
  );

  /* -------------------------------------------------------
     Authenticated mobile navigation
  ------------------------------------------------------- */

  const mobileAuthLinks = useMemo(
    () => [
      { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
      { to: '/my-listed-items', label: 'My Listed Items', icon: 'bi-box-seam' },
      { to: '/my-applications', label: 'My Applications', icon: 'bi-file-earmark-text' },
      { to: '/favorites', label: 'Favorites', icon: 'bi-heart' },
      { to: '/support-tickets', label: 'Support Tickets', icon: 'bi-ticket-perforated' },
      { to: '/ratings', label: 'Rating-Review', icon: 'bi-star-half' },
      { to: '/profile', label: 'Profile', icon: 'bi-person' },
      { to: '/settings', label: 'Settings', icon: 'bi-gear' },
    ],
    []
  );

  /* -------------------------------------------------------
     Public mobile icons
  ------------------------------------------------------- */

  const publicIcons = {
    '/browse': 'bi-grid',
    '/winners': 'bi-trophy',
    '/how-it-works': 'bi-question-circle',
    '/about': 'bi-info-circle',
  };

  /* -------------------------------------------------------
     Active route
  ------------------------------------------------------- */

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  /* -------------------------------------------------------
     Close mobile menu
  ------------------------------------------------------- */

  const closeMobileMenu = () => {
    setIsOpen(false);
  };

  /* -------------------------------------------------------
     Close when clicking outside
  ------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /* -------------------------------------------------------
     Close after route changes
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
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /* -------------------------------------------------------
     Sign out
  ------------------------------------------------------- */

  const handleSignOut = async () => {
    if (loggingOut) {
      return;
    }

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

  return (
    <>
      {/* ===================================================
          NAVBAR
      =================================================== */}

      <nav className="fixed inset-x-0 top-0 z-50 select-none">
        <div className="bg-white/95 shadow-navbar backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex h-[68px] items-center justify-between gap-4">
              {/* BRAND */}
              <Brand homePath={homePath} />

              {/* DESKTOP PUBLIC NAV */}
              <div className="hidden flex-1 items-center justify-center lg:flex">
                <div className="flex items-center gap-7">
                  {publicLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      isActive={isActive(item.to)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* DESKTOP RIGHT SIDE */}
              <div className="hidden shrink-0 items-center lg:flex">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-5">
                      {primaryAuthLinks.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          isActive={isActive(item.to)}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>

                    <div className="mx-5 h-6 w-px bg-ink-100" />

                    <div className="flex items-center gap-0.5">
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
                      <div className="flex h-9 w-9 items-center justify-center">
                        <NotificationBell />
                      </div>
                    </div>

                    <Link
                      to="/create"
                      className="group ml-2 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                        <i className="bi bi-plus-lg text-[10px]" />
                      </span>
                      List Item
                      <i className="bi bi-arrow-up-right text-[10px] opacity-70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>

                    <Link to="/profile" aria-label="Profile" title="Profile" className="group ml-2">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-ink-100 transition-all duration-200 group-hover:ring-primary-200"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400 transition-all duration-200 group-hover:border-primary-200 group-hover:bg-primary-50 group-hover:text-primary-600">
                          <i className="bi bi-person text-base" />
                        </div>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      aria-label="Sign out"
                      title={loggingOut ? 'Signing out' : 'Sign out'}
                      className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-ink-400 transition-all duration-200 hover:border-red-100 hover:bg-red-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <i className={`bi ${loggingOut ? 'bi-arrow-repeat animate-spin' : 'bi-box-arrow-right'} text-[16px]`} />
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-ink-500 transition-colors hover:text-ink-900">
                      Sign in
                    </Link>
                    <Link to="/register" className="group ml-1 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md">
                      Get started
                      <i className="bi bi-arrow-up-right text-[11px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </>
                )}
              </div>

              {/* MOBILE CONTROLS */}
              <div className="flex items-center gap-1 lg:hidden">
                {isAuthenticated && (
                  <div className="flex h-9 w-9 items-center justify-center">
                    <NotificationBell />
                  </div>
                )}
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setIsOpen((value) => !value)}
                  aria-label={isOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isOpen}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${isOpen ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-ink-100 bg-ink-50 text-ink-700 hover:bg-ink-100'}`}
                >
                  <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'} text-xl`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 top-[68px] bg-ink-900/30 backdrop-blur-sm lg:hidden"
                onClick={closeMobileMenu}
              />

              <motion.div
                ref={mobileMenuRef}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative max-h-[calc(100vh-68px)] overflow-y-auto bg-white shadow-large lg:hidden"
              >
                <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
                  {/* Mobile brand panel */}
                  <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                    <div className="flex items-center gap-3">
                      <a href="/" className="brand">
                        <img src={logo} alt="Don't Trash It" className="logo rounded-lg" style={{ height: 30 }} />
                      </a>
                      <div>
                        <p className="text-sm font-extrabold text-ink-900">Don't Trash It</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-600">Give it another life</p>
                      </div>
                    </div>
                  </div>

                  {/* Explore */}
                  <div>
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">Explore</p>
                    <div className="space-y-1">
                      {publicLinks.map((item) => (
                        <MobileNavItem
                          key={item.to}
                          to={item.to}
                          label={item.label}
                          icon={publicIcons[item.to]}
                          isActive={isActive(item.to)}
                          onClick={closeMobileMenu}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="my-5 h-px bg-ink-100" />

                  {isAuthenticated ? (
                    <>
                      <div>
                        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">Your account</p>
                        <div className="space-y-1">
                          {mobileAuthLinks.map((item) => (
                            <MobileNavItem
                              key={item.to}
                              to={item.to}
                              label={item.label}
                              icon={item.icon}
                              isActive={isActive(item.to)}
                              onClick={closeMobileMenu}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => { closeMobileMenu(); setIsChatOpen(true); }}
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink-700 transition-all duration-200 hover:bg-ink-50 hover:text-ink-900"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-ink-500 transition-all duration-200 group-hover:bg-white group-hover:text-primary-600">
                              <i className="bi bi-chat-dots text-[15px]" />
                            </span>
                            <span>Messages</span>
                            <i className="bi bi-chevron-right ml-auto text-[10px] text-ink-300" />
                          </button>
                        </div>
                      </div>

                      <Link
                        to="/create"
                        onClick={closeMobileMenu}
                        className="mt-5 flex items-center justify-center gap-2.5 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-primary-700 hover:shadow-md"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                          <i className="bi bi-plus-lg" />
                        </span>
                        List an Item
                        <i className="bi bi-arrow-up-right ml-1 text-[11px]" />
                      </Link>

                      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3.5">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Profile" className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-400">
                            <i className="bi bi-person text-lg" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink-900">{profile?.full_name || user?.email || 'Your account'}</p>
                          <p className="truncate text-xs text-ink-400">{user?.email || 'Member'}</p>
                        </div>
                        <Link to="/profile" onClick={closeMobileMenu} className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition-colors hover:border-primary-200 hover:text-primary-600" aria-label="Open profile">
                          <i className="bi bi-chevron-right text-[10px]" />
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={loggingOut}
                        className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-danger transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                          <i className={`bi ${loggingOut ? 'bi-arrow-repeat animate-spin' : 'bi-box-arrow-right'}`} />
                        </span>
                        {loggingOut ? 'Signing out...' : 'Sign out'}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Link to="/login" onClick={closeMobileMenu} className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50">
                        <i className="bi bi-box-arrow-in-right" />
                        Sign in
                      </Link>
                      <Link to="/register" onClick={closeMobileMenu} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-primary-700">
                        Get started
                        <i className="bi bi-arrow-up-right" />
                      </Link>
                    </div>
                  )}

                  {/* Footer with PoP logo */}
                  <div className="my-6 border-t border-ink-100 py-5">
                    <div className="flex items-center justify-center">
                      <a href="/app/pop" className="flex items-center gap-2 rounded-md p-2.5">
                        <img src={popLogo} alt="Proof of Purchase" className="logo bg-gradient-to-r from-primary-600 to-brand-600 h-10 w-10 object-contain rounded-md" />
                      </a>
                      <a href="/app/dti" className="flex items-center gap-2 rounded-md p-2.5">
                        <img src={logo} alt="Don't Trash It" className="h-10 w-10 object-contain rounded-md" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* CHAT */}
      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      {isAuthenticated && <ChatButton onClick={() => setIsChatOpen(true)} />}
    </>
  );
};

export default Navbar;