import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import{ useWebSocket } from '@/reusables/Websocket';

const ChatButton = ({ onClick }) => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();

  const [unreadCount, setUnreadCount] = useState(0);

  // ── Fetch initial unread count ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const response = await fetch('/api/chat/unread-count', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnread();
  }, [user]);

  // ── WebSocket / event listeners for real‑time updates ──────
  useEffect(() => {
    if (!user) return;

    const handleChatReceive = (event) => {
      const message = event.detail;
      if (message.sender_id !== user.id) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleChatRead = (event) => {
      const data = event.detail;
      if (data.readBy === user.id) {
        setUnreadCount(0);
      }
    };

    window.addEventListener('chat:receive', handleChatReceive);
    window.addEventListener('chat:read', handleChatRead);

    return () => {
      window.removeEventListener('chat:receive', handleChatReceive);
      window.removeEventListener('chat:read', handleChatRead);
    };
  }, [user]);

  // ── Do not show if not connected or not logged in ──────────
  if (!isConnected || !user) return null;

  // ── Only show when there are unread messages ────────────────
  if (unreadCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onClick}
        className="fixed bottom-6 right-6 z-40 p-3.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-lg active:scale-95 text-white rounded-full shadow-md transition-all duration-300 group"
        aria-label="Open chat"
      >
        <div className="relative">
          <i className="bi bi-chat-dots text-2xl"></i>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
        </div>
      </motion.button>
    </AnimatePresence>
  );
};

export default ChatButton;