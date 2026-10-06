import React from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Shield,
  User,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { requestsChatAPI } from "@/services/api/popApi";

/* ============================================================
   HELPERS
============================================================ */

const getName = (profile) =>
  profile?.fullName ||
  profile?.full_name ||
  profile?.name ||
  "Community member";

const getAvatarUrl = (profile) =>
  profile?.avatarUrl ||
  profile?.avatar_url ||
  profile?.picture ||
  null;

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const getIsProvider = (profile) => {
  if (typeof profile?.isProvider === "boolean") {
    return profile.isProvider;
  }

  if (typeof profile?.is_service_provider === "boolean") {
    return profile.is_service_provider;
  }

  return (
    Array.isArray(profile?.services) &&
    profile.services.length > 0
  );
};

const getRequestTitle = (conversation) =>
  conversation?.request?.title ||
  conversation?.request?.name ||
  "Conversation";

const getRequestId = (conversation, requestId) =>
  requestId ||
  conversation?.request?.id ||
  conversation?.request_id ||
  null;

/* ============================================================
   SECTION
============================================================ */

function Section({ title, description, children }) {
  return (
    <section className="px-5 py-5">
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-400">
              {title}
            </h3>
          )}

          {description && (
            <p className="mt-1 text-[11px] font-medium leading-4 text-ink-400">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}

/* ============================================================
   SETTINGS ROW
============================================================ */

function SettingsRow({
  icon: Icon,
  title,
  description,
  right,
  onClick,
  disabled = false,
}) {
  const content = (
    <>
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-ink-50
          text-ink-600
          transition
          group-hover:bg-primary-50
          group-hover:text-primary-700
        "
      >
        <Icon size={17} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">
          {title}
        </p>

        {description && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
            {description}
          </p>
        )}
      </div>

      {right}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="
          group
          flex
          w-full
          items-center
          gap-3
          rounded-2xl
          p-2
          text-left
          transition
          hover:bg-ink-50
          disabled:pointer-events-none
          disabled:opacity-50
        "
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-2xl p-2">
      {content}
    </div>
  );
}

/* ============================================================
   TOGGLE
============================================================ */

function Toggle({
  enabled,
  onChange,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange?.(!enabled)}
      className={`
        relative
        h-6
        w-11
        shrink-0
        rounded-full
        transition
        duration-200
        ${
          enabled
            ? "bg-primary-600 shadow-primary"
            : "bg-ink-200"
        }
        disabled:cursor-not-allowed
        disabled:opacity-50
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
          transition
          duration-200
          ${
            enabled
              ? "left-6"
              : "left-1"
          }
        `}
      />
    </button>
  );
}

/* ============================================================
   PROFILE CARD
============================================================ */

