// src/pages/SettingsPage.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Palette,
  Bell,
  User,
  UserCog,
  Wrench,
  Code,
  Code2,
  Settings as SettingsIcon,
  Check,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  LogIn,
  Info,
  Loader2,
  CircleUser,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../utils/themes';
import {
  userSettingsAPI,
  systemSettingsAPI,
} from '../services/api/sharedApi';
import Modal from '../reusables/Modal';

const EASE = [0.22, 1, 0.36, 1];

/* =========================================================
   HIGHLIGHT
========================================================= */

const highlightStyles = `
  @keyframes settingsHighlight {
    0% {
      background: color-mix(
        in srgb,
        var(--color-primary-500) 12%,
        transparent
      );
    }

    50% {
      background: color-mix(
        in srgb,
        var(--color-primary-500) 7%,
        transparent
      );
    }

    100% {
      background: transparent;
    }
  }

  .settings-highlight {
    animation: settingsHighlight 1.1s ease-in-out 3;
  }
`;

const themeLabel = (theme) => theme.label;

/* =========================================================
   URL TAB HELPERS

   The URL is the ONLY source of truth for the active tab.
   No localStorage or other persistence mechanism is used.
========================================================= */

const VALID_TABS = ['user', 'admin'];

const isValidTab = (tab) => VALID_TABS.includes(tab);

const readInitialTab = () => {
  if (typeof window === 'undefined') return 'user';

  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    return isValidTab(tab) ? tab : 'user';
  } catch {
    return 'user';
  }
};

/* =========================================================
   ICON
========================================================= */

const SettingsIconBox = ({ icon: Icon, active = false }) => (
  <span
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
      active
        ? 'bg-primary-100 text-primary-600'
        : 'bg-ink-100 text-ink-500'
    }`}
  >
    <Icon size={15} />
  </span>
);

/* =========================================================
   SECTION
========================================================= */

const SettingsSection = ({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  className = '',
}) => (
  <section id={id} className={`scroll-mt-24 ${className}`}>
    <div className="mb-4 flex items-start gap-3">
      <SettingsIconBox icon={Icon} />

      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
            {eyebrow}
          </p>
        )}

        <h2 className="text-base font-black tracking-tight text-ink-950 sm:text-lg">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 max-w-xl text-sm font-medium leading-5 text-ink-500">
            {description}
          </p>
        )}
      </div>
    </div>

    <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
      {children}
    </div>
  </section>
);

/* =========================================================
   SETTING ROW
========================================================= */

const SettingRow = ({
  title,
  description,
  children,
  first = false,
  disabled = false,
}) => (
  <div
    className={`flex min-h-[72px] items-center justify-between gap-5 px-4 py-3.5 transition-colors duration-150 hover:bg-ink-50/60 sm:px-5 ${
      first ? '' : 'border-t border-ink-100'
    } ${disabled ? 'opacity-60' : ''}`}
  >
    <div className="min-w-0">
      <p className="text-sm font-extrabold text-ink-950">{title}</p>

      {description && (
        <p className="mt-0.5 max-w-xl text-xs font-medium leading-5 text-ink-500">
          {description}
        </p>
      )}
    </div>

    <div className="shrink-0">{children}</div>
  </div>
);

/* =========================================================
   TOGGLE
========================================================= */

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  loading = false,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-busy={loading}
    onClick={onChange}
    disabled={disabled || loading}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${
      loading
        ? 'cursor-wait'
        : disabled
        ? 'cursor-not-allowed opacity-50'
        : ''
    } ${checked ? 'bg-primary-600' : 'bg-ink-200'}`}
  >
    <motion.span
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm"
    >
      {loading && (
        <Loader2
          size={11}
          className={`animate-spin ${
            checked ? 'text-primary-600' : 'text-ink-400'
          }`}
        />
      )}
    </motion.span>
  </button>
);

/* =========================================================
   NAV ITEM
========================================================= */

const SettingsNavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
      active
        ? 'bg-primary-50 text-primary-700'
        : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
    }`}
  >
    {active && (
      <motion.span
        layoutId="settings-active-indicator"
        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary-500"
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    )}

    <Icon
      size={16}
      className={active ? 'text-primary-600' : 'text-ink-400'}
    />

    <span className="text-[13px] font-extrabold">{label}</span>
  </button>
);

/* =========================================================
   THEME PREVIEW
========================================================= */

const getThemePreviewBackground = (themeData) => {
  const isDark = themeData.id === 'dark';
  const isBlack = themeData.id === 'black';

  if (isBlack) {
    return 'linear-gradient(135deg, #050505, #171717)';
  }

  if (isDark) {
    return 'linear-gradient(135deg, #0b1020, #1a2438)';
  }

  return `linear-gradient(135deg, ${themeData.primary}, ${themeData.brand})`;
};

const ThemePreview = ({ themeData, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
      active
        ? 'border-primary-400 bg-primary-50/40 ring-2 ring-primary-500/20'
        : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/50'
    }`}
  >
    <div
      className="relative h-16 overflow-hidden"
      style={{ background: getThemePreviewBackground(themeData) }}
    >
      <div className="absolute inset-x-3 top-3 flex gap-1.5">
        <span className="h-1.5 w-8 rounded-full bg-white/80" />
        <span className="h-1.5 w-4 rounded-full bg-white/30" />
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        <div className="h-5 w-16 rounded bg-white/20" />

        <div className="flex gap-1">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: themeData.primary }}
          />
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: themeData.brand }}
          />
        </div>
      </div>

      {active && (
        <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
          <Check size={13} />
        </span>
      )}
    </div>

    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <span className="truncate text-xs font-extrabold text-ink-950">
        {themeLabel(themeData)}
      </span>

      {active && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600">
          Active
        </span>
      )}
    </div>
  </button>
);

/* =========================================================
   SKELETON
========================================================= */

const SettingsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-ink-200" />
          </div>

          <div className="h-8 w-40 animate-pulse rounded bg-ink-200" />

          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
        </div>

        <div className="h-14 w-56 animate-pulse rounded-2xl bg-ink-200" />
      </div>

      <div className="h-11 w-full max-w-xs animate-pulse rounded bg-ink-100" />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-ink-100"
            />
          ))}
        </div>

        <div className="space-y-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="border-b border-ink-100 p-5">
                <div className="h-4 w-40 animate-pulse rounded bg-ink-200" />
              </div>

              <div className="space-y-4 p-5">
                <div className="h-10 animate-pulse rounded bg-ink-100" />
                <div className="h-10 animate-pulse rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* =========================================================
   MAIN
========================================================= */

