import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../utils/themes';
import { adminAPI } from '../services/api/dtiApi';
import { supabase } from '../services/api/supabase';
import {
  PageNavigation,
  PageNavigationSkeleton,
} from '../reusables/PageNavigation';
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
   ICON
========================================================= */

const SettingsIcon = ({
  icon,
  active = false,
}) => (
  <span
    className={`
      flex
      h-8
      w-8
      shrink-0
      items-center
      justify-center
      rounded-lg
      transition-colors
      duration-200

      ${
        active
          ? 'bg-primary-100 text-primary-600'
          : 'bg-ink-100 text-ink-500'
      }
    `}
  >
    <i className={`bi ${icon} text-[15px]`} />
  </span>
);

/* =========================================================
   SECTION
========================================================= */

const SettingsSection = ({
  id,
  icon,
  eyebrow,
  title,
  description,
  children,
  className = '',
}) => (
  <section
    id={id}
    className={`
      scroll-mt-24
      ${className}
    `}
  >
    <div className="mb-4 flex items-start gap-3">
      <SettingsIcon icon={icon} />

      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-600">
            {eyebrow}
          </p>
        )}

        <h2 className="text-[17px] font-extrabold tracking-tight text-ink-950">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 max-w-xl text-sm leading-5 text-ink-500">
            {description}
          </p>
        )}
      </div>
    </div>

    <div
      className="
        overflow-hidden
        rounded-[20px]
        border
        border-ink-200
        bg-white
      "
    >
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
  last = false,
  disabled = false,
}) => (
  <div
    className={`
      flex
      min-h-[72px]
      items-center
      justify-between
      gap-5
      px-4
      py-3.5
      sm:px-5

      transition-colors
      duration-150

      hover:bg-ink-50/60

      ${first ? '' : 'border-t border-ink-100'}
      ${disabled ? 'opacity-60' : ''}
    `}
  >
    <div className="min-w-0">
      <p className="text-sm font-bold text-ink-900">
        {title}
      </p>

      {description && (
        <p className="mt-0.5 max-w-xl text-xs leading-5 text-ink-500">
          {description}
        </p>
      )}
    </div>

    <div className="shrink-0">
      {children}
    </div>
  </div>
);

/* =========================================================
   TOGGLE
========================================================= */

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`
      relative
      inline-flex
      h-7
      w-12
      shrink-0
      items-center
      rounded-full
      p-1
      transition-all
      duration-200

      focus:outline-none
      focus-visible:ring-2
      focus-visible:ring-primary-300
      focus-visible:ring-offset-2

      disabled:cursor-not-allowed
      disabled:opacity-50

      ${
        checked
          ? 'bg-primary-600'
          : 'bg-ink-200'
      }
    `}
  >
    <motion.span
      animate={{
        x: checked ? 20 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      className="
        block
        h-5
        w-5
        rounded-full
        bg-white
        shadow-xs
      "
    />
  </button>
);

/* =========================================================
   NAV ITEM
========================================================= */

const SettingsNavItem = ({
  icon,
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      relative
      flex
      w-full
      items-center
      gap-3
      rounded-xl
      px-3
      py-2.5
      text-left
      transition-colors
      duration-150

      ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
      }
    `}
  >
    {active && (
      <motion.span
        layoutId="settings-active-indicator"
        className="
          absolute
          left-0
          top-1/2
          h-5
          w-0.5
          -translate-y-1/2
          rounded-full
          bg-primary-500
        "
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 35,
        }}
      />
    )}

    <i
      className={`
        bi
        ${icon}
        text-[16px]
        ${
          active
            ? 'text-primary-600'
            : 'text-ink-400'
        }
      `}
    />

    <span className="text-[13px] font-bold">
      {label}
    </span>
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

  return `linear-gradient(
    135deg,
    ${themeData.primary},
    ${themeData.brand}
  )`;
};

const ThemePreview = ({
  themeData,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`
      group
      relative
      overflow-hidden
      rounded-[16px]
      border
      text-left
      transition-all
      duration-200

      ${
        active
          ? 'border-primary-500 bg-primary-50/40'
          : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/50'
      }
    `}
  >
    <div
      className="
        relative
        h-16
        overflow-hidden
      "
      style={{
        background: getThemePreviewBackground(themeData),
      }}
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
        <span
          className="
            absolute
            right-2.5
            top-2.5
            flex
            h-6
            w-6
            items-center
            justify-center
            rounded-full
            bg-white
            text-primary-600
            shadow-xs
          "
        >
          <i className="bi bi-check text-[13px]" />
        </span>
      )}
    </div>

    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <span className="truncate text-[12px] font-bold text-ink-800">
        {themeLabel(themeData)}
      </span>

      {active && (
        <span className="text-[10px] font-bold text-primary-600">
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
  <div className="min-h-screen bg-ink-50 px-3 sm:px-5">
    <div className="mx-auto max-w-5xl pb-12">
      <PageNavigationSkeleton />

      <div className="mt-6 animate-pulse">
        <div className="h-3 w-28 rounded-full bg-ink-200" />
        <div className="mt-3 h-9 w-36 rounded-lg bg-ink-200" />
        <div className="mt-2 h-4 w-72 max-w-full rounded bg-ink-200" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="hidden space-y-2 lg:block">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-10 rounded-xl bg-ink-200"
            />
          ))}
        </div>

        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div
              key={section}
              className="overflow-hidden rounded-[20px] border border-ink-100 bg-white"
            >
              <div className="h-20 animate-pulse border-b border-ink-100 bg-ink-50" />

              <div className="space-y-5 p-5">
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

  const {
    theme,
    changeTheme,
  } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = authIsAdmin;

  const [activeTab, setActiveTab] =
    useState('user');

  const [activeSection, setActiveSection] =
    useState('appearance');

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [inAppNotifications, setInAppNotifications] =
    useState(true);

  const [updating, setUpdating] =
    useState(false);

  const [maintenanceMode, setMaintenanceMode] =
    useState(false);

  const [adminUpdating, setAdminUpdating] =
    useState(false);

  const [showDevTools, setShowDevTools] =
    useState(false);

  const [devToolsUpdating, setDevToolsUpdating] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deleteConfirmText, setDeleteConfirmText] =
    useState('');

  const [deleting, setDeleting] =
    useState(false);

  const [showThemeModal, setShowThemeModal] =
    useState(false);

  const [themeSaving, setThemeSaving] =
    useState(false);

  const [localLoading, setLocalLoading] =
    useState(true);

  /* =======================================================
     SETTINGS
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
    if (!isAdmin || !user) return;

    adminAPI
      .getMaintenanceStatus()
      .then((res) => {
        setMaintenanceMode(
          res.data?.maintenance_mode ?? false
        );
      })
      .catch((error) => {
        console.error(
          'Failed to load maintenance status',
          error
        );
      });

    const fetchDevToolsSetting =
      async () => {
        try {
          const {
            data,
            error,
          } = await supabase
            .from('user_settings')
            .select('value')
            .eq('user_id', user.id)
            .eq(
              'key',
              'show_dev_tools'
            )
            .maybeSingle();

          if (error) throw error;

          setShowDevTools(
            data?.value ?? false
          );
        } catch (error) {
          console.error(
            'Error fetching dev tools setting:',
            error
          );
        }
      };

    fetchDevToolsSetting();
  }, [isAdmin, user]);

  /* =======================================================
     LOADING
  ======================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const timer = setTimeout(
        () => setLocalLoading(false),
        300
      );

      return () =>
        clearTimeout(timer);
    }

    setLocalLoading(false);
  }, [authLoading, user]);

  /* =======================================================
     HASH NAVIGATION
  ======================================================= */

  useEffect(() => {
    if (!location.hash) return;

    const elementId =
      location.hash.replace('#', '');

    const element =
      document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      element.classList.add(
        'settings-highlight'
      );

      const timeoutId =
        setTimeout(() => {
          element.classList.remove(
            'settings-highlight'
          );

          const cleanPath =
            window.location.pathname +
            window.location.search;

          window.history.replaceState(
            null,
            '',
            cleanPath
          );
        }, 2500);

      return () => {
        clearTimeout(timeoutId);

        element.classList.remove(
          'settings-highlight'
        );
      };
    }

    const cleanPath =
      window.location.pathname +
      window.location.search;

    window.history.replaceState(
      null,
      '',
      cleanPath
    );
  }, [location.hash]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const userSections = useMemo(
    () => [
      {
        id: 'appearance',
        label: 'Appearance',
        icon: 'bi-palette2',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bi-bell',
      },
      {
        id: 'account',
        label: 'Account',
        icon: 'bi-person',
      },
    ],
    []
  );

  const adminSections = useMemo(
    () => [
      {
        id: 'maintenance',
        label: 'Maintenance',
        icon: 'bi-tools',
      },
      ...(import.meta.env.MODE ===
      'development'
        ? [
            {
              id: 'developer',
              label: 'Developer',
              icon: 'bi-code-slash',
            },
          ]
        : []),
    ],
    []
  );

  const scrollToSection = (
    sectionId
  ) => {
    setActiveSection(sectionId);

    const element =
      document.getElementById(
        sectionId
      );

    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  /* =======================================================
     THEME
  ======================================================= */

  const handleThemeChange =
    async (themeId) => {
      const previousTheme = theme;

      setThemeSaving(true);

      try {
        changeTheme(themeId);

        if (updateSetting) {
          await updateSetting(
            'theme',
            themeId
          );
        }

        toast.success(
          'Theme updated'
        );

        setShowThemeModal(false);
      } catch {
        changeTheme(
          previousTheme
        );

        toast.error(
          'Failed to save theme preference'
        );
      } finally {
        setThemeSaving(false);
      }
    };

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const handleNotificationToggle =
    async (type, value) => {
      if (updating) return;

      setUpdating(true);

      const key =
        type === 'email'
          ? 'email_notifications'
          : 'in_app_notifications';

      try {
        if (type === 'email') {
          setEmailNotifications(
            value
          );
        } else {
          setInAppNotifications(
            value
          );
        }

        if (updateSetting) {
          await updateSetting(
            key,
            value
          );
        }

        toast.success(
          'Preferences updated'
        );
      } catch (error) {
        toast.error(
          error.message ||
            'Failed to update preferences'
        );

        if (type === 'email') {
          setEmailNotifications(
            !value
          );
        } else {
          setInAppNotifications(
            !value
          );
        }
      } finally {
        setUpdating(false);
      }
    };

  /* =======================================================
     MAINTENANCE
  ======================================================= */

  const handleMaintenanceToggle =
    async () => {
      if (adminUpdating) return;

      setAdminUpdating(true);

      try {
        const newStatus =
          !maintenanceMode;

        await adminAPI.toggleMaintenance({
          maintenance_mode:
            newStatus,
        });

        setMaintenanceMode(
          newStatus
        );

        toast.success(
          `Maintenance mode ${
            newStatus
              ? 'enabled'
              : 'disabled'
          }`
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.error ||
            'Failed to toggle maintenance'
        );
      } finally {
        setAdminUpdating(false);
      }
    };

  /* =======================================================
     DEV TOOLS
  ======================================================= */

  const handleDevToolsToggle =
    async () => {
      if (!user || devToolsUpdating) {
        return;
      }

      setDevToolsUpdating(true);

      try {
        const newValue =
          !showDevTools;

        const {
          data: existing,
          error: findError,
        } = await supabase
          .from('user_settings')
          .select('id')
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'key',
            'show_dev_tools'
          )
          .maybeSingle();

        if (
          findError &&
          findError.code !==
            'PGRST116'
        ) {
          throw findError;
        }

        if (existing) {
          const {
            error: updateError,
          } = await supabase
            .from('user_settings')
            .update({
              value: newValue,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              existing.id
            );

          if (updateError) {
            throw updateError;
          }
        } else {
          const {
            error: insertError,
          } = await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              key: 'show_dev_tools',
              value: newValue,
            });

          if (insertError) {
            throw insertError;
          }
        }

        setShowDevTools(
          newValue
        );

        window.dispatchEvent(
          new CustomEvent(
            'devToolsToggled',
            {
              detail: {
                enabled:
                  newValue,
              },
            }
          )
        );

        toast.success(
          `Dev tools ${
            newValue
              ? 'enabled'
              : 'disabled'
          }`
        );
      } catch (error) {
        toast.error(
          `Failed to toggle dev tools: ${error.message}`
        );
      } finally {
        setDevToolsUpdating(
          false
        );
      }
    };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDeleteAccount =
    async () => {
      if (!isDeleteConfirmed) return;

      setDeleting(true);

      try {
        await signOut();

        toast.success(
          'Account deleted successfully'
        );

        navigate('/');
      } catch (error) {
        toast.error(
          error.response?.data
            ?.error ||
            'Failed to delete account'
        );
      } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        setDeleteConfirmText('');
      }
    };

  const closeDeleteModal =
    () => {
      if (deleting) return;

      setShowDeleteModal(false);
      setDeleteConfirmText('');
    };

  const isDeleteConfirmed =
    deleteConfirmText
      .trim()
      .toUpperCase() ===
    'DELETE';

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    authLoading ||
    localLoading
  ) {
    return <SettingsSkeleton />;
  }

  /* =======================================================
     SIGNED OUT
  ======================================================= */

  if (!user) {
    return (
      <div className="min-h-screen bg-ink-50 px-3 sm:px-5">
        <div className="mx-auto max-w-5xl pb-12">
          <PageNavigation />

          <div className="mx-auto mt-16 max-w-md text-center">
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-primary-100
                text-primary-600
              "
            >
              <i className="bi bi-gear text-2xl" />
            </div>

            <h1 className="mt-5 text-xl font-extrabold tracking-tight text-ink-950">
              Sign in to access Settings
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-500">
              Manage your preferences,
              notifications, and account
              settings.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/login')
              }
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-primary-600
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                transition-colors
                hover:bg-primary-700
                focus:outline-none
                focus:ring-2
                focus:ring-primary-300
              "
            >
              <i className="bi bi-box-arrow-in-right" />
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  const currentSections =
    activeTab === 'admin'
      ? adminSections
      : userSections;

  const currentThemeData =
    THEMES.find((t) => t.id === theme) ||
    THEMES[0];

  return (
    <div className="min-h-screen bg-ink-50 px-3 sm:px-5">
      <style>
        {highlightStyles}
      </style>

      <div className="mx-auto max-w-5xl pb-16">
        <PageNavigation />

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header className="mt-5 sm:mt-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600">
                {isAdmin
                  ? 'Administration'
                  : 'Account'}
              </p>

              <h1 className="text-3xl font-black tracking-[-0.035em] text-ink-950 sm:text-4xl">
                Settings
              </h1>

              <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-500">
                {isAdmin
                  ? 'Manage your account, preferences, and platform controls.'
                  : 'Manage your preferences and personalize your experience.'}
              </p>
            </div>

            <div
              className="
                flex
                items-center
                gap-3
                self-start
                rounded-2xl
                border
                border-ink-200
                bg-white
                px-3
                py-2.5
                sm:self-auto
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-primary-100
                  text-primary-700
                "
              >
                <i className="bi bi-person-fill text-sm" />
              </div>

              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-xs font-bold text-ink-900">
                  {user.email}
                </p>

                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {isAdmin
                    ? 'Administrator'
                    : 'Account'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            ADMIN SWITCHER
        ================================================= */}

        {isAdmin && (
          <div className="mt-7 flex items-center border-b border-ink-200">
            {[
              {
                id: 'user',
                label: 'Personal',
                icon: 'bi-person',
              },
              {
                id: 'admin',
                label: 'Administration',
                icon: 'bi-shield-check',
              },
            ].map((tab) => {
              const active =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);

                    setActiveSection(
                      tab.id === 'user'
                        ? 'appearance'
                        : 'maintenance'
                    );
                  }}
                  className={`
                    relative
                    flex
                    items-center
                    gap-2
                    px-4
                    py-3
                    text-sm
                    font-bold
                    transition-colors

                    ${
                      active
                        ? 'text-primary-700'
                        : 'text-ink-400 hover:text-ink-700'
                    }
                  `}
                >
                  <i
                    className={`bi ${tab.icon}`}
                  />

                  {tab.label}

                  {active && (
                    <motion.span
                      layoutId="settings-top-tab"
                      className="
                        absolute
                        inset-x-0
                        bottom-[-1px]
                        h-0.5
                        rounded-full
                        bg-primary-500
                      "
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* =================================================
            CONTENT LAYOUT
        ================================================= */}

        <div className="mt-7 grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
          {/* =================================================
              SIDE NAV
          ================================================= */}

          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
                {activeTab === 'admin'
                  ? 'Controls'
                  : 'Preferences'}
              </p>

              <nav className="space-y-1">
                {currentSections.map(
                  (section) => (
                    <SettingsNavItem
                      key={section.id}
                      icon={section.icon}
                      label={section.label}
                      active={
                        activeSection ===
                        section.id
                      }
                      onClick={() =>
                        scrollToSection(
                          section.id
                        )
                      }
                    />
                  )
                )}
              </nav>

              <div className="mt-6 border-t border-ink-200 pt-4 px-3">
                <p className="text-[11px] leading-5 text-ink-400">
                  Changes are saved
                  automatically.
                </p>
              </div>
            </div>
          </aside>

          {/* =================================================
              MAIN SETTINGS
          ================================================= */}

          <main className="min-w-0">
            <AnimatePresence
              mode="wait"
            >
              {activeTab ===
                'user' && (
                <motion.div
                  key="user-settings"
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: EASE,
                  }}
                  className="space-y-9"
                >
                  {/* =================================================
                      APPEARANCE
                  ================================================= */}

                  <SettingsSection
                    id="appearance"
                    icon="bi-palette2"
                    eyebrow="Personalization"
                    title="Appearance"
                    description="Choose the visual theme used across the app."
                  >
                    <div className="p-4 sm:p-5">
                      {/* Active theme summary */}
                      <div
                        className="
                          flex
                          flex-col
                          gap-4
                          rounded-2xl
                          border
                          border-ink-200
                          bg-ink-50/50
                          p-4
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div
                            className="h-12 w-12 shrink-0 rounded-2xl border border-ink-200"
                            style={{
                              background:
                                getThemePreviewBackground(
                                  currentThemeData
                                ),
                            }}
                          />

                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
                              Current theme
                            </p>

                            <p className="mt-0.5 truncate text-sm font-extrabold text-ink-950">
                              {themeLabel(
                                currentThemeData
                              )}
                            </p>

                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  background:
                                    currentThemeData.primary,
                                }}
                              />

                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  background:
                                    currentThemeData.brand,
                                }}
                              />

                              <span className="ml-1 text-[10px] font-semibold text-ink-400">
                                Palette
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setShowThemeModal(true)
                          }
                          className="
                            inline-flex
                            shrink-0
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-ink-200
                            bg-white
                            px-4
                            py-2.5
                            text-xs
                            font-bold
                            text-ink-700
                            transition-colors

                            hover:border-ink-300
                            hover:bg-ink-50
                            hover:text-ink-950

                            focus:outline-none
                            focus:ring-2
                            focus:ring-primary-200
                          "
                        >
                          <i className="bi bi-palette2" />
                          Change theme
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
                        <i className="bi bi-check-circle-fill text-primary-500" />
                        Your theme preference is
                        saved automatically.
                      </div>
                    </div>
                  </SettingsSection>

                  {/* =================================================
                      NOTIFICATIONS
                  ================================================= */}

                  <SettingsSection
                    id="notifications"
                    icon="bi-bell"
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
                          checked={
                            emailNotifications
                          }
                          disabled={
                            updating
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
                          checked={
                            inAppNotifications
                          }
                          disabled={
                            updating
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

                  {/* =================================================
                      ACCOUNT
                  ================================================= */}

                  <SettingsSection
                    id="account"
                    icon="bi-person"
                    eyebrow="Account"
                    title="Account"
                    description="Manage your account and permanent actions."
                  >
                    <div>
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-ink-100
                              text-ink-500
                            "
                          >
                            <i className="bi bi-person text-base" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-900">
                              Signed in as
                            </p>

                            <p className="mt-0.5 truncate text-xs text-ink-500">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <span className="
                          inline-flex
                          w-fit
                          items-center
                          gap-1.5
                          rounded-full
                          bg-primary-50
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-primary-600
                        ">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          Active
                        </span>
                      </div>

                      <div className="border-t border-ink-100">
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                          <div>
                            <p className="text-sm font-bold text-ink-900">
                              Delete account
                            </p>

                            <p className="mt-0.5 max-w-lg text-xs leading-5 text-ink-500">
                              Permanently remove
                              your account and
                              associated data.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setShowDeleteModal(
                                true
                              )
                            }
                            className="
                              inline-flex
                              shrink-0
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-ink-200
                              bg-white
                              px-4
                              py-2.5
                              text-xs
                              font-bold
                              text-ink-700
                              transition-colors

                              hover:border-ink-300
                              hover:bg-ink-50
                              hover:text-ink-950

                              focus:outline-none
                              focus:ring-2
                              focus:ring-primary-200
                            "
                          >
                            <i className="bi bi-trash3" />
                            Delete account
                          </button>
                        </div>
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              )}

              {/* =================================================
                  ADMIN
              ================================================= */}

              {activeTab ===
                'admin' && (
                <motion.div
                  key="admin-settings"
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: EASE,
                  }}
                  className="space-y-9"
                >
                  {/* =================================================
                      MAINTENANCE
                  ================================================= */}

                  <SettingsSection
                    id="maintenance"
                    icon="bi-tools"
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
                          checked={
                            maintenanceMode
                          }
                          disabled={
                            adminUpdating
                          }
                          onChange={
                            handleMaintenanceToggle
                          }
                        />
                      </SettingRow>

                      <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-3.5 sm:px-5">
                        <div className="flex items-start gap-2.5">
                          <i className="bi bi-info-circle mt-0.5 text-xs text-ink-400" />

                          <p className="text-xs leading-5 text-ink-500">
                            Enabling maintenance
                            mode affects the
                            entire platform.
                            Use it only when
                            performing planned
                            maintenance or
                            emergency work.
                          </p>
                        </div>
                      </div>
                    </div>
                  </SettingsSection>

                  {/* =================================================
                      DEVELOPER
                  ================================================= */}

                  {import.meta.env.MODE ===
                    'development' && (
                    <SettingsSection
                      id="developer"
                      icon="bi-code-slash"
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
                            checked={
                              showDevTools
                            }
                            disabled={
                              devToolsUpdating
                            }
                            onChange={
                              handleDevToolsToggle
                            }
                          />
                        </SettingRow>

                        <div className="border-t border-ink-100 bg-primary-50/40 px-4 py-3.5 sm:px-5">
                          <div className="flex items-center gap-2 text-xs text-primary-700">
                            <i className="bi bi-code-square" />

                            <span className="font-semibold">
                              Development
                              environment
                            </span>
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

        {/* =================================================
            THEME MODAL
        ================================================= */}

        <Modal
          isOpen={showThemeModal}
          onClose={() => {
            if (!themeSaving) {
              setShowThemeModal(false);
            }
          }}
          title="Choose a theme"
          subtitle="Appearance"
          description="Pick the visual theme used across the app. Your selection is saved automatically."
          size="lg"
          showCloseButton={!themeSaving}
          closeOnOutsideClick={!themeSaving}
          closeOnEscape={!themeSaving}
          zIndex={120}
        >
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

          <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
            <i className="bi bi-check-circle-fill text-primary-500" />
            Your theme preference is saved automatically.
          </div>
        </Modal>

        {/* =================================================
            DELETE MODAL
        ================================================= */}

        <Modal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          title="Delete account"
          description="This action permanently removes your account."
          size="sm"
          closeOnOutsideClick={!deleting}
          closeOnEscape={!deleting}
        >
          <div className="space-y-5">
            <div className="
              rounded-2xl
              bg-ink-50
              px-4
              py-3.5
            ">
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-ink-200
                    text-ink-700
                  "
                >
                  <i className="bi bi-exclamation-triangle" />
                </div>

                <p className="text-sm leading-6 text-ink-600">
                  Deleting your account is
                  permanent. Your account and
                  associated data cannot be
                  recovered afterward.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="delete-confirm"
                className="mb-2 block text-xs font-bold text-ink-600"
              >
                Type{' '}
                <span className="text-ink-950">
                  DELETE
                </span>{' '}
                to confirm
              </label>

              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(event) =>
                  setDeleteConfirmText(
                    event.target.value
                  )
                }
                placeholder="DELETE"
                autoComplete="off"
                className="
                  input-field
                  font-semibold
                  uppercase
                "
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={deleting}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-ink-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-ink-700
                  transition-colors

                  hover:bg-ink-50
                  hover:text-ink-950

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteAccount
                }
                disabled={
                  deleting ||
                  !isDeleteConfirmed
                }
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-ink-950
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition-all

                  hover:bg-ink-800

                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary-300

                  disabled:cursor-not-allowed
                  disabled:opacity-35
                "
              >
                {deleting ? (
                  <span className="
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-white
                    border-t-transparent
                  " />
                ) : (
                  <>
                    <i className="bi bi-trash3" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default SettingsPage;