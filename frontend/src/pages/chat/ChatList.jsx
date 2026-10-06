import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  Bell,
  Check,
  Loader2,
  MoreVertical,
  Pin,
  PinOff,
  Search,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import Modal from "@/reusables/Modal";

/* =========================================================
   HELPERS
========================================================= */

const getId = (value) =>
  value?.id ??
  value?.user_id ??
  value?.userId ??
  null;

const toId = (value) =>
  value == null ? null : String(value);

const getName = (person) =>
  person?.full_name ||
  person?.name ||
  person?.username ||
  person?.display_name ||
  person?.displayName ||
  "Community member";

const getAvatar = (person) =>
  person?.avatar_url ||
  person?.avatarUrl ||
  person?.avatar ||
  person?.profile?.avatar_url ||
  person?.profile?.avatarUrl ||
  null;

const getInitials = (name) => {
  const value = String(name || "").trim();

  if (!value) return "?";

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getRequest = (conversation) =>
  conversation?.request ||
  conversation?.pop_request ||
  conversation?.requestData ||
  null;

const getRequestId = (conversation) =>
  conversation?.requestId ||
  conversation?.request_id ||
  getRequest(conversation)?.id ||
  getRequest(conversation)?.request_id ||
  null;

const getRequestTitle = (conversation) => {
  const request = getRequest(conversation);

  return (
    request?.title ||
    request?.name ||
    request?.item_name ||
    request?.itemName ||
    conversation?.requestTitle ||
    conversation?.request_title ||
    null
  );
};

const getRequestStatus = (conversation) => {
  const request = getRequest(conversation);

  return String(
    request?.status ||
      conversation?.requestStatus ||
      conversation?.request_status ||
      ""
  ).toLowerCase();
};

const getLastMessage = (conversation) =>
  conversation?.lastMessage ||
  conversation?.last_message ||
  null;

const getLastMessageText = (conversation) => {
  const message = getLastMessage(conversation);

  if (typeof message === "string") {
    return message;
  }

  return (
    message?.content ||
    message?.text ||
    message?.message ||
    ""
  );
};

const getLastMessageTime = (conversation) =>
  conversation?.lastMessageAt ||
  conversation?.last_message_at ||
  conversation?.updatedAt ||
  conversation?.updated_at ||
  null;

const getUnreadCount = (conversation) =>
  Number(
    conversation?.unreadCount ??
      conversation?.unread_count ??
      0
  );

const getOtherParticipant = (conversation) =>
  conversation?.otherParticipant ||
  conversation?.other_participant ||
  conversation?.participant ||
  conversation?.other ||
  conversation?.user ||
  null;

const getConversationId = (conversation) =>
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;

const isConversationPinned = (conversation) =>
  Boolean(
    conversation?.isPinned ??
      conversation?.is_pinned ??
      false
  );

const isConversationMuted = (conversation) =>
  Boolean(
    conversation?.isMuted ??
      conversation?.is_muted ??
      false
  );

const isConversationArchived = (conversation) =>
  Boolean(
    conversation?.isArchived ??
      conversation?.is_archived ??
      false
  );

const isConversationClosed = (conversation) =>
  Boolean(
    conversation?.isClosed ??
      conversation?.is_closed ??
      false
  );

/* =========================================================
   ROLE / PROVIDER HELPERS
========================================================= */

const getConversationRelationship =
  (conversation) =>
    conversation?.providerRelationship ||
    conversation?.provider_relationship ||
    conversation?.relationship ||
    conversation?.provider_relationships?.[0] ||
    null;

const getProviderId = (conversation) => {
  const relationship =
    getConversationRelationship(
      conversation
    );

  return (
    conversation?.providerId ||
    conversation?.provider_id ||
    relationship?.providerId ||
    relationship?.provider_id ||
    relationship?.user_id ||
    relationship?.provider?.id ||
    null
  );
};

const getRequesterId = (conversation) => {
  const request = getRequest(conversation);
  const relationship =
    getConversationRelationship(
      conversation
    );

  return (
    conversation?.requesterId ||
    conversation?.requester_id ||
    request?.user_id ||
    request?.userId ||
    relationship?.requesterId ||
    relationship?.requester_id ||
    relationship?.requester?.id ||
    null
  );
};

const isProviderParticipant = (
  conversation,
  currentUserId
) => {
  const currentId = toId(currentUserId);

  if (!currentId) return false;

  const providerId = toId(
    getProviderId(conversation)
  );

  return (
    providerId != null &&
    providerId === currentId
  );
};

const isRequesterParticipant = (
  conversation,
  currentUserId
) => {
  const currentId = toId(currentUserId);

  if (!currentId) return false;

  const requesterId = toId(
    getRequesterId(conversation)
  );

  return (
    requesterId != null &&
    requesterId === currentId
  );
};

const canAssignProviderToConversation = (
  conversation,
  currentUserId
) => {
  const requestId =
    getRequestId(conversation);

  const status =
    getRequestStatus(conversation);

  if (!requestId) return false;

  if (status !== "open") return false;

  /*
   * Providers must never see Assign provider.
   */
  if (
    isProviderParticipant(
      conversation,
      currentUserId
    )
  ) {
    return false;
  }

  /*
   * Only the requester can assign.
   */
  if (
    !isRequesterParticipant(
      conversation,
      currentUserId
    )
  ) {
    return false;
  }

  return true;
};

/* =========================================================
   DATE
========================================================= */

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

/* =========================================================
   ACTION MENU (portaled to body so the sidebar's overflow
   container can no longer clip the dropdown)
========================================================= */

const ChatActionMenu = memo(function ChatActionMenu({
  conversation,
  currentUserId,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
  onDelete,
  onAssignProvider,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [menuPos, setMenuPos] = useState(null);

  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const pinned = isConversationPinned(conversation);
  const archived = isConversationArchived(conversation);
  const muted = isConversationMuted(conversation);

  const canAssign = canAssignProviderToConversation(
    conversation,
    currentUserId
  );

  /* ---------------------------------------------------------
     POSITION MENU FROM THE TRIGGER BUTTON
  --------------------------------------------------------- */

  const openMenu = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuWidth = 224; // w-56
    const margin = 8;
    const menuHeight = 320; // conservative estimate for 5 items

    // Right-align to the button, clamped inside the viewport
    let right = window.innerWidth - rect.right;
    if (right < margin) right = margin;

    // Default: below the button
    let top = rect.bottom + 6;

    // If it would overflow the bottom, open upward
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - menuHeight - 6);
    }

    setMenuPos({ top, right, width: menuWidth });
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuPos(null);
  }, []);

  /* ---------------------------------------------------------
     OUTSIDE CLICK + SCROLL + ESCAPE + RESIZE
  --------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutside = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleKey = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    // Close on scroll/resize so the menu never floats detached
    const handleScrollOrResize = () => closeMenu();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, {
      passive: true,
    });
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen, closeMenu]);

  /* ---------------------------------------------------------
     ACTIONS
  --------------------------------------------------------- */

  const runAction = async (action, callback) => {
    if (!callback || busyAction) return;

    try {
      setBusyAction(action);
      await callback(conversation);
      closeMenu();
    } finally {
      setBusyAction(null);
    }
  };

  const handleAssign = async () => {
    if (!onAssignProvider || !canAssign) return;
    closeMenu();
    await onAssignProvider(conversation);
  };

  const handleDelete = async () => {
    if (!onDelete || busyAction) return;
    closeMenu();
    await onDelete(conversation);
  };

  /* ---------------------------------------------------------
     MENU (portaled)
  --------------------------------------------------------- */

  const menu =
    menuOpen && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              width: menuPos.width,
              zIndex: 2147483647,
            }}
            className="
              overflow-hidden
              rounded-2xl
              border
              border-ink-200
              bg-white
              p-1.5
              shadow-actionMenu
            "
            onClick={(event) => event.stopPropagation()}
          >
            {canAssign && onAssignProvider && (
              <button
                type="button"
                onClick={handleAssign}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-bold
                  text-ink-700
                  transition
                  hover:bg-primary-50
                  hover:text-primary-700
                "
              >
                <UserCheck size={17} />
                <span>Assign provider</span>
              </button>
            )}

            {onTogglePin && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  runAction("pin", () =>
                    onTogglePin(
                      getConversationId(conversation),
                      !pinned
                    )
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-bold
                  text-ink-700
                  transition
                  hover:bg-ink-100
                  disabled:opacity-50
                "
              >
                {pinned ? <PinOff size={17} /> : <Pin size={17} />}
                <span>
                  {pinned ? "Unpin conversation" : "Pin conversation"}
                </span>
              </button>
            )}

            {onToggleMute && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  runAction("mute", () =>
                    onToggleMute(
                      getConversationId(conversation),
                      !muted
                    )
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-bold
                  text-ink-700
                  transition
                  hover:bg-ink-100
                  disabled:opacity-50
                "
              >
                {muted ? <Bell size={17} /> : <BellOff size={17} />}
                <span>
                  {muted ? "Unmute conversation" : "Mute conversation"}
                </span>
              </button>
            )}

            {onToggleArchive && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  runAction("archive", () =>
                    onToggleArchive(
                      getConversationId(conversation),
                      !archived
                    )
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-bold
                  text-ink-700
                  transition
                  hover:bg-ink-100
                  disabled:opacity-50
                "
              >
                {archived ? (
                  <ArchiveRestore size={17} />
                ) : (
                  <Archive size={17} />
                )}
                <span>{archived ? "Unarchive" : "Archive"}</span>
              </button>
            )}

            <div className="my-1 border-t border-ink-100" />

            {onDelete && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={handleDelete}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-bold
                  text-red-600
                  transition
                  hover:bg-red-50
                  disabled:opacity-50
                "
              >
                <Trash2 size={17} />
                <span>Delete conversation</span>
              </button>
            )}
          </div>,
          document.body
        )
      : null;

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${getName(
          getOtherParticipant(conversation)
        )}`}
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (menuOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-xl
          border
          transition-all
          duration-150
          ${
            menuOpen
              ? "border-ink-200 bg-ink-100 text-ink-800"
              : "border-transparent bg-white text-ink-400 hover:border-ink-200 hover:bg-ink-100 hover:text-ink-800"
          }
        `}
      >
        {busyAction ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <MoreVertical size={17} strokeWidth={2.5} />
        )}
      </button>

      {menu}
    </>
  );
});

