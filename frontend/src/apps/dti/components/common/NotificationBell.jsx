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

import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

import ChatDrawer from '../chat/ChatDrawer';

import { getNotificationMeta } from '@/utils/constants';

import {chatAPI, itemsAPI } from '@/services/api/dtiApi';

/* =========================================================
   Skeleton
========================================================= */

const NotificationBellSkeleton = () => (
  <div className="relative flex h-9 w-9 items-center justify-center">
    <div className="h-5 w-5 animate-pulse rounded-lg bg-ink-200" />
  </div>
);

const formatTime = (date) => {
  if (!date) return '';

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const now = Date.now();
  const diff = Math.max(0, now - timestamp);

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

/* =========================================================
   Notification Bell
========================================================= */

const NotificationBell = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading: contextLoading,
    areNotificationsEnabled,
  } = useNotifications();

  /* -------------------------------------------------------
     Refs
  ------------------------------------------------------- */

  const bellRef = useRef(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */

  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [dropdownPosition, setDropdownPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const [isChatOpen, setIsChatOpen] =
    useState(false);

  const [chatConversation, setChatConversation] =
    useState(null);

  const [chatLoading, setChatLoading] =
    useState(false);

  /* =======================================================
     Derived values
  ======================================================= */

  const displayCount = areNotificationsEnabled
    ? unreadCount
    : 0;

  // ✅ Only unread notifications, newest first, capped at 10
  const visibleNotifications = useMemo(() => {
    const unread = notifications
      .filter((n) => !n.is_read)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return unread.slice(0, 10);
  }, [notifications]);

  /* =======================================================
     Dropdown positioning
  ======================================================= */

  const updateDropdownPosition = useCallback(() => {
    if (!bellRef.current) return;

    const rect =
      bellRef.current.getBoundingClientRect();

    const viewportWidth = window.innerWidth;

    const dropdownWidth = Math.min(
      390,
      viewportWidth - 20
    );

    let left =
      rect.left +
      rect.width / 2 -
      dropdownWidth / 2;

    const horizontalPadding = 10;

    left = Math.max(
      horizontalPadding,
      Math.min(
        left,
        viewportWidth -
          dropdownWidth -
          horizontalPadding
      )
    );

    setDropdownPosition({
      top: rect.bottom + 10,
      left,
    });
  }, []);

  /* =======================================================
     Reposition while open
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    const handleResize = () => {
      updateDropdownPosition();
    };

    const handleScroll = () => {
      updateDropdownPosition();
    };

    window.addEventListener(
      'resize',
      handleResize
    );

    window.addEventListener(
      'scroll',
      handleScroll,
      true
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );

      window.removeEventListener(
        'scroll',
        handleScroll,
        true
      );
    };
  }, [
    isOpen,
    updateDropdownPosition,
  ]);

  /* =======================================================
     Close when clicking outside
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;

      const clickedBell =
        bellRef.current?.contains(target);

      const clickedDropdown =
        dropdownRef.current?.contains(target);

      if (
        clickedBell ||
        clickedDropdown
      ) {
        return;
      }

      setIsOpen(false);
      setShowMenu(false);
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, [isOpen]);

  /* =======================================================
     Close options menu outside
  ======================================================= */

  useEffect(() => {
    if (!showMenu) return;

    const handleMenuOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleMenuOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleMenuOutside
      );
    };
  }, [showMenu]);

  /* =======================================================
     Escape key
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
      setShowMenu(false);
    };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [isOpen]);

  /* =======================================================
     Lock body scroll on small screens
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    if (window.innerWidth >= 640) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  /* =======================================================
     Notification links (with admin support)
  ======================================================= */

  const getNotificationLink = useCallback(
    (notification) => {
      const data = notification.data || {};
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

      switch (notification.type) {
        case 'application_submitted':
        case 'application_received': {
          if (!data.item_id) return '#';

          const params =
            new URLSearchParams();

          params.set(
            'itemId',
            data.item_id
          );

          params.set(
            'status',
            'pending'
          );

          if (data.applicant_name) {
            params.set(
              'search',
              data.applicant_name
            );
          }

          return `/applications-to-my-item?${params.toString()}`;
        }

        case 'application_accepted': {
          if (!data.item_id) return '#';

          const params =
            new URLSearchParams();

          params.set(
            'itemId',
            data.item_id
          );

          params.set(
            'status',
            'accepted'
          );

          if (data.applicant_name) {
            params.set(
              'search',
              data.applicant_name
            );
          }

          return `/applications-to-my-item?${params.toString()}`;
        }

        case 'application_rejected': {
          if (!data.item_id) return '#';

          const params =
            new URLSearchParams();

          params.set(
            'itemId',
            data.item_id
          );

          params.set(
            'status',
            'rejected'
          );

          if (data.applicant_name) {
            params.set(
              'search',
              data.applicant_name
            );
          }

          return `/applications-to-my-item?${params.toString()}`;
        }

        case 'winner_announced':
        case 'item_completed':
          return data.item_id
            ? `/item/${data.item_id}`
            : '#';

        case 'chat':
        case 'message_received':
          return null;

        case 'reinterest': {
          if (!data.item_id) return '#';

          const params =
            new URLSearchParams();

          params.set(
            'itemId',
            data.item_id
          );

          params.set(
            'hasReinterest',
            'true'
          );

          if (data.applicant_name) {
            params.set(
              'search',
              data.applicant_name
            );
          }

          if (data.status) {
            params.set(
              'status',
              data.status
            );
          }

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

  /* =======================================================
     Open chat notification
  ======================================================= */

  const handleChatNotificationClick =
    useCallback(
      async (notification) => {
        const data =
          notification.data || {};

        const chatId = data.chat_id;
        const itemId = data.item_id;

        if (!chatId && !itemId) {
          toast.error(
            'Unable to open chat'
          );

          return;
        }

        if (!notification.is_read) {
          await markAsRead(
            notification.id
          );
        }

        setChatLoading(true);

        try {
          let conversationData = null;
          let itemData = null;
          let otherUser = null;
          let isDonor = false;

          /* -------------------------------------------------
             Existing conversation
          ------------------------------------------------- */

          if (chatId) {
            try {
              await chatAPI.getMessages(
                chatId
              );

              conversationData = {
                id: chatId,

                other_user:
                  data.sender || null,

                item: itemId
                  ? { id: itemId }
                  : null,
              };

              if (itemId) {
                const itemResponse =
                  await itemsAPI.getById(
                    itemId
                  );

                itemData =
                  itemResponse.data?.item;
              }

              otherUser =
                data.sender || {
                  id: data.sender_id,

                  full_name:
                    data.sender_name ||
                    'User',

                  avatar_url:
                    data.sender_avatar ||
                    null,
                };

              if (itemData) {
                isDonor =
                  itemData.donor_id ===
                  user?.id;
              }
            } catch (error) {
              console.warn(
                'Could not load existing chat:',
                error
              );
            }
          }

          /* -------------------------------------------------
             Create/find conversation from item
          ------------------------------------------------- */

          if (
            itemId &&
            !chatId
          ) {
            try {
              const response =
                await chatAPI.getOrCreateConversation(
                  itemId
                );

              const conversation =
                response.data;

              if (
                conversation?.conversation
              ) {
                conversationData = {
                  id:
                    conversation
                      .conversation
                      .id,

                  other_user:
                    conversation.other_user ||
                    data.sender ||
                    null,

                  item:
                    conversation.item ||
                    {
                      id: itemId,
                    },

                  is_donor:
                    conversation
                      .is_donor ||
                    false,
                };

                otherUser =
                  conversation.other_user ||
                  data.sender ||
                  null;

                isDonor =
                  conversation.is_donor ||
                  false;

                if (conversation.item) {
                  itemData =
                    conversation.item;
                }
              }
            } catch (error) {
              console.warn(
                'Could not load conversation:',
                error
              );
            }
          }

          /* -------------------------------------------------
             Fallback conversation
          ------------------------------------------------- */

          if (!conversationData) {
            conversationData = {
              id:
                chatId ||
                'temp',

              other_user:
                data.sender || {
                  full_name:
                    data.sender_name ||
                    'User',
                },

              item:
                itemData || {
                  id: itemId,

                  title:
                    data.item_title ||
                    'Item',
                },

              is_donor: false,
            };

            otherUser =
              data.sender ||
              conversationData.other_user;
          }

          /* -------------------------------------------------
             Prepare drawer data
          ------------------------------------------------- */

          setChatConversation({
            conversationId:
              conversationData.id ||
              chatId,

            otherUser:
              otherUser || {
                full_name:
                  data.sender_name ||
                  'User',

                avatar_url:
                  data.sender_avatar ||
                  null,
              },

            item:
              itemData ||
              conversationData.item || {
                id: itemId,

                title:
                  data.item_title ||
                  'Item',
              },

            isDonor:
              isDonor ||
              conversationData.is_donor ||
              false,
          });

          setIsChatOpen(true);

          setIsOpen(false);
          setShowMenu(false);
        } catch (error) {
          console.error(
            'Error opening chat from notification:',
            error
          );

          toast.error(
            'Failed to open chat'
          );
        } finally {
          setChatLoading(false);
        }
      },
      [
        markAsRead,
        user?.id,
      ]
    );

  /* =======================================================
     Re-interest
  ======================================================= */

  const handleReinterestClick =
    useCallback(
      (notification) => {
        const data =
          notification.data || {};

        if (!data.item_id) {
          return;
        }

        const params =
          new URLSearchParams();

        params.set(
          'itemId',
          data.item_id
        );

        params.set(
          'hasReinterest',
          'true'
        );

        if (data.applicant_name) {
          params.set(
            'search',
            data.applicant_name
          );
        }

        if (data.status) {
          params.set(
            'status',
            data.status
          );
        }

        navigate(
          `/applications-to-my-item?${params.toString()}`
        );

        setIsOpen(false);
        setShowMenu(false);
      },
      [navigate]
    );

  /* =======================================================
     Notification click
  ======================================================= */

  const handleNotificationClick =
    useCallback(
      async (notification) => {
        if (!notification.is_read) {
          await markAsRead(
            notification.id
          );
        }

        const isChat =
          notification.type === 'chat' ||
          notification.type ===
            'message_received';

        if (isChat) {
          await handleChatNotificationClick(
            notification
          );

          return;
        }

        if (
          notification.type ===
          'reinterest'
        ) {
          handleReinterestClick(
            notification
          );

          return;
        }

        const link =
          getNotificationLink(
            notification
          );

        if (
          link &&
          link !== '#'
        ) {
          navigate(link);

          setIsOpen(false);
          setShowMenu(false);
        }
      },
      [
        markAsRead,
        handleChatNotificationClick,
        handleReinterestClick,
        getNotificationLink,
        navigate,
      ]
    );

  /* =======================================================
     Toggle dropdown
  ======================================================= */

  const toggleDropdown = () => {
    if (!isOpen) {
      updateDropdownPosition();
      setShowMenu(false);
    }

    setIsOpen(
      (current) => !current
    );
  };

  /* =======================================================
     Loading state
  ======================================================= */

  if (contextLoading) {
    return (
      <NotificationBellSkeleton />
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const notificationsPath = isAdmin ? '/admin/notifications' : '/notifications';

  return (
    <>
      {/* ===================================================
          BELL
      =================================================== */}

      <div className="relative flex h-9 w-9 items-center justify-center">
        <button
          ref={bellRef}
          type="button"
          onClick={toggleDropdown}
          aria-label="Notifications"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ${
            isOpen
              ? 'border-primary-100 bg-primary-50 text-primary-700'
              : 'border-transparent text-ink-400 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-800'
          }`}
        >
          <i
            className={`bi ${
              isOpen
                ? 'bi-bell-fill'
                : 'bi-bell'
            } text-[17px] transition-transform duration-200 group-hover:scale-105`}
          />

          {displayCount > 0 && (
            <>
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />

              <span className="absolute -right-1.5 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-primary-600 px-1 text-[9px] font-black leading-none text-white shadow-sm">
                {displayCount > 99
                  ? '99+'
                  : displayCount}
              </span>
            </>
          )}
        </button>
      </div>

      {/* ===================================================
          DROPDOWN
      =================================================== */}

      {isOpen &&
        createPortal(
          <>
            {/* Mobile backdrop */}

            <div
              className="fixed inset-0 z-[9997] bg-ink-900/20 backdrop-blur-[2px] sm:hidden"
              onClick={() => {
                setIsOpen(false);
                setShowMenu(false);
              }}
            />

            {/* Notification panel */}

            <div
              ref={dropdownRef}
              role="dialog"
              aria-label="Notifications"
              className="fixed z-[9999] flex w-[390px] max-w-[calc(100vw-20px)] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl sm:max-w-[390px]"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                maxHeight:
                  'min(650px, calc(100vh - 90px))',
              }}
            >
              {/* =========================================
                  HEADER
              ========================================= */}

              <div className="shrink-0 border-b border-ink-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                      <i className="bi bi-bell-fill text-[17px]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-ink-900">
                          Notifications
                        </h3>

                        {displayCount > 0 && (
                          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-extrabold text-primary-700">
                            {displayCount} new
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                        {visibleNotifications.length === 0
                          ? 'You are all caught up'
                          : `${visibleNotifications.length} unread notification${visibleNotifications.length > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>

                  <div
                    ref={menuRef}
                    className="relative shrink-0"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        setShowMenu(
                          (current) =>
                            !current
                        );
                      }}
                      aria-label="Notification options"
                      aria-expanded={showMenu}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        showMenu
                          ? 'bg-ink-100 text-ink-800'
                          : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700'
                      }`}
                    >
                      <i className="bi bi-three-dots text-[15px]" />
                    </button>

                    {/* Options menu */}

                    {showMenu && (
                      <div className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white p-1.5 shadow-xl">
                        {displayCount > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              await markAllAsRead();

                              setShowMenu(
                                false
                              );
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-ink-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                              <i className="bi bi-check2-all" />
                            </span>

                            <span>
                              Mark all as read
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(
                              false
                            );

                            setShowMenu(
                              false
                            );

                            navigate(notificationsPath);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-ink-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
                            <i className="bi bi-list-ul" />
                          </span>

                          <span>
                            View all notifications
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* =========================================
                  CONTENT
              ========================================= */}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
                {/* Notifications disabled */}

                {!areNotificationsEnabled ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300">
                      <i className="bi bi-bell-slash text-2xl" />
                    </div>

                    <h4 className="mt-4 text-sm font-extrabold text-ink-800">
                      Notifications are off
                    </h4>

                    <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-ink-400">
                      Turn on in-app notifications
                      in your settings to stay
                      updated.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(
                          '/settings#inAppNoti'
                        );
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
                    >
                      Enable notifications

                      <i className="bi bi-arrow-right text-[11px]" />
                    </button>
                  </div>
                ) : notifications.length ===
                  0 ? (
                  /* No notifications at all */

                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300">
                      <i className="bi bi-check2-circle text-2xl" />
                    </div>

                    <h4 className="mt-4 text-sm font-extrabold text-ink-800">
                      You're all caught up
                    </h4>

                    <p className="mt-1 text-xs text-ink-400">
                      Nothing new to show right now.
                    </p>
                  </div>
                ) : visibleNotifications.length ===
                  0 ? (
                  /* All read – no unread */

                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-ink-300">
                      <i className="bi bi-check2-circle text-2xl" />
                    </div>

                    <h4 className="mt-4 text-sm font-extrabold text-ink-800">
                      All caught up!
                    </h4>

                    <p className="mt-1 text-xs text-ink-400">
                      You have read all your notifications.
                    </p>
                  </div>
                ) : (
                  /* Unread notifications list */

                  <div className="space-y-1">
                    {visibleNotifications.map(
                      (notification) => {
                        const meta =
                          getNotificationMeta(
                            notification.type
                          );

                        const isUnread =
                          !notification.is_read;

                        const isChat =
                          notification.type ===
                            'chat' ||
                          notification.type ===
                            'message_received';

                        const isReinterest =
                          notification.type ===
                          'reinterest';

                        const isDiscussion =
                          notification.type ===
                            'mention' ||
                          notification.type ===
                            'discussion_reply';

                        // Color from constants
                        const iconColorClass =
                          meta.color || 'text-ink-400';

                        return (
                          <div
                            key={
                              notification.id
                            }
                            className={`group relative mx-2 rounded-xl border transition-all duration-150 ${
                              isUnread
                                ? 'border-primary-100 bg-primary-50/50'
                                : 'border-transparent hover:border-ink-100 hover:bg-ink-50/60'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleNotificationClick(
                                  notification
                                )
                              }
                              className="block w-full px-3 py-3 text-left"
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon */}

                                <div
                                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                                    isUnread
                                      ? 'border-primary-100 bg-white text-primary-600'
                                      : 'border-ink-100 bg-white text-ink-400'
                                  }`}
                                >
                                  <i
                                    className={`bi ${meta.icon} text-[16px] ${iconColorClass}`}
                                  />

                                  {isUnread && (
                                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
                                  )}
                                </div>

                                {/* Content */}

                                <div className="min-w-0 flex-1 pr-5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={`line-clamp-1 text-[13px] leading-5 ${
                                        isUnread
                                          ? 'font-extrabold text-ink-900'
                                          : 'font-bold text-ink-800'
                                      }`}
                                    >
                                      {
                                        notification.title
                                      }
                                    </p>
                                  </div>

                                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-500">
                                    {
                                      notification.message
                                    }
                                  </p>

                                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-[10px] font-semibold text-ink-400">
                                      {formatTime(
                                        notification.created_at
                                      )}
                                    </span>

                                    <span className="h-1 w-1 rounded-full bg-ink-200" />

                                    <span
                                      className={`text-[10px] font-bold ${
                                        isUnread
                                          ? 'text-primary-600'
                                          : 'text-ink-400'
                                      }`}
                                    >
                                      {
                                        meta.label
                                      }
                                    </span>

                                    {/* Tags */}
                                    {isChat && (
                                      <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-extrabold text-primary-600">
                                        Chat
                                      </span>
                                    )}

                                    {isReinterest && (
                                      <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-extrabold text-primary-600">
                                        Re-interest
                                      </span>
                                    )}

                                    {isDiscussion && (
                                      <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-extrabold text-primary-600">
                                        {notification.type === 'mention'
                                          ? 'Mention'
                                          : 'Reply'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Delete */}

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();

                                deleteNotification(
                                  notification.id
                                );
                              }}
                              aria-label="Dismiss notification"
                              title="Dismiss"
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 focus:opacity-100"
                            >
                              <i className="bi bi-x-lg text-[10px]" />
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* =========================================
                  FOOTER
              ========================================= */}

              {areNotificationsEnabled &&
                notifications.length > 0 && (
                  <div className="shrink-0 border-t border-ink-100 bg-ink-50/50 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setShowMenu(false);
                        navigate(notificationsPath);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-extrabold text-primary-600 transition-colors hover:bg-white hover:text-primary-700"
                    >
                      View all notifications

                      <i className="bi bi-arrow-right text-[10px]" />
                    </button>
                  </div>
                )}
            </div>
          </>,
          document.body
        )}

      {/* ===================================================
          CHAT DRAWER
      =================================================== */}

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        initialConversation={
          chatConversation
        }
      />

      {/* Optional loading state while opening chat */}

      {chatLoading && isChatOpen === false && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[10000]">
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs font-bold text-ink-600 shadow-lg">
            <i className="bi bi-arrow-repeat animate-spin text-primary-600" />
            Opening chat...
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;