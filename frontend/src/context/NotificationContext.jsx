// context/NotificationContext.jsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { supabase } from '../services/api/supabase';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 60 * 1000;

/* ============================================================
   HELPERS
============================================================ */

/*
 * Normalizes a Supabase / fetch error into a useful log payload.
 * Without this, the console just prints `Error {}` and you
 * cannot tell whether it was a 401, RLS denial, network drop,
 * or aborted request.
 */
const describeError = (error) => {
  if (!error) {
    return { message: 'Unknown error' };
  }

  return {
    message: error.message || String(error),
    code: error.code || error.status || null,
    details: error.details || null,
    hint: error.hint || null,
    status: error.status || null,
  };
};

/*
 * Shallow-compare two notification rows by the fields we care
 * about for rendering. Used to avoid replacing `notifications`
 * with an identical array, which would re-render every consumer.
 */
const areNotificationsEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (left === right) continue;

    if (
      !left ||
      !right ||
      left.id !== right.id ||
      left.is_read !== right.is_read ||
      left.updated_at !== right.updated_at ||
      left.created_at !== right.created_at
    ) {
      return false;
    }
  }

  return true;
};

export const NotificationProvider = ({ children }) => {
  const { user, settings } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const channelRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Notification preference
  |--------------------------------------------------------------------------
  |
  | Coerced to a boolean so that downstream effect deps never see a
  | new object reference from `settings`.
  |
  */

  const areNotificationsEnabled =
    settings?.in_app_notifications !== false;

  /*
  |--------------------------------------------------------------------------
  | Stable user id
  |--------------------------------------------------------------------------
  |
  | `user` from useAuth is often a new object every time the auth
  | context re-renders. Deriving a primitive id lets every effect
  | below key off a value that only changes on actual auth changes.
  |
  */

  const userId = user?.id ?? null;

  /*
  |--------------------------------------------------------------------------
  | Refs used to keep fetchNotifications stable
  |--------------------------------------------------------------------------
  |
  | `fetchNotifications` needs the current user id and the current
  | preference, but we do NOT want those values in its dependency
  | array, because doing so cascades new identities into every
  | effect that uses it (initial fetch, polling, visibility).
  |
  */

  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const enabledRef = useRef(areNotificationsEnabled);
  useEffect(() => {
    enabledRef.current = areNotificationsEnabled;
  }, [areNotificationsEnabled]);

  /*
  |--------------------------------------------------------------------------
  | Derived unread count
  |--------------------------------------------------------------------------
  |
  | We derive this from notifications instead of maintaining a second piece
  | of state. This prevents unreadCount from becoming out of sync.
  |
  */

  const unreadCount = useMemo(
    () =>
      notifications.reduce(
        (count, notification) =>
          count + (!notification.is_read ? 1 : 0),
        0
      ),
    [notifications]
  );

  /*
  |--------------------------------------------------------------------------
  | Reset local state
  |--------------------------------------------------------------------------
  */

  const clearNotifications = useCallback(() => {
    if (!isMountedRef.current) return;

    setNotifications((current) =>
      current.length === 0 ? current : []
    );

    setLoading(false);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fetch notifications
  |--------------------------------------------------------------------------
  |
  | `userId` and `areNotificationsEnabled` are read from refs so this
  | callback identity is stable across auth re-renders. It will not
  | change, so effects depending on it will not tear down / rebuild
  | on every tick.
  |
  */

  const fetchNotifications = useCallback(
    async (silent = false) => {
      const activeUserId = userIdRef.current;
      const enabled = enabledRef.current;

      if (!activeUserId || !enabled) {
        clearNotifications();
        return;
      }

      if (!silent && isMountedRef.current) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', activeUserId)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!isMountedRef.current) return;

        /*
         * Only replace the array if the rows actually changed.
         * Prevents a full re-render of every consumer when the
         * poll returns identical data (which is the common case).
         */
        setNotifications((current) => {
          const next = data || [];

          if (areNotificationsEqual(current, next)) {
            return current;
          }

          return next;
        });
      } catch (error) {
        /*
         * Log a structured payload so the console shows the
         * actual message / code instead of `Error {}`.
         */
        console.error(
          '❌ Error fetching notifications:',
          describeError(error)
        );
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [clearNotifications]
  );

  /*
  |--------------------------------------------------------------------------
  | Mark one notification as read
  |--------------------------------------------------------------------------
  */

  const markAsRead = useCallback(async (id) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      if (!isMountedRef.current) return;

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        '❌ Error marking notification as read:',
        describeError(error)
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Delete one notification
  |--------------------------------------------------------------------------
  */

  const deleteNotification = useCallback(async (id) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      if (!isMountedRef.current) return;

      setNotifications((current) =>
        current.filter(
          (notification) => notification.id !== id
        )
      );
    } catch (error) {
      console.error(
        '❌ Error deleting notification:',
        describeError(error)
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Bulk mark as read
  |--------------------------------------------------------------------------
  */

  const bulkMarkAsRead = useCallback(async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: true,
        message: 'Nothing to update',
      };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .in('id', ids);

      if (error) {
        throw error;
      }

      if (!isMountedRef.current) {
        return {
          success: true,
          message: `Marked ${ids.length} as read`,
        };
      }

      const idSet = new Set(ids);

      setNotifications((current) =>
        current.map((notification) =>
          idSet.has(notification.id)
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

      return {
        success: true,
        message: `Marked ${ids.length} as read`,
      };
    } catch (error) {
      console.error(
        '❌ Error bulk marking notifications as read:',
        describeError(error)
      );

      throw error;
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Bulk delete
  |--------------------------------------------------------------------------
  */

  const bulkDeleteNotifications = useCallback(
    async (ids) => {
      if (!Array.isArray(ids) || ids.length === 0) {
        return {
          success: true,
          message: 'Nothing to delete',
        };
      }

      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .in('id', ids);

        if (error) {
          throw error;
        }

        if (!isMountedRef.current) {
          return {
            success: true,
            message: `Deleted ${ids.length} notifications`,
          };
        }

        const idSet = new Set(ids);

        setNotifications((current) =>
          current.filter(
            (notification) =>
              !idSet.has(notification.id)
          )
        );

        return {
          success: true,
          message: `Deleted ${ids.length} notifications`,
        };
      } catch (error) {
        console.error(
          '❌ Error bulk deleting notifications:',
          describeError(error)
        );

        throw error;
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Mark everything as read
  |--------------------------------------------------------------------------
  */

  const markAllAsRead = useCallback(async () => {
    const activeUserId = userIdRef.current;

    if (!activeUserId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('user_id', activeUserId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      if (!isMountedRef.current) return;

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error(
        '❌ Error marking all notifications as read:',
        describeError(error)
      );

      throw error;
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Mount tracking
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Real-time subscription
  |--------------------------------------------------------------------------
  |
  | Now keyed off `userId` (a primitive) and the boolean preference.
  | The channel is torn down and rebuilt only when the user
  | actually changes or notifications are toggled — not on every
  | auth context re-render.
  |
  */

  useEffect(() => {
    /*
     * No authenticated user or notifications disabled.
     */
    if (!userId || !areNotificationsEnabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      return undefined;
    }

    /*
     * Clean up any previous channel.
     */
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName =
      `notifications:${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new;

          if (!incoming?.id) return;

          setNotifications((current) => {
            /*
             * Prevent duplicate notifications.
             */
            if (
              current.some(
                (notification) =>
                  notification.id === incoming.id
              )
            ) {
              return current;
            }

            /*
             * Insert newest notification at the top.
             */
            return [
              incoming,
              ...current,
            ];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Notification realtime channel error.'
          );
        }

        if (status === 'TIMED_OUT') {
          console.error(
            'Notification realtime channel timed out.'
          );
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current === channel) {
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
    };
  }, [
    userId,
    areNotificationsEnabled,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Initial fetch
  |--------------------------------------------------------------------------
  |
  | fetchNotifications is now stable, so this runs once per user
  | (and again if notifications are toggled).
  |
  */

  useEffect(() => {
    if (!userId || !areNotificationsEnabled) {
      clearNotifications();
      return;
    }

    fetchNotifications(false);
  }, [
    userId,
    areNotificationsEnabled,
    fetchNotifications,
    clearNotifications,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Background polling
  |--------------------------------------------------------------------------
  |
  | Realtime is the primary mechanism.
  | Polling is simply a safety net in case a realtime event is missed.
  |
  */

  useEffect(() => {
    if (!userId || !areNotificationsEnabled) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      fetchNotifications(true);
    }, POLL_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    userId,
    areNotificationsEnabled,
    fetchNotifications,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Refresh when browser/app becomes visible
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!userId || !areNotificationsEnabled) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        fetchNotifications(true);
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [
    userId,
    areNotificationsEnabled,
    fetchNotifications,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Context value
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,

      fetchNotifications,

      markAsRead,
      deleteNotification,

      markAllAsRead,

      bulkMarkAsRead,
      bulkDeleteNotifications,

      areNotificationsEnabled,
    }),
    [
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      deleteNotification,
      markAllAsRead,
      bulkMarkAsRead,
      bulkDeleteNotifications,
      areNotificationsEnabled,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

export const useNotifications = () => {
  const context = useContext(
    NotificationContext
  );

  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }

  return context;
};