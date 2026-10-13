import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Bell,
  BellOff,
  ChevronRight,
  Info,
  Loader2,
  Shield,
  Settings2,
} from 'lucide-react';

import Modal from '@/reusables/Modal';

import useChat from './useChat';
import useMessages from './useMessages';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';

/* ============================================================
   HELPERS
============================================================ */

const getConversationId = (conversation) =>
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;

const getConversationClosed = (conversation) =>
  !!(
    conversation?.isClosed ||
    conversation?.is_closed ||
    conversation?.status === 'closed' ||
    conversation?.status === 'cancelled'
  );

const getParticipantName = (profile) =>
  profile?.fullName ||
  profile?.full_name ||
  profile?.name ||
  'Community member';

const getAvatarUrl = (profile) =>
  profile?.avatarUrl ||
  profile?.avatar_url ||
  profile?.picture ||
  null;

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

/* ============================================================
   CONTEXT HELPERS (item  |  request  |  direct)
   ------------------------------------------------------------
   Same semantics as in ChatSettings.jsx, kept local here so the
   inline settings panel inside the modal speaks the same
   vocabulary as the standalone settings page.
============================================================ */

const getContextType = (conversation) =>
  conversation?.contextType ||
  conversation?.context_type ||
  null;

const getRequestTitle = (conversation) =>
  conversation?.request?.title ||
  conversation?.request?.name ||
  null;

const getItemTitle = (conversation) =>
  conversation?.item?.title ||
  conversation?.item?.name ||
  null;

const getContextTitle = (conversation) =>
  getItemTitle(conversation) ||
  getRequestTitle(conversation) ||
  null;

const getContextLabel = (conversation) => {
  const type = getContextType(conversation);

  if (type === 'item') return 'Item';
  if (type === 'request') return 'Request';
  return 'Conversation';
};

/* ============================================================
   CHAT SETTINGS (inline panel)
============================================================ */

