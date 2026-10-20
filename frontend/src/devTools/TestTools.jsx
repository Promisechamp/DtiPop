// components/DevTools.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { systemSettingsAPI } from '../services/api/sharedApi';
import api from '../services/api/apiClient'; // your axios instance w/ auth interceptor
import { toast } from 'sonner';

const TestTools = () => {
  const { isAdmin } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const isDev = import.meta.env.MODE === 'development';

  const fetchDevToolsStatus = useCallback(async () => {
    if (!isDev || !isAdmin) {
      setIsEnabled(false);
      setLoading(false);
      return;
    }

    try {
      const response = await systemSettingsAPI.getShowDevTools();
      setIsEnabled(Boolean(response.data?.value ?? false));
    } catch (error) {
      console.error('[DevTools] Fetch error:', error);
      setIsEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [isDev, isAdmin]);

  useEffect(() => {
    fetchDevToolsStatus();
  }, [fetchDevToolsStatus]);

  // Trust the event payload — no round-trip needed
  useEffect(() => {
    const handleToggle = (event) => {
      const next = event?.detail?.enabled;
      if (typeof next === 'boolean') setIsEnabled(next);
      else fetchDevToolsStatus();
    };

    window.addEventListener('devToolsToggled', handleToggle);
    return () =>
      window.removeEventListener('devToolsToggled', handleToggle);
  }, [fetchDevToolsStatus]);

  if (!isDev || loading || !isAdmin || !isEnabled) return null;

  const addTestNotification = async () => {
    if (sending) return;
    setSending(true);

    try {
      /* Uses your existing notifications POST endpoint.
         Adjust the path if your backend mounts it differently. */
      await api.post('/notifications', {
        title: '🧪 Dev Test',
        message: `Test notification at ${new Date().toLocaleTimeString()}`,
        type: 'item_completed',
        is_read: false,
        data: { item_id: '12345', applicant_name: 'Dev Tester' },
      });

      toast.success('Test notification added! Check the bell.');
    } catch (error) {
      toast.error(
        'Failed: ' + (error.response?.data?.error || error.message)
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title="Developer Tools"
        >
          <span className="text-xs font-bold">Dev</span>
        </button>

        {isOpen && (
          <div className="absolute bottom-14 left-0 w-48 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border border-indigo-200/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-600">
                🛠 Dev Tools
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ink-400 hover:text-ink-600"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            <button
              onClick={addTestNotification}
              disabled={sending}
              className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-all"
            >
              {sending ? 'Sending…' : '🔔 Test Notification'}
            </button>

            <div className="mt-2 text-[8px] text-ink-400 text-center">
              Adds a test notification
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestTools;