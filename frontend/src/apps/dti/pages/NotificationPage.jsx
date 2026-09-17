import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation'; // ✅ only what we need
import { itemsAPI, chatAPI } from '@/services/api/dtiApi';
import { getNotificationMeta } from '@/utils/constants';
import Modal from '@/reusables/Modal';
import ChatDrawer from '../components/chat/ChatDrawer';


// ============================================
// Skeleton
// ============================================
const NotificationSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-10">
      <PageNavigation />

      <div className="mt-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-ink-200 animate-pulse" />
          <div>
            <div className="h-7 w-48 bg-ink-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-ink-200 rounded mt-2 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-36 h-10 bg-ink-200 rounded-xl animate-pulse" />
          <div className="w-36 h-10 bg-ink-200 rounded-xl animate-pulse" />
        </div>

        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-1.5 mb-8 inline-flex">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-24 h-10 bg-ink-200 rounded-lg mx-1 animate-pulse"
            />
          ))}
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6"
            >
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-ink-200 animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-5 w-48 bg-ink-200 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-ink-200 rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-3/4 bg-ink-200 rounded mt-2 animate-pulse" />
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-3 w-20 bg-ink-200 rounded animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-ink-200 animate-pulse" />
                  </div>
                </div>
                <div className="w-10 h-10 bg-ink-200 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Main Component
