import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Loader2,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ChatSettings from './ChatSettings';

import useMessages from './useMessages';
import useConversations from './useConversations';

import { requestsAPI } from '@/services/api/popApi';
import { chatAPI } from '@/services/api/sharedApi';

/* ============================================================
   CONTEXT CONSTANTS
   ------------------------------------------------------------
   Must match backend/controllers/chatController.js
============================================================ */

const CONTEXT_DTI = 'dti_donor_applicant';
const CONTEXT_POP = 'pop_request';
const CONTEXT_DIRECT = 'direct_chat';

/*
 * Maps the app identity to the conversation context_type
 * it should filter by default.
 */
const CONTEXT_BY_APP = {
  dti: CONTEXT_DTI,
  pop: CONTEXT_POP,
};

/* ============================================================
   URL HELPERS
============================================================ */

function getConversationIdFromUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(
    window.location.search
  );

  return (
    params.get('conversation') ||
    params.get('conversationId') ||
    null
  );
}

function setConversationIdInUrl(
  conversationId,
  { replace = false } = {}
) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(
    window.location.href
  );

  if (conversationId) {
    url.searchParams.set(
      'conversation',
      String(conversationId)
    );

    url.searchParams.delete(
      'conversationId'
    );
  } else {
    url.searchParams.delete(
      'conversation'
    );

    url.searchParams.delete(
      'conversationId'
    );
  }

  if (replace) {
    window.history.replaceState(
      {},
      '',
      url.toString()
    );
  } else {
    window.history.pushState(
      {},
      '',
      url.toString()
    );
  }
}

/* ============================================================
   APP DETECTION
============================================================ */

function detectAppFromWindow() {
  if (typeof window === 'undefined') {
    return null;
  }

  const path = window.location.pathname;

  if (path.startsWith('/app/dti')) return 'dti';
  if (path.startsWith('/app/pop')) return 'pop';

  return null;
}

/* ============================================================
   RESPONSE HELPERS
============================================================ */

const extractConversation = (response) => {
  const body = response?.data ?? response;

  return (
    body?.conversation ||
    body?.data?.conversation ||
    body?.data ||
    null
  );
};

const getConversationId = (conversation) =>
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;

const isConversationDeleted = (conversation) => {
  if (!conversation) {
    return false;
  }

  if (
    conversation.isDeleted === true ||
    conversation.is_deleted === true
  ) {
    return true;
  }

  const deletedBy =
    conversation.deletedBy ??
    conversation.deleted_by;

  return Array.isArray(deletedBy)
    ? deletedBy.length > 0
    : false;
};

const isConversationDeletedForUser = (
  conversation,
  currentUserId
) => {
  if (!conversation) {
    return false;
  }

  if (
    conversation.isDeleted === true ||
    conversation.is_deleted === true
  ) {
    return true;
  }

  const deletedBy =
    conversation.deletedBy ??
    conversation.deleted_by;

  if (
    !Array.isArray(deletedBy) ||
    !currentUserId
  ) {
    return false;
  }

  return deletedBy.some(
    (id) =>
      String(id) ===
      String(currentUserId)
  );
};

/* ============================================================
   CHAT PAGE
============================================================ */

