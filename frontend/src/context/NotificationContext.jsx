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
  */

  const areNotificationsEnabled =
    settings?.in_app_notifications !== false;

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

    setNotifications([]);
    setLoading(false);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fetch notifications
  |--------------------------------------------------------------------------
  */

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!user || !areNotificationsEnabled) {
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
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!isMountedRef.current) return;

        setNotifications(data || []);
      } catch (error) {
        console.error(
          'Error fetching notifications:',
          error
        );
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [
      user,
      areNotificationsEnabled,
      clearNotifications,
    ]
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
        'Error marking notification as read:',
        error
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
        'Error deleting notification:',
        error
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
        'Error bulk marking notifications as read:',
        error
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
          'Error bulk deleting notifications:',
          error
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('user_id', user.id)
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
        'Error marking all notifications as read:',
        error
      );

      throw error;
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Real-time subscription
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    /*
     * No authenticated user or notifications disabled.
     */
    if (!user || !areNotificationsEnabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      return;
    }

    /*
     * Clean up any previous channel.
     */
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName =
      `notifications:${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
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
    user,
    areNotificationsEnabled,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Initial fetch
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

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
    if (!user || !areNotificationsEnabled) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      fetchNotifications(true);
    }, POLL_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    user,
    areNotificationsEnabled,
    fetchNotifications,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Refresh when browser/app becomes visible
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user || !areNotificationsEnabled) {
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
    user,
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