import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  MessageCircle,
  ArrowUpRight,
  AlertTriangle,
  Trash2,
  Loader2,
  FileText,
  Repeat,
  MessageSquare,
  Inbox,
  Settings as SettingsIcon,
  Search,
  X,
  ChevronRight,
  Clock3,
  Sparkles,
  ShieldCheck,
  CircleCheck,
  Circle,
  RefreshCw,
  PackageCheck,
  Trophy,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';



import { itemsAPI } from '@/services/api/dtiApi';
import { chatAPI } from '@/services/api/sharedApi';

import { getNotificationMeta } from '@/utils/constants';

import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import ChatModal from '@/pages/chat/ChatModal';

/* ==========================================================================
   CONSTANTS
========================================================================== */

const FILTERS = [
  { key: 'all', label: 'All activity' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const APPLICATION_TYPES = [
  'application_submitted',
  'application_received',
  'application_accepted',
  'application_rejected',
];

const CHAT_TYPES = ['chat', 'message_received'];

const DISCUSSION_TYPES = ['mention', 'discussion_reply'];

const SUPPORT_TYPES = [
  'new_support_ticket',
  'support_ticket_created',
  'support_reply',
  'support_user_reply',
  'support_status_update',
  'support_ticket_deleted',
];

const ITEM_UPDATE_TYPES = [
  'winner_announced',
  'item_completed',
  'item_shipped',
];

const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ==========================================================================
   NOTIFICATION HELPERS
========================================================================== */

const getNotificationMetaSafe = (type) => {
  try {
    return getNotificationMeta(type) || {};
  } catch {
    return {};
  }
};

const getNotificationCategory = (type) => {
  if (CHAT_TYPES.includes(type)) return 'Messages';
  if (type === 'reinterest') return 'Re-interest';
  if (type === 'mention') return 'Mention';
  if (type === 'discussion_reply') return 'Discussion';
  if (APPLICATION_TYPES.includes(type)) return 'Applications';
  if (SUPPORT_TYPES.includes(type)) return 'Support';
  if (ITEM_UPDATE_TYPES.includes(type)) return 'Item updates';

  return 'General';
};

const getNotificationIcon = (type) => {
  if (CHAT_TYPES.includes(type)) return MessageCircle;
  if (type === 'mention') return MessageSquare;
  if (type === 'discussion_reply') return MessageSquare;
  if (type === 'reinterest') return Repeat;
  if (type === 'application_submitted') return Send;
  if (type === 'application_received') return FileText;
  if (type === 'application_accepted') return CircleCheck;
  if (type === 'application_rejected') return X;
  if (type === 'winner_announced') return Trophy;
  if (type === 'item_completed') return PackageCheck;
  if (type === 'item_shipped') return ArrowUpRight;
  if (SUPPORT_TYPES.includes(type)) return ShieldCheck;

  return Bell;
};

/* Tones mapped to semantic tokens only */
const getNotificationTone = (type) => {
  if (CHAT_TYPES.includes(type)) {
    return {
      icon: 'bg-primary-50 text-primary-600 ring-primary-100',
      badge: 'bg-primary-50 text-primary-700 ring-primary-100',
    };
  }

  if (type === 'reinterest') {
    return {
      icon: 'bg-primary-50 text-primary-600 ring-primary-100',
      badge: 'bg-primary-50 text-primary-700 ring-primary-100',
    };
  }

  if (DISCUSSION_TYPES.includes(type)) {
    return {
      icon: 'bg-warning-50 text-warning-600 ring-warning-100',
      badge: 'bg-warning-50 text-warning-700 ring-warning-100',
    };
  }

  if (type === 'application_rejected') {
    return {
      icon: 'bg-danger-50 text-danger-600 ring-danger-100',
      badge: 'bg-danger-50 text-danger-700 ring-danger-100',
    };
  }

  if (APPLICATION_TYPES.includes(type)) {
    return {
      icon: 'bg-success-50 text-success-600 ring-success-100',
      badge: 'bg-success-50 text-success-700 ring-success-100',
    };
  }

  if (SUPPORT_TYPES.includes(type)) {
    return {
      icon: 'bg-warning-50 text-warning-600 ring-warning-100',
      badge: 'bg-warning-50 text-warning-700 ring-warning-100',
    };
  }

  if (ITEM_UPDATE_TYPES.includes(type)) {
    return {
      icon: 'bg-primary-50 text-primary-600 ring-primary-100',
      badge: 'bg-primary-50 text-primary-700 ring-primary-100',
    };
  }

  return {
    icon: 'bg-primary-50 text-primary-600 ring-primary-100',
    badge: 'bg-ink-50 text-ink-600 ring-ink-100',
  };
};

const formatTime = (date) => {
  if (!date) return 'Recently';

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return 'Recently';

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
    year:
      new Date(timestamp).getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  });
};