// ============================================
const NotificationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================
  // Context
  // ============================================
  const {
    notifications = [],
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDeleteNotifications,
    bulkMarkAsRead,
    loading: contextLoading,
    areNotificationsEnabled,
  } = useNotifications();

  // ============================================
  // State
  // ============================================
  const [localLoading, setLocalLoading] = useState(true);
  const initialFilter = searchParams.get('filter');
  const [filter, setFilter] = useState(
    initialFilter === 'unread' || initialFilter === 'read'
      ? initialFilter
      : 'all'
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRefs = useRef({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // ============================================
  // Loading
  // ============================================
  useEffect(() => {
    let timeoutId;
    if (!contextLoading && notifications !== undefined) {
      setLocalLoading(false);
    } else {
      timeoutId = setTimeout(() => {
        setLocalLoading(false);
      }, 3000);
    }
    return () => clearTimeout(timeoutId);
  }, [contextLoading, notifications]);

  // ============================================
  // URL sync
  // ============================================
  useEffect(() => {
    const currentUrlFilter = searchParams.get('filter') || 'all';
    if (currentUrlFilter !== filter) {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      setSearchParams(params, { replace: true });
    }
  }, [filter, searchParams, setSearchParams]);

  // ============================================
  // Click outside dropdown
  // ============================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!openDropdownId) return;
      const currentRef = dropdownRefs.current[openDropdownId];
      if (currentRef && !currentRef.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // ============================================
  // ESC closes dropdown
  // ============================================
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenDropdownId(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================
  // Filtered notifications
  // ============================================
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    if (filter === 'read') return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, filter]);

  const filterTabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: notifications.length },
      { key: 'unread', label: 'Unread', count: notifications.filter((n) => !n.is_read).length },
      { key: 'read', label: 'Read', count: notifications.filter((n) => n.is_read).length },
    ],
    [notifications]
  );

  // ============================================
  // Helpers – using constants
  // ============================================
  const getNotificationIcon = useCallback((type) => getNotificationMeta(type).icon, []);
  const getNotificationColor = useCallback((type) => getNotificationMeta(type).color, []);
  const getNotificationTypeLabel = useCallback((type) => getNotificationMeta(type).label, []);

  const formatTime = useCallback((date) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.max(0, now - created);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // ============================================
  // Navigation – admin‑aware + all types
  // ============================================
  const getNotificationLink = useCallback(
    (notification) => {
      const data = notification.data || {};
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

      switch (notification.type) {
        case 'application_submitted':
        case 'application_received': {
          if (!data.item_id) return '#';
          const params = new URLSearchParams();
          params.set('itemId', data.item_id);
          params.set('status', 'pending');
          if (data.applicant_name) params.set('search', data.applicant_name);
          return `/applications-to-my-item?${params.toString()}`;
        }
        case 'application_accepted': {
          if (!data.item_id) return '#';
          const params = new URLSearchParams();
          params.set('itemId', data.item_id);
          params.set('status', 'accepted');
          if (data.applicant_name) params.set('search', data.applicant_name);
          return `/applications-to-my-item?${params.toString()}`;
        }
        case 'application_rejected': {
          if (!data.item_id) return '#';
          const params = new URLSearchParams();
          params.set('itemId', data.item_id);
          params.set('status', 'rejected');
          if (data.applicant_name) params.set('search', data.applicant_name);
          return `/applications-to-my-item?${params.toString()}`;
        }
        case 'winner_announced':
        case 'item_completed':
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
									
											// Build query params
											const params = new URLSearchParams();
											
											// Add message highlight if present
											if (data.message_id) {
													params.set('message', data.message_id);
											}
											
											// Add case param based on notification type
											if (notification.type === 'mention') {
													params.set('case', 'mention');
											} else if (notification.type === 'discussion_reply') {
													params.set('case', 'reply');
											}
											
											const queryString = params.toString();
											return queryString ? `${basePath}?${queryString}` : basePath;
									}
        case 'item_shipped':
          return data.item_id ? `/item/${data.item_id}` : '#';
        // Support tickets – admin only
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
    [user?.role]
  );

  // ============================================
  // Chat
  // ============================================
  const handleChatNotificationClick = async (notification) => {
    const data = notification.data || {};
    const chatId = data.chat_id;
    const itemId = data.item_id;

    if (!chatId && !itemId) {
      toast.error('Unable to open chat - missing conversation info');
      return;
    }

    if (!notification.is_read) await markAsRead(notification.id);

    setChatLoading(true);
    try {
      let conversationData = null;
      let itemData = null;
      let otherUser = null;
      let isDonor = false;

      // existing chat
      if (chatId) {
        try {
          await chatAPI.getMessages(chatId);
          conversationData = { id: chatId, other_user: data.sender || null, item: itemId ? { id: itemId } : null };
          if (itemId) {
            const itemRes = await itemsAPI.getById(itemId);
            itemData = itemRes.data?.item;
          }
          otherUser = data.sender || { id: data.sender_id, full_name: data.sender_name || 'User', avatar_url: data.sender_avatar || null };
          if (itemData) isDonor = itemData.donor_id === user?.id;
        } catch (error) {
          console.warn('Unable to load existing chat:', error);
        }
      }

      // create/find from item
      if (itemId && !chatId) {
        try {
          const convRes = await chatAPI.getOrCreateConversation(itemId);
          const conv = convRes.data;
          if (conv?.conversation) {
            conversationData = {
              id: conv.conversation.id,
              other_user: conv.other_user || data.sender || null,
              item: conv.item || { id: itemId },
              is_donor: conv.is_donor || false,
            };
            otherUser = conv.other_user || data.sender || null;
            isDonor = conv.is_donor || false;
            if (conv.item) itemData = conv.item;
          }
        } catch (error) {
          console.warn('Unable to create/open conversation:', error);
        }
      }

      // fallback
      if (!conversationData) {
        conversationData = {
          id: chatId || 'temp',
          other_user: data.sender || { full_name: data.sender_name || 'User' },
          item: itemData || { id: itemId, title: data.item_title || 'Item' },
          is_donor: false,
        };
        otherUser = data.sender || conversationData.other_user;
      }

      setChatConversation({
        conversationId: conversationData.id || chatId,
        otherUser: otherUser || { full_name: data.sender_name || 'User', avatar_url: data.sender_avatar || null },
        item: itemData || conversationData.item || { id: itemId, title: data.item_title || 'Item' },
        isDonor: isDonor || conversationData.is_donor || false,
      });

      setIsChatOpen(true);
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Failed to open chat');
    } finally {
      setChatLoading(false);
    }
  };

  // ============================================
  // Re-interest
  // ============================================
  const handleReinterestNotificationClick = (notification) => {
    const data = notification.data || {};
    if (!data.item_id) return;
    const params = new URLSearchParams();
    params.set('itemId', data.item_id);
    params.set('hasReinterest', 'true');
    if (data.applicant_name) params.set('search', data.applicant_name);
    if (data.status) params.set('status', data.status);
    navigate(`/applications-to-my-item?${params.toString()}`);
    setOpenDropdownId(null);
  };

  // ============================================
  // Notification click
  // ============================================
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) await markAsRead(notification.id);

    const isChat = notification.type === 'chat' || notification.type === 'message_received';
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
      setOpenDropdownId(null);
    }
  };

  // ============================================
  // Mark all
  // ============================================
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount <= 0) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Mark all read error:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  // ============================================
  // Delete
  // ============================================
  const handleDelete = async () => {
    if (!selectedNotification || deleting) return;
    setDeleting(true);
    try {
      await deleteNotification(selectedNotification.id);
      setShowDeleteModal(false);
      setSelectedNotification(null);
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // Selection
  // ============================================
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const selectAll = () => setSelectedIds(filteredNotifications.map((n) => n.id));
  const deselectAll = () => setSelectedIds([]);

  // ============================================
  // Bulk delete
  // ============================================
  const handleBulkDelete = async () => {
    if (!selectedIds.length || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteNotifications(selectedIds);
      toast.success(
        result?.message || `Deleted ${selectedIds.length} notification${selectedIds.length > 1 ? 's' : ''}`
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
  };

  // ============================================
  // Bulk mark as read
  // ============================================
  const handleBulkMarkAsRead = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await bulkMarkAsRead(selectedIds);
      toast.success(result?.message || `Marked ${selectedIds.length} as read`);
      setSelectedIds([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Bulk mark as read error:', error);
      toast.error('Failed to mark as read');
    }
  };

  // ============================================
  // Dropdown toggle
  // ============================================
  const toggleDropdown = (id) => {
    setOpenDropdownId((current) => (current === id ? null : id));
  };

  // ============================================
  // Loading
  // ============================================
  if (localLoading) return <NotificationSkeleton />;

  // ============================================
  // Notifications Disabled
  // ============================================
  if (!areNotificationsEnabled) {
    return (
      <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PageNavigation />
          <div className="mt-10">
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-ink-50 flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-bell-slash text-3xl text-ink-400" />
              </div>
              <h2 className="text-xl font-black text-ink-900">Notifications are turned off</h2>
              <p className="mt-2 text-ink-500">You can enable them in your profile settings.</p>
              <button
                onClick={() => navigate('/settings#inAppNoti')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 text-white font-extrabold text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-arrow-right text-base" />
                Enable Notifications
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const notificationsPath = isAdmin ? '/admin/notifications' : '/notifications';

  return (
    <>
      <div className="px-4">
        <PageNavigation />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                Your notifications
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {unreadCount > 0 ? (
                <>
                  You have{' '}
                  <span className="font-extrabold text-ink-700">{unreadCount}</span> unread
                  notification{unreadCount > 1 ? 's' : ''}
                </>
              ) : (
                'All caught up!'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {notifications.length > 0 && unreadCount > 0 && !selectMode && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-2 rounded-xl border border-ink-100/80 bg-white px-3.5 py-2 text-sm font-bold text-ink-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 hover:shadow-md disabled:opacity-50"
              >
                {markingAll ? (
                  <span className="w-4 h-4 border-2 border-ink-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <i className="bi bi-check-all" />
                )}
                Mark all as read
              </button>
            )}

            <button
              onClick={() => {
                setSelectMode((current) => !current);
                setSelectedIds([]);
                setOpenDropdownId(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selectMode
                  ? 'border-primary-100 bg-gradient-to-r from-primary-500 to-brand-600 text-white'
                  : 'border-ink-100/80 bg-white text-ink-700 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700'
              }`}
            >
              <i className="bi bi-check-square" />
              {selectMode ? 'Cancel Selection' : 'Select Mode'}
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectMode && (
          <div className="mt-6 rounded-2xl border border-ink-100/80 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-extrabold text-ink-700">{selectedIds.length} selected</span>
              <button onClick={selectAll} className="text-primary-600 hover:text-primary-700 font-bold transition">
                Select All
              </button>
              <button onClick={deselectAll} className="text-ink-500 hover:text-ink-700 font-bold transition">
                Deselect All
              </button>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white text-sm font-extrabold transition"
                >
                  <i className="bi bi-check-lg mr-1" />
                  Mark as Read
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white text-sm font-extrabold transition"
                >
                  <i className="bi bi-trash mr-1" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="mt-6 inline-flex max-w-full overflow-x-auto bg-white rounded-2xl border border-ink-100/80 shadow-sm p-1.5">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (filter === tab.key) return;
                  setOpenDropdownId(null);
                  setSelectedIds([]);
                  setFilter(tab.key);
                }}
                className={`shrink-0 px-5 py-2 rounded-xl text-sm font-extrabold transition-colors duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white shadow-sm'
                    : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="mt-6 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                  <i className="bi bi-bell-slash text-2xl" />
                </div>
                <h3 className="text-lg font-extrabold text-ink-800">
                  {filter !== 'all' ? 'No notifications with this filter' : 'No notifications yet'}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                  {filter !== 'all'
                    ? 'Try changing the filter to see other notifications.'
                    : "You're all caught up! New notifications will appear here."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isSelected = selectedIds.includes(notification.id);
              const isOpen = openDropdownId === notification.id;
              const isApplication = [
                'application_submitted',
                'application_received',
                'application_accepted',
                'application_rejected',
              ].includes(notification.type);
              const isReinterest = notification.type === 'reinterest';
              const isChat = notification.type === 'chat' || notification.type === 'message_received';
              const isDiscussion = notification.type === 'mention' || notification.type === 'discussion_reply';

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-2xl border transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer ${
                    !notification.is_read ? 'border-primary-200 bg-primary-50/40' : 'border-ink-100/80 hover:border-ink-200'
                  } ${isSelected ? 'ring-2 ring-primary-500' : ''} shadow-sm hover:shadow-md`}
                  onClick={() => {
                    if (!selectMode) handleNotificationClick(notification);
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(notification.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-5 h-5 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                        />
                      )}

                      <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i
                          className={`bi ${getNotificationIcon(notification.type)} text-xl ${getNotificationColor(
                            notification.type
                          )}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-ink-900 text-sm">{notification.title}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 font-bold">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {isApplication && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-bold border border-primary-200">
                              Application
                            </span>
                          )}
                          {isReinterest && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              Re-Interest
                            </span>
                          )}
                          {isChat && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              Chat
                            </span>
                          )}
                          {isDiscussion && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-bold border border-primary-200">
                              {notification.type === 'mention' ? 'Mention' : 'Reply'}
                            </span>
                          )}
                        </div>

                        <p className="text-ink-600 mt-1 text-sm leading-relaxed">{notification.message}</p>

                        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-ink-400">
                          <span>{formatTime(notification.created_at)}</span>
                          {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                        </div>
                      </div>

                      {!selectMode && (
                        <div
                          className="relative ticket-dropdown shrink-0"
                          ref={(el) => (dropdownRefs.current[notification.id] = el)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => toggleDropdown(notification.id)}
                            className="p-2 hover:bg-ink-50 rounded-xl text-ink-400 hover:text-ink-600 transition"
                            aria-label="Notification options"
                            aria-expanded={isOpen}
                          >
                            <i className="bi bi-three-dots-vertical" />
                          </button>
                          {isOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-ink-100/80 shadow-lg py-1.5 z-30 overflow-hidden">
                              {!notification.is_read && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await markAsRead(notification.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2"
                                >
                                  <i className="bi bi-check-lg text-primary-500" />
                                  Mark as read
                                </button>
                              )}
                              {isChat ? (
                                <button
                                  type="button"
                                  disabled={chatLoading}
                                  onClick={async () => {
                                    setOpenDropdownId(null);
                                    await handleChatNotificationClick(notification);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                  <i className="bi bi-chat-dots text-primary-500" />
                                  {chatLoading ? 'Opening Chat...' : 'Open Chat'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenDropdownId(null);
                                    await handleNotificationClick(notification);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2"
                                >
                                  <i className="bi bi-box-arrow-up-right text-primary-500" />
                                  View details
                                </button>
                              )}
                              <div className="my-1 border-t border-ink-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNotification(notification);
                                  setShowDeleteModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2"
                              >
                                <i className="bi bi-trash text-rose-500" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Single delete modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedNotification(null);
        }}
        title="Delete Notification"
        size="sm"
      >
        {selectedNotification && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <i className="bi bi-exclamation-triangle text-rose-600 text-2xl" />
              </div>
              <div>
                <p className="text-sm text-ink-600">Delete this notification?</p>
                <p className="text-xs text-ink-400 mt-1 font-medium">"{selectedNotification.title}"</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNotification(null);
                }}
                className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Bulk delete modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Selected Notifications"
        size="sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <i className="bi bi-exclamation-triangle text-rose-600 text-2xl" />
          </div>
          <div>
            <p className="text-sm text-ink-600">
              Delete <span className="font-extrabold text-ink-900">{selectedIds.length}</span> notification
              {selectedIds.length > 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-ink-400 mt-1 font-medium">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(false)}
            className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {bulkDeleting ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              `Delete ${selectedIds.length}`
            )}
          </button>
        </div>
      </Modal>

      {/* Chat drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        initialConversation={chatConversation}
      />
    </>
  );
};

export default NotificationPage;