/* =========================================================
   DELETE CONFIRMATION
========================================================= */

const DeleteConversationDialog = ({
  conversation,
  isOpen,
  loading,
  onClose,
  onConfirm,
}) => {
  if (typeof document === "undefined") {
    return null;
  }

  const participant = getOtherParticipant(conversation);
  const name = getName(participant);
  const requestTitle = getRequestTitle(conversation);

  const modal = (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title="Delete conversation"
      subtitle="This action cannot be undone"
      size="sm"
      position="bottom"
      zIndex={99999}
      showHandle={false}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="space-y-5">
        <div
          className="
            flex
            items-start
            gap-3
            rounded-2xl
            border
            border-red-100
            bg-red-50
            p-4
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-red-100
              text-red-600
            "
          >
            <Trash2 size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black text-ink-900">
              Delete this conversation?
            </p>

            <p className="mt-1 text-sm leading-5 text-ink-500">
              The conversation with{" "}
              <span className="font-bold text-ink-700">
                {name}
              </span>{" "}
              will be removed from your conversation list.
            </p>
          </div>
        </div>

        {requestTitle && (
          <div
            className="
              rounded-2xl
              border
              border-ink-100
              bg-ink-50
              px-4
              py-3
            "
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
              Request
            </p>

            <p className="mt-1 truncate text-sm font-bold text-ink-800">
              {requestTitle}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              flex-1
              rounded-xl
              border
              border-ink-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-black
              text-ink-700
              transition
              hover:bg-ink-50
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="
              flex
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-red-600
              px-4
              py-2.5
              text-sm
              font-black
              text-white
              transition
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading && (
              <Loader2 size={16} className="animate-spin" />
            )}

            Delete
          </button>
        </div>
      </div>
    </Modal>
  );

  return createPortal(modal, document.body);
};

/* =========================================================
   ASSIGN PROVIDER DIALOG
========================================================= */

const AssignProviderDialog = ({
  conversation,
  isOpen,
  onClose,
  onAssignProvider,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!onAssignProvider || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onAssignProvider(conversation);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to assign provider."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  if (typeof document === "undefined") {
    return null;
  }

  const participant = getOtherParticipant(conversation);
  const providerName = getName(participant);
  const requestTitle = getRequestTitle(conversation);

  const modal = (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title="Assign provider"
      subtitle="Request provider"
      size="sm"
      position="bottom"
      zIndex={99999}
      showHandle={false}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="space-y-5">
        <div
          className="
            rounded-2xl
            border
            border-primary-100
            bg-primary-50
            p-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                bg-white
                font-black
                text-primary-600
                shadow-xs
              "
            >
              {getAvatar(participant) ? (
                <img
                  src={getAvatar(participant)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(providerName)
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-primary-500">
                Provider
              </p>

              <p className="truncate text-sm font-black text-ink-900">
                {providerName}
              </p>
            </div>
          </div>
        </div>

        {requestTitle && (
          <div
            className="
              rounded-2xl
              border
              border-ink-100
              bg-ink-50
              px-4
              py-3
            "
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-400">
              Request
            </p>

            <p className="mt-1 text-sm font-bold text-ink-800">
              {requestTitle}
            </p>
          </div>
        )}

        <p className="text-sm leading-5 text-ink-500">
          Assign this provider to the request. The request must still be
          open.
        </p>

        {error && (
          <div
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-3
              py-2.5
              text-sm
              font-semibold
              text-red-600
            "
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              flex-1
              rounded-xl
              border
              border-ink-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-black
              text-ink-700
              transition
              hover:bg-ink-50
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading || !onAssignProvider}
            onClick={handleAssign}
            className="
              flex
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-primary-600
              px-4
              py-2.5
              text-sm
              font-black
              text-white
              transition
              hover:bg-primary-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}

            Assign
          </button>
        </div>
      </div>
    </Modal>
  );

  return createPortal(modal, document.body);
};

/* =========================================================
   CHAT LIST ITEM
========================================================= */

const ChatListItem = memo(function ChatListItem({
  conversation,
  currentUserId,
  selected,
  onSelect,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onDelete,
  onAssignProvider,
}) {
  const participant = getOtherParticipant(conversation);
  const name = getName(participant);
  const avatar = getAvatar(participant);
  const requestTitle = getRequestTitle(conversation);
  const lastMessage = getLastMessageText(conversation);
  const lastMessageTime = getLastMessageTime(conversation);
  const unread = getUnreadCount(conversation);
  const pinned = isConversationPinned(conversation);
  const muted = isConversationMuted(conversation);
  const closed = isConversationClosed(conversation);

  const handleActivate = useCallback(
    (event) => {
      // Ignore clicks coming from the action menu or any nested
      // interactive element.
      const target = event?.target;

      if (
        target?.closest &&
        target.closest("[data-row-action]")
      ) {
        return;
      }

      onSelect?.(conversation);
    },
    [onSelect, conversation]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.(conversation);
      }
    },
    [onSelect, conversation]
  );

  return (
    /*
     * IMPORTANT:
     * This used to be a <button>. Nested interactive elements
     * (the action menu button, the pin/archive/mute actions)
     * are illegal inside a <button>, which triggered:
     *   "validateDOMNesting(...): <button> cannot appear as a
     *    descendant of <button>"
     *
     * A <div role="button" tabIndex={0}> preserves all the
     * accessibility and click semantics without nesting.
     */
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={`
        group
        relative
        flex
        w-full
        cursor-pointer
        items-center
        gap-3
        border-b
        border-ink-100
        px-3
        py-3
        pr-12
        text-left
        outline-none
        transition-colors
        focus-visible:ring-2
        focus-visible:ring-primary-400
        focus-visible:ring-inset
        ${
          selected
            ? "bg-primary-50"
            : "bg-white hover:bg-ink-50"
        }
      `}
    >
      {/* =====================================================
          AVATAR
      ===================================================== */}

      <div
        className="
          relative
          h-12
          w-12
          shrink-0
          overflow-hidden
          rounded-2xl
          bg-ink-100
        "
      >
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              text-sm
              font-black
              text-ink-500
            "
          >
            {getInitials(name)}
          </div>
        )}

        {unread > 0 && (
          <span
            className="
              absolute
              bottom-0.5
              right-0.5
              h-2.5
              w-2.5
              rounded-full
              border-2
              border-white
              bg-primary-600
            "
          />
        )}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={`
              min-w-0
              flex-1
              truncate
              text-sm
              ${
                unread > 0
                  ? "font-black text-ink-950"
                  : "font-bold text-ink-800"
              }
            `}
          >
            {name}
          </p>

          {lastMessageTime && (
            <span
              className={`
                shrink-0
                text-[10px]
                font-semibold
                ${
                  unread > 0
                    ? "text-primary-600"
                    : "text-ink-400"
                }
              `}
            >
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>

        {requestTitle && (
          <p
            className="
              mt-0.5
              truncate
              text-[11px]
              font-bold
              text-primary-600
            "
          >
            {requestTitle}
          </p>
        )}

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {pinned && (
            <Pin
              size={11}
              className="shrink-0 text-primary-500"
            />
          )}

          {muted && (
            <span className="shrink-0 text-[10px] text-ink-400">
              Muted
            </span>
          )}

          {closed && (
            <span className="shrink-0 text-[10px] font-bold text-ink-400">
              Closed
            </span>
          )}

          <p
            className={`
              min-w-0
              flex-1
              truncate
              text-xs
              ${
                unread > 0
                  ? "font-semibold text-ink-700"
                  : "text-ink-400"
              }
            `}
          >
            {lastMessage || "No messages yet"}
          </p>
        </div>
      </div>

      {/* =====================================================
          UNREAD
      ===================================================== */}

      {unread > 0 && (
        <span
          className="
            absolute
            bottom-3
            right-12
            flex
            min-h-5
            min-w-5
            items-center
            justify-center
            rounded-full
            bg-primary-600
            px-1.5
            text-[10px]
            font-black
            text-white
          "
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}

      {/* =====================================================
          ACTION MENU
          -----------------------------------------------------
          data-row-action marks the subtree so the parent row's
          click handler can ignore clicks that originate here.
      ===================================================== */}

      <div
        data-row-action
        className="
          absolute
          right-2
          top-1/2
          z-30
          -translate-y-1/2
        "
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <ChatActionMenu
          conversation={conversation}
          currentUserId={currentUserId}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
          onAssignProvider={onAssignProvider}
        />
      </div>
    </div>
  );
});

/* =========================================================
   MAIN CHAT LIST
========================================================= */

const ChatList = ({
  conversations = [],
  loading = false,
  error = null,
  selectedId = null,
  currentUserId = null,

  onSelect,
  onRetry,

  onTogglePin,
  onToggleMute,
  onToggleArchive,

  onDeleteConversation,
  onAssignProvider,
}) => {
  const [deleteConversation, setDeleteConversation] = useState(null);
  const [assignConversation, setAssignConversation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  /* =======================================================
     FILTERED LIST
  ======================================================= */

  const filteredConversations = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const participant = getOtherParticipant(conversation);
      const name = getName(participant);
      const requestTitle = getRequestTitle(conversation);
      const message = getLastMessageText(conversation);

      return [name, requestTitle, message]
        .filter(Boolean)
        .some((text) =>
          String(text).toLowerCase().includes(value)
        );
    });
  }, [conversations, search]);

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDeleteRequest = useCallback((conversation) => {
    setDeleteConversation(conversation);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (
      !deleteConversation ||
      !onDeleteConversation ||
      deleteLoading
    ) {
      return;
    }

    try {
      setDeleteLoading(true);
      await onDeleteConversation(deleteConversation);
      setDeleteConversation(null);
    } catch {
      /*
       * Parent handles/display errors.
       * Keep dialog open when deletion fails.
       */
    } finally {
      setDeleteLoading(false);
    }
  }, [
    deleteConversation,
    onDeleteConversation,
    deleteLoading,
  ]);

  /* =======================================================
     ASSIGN
  ======================================================= */

  const handleAssignRequest = useCallback(
    async (conversation) => {
      if (!onAssignProvider) {
        return;
      }

      await onAssignProvider(conversation);
    },
    [onAssignProvider]
  );

  /* =======================================================
     SEARCH ESCAPE
  ======================================================= */

  useEffect(() => {
    if (!searchOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () =>
      document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        flex
        min-h-0
        flex-1
        flex-col
        overflow-hidden
        bg-white
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          flex
          shrink-0
          items-center
          gap-2
          border-b
          border-ink-100
          bg-white
          px-3
          py-3
        "
      >
        {searchOpen ? (
          <div
            className="
              flex
              min-w-0
              flex-1
              items-center
              gap-2
              rounded-xl
              border
              border-ink-200
              bg-ink-50
              px-3
            "
          >
            <Search
              size={16}
              className="shrink-0 text-ink-400"
            />

            <input
              autoFocus
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search conversations"
              className="
                min-w-0
                flex-1
                bg-transparent
                py-2
                text-sm
                font-semibold
                text-ink-900
                outline-none
                placeholder:text-ink-400
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  text-ink-400
                  hover:bg-white
                  hover:text-ink-700
                "
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearch("");
              }}
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                text-ink-400
                hover:bg-white
                hover:text-ink-700
              "
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-black text-ink-900">
                Chats
              </h2>

              <p className="text-[10px] font-semibold text-ink-400">
                {filteredConversations.length}{" "}
                conversation
                {filteredConversations.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              aria-label="Search conversations"
              onClick={() => setSearchOpen(true)}
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
                hover:text-primary-600
              "
            >
              <Search size={18} />
            </button>
          </>
        )}
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !loading && (
        <div className="shrink-0 px-3 pt-3">
          <div
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-3
              py-2.5
            "
          >
            <p className="text-xs font-semibold text-red-600">
              {typeof error === "string"
                ? error
                : error?.message ||
                  "Unable to load conversations."}
            </p>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="
                  mt-2
                  text-xs
                  font-black
                  text-red-700
                  underline
                  underline-offset-2
                "
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          LIST
      ===================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain

          [scrollbar-width:none]
          [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  px-2
                  py-3
                "
              >
                <div
                  className="
                    h-12
                    w-12
                    shrink-0
                    animate-pulse
                    rounded-2xl
                    bg-ink-100
                  "
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/5 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            className="
              flex
              h-full
              min-h-64
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
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-ink-100
                text-ink-400
              "
            >
              <Search size={20} />
            </div>

            <p className="mt-3 text-sm font-black text-ink-700">
              {search
                ? "No conversations found"
                : "No conversations yet"}
            </p>

            <p className="mt-1 max-w-xs text-xs leading-5 text-ink-400">
              {search
                ? "Try a different name, request title, or message."
                : "Your conversations will appear here."}
            </p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => {
              const id = getConversationId(conversation);

              return (
                <ChatListItem
                  key={id}
                  conversation={conversation}
                  currentUserId={currentUserId}
                  selected={
                    toId(id) === toId(selectedId)
                  }
                  onSelect={onSelect}
                  onTogglePin={onTogglePin}
                  onToggleMute={onToggleMute}
                  onToggleArchive={onToggleArchive}
                  onDelete={
                    onDeleteConversation
                      ? handleDeleteRequest
                      : undefined
                  }
                  onAssignProvider={
                    onAssignProvider &&
                    canAssignProviderToConversation(
                      conversation,
                      currentUserId
                    )
                      ? (item) => setAssignConversation(item)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {deleteConversation && (
        <DeleteConversationDialog
          conversation={deleteConversation}
          isOpen={Boolean(deleteConversation)}
          loading={deleteLoading}
          onClose={() =>
            !deleteLoading && setDeleteConversation(null)
          }
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* =====================================================
          ASSIGN MODAL
      ===================================================== */}

      {assignConversation && (
        <AssignProviderDialog
          conversation={assignConversation}
          isOpen={Boolean(assignConversation)}
          onClose={() => setAssignConversation(null)}
          onAssignProvider={handleAssignRequest}
        />
      )}
    </div>
  );
};

export default ChatList;