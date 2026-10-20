// src/apps/dti/pages/ItemDiscussionPage.jsx

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useCallback,
} from 'react';
import { DTI_BASE, makePaths } from "@/utils/routeBases";
					
import { Link, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { toast } from 'sonner';
import {
  MessageCircle,
  MessageSquare,
  Image as ImageIcon,
  Users,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Pin,
  Reply,
  Flag,
  Pencil,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Smile,
  Send,
  Lock,
  CheckCircle2,
  HelpCircle,
  Ban,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { itemDiscussionsAPI } from '@/services/api/dtiApi';
import { useWebSocketContext } from '@/reusables/Websocket';
import { useBreakpoint } from '@/reusables/Breakpoint';

import {
  getCategoryByValue,
  getConditionByValue,
  getStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import Modal from '@/reusables/Modal';

const QUICK_EMOJIS = [
  '👍', '❤️', '😂', '🙏', '🎉', '😊', '👏', '🔥',
  '😍', '😢', '😮', '👀', '✅', '💯', '🤔', '😅',
];

/* ============================================================
   HELPERS
============================================================ */

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
      threads.set(rootId, { root: byId.get(rootId), replies: [] });
    }
    if (message.id !== rootId) {
      threads.get(rootId).replies.push(message);
    }
  });

  threads.forEach((thread) => {
    thread.replies.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  });

  return Array.from(threads.values()).sort(
    (a, b) => new Date(a.root.created_at) - new Date(b.root.created_at)
  );
};

const renderContent = (text, names) => {
  if (!names.length) return text;
  const pattern = new RegExp(
    `@(${names
      .map(escapeRegex)
      .sort((a, b) => b.length - a.length)
      .join('|')})`,
    'g'
  );
  return text.split(pattern).map((part, index) =>
    names.includes(part) ? (
      <span key={index} className="font-extrabold text-primary-600">
        @{part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
};

/* ============================================================
   SKELETON
============================================================ */

const DiscussionSkeleton = () => (
  <div className="space-y-6 p-1">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex animate-pulse gap-3.5">
        <div className="h-10 w-10 shrink-0 rounded-full bg-ink-100" />

        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-2.5 w-32 rounded-full bg-ink-100" />
          <div className="h-3.5 w-full max-w-xl rounded-full bg-ink-100" />
          <div className="h-3.5 w-3/5 rounded-full bg-ink-100" />
        </div>
      </div>
    ))}
  </div>
);

/* ============================================================
   AVATAR
============================================================ */

