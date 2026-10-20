import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Bell,
  BellOff,
  CheckCheck,
  List,
  CheckCircle2,
  X,
  ArrowRight,
  Loader2,
  MessageCircle,
  AtSign,
  Clock3,
  Sparkles,
  Check,
  ExternalLink,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

import ChatModal from '@/pages/chat/ChatModal';
import ActionMenu from '@/reusables/ActionMenu';

import { getNotificationMeta } from '@/utils/constants';

import { itemsAPI } from '@/services/api/dtiApi';
import { chatAPI } from '@/services/api/sharedApi';

/* ==========================================================================
   CONSTANTS
========================================================================== */

const MAX_VISIBLE_NOTIFICATIONS = 10;
const DROPDOWN_WIDTH = 420;
const VIEWPORT_PADDING = 12;

/* ==========================================================================
   CLASS HELPERS
========================================================================== */

const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ==========================================================================
   NOTIFICATION BELL SKELETON
========================================================================== */

const NotificationBellSkeleton = () => (
  <div className="flex h-10 w-10 items-center justify-center">
    <div className="h-9 w-9 animate-pulse rounded-2xl bg-ink-100" />
  </div>
);

/* ==========================================================================
   TIME FORMATTER
========================================================================== */

const formatTime = (date) => {
  if (!date) return '';

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return '';

  const diff = Math.max(0, Date.now() - timestamp);

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

/* ==========================================================================
   NOTIFICATION METADATA
========================================================================== */

const getNotificationMetaSafe = (type) => {
  try {
    return getNotificationMeta(type) || {};
  } catch {
    return {};
  }
};

/* ==========================================================================
   NOTIFICATION CATEGORY
========================================================================== */

const getNotificationCategory = (type) => {
  if (['chat', 'message_received'].includes(type)) return 'Message';
  if (type === 'reinterest') return 'Re-interest';
  if (type === 'mention') return 'Mention';
  if (type === 'discussion_reply') return 'Discussion';

  if (
    [
      'application_submitted',
      'application_received',
      'application_accepted',
      'application_rejected',
    ].includes(type)
  ) {
    return 'Application';
  }

  if (
    [
      'new_support_ticket',
      'support_ticket_created',
      'support_reply',
      'support_user_reply',
      'support_status_update',
      'support_ticket_deleted',
    ].includes(type)
  ) {
    return 'Support';
  }

  if (
    ['winner_announced', 'item_completed', 'item_shipped'].includes(type)
  ) {
    return 'Item update';
  }

  return 'Notification';
};

/* ==========================================================================
   ICON STYLES — semantic tokens only
========================================================================== */

const getNotificationIconStyle = (type, isUnread) => {
  const base = isUnread
    ? 'border-primary-100 bg-primary-50 text-primary-600'
    : 'border-ink-100 bg-ink-50 text-ink-500';

  const styles = {
    chat: 'border-primary-100 bg-primary-50 text-primary-600',
    message_received: 'border-primary-100 bg-primary-50 text-primary-600',

    reinterest: 'border-primary-100 bg-primary-50 text-primary-600',

    mention: 'border-warning-100 bg-warning-50 text-warning-600',
    discussion_reply: 'border-warning-100 bg-warning-50 text-warning-600',

    application_submitted:
      'border-success-100 bg-success-50 text-success-600',

    application_received:
      'border-success-100 bg-success-50 text-success-600',

    application_accepted:
      'border-success-100 bg-success-50 text-success-600',

    application_rejected: 'border-danger-100 bg-danger-50 text-danger-600',

    winner_announced: 'border-warning-100 bg-warning-50 text-warning-600',

    item_completed: 'border-success-100 bg-success-50 text-success-600',

    item_shipped: 'border-primary-100 bg-primary-50 text-primary-600',

    new_support_ticket:
      'border-warning-100 bg-warning-50 text-warning-600',

    support_ticket_created:
      'border-warning-100 bg-warning-50 text-warning-600',

    support_reply: 'border-warning-100 bg-warning-50 text-warning-600',

    support_user_reply: 'border-warning-100 bg-warning-50 text-warning-600',

    support_status_update:
      'border-warning-100 bg-warning-50 text-warning-600',

    support_ticket_deleted:
      'border-warning-100 bg-warning-50 text-warning-600',
  };

  return styles[type] || base;
};

/* ==========================================================================
   NOTIFICATION TYPE ICON
========================================================================== */

const NotificationTypeIcon = ({ type, isUnread }) => {
  const iconClass = 'h-[18px] w-[18px]';

  const iconMap = {
    chat: <MessageCircle className={iconClass} />,
    message_received: <MessageCircle className={iconClass} />,

    mention: <AtSign className={iconClass} />,
    discussion_reply: <MessageCircle className={iconClass} />,

    reinterest: <Sparkles className={iconClass} />,

    application_submitted: <CheckCircle2 className={iconClass} />,
    application_received: <Inbox className={iconClass} />,
    application_accepted: <CheckCircle2 className={iconClass} />,
    application_rejected: <X className={iconClass} />,

    winner_announced: <Sparkles className={iconClass} />,
    item_completed: <CheckCircle2 className={iconClass} />,

    item_shipped: <ArrowRight className={iconClass} />,

    new_support_ticket: <ShieldCheck className={iconClass} />,
    support_ticket_created: <ShieldCheck className={iconClass} />,
    support_reply: <MessageCircle className={iconClass} />,
    support_user_reply: <MessageCircle className={iconClass} />,
    support_status_update: <ShieldCheck className={iconClass} />,
    support_ticket_deleted: <ShieldCheck className={iconClass} />,
  };

  return (
    <div
      className={cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition duration-200',
        getNotificationIconStyle(type, isUnread)
      )}
    >
      {iconMap[type] || <Bell className={iconClass} />}

      {isUnread && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-[2.5px] border-white bg-primary-500" />
      )}
    </div>
  );
};

