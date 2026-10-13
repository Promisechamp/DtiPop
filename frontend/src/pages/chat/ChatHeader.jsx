import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  ChevronLeft,
  Flag,
  Info,
  Loader2,
  Maximize2,
  MoreVertical,
  Package,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Settings2,
  MessageCircleOff,
  X,
} from 'lucide-react';

import { toast } from 'sonner';

import { chatAPI } from '@/services/api/sharedApi';

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
  profile?.avatar ||
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
   CHAT HEADER
============================================================ */

export default function ChatHeader({
  conversation,
  other,
  requestId,
  typingUsers = [],
  onlineUserIds = [],
  realtimeStatus = 'connecting',

  onBack,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onClose,
  onCloseModal,
  onSearch,
  onOpenSettings,

  /* DTI-only */
  onOpenDetails,
  onViewItem,
  onReinterest,

  /* Shared */
  onReport,
  canCloseConversation = true,

  onConversationUpdated,
  showExpand = true,
}) {
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ==========================================================
     CONVERSATION
  ========================================================== */

  const conversationId = getConversationId(conversation);
  const isClosed = getConversationClosed(conversation);

  const participant =
    other ||
    conversation?.otherParticipant ||
    conversation?.other_participant ||
    conversation?.provider ||
    conversation?.requester ||
    null;

  const participantName = getParticipantName(participant);
  const avatarUrl = getAvatarUrl(participant);

  const typing =
    Array.isArray(typingUsers) && typingUsers.length > 0;

  /* ==========================================================
     ONLINE STATUS
  ========================================================== */

  const participantId =
    participant?.id ||
    participant?.user_id ||
    participant?.userId ||
    null;

  const isOnline =
    participantId && Array.isArray(onlineUserIds)
      ? onlineUserIds.some(
          (id) => String(id) === String(participantId)
        )
      : false;

  /* ==========================================================
     REALTIME STATUS
  ========================================================== */

  const realtimeLabel =
    realtimeStatus === 'connected'
      ? 'Live'
      : realtimeStatus === 'connecting'
      ? 'Connecting…'
      : 'Offline';

  /* ==========================================================
     CLOSE MENU WHEN CLICKING OUTSIDE
  ========================================================== */

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  /* ==========================================================
     CLOSE / REOPEN CONVERSATION
  ========================================================== */

  const handleConversationCloseAction = useCallback(
    async (action) => {
      if (!conversationId) {
        toast.error('Conversation not available.');
        return;
      }

      if (busy) return;

      setBusy(true);
      setMenuOpen(false);

      try {
        let response;

        if (action === 'reopen') {
          response = await chatAPI.reopenConversation(conversationId);
          toast.success('Conversation reopened.');
        } else {
          response = await chatAPI.closeConversation(
            conversationId,
            action
          );
          toast.success('Conversation closed.');
        }

        const updatedConversation =
          response?.data?.conversation ||
          response?.conversation ||
          null;

        if (updatedConversation) {
          onConversationUpdated?.(updatedConversation);
        } else {
          onConversationUpdated?.();
        }
      } catch (error) {
        console.error('Conversation close/reopen failed:', error);

        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          (action === 'reopen'
            ? 'Could not reopen conversation.'
            : 'Could not close conversation.');

        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [conversationId, busy, onConversationUpdated]
  );

  /* ==========================================================
     MENU ACTIONS
  ========================================================== */

  const handlePin = useCallback(() => {
    setMenuOpen(false);
    onTogglePin?.();
  }, [onTogglePin]);

  const handleMute = useCallback(() => {
    setMenuOpen(false);
    onToggleMute?.();
  }, [onToggleMute]);

  const handleArchive = useCallback(() => {
    setMenuOpen(false);
    onToggleArchive?.();
  }, [onToggleArchive]);

  const handleSearch = useCallback(() => {
    setMenuOpen(false);
    onSearch?.();
  }, [onSearch]);

  const handleSettings = useCallback(() => {
    setMenuOpen(false);
    onOpenSettings?.();
  }, [onOpenSettings]);

  const handleOpenDetails = useCallback(() => {
    setMenuOpen(false);
    onOpenDetails?.(conversation);
  }, [onOpenDetails, conversation]);

  const handleViewItem = useCallback(() => {
    setMenuOpen(false);
    onViewItem?.(conversation);
  }, [onViewItem, conversation]);

  const handleReinterest = useCallback(() => {
    setMenuOpen(false);
    onReinterest?.(conversation);
  }, [onReinterest, conversation]);

  const handleReport = useCallback(() => {
    setMenuOpen(false);
    onReport?.(conversation);
  }, [onReport, conversation]);

  const handleExpand = useCallback(() => {
    setMenuOpen(false);

    if (!conversationId) {
      toast.error('Conversation not available.');
      return;
    }

    navigate(
      `/popchat?conversation=${encodeURIComponent(conversationId)}`
    );
  }, [conversationId, navigate]);

  /* ==========================================================
     BACK
  ========================================================== */

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    onCloseModal?.();
  }, [onBack, onCloseModal]);

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  const handleClose = useCallback(() => {
    if (onCloseModal) {
      onCloseModal();
      return;
    }
    onClose?.();
  }, [onCloseModal, onClose]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <header
      className="
        relative
        z-30
        shrink-0
        border-b border-ink-200
        bg-white
      "
    >
      <div
        className="
          flex
          min-h-[68px]
          items-center
          gap-2
          px-3
          py-2
          sm:px-4
        "
      >
        {/* BACK */}
        <button
          type="button"
          onClick={handleBack}
          className="
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-xl text-ink-500 transition
            hover:bg-ink-50 hover:text-ink-900 active:scale-95
          "
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={2.3} />
        </button>

        {/* AVATAR */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="
                h-10 w-10 rounded-2xl border border-ink-200 object-cover
              "
            />
          ) : (
            <div
              className="
                flex h-10 w-10 items-center justify-center
                rounded-2xl bg-primary-50 text-xs font-black text-primary-700
              "
            >
              {getInitials(participantName)}
            </div>
          )}

          {isOnline && (
            <span
              className="
                absolute bottom-0 right-0 h-3 w-3 rounded-full
                border-2 border-white bg-emerald-500
              "
            />
          )}
        </div>

        {/* PARTICIPANT INFO */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="
                min-w-0 truncate text-sm font-black text-ink-900
              "
            >
              {participantName}
            </h2>

            {isClosed && (
              <span
                className="
                  shrink-0 rounded-full bg-amber-50 px-2 py-0.5
                  text-[8px] font-black uppercase tracking-wide text-amber-700
                "
              >
                Closed
              </span>
            )}
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {typing ? (
              <span
                className="
                  truncate text-[10px] font-bold text-primary-600
                "
              >
                Typing…
              </span>
            ) : isOnline ? (
              <span
                className="
                  truncate text-[10px] font-bold text-emerald-600
                "
              >
                Online
              </span>
            ) : (
              <span
                className="
                  truncate text-[10px] font-semibold text-ink-500
                "
              >
                {realtimeLabel}
              </span>
            )}

            {realtimeStatus === 'connected' && (
              <>
                <span className="text-ink-300">•</span>
                <span
                  className="
                    truncate text-[10px] font-semibold text-ink-400
                  "
                >
                  Private chat
                </span>
              </>
            )}
          </div>
        </div>

        {/* SEARCH */}
        {onSearch && (
          <button
            type="button"
            onClick={handleSearch}
            className="
              hidden h-9 w-9 shrink-0 items-center justify-center
              rounded-xl text-ink-500 transition
              hover:bg-ink-50 hover:text-ink-900 active:scale-95
              sm:flex
            "
            aria-label="Search messages"
          >
            <Search size={17} strokeWidth={2.2} />
          </button>
        )}

        {/* SETTINGS */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={handleSettings}
            className="
              hidden h-9 w-9 shrink-0 items-center justify-center
              rounded-xl text-ink-500 transition
              hover:bg-ink-50 hover:text-ink-900 active:scale-95
              sm:flex
            "
            aria-label="Conversation settings"
          >
            <Settings2 size={17} strokeWidth={2.2} />
          </button>
        )}

        {/* MENU */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl text-ink-500 transition
              hover:bg-ink-50 hover:text-ink-900 active:scale-95
            "
            aria-label="Conversation actions"
            aria-expanded={menuOpen}
          >
            {busy ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <MoreVertical size={18} strokeWidth={2.2} />
            )}
          </button>

          {menuOpen && (
            <div
              className="
                absolute right-0 top-[calc(100%+8px)] z-50 w-56
                overflow-hidden rounded-2xl border border-ink-200
                bg-white p-1.5 shadow-actionMenu
              "
            >
              {onSearch && (
                <button
                  type="button"
                  onClick={handleSearch}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <Search size={16} />
                  <span>Search messages</span>
                </button>
              )}

              {onTogglePin && (
                <button
                  type="button"
                  onClick={handlePin}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  {conversation?.isPinned ? (
                    <PinOff size={16} />
                  ) : (
                    <Pin size={16} />
                  )}
                  <span>
                    {conversation?.isPinned
                      ? 'Unpin conversation'
                      : 'Pin conversation'}
                  </span>
                </button>
              )}

              {onToggleMute && (
                <button
                  type="button"
                  onClick={handleMute}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  {conversation?.isMuted ? (
                    <Bell size={16} />
                  ) : (
                    <BellOff size={16} />
                  )}
                  <span>
                    {conversation?.isMuted
                      ? 'Unmute conversation'
                      : 'Mute conversation'}
                  </span>
                </button>
              )}

              {onToggleArchive && (
                <button
                  type="button"
                  onClick={handleArchive}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  {conversation?.isArchived ? (
                    <ArchiveRestore size={16} />
                  ) : (
                    <Archive size={16} />
                  )}
                  <span>
                    {conversation?.isArchived
                      ? 'Unarchive conversation'
                      : 'Archive conversation'}
                  </span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={handleSettings}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <Settings2 size={16} />
                  <span>Conversation settings</span>
                </button>
              )}

              {/* ============================================
                 ITEM CONTEXT ACTIONS (DTI)
              ============================================ */}

              {onOpenDetails && (
                <button
                  type="button"
                  onClick={handleOpenDetails}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <Info size={16} />
                  <span>Item details</span>
                </button>
              )}

              {onViewItem && (
                <button
                  type="button"
                  onClick={handleViewItem}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <Package size={16} />
                  <span>View item</span>
                </button>
              )}

              {onReinterest && !isClosed && (
                <button
                  type="button"
                  onClick={handleReinterest}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <RefreshCw size={16} />
                  <span>Re-declare interest</span>
                </button>
              )}

              {showExpand && (
                <button
                  type="button"
                  onClick={handleExpand}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <Maximize2 size={16} />
                  <span>Open full chat</span>
                </button>
              )}

              {/* ============================================
                 DESTRUCTIVE / CLOSE ACTIONS
              ============================================ */}

              {onReport && !isClosed && (
                <>
                  <div className="my-1 border-t border-ink-100" />
                  <button
                    type="button"
                    onClick={handleReport}
                    className="
                      flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                      text-left text-xs font-bold text-rose-600 transition
                      hover:bg-rose-50
                    "
                  >
                    <Flag size={16} />
                    <span>Report chat</span>
                  </button>
                </>
              )}

              {conversationId && canCloseConversation && (
                <>
                  <div className="my-1 border-t border-ink-100" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleConversationCloseAction(
                        isClosed ? 'reopen' : 'closed'
                      )
                    }
                    className={`
                      flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                      text-left text-xs font-bold transition
                      disabled:cursor-not-allowed disabled:opacity-50
                      ${
                        isClosed
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-amber-700 hover:bg-amber-50'
                      }
                    `}
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isClosed ? (
                      <ArchiveRestore size={16} />
                    ) : (
                      <MessageCircleOff size={16} />
                    )}
                    <span>
                      {isClosed ? 'Reopen chat' : 'Close chat'}
                    </span>
                  </button>
                </>
              )}

              {pathname !== '/popchat' && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-xs font-bold text-ink-700 transition
                    hover:bg-ink-50
                  "
                >
                  <X size={16} />
                  <span>Close window</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}