const Avatar = ({ user, size = 'md', ring = false, name = null }) => {
  const sizes = {
    xs: 'h-6 w-6 text-[9px]',
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-11 w-11 text-sm',
  };
  const cls = sizes[size] || sizes.md;

  const displayName = name || user?.full_name || 'User';

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={displayName}
        className={`${cls} shrink-0 rounded-full object-cover ${
          ring
            ? 'ring-2 ring-primary-400/70 ring-offset-2 ring-offset-white'
            : ''
        }`}
      />
    );
  }

  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-600 font-extrabold text-white ${
        ring
          ? 'ring-2 ring-primary-400/70 ring-offset-2 ring-offset-white'
          : ''
      }`}
    >
      {initials(displayName)}
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */

const EmptyState = ({ canPost }) => (
  <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
        <MessageSquare size={27} />
      </div>

      <h2 className="mt-5 text-lg font-black text-ink-950">
        Start the conversation
      </h2>

      <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
        {canPost
          ? 'Ask a question, share useful information, or help someone with this item.'
          : 'Sign in to ask a question or join the conversation.'}
      </p>
    </div>
  </div>
);

/* ============================================================
   EMOJI PICKER
============================================================ */

const SimpleEmojiPicker = ({ onSelect }) => (
  <div className="w-64 rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
    <div className="grid grid-cols-8 gap-1">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="h-8 w-8 rounded-lg text-lg transition-colors hover:bg-ink-50"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

/* ============================================================
   MENTION DROPDOWN
============================================================ */

const MentionDropdown = ({ query, participants, onSelect }) => {
  const filtered = participants
    .filter((p) =>
      getDisplayName(p).toLowerCase().startsWith(query.trim().toLowerCase())
    )
    .slice(0, 5);

  if (!filtered.length) return null;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 max-h-52 w-64 overflow-y-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-sm">
      {filtered.map((participant) => {
        const displayName = getDisplayName(participant);
        return (
          <button
            key={participant.id}
            type="button"
            onClick={() => onSelect(participant, displayName)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-primary-50"
          >
            <Avatar user={participant} size="xs" name={displayName} />

            <span className="truncate text-sm font-extrabold text-ink-700">
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ============================================================
   MESSAGE ROW
============================================================ */

const MessageRow = forwardRef(
  (
    {
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
    },
    ref
  ) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(message.content || '');
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isOwner = message.user_id === currentUserId;
    const isItemOwnerActing = itemOwnerId && currentUserId === itemOwnerId;
    const isSenderAdmin =
      message.user?.role === 'admin' ||
      message.user?.role === 'super_admin';
    const canDelete =
      (isOwner || isItemOwnerActing || isAdmin) && !message.is_deleted;
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
        className="group relative"
      >
        <div
          className={`relative flex gap-3 rounded-2xl px-2.5 py-2.5 transition-colors sm:gap-3.5 ${
            isHighlighted
              ? 'bg-warning-50 ring-1 ring-warning-200'
              : 'hover:bg-ink-50/60'
          }`}
        >
          {isHighlighted && (
            <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-warning-400" />
          )}

          <Avatar
            user={message.user}
            size={isReply ? 'sm' : 'md'}
            ring={isDonorMessage}
            name={displayName}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-[13px] font-extrabold text-ink-950">
                {displayName}
              </span>

              {isDonorMessage && (
                <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-700">
                  Donor
                </span>
              )}

              {isSenderAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-warning-700">
                  <ShieldCheck size={9} />
                  Moderator
                </span>
              )}

              <span className="text-xs text-ink-300">·</span>

              <span
                className="text-[11px] font-bold text-ink-400"
                title={format(new Date(message.created_at), 'PPpp')}
              >
                {formatDistanceToNowStrict(new Date(message.created_at), {
                  addSuffix: true,
                })}
              </span>

              {message.is_edited && !message.is_deleted && (
                <span className="text-[11px] italic text-ink-300">edited</span>
              )}

              {isHighlighted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-warning-700">
                  <Pin size={8} />
                  Reported
                </span>
              )}
            </div>

            {isReply && parentAuthorName && !message.is_deleted && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink-400">
                <Reply size={9} />
                replying to{' '}
                <span className="font-extrabold text-ink-500">
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
                  className="input-field resize-none"
                />

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={submitEdit}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-primary-600 px-3.5 text-xs font-extrabold text-white transition hover:bg-primary-700"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditValue(message.content || '');
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-ink-200 bg-white px-3.5 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-6 ${
                  message.is_deleted ? 'italic text-ink-400' : 'text-ink-700'
                }`}
              >
                {message.is_deleted ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Ban size={12} className="opacity-70" />
                    This message was deleted
                  </span>
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
                      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-ink-400 transition hover:text-primary-600"
                    >
                      <Reply size={11} />
                      Reply
                    </button>

                    <button
                      type="button"
                      onClick={() => onReport(message.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-ink-400 transition hover:text-danger-600"
                    >
                      <Flag size={11} />
                      Report
                    </button>
                  </>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-ink-400 transition hover:text-ink-700"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-ink-400 transition hover:text-danger-600"
                  >
                    <Trash2 size={11} />
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
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 px-3 py-2.5">
                    <AlertTriangle size={14} className="text-danger-600" />

                    <button
                      type="button"
                      onClick={() => {
                        onDelete(message.id);
                        setDeleteOpen(false);
                      }}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-danger-600 px-3 text-xs font-extrabold text-white transition hover:bg-danger-700"
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-extrabold text-ink-600 transition hover:bg-white"
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
  }
);

MessageRow.displayName = 'MessageRow';

/* ============================================================
   THREAD ACCORDION
============================================================ */

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

  useEffect(() => {
    if (
      root.id === highlightedId ||
      replies.some((r) => r.id === highlightedId)
    ) {
      setExpanded(true);
    }
  }, [highlightedId, root.id, replies]);

  const setRootRef = useCallback(
    (el) => {
      if (messageRefs) {
        if (el) messageRefs.current.set(root.id, el);
        else messageRefs.current.delete(root.id);
      }
    },
    [messageRefs, root.id]
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
        <div className="ml-8 mt-2 sm:ml-12">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-primary-600 transition hover:text-primary-700"
            >
              <ChevronDown size={12} />
              Show {replies.length} reply{replies.length > 1 ? 's' : ''}
            </button>
          ) : (
            <AnimatePresence initial={false}>
              <motion.div
                key="replies"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
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
                          height: {
                            duration: 0.22,
                            ease: [0.4, 0, 0.2, 1],
                          },
                          opacity: { duration: 0.15 },
                        },
                      }
                }
                className="overflow-hidden"
              >
                <div className="ml-1 mt-1 space-y-1 border-l-2 border-ink-100 pl-3 sm:pl-4">
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
                    className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-ink-400 transition hover:text-ink-600"
                  >
                    <ChevronUp size={12} />
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

