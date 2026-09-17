import React, {
  useState, useEffect, useRef, useMemo, forwardRef, useCallback,
} from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { itemDiscussionsAPI } from '@/services/api/dtiApi';
import { useWebSocketContext } from '@/reusables/Websocket';
import { useBreakpoint } from '@/reusables/Breakpoint';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { getCategoryByValue, getConditionByValue, getStatusDisplay } from '@/utils/constants';
import Modal from '@/reusables/Modal';

const QUICK_EMOJIS = [
  '👍', '❤️', '😂', '🙏', '🎉', '😊', '👏', '🔥',
  '😍', '😢', '😮', '👀', '✅', '💯', '🤔', '😅',
];

// Helper to get display name (admins show as "Moderator")
const getDisplayName = (user) => {
  if (!user) return 'Deleted user';
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  return isAdmin ? 'Moderator' : user.full_name || 'Deleted user';
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('') || '?';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const groupIntoThreads = (flat) => {
  const byId = new Map(flat.map((m) => [m.id, m]));

  const rootIdOf = (message) => {
    let current = message;
    const seen = new Set();
    while (
      current.parent_id &&
      byId.has(current.parent_id) &&
      !seen.has(current.id)
    ) {
      seen.add(current.id);
      current = byId.get(current.parent_id);
    }
    return current.id;
  };

  const threads = new Map();
  flat.forEach((message) => {
    const rootId = rootIdOf(message);
    if (!threads.has(rootId)) {
      threads.set(rootId, {
        root: byId.get(rootId),
        replies: [],
      });
    }
    if (message.id !== rootId) {
      threads.get(rootId).replies.push(message);
    }
  });

  threads.forEach((thread) => {
    thread.replies.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  });

  return Array.from(threads.values()).sort(
    (a, b) => new Date(a.root.created_at) - new Date(b.root.created_at),
  );
};

const renderContent = (text, names) => {
  if (!names.length) return text;
  const pattern = new RegExp(
    `@(${names
      .map(escapeRegex)
      .sort((a, b) => b.length - a.length)
      .join('|')})`,
    'g',
  );
  return text.split(pattern).map((part, index) =>
    names.includes(part) ? (
      <span key={index} className="font-semibold text-primary-600">
        @{part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
};

/* ------------------------------------------------------------
   Skeleton
------------------------------------------------------------ */
const DiscussionSkeleton = () => (
  <div className="space-y-6 p-1">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex gap-3.5 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-ink-100 shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-2.5 rounded-full bg-ink-100 w-32" />
          <div className="h-3.5 rounded-full bg-ink-100 w-full max-w-xl" />
          <div className="h-3.5 rounded-full bg-ink-100 w-3/5" />
        </div>
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------
   Avatar – now accepts optional `name` prop for display
------------------------------------------------------------ */
const Avatar = ({ user, size = 'md', ring = false, name = null }) => {
  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-11 h-11 text-sm',
  };
  const cls = sizes[size] || sizes.md;

  const displayName = name || user?.full_name || 'User';

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={displayName}
        className={`${cls} img rounded-full object-cover shrink-0 ${
          ring
            ? 'ring-2 ring-primary-400/70 ring-offset-2 ring-offset-white'
            : ''
        }`}
      />
    );
  }

  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-primary-400 to-brand-500
        flex items-center justify-center shrink-0 text-white font-bold ${
          ring
            ? 'ring-2 ring-primary-400/70 ring-offset-2 ring-offset-white'
            : ''
        }`}
    >
      {initials(displayName)}
    </div>
  );
};

/* ------------------------------------------------------------
   Empty state
------------------------------------------------------------ */
const EmptyState = ({ canPost }) => (
  <div className="py-20 sm:py-24 text-center">
    <div className="mx-auto w-14 h-14 rounded-2xl border border-primary-100
      bg-primary-50 flex items-center justify-center text-primary-500 mb-5">
      <i className="bi bi-chat-square-text text-2xl" />
    </div>
    <h3 className="text-lg font-bold text-ink-900 tracking-tight">
      Start the conversation
    </h3>
    <p className="mt-2 max-w-sm mx-auto text-sm leading-6 text-ink-500">
      {canPost
        ? 'Ask a question, share useful information, or help someone with this item.'
        : 'Sign in to ask a question or join the conversation.'}
    </p>
  </div>
);

/* ------------------------------------------------------------
   Emoji picker
------------------------------------------------------------ */
const SimpleEmojiPicker = ({ onSelect }) => (
  <div className="w-64 rounded-2xl border border-ink-100 bg-white p-3
    shadow-sm shadow-ink-900/10">
    <div className="grid grid-cols-8 gap-1">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="h-8 w-8 rounded-lg text-lg hover:bg-ink-50
            transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------
   Mention dropdown – now uses display names
------------------------------------------------------------ */
const MentionDropdown = ({ query, participants, onSelect }) => {
  const filtered = participants
    .filter((p) =>
      getDisplayName(p).toLowerCase().startsWith(query.trim().toLowerCase()),
    )
    .slice(0, 5);

  if (!filtered.length) return null;

  return (
    <div className="absolute left-0 bottom-full mb-2 w-64 max-h-52
      overflow-y-auto rounded-2xl border border-ink-100 bg-white
      shadow-sm shadow-ink-900/10 z-50 p-1.5">
      {filtered.map((participant) => {
        const displayName = getDisplayName(participant);
        return (
          <button
            key={participant.id}
            type="button"
            onClick={() => onSelect(participant, displayName)}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5
              text-left hover:bg-primary-50 transition-colors"
          >
            <Avatar user={participant} size="xs" name={displayName} />
            <span className="text-sm font-semibold text-ink-700 truncate">
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------
   Message row – highlighting now per message
------------------------------------------------------------ */
const MessageRow = forwardRef(({
  message,
  isReply,
  parentAuthorName,
  currentUserId,
  itemOwnerId,
  onReply,
  onEdit,
  onDelete,
  onReport,
  participantNames,
  reduceMotion,
  isAdmin,
  isHighlighted,
}, ref) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content || '');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOwner = message.user_id === currentUserId;
  const isItemOwnerActing = itemOwnerId && currentUserId === itemOwnerId;
  const isSenderAdmin = message.user?.role === 'admin' || message.user?.role === 'super_admin';
  const canDelete = (isOwner || isItemOwnerActing || isAdmin) && !message.is_deleted;
  const canEdit = isOwner && !message.is_deleted;
  const isDonorMessage = message.user_id === itemOwnerId && !isSenderAdmin;
  const displayName = getDisplayName(message.user);

  const submitEdit = useCallback(() => {
    const value = editValue.trim();
    if (!value || value === message.content) {
      setEditValue(message.content || '');
      setEditing(false);
      return;
    }
    onEdit(message.id, value);
    setEditing(false);
  }, [editValue, message.content, message.id, onEdit]);

  return (
    <motion.article
      ref={ref}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`group relative ${isReply ? 'ml-0' : ''}`}
    >
      <div
        className={`relative flex gap-3 sm:gap-3.5 rounded px-2.5 py-2.5
          transition-colors ${
            isHighlighted
              ? 'bg-amber-50 ring-1 ring-amber-200/80'
              : 'hover:bg-ink-50/70'
          }`}
      >
        {isHighlighted && (
          <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-amber-400" />
        )}

        <Avatar
          user={message.user}
          size={isReply ? 'sm' : 'md'}
          ring={isDonorMessage}
          name={displayName}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-[13px] font-bold text-ink-900">
              {displayName}
            </span>

            {isDonorMessage && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5
                text-[9px] font-bold uppercase tracking-wider text-primary-600">
                Donor
              </span>
            )}

            {isSenderAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full
                bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase
                tracking-wider text-amber-700">
                <i className="bi bi-shield-check" />
                Moderator
              </span>
            )}

            <span className="text-ink-300 text-xs">·</span>

            <span
              className="text-[11px] font-medium text-ink-400"
              title={format(new Date(message.created_at), 'PPpp')}
            >
              {formatDistanceToNowStrict(
                new Date(message.created_at),
                { addSuffix: true },
              )}
            </span>

            {message.is_edited && !message.is_deleted && (
              <span className="text-[11px] italic text-ink-300">
                edited
              </span>
            )}

            {isHighlighted && (
              <span className="inline-flex items-center gap-1 rounded-full
                bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700">
                <i className="bi bi-pin-angle-fill" />
                Reported
              </span>
            )}
          </div>

          {isReply && parentAuthorName && !message.is_deleted && (
            <div className="mt-0.5 text-[11px] text-ink-400">
              <i className="bi bi-reply-fill mr-1" />
              replying to <span className="font-semibold text-ink-500">
                {parentAuthorName}
              </span>
            </div>
          )}

          {editing ? (
            <div className="mt-2.5">
              <textarea
                autoFocus
                rows={3}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full resize-none rounded-xl border border-ink-200
                  bg-white p-3 text-sm text-ink-700 outline-none
                  focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={submitEdit}
                  className="rounded-lg bg-primary-500 px-3.5 py-1.5
                    text-xs font-bold text-white hover:bg-primary-600"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditValue(message.content || '');
                  }}
                  className="rounded-lg bg-ink-100 px-3.5 py-1.5
                    text-xs font-semibold text-ink-600 hover:bg-ink-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`mt-1.5 whitespace-pre-wrap break-words text-[14px]
              leading-6 ${
                message.is_deleted
                  ? 'text-ink-400 italic'
                  : 'text-ink-700'
              }`}>
              {message.is_deleted ? (
                <>
                  <i className="bi bi-slash-circle mr-1.5 opacity-70" />
                  This message was deleted
                </>
              ) : (
                renderContent(message.content, participantNames)
              )}
            </p>
          )}

          {!message.is_deleted && !editing && (
            <div className="mt-2.5 flex items-center gap-4">
              {currentUserId && (
                <>
                  <button
                    type="button"
                    onClick={() => onReply(message)}
                    className="inline-flex items-center gap-1.5 text-[11px]
                      font-semibold text-ink-400 hover:text-primary-600"
                  >
                    <i className="bi bi-reply" />
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => onReport(message.id)}
                    className="inline-flex items-center gap-1.5 text-[11px]
                      font-semibold text-ink-400 hover:text-rose-600"
                  >
                    <i className="bi bi-flag" />
                    Report
                  </button>
                </>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-[11px]
                    font-semibold text-ink-400 hover:text-ink-700"
                >
                  <i className="bi bi-pencil" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px]
                    font-semibold text-ink-400 hover:text-rose-600"
                >
                  <i className="bi bi-trash" />
                  Delete
                </button>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {deleteOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 rounded-xl
                  border border-rose-200 bg-rose-50 px-3 py-2.5">
                  <i className="bi bi-exclamation-triangle text-rose-500" />
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(message.id);
                      setDeleteOpen(false);
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs
                      font-bold text-white hover:bg-rose-600"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="px-2 py-1.5 text-xs font-semibold text-ink-500"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
});

/* ------------------------------------------------------------
   Collapsible Thread Accordion – Framer Motion expand/collapse
------------------------------------------------------------ */
const ThreadAccordion = ({
  root,
  replies,
  highlightedId,
  messageRefs,
  reduceMotion,
  ...props
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasReplies = replies.length > 0;

  // Auto-expand if the thread contains the highlighted message
  useEffect(() => {
    if (
      root.id === highlightedId ||
      replies.some((r) => r.id === highlightedId)
    ) {
      setExpanded(true);
    }
  }, [highlightedId, root.id, replies]);

  // Register root ref
  const setRootRef = useCallback(
    (el) => {
      if (messageRefs) {
        if (el) messageRefs.current.set(root.id, el);
        else messageRefs.current.delete(root.id);
      }
    },
    [messageRefs, root.id],
  );

  return (
    <div className="mb-6 border-b border-ink-100 pb-5 last:border-0 last:pb-0">
      <MessageRow
        {...props}
        ref={setRootRef}
        message={root}
        isReply={false}
        isHighlighted={root.id === highlightedId}
        reduceMotion={reduceMotion}
      />

      {hasReplies && (
        <div className="ml-8 sm:ml-12 mt-2">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[12px] font-semibold text-primary-500 hover:text-primary-600
                transition-colors flex items-center gap-1.5"
            >
              <i className="bi bi-chevron-down text-[10px]" />
              Show {replies.length} reply{replies.length > 1 ? 's' : ''}
            </button>
          ) : (
            <AnimatePresence initial={false}>
              <motion.div
                key="replies"
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, height: 0 }
                }
                animate={{
                  opacity: 1,
                  height: 'auto',
                  transition: {
                    height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                    opacity: { duration: 0.2 },
                  },
                }}
                exit={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: 0,
                        height: 0,
                        transition: {
                          height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                          opacity: { duration: 0.15 },
                        },
                      }
                }
                className="overflow-hidden"
              >
                <div className="space-y-1 border-l-2 border-ink-200 pl-3 sm:pl-4 ml-1 mt-1">
                  {replies.map((reply) => (
                    <MessageRow
                      key={reply.id}
                      {...props}
                      ref={(el) => {
                        if (messageRefs) {
                          if (el) messageRefs.current.set(reply.id, el);
                          else messageRefs.current.delete(reply.id);
                        }
                      }}
                      message={reply}
                      isReply
                      isHighlighted={reply.id === highlightedId}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="text-[12px] font-semibold text-ink-400 hover:text-ink-600
                      transition-colors flex items-center gap-1.5 mt-1"
                  >
                    <i className="bi bi-chevron-up text-[10px]" />
                    Collapse
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------
   Main Page – Split Layout + Sticky Composer
------------------------------------------------------------ */
const ItemDiscussionPage = () => {
  const { itemId } = useParams();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const {
    isConnected,
    joinDiscussion,
    leaveDiscussion,
  } = useWebSocketContext();

  const reduceMotion = useReducedMotion();
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const highlightMessageId = queryParams.get('message');

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [posting, setPosting] = useState(false);

  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessageId, setReportMessageId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const [highlightedId, setHighlightedId] = useState(null);

  const textareaRef = useRef(null);
  const messageRefs = useRef(new Map());
  const composerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  /* ----------------------------------------------------------
     Fetch item + discussion messages
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!itemId) {
      setError('No item ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    itemDiscussionsAPI.getByItem(itemId)
      .then((res) => {
        setItem(res.data.item);
        setMessages(res.data.messages || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load discussion');
        toast.error('Could not load discussion');
      })
      .finally(() => setLoading(false));
  }, [itemId]);

  /* ----------------------------------------------------------
     WebSocket
  ---------------------------------------------------------- */
  useEffect(() => {
    joinDiscussion(itemId);

    const handleNew = (event) => {
      const message = event.detail;
      if (message.item_id !== itemId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    };
    const handleUpdate = (event) => {
      const message = event.detail;
      if (message.item_id !== itemId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };
    const handleDelete = (event) => {
      const { id, itemId: eventItemId } = event.detail;
      if (eventItemId !== itemId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_deleted: true, content: '' } : m)),
      );
    };

    window.addEventListener('discussion:new', handleNew);
    window.addEventListener('discussion:update', handleUpdate);
    window.addEventListener('discussion:delete', handleDelete);

    return () => {
      leaveDiscussion(itemId);
      window.removeEventListener('discussion:new', handleNew);
      window.removeEventListener('discussion:update', handleUpdate);
      window.removeEventListener('discussion:delete', handleDelete);
    };
  }, [itemId, joinDiscussion, leaveDiscussion]);

  /* ----------------------------------------------------------
     Derived data
  ---------------------------------------------------------- */
  const threads = useMemo(() => groupIntoThreads(messages), [messages]);
  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const sortedThreads = useMemo(() => {
    let highlightThreadIndex = -1;
    if (highlightedId) {
      highlightThreadIndex = threads.findIndex((thread) =>
        thread.root.id === highlightedId ||
        thread.replies.some((r) => r.id === highlightedId),
      );
    }
    if (highlightThreadIndex <= 0) return threads;
    const highlighted = threads[highlightThreadIndex];
    return [highlighted, ...threads.filter((_, i) => i !== highlightThreadIndex)];
  }, [threads, highlightedId]);

  const participants = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      if (message.user && !message.is_deleted) map.set(message.user.id, message.user);
    });
    return Array.from(map.values());
  }, [messages]);

  const participantNames = useMemo(
    () => participants.map((p) => getDisplayName(p)).filter(Boolean),
    [participants],
  );

  /* ----------------------------------------------------------
     Highlight deep links – smooth scroll to the exact message
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!highlightMessageId || loading || messages.length === 0) return;

    const target = messages.find((m) => m.id === highlightMessageId);
    if (!target) return;

    setHighlightedId(highlightMessageId);

    // Give the DOM time to expand the thread + render the message
    const timer = setTimeout(() => {
      const element = messageRefs.current.get(highlightMessageId);
      if (element) {
        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });

        // Keep highlight for 30s then clear
        setTimeout(() => {
          setHighlightedId(null);
        }, 30000);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [highlightMessageId, loading, messages, reduceMotion]);

  /* ----------------------------------------------------------
     Composer handlers
  ---------------------------------------------------------- */
  const handleTextChange = (event) => {
    const value = event.target.value;
    const cursor = event.target.selectionStart;
    setContent(value);

    const atIndex = value.lastIndexOf('@', cursor - 1);
    if (atIndex === -1) {
      setMentionOpen(false);
      return;
    }

    const between = value.slice(atIndex + 1, cursor);
    if (between.includes('\n') || between.length > 30 || /\s{2,}/.test(between)) {
      setMentionOpen(false);
      return;
    }

    setMentionQuery(between);
    setMentionStart(atIndex);
    setMentionOpen(true);
  };

  const selectMention = useCallback((participant, displayName) => {
    const before = content.slice(0, mentionStart);
    const after = content.slice(mentionStart + 1 + mentionQuery.length);
    const insert = `@${displayName} `;
    const newValue = `${before}${insert}${after}`;
    setContent(newValue);
    setMentions((prev) =>
      prev.some((m) => m.id === participant.id) ? prev : [...prev, participant],
    );
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const position = before.length + insert.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  }, [content, mentionStart, mentionQuery.length]);

  const insertEmoji = useCallback((emoji) => {
    const element = textareaRef.current;
    const position = element?.selectionStart ?? content.length;
    const newValue = content.slice(0, position) + emoji + content.slice(position);
    setContent(newValue);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      const nextPosition = position + emoji.length;
      element?.focus();
      element?.setSelectionRange(nextPosition, nextPosition);
    });
  }, [content]);

  const resetComposer = useCallback(() => {
    setContent('');
    setMentions([]);
    setReplyingTo(null);
    setMentionOpen(false);
    setShowEmoji(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || posting) return;
    setPosting(true);

    const mentionedUserIds = [
      ...new Set(
        mentions
          .filter((mention) => trimmed.includes(`@${getDisplayName(mention)}`))
          .map((mention) => mention.id),
      ),
    ];

    try {
      const response = await itemDiscussionsAPI.create(itemId, {
        content: trimmed,
        parentId: replyingTo?.id || null,
        mentionedUserIds,
      });
      const message = response.data.message;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      resetComposer();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post message');
    } finally {
      setPosting(false);
    }
  }, [content, posting, mentions, replyingTo, itemId, resetComposer]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey && !mentionOpen) {
      event.preventDefault();
      handleSend();
    }
  }, [mentionOpen, handleSend]);

  /* ----------------------------------------------------------
     Reply handler – scrolls to composer
  ---------------------------------------------------------- */
  const handleReply = useCallback((message) => {
    setReplyingTo(message);
    setTimeout(() => {
      composerRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      textareaRef.current?.focus();
    }, 100);
  }, [reduceMotion]);

  /* ----------------------------------------------------------
     Message actions
  ---------------------------------------------------------- */
  const handleEdit = useCallback(async (id, newContent) => {
    const previous = messages.find((m) => m.id === id);
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content: newContent, is_edited: true } : message,
      ),
    );
    try {
      await itemDiscussionsAPI.update(id, newContent);
    } catch {
      toast.error('Failed to update message');
      if (previous) {
        setMessages((current) => current.map((message) => message.id === id ? previous : message));
      }
    }
  }, [messages]);

  const handleDelete = useCallback(async (id) => {
    const previous = messages.find((m) => m.id === id);
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, is_deleted: true } : message,
      ),
    );
    try {
      await itemDiscussionsAPI.remove(id);
    } catch {
      toast.error('Failed to delete message');
      if (previous) {
        setMessages((current) => current.map((message) => message.id === id ? previous : message));
      }
    }
  }, [messages]);

  const openReportModal = useCallback((messageId) => {
    setReportMessageId(messageId);
    setReportReason('');
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportReason.trim()) {
      toast.error('Please provide a reason for the report');
      return;
    }
    setReporting(true);
    try {
      await itemDiscussionsAPI.report(reportMessageId, reportReason, reportReason);
      toast.success('Report submitted. Our team will review it.');
      setShowReportModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setReporting(false);
    }
  }, [reportReason, reportMessageId]);

  /* ----------------------------------------------------------
     Loading / error
  ---------------------------------------------------------- */
  if (loading) {
    return (
      <div className="mt-10">
        <PageNavigation />
        <div className="mt-5 rounded-md border border-ink-100 bg-white p-6 md:p-8 shadow-sm">
          <DiscussionSkeleton />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mt-10 text-center px-2 py-16">
        <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
          <i className="bi bi-exclamation-circle text-xl" />
        </div>
        <p className="font-semibold text-rose-600">{error || 'Item not found'}</p>
        <Link to="/" className="inline-flex mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">
          ← Back to items
        </Link>
      </div>
    );
  }

  const itemOwnerId = item.donor_id;
  const itemOwnerName = item.donor?.full_name || 'Unknown';

  // Get category, condition, status display data
  const categoryData = getCategoryByValue(item.category);
  const conditionData = getConditionByValue(item.condition);
  const statusData = getStatusDisplay(item.status);

  // Render SVG icon with proper styling
  const renderIcon = (svgString, size = 16) => (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );

  return (
    <div className="min-h-screen pb-8">
      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-6 lg:px-8">
        <PageNavigation />

        {/* ─── SPLIT‑PANEL LAYOUT ─────────────────────────────────── */}
        <div className="mt-2 flex flex-col lg:flex-row gap-6">

          {/* LEFT SIDEBAR – Item Context only (Participants card removed) */}
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Item card */}
            <div className="rounded-md border border-ink-100 bg-white shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="img h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-ink-300">
                      <i className="bi bi-image text-xl" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-bold tracking-tight text-ink-900">
                    {item.title}
                  </h2>
                  {/* Category with icon */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {categoryData?.icon && renderIcon(categoryData.icon, 16)}
                    <span className="text-xs text-ink-500">{item.category}</span>
                  </div>

                  {/* Donor info with avatar */}
                  <div className="flex items-center gap-2 mt-2">
                    {item.donor?.avatar_url ? (
                      <img
                        src={item.donor.avatar_url}
                        alt={itemOwnerName}
                        className="h-5 w-5 rounded-full object-cover border border-ink-200"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[8px] font-bold">
                        {initials(itemOwnerName)}
                      </div>
                    )}
                    <span className="text-xs text-ink-400">
                      Donated by <span className="font-semibold text-ink-500">{itemOwnerName}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(true)}
                className="w-full mt-4 rounded-xl border border-ink-200 py-2 text-xs font-bold text-ink-600
                  hover:border-primary-200 hover:text-primary-600 transition-colors flex justify-center items-center gap-1.5"
              >
                Full details <i className="bi bi-arrow-up-right text-[10px]" />
              </button>
              <div className="mt-4 pt-4 border-t border-ink-100 flex justify-between items-center text-xs text-ink-400">
                <span>
                  <i className="bi bi-people mr-1.5" />
                  {participants.length} participants
                </span>
                <span className={`flex items-center gap-1.5 ${isConnected ? 'text-emerald-600' : 'text-ink-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-300'}`} />
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN – Discussion */}
          <main className="flex-1 min-w-0 bg-white rounded-md border border-ink-100 shadow-sm flex flex-col h-[700px] lg:h-[750px] overflow-hidden relative">

            {/* Header */}
            <header className="px-5 py-4 border-b border-ink-100 shrink-0 bg-white/90 backdrop-blur-sm z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <i className="bi bi-chat-square-text" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-ink-900">Discussion</h2>
                    <p className="text-[10px] text-ink-400">{messages.length} messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-400 hidden sm:inline">
                    {participants.length} participants
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowParticipantsModal(true)}
                    className="flex items-center -space-x-1.5"
                    aria-label="View participants"
                  >
                    {participants.slice(0, 3).map((p) => (
                      <Avatar key={p.id} user={p} size="xs" name={getDisplayName(p)} />
                    ))}
                  </button>
                </div>
              </div>
            </header>

            {/* Scrollable Thread List */}
            <section
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin scrollbar-thumb-ink-200"
            >
              {sortedThreads.length === 0 ? (
                <EmptyState canPost={isAuthenticated} />
              ) : (
                <div>
                  <AnimatePresence initial={false}>
                    {sortedThreads.map(({ root, replies }) => (
                      <ThreadAccordion
                        key={root.id}
                        root={root}
                        replies={replies}
                        highlightedId={highlightedId}
                        messageRefs={messageRefs}
                        currentUserId={user?.id}
                        itemOwnerId={itemOwnerId}
                        onReply={handleReply}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReport={openReportModal}
                        participantNames={participantNames}
                        reduceMotion={reduceMotion}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* ─── STICKY FLOATING COMPOSER ────────────────────── */}
            {isAuthenticated ? (
              <div
                ref={composerRef}
                className="shrink-0 border-t border-ink-100 bg-white p-4 sticky bottom-0"
              >
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2.5">
                        <i className="bi bi-reply-fill text-primary-500" />
                        <p className="min-w-0 flex-1 truncate text-xs text-primary-700">
                          Replying to <span className="font-bold">{getDisplayName(replyingTo.user)}</span>
                          <span className="text-primary-400"> — {replyingTo.content?.slice(0, 55)}{replyingTo.content?.length > 55 ? '…' : ''}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="text-primary-400 hover:text-primary-700"
                        >
                          <i className="bi bi-x-lg text-xs" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-3">
                  <Avatar user={user} size={isMobile ? 'sm' : 'md'} name={getDisplayName(user)} />
                  <div className="relative flex-1">
                    {mentionOpen && (
                      <MentionDropdown
                        query={mentionQuery}
                        participants={participants}
                        onSelect={selectMention}
                      />
                    )}
                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.98 }}
                          className="absolute right-0 bottom-full mb-2 z-40"
                        >
                          <SimpleEmojiPicker onSelect={insertEmoji} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex items-center rounded-2xl border border-ink-200 bg-ink-50/40 shadow-sm transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder={replyingTo ? 'Replying…' : 'Write a message…'}
                        className="block max-h-28 min-h-[44px] w-full resize-none bg-transparent px-2 py-3 text-sm text-ink-700 outline-none placeholder:text-ink-400"
                      />
                      <div className="flex items-center gap-1 pr-2 pb-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowEmoji((v) => !v)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                            showEmoji
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-ink-400 hover:bg-ink-100 hover:text-primary-600'
                          }`}
                        >
                          <i className="bi bi-emoji-smile text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={!content.trim() || posting}
                          className="h-8 rounded-lg bg-gradient-to-r from-primary-500 to-brand-600 px-3 text-xs font-bold text-white hover:shadow-md disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {posting ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <span>Send</span>
                              <i className="bi bi-send-fill text-[10px]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <small className="flex justify-center text-ink-400 mt-1">
                      use @ to mention anyone in the conversation
                    </small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="shrink-0 border-t border-ink-100 bg-ink-50/40 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white border border-ink-100 flex items-center justify-center text-ink-400">
                    <i className="bi bi-lock" />
                  </div>
                  <p className="text-sm font-bold text-ink-800">Join the conversation</p>
                </div>
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="rounded-lg bg-gradient-to-r from-primary-500 to-brand-600 px-2 py-2 text-sm font-bold text-white hover:shadow-md"
                >
                  Sign in
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ─── PARTICIPANTS MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        title="Participants"
        size="md"
      >
        <div className="py-2">
          <p className="mb-4 text-sm text-ink-500">
            {participants.length} participants in this discussion
          </p>
          <div className="grid max-h-72 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
            {participants.map((participant) => {
              const displayName = getDisplayName(participant);
              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink-50"
                >
                  <Avatar user={participant} size="md" name={displayName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {displayName}
                    </p>
                    <div className="mt-0.5">
                      {participant.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[8px] font-semibold text-primary-700">
                          <i className="bi bi-check-circle-fill text-[8px]" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[8px] font-semibold text-ink-600">
                          <i className="bi bi-question-circle text-[8px]" />
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-ink-100 pt-3.5 text-xs text-ink-400">
            <i className="bi bi-chat-dots mr-1.5" /> Total messages: {messages.length}
          </div>
        </div>
      </Modal>

      {/* ─── ITEM MODAL ─────────────────────────────────────────── */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Item details"
        size="md"
      >
        <div className="space-y-4 py-2">
          {item.images?.length > 0 && (
            <img
              src={item.images[0]}
              alt={item.title}
              className="h-48 w-full rounded-2xl border border-ink-100 bg-ink-50/50 object-contain"
            />
          )}
          <div>
            <h3 className="text-lg font-bold leading-snug text-ink-900">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-600">
              {item.description || 'No description'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <span className="text-xs text-ink-400">Category</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                {categoryData?.icon && renderIcon(categoryData.icon, 18)}
                <span className="font-semibold text-ink-800">{item.category}</span>
              </div>
            </div>

            {/* Condition – primary-50 background + primary text with opacity */}
            <div>
              <span className="text-xs text-ink-400">Condition</span>
              <div className="mt-0.5">
                {conditionData ? (
                  <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700/80">
                    {conditionData.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700/80">
                    {item.condition}
                  </span>
                )}
              </div>
            </div>

            {/* Status – primary-50 background + primary text with opacity */}
            <div>
              <span className="text-xs text-ink-400">Status</span>
              <div className="mt-0.5">
                {statusData ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700/80">
                    <i className={statusData.icon} />
                    {statusData.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700/80">
                    {item.status}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-ink-400">Donor</span>
              <div className="mt-0.5 flex items-center gap-2">
                {item.donor?.avatar_url ? (
                  <img
                    src={item.donor.avatar_url}
                    alt={itemOwnerName}
                    className="h-6 w-6 rounded-full object-cover border border-ink-200"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                    {initials(itemOwnerName)}
                  </div>
                )}
                <span className="font-semibold text-ink-800">{itemOwnerName}</span>
              </div>
            </div>

            <div className="col-span-2">
              <span className="text-xs text-ink-400">Location</span>
              <p className="mt-0.5 font-semibold text-ink-800">
                {item.donor?.location || 'Not specified'}
              </p>
            </div>
          </div>

          <Link
            to={`/item/${itemId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View full item details <i className="bi bi-arrow-right text-xs" />
          </Link>
        </div>
      </Modal>

      {/* ─── REPORT MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report message"
        size="sm"
      >
        <div className="py-2">
          <p className="mb-3.5 text-sm leading-6 text-ink-500">
            Please explain why this message violates community standards.
          </p>
          <textarea
            rows={4}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Describe the issue…"
            className="w-full resize-none rounded-xl border border-ink-200 p-3.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="flex-1 rounded-xl bg-ink-100 px-2 py-2.5 font-semibold text-ink-700 hover:bg-ink-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReport}
              disabled={reporting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-2 py-2.5 font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {reporting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <i className="bi bi-flag" /> Submit report
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ItemDiscussionPage;