export default function ChatPage({
  currentUserId,
  onNewChat,
  onOpenDetails,
  onViewItem,
  onReinterest,
  onReport,

  /*
   * Optional. Pass 'dti' or 'pop' from the app root to skip
   * URL sniffing. Falls back to detecting from
   * window.location.pathname.
   */
  appContext,
}) {
  const [selectedId, setSelectedId] =
    useState(() =>
      getConversationIdFromUrl()
    );

  const [
    urlConversation,
    setUrlConversation,
  ] = useState(null);

  const [
    urlConversationLoading,
    setUrlConversationLoading,
  ] = useState(false);

  const [
    urlConversationError,
    setUrlConversationError,
  ] = useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState('all');

  const [showFilters, setShowFilters] =
    useState(false);

  const [mobileChatOpen, setMobileChatOpen] =
    useState(() =>
      Boolean(
        getConversationIdFromUrl()
      )
    );

  /*
   * Whether to show conversations from all apps, or only the
   * current app's context.
   *
   * false (default) → filter by this app's context_type
   * true            → no filter, show everything
   */
  const [showAllApps, setShowAllApps] =
    useState(false);

  /* ==========================================================
     APP / CONTEXT DETECTION
  ========================================================== */

  const detectedApp = useMemo(() => {
    if (appContext === 'dti' || appContext === 'pop') {
      return appContext;
    }

    return detectAppFromWindow();
  }, [appContext]);

  const contextType = useMemo(() => {
    if (showAllApps) return null;

    return CONTEXT_BY_APP[detectedApp] || null;
  }, [showAllApps, detectedApp]);

  /* ==========================================================
     CONVERSATIONS
  ========================================================== */

  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    reload: reloadConversations,
    togglePin,
    toggleMute,
    toggleArchive,
    markLocalRead,
    removeConversation,
  } = useConversations({
    currentUserId,
    filter:
      filter === 'archived'
        ? 'archived'
        : null,
    contextType,
  });

  /* ==========================================================
     STABLE REFS
  ========================================================== */

  const conversationsRef =
    useRef(conversations);

  useEffect(() => {
    conversationsRef.current =
      conversations;
  }, [conversations]);

  const markLocalReadRef =
    useRef(markLocalRead);

  useEffect(() => {
    markLocalReadRef.current =
      markLocalRead;
  }, [markLocalRead]);

  const lastHandledUrlIdRef =
    useRef(null);

  /* ==========================================================
     LOAD CONVERSATION FROM URL
  ========================================================== */

  const loadConversationFromUrl =
    useCallback(
      async (conversationId) => {
        if (!conversationId) {
          setUrlConversation(null);
          setUrlConversationError('');
          setUrlConversationLoading(false);
          return;
        }

        const existing =
          conversationsRef.current.find(
            (conversation) =>
              String(
                getConversationId(
                  conversation
                )
              ) ===
              String(conversationId)
          );

        if (existing) {
          setUrlConversation(existing);
          setUrlConversationError('');
          setUrlConversationLoading(false);

          if (
            !isConversationDeletedForUser(
              existing,
              currentUserId
            )
          ) {
            markLocalReadRef.current?.(
              getConversationId(existing)
            );
          }

          return;
        }

        setUrlConversationLoading(true);
        setUrlConversationError('');

        try {
          const response =
            await chatAPI.getConversation(
              conversationId
            );

          const loadedConversation =
            extractConversation(response);

          if (!loadedConversation) {
            throw new Error(
              'Conversation could not be found.'
            );
          }

          const loadedId =
            getConversationId(
              loadedConversation
            );

          if (!loadedId) {
            throw new Error(
              'Conversation response is missing its ID.'
            );
          }

          if (
            String(loadedId) !==
            String(conversationId)
          ) {
            throw new Error(
              'The requested conversation could not be resolved.'
            );
          }

          setUrlConversation(
            loadedConversation
          );

          if (
            !isConversationDeletedForUser(
              loadedConversation,
              currentUserId
            )
          ) {
            markLocalReadRef.current?.(
              loadedId
            );
          }
        } catch (err) {
          console.error(
            'ChatPage direct conversation load error:',
            err
          );

          setUrlConversation(null);

          setUrlConversationError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              'Could not open this conversation.'
          );
        } finally {
          setUrlConversationLoading(false);
        }
      },
      [currentUserId]
    );

  /* ==========================================================
     RESOLVE URL CONVERSATION
  ========================================================== */

  useEffect(() => {
    const conversationId =
      getConversationIdFromUrl();

    if (!conversationId) {
      lastHandledUrlIdRef.current = null;

      setUrlConversation(null);
      setUrlConversationError('');
      setUrlConversationLoading(false);
      return;
    }

    if (
      lastHandledUrlIdRef.current ===
      String(conversationId)
    ) {
      return;
    }

    lastHandledUrlIdRef.current =
      String(conversationId);

    setSelectedId(
      String(conversationId)
    );

    setMobileChatOpen(true);

    loadConversationFromUrl(
      conversationId
    );
  }, [
    loadConversationFromUrl,
  ]);

  /* ==========================================================
     REALTIME CHAT → REFRESH CONVERSATION LIST
  ========================================================== */

  useEffect(() => {
    const handleChatReceive = (event) => {
      const message = event?.detail;

      if (!message) {
        return;
      }

      reloadConversations();

      const currentConversationId =
        getConversationIdFromUrl();

      if (currentConversationId) {
        loadConversationFromUrl(
          currentConversationId
        );
      }
    };

    window.addEventListener(
      'chat:receive',
      handleChatReceive
    );

    return () => {
      window.removeEventListener(
        'chat:receive',
        handleChatReceive
      );
    };
  }, [
    reloadConversations,
    loadConversationFromUrl,
  ]);

  /* ==========================================================
     REALTIME CONVERSATION UPDATE
  ========================================================== */

  useEffect(() => {
    const handleConversationUpdate =
      (event) => {
        const payload =
          event?.detail;

        if (!payload) {
          return;
        }

        const updatedConversation =
          payload?.conversation ||
          payload?.data?.conversation ||
          payload?.data ||
          null;

        if (!updatedConversation) {
          return;
        }

        const updatedId =
          payload?.conversationId ||
          getConversationId(
            updatedConversation
          );

        const currentId =
          getConversationIdFromUrl();

        if (
          !updatedId ||
          !currentId ||
          String(updatedId) !==
            String(currentId)
        ) {
          return;
        }

        setUrlConversation(
          updatedConversation
        );

        if (
          isConversationDeletedForUser(
            updatedConversation,
            currentUserId
          )
        ) {
          setUrlConversationError('');
        }

        reloadConversations();
      };

    window.addEventListener(
      'chat:conversation:update',
      handleConversationUpdate
    );

    return () => {
      window.removeEventListener(
        'chat:conversation:update',
        handleConversationUpdate
      );
    };
  }, [
    currentUserId,
    reloadConversations,
  ]);

  /* ==========================================================
     URL / BROWSER NAVIGATION
  ========================================================== */

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      const conversationId =
        getConversationIdFromUrl();

      if (conversationId) {
        lastHandledUrlIdRef.current =
          String(conversationId);

        setSelectedId(
          String(conversationId)
        );

        setMobileChatOpen(true);

        loadConversationFromUrl(
          conversationId
        );
      } else {
        lastHandledUrlIdRef.current = null;

        setSelectedId(null);
        setUrlConversation(null);
        setUrlConversationError('');
        setMobileChatOpen(false);
      }
    };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, [
    loadConversationFromUrl,
  ]);

  /* ==========================================================
     AUTO SELECT / RESTORE FROM URL
  ========================================================== */

  useEffect(() => {
    const urlConversationId =
      getConversationIdFromUrl();

    if (urlConversationId) {
      if (
        String(selectedId || '') !==
        String(urlConversationId)
      ) {
        setSelectedId(
          String(urlConversationId)
        );
      }

      setMobileChatOpen(true);

      return;
    }

    if (!conversations.length) {
      return;
    }

    if (selectedId) {
      const exists =
        conversations.some(
          (conversation) =>
            String(
              getConversationId(
                conversation
              )
            ) ===
            String(selectedId)
        );

      if (
        !exists &&
        !urlConversation
      ) {
        setSelectedId(null);
        setMobileChatOpen(false);

        setConversationIdInUrl(
          null,
          { replace: true }
        );
      }

      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.innerWidth >= 640
    ) {
      const first =
        conversations[0];

      if (!first?.id) {
        return;
      }

      setSelectedId(
        String(first.id)
      );

      setConversationIdInUrl(
        first.id,
        { replace: true }
      );
    }
  }, [
    conversations,
    selectedId,
    urlConversation,
  ]);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredConversations =
    useMemo(() => {
      const q =
        search.trim().toLowerCase();

      return conversations.filter(
        (conversation) => {
          if (
            filter === 'unread' &&
            !(conversation.unreadCount > 0)
          ) {
            return false;
          }

          if (
            filter === 'pinned' &&
            !conversation.isPinned
          ) {
            return false;
          }

          if (!q) {
            return true;
          }

          const name =
            conversation
              .otherParticipant
              ?.full_name || '';

          const title =
            conversation.request?.title ||
            conversation.item?.title ||
            '';

          const lastMessage =
            conversation.lastMessage || '';

          return `${name} ${title} ${lastMessage}`
            .toLowerCase()
            .includes(q);
        }
      );
    }, [
      conversations,
      search,
      filter,
    ]);

  /* ==========================================================
     SELECTED CONVERSATION
  ========================================================== */

  const selectedConversation =
    useMemo(() => {
      if (!selectedId) {
        return null;
      }

      const fromList =
        conversations.find(
          (conversation) =>
            String(
              getConversationId(
                conversation
              )
            ) ===
            String(selectedId)
        );

      if (fromList) {
        return fromList;
      }

      if (
        urlConversation &&
        String(
          getConversationId(
            urlConversation
          )
        ) ===
          String(selectedId)
      ) {
        return urlConversation;
      }

      return null;
    }, [
      conversations,
      selectedId,
      urlConversation,
    ]);

  /* ==========================================================
     SELECT CONVERSATION
  ========================================================== */

  const handleSelectConversation =
    useCallback(
      (conversation) => {
        if (!conversation?.id) {
          return;
        }

        const id =
          String(conversation.id);

        setSelectedId(id);
        setUrlConversation(
          conversation
        );
        setUrlConversationError('');
        setMobileChatOpen(true);

        const currentId =
          getConversationIdFromUrl();

        if (
          String(currentId || '') !== id
        ) {
          setConversationIdInUrl(id);
        }

        lastHandledUrlIdRef.current = id;

        if (
          !isConversationDeletedForUser(
            conversation,
            currentUserId
          )
        ) {
          markLocalRead(
            conversation.id
          );
        }
      },
      [
        currentUserId,
        markLocalRead,
      ]
    );

  /* ==========================================================
     CONVERSATION UPDATED
  ========================================================== */

  const handleConversationUpdated =
    useCallback(
      (updatedConversation) => {
        if (!updatedConversation) {
          reloadConversations();
          return;
        }

        const updatedId =
          getConversationId(
            updatedConversation
          );

        if (!updatedId) {
          reloadConversations();
          return;
        }

        setUrlConversation(
          updatedConversation
        );

        if (
          String(selectedId || '') ===
          String(updatedId)
        ) {
          setSelectedId(
            String(updatedId)
          );
        }

        reloadConversations();
      },
      [
        reloadConversations,
        selectedId,
      ]
    );

  /* ==========================================================
     OPEN CHAT LIST
  ========================================================== */

  const handleOpenList =
    useCallback(() => {
      setMobileChatOpen(false);
    }, []);

  /* ==========================================================
     MOBILE BACK
  ========================================================== */

  const handleMobileBack =
    useCallback(() => {
      setMobileChatOpen(false);
      setSelectedId(null);
      setUrlConversation(null);
      setUrlConversationError('');

      lastHandledUrlIdRef.current = null;

      setConversationIdInUrl(
        null,
        { replace: true }
      );
    }, []);

  /* ==========================================================
     DELETE CONVERSATION
  ========================================================== */

  const handleDeleteConversation =
    useCallback(
      async (conversation) => {
        if (!conversation?.id) {
          return;
        }

        await removeConversation(
          conversation.id
        );

        if (
          String(selectedId) ===
          String(conversation.id)
        ) {
          setSelectedId(null);
          setUrlConversation(null);
          setUrlConversationError('');
          setMobileChatOpen(false);

          lastHandledUrlIdRef.current = null;

          setConversationIdInUrl(
            null,
            { replace: true }
          );
        }
      },
      [
        removeConversation,
        selectedId,
      ]
    );

  /* ==========================================================
     ASSIGN PROVIDER
  ========================================================== */

  const handleAssignProvider =
    useCallback(
      async ({
        request,
        providerId,
      }) => {
        if (
          !request?.id &&
          !request?.request_id
        ) {
          throw new Error(
            'Request ID is missing.'
          );
        }

        if (!providerId) {
          throw new Error(
            'Provider ID is missing.'
          );
        }

        const requestId =
          request.id ||
          request.request_id;

        await requestsAPI.update(
          requestId,
          {
            provider_id:
              providerId,
          }
        );

        await reloadConversations();
      },
      [reloadConversations]
    );

  /* ==========================================================
     RENDER STATE
  ========================================================== */

  const isOpeningUrlConversation =
    Boolean(selectedId) &&
    !selectedConversation &&
    (
      conversationsLoading ||
      urlConversationLoading
    );

  const appScopeLabel =
    detectedApp === 'dti'
      ? 'DTI Chats'
      : detectedApp === 'pop'
      ? 'POP Chats'
      : 'This App';

  return (
    <div
      className="
        flex
        h-[calc(100dvh-85px)]
        min-h-0
        w-full
								mt-4
        overflow-hidden
        rounded-[28px]
        border
        border-ink-200
        bg-white
        shadow-soft
      "
    >
      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`
          ${
            mobileChatOpen
              ? 'hidden sm:flex'
              : 'flex'
          }
          w-full
          min-h-0
          shrink-0
          flex-col
          border-r
          border-ink-200
          bg-white
          sm:w-[320px]
          lg:w-[360px]
        `}
      >
        <div
          className="
            shrink-0
            border-b
            border-ink-200
            px-4
            py-4
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary-50
                  text-primary-600
                  shadow-xs
                "
              >
                <MessageCircle size={18} />
              </div>

              <div className="min-w-0">
                <h1
                  className="
                    text-lg
                    font-black
                    leading-tight
                    tracking-tight
                    text-ink-950
                  "
                >
                  Chats
                </h1>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    font-bold
                    text-ink-400
                  "
                >
                  Your conversations
                </p>
              </div>
            </div>

            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary-600
                  text-white
                  shadow-primary
                  transition
                  hover:bg-primary-700
                  active:scale-95
                "
                aria-label="New chat"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          {/* ==========================================
             APP SCOPE TOGGLE
             ------------------------------------------
             Only shown when we can tell which app
             we're inside. Offers "this app" vs "all apps".
          ========================================== */}

          {detectedApp && (
            <div className="mt-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAllApps(false)}
                className={`
                  flex-1
                  rounded-full
                  px-3
                  py-1.5
                  text-[10px]
                  font-black
                  transition
                  ${
                    !showAllApps
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-700'
                  }
                `}
              >
                {appScopeLabel}
              </button>

              <button
                type="button"
                onClick={() => setShowAllApps(true)}
                className={`
                  flex-1
                  rounded-full
                  px-3
                  py-1.5
                  text-[10px]
                  font-black
                  transition
                  ${
                    showAllApps
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-700'
                  }
                `}
              >
                All Apps
              </button>
            </div>
          )}

          {/* SEARCH */}

          <div
            className="
              mt-4
              flex
              min-w-0
              items-center
              gap-2
              rounded-2xl
              border
              border-ink-200
              bg-ink-50
              px-3
              transition
              focus-within:border-primary-300
              focus-within:bg-white
              focus-within:shadow-xs
            "
          >
            <Search
              size={15}
              className="shrink-0 text-ink-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations…"
              className="
                min-w-0
                flex-1
                border-0
                bg-transparent
                py-2.5
                text-xs
                font-semibold
                text-ink-900
                outline-none
                placeholder:text-ink-400
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-ink-400
                  transition
                  hover:bg-ink-100
                  hover:text-ink-700
                "
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (value) => !value
                )
              }
              className={`
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                transition
                ${
                  showFilters
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700'
                }
              `}
              aria-label="Filter conversations"
              aria-expanded={
                showFilters
              }
            >
              <SlidersHorizontal
                size={14}
              />
            </button>
          </div>

          {/* FILTERS */}

          {showFilters && (
            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                gap-1.5
              "
            >
              {[
                ['all', 'All'],
                ['unread', 'Unread'],
                ['pinned', 'Pinned'],
                [
                  'archived',
                  'Archived',
                ],
              ].map(
                ([value, label]) => {
                  const active =
                    filter === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFilter(value)
                      }
                      className={`
                        rounded-full
                        px-3
                        py-1.5
                        text-[10px]
                        font-black
                        transition
                        ${
                          active
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-700'
                        }
                      `}
                    >
                      {label}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <ChatList
            conversations={
              filteredConversations
            }
            loading={
              conversationsLoading
            }
            error={
              conversationsError
            }
            selectedId={
              selectedId
            }
            currentUserId={
              currentUserId
            }
            onSelect={
              handleSelectConversation
            }
            onRetry={
              reloadConversations
            }
            onDeleteConversation={
              handleDeleteConversation
            }
            onAssignProvider={
              handleAssignProvider
            }
          />
        </div>
      </aside>

      {/* ======================================================
          CHAT PANEL
      ====================================================== */}

      <main
        className={`
          ${
            mobileChatOpen
              ? 'flex'
              : 'hidden sm:flex'
          }
          min-w-0
          min-h-0
          flex-1
          flex-col
          bg-ink-50
        `}
      >
        {selectedConversation ? (
          <ConversationPanel
            key={
              selectedConversation.id
            }
            conversation={
              selectedConversation
            }
            currentUserId={
              currentUserId
            }
            onBack={
              handleMobileBack
            }
            onRefreshConversations={
              reloadConversations
            }
            onConversationUpdated={
              handleConversationUpdated
            }
            onTogglePin={() =>
              togglePin(
                selectedConversation.id
              )
            }
            onToggleMute={() =>
              toggleMute(
                selectedConversation.id
              )
            }
            onToggleArchive={() =>
              toggleArchive(
                selectedConversation.id
              )
            }
            onOpenDetails={onOpenDetails}
            onViewItem={onViewItem}
            onReinterest={onReinterest}
            onReport={onReport}
          />
        ) : isOpeningUrlConversation ? (
          <LoadingChat
            onOpenList={handleOpenList}
          />
        ) : urlConversationError ? (
          <ConversationLoadError
            message={
              urlConversationError
            }
            onRetry={() => {
              const id =
                getConversationIdFromUrl();

              if (id) {
                loadConversationFromUrl(
                  id
                );
              }
            }}
            onOpenList={
              handleOpenList
            }
          />
        ) : (
          <EmptyChat
            onOpenList={handleOpenList}
          />
        )}
      </main>
    </div>
  );
}

/* ============================================================
   CONVERSATION PANEL
   (unchanged — same as before)
============================================================ */

function ConversationPanel({
  conversation,
  currentUserId,
  onBack,
  onRefreshConversations,
  onConversationUpdated,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onOpenDetails,
  onViewItem,
  onReinterest,
  onReport,
}) {
  const conversationId =
    getConversationId(
      conversation
    );

  const other =
    conversation.otherParticipant ||
    conversation.other_participant ||
    null;

  const [replyTo, setReplyTo] =
    useState(null);

  const [editing, setEditing] =
    useState(null);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [sendError, setSendError] =
    useState('');

  const [closing, setClosing] =
    useState(false);

  const [reopening, setReopening] =
    useState(false);

  const isDeleted =
    isConversationDeletedForUser(
      conversation,
      currentUserId
    );

  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    setSearchOpen(false);
    setSearchQuery('');
    setSettingsOpen(false);
    setSendError('');
  }, [conversationId]);

  const {
    messages,
    loading,
    loadingMore,
    error,
    hasOlder,
    loadOlder,
    reload,
    sendMessage,
    editMessage,
    deleteMessage,
    markReadUpTo,
    typingUsers,
    onlineUserIds,
    realtimeStatus,
    emitTyping,
    emitTypingStop,
  } = useMessages({
    conversationId,
    currentUserId,
    isDeleted,
    enabled:
      !!conversationId &&
      !isDeleted,
  });

  const isClosed =
    !!(
      conversation.isClosed ||
      conversation.is_closed ||
      conversation.status === 'closed' ||
      conversation.status === 'cancelled'
    );

  const handleSent =
    useCallback(
      async (payload) => {
        if (isDeleted) {
          throw new Error(
            'This conversation is no longer available.'
          );
        }

        setSendError('');

        try {
          await sendMessage({
            ...payload,
            recipientId:
              payload?.recipientId ||
              payload?.recipient_id ||
              other?.id,
          });

          onRefreshConversations?.();
        } catch (err) {
          setSendError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to send message.'
          );

          throw err;
        }
      },
      [
        isDeleted,
        sendMessage,
        onRefreshConversations,
        other?.id,
      ]
    );

  const handleEdited =
    useCallback(
      async (
        message,
        content
      ) => {
        if (isDeleted) {
          throw new Error(
            'This conversation is no longer available.'
          );
        }

        setSendError('');

        try {
          await editMessage(
            message.id,
            content
          );
        } catch (err) {
          setSendError(
            err?.response?.data
              ?.message ||
              err?.message ||
              'Failed to edit message.'
          );

          throw err;
        }
      },
      [
        editMessage,
        isDeleted,
      ]
    );

  const handleDelete =
    useCallback(
      async (
        message,
        scope
      ) => {
        if (isDeleted) {
          return;
        }

        try {
          await deleteMessage(
            message.id,
            scope
          );

          onRefreshConversations?.();
        } catch (err) {
          setSendError(
            err?.response?.data
              ?.message ||
              err?.message ||
              'Failed to delete message.'
          );
        }
      },
      [
        deleteMessage,
        isDeleted,
        onRefreshConversations,
      ]
    );

  const handleClose =
    useCallback(
      async (reason) => {
        if (
          !conversationId ||
          isDeleted ||
          isClosed
        ) {
          return;
        }

        setClosing(true);
        setSendError('');

        try {
          const response =
            await chatAPI.closeConversation(
              conversationId,
              reason
            );

          const updatedConversation =
            extractConversation(response);

          if (updatedConversation) {
            onConversationUpdated?.(
              updatedConversation
            );
          }

          await onRefreshConversations?.();
        } catch (err) {
          setSendError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to close conversation.'
          );
        } finally {
          setClosing(false);
        }
      },
      [
        conversationId,
        isDeleted,
        isClosed,
        onConversationUpdated,
        onRefreshConversations,
      ]
    );

  const handleReopen =
    useCallback(
      async () => {
        if (
          !conversationId ||
          isDeleted ||
          !isClosed
        ) {
          return;
        }

        setReopening(true);
        setSendError('');

        try {
          const response =
            await chatAPI.reopenConversation(
              conversationId
            );

          const updatedConversation =
            extractConversation(response);

          if (updatedConversation) {
            onConversationUpdated?.(
              updatedConversation
            );
          }

          await onRefreshConversations?.();
        } catch (err) {
          setSendError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to reopen conversation.'
          );
        } finally {
          setReopening(false);
        }
      },
      [
        conversationId,
        isDeleted,
        isClosed,
        onConversationUpdated,
        onRefreshConversations,
      ]
    );

  const handleSearch =
    useCallback(() => {
      if (isDeleted) {
        return;
      }

      setSettingsOpen(false);
      setSearchOpen(true);
    }, [isDeleted]);

  const handleSearchSubmit =
    useCallback(
      async () => {
        if (
          isDeleted ||
          !searchQuery.trim() ||
          !conversationId
        ) {
          return;
        }

        try {
          const res =
            await chatAPI.getConversation(
              conversationId,
              {
                q: searchQuery.trim(),
                limit: 30,
              }
            );

          const body =
            res?.data ?? res;

          console.log(
            '[chat search]',
            body?.messages
              ?.length || 0,
            'results'
          );
        } catch (err) {
          setSendError(
            err?.message ||
              'Search failed.'
          );
        }
      },
      [
        isDeleted,
        searchQuery,
        conversationId,
      ]
    );

  useEffect(() => {
    if (
      !conversationId ||
      isDeleted
    ) {
      return undefined;
    }

    const onFocus = () => {
      const last =
        messages[
          messages.length - 1
        ];

      if (last?.id) {
        markReadUpTo(last.id);
      }
    };

    onFocus();

    window.addEventListener(
      'focus',
      onFocus
    );

    document.addEventListener(
      'visibilitychange',
      onFocus
    );

    return () => {
      window.removeEventListener(
        'focus',
        onFocus
      );

      document.removeEventListener(
        'visibilitychange',
        onFocus
      );
    };
  }, [
    conversationId,
    isDeleted,
    messages,
    markReadUpTo,
  ]);

  const handleOpenSettings =
    useCallback(() => {
      if (isDeleted) {
        return;
      }

      setSearchOpen(false);
      setSearchQuery('');
      setSettingsOpen(true);
    }, [isDeleted]);

  const handleCloseSettings =
    useCallback(() => {
      setSettingsOpen(false);
    }, []);

  if (isDeleted) {
    return (
      <DeletedConversationState
        onBack={onBack}
        other={other}
      />
    );
  }

  if (settingsOpen) {
    return (
      <div
        className="
          flex
          min-h-0
          flex-1
          flex-col
          overflow-hidden
          bg-ink-50
        "
      >
        <ChatSettings
          conversation={
            conversation
          }
          other={other}
          requestId={
            conversation.requestId ||
            conversation.request_id
          }
          currentUserId={
            currentUserId
          }
          onClose={
            handleCloseSettings
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        conversation={conversation}
        other={other}
        requestId={
          conversation.requestId ||
          conversation.request_id
        }
        typingUsers={typingUsers}
        onlineUserIds={onlineUserIds}
        realtimeStatus={realtimeStatus}
        showExpand={false}
        onBack={onBack}
        onTogglePin={onTogglePin}
        onToggleMute={onToggleMute}
        onToggleArchive={onToggleArchive}
        onClose={
          isClosed
            ? handleReopen
            : handleClose
        }
        closeLabel={
          isClosed
            ? reopening
              ? 'Reopening…'
              : 'Reopen conversation'
            : closing
              ? 'Closing…'
              : 'Close conversation'
        }
        onSearch={handleSearch}
        onOpenSettings={handleOpenSettings}
        onOpenDetails={onOpenDetails}
        onViewItem={onViewItem}
        onReinterest={onReinterest}
        onReport={onReport}
      />

      {searchOpen && (
        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
            border-b
            border-ink-200
            bg-white
            px-3
            py-2
            shadow-xs
          "
        >
          <Search
            size={14}
            className="shrink-0 text-ink-400"
          />

          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                'Enter'
              ) {
                handleSearchSubmit();
              }

              if (
                event.key ===
                'Escape'
              ) {
                setSearchOpen(false);
                setSearchQuery('');
                reload();
              }
            }}
            placeholder="Search in this chat…"
            className="
              min-w-0
              flex-1
              border-0
              bg-transparent
              py-1.5
              text-xs
              font-semibold
              text-ink-900
              outline-none
              placeholder:text-ink-400
            "
          />

          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
              reload();
            }}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-ink-400
              transition
              hover:bg-ink-100
              hover:text-ink-700
            "
            aria-label="Close search"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div
        className="
          flex
          min-h-0
          flex-1
          flex-col
          overflow-hidden
          bg-ink-50
        "
      >
        <MessageList
          messages={messages}
          loading={loading}
          loadingMore={loadingMore}
          hasOlder={hasOlder}
          onLoadOlder={
            loadOlder
          }
          currentUserId={
            currentUserId
          }
          other={other}
          typingUsers={
            typingUsers
          }
          onReply={(message) => {
            setEditing(null);
            setReplyTo(message);
          }}
          onEdit={(message) => {
            setReplyTo(null);
            setEditing(message);
          }}
          onDelete={
            handleDelete
          }
        />
      </div>

      {(error || sendError) && (
        <div
          className="
            shrink-0
            border-t
            border-red-200
            bg-red-50
            px-4
            py-2
          "
        >
          <p
            className="
              text-[10px]
              font-bold
              leading-4
              text-red-600
            "
          >
            {error || sendError}
          </p>
        </div>
      )}

      <MessageComposer
        conversationId={
          conversationId
        }
        isClosed={
          isClosed || closing
        }
        replyTo={replyTo}
        editing={editing}
        currentUserName={
          other?.full_name ||
          other?.fullName ||
          other?.name
        }
        onCancelReply={() =>
          setReplyTo(null)
        }
        onCancelEdit={() =>
          setEditing(null)
        }
        onSent={
          handleSent
        }
        onEdited={
          handleEdited
        }
        onError={
          setSendError
        }
        onTyping={(name) =>
          emitTyping(name)
        }
        onTypingStop={
          emitTypingStop
        }
      />
    </div>
  );
}