/* ============================================================
   MAIN PAGE
============================================================ */

const ItemDiscussionPage = () => {
  const { itemId } = useParams();
  const location = useLocation();
		const { to } = makePaths(DTI_BASE);
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { isConnected, joinDiscussion, leaveDiscussion } =
    useWebSocketContext();

  const reduceMotion = useReducedMotion();
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
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
     FETCH
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!itemId) {
      setError('No item ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    itemDiscussionsAPI
      .getByItem(itemId)
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
     WEBSOCKET
  ---------------------------------------------------------- */
  useEffect(() => {
    joinDiscussion(itemId);

    const handleNew = (event) => {
      const message = event.detail;
      if (message.item_id !== itemId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    };
    const handleUpdate = (event) => {
      const message = event.detail;
      if (message.item_id !== itemId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    };
    const handleDelete = (event) => {
      const { id, itemId: eventItemId } = event.detail;
      if (eventItemId !== itemId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_deleted: true, content: '' } : m
        )
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
     DERIVED
  ---------------------------------------------------------- */
  const threads = useMemo(() => groupIntoThreads(messages), [messages]);

  const sortedThreads = useMemo(() => {
    let highlightThreadIndex = -1;
    if (highlightedId) {
      highlightThreadIndex = threads.findIndex(
        (thread) =>
          thread.root.id === highlightedId ||
          thread.replies.some((r) => r.id === highlightedId)
      );
    }
    if (highlightThreadIndex <= 0) return threads;
    const highlighted = threads[highlightThreadIndex];
    return [
      highlighted,
      ...threads.filter((_, i) => i !== highlightThreadIndex),
    ];
  }, [threads, highlightedId]);

  const participants = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      if (message.user && !message.is_deleted)
        map.set(message.user.id, message.user);
    });
    return Array.from(map.values());
  }, [messages]);

  const participantNames = useMemo(
    () => participants.map((p) => getDisplayName(p)).filter(Boolean),
    [participants]
  );

  /* ----------------------------------------------------------
     HIGHLIGHT DEEP LINKS
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!highlightMessageId || loading || messages.length === 0) return;

    const target = messages.find((m) => m.id === highlightMessageId);
    if (!target) return;

    setHighlightedId(highlightMessageId);

    const timer = setTimeout(() => {
      const element = messageRefs.current.get(highlightMessageId);
      if (element) {
        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });

        setTimeout(() => setHighlightedId(null), 30000);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [highlightMessageId, loading, messages, reduceMotion]);

  /* ----------------------------------------------------------
     COMPOSER HANDLERS
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
    if (
      between.includes('\n') ||
      between.length > 30 ||
      /\s{2,}/.test(between)
    ) {
      setMentionOpen(false);
      return;
    }

    setMentionQuery(between);
    setMentionStart(atIndex);
    setMentionOpen(true);
  };

  const selectMention = useCallback(
    (participant, displayName) => {
      const before = content.slice(0, mentionStart);
      const after = content.slice(mentionStart + 1 + mentionQuery.length);
      const insert = `@${displayName} `;
      const newValue = `${before}${insert}${after}`;
      setContent(newValue);
      setMentions((prev) =>
        prev.some((m) => m.id === participant.id) ? prev : [...prev, participant]
      );
      setMentionOpen(false);
      requestAnimationFrame(() => {
        const position = before.length + insert.length;
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(position, position);
      });
    },
    [content, mentionStart, mentionQuery.length]
  );

  const insertEmoji = useCallback(
    (emoji) => {
      const element = textareaRef.current;
      const position = element?.selectionStart ?? content.length;
      const newValue =
        content.slice(0, position) + emoji + content.slice(position);
      setContent(newValue);
      setShowEmoji(false);
      requestAnimationFrame(() => {
        const nextPosition = position + emoji.length;
        element?.focus();
        element?.setSelectionRange(nextPosition, nextPosition);
      });
    },
    [content]
  );

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
          .map((mention) => mention.id)
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
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      resetComposer();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post message');
    } finally {
      setPosting(false);
    }
  }, [content, posting, mentions, replyingTo, itemId, resetComposer]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !mentionOpen) {
        event.preventDefault();
        handleSend();
      }
    },
    [mentionOpen, handleSend]
  );

  const handleReply = useCallback(
    (message) => {
      setReplyingTo(message);
      setTimeout(() => {
        composerRef.current?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });
        textareaRef.current?.focus();
      }, 100);
    },
    [reduceMotion]
  );

  /* ----------------------------------------------------------
     MESSAGE ACTIONS
  ---------------------------------------------------------- */
  const handleEdit = useCallback(
    async (id, newContent) => {
      const previous = messages.find((m) => m.id === id);
      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? { ...message, content: newContent, is_edited: true }
            : message
        )
      );
      try {
        await itemDiscussionsAPI.update(id, newContent);
      } catch {
        toast.error('Failed to update message');
        if (previous) {
          setMessages((current) =>
            current.map((message) =>
              message.id === id ? previous : message
            )
          );
        }
      }
    },
    [messages]
  );

  const handleDelete = useCallback(
    async (id) => {
      const previous = messages.find((m) => m.id === id);
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, is_deleted: true } : message
        )
      );
      try {
        await itemDiscussionsAPI.remove(id);
      } catch {
        toast.error('Failed to delete message');
        if (previous) {
          setMessages((current) =>
            current.map((message) =>
              message.id === id ? previous : message
            )
          );
        }
      }
    },
    [messages]
  );

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
      await itemDiscussionsAPI.report(
        reportMessageId,
        reportReason,
        reportReason
      );
      toast.success('Report submitted. Our team will review it.');
      setShowReportModal(false);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          'Failed to submit report. Please try again.'
      );
    } finally {
      setReporting(false);
    }
  }, [reportReason, reportMessageId]);

  /* ----------------------------------------------------------
     LOADING / ERROR
  ---------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto w-full max-w-[1200px] p-2 pb-8 sm:p-4">
          <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
            <DiscussionSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto w-full max-w-[1200px] p-2 pb-8 sm:p-4">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-danger-50 text-danger-600">
                <AlertCircle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                {error || 'Item not found'}
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                We couldn't load this discussion. Please go back and try again.
              </p>

              <Link
                to={to ("/")}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                <ArrowRight size={15} className="rotate-180" />
                Back to items
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const itemOwnerId = item.donor_id;
  const itemOwnerName = item.donor?.full_name || 'Unknown';

  const categoryData = getCategoryByValue(item.category);
  const conditionData = getConditionByValue(item.condition);
  const statusData = getStatusDisplay(item.status);

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1200px] p-2 pb-2 sm:p-4">
        {/*
          ============================================================
          FIXED-HEIGHT SHELL — this is the key change.

          The entire discussion layout (sidebar + chat) now lives inside
          a container whose height is exactly the viewport minus padding.
          Because the outer shell has a BOUNDED height:
            - the page itself no longer scrolls
            - the composer can never scroll off-screen with the page
            - only the messages list inside the panel scrolls
          ============================================================
        */}
        <div className="flex mt-4 h-[calc(100dvh-16px)] flex-col gap-3 sm:h-[calc(100dvh-32px)] lg:h-[calc(100dvh-32px)] lg:flex-row lg:gap-4">
          {/* ==================================================
              SIDEBAR — Item Context
          ================================================== */}
          <aside className="shrink-0 overflow-y-auto max-h-[40vh] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:max-h-full lg:w-80">
            <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-300">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-extrabold tracking-tight text-ink-950">
                    {item.title}
                  </h2>

                  <div className="mt-1 flex items-center gap-1.5">
                    {categoryData &&
                      renderIcon(
                        categoryData.icon,
                        'h-3.5 w-3.5',
                        categoryData.color
                      )}

                    <span className="text-xs font-bold text-ink-500">
                      {item.category}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {item.donor?.avatar_url ? (
                      <img
                        src={item.donor.avatar_url}
                        alt={itemOwnerName}
                        className="h-5 w-5 rounded-full border border-ink-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-[8px] font-extrabold text-primary-700">
                        {initials(itemOwnerName)}
                      </div>
                    )}

                    <span className="truncate text-[11px] font-bold text-ink-400">
                      Donated by{' '}
                      <span className="text-ink-700">{itemOwnerName}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowItemModal(true)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Full details
                <ArrowUpRight size={12} />
              </button>

              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-[11px] font-bold text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={12} />
                  {participants.length} participants
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 ${
                    isConnected ? 'text-success-600' : 'text-ink-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? 'animate-pulse bg-success-500' : 'bg-ink-300'
                    }`}
                  />
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </aside>

          {/* ==================================================
              MAIN — Discussion panel
              - header shrink-0
              - threads flex-1 min-h-0 overflow-y-auto
              - composer shrink-0  ← pinned to panel bottom
          ================================================== */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            {/* HEADER */}
            <header className="shrink-0 border-b border-ink-100 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <MessageSquare size={15} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-extrabold text-ink-950">
                      Discussion
                    </h2>
                    <p className="text-[10px] font-bold text-ink-400">
                      {messages.length} messages
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-[11px] font-bold text-ink-400 sm:inline">
                    {participants.length} participants
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowParticipantsModal(true)}
                    className="flex items-center -space-x-1.5"
                    aria-label="View participants"
                  >
                    {participants.slice(0, 3).map((p) => (
                      <Avatar
                        key={p.id}
                        user={p}
                        size="xs"
                        name={getDisplayName(p)}
                      />
                    ))}
                  </button>
                </div>
              </div>
            </header>

            {/* THREADS — the only scrollable region inside the panel */}
            <section
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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

            {/* COMPOSER — always at the bottom of the panel */}
            {isAuthenticated ? (
              <div
                ref={composerRef}
                className="shrink-0 border-t border-ink-100 bg-white p-4 shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.06)]"
              >
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-3 py-2.5">
                        <Reply size={13} className="shrink-0 text-primary-600" />

                        <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-primary-700">
                          Replying to{' '}
                          <span className="font-extrabold">
                            {getDisplayName(replyingTo.user)}
                          </span>
                          <span className="text-primary-500">
                            {' '}
                            — {replyingTo.content?.slice(0, 55)}
                            {replyingTo.content?.length > 55 ? '…' : ''}
                          </span>
                        </p>

                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="shrink-0 text-primary-500 transition hover:text-primary-700"
                          aria-label="Cancel reply"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-3">
                  <Avatar
                    user={user}
                    size={isMobile ? 'sm' : 'md'}
                    name={getDisplayName(user)}
                  />

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
                          className="absolute bottom-full right-0 z-40 mb-2"
                        >
                          <SimpleEmojiPicker onSelect={insertEmoji} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center rounded-2xl border border-ink-200 bg-ink-50/50 shadow-sm transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20">
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder={
                          replyingTo ? 'Replying…' : 'Write a message…'
                        }
                        className="block max-h-28 min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm font-medium text-ink-800 outline-none placeholder:text-ink-400"
                      />

                      <div className="flex items-center gap-1 pb-2 pr-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowEmoji((v) => !v)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                            showEmoji
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-ink-400 hover:bg-ink-100 hover:text-primary-600'
                          }`}
                          aria-label="Emoji picker"
                        >
                          <Smile size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={!content.trim() || posting}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-xs font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {posting ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <span>Send</span>
                              <Send size={11} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="mt-1 text-center text-[10px] font-bold text-ink-400">
                      use @ to mention anyone in the conversation
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-between gap-4 border-t border-ink-100 bg-ink-50/50 p-4 shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-400">
                    <Lock size={15} />
                  </div>

                  <p className="text-sm font-extrabold text-ink-800">
                    Join the conversation
                  </p>
                </div>

                <Link
                  to={to("/login")}
                  state={{ from: location.pathname }}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Sign in
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ============================================================
          PARTICIPANTS MODAL
      ============================================================ */}

      <Modal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        title="Participants"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink-500">
            {participants.length} participants in this discussion
          </p>

          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {participants.map((participant) => {
              const displayName = getDisplayName(participant);

              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-2.5"
                >
                  <Avatar user={participant} size="md" name={displayName} />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink-950">
                      {displayName}
                    </p>

                    <div className="mt-0.5">
                      {participant.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[9px] font-extrabold text-success-700">
                          <CheckCircle2 size={9} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[9px] font-extrabold text-ink-600">
                          <HelpCircle size={9} />
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 border-t border-ink-100 pt-3.5 text-[11px] font-bold text-ink-400">
            <MessageCircle size={12} />
            Total messages: {messages.length}
          </div>
        </div>
      </Modal>

      {/* ============================================================
          ITEM MODAL
      ============================================================ */}

      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Item details"
        size="md"
      >
        <div className="space-y-4">
          {item.images?.length > 0 && (
            <img
              src={item.images[0]}
              alt={item.title}
              className="h-48 w-full rounded-2xl border border-ink-100 bg-ink-50/50 object-contain"
            />
          )}

          <div>
            <h3 className="text-lg font-black leading-snug text-ink-950">
              {item.title}
            </h3>

            <p className="mt-1.5 text-sm font-medium leading-6 text-ink-600">
              {item.description || 'No description'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Category
              </span>

              <div className="mt-0.5 flex items-center gap-1.5">
                {categoryData &&
                  renderIcon(
                    categoryData.icon,
                    'h-4 w-4',
                    categoryData.color
                  )}

                <span className="font-extrabold text-ink-800">
                  {item.category}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Condition
              </span>

              <div className="mt-0.5">
                <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[11px] font-extrabold text-primary-700">
                  {conditionData?.label || item.condition}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Status
              </span>

              <div className="mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[11px] font-extrabold text-primary-700">
                  {statusData?.label || item.status}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Donor
              </span>

              <div className="mt-0.5 flex items-center gap-2">
                {item.donor?.avatar_url ? (
                  <img
                    src={item.donor.avatar_url}
                    alt={itemOwnerName}
                    className="h-6 w-6 rounded-full border border-ink-100 object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-[10px] font-extrabold text-primary-700">
                    {initials(itemOwnerName)}
                  </div>
                )}

                <span className="font-extrabold text-ink-800">
                  {itemOwnerName}
                </span>
              </div>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Location
              </span>

              <p className="mt-0.5 font-extrabold text-ink-800">
                {item.donor?.location?.country || 'Not specified'}
              </p>
            </div>
          </div>

          <Link
            to={to(`/item/${itemId}`)}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-600 transition hover:text-primary-700"
          >
            View full item details
            <ArrowRight size={12} />
          </Link>
        </div>
      </Modal>

      {/* ============================================================
          REPORT MODAL
      ============================================================ */}

      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report message"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <p className="text-sm font-medium leading-6 text-danger-700">
              Please explain why this message violates community standards.
            </p>
          </div>

          <textarea
            rows={4}
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Describe the issue…"
            className="input-field resize-none"
          />

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={submitReport}
              disabled={reporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reporting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag size={15} />
                  Submit report
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