const formatFullDate = (date) => {
  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/* ==========================================================================
   SKELETON
========================================================================== */

const NotificationSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

      <div className="space-y-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="h-3 w-36 animate-pulse rounded bg-ink-200" />
            <div className="h-8 w-64 max-w-full animate-pulse rounded bg-ink-200" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-ink-100" />
          </div>

          <div className="flex gap-2">
            <div className="h-11 w-36 animate-pulse rounded-xl bg-ink-100" />
            <div className="h-11 w-32 animate-pulse rounded-xl bg-ink-100" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-ink-100 bg-white"
            />
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />

                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-ink-200" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ==========================================================================
   STAT CARD
========================================================================== */

const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  iconClass,
  onClick,
  active = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 sm:p-5',
      active
        ? 'border-primary-200 bg-primary-50/60 shadow-sm'
        : 'border-ink-100 hover:border-ink-200 hover:shadow-md'
    )}
  >
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105',
        iconClass
      )}
    >
      <Icon size={19} />
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
        {label}
      </span>

      <span className="mt-1 block text-2xl font-black leading-none tracking-tight text-ink-950">
        {value}
      </span>

      {description && (
        <span className="mt-1.5 block truncate text-[11px] font-medium text-ink-400">
          {description}
        </span>
      )}
    </span>

    <ChevronRight
      size={16}
      className={cn(
        'hidden shrink-0 transition sm:block',
        active
          ? 'text-primary-500'
          : 'text-ink-300 group-hover:translate-x-0.5 group-hover:text-ink-500'
      )}
    />
  </button>
);

/* ==========================================================================
   EMPTY STATE
========================================================================== */

const EmptyState = ({ filter, search, onReset }) => {
  const hasFilters = filter !== 'all' || Boolean(search.trim());

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-3xl border border-ink-100 bg-ink-50 text-ink-400">
        {hasFilters ? <Search size={29} /> : <Inbox size={29} />}

        {!hasFilters && (
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-xl border-2 border-white bg-success-500 text-white">
            <Check size={14} />
          </span>
        )}
      </div>

      <h2 className="mt-5 text-lg font-black tracking-tight text-ink-950">
        {search
          ? 'No matching notifications'
          : filter !== 'all'
            ? `No ${filter} notifications`
            : 'Your inbox is quiet'}
      </h2>

      <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-ink-500">
        {search
          ? 'Try another search term or clear your search to see more activity.'
          : filter !== 'all'
            ? 'There are no notifications in this category right now.'
            : 'When something important happens, you’ll find it here.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-4 text-xs font-extrabold text-white transition hover:bg-primary-700"
        >
          <RefreshCw size={13} />
          Clear filters
        </button>
      )}
    </div>
  );
};

/* ==========================================================================
   MAIN COMPONENT
========================================================================== */

const NotificationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDeleteNotifications,
    bulkMarkAsRead,
    loading: contextLoading,
    areNotificationsEnabled,
  } = useNotifications();

  const [localLoading, setLocalLoading] = useState(true);

  const [filter, setFilter] = useState(() => {
    const initial = searchParams.get('filter');

    return FILTERS.some((item) => item.key === initial) ? initial : 'all';
  });

  const [search, setSearch] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [markingAll, setMarkingAll] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMarking, setBulkMarking] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [openingChatFor, setOpeningChatFor] = useState(null);

  const searchRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  useEffect(() => {
    if (!contextLoading) {
      setLocalLoading(false);
    }
  }, [contextLoading]);

  /* --------------------------------------------------------
     URL FILTER SYNC
  -------------------------------------------------------- */

  useEffect(() => {
    const current = searchParams.get('filter') || 'all';

    if (current === filter) return;

    const next = new URLSearchParams(searchParams);

    if (filter === 'all') {
      next.delete('filter');
    } else {
      next.set('filter', filter);
    }

    setSearchParams(next, { replace: true });
  }, [filter, searchParams, setSearchParams]);

  useEffect(() => {
    const urlFilter = searchParams.get('filter') || 'all';

    if (
      FILTERS.some((item) => item.key === urlFilter) &&
      urlFilter !== filter
    ) {
      setFilter(urlFilter);
    }
  }, [searchParams, filter]);

  /* --------------------------------------------------------
     FILTER COUNTS
  -------------------------------------------------------- */

  const filterCounts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((item) => !item.is_read).length,
      read: notifications.filter((item) => item.is_read).length,
    }),
    [notifications]
  );

  /* --------------------------------------------------------
     SEARCH + FILTER
  -------------------------------------------------------- */

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...notifications]
      .filter((notification) => {
        if (filter === 'unread' && notification.is_read) return false;
        if (filter === 'read' && !notification.is_read) return false;

        if (!query) return true;

        const searchable = [
          notification.title,
          notification.message,
          notification.type,
          getNotificationCategory(notification.type),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime() || 0;
        const dateB = new Date(b.created_at).getTime() || 0;

        return dateB - dateA;
      });
  }, [notifications, filter, search]);

  /* --------------------------------------------------------
     SELECTION SYNC
  -------------------------------------------------------- */

  useEffect(() => {
    const availableIds = new Set(
      filteredNotifications.map((notification) => notification.id)
    );

    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [filteredNotifications]);

  const allVisibleSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((notification) =>
      selectedIds.includes(notification.id)
    );

  /* --------------------------------------------------------
     TIME FORMATTER
  -------------------------------------------------------- */

  const formatTimeAgo = useCallback((date) => formatTime(date), []);

  /* --------------------------------------------------------
     NOTIFICATION ROUTING
  -------------------------------------------------------- */

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

          return `${basePath}?${params.toString()}`;
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

  /* --------------------------------------------------------
     MARK AS READ
  -------------------------------------------------------- */

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

  /* --------------------------------------------------------
     CHAT
  -------------------------------------------------------- */

  const handleChatNotificationClick = useCallback(
    async (notification) => {
      const data = notification.data || {};

      const chatId = data.chat_id;
      const itemId = data.item_id;

      if (!chatId && !itemId) {
        toast.error(
          'Unable to open chat because conversation details are missing.'
        );
        return;
      }

      if (openingChatFor) return;

      setOpeningChatFor(notification.id);

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
            console.warn('Unable to load existing chat:', error);
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
              isDonor = Boolean(conversation.is_donor);

              if (conversation.item) {
                itemData = conversation.item;
              }
            }
          } catch (error) {
            console.warn('Unable to create/open conversation:', error);
          }
        }

        if (!conversationData) {
          if (!chatId && !itemId) {
            toast.error('Unable to find this conversation');
            return;
          }

          conversationData = {
            id: chatId || 'temp',
            other_user: data.sender || {
              id: data.sender_id,
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

        const conversationId = conversationData.id || chatId || null;

        if (!conversationId) {
          toast.error('Could not resolve the conversation');
          return;
        }

        setChatConversation({
          id: conversationId,
          conversationId,
          otherUser:
            otherUser ||
            conversationData.other_user || {
              full_name: data.sender_name || 'User',
              avatar_url: data.sender_avatar || null,
            },
          otherParticipant: otherUser || conversationData.other_user || null,
          item:
            itemData ||
            conversationData.item || {
              id: itemId,
              title: data.item_title || 'Item',
            },
          isDonor: Boolean(isDonor || conversationData.is_donor || false),
        });

        setIsChatOpen(true);
      } catch (error) {
        console.error('Error opening chat:', error);
        toast.error('Failed to open chat');
      } finally {
        setOpeningChatFor(null);
      }
    },
    [openingChatFor, user?.id]
  );

  /* --------------------------------------------------------
     RE-INTEREST
  -------------------------------------------------------- */

  const handleReinterestNotificationClick = useCallback(
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
    },
    [navigate]
  );

  /* --------------------------------------------------------
     NOTIFICATION CLICK
  -------------------------------------------------------- */

  const handleNotificationClick = useCallback(
    async (notification) => {
      const isChat = CHAT_TYPES.includes(notification.type);

      const marked = await safelyMarkAsRead(notification);

      if (!marked) return;

      if (isChat) {
        await handleChatNotificationClick(notification);
        return;
      }

      if (notification.type === 'reinterest') {
        handleReinterestNotificationClick(notification);
        return;
      }

      const link = getNotificationLink(notification);

      if (link && link !== '#') {
        navigate(link);
      } else {
        toast.info('There is no destination available for this notification');
      }
    },
    [
      safelyMarkAsRead,
      handleChatNotificationClick,
      handleReinterestNotificationClick,
      getNotificationLink,
      navigate,
    ]
  );

  /* --------------------------------------------------------
     MARK ALL AS READ
  -------------------------------------------------------- */

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll || unreadCount <= 0) return;

    setMarkingAll(true);

    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Mark all read error:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount, markAllAsRead]);

  /* --------------------------------------------------------
     DELETE SINGLE
  -------------------------------------------------------- */

  const handleDelete = useCallback(async () => {
    if (!selectedNotification || deleting) return;

    setDeleting(true);

    try {
      await deleteNotification(selectedNotification.id);

      setShowDeleteModal(false);
      setSelectedNotification(null);

      setSelectedIds((current) =>
        current.filter((id) => id !== selectedNotification.id)
      );

      toast.success('Notification deleted');
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  }, [selectedNotification, deleting, deleteNotification]);

  /* --------------------------------------------------------
     SELECTION
  -------------------------------------------------------- */

  const toggleSelect = useCallback((id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((current) => {
      const allIds = filteredNotifications.map((item) => item.id);
      return Array.from(new Set([...current, ...allIds]));
    });
  }, [filteredNotifications]);

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      const visibleIds = new Set(
        filteredNotifications.map((item) => item.id)
      );

      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
    } else {
      selectAll();
    }
  }, [allVisibleSelected, filteredNotifications, selectAll]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  /* --------------------------------------------------------
     BULK DELETE
  -------------------------------------------------------- */

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkDeleting) return;

    if (typeof bulkDeleteNotifications !== 'function') {
      toast.error('Bulk deletion is not available');
      return;
    }

    setBulkDeleting(true);

    try {
      const result = await bulkDeleteNotifications(selectedIds);

      toast.success(
        result?.message ||
          `Deleted ${selectedIds.length} notification${
            selectedIds.length === 1 ? '' : 's'
          }`
      );

      setSelectedIds([]);
      setSelectMode(false);
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete notifications');
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds, bulkDeleting, bulkDeleteNotifications]);

  /* --------------------------------------------------------
     BULK MARK AS READ
  -------------------------------------------------------- */

  const handleBulkMarkAsRead = useCallback(async () => {
    if (!selectedIds.length || bulkMarking) return;

    if (typeof bulkMarkAsRead !== 'function') {
      toast.error('Bulk marking as read is not available');
      return;
    }

    setBulkMarking(true);

    try {
      const result = await bulkMarkAsRead(selectedIds);

      toast.success(result?.message || `Marked ${selectedIds.length} as read`);

      setSelectedIds([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Bulk mark as read error:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setBulkMarking(false);
    }
  }, [selectedIds, bulkMarking, bulkMarkAsRead]);

  /* --------------------------------------------------------
     RESET FILTERS
  -------------------------------------------------------- */

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilter('all');
    setSelectedIds([]);
    searchRef.current?.focus();
  }, []);

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  if (localLoading) {
    return <NotificationSkeleton />;
  }

  /* --------------------------------------------------------
     NOTIFICATIONS DISABLED
  -------------------------------------------------------- */

  if (!areNotificationsEnabled) {
    return (
      <div className="min-h-full bg-transparent">
        
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mb-7">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              <Bell size={14} />
              <span>Notification center</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              Notifications
            </h1>

            <p className="mt-2 text-sm font-medium text-ink-500">
              Manage your activity and stay up to date.
            </p>
          </div>

          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <BellOff size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black tracking-tight text-ink-950">
                Notifications are turned off
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Enable in-app notifications in your profile settings to stay
                informed about applications, conversations, and updates.
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/settings#inAppNoti')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 active:scale-[0.98]"
                >
                  <SettingsIcon size={16} />
                  Notification settings
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <>
      <div className="min-h-full bg-transparent">

        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* HEADER */}
          <section className="mb-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  <Sparkles size={14} />
                  <span>Your activity</span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  Notification center
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                  Everything happening around your applications, conversations,
                  and items — organized in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {unreadCount > 0 && !selectMode && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingAll ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCheck size={15} />
                    )}

                    {markingAll ? 'Updating...' : 'Mark all as read'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectMode((current) => !current);
                    setSelectedIds([]);
                  }}
                  className={cn(
                    'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold transition',
                    selectMode
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                  )}
                >
                  {selectMode ? <X size={15} /> : <CheckSquare size={15} />}
                  {selectMode ? 'Cancel selection' : 'Select notifications'}
                </button>
              </div>
            </div>
          </section>

          {/* OVERVIEW CARDS */}
          <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Inbox}
              label="Total activity"
              value={notifications.length}
              description="All your notifications"
              iconClass="bg-ink-50 text-ink-600"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />

            <StatCard
              icon={Bell}
              label="Unread"
              value={filterCounts.unread}
              description="Waiting for your attention"
              iconClass="bg-primary-50 text-primary-600"
              active={filter === 'unread'}
              onClick={() => setFilter('unread')}
            />

            <StatCard
              icon={CheckCircle2}
              label="Read"
              value={filterCounts.read}
              description="Notifications you've reviewed"
              iconClass="bg-success-50 text-success-600"
              active={filter === 'read'}
              onClick={() => setFilter('read')}
            />
          </section>

          {/* SEARCH + FILTER */}
          <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                />

                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notifications..."
                  aria-label="Search notifications"
                  className="input-field h-11 pl-10 pr-10 text-sm font-medium"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
                  <SlidersHorizontal size={13} />
                  Filter
                </span>

                <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
                  {FILTERS.map((item) => {
                    const active = filter === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key)}
                        className={cn(
                          'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-extrabold transition',
                          active
                            ? 'bg-white text-primary-700 shadow-sm'
                            : 'text-ink-500 hover:text-ink-900'
                        )}
                      >
                        {item.label}

                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[9px] font-black',
                            active
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-ink-200 text-ink-600'
                          )}
                        >
                          {filterCounts[item.key]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
              <p className="text-[11px] font-medium text-ink-400">
                Showing{' '}
                <span className="font-extrabold text-ink-700">
                  {filteredNotifications.length}
                </span>{' '}
                of{' '}
                <span className="font-extrabold text-ink-700">
                  {notifications.length}
                </span>{' '}
                notifications
              </p>

              {(search || filter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  <RefreshCw size={12} />
                  Reset filters
                </button>
              )}
            </div>
          </section>

          {/* BULK ACTIONS */}
          {selectMode && (
            <section className="mb-5 overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/60 shadow-sm">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100">
                    <CheckSquare size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-ink-950">
                      {selectedIds.length} selected
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium text-ink-500">
                      Select notifications to perform bulk actions.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={filteredNotifications.length === 0}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-[11px] font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {allVisibleSelected ? (
                      <Check size={13} />
                    ) : (
                      <Circle size={13} />
                    )}

                    {allVisibleSelected ? 'Deselect visible' : 'Select visible'}
                  </button>

                  <button
                    type="button"
                    onClick={deselectAll}
                    disabled={selectedIds.length === 0}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-[11px] font-extrabold text-ink-500 transition hover:bg-white hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>

                  {selectedIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleBulkMarkAsRead}
                        disabled={bulkMarking}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 text-[11px] font-extrabold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {bulkMarking ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCheck size={13} />
                        )}

                        Mark read
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-danger-600 px-3 text-[11px] font-extrabold text-white transition hover:bg-danger-700"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* LIST */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-black text-ink-950">
                  Recent activity
                </h2>

                <p className="mt-1 text-[11px] font-medium text-ink-400">
                  Latest updates, messages, and important events.
                </p>
              </div>

              {filteredNotifications.length > 0 && (
                <span className="shrink-0 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10px] font-extrabold text-ink-600">
                  {filteredNotifications.length} results
                </span>
              )}
            </div>

            {filteredNotifications.length === 0 ? (
              <EmptyState
                filter={filter}
                search={search}
                onReset={resetFilters}
              />
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const isSelected = selectedIds.includes(notification.id);
                  const isUnread = !notification.is_read;

                  const isApplication = APPLICATION_TYPES.includes(
                    notification.type
                  );

                  const isReinterest = notification.type === 'reinterest';

                  const isChat = CHAT_TYPES.includes(notification.type);

                  const isDiscussion = DISCUSSION_TYPES.includes(
                    notification.type
                  );

                  const isThisOpening = openingChatFor === notification.id;

                  const meta = getNotificationMetaSafe(notification.type);

                  const Icon = getNotificationIcon(notification.type);
                  const tone = getNotificationTone(notification.type);

                  const category = getNotificationCategory(notification.type);

                  const menuItems = [
                    ...(!notification.is_read
                      ? [
                          {
                            key: 'mark-read',
                            icon: Check,
                            label: 'Mark as read',
                            onClick: async () => {
                              const marked = await safelyMarkAsRead(
                                notification
                              );

                              if (marked) {
                                toast.success(
                                  'Notification marked as read'
                                );
                              }
                            },
                          },
                        ]
                      : []),

                    {
                      key: 'open',
                      icon: isChat ? MessageCircle : ArrowUpRight,
                      label: isChat
                        ? isThisOpening
                          ? 'Opening...'
                          : 'Open chat'
                        : 'View details',
                      onClick: () => handleNotificationClick(notification),
                    },

                    { key: 'divider-delete', divider: true },

                    {
                      key: 'delete',
                      icon: Trash2,
                      label: 'Delete',
                      danger: true,
                      onClick: () => {
                        setSelectedNotification(notification);
                        setShowDeleteModal(true);
                      },
                    },
                  ];

                  return (
                    <article
                      key={notification.id}
                      onClick={() => {
                        if (selectMode) {
                          toggleSelect(notification.id);
                          return;
                        }

                        if (isThisOpening) return;

                        handleNotificationClick(notification);
                      }}
                      className={cn(
                        'group relative cursor-pointer overflow-hidden rounded-[26px] border bg-white transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md',
                        isUnread ? 'border-primary-200' : 'border-ink-100',
                        isSelected
                          ? 'border-primary-300 bg-primary-50/40 ring-2 ring-primary-500/15'
                          : '',
                        isThisOpening
                          ? 'border-primary-300 bg-primary-50/40'
                          : ''
                      )}
                    >
                      {isUnread && (
                        <span className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full bg-primary-500" />
                      )}

                      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(notification.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${
                              notification.title || 'notification'
                            }`}
                            className="mt-3 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-400 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-300"
                          />
                        )}

                        <div
                          className={cn(
                            'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-[1.03]',
                            tone.icon
                          )}
                        >
                          {isThisOpening ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Icon size={20} strokeWidth={1.9} />
                          )}

                          {isUnread && !isThisOpening && (
                            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={cn(
                                    'break-words text-sm leading-5',
                                    isUnread
                                      ? 'font-black text-ink-950'
                                      : 'font-bold text-ink-700'
                                  )}
                                >
                                  {notification.title || 'Notification'}
                                </h3>

                                {isUnread && (
                                  <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-700">
                                    New
                                  </span>
                                )}
                              </div>

                              <p className="mt-1.5 whitespace-pre-line break-words text-xs font-medium leading-6 text-ink-500 sm:text-[13px]">
                                {notification.message ||
                                  'No additional details.'}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                              <span
                                title={formatFullDate(notification.created_at)}
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-ink-400"
                              >
                                <Clock3 size={12} />
                                {formatTimeAgo(notification.created_at)}
                              </span>

                              {!selectMode && (
                                <div
                                  className="relative z-10"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <ActionMenu
                                    items={menuItems}
                                    placement="left"
                                    align="bottom"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-lg px-2 py-1 text-[9px] font-extrabold ring-1 ring-inset',
                                tone.badge
                              )}
                            >
                              {meta.label || category}
                            </span>

                            {isApplication && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-success-200 bg-success-50 px-2 py-1 text-[9px] font-extrabold text-success-700">
                                <FileText size={10} />
                                Application
                              </span>
                            )}

                            {isReinterest && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-[9px] font-extrabold text-primary-700">
                                <Repeat size={10} />
                                Re-interest
                              </span>
                            )}

                            {isChat && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-[9px] font-extrabold text-primary-700">
                                <MessageCircle size={10} />
                                Chat
                              </span>
                            )}

                            {isDiscussion && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-warning-200 bg-warning-50 px-2 py-1 text-[9px] font-extrabold text-warning-700">
                                <MessageSquare size={10} />
                                {notification.type === 'mention'
                                  ? 'Mention'
                                  : 'Reply'}
                              </span>
                            )}

                            {isUnread && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-primary-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                Unread
                              </span>
                            )}
                          </div>

                          {isThisOpening && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-[10px] font-extrabold text-primary-700">
                              <Loader2 size={12} className="animate-spin" />
                              Preparing your conversation...
                            </div>
                          )}
                        </div>
                      </div>

                      {!selectMode && (
                        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/40 px-4 py-2.5 sm:px-5">
                          <span className="text-[10px] font-medium text-ink-400">
                            {isUnread
                              ? 'Tap to review this notification'
                              : 'Notification details'}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-primary-600 transition group-hover:translate-x-0.5">
                            {isChat ? 'Open conversation' : 'View details'}
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* BOTTOM NOTE */}
          {notifications.length > 0 && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-ink-100 bg-white/70 px-4 py-3">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-ink-400"
              />

              <p className="text-[10px] font-medium leading-5 text-ink-400">
                Your notifications help you keep track of activity across your
                account. You can mark them as read or delete them at any time.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* SINGLE DELETE MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (deleting) return;

          setShowDeleteModal(false);
          setSelectedNotification(null);
        }}
        title="Delete notification"
        size="sm"
      >
        {selectedNotification && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-danger-900">
                  Delete this notification?
                </h3>

                <p className="mt-1 break-words text-xs font-medium leading-5 text-danger-700">
                  "{selectedNotification.title || 'Notification'}" will be
                  permanently removed. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNotification(null);
                }}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-xs font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete notification
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* BULK DELETE MODAL */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => {
          if (bulkDeleting) return;
          setShowBulkDeleteModal(false);
        }}
        title="Delete selected notifications"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <Trash2 size={18} />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-danger-900">
                Delete {selectedIds.length} notification
                {selectedIds.length === 1 ? '' : 's'}?
              </h3>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                All selected notifications will be permanently removed. This
                action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={bulkDeleting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || selectedIds.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-xs font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  Delete {selectedIds.length}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* CHAT MODAL */}
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
    </>
  );
};

export default NotificationPage;