/* ============================================================
   DELETED CONVERSATION STATE  (unchanged)
============================================================ */

function DeletedConversationState({
  onBack,
  other,
}) {
  const name =
    other?.full_name ||
    other?.fullName ||
    other?.name ||
    'This person';

  return (
    <div
      className="
        flex
        min-h-0
        flex-1
        flex-col
        overflow-hidden
        bg-ink-50
      "
    >
      <div
        className="
          flex
          shrink-0
          items-center
          gap-3
          border-b
          border-ink-200
          bg-white
          px-4
          py-3
          shadow-xs
        "
      >
        <button
          type="button"
          onClick={onBack}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-ink-500
            transition
            hover:bg-ink-100
            hover:text-ink-800
            sm:hidden
          "
          aria-label="Back to conversations"
        >
          <MessageCircle size={17} />
        </button>

        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-ink-100
            text-sm
            font-black
            text-ink-500
          "
        >
          {String(name)
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="
              truncate
              text-sm
              font-black
              text-ink-900
            "
          >
            {name}
          </h2>

          <p
            className="
              mt-0.5
              text-[10px]
              font-semibold
              text-ink-400
            "
          >
            Conversation unavailable
          </p>
        </div>
      </div>

      <div
        className="
          flex
          min-h-0
          flex-1
          flex-col
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <div
          className="
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-3xl
            border
            border-ink-200
            bg-white
            text-ink-400
            shadow-xs
          "
        >
          <MessageCircle
            size={30}
            strokeWidth={2}
          />
        </div>

        <h2
          className="
            mt-5
            text-base
            font-black
            tracking-tight
            text-ink-800
          "
        >
          Conversation unavailable
        </h2>

        <p
          className="
            mt-2
            max-w-sm
            text-xs
            font-medium
            leading-5
            text-ink-400
          "
        >
          You deleted this conversation.
          Your previous messages are no
          longer available here.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-ink-200
            bg-white
            px-4
            py-2.5
            text-xs
            font-black
            text-ink-700
            shadow-xs
            transition
            hover:bg-ink-100
            active:scale-95
          "
        >
          <MessageCircle size={14} />
          View conversations
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   LOADING CHAT  (unchanged)
============================================================ */

function LoadingChat({
  onOpenList,
}) {
  return (
    <div
      className="
        flex
        flex-1
        min-h-0
        flex-col
        items-center
        justify-center
        bg-ink-50
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-20
          w-20
          items-center
          justify-center
          rounded-3xl
          border
          border-primary-100
          bg-primary-50
          text-primary-600
          shadow-primary
        "
      >
        <Loader2
          size={28}
          strokeWidth={2.2}
          className="animate-spin"
        />
      </div>

      <h2
        className="
          mt-5
          text-base
          font-black
          tracking-tight
          text-ink-800
        "
      >
        Opening conversation…
      </h2>

      <p
        className="
          mt-1.5
          max-w-xs
          text-xs
          font-medium
          leading-5
          text-ink-400
        "
      >
        Hang tight, loading your messages.
      </p>

      {onOpenList && (
        <button
          type="button"
          onClick={onOpenList}
          className="
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-ink-200
            bg-white
            px-4
            py-2.5
            text-xs
            font-black
            text-ink-700
            shadow-xs
            transition
            hover:bg-ink-100
            active:scale-95
            sm:hidden
          "
        >
          <MessageCircle size={14} />
          View conversations
        </button>
      )}
    </div>
  );
}

/* ============================================================
   CONVERSATION LOAD ERROR  (unchanged)
============================================================ */

function ConversationLoadError({
  message,
  onRetry,
  onOpenList,
}) {
  return (
    <div
      className="
        flex
        flex-1
        min-h-0
        flex-col
        items-center
        justify-center
        bg-ink-50
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-20
          w-20
          items-center
          justify-center
          rounded-3xl
          border
          border-red-100
          bg-red-50
          text-red-500
          shadow-xs
        "
      >
        <MessageCircle
          size={30}
          strokeWidth={2.2}
        />
      </div>

      <h2
        className="
          mt-5
          text-base
          font-black
          tracking-tight
          text-ink-800
        "
      >
        Could not open conversation
      </h2>

      <p
        className="
          mt-1.5
          max-w-sm
          text-xs
          font-medium
          leading-5
          text-ink-400
        "
      >
        {message}
      </p>

      <div className="mt-5 flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="
              rounded-xl
              bg-primary-600
              px-4
              py-2.5
              text-xs
              font-black
              text-white
              shadow-primary
              transition
              hover:bg-primary-700
              active:scale-95
            "
          >
            Try again
          </button>
        )}

        {onOpenList && (
          <button
            type="button"
            onClick={onOpenList}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              border
              border-ink-200
              bg-white
              px-4
              py-2.5
              text-xs
              font-black
              text-ink-700
              shadow-xs
              transition
              hover:bg-ink-100
              active:scale-95
              sm:hidden
            "
          >
            <MessageCircle size={14} />
            View conversations
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY CHAT  (unchanged)
============================================================ */

function EmptyChat({
  onOpenList,
}) {
  return (
    <div
      className="
        flex
        flex-1
        min-h-0
        flex-col
        items-center
        justify-center
        bg-ink-50
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-20
          w-20
          items-center
          justify-center
          rounded-3xl
          border
          border-primary-100
          bg-primary-50
          text-primary-600
          shadow-primary
        "
      >
        <MessageCircle
          size={30}
          strokeWidth={2.2}
        />
      </div>

      <h2
        className="
          mt-5
          text-base
          font-black
          tracking-tight
          text-ink-800
        "
      >
        Select a conversation
      </h2>

      <p
        className="
          mt-1.5
          max-w-xs
          text-xs
          font-medium
          leading-5
          text-ink-400
        "
      >
        Choose a conversation from the
        list to continue chatting.
      </p>

      {onOpenList && (
        <button
          type="button"
          onClick={onOpenList}
          className="
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-ink-200
            bg-white
            px-4
            py-2.5
            text-xs
            font-black
            text-ink-700
            shadow-xs
            transition
            hover:bg-ink-100
            active:scale-95
            sm:hidden
          "
        >
          <MessageCircle size={14} />
          View conversations
        </button>
      )}
    </div>
  );
}