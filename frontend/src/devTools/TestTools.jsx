// components/DevTools.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/api/supabase';
import { toast } from 'sonner';

const TestTools = () => {
  const { user, isAdmin } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // controls panel expansion

  const isDev = import.meta.env.MODE === 'development';

  // Fetch the setting
  const fetchDevToolsStatus = useCallback(async () => {
    if (!user || !isDev || !isAdmin) {
      setIsEnabled(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'show_dev_tools')
        .maybeSingle();

      if (error) throw error;
      setIsEnabled(data?.value ?? false);
    } catch (error) {
      console.error('[DevTools] Fetch error:', error);
      setIsEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [user, isDev, isAdmin]);

  // Initial fetch
  useEffect(() => {
    fetchDevToolsStatus();
  }, [fetchDevToolsStatus]);

  // Listen for changes from Settings page
  useEffect(() => {
    const handleToggle = (e) => {
      fetchDevToolsStatus();
    };
    window.addEventListener('devToolsToggled', handleToggle);
    return () => window.removeEventListener('devToolsToggled', handleToggle);
  }, [fetchDevToolsStatus]);

  // If not dev, not admin, or disabled – render nothing (except a tiny indicator if disabled?)
  if (!isDev || loading || !isAdmin || !isEnabled) {
    // Optionally show nothing. We'll show nothing when disabled.
    return null;
  }

  const addTestNotification = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title: '🧪 Dev Test',
      message: `Test notification at ${new Date().toLocaleTimeString()}`,
      type: 'item_completed',
      is_read: false,
      data: { item_id: '12345', applicant_name: 'Dev Tester' }
    });

    if (error) {
      toast.error('Failed: ' + error.message);
    } else {
      toast.success('Test notification added! Check the bell.');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        {/* Main toggle button - minimal "Dev" */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title="Developer Tools"
        >
          <span className="text-xs font-bold">Dev</span>
        </button>

        {/* Expandable panel */}
        {isOpen && (
          <div className="absolute bottom-14 left-0 w-48 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border border-indigo-200/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-600">🛠 Dev Tools</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ink-400 hover:text-ink-600"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>
            <button
              onClick={addTestNotification}
              className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all"
            >
              🔔 Test Notification
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