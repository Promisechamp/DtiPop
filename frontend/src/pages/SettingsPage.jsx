import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../utils/themes';
import { adminAPI } from '../services/api/dtiApi';
import { supabase } from '../services/api/supabase';
import { PageNavigation, PageNavigationSkeleton } from '../reusables/PageNavigation';
import Modal from '../reusables/Modal';

const EASE = [0.22, 1, 0.36, 1];

const highlightStyles = `
  @keyframes highlightPulse {
    0%   { box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.4); }
    50%  { box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.18); }
    100% { box-shadow: 0 0 0 0 rgba(15, 23, 42, 0); }
  }
  .highlight-pulse {
    animation: highlightPulse 1.15s ease-in-out 3;
    border-color: #0f172a !important;
  }
`;

const themeLabel = (t) => ( t.label );

/* ── Building blocks ─────────────────────────────────────────────── */

const SectionIcon = ({ icon, color = 'primary' }) => {
  const colorStyles = {
    primary: 'border-primary-200/80 bg-primary-50 text-primary-600',
    amber: 'border-amber-200/80 bg-amber-50 text-amber-600',
    rose: 'border-rose-200/80 bg-rose-50 text-rose-600',
  };

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
        colorStyles[color] || colorStyles.primary
      }`}
    >
      <i className={`bi ${icon} text-lg`} />
    </div>
  );
};

const SectionHeader = ({ icon, color, title, description }) => (
  <div className="flex items-start gap-3.5 px-5 py-4 sm:px-6 sm:py-5 border-b border-ink-100/90">
    <SectionIcon icon={icon} color={color} />
    <div className="min-w-0 pt-0.5">
      <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900 sm:text-base">
        {title}
      </h2>
      {description && (
        <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{description}</p>
      )}
    </div>
  </div>
);

const ToggleSwitch = ({
  checked,
  onChange,
  disabled,
  activeColor = 'bg-primary-600',
  ring = 'focus-visible:ring-primary-500',
}) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    aria-pressed={checked}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ring}
      disabled:cursor-not-allowed disabled:opacity-50
      ${checked ? activeColor : 'bg-ink-200'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

const SettingRow = ({ title, description, children }) => (
  <div className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 -mx-1 transition-colors duration-150 hover:bg-ink-50/70">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && (
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/* ── Skeleton ────────────────────────────────────────────────────── */

const SettingsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/40 px-3 sm:px-4">
    <div className="mx-auto max-w-3xl space-y-6">
      <PageNavigationSkeleton />

      <div className="animate-pulse space-y-3">
        <div className="h-3 w-36 rounded-full bg-ink-200" />
        <div className="h-8 w-40 rounded-lg bg-ink-200" />
        <div className="h-4 w-64 max-w-full rounded bg-ink-200" />
      </div>

      <div className="flex gap-2 animate-pulse">
        <div className="h-10 w-32 rounded-xl bg-ink-200" />
        <div className="h-10 w-32 rounded-xl bg-ink-200" />
      </div>

      <div className="space-y-5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3.5 border-b border-ink-100 px-6 py-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-ink-200" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-ink-200" />
                <div className="h-3 w-44 rounded bg-ink-200" />
              </div>
            </div>
            <div className="space-y-4 p-6 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-ink-200" />
                    <div className="h-3 w-24 rounded bg-ink-200" />
                  </div>
                  <div className="h-6 w-11 rounded-full bg-ink-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Main component ──────────────────────────────────────────────── */

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

  const isAdmin = authIsAdmin;

  const [activeTab, setActiveTab] = useState('user');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminUpdating, setAdminUpdating] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsUpdating, setDevToolsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.email_notifications !== undefined ? settings.email_notifications : true);
      setInAppNotifications(settings.in_app_notifications !== undefined ? settings.in_app_notifications : true);
    }
  }, [settings]);

  useEffect(() => {
    if (isAdmin && user) {
      adminAPI
        .getMaintenanceStatus()
        .then((res) => setMaintenanceMode(res.data?.maintenance_mode ?? false))
        .catch((err) => console.error('Failed to load maintenance status', err));

      const fetchDevToolsSetting = async () => {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'show_dev_tools')
            .maybeSingle();
          if (error) throw error;
          setShowDevTools(data?.value ?? false);
        } catch (error) {
          console.error('Error fetching dev tools setting:', error);
        }
      };
      fetchDevToolsSetting();
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        const timer = setTimeout(() => setLocalLoading(false), 400);
        return () => clearTimeout(timer);
      }
      setLocalLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.replace('#', '');
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-pulse');
        const timeoutId = setTimeout(() => {
          element.classList.remove('highlight-pulse');
          const cleanPath = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanPath);
        }, 2500);
        return () => {
          clearTimeout(timeoutId);
          element.classList.remove('highlight-pulse');
        };
      } else {
        const cleanPath = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanPath);
      }
    }
  }, [location.hash]);

  const handleThemeChange = async (themeId) => {
    const previousTheme = theme;
    try {
      changeTheme(themeId);
      if (updateSetting) await updateSetting('theme', themeId);
      toast.success('Theme updated');
    } catch {
      changeTheme(previousTheme);
      toast.error('Failed to save theme preference');
    }
  };

  const handleNotificationToggle = async (type, value) => {
    if (updating) return;
    setUpdating(true);
    try {
      const key = type === 'email' ? 'email_notifications' : 'in_app_notifications';
      if (type === 'email') setEmailNotifications(value);
      else setInAppNotifications(value);
      if (updateSetting) await updateSetting(key, value);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update preferences');
      if (type === 'email') setEmailNotifications(!value);
      else setInAppNotifications(!value);
    } finally {
      setUpdating(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    setAdminUpdating(true);
    try {
      const newStatus = !maintenanceMode;
      await adminAPI.toggleMaintenance({ maintenance_mode: newStatus });
      setMaintenanceMode(newStatus);
      toast.success(`Maintenance mode ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle maintenance');
    } finally {
      setAdminUpdating(false);
    }
  };

  const handleDevToolsToggle = async () => {
    if (!user) return;
    setDevToolsUpdating(true);
    try {
      const newValue = !showDevTools;
      const { data: existing, error: findError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('key', 'show_dev_tools')
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') throw findError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({ value: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, key: 'show_dev_tools', value: newValue });
        if (insertError) throw insertError;
      }

      setShowDevTools(newValue);
      window.dispatchEvent(new CustomEvent('devToolsToggled', { detail: { enabled: newValue } }));
      toast.success(`Dev tools ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle dev tools: ' + error.message);
    } finally {
      setDevToolsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await signOut();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  const isDeleteConfirmed = deleteConfirmText.trim().toUpperCase() === 'DELETE';

  if (authLoading || localLoading) return <SettingsSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-ink-50/40 px-3 sm:px-4">
        <div className="mx-auto max-w-3xl space-y-8">
          <PageNavigation />
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white px-8 py-14 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-primary-100/50 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-gear text-2xl" />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-ink-900">
                Sign in to access Settings
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
                Manage your preferences, notifications, and account.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-box-arrow-in-right" />
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/40 px-3 sm:px-4">
      <style>{highlightStyles}</style>

      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <PageNavigation />

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white px-5 py-6 sm:px-7 sm:py-7 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-brand-100/30 blur-2xl" />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-600">
                {isAdmin ? 'Admin & User Settings' : 'Account & Preferences'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[1.75rem]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {isAdmin
                ? 'Personal preferences and platform controls'
                : 'Customize your experience and manage your account'}
            </p>
          </div>
        </header>

        {/* ── Tabs (admin only) ──────────────────────────────────── */}
        {isAdmin && (
          <div className="inline-flex rounded-xl border border-ink-100 bg-ink-50/80 p-1">
            {[
              { id: 'user', label: 'User', icon: 'bi-person' },
              { id: 'admin', label: 'Admin', icon: 'bi-shield-lock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-primary-700'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="settingsTabPill"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
                <i className={`relative bi ${tab.icon} text-[15px]`} />
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── User panel ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {(activeTab === 'user' || !isAdmin) && (
            <motion.div
              key="user-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-5"
            >
              {/* Appearance */}
              <section className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
                <SectionHeader
                  icon="bi-palette"
                  color="primary"
                  title="Appearance"
                  description="Choose your personal colour theme"
                />
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {THEMES.map((t) => {
                      const isActive = theme === t.id;

                      return (
                        <button
                          key={t.id}
                          onClick={() => handleThemeChange(t.id)}
                          className={`group relative overflow-hidden rounded-xl border-2 bg-white text-left transition-all duration-200
                            ${isActive
                              ? 'border-primary-500 shadow-md shadow-primary-500/10'
                              : 'border-ink-150 hover:border-ink-300 hover:-translate-y-0.5 hover:shadow-sm'
                            }
                            ${isActive ? 'bg-primary-50/40' : ''}
                          `}
                        >
                          {/* Preview strip */}
                          <div
                            className="h-9 w-full"
                            style={{ background: `linear-gradient(135deg, ${t.primary} 0%, ${t.brand} 100%)` }}
                          />
                          {/* Fake content area */}
                          <div className="px-3 pt-2.5 pb-3 bg-inherit">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1.5">
                                <span
                                  className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                                  style={{ background: t.primary }}
                                />
                                <span
                                  className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                                  style={{ background: t.brand }}
                                />
                              </div>
                              <span className="text-[13px] font-semibold text-ink-900">
                                {themeLabel(t)}
                              </span>
                            </div>
                          </div>

                          {isActive && (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                              <i className="bi bi-check text-xs font-bold" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3.5 flex items-center gap-1.5 text-xs text-ink-500">
                    <i className="bi bi-info-circle text-[11px]" />
                    Theme preference is saved automatically.
                  </p>
                </div>
              </section>

              {/* Notifications */}
              <section
                id="inAppNoti"
                className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all duration-300"
              >
                <SectionHeader
                  icon="bi-bell"
                  color="primary"
                  title="Notifications"
                  description="Control how you receive updates"
                />
                <div className="space-y-0.5 px-4 py-3 sm:px-5">
                  <SettingRow title="Email notifications" description="Receive updates via email">
                    <ToggleSwitch
                      checked={emailNotifications}
                      onChange={() => handleNotificationToggle('email', !emailNotifications)}
                      disabled={updating}
                    />
                  </SettingRow>
                  <SettingRow title="In-app notifications" description="Show notifications inside the app">
                    <ToggleSwitch
                      checked={inAppNotifications}
                      onChange={() => handleNotificationToggle('in_app', !inAppNotifications)}
                      disabled={updating}
                    />
                  </SettingRow>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="overflow-hidden rounded-2xl border border-rose-200/70 bg-white shadow-sm">
                <SectionHeader
                  icon="bi-exclamation-triangle"
                  color="rose"
                  title="Danger Zone"
                  description="Irreversible actions — proceed with caution"
                />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Delete your account</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                        Permanently removes all your data. This cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="shrink-0 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600 active:bg-rose-700"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Admin panel ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isAdmin && activeTab === 'admin' && (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-5"
            >
              {/* Maintenance */}
              <section className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
                <SectionHeader
                  icon="bi-tools"
                  color="amber"
                  title="Maintenance Mode"
                  description="Enable or disable site-wide maintenance"
                />
                <div className="px-4 py-4 sm:px-5">
                  <SettingRow
                    title={maintenanceMode ? 'Maintenance is ON' : 'Maintenance is OFF'}
                    description={
                      maintenanceMode
                        ? 'Users currently see a maintenance page.'
                        : 'The site is live and accessible to everyone.'
                    }
                  >
                    <ToggleSwitch
                      checked={maintenanceMode}
                      onChange={handleMaintenanceToggle}
                      disabled={adminUpdating}
                      activeColor="bg-amber-500"
                      ring="focus-visible:ring-amber-500"
                    />
                  </SettingRow>
                </div>
              </section>

              {/* Dev Tools */}
              {import.meta.env.MODE === 'development' && (
                <section className="overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50/40 to-transparent shadow-sm">
                  <div className="flex items-start gap-3.5 border-b border-primary-100/80 px-5 py-4 sm:px-6 sm:py-5">
                    <SectionIcon icon="bi-code-square" color="primary" />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-0.5">
                      <div>
                        <h2 className="text-[15px] font-extrabold tracking-tight text-primary-700 sm:text-base">
                          Developer Tools
                        </h2>
                        <p className="mt-0.5 text-[13px] text-primary-600/70">
                          Toggle development tools in the interface
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-600 ring-1 ring-inset ring-primary-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                        Dev
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-4 sm:px-5">
                    <SettingRow
                      title={showDevTools ? 'Dev Tools are ON' : 'Dev Tools are OFF'}
                      description={
                        showDevTools
                          ? 'Development tools are visible in the app'
                          : 'Development tools are hidden from the interface'
                      }
                    >
                      <ToggleSwitch
                        checked={showDevTools}
                        onChange={handleDevToolsToggle}
                        disabled={devToolsUpdating}
                      />
                    </SettingRow>
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Delete modal ───────────────────────────────────────── */}
        <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Account" size="sm">
          <div className="space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <i className="bi bi-exclamation-triangle text-lg" />
              </div>
              <p className="text-sm leading-relaxed text-ink-600 pt-1">
                Are you sure you want to delete your account? This action is permanent and cannot be
                undone.
              </p>
            </div>

            <div>
              <label
                htmlFor="delete-confirm"
                className="mb-1.5 block text-xs font-semibold text-ink-500"
              >
                Type <span className="font-bold text-rose-600">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-500/15"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || !isDeleteConfirmed}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {deleting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Delete Account'
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