function ProfileCard({ profile }) {
  const name = getName(profile);
  const avatarUrl = getAvatarUrl(profile);
  const isProvider = getIsProvider(profile);

  return (
    <div
      className="
        rounded-3xl
        border
        border-ink-200
        bg-ink-50
        p-4
        shadow-xs
      "
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="
              h-14
              w-14
              shrink-0
              rounded-2xl
              border
              border-ink-200
              bg-white
              object-cover
              shadow-xs
            "
          />
        ) : (
          <div
            className="
              flex
              h-14
              w-14
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-primary-200
              bg-primary-50
              text-base
              font-black
              text-primary-700
              shadow-xs
            "
          >
            {getInitials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-black text-ink-950">
              {name}
            </h3>

            {isProvider && (
              <CheckCircle2
                size={14}
                className="shrink-0 text-primary-600"
                strokeWidth={2.5}
              />
            )}
          </div>

          <p className="mt-0.5 text-[11px] font-semibold text-ink-500">
            {isProvider
              ? "Service provider"
              : "Community member"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DIVIDER
============================================================ */

function Divider() {
  return <div className="mx-5 h-px bg-ink-200" />;
}

/* ============================================================
   MAIN
============================================================ */

export default function ChatSettings({
  conversation,
  other,
  requestId,
  currentUserId,
  onClose,
  onConversationUpdated,
}) {
  const location = useLocation();

  const [notifications, setNotifications] =
    React.useState(true);

  const [sounds, setSounds] =
    React.useState(true);

  const [readReceipts, setReadReceipts] =
    React.useState(true);

  /*
   * Server-backed protection state.
   *
   * The API returns:
   *   conversation.isProtected
   *
   * We also support protected_by as a fallback in case the
   * conversation object has not yet been decorated.
   */
  const initialProtected =
    typeof conversation?.isProtected === "boolean"
      ? conversation.isProtected
      : Array.isArray(conversation?.protected_by) &&
        currentUserId
      ? conversation.protected_by.some(
          (id) => String(id) === String(currentUserId)
        )
      : false;

  const [protectChat, setProtectChat] =
    React.useState(initialProtected);

  const [protectLoading, setProtectLoading] =
    React.useState(false);

  /*
   * Keep the local toggle synchronized if the parent refreshes
   * or replaces the conversation object.
   */
  React.useEffect(() => {
    if (typeof conversation?.isProtected === "boolean") {
      setProtectChat(conversation.isProtected);
      return;
    }

    if (
      Array.isArray(conversation?.protected_by) &&
      currentUserId
    ) {
      setProtectChat(
        conversation.protected_by.some(
          (id) => String(id) === String(currentUserId)
        )
      );
    }
  }, [
    conversation?.isProtected,
    conversation?.protected_by,
    currentUserId,
  ]);

  const providerId =
    other?.id ||
    other?.user_id ||
    conversation?.provider?.id ||
    conversation?.provider_id ||
    null;

  const resolvedRequestId = getRequestId(
    conversation,
    requestId
  );

  const profileHref = providerId
    ? `/profile/${providerId}`
    : null;

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  const requestHref = resolvedRequestId
    ? `/requests/${resolvedRequestId}`
    : null;

  /* ============================================================
     PROTECT CHAT
  ============================================================ */

  const handleProtectChat = async (nextValue) => {
    if (!conversation?.id || protectLoading) {
      return;
    }

    const previousValue = protectChat;

    // Optimistic UI
    setProtectChat(nextValue);
    setProtectLoading(true);

    try {
      const response =
        await requestsChatAPI.protectConversation(
          conversation.id,
          nextValue
        );

      const body = response?.data ?? response;

      const updatedConversation =
        body?.conversation ||
        body?.data?.conversation ||
        null;

      /*
       * Prefer the server's actual value when available.
       */
      const serverValue =
        typeof body?.protected === "boolean"
          ? body.protected
          : typeof updatedConversation?.isProtected ===
              "boolean"
          ? updatedConversation.isProtected
          : nextValue;

      setProtectChat(serverValue);

      /*
       * Let ChatModal/useChat update its conversation state
       * if the parent supports it.
       */
      if (updatedConversation) {
        onConversationUpdated?.(updatedConversation);
      }

      toast.success(
        serverValue
          ? "Chat protection enabled."
          : "Chat protection disabled."
      );
    } catch (error) {
      console.error(
        "Protect chat failed:",
        error
      );

      // Roll back optimistic state.
      setProtectChat(previousValue);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Could not update chat protection.";

      toast.error(message);
    } finally {
      setProtectLoading(false);
    }
  };

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
      {/* ======================================================
          SETTINGS HEADER
      ====================================================== */}

      <header
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
          onClick={onClose}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-ink-600
            transition
            hover:bg-ink-100
            hover:text-primary-600
            active:scale-95
          "
          aria-label="Back to chat"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h2
            className="
              truncate
              text-sm
              font-black
              tracking-tight
              text-ink-950
            "
          >
            Chat settings
          </h2>

          <p
            className="
              mt-0.5
              truncate
              text-[10px]
              font-semibold
              text-ink-400
            "
          >
            {getName(other)} ·{" "}
            {getRequestTitle(conversation)}
          </p>
        </div>

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
            text-ink-400
            transition
            hover:bg-ink-100
            hover:text-ink-700
            active:scale-95
          "
          aria-label="Close settings"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </header>

      {/* ======================================================
          SETTINGS CONTENT
      ====================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          pb-6
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* ====================================================
            PROFILE
        ==================================================== */}

        <Section>
          <ProfileCard profile={other} />

          {profileHref && (
            <Link
              to={profileHref}
              state={{
                returnTo,
                requestId: resolvedRequestId,
                providerId,
                from: "chat",
              }}
              className="
                mt-3
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-ink-200
                bg-white
                text-xs
                font-black
                text-ink-700
                shadow-xs
                transition
                hover:border-primary-200
                hover:bg-primary-50
                hover:text-primary-700
                hover:shadow-card
                active:scale-[0.99]
              "
            >
              <UserRound size={15} />
              View profile
            </Link>
          )}
        </Section>

        <Divider />

        {/* ====================================================
            CONVERSATION
        ==================================================== */}

        <Section
          title="Conversation"
          description="Details about this conversation."
        >
          <div className="space-y-1">
            {requestHref ? (
              <Link
                to={requestHref}
                className="
                  group
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  p-2
                  transition
                  hover:bg-ink-50
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
                    bg-ink-50
                    text-ink-600
                    transition
                    group-hover:bg-primary-50
                    group-hover:text-primary-700
                  "
                >
                  <FileText size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">
                    Request
                  </p>

                  <p className="truncate text-[11px] font-medium text-ink-500">
                    {getRequestTitle(conversation)}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="
                    text-ink-400
                    transition
                    group-hover:translate-x-0.5
                    group-hover:text-primary-600
                  "
                />
              </Link>
            ) : (
              <SettingsRow
                icon={MessageCircle}
                title="Conversation"
                description={getRequestTitle(conversation)}
              />
            )}

            <SettingsRow
              icon={Lock}
              title="Conversation security"
              description={
                protectChat
                  ? "This chat is protected from deletion by the other participant."
                  : "Messages are private to this conversation."
              }
            />
          </div>
        </Section>

        <Divider />

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        <Section
          title="Notifications"
          description="Control how this conversation gets your attention."
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3 rounded-2xl p-2">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-ink-50
                  text-ink-600
                "
              >
                {notifications ? (
                  <Bell size={17} />
                ) : (
                  <BellOff size={17} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">
                  Notifications
                </p>

                <p className="text-[11px] font-medium text-ink-500">
                  Message notifications
                </p>
              </div>

              <Toggle
                enabled={notifications}
                onChange={setNotifications}
                label="Toggle notifications"
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl p-2">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-ink-50
                  text-ink-600
                "
              >
                {sounds ? (
                  <Volume2 size={17} />
                ) : (
                  <VolumeX size={17} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">
                  Message sounds
                </p>

                <p className="text-[11px] font-medium text-ink-500">
                  Play a sound for new messages
                </p>
              </div>

              <Toggle
                enabled={sounds}
                onChange={setSounds}
                label="Toggle message sounds"
              />
            </div>
          </div>
        </Section>

        <Divider />

        {/* ====================================================
            PRIVACY
        ==================================================== */}

        <Section
          title="Privacy"
          description="Manage what participants can see and how this chat can be removed."
        >
          <div className="space-y-1">
            {/* ==================================================
                PROTECT CHAT
            ================================================== */}

            <div className="flex items-center gap-3 rounded-2xl p-2">
              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  transition
                  ${
                    protectChat
                      ? "bg-primary-50 text-primary-700"
                      : "bg-ink-50 text-ink-600"
                  }
                `}
              >
                <Lock
                  size={17}
                  strokeWidth={2}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">
                  Protect chat
                </p>

                <p className="mt-0.5 text-[11px] font-medium leading-4 text-ink-500">
                  {protectChat
                    ? "The other participant cannot remove your copy of this chat."
                    : "Prevent the other participant from removing your copy of this chat."}
                </p>
              </div>

              <Toggle
                enabled={protectChat}
                onChange={handleProtectChat}
                disabled={
                  protectLoading || !conversation?.id
                }
                label="Protect chat from deletion"
              />
            </div>

            {/* ==================================================
                READ RECEIPTS
            ================================================== */}

            <div className="flex items-center gap-3 rounded-2xl p-2">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-ink-50
                  text-ink-600
                "
              >
                <Shield size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">
                  Read receipts
                </p>

                <p className="text-[11px] font-medium text-ink-500">
                  Let others know when you've read messages
                </p>
              </div>

              <Toggle
                enabled={readReceipts}
                onChange={setReadReceipts}
                label="Toggle read receipts"
              />
            </div>

            <SettingsRow
              icon={User}
              title="Your identity"
              description="Your profile is visible in this conversation."
            />
          </div>
        </Section>

        <Divider />

        {/* ====================================================
            MEDIA
        ==================================================== */}

        <Section
          title="Media"
          description="Shared content from this conversation."
        >
          <div className="space-y-1">
            <SettingsRow
              icon={ImageIcon}
              title="Shared media"
              description="Photos, files and other attachments"
              right={
                <ChevronRight
                  size={16}
                  className="text-ink-400"
                />
              }
            />

            <SettingsRow
              icon={MoreHorizontal}
              title="Shared links"
              description="Links shared in this conversation"
              right={
                <ChevronRight
                  size={16}
                  className="text-ink-400"
                />
              }
            />
          </div>
        </Section>

        <Divider />

        {/* ====================================================
            STATUS
        ==================================================== */}

        <Section title="Conversation status">
          <div
            className="
              rounded-2xl
              border
              border-ink-200
              bg-ink-50
              p-3
            "
          >
            <div className="flex items-center gap-3">
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
                    conversation?.isClosed
                      ? "bg-ink-200 text-ink-500"
                      : "bg-success-50 text-success-600"
                  }
                `}
              >
                {conversation?.isClosed ? (
                  <Lock size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-ink-800">
                  {conversation?.isClosed
                    ? "Conversation closed"
                    : "Conversation active"}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-ink-500">
                  {conversation?.isClosed
                    ? "New messages cannot be sent."
                    : "You can continue messaging."}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="px-5 pt-1">
          <p className="text-center text-[10px] font-semibold text-ink-400">
            Chat privacy settings are saved to this conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
