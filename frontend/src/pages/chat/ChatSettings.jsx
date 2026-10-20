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
import { chatAPI } from "@/services/api/sharedApi";

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

/* ============================================================
   CONTEXT HELPERS (item  |  request  |  direct)
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

/*
 * Unified title resolver.
 *
 * - item chat    → item.title
 * - request chat → request.title
 * - direct       → null
 */
const getContextTitle = (conversation) =>
  getItemTitle(conversation) ||
  getRequestTitle(conversation) ||
  null;

/*
 * Label for the context row:
 *   "Item"     for DTI chats
 *   "Request"  for POP chats
 *   "Conversation" as a fallback
 */
const getContextLabel = (conversation) => {
  const type = getContextType(conversation);

  if (type === "dti_donor_applicant") return "Item";
  if (type === "pop_request") return "Request";
  return "Conversation";
};

const getContextId = (conversation, requestId) => {
  const type = getContextType(conversation);

  if (type === "dti_donor_applicant") {
    return (
      conversation?.item?.id ||
      conversation?.item_id ||
      conversation?.context_id ||
      null
    );
  }

  return (
    requestId ||
    conversation?.request?.id ||
    conversation?.request_id ||
    conversation?.context_id ||
    null
  );
};

/*
 * Where the context row links to:
 *   /items/:id    for DTI
 *   /requests/:id for POP
 */
const getContextHref = (conversation, requestId) => {
  const type = getContextType(conversation);
  const id = getContextId(conversation, requestId);

  if (!id) return null;

  if (type === "dti_donor_applicant") return `/items/${id}`;
  if (type === "pop_request") return `/requests/${id}`;

  return null;
};

/*
 * Role label for the OTHER participant.
 *
 * DTI (context_type = "dti_donor_applicant"):
 *   - if I'm the donor (requester_id), the other person is the applicant
 *   - if I'm the applicant (provider_id), the other person is the donor
 *
 * POP (context_type = "pop_request") / direct:
 *   - fall back to the service-provider heuristic already in use
 */
const getOtherRoleLabel = (conversation, profile, currentUserId) => {
  const type = getContextType(conversation);

  if (type === "dti_donor_applicant") {
    const requesterId =
      conversation?.requester_id ||
      conversation?.requesterId;

    const providerId =
      conversation?.provider_id ||
      conversation?.providerId;

    if (
      requesterId &&
      currentUserId &&
      String(requesterId) === String(currentUserId)
    ) {
      return "Applicant";
    }

    if (
      providerId &&
      currentUserId &&
      String(providerId) === String(currentUserId)
    ) {
      return "Donor";
    }

    return "Community member";
  }

  return getIsProvider(profile)
    ? "Service provider"
    : "Community member";
};

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

function ProfileCard({ profile, roleLabel }) {
  const name = getName(profile);
  const avatarUrl = getAvatarUrl(profile);

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

            {roleLabel === "Service provider" && (
              <CheckCircle2
                size={14}
                className="shrink-0 text-primary-600"
                strokeWidth={2.5}
              />
            )}
          </div>

          <p className="mt-0.5 text-[11px] font-semibold text-ink-500">
            {roleLabel}
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

  /* ------------------------------------------------------------
     CONTEXT (item OR request)
  ------------------------------------------------------------ */

  const contextTitle = getContextTitle(conversation);
  const contextLabel = getContextLabel(conversation);
  const contextHref = getContextHref(conversation, requestId);
  const contextId = getContextId(conversation, requestId);

  /* ------------------------------------------------------------
     ROLE OF THE OTHER PARTICIPANT
  ------------------------------------------------------------ */

  const roleLabel = getOtherRoleLabel(
    conversation,
    other,
    currentUserId
  );

  const profileHref = providerId
    ? `/profile/${providerId}`
    : null;

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  /* ============================================================
     PROTECT CHAT
  ============================================================ */

  const handleProtectChat = async (nextValue) => {
    if (!conversation?.id || protectLoading) {
      return;
    }

    const previousValue = protectChat;

    setProtectChat(nextValue);
    setProtectLoading(true);

    try {
      const response =
        await chatAPI.protectConversation(
          conversation.id,
          nextValue
        );

      const body = response?.data ?? response;

      const updatedConversation =
        body?.conversation ||
        body?.data?.conversation ||
        null;

      const serverValue =
        typeof body?.protected === "boolean"
          ? body.protected
          : typeof updatedConversation?.isProtected ===
              "boolean"
          ? updatedConversation.isProtected
          : nextValue;

      setProtectChat(serverValue);

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
            {getName(other)}
            {contextTitle ? ` · ${contextTitle}` : ""}
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
          <ProfileCard
            profile={other}
            roleLabel={roleLabel}
          />

          {profileHref && (
            <Link
              to={profileHref}
              state={{
                returnTo,
                requestId: contextId,
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
            {contextHref && contextTitle ? (
              <Link
                to={contextHref}
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
                    {contextLabel}
                  </p>

                  <p className="truncate text-[11px] font-medium text-ink-500">
                    {contextTitle}
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
                description={
                  contextTitle || "Private chat"
                }
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