/* ==========================================================================
   NOTIFICATION BELL
========================================================================== */

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading: contextLoading,
    areNotificationsEnabled,
  } = useNotifications();

  /* ------------------------------------------------------------------------
     REFS
  ------------------------------------------------------------------------ */

  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  /* ------------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------------ */

  const [isOpen, setIsOpen] = useState(false);

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  /* ------------------------------------------------------------------------
     DERIVED
  ------------------------------------------------------------------------ */

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const displayCount = areNotificationsEnabled ? unreadCount : 0;

  const notificationsPath = isAdmin ? '/admin/notifications' : '/notifications';

  const visibleNotifications = useMemo(() => {
    return notifications
      .filter(
        (notification) =>
          !notification.is_read && !dismissedIds.has(notification.id)
      )
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime() || 0;
        const dateB = new Date(b.created_at).getTime() || 0;

        return dateB - dateA;
      })
      .slice(0, MAX_VISIBLE_NOTIFICATIONS);
  }, [notifications, dismissedIds]);

  /* ==========================================================================
     DROPDOWN POSITION
  ========================================================================== */

  const updateDropdownPosition = useCallback(() => {
    if (!bellRef.current) return;

    const rect = bellRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    const dropdownWidth = Math.min(
      DROPDOWN_WIDTH,
      viewportWidth - VIEWPORT_PADDING * 2
    );

    let left = rect.right - dropdownWidth;

    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, viewportWidth - dropdownWidth - VIEWPORT_PADDING)
    );

    const isMobile = viewportWidth < 640;

    setDropdownPosition({
      top: isMobile ? Math.max(12, rect.bottom + 8) : rect.bottom + 12,
      left,
    });
  }, []);

  /* ==========================================================================
     REPOSITION ON RESIZE / SCROLL
  ========================================================================== */

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    const handleResize = () => updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updateDropdownPosition]);

  /* ==========================================================================
     OUTSIDE CLICK
  ========================================================================== */

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;

      if (bellRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  /* ==========================================================================
     ESCAPE KEY
  ========================================================================== */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /* ==========================================================================
     BODY SCROLL LOCK
  ========================================================================== */

  useEffect(() => {
    if (!isOpen || window.innerWidth >= 640) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  /* ==========================================================================
     NOTIFICATION ROUTING
  ========================================================================== */

  const getNotificationLink = useCallback(
    (notification) => {
      const data = notification.data || {};

      switch (notification.type) {
        case 'application_submitted':
        case 'application_received':
        case 'application_accepted':
        case 'application_rejected': {
          if (!data.item_id) return '#';

          const statusMap = {
            application_submitted: 'pending',
            application_received: 'pending',
            application_accepted: 'accepted',
            application_rejected: 'rejected',
          };

          const params = new URLSearchParams();

          params.set('itemId', data.item_id);
          params.set('status', statusMap[notification.type]);

          if (data.applicant_name) {
            params.set('search', data.applicant_name);
          }

          return `/applications-to-my-item?${params.toString()}`;
        }

        case 'winner_announced':
        case 'item_completed':
        case 'item_shipped':
          return data.item_id ? `/item/${data.item_id}` : '#';

        case 'chat':
        case 'message_received':
          return null;

        case 'reinterest': {
          if (!data.item_id) return '#';

          const params = new URLSearchParams();

          params.set('itemId', data.item_id);
          params.set('hasReinterest', 'true');

          if (data.applicant_name) params.set('search', data.applicant_name);
          if (data.status) params.set('status', data.status);

          return `/applications-to-my-item?${params.toString()}`;
        }

        case 'mention':
        case 'discussion_reply': {
          if (!data.item_id) return '#';

          const basePath = isAdmin
            ? `/admin/discussions/item/${data.item_id}`
            : `/discussions/item/${data.item_id}`;

          const params = new URLSearchParams();

          if (data.message_id) params.set('message', data.message_id);

          params.set(
            'case',
            notification.type === 'mention' ? 'mention' : 'reply'
          );

          const query = params.toString();

          return query ? `${basePath}?${query}` : basePath;
        }

        case 'new_support_ticket':
        case 'support_ticket_created':
        case 'support_reply':
        case 'support_user_reply':
        case 'support_status_update':
        case 'support_ticket_deleted':
          return isAdmin ? '/admin/support' : '#';

        default:
          return '#';
      }
    },
    [isAdmin]
  );

  /* ==========================================================================
     CHAT NOTIFICATION
  ========================================================================== */

  const handleChatNotificationClick = useCallback(
    async (notification) => {
      const data = notification.data || {};
      const chatId = data.chat_id;
      const itemId = data.item_id;

      if (!chatId && !itemId) {
        toast.error('Unable to open chat');
        return;
      }

      setChatLoading(true);

      try {
        let conversationData = null;
        let itemData = null;
        let otherUser = null;
        let isDonor = false;

        if (chatId) {
          try {
            await chatAPI.getMessages(chatId);

            conversationData = {
              id: chatId,
              other_user: data.sender || null,
              item: itemId ? { id: itemId } : null,
            };

            if (itemId) {
              const itemResponse = await itemsAPI.getById(itemId);
              itemData = itemResponse?.data?.item || null;
            }

            otherUser = data.sender || {
              id: data.sender_id,
              full_name: data.sender_name || 'User',
              avatar_url: data.sender_avatar || null,
            };

            if (itemData) {
              isDonor = itemData.donor_id === user?.id;
            }
          } catch (error) {
            console.warn('Could not load existing chat:', error);
          }
        }

        if (itemId && !chatId) {
          try {
            const response = await chatAPI.getOrCreateConversation(itemId);
            const conversation = response?.data;

            if (conversation?.conversation) {
              conversationData = {
                id: conversation.conversation.id,
                other_user: conversation.other_user || data.sender || null,
                item: conversation.item || { id: itemId },
                is_donor: conversation.is_donor || false,
              };

              otherUser = conversation.other_user || data.sender || null;
              isDonor = conversation.is_donor || false;

              if (conversation.item) {
                itemData = conversation.item;
              }
            }
          } catch (error) {
            console.warn('Could not load conversation:', error);
          }
        }

        if (!conversationData) {
          conversationData = {
            id: chatId || 'temp',
            other_user: data.sender || {
              full_name: data.sender_name || 'User',
              avatar_url: data.sender_avatar || null,
            },
            item: itemData || {
              id: itemId,
              title: data.item_title || 'Item',
            },
            is_donor: false,
          };

          otherUser = data.sender || conversationData.other_user;
        }

        const resolvedConversationId =
          conversationData.id || chatId || null;

        setChatConversation({
          id: resolvedConversationId,
          conversationId: resolvedConversationId,
          otherUser:
            otherUser ||
            conversationData.other_user || {
              full_name: data.sender_name || 'User',
              avatar_url: data.sender_avatar || null,
            },
          otherParticipant:
            otherUser || conversationData.other_user || null,
          item:
            itemData ||
            conversationData.item || {
              id: itemId,
              title: data.item_title || 'Item',
            },
          isDonor: isDonor || conversationData.is_donor || false,
        });

        setIsChatOpen(true);
        setIsOpen(false);
      } catch (error) {
        console.error('Error opening chat from notification:', error);
        toast.error('Failed to open chat');
      } finally {
        setChatLoading(false);
      }
    },
    [user?.id]
  );

  /* ==========================================================================
     RE-INTEREST NAVIGATION
  ========================================================================== */

  const handleReinterestClick = useCallback(
    (notification) => {
      const data = notification.data || {};

      if (!data.item_id) {
        toast.error('This notification has no associated item');
        return;
      }

      const params = new URLSearchParams();

      params.set('itemId', data.item_id);
      params.set('hasReinterest', 'true');

      if (data.applicant_name) params.set('search', data.applicant_name);
      if (data.status) params.set('status', data.status);

      navigate(`/applications-to-my-item?${params.toString()}`);

      setIsOpen(false);
    },
    [navigate]
  );

  /* ==========================================================================
     MARK AS READ
  ========================================================================== */

  const safelyMarkAsRead = useCallback(
    async (notification) => {
      if (notification.is_read) return true;

      try {
        await markAsRead(notification.id);
        return true;
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        toast.error('Could not mark notification as read');
        return false;
      }
    },
    [markAsRead]
  );

  /* ==========================================================================
     NOTIFICATION CLICK
  ========================================================================== */

  const handleNotificationClick = useCallback(
    async (notification) => {
      const isChat =
        notification.type === 'chat' ||
        notification.type === 'message_received';

      if (isChat) {
        const marked = await safelyMarkAsRead(notification);
        if (!marked) return;

        await handleChatNotificationClick(notification);
        return;
      }

      if (notification.type === 'reinterest') {
        const marked = await safelyMarkAsRead(notification);
        if (!marked) return;

        handleReinterestClick(notification);
        return;
      }

      const link = getNotificationLink(notification);

      if (!link || link === '#') {
        if (!notification.is_read) {
          await safelyMarkAsRead(notification);
        }

        toast.info('There is no destination available for this notification');
        return;
      }

      const marked = await safelyMarkAsRead(notification);
      if (!marked) return;

      navigate(link);

      setIsOpen(false);
    },
    [
      safelyMarkAsRead,
      handleChatNotificationClick,
      handleReinterestClick,
      getNotificationLink,
      navigate,
    ]
  );

  /* ==========================================================================
     MARK ALL AS READ
  ========================================================================== */

  const handleMarkAllAsRead = useCallback(async () => {
    if (markingAllRead || displayCount === 0) return;

    setMarkingAllRead(true);

    try {
      await markAllAsRead();

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Could not mark all notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  }, [markAllAsRead, markingAllRead, displayCount]);

  /* ==========================================================================
     DISMISS NOTIFICATION
  ========================================================================== */

  const handleDismissNotification = useCallback(
    async (event, notification) => {
      event.stopPropagation();

      setDismissedIds((current) => {
        const next = new Set(current);
        next.add(notification.id);
        return next;
      });

      try {
        await deleteNotification(notification.id);
      } catch (error) {
        setDismissedIds((current) => {
          const next = new Set(current);
          next.delete(notification.id);
          return next;
        });

        console.error('Failed to delete notification:', error);
        toast.error('Could not dismiss notification');
      }
    },
    [deleteNotification]
  );

  /* ==========================================================================
     TOGGLE DROPDOWN
  ========================================================================== */

  const toggleDropdown = useCallback(() => {
    if (!isOpen) {
      updateDropdownPosition();
    }

    setIsOpen((current) => !current);
  }, [isOpen, updateDropdownPosition]);

  /* ==========================================================================
     ACTION MENU ITEMS
  ========================================================================== */

  const menuItems = useMemo(
    () => [
      ...(displayCount > 0
        ? [
            {
              key: 'mark-all-read',
              icon: CheckCheck,
              label: markingAllRead ? 'Marking…' : 'Mark all as read',
              onClick: handleMarkAllAsRead,
            },
          ]
        : []),

      {
        key: 'view-history',
        icon: List,
        label: 'View notification history',
        onClick: () => {
          setIsOpen(false);
          navigate(notificationsPath);
        },
      },
    ],
    [
      displayCount,
      markingAllRead,
      handleMarkAllAsRead,
      notificationsPath,
      navigate,
    ]
  );

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (contextLoading) {
    return <NotificationBellSkeleton />;
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <>
      {/* ================================================================
          NOTIFICATION TRIGGER
      ================================================================ */}

      <div className="relative flex h-10 w-10 items-center justify-center">
        <button
          ref={bellRef}
          type="button"
          onClick={toggleDropdown}
          aria-label={
            displayCount > 0
              ? `Notifications, ${displayCount} unread`
              : 'Notifications'
          }
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(
            'group relative flex h-10 w-10 items-center justify-center rounded-2xl border transition duration-200',
            isOpen
              ? 'border-primary-200 bg-primary-50 text-primary-700 shadow-sm'
              : 'border-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
          )}
        >
          <Bell
            size={19}
            strokeWidth={2}
            className={cn(
              'transition-transform duration-200',
              isOpen
                ? 'scale-105'
                : 'group-hover:-rotate-6 group-hover:scale-105'
            )}
          />

          {displayCount > 0 && (
            <>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />

              <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-primary-600 px-1 text-[9px] font-black leading-none text-white shadow-sm">
                {displayCount > 99 ? '99+' : displayCount}
              </span>
            </>
          )}
        </button>
      </div>

      {/* ================================================================
          NOTIFICATION CENTER
      ================================================================ */}

      {isOpen &&
        createPortal(
          <>
            {/* MOBILE BACKDROP */}
            <div
              className="fixed inset-0 z-[9997] bg-ink-950/35 backdrop-blur-[3px] sm:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* PANEL */}
            <div
              ref={dropdownRef}
              role="dialog"
              aria-label="Notification center"
              className="fixed z-[9999] flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-lg"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `min(${DROPDOWN_WIDTH}px, calc(100vw - ${
                  VIEWPORT_PADDING * 2
                }px))`,
                maxHeight: 'min(650px, calc(100dvh - 90px))',
              }}
            >
              {/* ======================================================
                  HEADER
              ====================================================== */}

              <div className="relative shrink-0 border-b border-ink-100 bg-white px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                      <Bell size={20} />

                      {displayCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-success-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black tracking-tight text-ink-950 sm:text-lg">
                          Notifications
                        </h2>

                        {displayCount > 0 && (
                          <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[10px] font-black text-primary-700">
                            {displayCount} new
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] font-medium text-ink-400">
                        {displayCount > 0
                          ? "Here's what needs your attention"
                          : "You're up to date"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close notifications"
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-800 sm:hidden"
                    >
                      <X size={17} />
                    </button>

                    <ActionMenu
                      items={menuItems}
                      placement="bottom"
                      align="right"
                    />
                  </div>
                </div>

                {/* QUICK SUMMARY */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                      <Inbox size={14} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight text-ink-950">
                        {notifications.length}
                      </p>

                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-ink-400">
                        Total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-warning-500 shadow-sm">
                      <Clock3 size={14} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight text-ink-950">
                        {displayCount}
                      </p>

                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-ink-400">
                        Unread
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================
                  CONTENT
              ====================================================== */}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink-50/30 px-2 py-3 sm:px-3">
                {/* DISABLED */}
                {!areNotificationsEnabled ? (
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-ink-100 bg-white text-ink-400 shadow-sm">
                      <BellOff size={25} />
                    </div>

                    <h3 className="mt-5 text-sm font-black text-ink-950">
                      Notifications are turned off
                    </h3>

                    <p className="mt-2 max-w-[250px] text-xs leading-relaxed text-ink-400">
                      Enable in-app notifications to stay updated on
                      applications, messages, and activity.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/settings#inAppNoti');
                      }}
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-xs font-extrabold text-white transition hover:bg-primary-700 active:scale-[0.98]"
                    >
                      Notification settings
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  /* EMPTY */
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-success-100 bg-white text-success-500 shadow-sm">
                      <CheckCircle2 size={27} />

                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-xl bg-success-500 text-white shadow-sm">
                        <Check size={13} />
                      </span>
                    </div>

                    <h3 className="mt-5 text-sm font-black text-ink-950">
                      You're all caught up
                    </h3>

                    <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-ink-400">
                      No notifications yet. We'll let you know when something
                      important happens.
                    </p>
                  </div>
                ) : visibleNotifications.length === 0 ? (
                  /* ALL READ */
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-success-100 bg-white text-success-500 shadow-sm">
                      <CheckCheck size={27} />
                    </div>

                    <h3 className="mt-5 text-sm font-black text-ink-950">
                      Inbox cleared
                    </h3>

                    <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-ink-400">
                      You've read everything. There are no unread notifications
                      to display.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(notificationsPath);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-primary-600 transition hover:bg-primary-50"
                    >
                      Browse notification history
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  /* UNREAD LIST */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 pb-1 pt-1">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-500">
                        Recent activity
                      </h3>

                      <span className="text-[10px] font-bold text-ink-400">
                        {visibleNotifications.length} shown
                      </span>
                    </div>

                    {visibleNotifications.map((notification) => {
                      const meta = getNotificationMetaSafe(notification.type);

                      const category = getNotificationCategory(
                        notification.type
                      );

                      const isUnread = !notification.is_read;

                      return (
                        <article
                          key={notification.id}
                          className={cn(
                            'group relative overflow-hidden rounded-2xl border transition duration-200',
                            isUnread
                              ? 'border-primary-100 bg-white shadow-sm hover:border-primary-200 hover:shadow-md'
                              : 'border-ink-100 bg-white hover:border-ink-200'
                          )}
                        >
                          {/* UNREAD ACCENT */}
                          {isUnread && (
                            <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-primary-500" />
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            className="flex w-full items-start gap-3 px-3 py-3.5 text-left sm:px-3.5"
                          >
                            <NotificationTypeIcon
                              type={notification.type}
                              isUnread={isUnread}
                            />

                            <div className="min-w-0 flex-1">
                              {/* TITLE + TIME */}
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={cn(
                                    'line-clamp-2 break-words text-[12px] leading-[1.55] sm:text-[13px]',
                                    isUnread
                                      ? 'font-black text-ink-950'
                                      : 'font-bold text-ink-700'
                                  )}
                                >
                                  {notification.title || 'Notification'}
                                </p>

                                <span className="shrink-0 pt-0.5 text-[9px] font-bold text-ink-400">
                                  {formatTime(notification.created_at)}
                                </span>
                              </div>

                              {/* MESSAGE */}
                              <p className="mt-1 line-clamp-2 break-words text-[11px] font-medium leading-[1.7] text-ink-500 sm:text-xs">
                                {notification.message ||
                                  'No additional details.'}
                              </p>

                              {/* CATEGORY + STATUS */}
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-extrabold',
                                    isUnread
                                      ? 'border-primary-100 bg-primary-50 text-primary-700'
                                      : 'border-ink-100 bg-ink-50 text-ink-500'
                                  )}
                                >
                                  {category}
                                </span>

                                {isUnread && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-primary-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                    Unread
                                  </span>
                                )}

                                {(notification.type === 'chat' ||
                                  notification.type ===
                                    'message_received') && (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary-100 bg-primary-50 px-2 py-1 text-[9px] font-extrabold text-primary-700">
                                    <MessageCircle size={10} />
                                    Open chat
                                  </span>
                                )}

                                {notification.type === 'reinterest' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary-100 bg-primary-50 px-2 py-1 text-[9px] font-extrabold text-primary-700">
                                    <Sparkles size={10} />
                                    Review activity
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* DISMISS */}
                          <button
                            type="button"
                            onClick={(event) =>
                              handleDismissNotification(event, notification)
                            }
                            aria-label={`Dismiss ${
                              notification.title || 'notification'
                            }`}
                            title="Dismiss notification"
                            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-transparent bg-white/95 text-ink-300 opacity-100 shadow-sm transition hover:border-danger-100 hover:bg-danger-50 hover:text-danger-500 sm:bottom-auto sm:right-2 sm:top-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          >
                            <X size={13} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ======================================================
                  FOOTER
              ====================================================== */}

              <div className="shrink-0 border-t border-ink-100 bg-white p-3 sm:px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
                      <ShieldCheck size={14} />
                    </span>

                    <p className="truncate text-[10px] font-bold text-ink-400">
                      Your activity, all in one place
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(notificationsPath);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-[10px] font-black text-primary-700 transition hover:bg-primary-100"
                  >
                    View all
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* ================================================================
          CHAT MODAL
      ================================================================ */}

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        conversationId={
          chatConversation?.id ||
          chatConversation?.conversation_id ||
          chatConversation?.conversationId ||
          null
        }
        currentUserId={user?.id}
        currentUserName={user?.full_name || user?.fullName}
        otherParticipant={
          chatConversation?.otherParticipant ||
          chatConversation?.other_participant ||
          chatConversation?.other_user ||
          chatConversation?.otherUser ||
          null
        }
        showDtiOptions={true}
      />

      {/* ================================================================
          OPENING CHAT INDICATOR
      ================================================================ */}

      {chatLoading && !isChatOpen && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[10000]">
          <div className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Loader2 size={16} className="animate-spin" />
            </span>

            <div>
              <p className="text-xs font-black text-ink-950">
                Opening conversation
              </p>

              <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                Please wait a moment...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;