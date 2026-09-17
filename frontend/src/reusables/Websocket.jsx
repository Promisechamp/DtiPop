// src/hooks/useWebSocket.jsx
import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { notificationsAPI } from "../services/api/dtiApi";

export const useWebSocket = () => {
	 const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

		
  // Fetch initial notifications
  const fetchInitialNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Setup WebSocket
  const setupSocket = useCallback(() => {
    if (!user) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('⚠️ No token available for WebSocket');
      setIsConnected(false);
      return;
    }

    console.log(`📡 Setting up WebSocket connection... (Attempt: ${reconnectAttemptsRef.current + 1})`);

    try {
      const socket = io(BACKEND_URL, {
        auth: { userId: user.id },
        transports: ['websocket'],
        reconnection: false
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('📡 WebSocket connected ✅');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      });

      socket.on('disconnect', (reason) => {
        console.log('📡 WebSocket disconnected:', reason);
        setIsConnected(false);
        
        const maxAttempts = 5;
        const baseDelay = 3000;
        const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
        
        reconnectAttemptsRef.current += 1;
        
        if (reconnectAttemptsRef.current <= maxAttempts) {
          console.log(`🔄 Attempting to reconnect WebSocket in ${delay/1000}s... (Attempt ${reconnectAttemptsRef.current}/${maxAttempts})`);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupSocket();
          }, delay);
        } else {
          console.log('⚠️ Max reconnect attempts reached. Please refresh the page.');
          toast.warning('Unable to connect to real-time notifications. Please refresh the page.');
        }
      });

      socket.on('connect_error', (error) => {
        console.error('📡 WebSocket connection error:', error);
        setIsConnected(false);
      });

      // Notification event
      socket.on('notification', (notification) => {
        console.log('🔔 New notification received:', notification);
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Chat events
      socket.on('chat:receive', (message) => {
        console.log('💬 New chat message received:', message);
        window.dispatchEvent(new CustomEvent('chat:receive', { detail: message }));
      });

      socket.on('chat:read', (data) => {
        console.log('📖 Messages read:', data);
        window.dispatchEvent(new CustomEvent('chat:read', { detail: data }));
      });

      socket.on('chat:typing', (data) => {
        window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
      });

      // Item discussion (community chat) events — mirrors the chat:* pattern
      // above so any component can subscribe via window events without
      // touching the socket instance directly.
      socket.on('discussion:new', (message) => {
        window.dispatchEvent(new CustomEvent('discussion:new', { detail: message }));
      });

      socket.on('discussion:update', (message) => {
        window.dispatchEvent(new CustomEvent('discussion:update', { detail: message }));
      });

      socket.on('discussion:delete', (data) => {
        window.dispatchEvent(new CustomEvent('discussion:delete', { detail: data }));
      });

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setIsConnected(false);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        setupSocket();
      }, 5000);
    }
  }, [user]);

  // Send chat message
  const sendChatMessage = (data) => {
    if (!socketRef.current || !isConnected) {
      console.error('WebSocket not connected');
      return Promise.reject('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      socketRef.current.emit('chat:send', data, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  };

  // Mark chat as read
  const markChatAsRead = (conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:markRead', { conversationId });
    }
  };

  // Send typing indicator
  const sendTyping = (conversationId, recipientId, isTyping) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:typing', { conversationId, recipientId, isTyping });
    }
  };

  // Join / leave an item's discussion room. socket.io buffers emits until
  // the connection is live, so these are safe to call immediately even
  // before `isConnected` flips true — no need to gate on it.
  const joinDiscussion = useCallback((itemId) => {
    if (itemId) socketRef.current?.emit('discussion:join', { itemId });
  }, []);

  const leaveDiscussion = useCallback((itemId) => {
    if (itemId) socketRef.current?.emit('discussion:leave', { itemId });
  }, []);

  // Init
  useEffect(() => {
    if (!user) return;

    fetchInitialNotifications();
    
    const timer = setTimeout(() => {
      setupSocket();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, fetchInitialNotifications, setupSocket]);

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Bulk delete notifications
  const bulkDeleteNotifications = async (ids) => {
    try {
      const response = await notificationsAPI.bulkDelete(ids);
      if (response.data.success) {
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        const deletedUnread = notifications.filter(n => ids.includes(n.id) && !n.is_read);
        if (deletedUnread.length > 0) {
          setUnreadCount(prev => Math.max(0, prev - deletedUnread.length));
        }
        return response.data;
      }
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      throw error;
    }
  };

  // Bulk mark as read
  const bulkMarkAsRead = async (ids) => {
    try {
      const response = await notificationsAPI.bulkMarkRead(ids);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n =>
            ids.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
        const markedUnread = notifications.filter(n => ids.includes(n.id) && !n.is_read);
        if (markedUnread.length > 0) {
          setUnreadCount(prev => Math.max(0, prev - markedUnread.length));
        }
        return response.data;
      }
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      throw error;
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const deleted = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (deleted && !deleted.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Refetch notifications
  const refetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  return {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDeleteNotifications,
    bulkMarkAsRead,
    refetchNotifications,
    sendChatMessage,
    markChatAsRead,
    sendTyping,
    joinDiscussion,
    leaveDiscussion,
  };
};

// ─── Shared context ──────────────────────────────────────────────────────
// Wrap this once near the root of your app (e.g. inside AuthProvider in
// App.jsx). Any component that needs socket state/actions — notification
// bell, chat page, item discussion — should use useWebSocketContext()
// instead of calling useWebSocket() directly. Calling the hook directly in
// more than one place opens a second socket connection and duplicates
// notification events.
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const ws = useWebSocket();
  return <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return ctx;
};
