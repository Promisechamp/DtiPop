import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { adminAPI } from '@/services/api/dtiApi';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

// ── Skeleton ──────────────────────────────────────────────
const SettingsSkeleton = () => (
  <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-2 py-8 mt-10">
      <PageNavigation />
      <div className="mt-10 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6"></div>
          <div className="flex items-center justify-between">
            <div className="h-10 w-64 bg-gray-200 rounded"></div>
            <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────
const AdminSettings = () => {
  const { theme, changeTheme } = useTheme();
  const [settings, setSettings] = useState({
    site_name: "Don't Trash It",
    site_description: 'A global marketplace for generosity',
    contact_email: 'support@donttrashit.com',
    maintenance_mode: false,
    maintenance_message: "We're currently performing maintenance. Please check back soon.",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      if (response.data?.settings) {
        setSettings((prev) => ({ ...prev, ...response.data.settings }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle maintenance mode via button – show confirmation first
  const handleMaintenanceToggle = () => {
    setPendingMaintenance(!settings.maintenance_mode);
    setMaintenanceModal(true);
  };

  const confirmMaintenanceToggle = async () => {
    setMaintenanceModal(false);
    const newValue = pendingMaintenance;
    setSettings((prev) => ({ ...prev, maintenance_mode: newValue }));
    // Immediately save the toggle
    setSaving(true);
    try {
      await adminAPI.updateSettings({ maintenance_mode: newValue });
      toast.success(`Maintenance mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // Revert on failure
      setSettings((prev) => ({ ...prev, maintenance_mode: !newValue }));
      toast.error('Failed to update maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const cancelMaintenanceToggle = () => {
    setMaintenanceModal(false);
    setPendingMaintenance(false);
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-2 py-8 mt-10">
        <PageNavigation />

        <div className="mt-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500">Manage platform configuration and maintenance.</p>
          </div>

          {/* General Settings Card */}
          <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={settings.site_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-400 outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Description
                </label>
                <textarea
                  name="site_description"
                  value={settings.site_description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-400 outline-none transition text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={settings.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-400 outline-none transition text-sm"
                />
              </div>
            </div>
          </div>

          {/* ── Appearance (Theme Selector) ── */}
          <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
            <p className="text-sm text-gray-500 mb-4">Choose your admin interface colour theme.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => changeTheme(t.id)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Colour swatches using the theme's own hex colours */}
                      <div className="flex gap-1">
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ background: t.primary }}
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ background: t.brand }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{t.label}</span>
                    </div>
                    {isActive && (
                      <span className="absolute top-2 right-2 text-green-600">
                        <i className="bi bi-check-circle-fill" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              <i className="bi bi-info-circle mr-1" />
              Your theme preference is saved automatically and persists across sessions.
            </p>
          </div>

          {/* Maintenance Mode Card */}
          <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable maintenance mode</p>
                <p className="text-xs text-gray-400 mt-1">
                  When enabled, visitors will see a maintenance page. Admins can still access the site.
                </p>
              </div>
              <button
                onClick={handleMaintenanceToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  settings.maintenance_mode ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {settings.maintenance_mode && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Message
                </label>
                <textarea
                  name="maintenance_message"
                  value={settings.maintenance_message}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-400 outline-none transition text-sm resize-none"
                  placeholder="We'll be back soon..."
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Maintenance Mode Confirmation Modal */}
        <Modal
          isOpen={maintenanceModal}
          onClose={cancelMaintenanceToggle}
          title={pendingMaintenance ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode'}
          size="sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                pendingMaintenance ? 'bg-amber-100' : 'bg-green-100'
              }`}
            >
              <i
                className={`text-2xl ${
                  pendingMaintenance
                    ? 'bi bi-cone-striped text-amber-600'
                    : 'bi bi-check-circle text-green-600'
                }`}
              ></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {pendingMaintenance
                  ? 'Are you sure you want to enable maintenance mode? Regular users will see a maintenance page.'
                  : 'Are you sure you want to disable maintenance mode? The site will be publicly accessible again.'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={cancelMaintenanceToggle}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmMaintenanceToggle}
              className={`flex-1 px-4 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                pendingMaintenance
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {pendingMaintenance ? 'Enable' : 'Disable'}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default AdminSettings;