const SettingsPage = () => {
  const {
    user,
    signOut,
    settings,
    updateSetting,
    loading: authLoading,
    isAdmin: authIsAdmin,
  } = useAuth();

  const { theme, changeTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = Boolean(authIsAdmin);

  /* -------------------------------------------------------
     TAB

     The URL is the source of truth.
     No localStorage and no separate activeTab state.

     /settings             -> Personal
     /settings?tab=admin   -> Administration
  ------------------------------------------------------- */

  const urlTab = searchParams.get('tab');

  const activeTab = isValidTab(urlTab) ? urlTab : 'user';

  const effectiveTab =
    isAdmin && activeTab === 'admin' ? 'admin' : 'user';

  // Normalize invalid URLs and prevent non-admin access to
  // the administration tab once authentication has resolved.
  useEffect(() => {
    if (authLoading) return;

    const currentTab = searchParams.get('tab');

    const shouldRemoveTab =
      (currentTab !== null && !isValidTab(currentTab)) ||
      (currentTab === 'admin' && !isAdmin);

    if (!shouldRemoveTab) return;

    const next = new URLSearchParams(searchParams);
    next.delete('tab');

    setSearchParams(next, { replace: true });
  }, [authLoading, isAdmin, searchParams, setSearchParams]);

  const switchTab = (tabId) => {
    if (!isValidTab(tabId)) return;

    if (tabId === 'admin' && !isAdmin) return;

    const next = new URLSearchParams(searchParams);

    if (tabId === 'admin') {
      next.set('tab', 'admin');
    } else {
      next.delete('tab');
    }

    setSearchParams(next, { replace: true });
  };

  /* -------------------------------------------------------
     SECTION
  ------------------------------------------------------- */

  const [activeSection, setActiveSection] = useState(
    effectiveTab === 'admin' ? 'maintenance' : 'appearance'
  );

  const prevEffectiveTab = useRef(effectiveTab);

  useEffect(() => {
    if (prevEffectiveTab.current !== effectiveTab) {
      prevEffectiveTab.current = effectiveTab;

      setActiveSection(
        effectiveTab === 'admin' ? 'maintenance' : 'appearance'
      );
    }
  }, [effectiveTab]);

  /* -------------------------------------------------------
     OTHER UI STATE
  ------------------------------------------------------- */

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  // Tracks WHICH notification toggle is currently saving.
  // `null` = idle. 'email' | 'in_app' = that specific row.
  // This prevents both toggles from showing a spinner at once.
  const [notificationUpdating, setNotificationUpdating] = useState(null);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminUpdating, setAdminUpdating] = useState(false);

  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsUpdating, setDevToolsUpdating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  const [localLoading, setLocalLoading] = useState(true);

  /* =======================================================
     SETTINGS SYNC
  ======================================================= */

  useEffect(() => {
    if (!settings) return;

    setEmailNotifications(
      settings.email_notifications !== undefined
        ? settings.email_notifications
        : true
    );

    setInAppNotifications(
      settings.in_app_notifications !== undefined
        ? settings.in_app_notifications
        : true
    );
  }, [settings]);

  /* =======================================================
     ADMIN DATA
  ======================================================= */

  useEffect(() => {
    if (!isAdmin || !user?.id) return;

    let cancelled = false;

    (async () => {
      const [statusResult, devResult] = await Promise.allSettled([
        systemSettingsAPI.getMaintenanceStatus(),
        systemSettingsAPI.getShowDevTools(),
      ]);

      if (cancelled) return;

      if (statusResult.status === 'fulfilled') {
        const mode = statusResult.value?.data?.maintenance_mode;

        if (typeof mode === 'boolean') {
          setMaintenanceMode(mode);
        }
      } else {
        console.error(
          '[Settings] maintenance/status fetch failed:',
          statusResult.reason
        );
      }

      if (devResult.status === 'fulfilled') {
        const show = devResult.value?.data?.value;

        if (typeof show === 'boolean') {
          setShowDevTools(show);
        }
      } else {
        console.error(
          '[Settings] dev tools status fetch failed:',
          devResult.reason
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.id]);

  /* =======================================================
     LOADING
  ======================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const timer = setTimeout(() => setLocalLoading(false), 300);

      return () => clearTimeout(timer);
    }

    setLocalLoading(false);
  }, [authLoading, user]);

  /* =======================================================
     HASH NAVIGATION
  ======================================================= */

  useEffect(() => {
    if (!location.hash) return;

    const elementId = location.hash.replace('#', '');
    const element = document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      element.classList.add('settings-highlight');

      const timeoutId = setTimeout(() => {
        element.classList.remove('settings-highlight');

        const cleanPath =
          window.location.pathname + window.location.search;

        window.history.replaceState(null, '', cleanPath);
      }, 2500);

      return () => {
        clearTimeout(timeoutId);
        element.classList.remove('settings-highlight');
      };
    }

    const cleanPath =
      window.location.pathname + window.location.search;

    window.history.replaceState(null, '', cleanPath);
  }, [location.hash]);

  /* =======================================================
     NAV SECTIONS
  ======================================================= */

  const userSections = useMemo(
    () => [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'account', label: 'Account', icon: User },
    ],
    []
  );

  const adminSections = useMemo(
    () => [
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      ...(import.meta.env.MODE === 'development'
        ? [{ id: 'developer', label: 'Developer', icon: Code }]
        : []),
    ],
    []
  );

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);

    const element = document.getElementById(sectionId);

    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  /* =======================================================
     THEME
  ======================================================= */

  const handleThemeChange = async (themeId) => {
    const previousTheme = theme;

    setThemeSaving(true);

    try {
      changeTheme(themeId);

      if (updateSetting) {
        await updateSetting('theme', themeId);
      }

      toast.success('Theme updated');
      setShowThemeModal(false);
    } catch {
      changeTheme(previousTheme);
      toast.error('Failed to save theme preference');
    } finally {
      setThemeSaving(false);
    }
  };

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const handleNotificationToggle = async (type, value) => {
    if (notificationUpdating) return;

    setNotificationUpdating(type);

    const key =
      type === 'email'
        ? 'email_notifications'
        : 'in_app_notifications';

    try {
      if (type === 'email') {
        setEmailNotifications(value);
      } else {
        setInAppNotifications(value);
      }

      if (updateSetting) {
        await updateSetting(key, value);
      }

      toast.success('Preferences updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update preferences');

      if (type === 'email') {
        setEmailNotifications(!value);
      } else {
        setInAppNotifications(!value);
      }
    } finally {
      setNotificationUpdating(null);
    }
  };

  /* =======================================================
     MAINTENANCE TOGGLE
  ======================================================= */

  const handleMaintenanceToggle = async () => {
    if (adminUpdating) return;

    const previous = maintenanceMode;
    const next = !previous;

    setMaintenanceMode(next);
    setAdminUpdating(true);

    try {
      if (
        typeof systemSettingsAPI?.toggleMaintenance !== 'function'
      ) {
        throw new Error(
          'systemSettingsAPI.toggleMaintenance is not defined — update services/api/sharedApi.js'
        );
      }

      const res = await systemSettingsAPI.toggleMaintenance({
        enabled: next,
      });

      const serverValue = res?.data?.settings?.maintenance_mode;

      if (typeof serverValue === 'boolean') {
        setMaintenanceMode(serverValue);
      }

      toast.success(
        `Maintenance mode ${next ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      setMaintenanceMode(previous);

      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to toggle maintenance';

      console.error('[maintenance toggle]', {
        message,
        status: error?.response?.status,
        body: error?.response?.data,
      });

      toast.error(message);
    } finally {
      setAdminUpdating(false);
    }
  };

  /* =======================================================
     DEV TOOLS TOGGLE
  ======================================================= */

  const handleDevToolsToggle = async () => {
    if (!user || devToolsUpdating) return;

    const previous = showDevTools;
    const next = !previous;

    setShowDevTools(next);
    setDevToolsUpdating(true);

    try {
      if (
        typeof systemSettingsAPI?.setShowDevTools !== 'function'
      ) {
        throw new Error(
          'systemSettingsAPI.setShowDevTools is not defined — update services/api/sharedApi.js'
        );
      }

      const res = await systemSettingsAPI.setShowDevTools(next);

      const serverValue = res?.data?.settings?.show_dev_tools;

      if (typeof serverValue === 'boolean') {
        setShowDevTools(serverValue);
      }

      window.dispatchEvent(
        new CustomEvent('devToolsToggled', {
          detail: { enabled: next },
        })
      );

      toast.success(`Dev tools ${next ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setShowDevTools(previous);

      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to toggle dev tools';

      console.error('[devtools toggle]', {
        message,
        status: error?.response?.status,
        body: error?.response?.data,
      });

      toast.error(message);
    } finally {
      setDevToolsUpdating(false);
    }
  };

  /* =======================================================
     DELETE ACCOUNT
  ======================================================= */

  const isDeleteConfirmed =
    deleteConfirmText.trim().toUpperCase() === 'DELETE';

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmed) return;

    setDeleting(true);

    try {
     // await signOut();

      toast.success('Account deleted successfully');
     // navigate('/');
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Failed to delete account'
      );
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (authLoading || localLoading) {
    return <SettingsSkeleton />;
  }

  /* =======================================================
     SIGNED OUT
  ======================================================= */

  if (!user) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto w-full max-w-[1500px] space-y-7">
          <header>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              <SettingsIcon size={14} />
              <span>Settings</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
              Manage your preferences and personalize your experience.
            </p>
          </header>

          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <SettingsIcon size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Sign in to access settings
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Manage your preferences, notifications, and account
                settings.
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <LogIn size={15} />
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  const currentSections =
    effectiveTab === 'admin' ? adminSections : userSections;

  const currentThemeData =
    THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="min-h-full bg-transparent">
      <style>{highlightStyles}</style>

      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        {/* HEADER */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <SettingsIcon size={14} />
                <span>{isAdmin ? 'Administration' : 'Account'}</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                {isAdmin
                  ? 'Manage your account, preferences, and platform controls.'
                  : 'Manage your preferences and personalize your experience.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <CircleUser size={18} />
              </div>

              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-xs font-extrabold text-ink-950">
                  {user.email}
                </p>

                <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-400">
                  {isAdmin ? 'Administrator' : 'Account'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ADMIN TABS */}

        {isAdmin && (
          <div className="flex items-center border-b border-ink-100">
            {[
              { id: 'user', label: 'Personal', icon: User },
              {
                id: 'admin',
                label: 'Administration',
                icon: ShieldCheck,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = effectiveTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-extrabold transition-colors ${
                    active
                      ? 'text-ink-950'
                      : 'text-ink-400 hover:text-ink-700'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}

                  {active && (
                    <motion.span
                      layoutId="settings-top-tab"
                      className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-primary-600"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* CONTENT GRID */}

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                {effectiveTab === 'admin' ? 'Controls' : 'Preferences'}
              </p>

              <nav className="space-y-1">
                {currentSections.map((section) => (
                  <SettingsNavItem
                    key={section.id}
                    icon={section.icon}
                    label={section.label}
                    active={activeSection === section.id}
                    onClick={() => scrollToSection(section.id)}
                  />
                ))}
              </nav>

              <div className="mt-6 border-t border-ink-100 px-3 pt-4">
                <p className="text-[11px] font-medium leading-5 text-ink-400">
                  Changes are saved automatically.
                </p>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <AnimatePresence mode="wait">
              {effectiveTab === 'user' && (
                <motion.div
                  key="user-settings"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="space-y-9"
                >
                  {/* APPEARANCE */}

                  <SettingsSection
                    id="appearance"
                    icon={Palette}
                    eyebrow="Personalization"
                    title="Appearance"
                    description="Choose the visual theme used across the app."
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div
                            className="h-12 w-12 shrink-0 rounded-2xl border border-ink-100"
                            style={{
                              background: getThemePreviewBackground(
                                currentThemeData
                              ),
                            }}
                          />

                          <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                              Current theme
                            </p>

                            <p className="mt-0.5 truncate text-sm font-black text-ink-950">
                              {themeLabel(currentThemeData)}
                            </p>

                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  background: currentThemeData.primary,
                                }}
                              />

                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  background: currentThemeData.brand,
                                }}
                              />

                              <span className="ml-1 text-[10px] font-bold text-ink-400">
                                Palette
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowThemeModal(true)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                        >
                          <Palette size={14} />
                          Change theme
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-ink-500">
                        <CheckCircle2
                          size={13}
                          className="text-primary-500"
                        />
                        Your theme preference is saved automatically.
                      </div>
                    </div>
                  </SettingsSection>

                  {/* NOTIFICATIONS */}

                  <SettingsSection
                    id="notifications"
                    icon={Bell}
                    eyebrow="Preferences"
                    title="Notifications"
                    description="Choose where you want to receive updates."
                  >
                    <div>
                      <SettingRow
                        first
                        title="Email notifications"
                        description="Receive important updates and activity by email."
                      >
                        <ToggleSwitch
                          checked={emailNotifications}
                          loading={notificationUpdating === 'email'}
                          disabled={
                            notificationUpdating !== null &&
                            notificationUpdating !== 'email'
                          }
                          onChange={() =>
                            handleNotificationToggle(
                              'email',
                              !emailNotifications
                            )
                          }
                        />
                      </SettingRow>

                      <SettingRow
                        title="In-app notifications"
                        description="Show alerts and updates while you're using the app."
                      >
                        <ToggleSwitch
                          checked={inAppNotifications}
                          loading={notificationUpdating === 'in_app'}
                          disabled={
                            notificationUpdating !== null &&
                            notificationUpdating !== 'in_app'
                          }
                          onChange={() =>
                            handleNotificationToggle(
                              'in_app',
                              !inAppNotifications
                            )
                          }
                        />
                      </SettingRow>
                    </div>
                  </SettingsSection>

                  {/* ACCOUNT */}

                  <SettingsSection
                    id="account"
                    icon={User}
                    eyebrow="Account"
                    title="Account"
                    description="Manage your account and permanent actions."
                  >
                    <div>
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
                            <UserCog size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-ink-950">
                              Signed in as
                            </p>

                            <p className="mt-0.5 truncate text-xs font-medium text-ink-500">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          Active
                        </span>
                      </div>

                      <div className="border-t border-ink-100">
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-ink-950">
                              Delete account
                            </p>

                            <p className="mt-0.5 max-w-lg text-xs font-medium leading-5 text-ink-500">
                              Permanently remove your account and
                              associated data.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-2.5 text-xs font-extrabold text-danger-700 transition hover:bg-danger-100"
                          >
                            <Trash2 size={13} />
                            Delete account
                          </button>
                        </div>
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              )}

              {/* ADMINISTRATION */}

              {effectiveTab === 'admin' && (
                <motion.div
                  key="admin-settings"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="space-y-9"
                >
                  {/* MAINTENANCE */}

                  <SettingsSection
                    id="maintenance"
                    icon={Wrench}
                    eyebrow="Platform"
                    title="Maintenance"
                    description="Control whether the platform is available to users."
                  >
                    <div>
                      <SettingRow
                        first
                        title={
                          maintenanceMode
                            ? 'Maintenance mode is enabled'
                            : 'Maintenance mode is disabled'
                        }
                        description={
                          maintenanceMode
                            ? 'Users currently see the maintenance experience.'
                            : 'The platform is currently accessible.'
                        }
                      >
                        <ToggleSwitch
                          checked={maintenanceMode}
                          loading={adminUpdating}
                          onChange={handleMaintenanceToggle}
                        />
                      </SettingRow>

                      <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-3.5 sm:px-5">
                        <div className="flex items-start gap-2.5">
                          <Info
                            size={13}
                            className="mt-0.5 shrink-0 text-ink-400"
                          />

                          <p className="text-xs font-medium leading-5 text-ink-500">
                            Enabling maintenance mode affects the entire
                            platform. Use it only when performing planned
                            maintenance or emergency work.
                          </p>
                        </div>
                      </div>
                    </div>
                  </SettingsSection>

                  {/* DEVELOPER TOOLS */}

                  {import.meta.env.MODE === 'development' && (
                    <SettingsSection
                      id="developer"
                      icon={Code}
                      eyebrow="Development"
                      title="Developer tools"
                      description="Development-only controls for testing the interface."
                    >
                      <div>
                        <SettingRow
                          first
                          title={
                            showDevTools
                              ? 'Developer tools are visible'
                              : 'Developer tools are hidden'
                          }
                          description={
                            showDevTools
                              ? 'Development controls are currently available throughout the app.'
                              : 'Development controls are hidden from the interface.'
                          }
                        >
                          <ToggleSwitch
                            checked={showDevTools}
                            loading={devToolsUpdating}
                            onChange={handleDevToolsToggle}
                          />
                        </SettingRow>

                        <div className="border-t border-ink-100 bg-primary-50/40 px-4 py-3.5 sm:px-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-primary-700">
                            <Code2 size={13} />
                            <span>Development environment</span>
                          </div>
                        </div>
                      </div>
                    </SettingsSection>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ============================================================
          THEME MODAL
      ============================================================ */}

      <Modal
        isOpen={showThemeModal}
        onClose={() => {
          if (!themeSaving) {
            setShowThemeModal(false);
          }
        }}
        title="Choose a theme"
        size="lg"
        showCloseButton={!themeSaving}
      >
        <div className="space-y-5">
          <p className="text-sm font-medium leading-6 text-ink-500">
            Pick the visual theme used across the app. Your selection is saved
            automatically.
          </p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {THEMES.map((themeData) => (
              <ThemePreview
                key={themeData.id}
                themeData={themeData}
                active={theme === themeData.id}
                onClick={() => {
                  if (themeSaving) return;
                  if (theme === themeData.id) return;

                  handleThemeChange(themeData.id);
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-400">
            <CheckCircle2 size={13} className="text-primary-500" />
            Your theme preference is saved automatically.
          </div>
        </div>
      </Modal>

      {/* ============================================================
          DELETE ACCOUNT MODAL
      ============================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title="Delete account"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Delete this account?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                Deleting your account is permanent. Your account and associated
                data cannot be recovered afterward.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="delete-confirm"
              className="mb-1.5 block text-sm font-extrabold text-ink-700"
            >
              Type <span className="text-danger-600">DELETE</span> to confirm
            </label>

            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="input-field uppercase"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting || !isDeleteConfirmed}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  Delete account
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;