function ChatSettings({
  conversation,
  other,
  onClose,
}) {
  const [notifications, setNotifications] =
    useState(true);

  const [showInfo, setShowInfo] =
    useState(false);

  const name =
    getParticipantName(other);

  const avatarUrl =
    getAvatarUrl(other);

  const conversationId =
    getConversationId(conversation);

  /* ----------------------------------------------------------
     Context-aware title + label.
     ----------------------------------------------------------
     DTI chats show the item title, POP chats show the request
     title, and direct chats fall through to "Conversation".
  ---------------------------------------------------------- */

  const contextTitle =
    getContextTitle(conversation) || 'Conversation';

  const contextLabel =
    getContextLabel(conversation);

  const isClosed =
    getConversationClosed(conversation);

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        bg-white
      "
    >
      {/* ======================================================
         SETTINGS HEADER
      ====================================================== */}

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
          sm:px-5
        "
      >
        <button
          type="button"
          onClick={onClose}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-ink-200
            bg-white
            text-ink-600
            transition
            hover:border-primary-200
            hover:bg-primary-50
            hover:text-primary-700
            active:scale-95
          "
          aria-label="Back to chat"
        >
          <ChevronRight
            size={17}
            className="rotate-180"
          />
        </button>

        <div className="min-w-0 flex-1">
          <h2
            className="
              text-sm
              font-black
              text-ink-900
            "
          >
            Chat settings
          </h2>

          <p
            className="
              truncate
              text-[10px]
              font-semibold
              text-ink-400
            "
          >
            Manage this conversation
          </p>
        </div>

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-primary-50
            text-primary-600
          "
        >
          <Settings2 size={17} />
        </div>
      </div>

      {/* ======================================================
         SETTINGS CONTENT
      ====================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          bg-ink-50
          px-4
          py-5
          sm:px-5
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        <div className="mx-auto max-w-2xl">

          {/* ==================================================
             CONVERSATION
          ================================================== */}

          <section>
            <p
              className="
                mb-2
                px-1
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-ink-400
              "
            >
              Conversation
            </p>

            <div
              className="
                rounded-2xl
                border
                border-ink-200
                bg-white
                p-3
                shadow-xs
              "
            >
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="
                      h-11
                      w-11
                      shrink-0
                      rounded-2xl
                      border
                      border-ink-200
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-primary-100
                      bg-primary-50
                      text-sm
                      font-black
                      text-primary-700
                    "
                  >
                    {getInitials(name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      truncate
                      text-sm
                      font-black
                      text-ink-800
                    "
                  >
                    {name}
                  </p>

                  <p
                    className="
                      mt-0.5
                      truncate
                      text-[10px]
                      font-semibold
                      text-ink-400
                    "
                  >
                    {contextTitle}
                  </p>
                </div>

                {isClosed && (
                  <span
                    className="
                      shrink-0
                      rounded-full
                      border
                      border-ink-200
                      bg-ink-100
                      px-2
                      py-1
                      text-[9px]
                      font-black
                      uppercase
                      tracking-wide
                      text-ink-500
                    "
                  >
                    Closed
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ==================================================
             NOTIFICATIONS
          ================================================== */}

          <section className="mt-6">
            <p
              className="
                mb-2
                px-1
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-ink-400
              "
            >
              Notifications
            </p>

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-ink-200
                bg-white
                shadow-xs
              "
            >
              <button
                type="button"
                onClick={() =>
                  setNotifications(
                    (value) => !value
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  px-4
                  py-3.5
                  text-left
                  transition
                  hover:bg-ink-50
                "
              >
                <div
                  className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${
                      notifications
                        ? 'bg-primary-50 text-primary-600'
                        : 'bg-ink-100 text-ink-400'
                    }
                  `}
                >
                  {notifications ? (
                    <Bell size={16} />
                  ) : (
                    <BellOff size={16} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      text-xs
                      font-black
                      text-ink-800
                    "
                  >
                    Message notifications
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[10px]
                      font-semibold
                      text-ink-400
                    "
                  >
                    {notifications
                      ? 'Notifications are enabled.'
                      : 'Notifications are muted.'}
                  </p>
                </div>

                <div
                  className={`
                    relative
                    h-6
                    w-10
                    shrink-0
                    rounded-full
                    transition
                    ${
                      notifications
                        ? 'bg-primary-600'
                        : 'bg-ink-300'
                    }
                  `}
                >
                  <span
                    className={`
                      absolute
                      top-1
                      h-4
                      w-4
                      rounded-full
                      bg-white
                      shadow-xs
                      transition-transform
                      ${
                        notifications
                          ? 'translate-x-5'
                          : 'translate-x-1'
                      }
                    `}
                  />
                </div>
              </button>
            </div>
          </section>

          {/* ==================================================
             INFORMATION
          ================================================== */}

          <section className="mt-6">
            <p
              className="
                mb-2
                px-1
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-ink-400
              "
            >
              Information
            </p>

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-ink-200
                bg-white
                shadow-xs
              "
            >
              <button
                type="button"
                onClick={() =>
                  setShowInfo(
                    (value) => !value
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  px-4
                  py-3.5
                  text-left
                  transition
                  hover:bg-ink-50
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary-50
                    text-primary-600
                  "
                >
                  <Info size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      text-xs
                      font-black
                      text-ink-800
                    "
                  >
                    Conversation details
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[10px]
                      font-semibold
                      text-ink-400
                    "
                  >
                    View conversation information.
                  </p>
                </div>

                <ChevronRight
                  size={15}
                  className={`
                    shrink-0
                    text-ink-400
                    transition-transform
                    ${
                      showInfo
                        ? 'rotate-90'
                        : ''
                    }
                  `}
                />
              </button>

              {showInfo && (
                <div
                  className="
                    border-t
                    border-ink-200
                    bg-ink-50
                    px-4
                    py-3
                  "
                >
                  <div className="space-y-2.5">
                    <InfoRow
                      label="Conversation ID"
                      value={
                        conversationId ||
                        '—'
                      }
                    />

                    <InfoRow
                      label="Status"
                      value={
                        isClosed
                          ? 'Closed'
                          : 'Active'
                      }
                    />

                    {/* CHANGED: label is now "Item" or "Request" */}
                    <InfoRow
                      label={contextLabel}
                      value={contextTitle}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================
             PRIVACY
          ================================================== */}

          <section className="mt-6">
            <div
              className="
                flex
                gap-3
                rounded-2xl
                border
                border-primary-100
                bg-primary-50
                p-4
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-primary-100
                  bg-white
                  text-primary-600
                  shadow-xs
                "
              >
                <Shield size={16} />
              </div>

              <div>
                <p
                  className="
                    text-xs
                    font-black
                    text-primary-900
                  "
                >
                  Conversation privacy
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    font-medium
                    leading-5
                    text-primary-700
                  "
                >
                  Avoid sharing passwords,
                  payment credentials, or
                  other sensitive information
                  in chat.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4
      "
    >
      <span
        className="
          text-[10px]
          font-bold
          text-ink-400
        "
      >
        {label}
      </span>

      <span
        className="
          max-w-[65%]
          truncate
          text-right
          text-[10px]
          font-black
          text-ink-700
        "
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   MAIN CHAT MODAL
============================================================ */

export default function ChatModal({
  isOpen,
  onClose,
  requestId,
  relationshipId,
  conversationId: directConversationId,
  currentUserId,
  currentUserName,
  otherParticipant,

  /* DTI-only */
  onOpenDetails,
  onViewItem,
  onReinterest,

  /* Shared */
  onReport,
  canCloseConversation = true,
}) {
	
	
	
  /* ==========================================================
     CONVERSATION
  ========================================================== */

  const {
  conversation: loadedConversation,
  conversationId,
  isClosed: chatIsClosed,
  isDeleted,
  loading,
  error,
} = useChat({
  requestId,
  relationshipId,
  conversationId: directConversationId,
  currentUserId,
  otherParticipant,
  enabled: isOpen,
});

  /* ==========================================================
     LOCAL CONVERSATION STATE
  ========================================================== */

  const [
    localConversation,
    setLocalConversation,
  ] = useState(null);

  /* ==========================================================
     SYNC LOADED CONVERSATION
  ========================================================== */

  useEffect(() => {
    if (!loadedConversation) {
      setLocalConversation(null);
      return;
    }

    setLocalConversation(
      loadedConversation
    );
  }, [loadedConversation]);

  /* ==========================================================
     ACTIVE CONVERSATION
  ========================================================== */

  const conversation =
    localConversation ||
    loadedConversation;

  /* ==========================================================
     CLOSED STATE
  ========================================================== */

  const isClosed = localConversation
    ? getConversationClosed(
        localConversation
      )
    : chatIsClosed;

  /* ==========================================================
     OTHER PARTICIPANT
  ========================================================== */

  const other =
    conversation?.otherParticipant ||
    conversation?.other_participant ||
    otherParticipant ||
    null;

  /* ==========================================================
     MESSAGES
  ========================================================== */

  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    error: messagesError,
    hasOlder,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage,

    isMessageDeleting,

    typingUsers,
    onlineUserIds,
    realtimeStatus,
    emitTyping,
    emitTypingStop,
  } = useMessages({
    conversationId,
    currentUserId,
    conversation,
    isDeleted,
    enabled:
      isOpen &&
      !!conversationId &&
      !isDeleted,
  });

  /* ==========================================================
     UI STATE
  ========================================================== */

  const [
    sendError,
    setSendError,
  ] = useState('');

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [
    replyTo,
    setReplyTo,
  ] = useState(null);

  const [
    editing,
    setEditing,
  ] = useState(null);

  /* ==========================================================
     CONVERSATION UPDATED
  ========================================================== */

  const handleConversationUpdated =
    useCallback(
      (updatedConversation) => {
        if (!updatedConversation) {
          return;
        }

        setLocalConversation(
          updatedConversation
        );
      },
      []
    );

  /* ==========================================================
     RESET WHEN CLOSED
  ========================================================== */

  useEffect(() => {
    if (!isOpen) {
      setSettingsOpen(false);
      setSendError('');
      setReplyTo(null);
      setEditing(null);
    }
  }, [isOpen]);

  /* ==========================================================
     RESET WHEN CONVERSATION CHANGES
  ========================================================== */

  useEffect(() => {
    setSendError('');
    setReplyTo(null);
    setEditing(null);
    setSettingsOpen(false);
  }, [conversationId]);

  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const handleSent = useCallback(
    async (payload) => {
      setSendError('');

      try {
        await sendMessage(payload);

        setReplyTo(null);
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to send message.';

        setSendError(message);

        throw err;
      }
    },
    [sendMessage]
  );

  /* ==========================================================
     EDIT MESSAGE
  ========================================================== */

  const handleEdited = useCallback(
    async (
      message,
      content
    ) => {
      if (!message?.id) {
        return;
      }

      setSendError('');

      try {
        await editMessage(
          message.id,
          content
        );

        setEditing(null);
      } catch (err) {
        const messageError =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to edit message.';

        setSendError(
          messageError
        );

        throw err;
      }
    },
    [editMessage]
  );

  /* ==========================================================
     DELETE MESSAGE
  ========================================================== */

  const handleDelete = useCallback(
    async (
      message,
      scope = 'me'
    ) => {
      if (!message?.id) {
        return;
      }

      try {
        await deleteMessage(
          message.id,
          scope
        );
      } catch (err) {
        const messageError =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to delete message.';

        setSendError(
          messageError
        );
      }
    },
    [deleteMessage]
  );

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  const handleClose = useCallback(() => {
    setSettingsOpen(false);
    setSendError('');
    setReplyTo(null);
    setEditing(null);

    onClose?.();
  }, [onClose]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      position="center"
      showCloseButton={false}
      showHandle={false}
      closeOnOutsideClick
      closeOnEscape
						zIndex={999}
      className="
        h-[min(760px,calc(100dvh-2rem))]
        min-h-0
        overflow-hidden
        sm:h-[min(760px,calc(100vh-3rem))]
      "
    >
      <div
        className="
          -mx-5
          -my-5
          flex
          h-[calc(100%+2.5rem)]
          min-h-0
          flex-col
          overflow-hidden
          sm:-mx-6
          sm:-my-6
          sm:h-[calc(100%+3rem)]
        "
      >
        {/* ==================================================
           HEADER
        ================================================== */}

        
								
								
								<ChatHeader
  conversation={conversation}
  other={other}
  requestId={requestId}
  typingUsers={typingUsers}
  onlineUserIds={onlineUserIds}
  realtimeStatus={realtimeStatus}
  onClose={handleClose}
  onOpenSettings={() =>
    setSettingsOpen(true)
  }
  onCloseModal={handleClose}
  onConversationUpdated={
    handleConversationUpdated
  }
  /* DTI-only */
  onOpenDetails={onOpenDetails}
  onViewItem={onViewItem}
  onReinterest={onReinterest}
  /* Shared */
  onReport={onReport}
  canCloseConversation={canCloseConversation}
/>




        {/* ==================================================
           BODY
        ================================================== */}

        <div
          className="
            relative
            flex
            min-h-0
            flex-1
            flex-col
            overflow-hidden
            bg-white
          "
        >
          {/* ==================================================
             SETTINGS
          ================================================== */}

          {settingsOpen && (
            <div
              className="
                absolute
                inset-0
                z-20
                bg-white
              "
            >
              <ChatSettings
                conversation={conversation}
                other={other}
                onClose={() =>
                  setSettingsOpen(false)
                }
              />
            </div>
          )}

          {/* ==================================================
             LOADING
          ================================================== */}

          {loading && (
            <div
              className="
                flex
                min-h-0
                flex-1
                items-center
                justify-center
                bg-ink-50
              "
            >
              <div
                className="
                  flex
                  flex-col
                  items-center
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-primary-100
                    bg-primary-50
                    text-primary-600
                    shadow-xs
                  "
                >
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                </div>

                <p
                  className="
                    mt-3
                    text-xs
                    font-bold
                    text-ink-500
                  "
                >
                  Opening conversation…
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
             ERROR
          ================================================== */}

          {!loading && error && (
            <div
              className="
                flex
                min-h-0
                flex-1
                items-center
                justify-center
                bg-ink-50
                px-5
              "
            >
              <div
                className="
                  w-full
                  max-w-md
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  p-5
                  text-center
                  shadow-xs
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-red-100
                    text-red-600
                  "
                >
                  <Info size={19} />
                </div>

                <p
                  className="
                    mt-3
                    text-sm
                    font-black
                    text-red-700
                  "
                >
                  Couldn't open this
                  conversation
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    font-medium
                    leading-5
                    text-red-600
                  "
                >
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleClose}
                  className="
                    mt-5
                    rounded-xl
                    bg-primary-600
                    px-4
                    py-2.5
                    text-xs
                    font-black
                    text-white
                    transition
                    hover:bg-primary-700
                    active:scale-95
                  "
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ==================================================
             DELETED CONVERSATION
          ================================================== */}

          {!loading &&
            !error &&
            isDeleted && (
              <div
                className="
                  flex
                  min-h-0
                  flex-1
                  items-center
                  justify-center
                  bg-ink-50
                  px-5
                "
              >
                <div
                  className="
                    w-full
                    max-w-md
                    rounded-2xl
                    border
                    border-ink-200
                    bg-white
                    p-6
                    text-center
                    shadow-xs
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-ink-100
                      text-ink-500
                    "
                  >
                    <Info size={20} />
                  </div>

                  <h3
                    className="
                      mt-4
                      text-sm
                      font-black
                      text-ink-900
                    "
                  >
                    Conversation unavailable
                  </h3>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-medium
                      leading-5
                      text-ink-500
                    "
                  >
                    This conversation has
                    been deleted from your
                    chats.
                  </p>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="
                      mt-5
                      rounded-xl
                      bg-primary-600
                      px-4
                      py-2.5
                      text-xs
                      font-black
                      text-white
                      transition
                      hover:bg-primary-700
                      active:scale-95
                    "
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          {/* ==================================================
             ACTIVE CHAT
          ================================================== */}

          {!loading &&
            !error &&
            !isDeleted &&
            conversationId && (
              <div
                className="
                  flex
                  min-h-0
                  flex-1
                  flex-col
                "
              >
                <MessageList
                  messages={messages}
                  loading={messagesLoading}
                  loadingMore={loadingMore}
                  hasOlder={hasOlder}
                  onLoadOlder={loadOlder}
                  currentUserId={
                    currentUserId
                  }
                  other={other}
                  typingUsers={
                    typingUsers
                  }
                  isDeletingMessage={
                    isMessageDeleting
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

                {messagesError && (
                  <div
                    className="
                      shrink-0
                      border-t
                      border-red-100
                      bg-red-50
                      px-4
                      py-2
                      text-center
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-bold
                        text-red-600
                      "
                    >
                      {messagesError}
                    </p>
                  </div>
                )}

                {sendError && (
                  <div
                    className="
                      flex
                      shrink-0
                      items-center
                      justify-between
                      gap-3
                      border-t
                      border-red-100
                      bg-red-50
                      px-4
                      py-2
                    "
                  >
                    <p
                      className="
                        min-w-0
                        text-[10px]
                        font-bold
                        text-red-600
                      "
                    >
                      {sendError}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setSendError('')
                      }
                      className="
                        shrink-0
                        rounded-lg
                        px-2
                        py-1
                        text-[10px]
                        font-black
                        text-red-600
                        transition
                        hover:bg-red-100
                      "
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <MessageComposer
                  conversationId={
                    conversationId
                  }
                  isClosed={isClosed}
                  replyTo={replyTo}
                  editing={editing}
                  currentUserName={
                    currentUserName
                  }
                  onCancelReply={() =>
                    setReplyTo(null)
                  }
                  onCancelEdit={() =>
                    setEditing(null)
                  }
                  onSent={handleSent}
                  onEdited={handleEdited}
                  onError={setSendError}
                  onTyping={emitTyping}
                  onTypingStop={
                    emitTypingStop
                  }
                />
              </div>
            )}

          {/* ==================================================
             NO CONVERSATION
          ================================================== */}

          {!loading &&
            !error &&
            !isDeleted &&
            !conversationId && (
              <div
                className="
                  flex
                  min-h-0
                  flex-1
                  items-center
                  justify-center
                  bg-ink-50
                  px-5
                "
              >
                <div
                  className="
                    w-full
                    max-w-md
                    rounded-2xl
                    border
                    border-ink-200
                    bg-white
                    p-6
                    text-center
                    shadow-xs
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-ink-100
                      text-ink-500
                    "
                  >
                    <Info size={20} />
                  </div>

                  <h3
                    className="
                      mt-4
                      text-sm
                      font-black
                      text-ink-900
                    "
                  >
                    Conversation unavailable
                  </h3>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-medium
                      leading-5
                      text-ink-500
                    "
                  >
                    There is no conversation
                    available to open.
                  </p>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="
                      mt-5
                      rounded-xl
                      bg-primary-600
                      px-4
                      py-2.5
                      text-xs
                      font-black
                      text-white
                      transition
                      hover:bg-primary-700
                      active:scale-95
                    "
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </Modal>
  );
}