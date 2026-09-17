import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
} from "framer-motion";
import {
  X,
  Send,
  User,
  ShieldCheck,
  Clock3,
  MessageCircle,
  Loader2,
  CheckCircle2,
  GripHorizontal,
  ChevronDown,
} from "lucide-react";

/** Normalize DB / API admin flags: true | 1 | "1" | "true" */
const toBoolAdmin = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string" && value.toLowerCase().trim() === "true") {
    return true;
  }
  return false;
};

const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 };

const TicketMessagesModal = ({
  isOpen,
  onClose,
  ticket,
  currentUser,
  onReply,
  loading = false,
  sending = false,
  isAdminView = undefined,
}) => {
  const [message, setMessage] = useState("");
  const [localSending, setLocalSending] = useState(false);
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const originalMessageRef = useRef(null);
  const dragControls = useDragControls();

  const isBusy = loading || sending || localSending;

  // --------------------------------------------------
  // CURRENT USER
  // --------------------------------------------------

  const currentUserId =
    currentUser?.id ||
    currentUser?.user?.id ||
    currentUser?.user_id ||
    currentUser?.profile?.id ||
    null;

  const isCurrentUserAdmin = (() => {
    if (typeof isAdminView === "boolean") {
      return isAdminView;
    }

    if (
      toBoolAdmin(currentUser?.is_admin) ||
      toBoolAdmin(currentUser?.user?.is_admin) ||
      toBoolAdmin(currentUser?.profile?.is_admin)
    ) {
      return true;
    }

    const role = String(
      currentUser?.role ||
        currentUser?.user?.role ||
        currentUser?.profile?.role ||
        ""
    )
      .toLowerCase()
      .trim();

    return ["admin", "super_admin", "superadmin"].includes(role);
  })();

  // --------------------------------------------------
  // REPLIES — support both ticket.replies and ticket.messages
  // --------------------------------------------------

  const replies = useMemo(() => {
    const list =
      (Array.isArray(ticket?.replies) && ticket.replies.length > 0
        ? ticket.replies
        : null) ||
      (Array.isArray(ticket?.messages) && ticket.messages.length > 0
        ? ticket.messages
        : null) ||
      [];

    return [...list]
      .filter(Boolean)
      .sort((a, b) => {
        const first = new Date(a?.created_at || 0).getTime();
        const second = new Date(b?.created_at || 0).getTime();
        return first - second;
      });
  }, [ticket?.replies, ticket?.messages]);

  const originalMessage =
    ticket?.description ||
    ticket?.reason ||
    "";

  // --------------------------------------------------
  // SCROLL
  // --------------------------------------------------

  const scrollToBottom = (behavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "nearest",
      });
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => scrollToBottom("auto"), 100);
    return () => clearTimeout(timer);
  }, [isOpen, ticket?.id]);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom("smooth");
  }, [replies.length, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setLocalSending(false);
      setIsOriginalExpanded(false);
      setIsDragging(false);
      setDragProgress(0);
    }
  }, [isOpen]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getMessageText = (reply) => {
    if (!reply) return "";
    if (typeof reply.message === "string" && reply.message.trim()) {
      return reply.message.trim();
    }
    return "";
  };

  const isAdminReply = (reply) => {
    if (!reply) return false;

    if (toBoolAdmin(reply.is_admin)) return true;
    if (toBoolAdmin(reply.sender?.is_admin)) return true;
    if (toBoolAdmin(reply.sender?.user?.is_admin)) return true;

    const senderRole = String(
      reply.sender?.role || reply.sender?.user?.role || ""
    )
      .toLowerCase()
      .trim();
    if (["admin", "super_admin", "superadmin"].includes(senderRole)) {
      return true;
    }

    return false;
  };

  const isOwnReply = (reply) => {
    if (!reply) return false;

    if (isCurrentUserAdmin) {
      return isAdminReply(reply);
    }

    if (currentUserId != null && reply.sender_id != null) {
      return String(reply.sender_id) === String(currentUserId);
    }
    if (currentUserId != null && reply.sender?.id != null) {
      return String(reply.sender.id) === String(currentUserId);
    }

    return false;
  };

  const getSenderName = (reply) => {
    if (isOwnReply(reply)) return "You";

    if (reply?.sender?.full_name) return reply.sender.full_name;

    if (isAdminReply(reply)) return "Support Team";

    if (isCurrentUserAdmin) {
      if (ticket?.reporter?.full_name) return ticket.reporter.full_name;
      if (ticket?.applicant?.full_name) return ticket.applicant.full_name;
      return "Client";
    }

    if (ticket?.reporter?.full_name) return ticket.reporter.full_name;
    if (ticket?.applicant?.full_name) return ticket.applicant.full_name;
    return "User";
  };

  // --------------------------------------------------
  // SEND
  // --------------------------------------------------

  const handleSend = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isBusy) return;

    try {
      setLocalSending(true);
      await onReply(cleanMessage);
      setMessage("");
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom("smooth");
      }, 50);
    } catch (error) {
      console.error("Failed to send ticket reply:", error);
    } finally {
      setLocalSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // --------------------------------------------------
  // DRAG HANDLERS FOR ORIGINAL MESSAGE
  // --------------------------------------------------

  const DRAG_THRESHOLD = 60;

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (event, info) => {
    const offset = info.offset.y;
    // Signed progress: 0..1 opening (drag down), 0..-1 closing (drag up while open)
    const progress = Math.min(Math.max(offset / DRAG_THRESHOLD, -1), 1);
    setDragProgress(progress);
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);

    const offset = info.offset.y;
    const velocity = info.velocity.y;

    // Treat a fast flick the same as crossing the threshold, so quick
    // gestures feel responsive instead of snapping back unexpectedly.
    const openedByGesture = offset > DRAG_THRESHOLD || velocity > 500;
    const closedByGesture =
      offset < -DRAG_THRESHOLD || velocity < -500;

    if (!isOriginalExpanded && openedByGesture) {
      setIsOriginalExpanded(true);
      setDragProgress(1);
    } else if (isOriginalExpanded && closedByGesture) {
      setIsOriginalExpanded(false);
      setDragProgress(0);
    } else {
      // Snap back to whatever state we were already in.
      setDragProgress(isOriginalExpanded ? 1 : 0);
    }
  };

  const toggleOriginalMessage = () => {
    setIsOriginalExpanded((prev) => {
      const next = !prev;
      setDragProgress(next ? 1 : 0);
      return next;
    });
  };

  // Smooth 0..1 value driven by both the live drag gesture and the
  // resting expanded/collapsed state, used to interpolate color/scale.
  const pullIntensity = isDragging
    ? Math.abs(dragProgress)
    : isOriginalExpanded
    ? 1
    : 0;

  // --------------------------------------------------
  // STATUS
  // --------------------------------------------------

  const status = String(ticket?.status || "open").toLowerCase();

  const statusMeta = {
    open: {
      label: "Open",
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-50 text-blue-700 border-blue-100",
    },
    resolved: {
      label: "Resolved",
      className: "bg-violet-50 text-violet-700 border-violet-100",
    },
    closed: {
      label: "Closed",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  const currentStatus = statusMeta[status] || statusMeta.open;
  const canReply = status !== "closed" && status !== "resolved";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="
              flex w-full max-w-2xl flex-col overflow-hidden
              rounded-2xl border border-slate-200 bg-white shadow-2xl
            "
            style={{
              height: "min(680px, calc(100vh - 48px))",
            }}
          >
            {/* HEADER */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-sm shadow-primary-500/20">
                      <MessageCircle size={17} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold text-slate-900">
                        Ticket Conversation
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {ticket?.reason || "Support request"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`
                      inline-flex items-center rounded-full border
                      px-2.5 py-1 text-[11px] font-semibold
                      ${currentStatus.className}
                    `}
                  >
                    {currentStatus.label}
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="
                      flex h-8 w-8 items-center justify-center rounded-lg
                      text-slate-400 transition-colors duration-150
                      hover:bg-slate-100 hover:text-slate-700
                    "
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
            </div>

            {/* ORIGINAL MESSAGE - pull-to-reveal, single interpolated gesture */}
            {originalMessage && (
              <div className="shrink-0 border-b border-slate-100 overflow-hidden">
                <motion.div
                  ref={originalMessageRef}
                  layout
                  transition={SPRING}
                  className="relative bg-slate-50/70"
                >
                  {/* Pull handle */}
                  <motion.div
                    drag="y"
                    dragControls={dragControls}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.5}
                    dragMomentum={false}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    onClick={toggleOriginalMessage}
                    animate={{
                      backgroundColor: isDragging
                        ? `rgba(226, 232, 240, ${0.55 + pullIntensity * 0.35})`
                        : isOriginalExpanded
                        ? "rgba(241, 245, 249, 0.9)"
                        : "rgba(241, 245, 249, 0)",
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    className="
                      relative z-10 flex cursor-grab touch-none select-none
                      items-center justify-center gap-2 py-2.5
                      active:cursor-grabbing
                    "
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      animate={{ scale: 1 + pullIntensity * 0.06 }}
                      transition={{ duration: 0.15, ease: EASE }}
                    >
                      <motion.div
                        animate={{ rotate: isOriginalExpanded ? 180 : 0 }}
                        transition={SPRING}
                      >
                        <GripHorizontal
                          size={16}
                          className={`transition-colors duration-150 ${
                            isOriginalExpanded || isDragging
                              ? "text-primary-500"
                              : "text-slate-400"
                          }`}
                        />
                      </motion.div>
                      <span className="text-[10px] font-medium text-slate-500">
                        {isOriginalExpanded
                          ? "Pull up to collapse"
                          : "Pull down to view ticket message"}
                      </span>
                      <motion.div
                        animate={{ rotate: isOriginalExpanded ? 180 : 0 }}
                        transition={SPRING}
                        className={`
                          flex h-5 w-5 items-center justify-center rounded-full
                          transition-colors duration-150
                          ${
                            isOriginalExpanded || isDragging
                              ? "bg-primary-50 text-primary-500"
                              : "bg-slate-200 text-slate-500"
                          }
                        `}
                      >
                        <ChevronDown size={12} />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Content */}
                  <AnimatePresence initial={false}>
                    {isOriginalExpanded && (
                      <motion.div
                        key="original-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="px-5 pb-4">
                          <div className="mt-5 flex items-start gap-3">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                              <MessageCircle size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Ticket message
                              </span>
                              <p className="text-[14px] leading-6 text-slate-700 whitespace-pre-wrap break-words">
                                {originalMessage}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* CHAT */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {replies.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <MessageCircle size={20} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      No replies yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Start the conversation below.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  {replies.map((reply, index) => {
                    const text = getMessageText(reply);
                    if (!text) return null;

                    const own = isOwnReply(reply);
                    const admin = isAdminReply(reply);
                    const replyKey = reply.id || `${reply.created_at}-${index}`;

                    return (
                      <motion.div
                        key={replyKey}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.25,
                          ease: EASE,
                          delay: Math.min(index * 0.02, 0.2),
                        }}
                        className={`
                          flex w-full
                          ${own ? "justify-end" : "justify-start"}
                        `}
                      >
                        <div
                          className={`
                            flex max-w-[78%] items-end gap-2
                            ${own ? "flex-row-reverse" : "flex-row"}
                          `}
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.15, ease: EASE }}
                            className={`
                              img flex h-7 w-7 shrink-0 items-center justify-center
                              overflow-hidden rounded-full
                              ${
                                own
                                  ? "bg-primary-500 text-white"
                                  : admin
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-slate-100 text-slate-500"
                              }
                            `}
                          >
                            {reply?.sender?.avatar_url ? (
                              <img
                                src={reply.sender.avatar_url}
                                alt=""
                                className="img h-full w-full object-cover"
                              />
                            ) : admin ? (
                              <ShieldCheck size={14} />
                            ) : (
                              <User size={14} />
                            )}
                          </motion.div>

                          <div
                            className={`min-w-0 ${
                              own ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`
                                mb-1 flex items-center gap-1.5
                                ${own ? "justify-end" : "justify-start"}
                              `}
                            >
                              <span className="text-[10px] font-semibold text-slate-500">
                                {getSenderName(reply)}
                              </span>
                              {admin && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">
                                  <ShieldCheck size={9} />
                                  Support
                                </span>
                              )}
                            </div>

                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.15, ease: EASE }}
                              className={`
                                rounded-2xl px-3.5 py-2.5 shadow-sm
                                ${
                                  own
                                    ? "rounded-br-md bg-primary-500 text-white"
                                    : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800"
                                }
                              `}
                            >
                              <p
                                className={`
                                  whitespace-pre-wrap break-words
                                  text-[13px] leading-5
                                  ${own ? "text-white" : "text-slate-700"}
                                `}
                              >
                                {text}
                              </p>
                            </motion.div>

                            <div
                              className={`
                                mt-1 flex items-center gap-1
                                ${own ? "justify-end" : "justify-start"}
                              `}
                            >
                              <Clock3 size={9} className="text-slate-300" />
                              <span className="text-[9px] text-slate-400">
                                {formatTime(reply.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  <div ref={messagesEndRef} className="h-px" />
                </div>
              )}
            </div>

            {/* COMPOSER */}
            <motion.div
              className="shrink-0 border-t border-slate-100 bg-white px-5 py-3"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {!canReply ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <CheckCircle2 size={20} className="text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-500">
                    This ticket is{" "}
                    {status === "resolved" ? "resolved" : "closed"} and
                    cannot receive new replies. Open a new ticket for any issue.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a reply..."
                    disabled={isBusy}
                    rows={1}
                    className="
                      h-[42px] min-h-[42px] max-h-[42px] flex-1 resize-none
                      overflow-y-auto rounded-xl border border-slate-200
                      bg-slate-50 px-3.5 py-2.5 text-[13px] leading-5
                      text-slate-800 outline-none transition-all duration-150
                      placeholder:text-slate-400
                      focus:border-primary-300 focus:bg-white
                      focus:ring-2 focus:ring-primary-500/10
                      disabled:cursor-not-allowed disabled:opacity-60
                    "
                  />
                  <motion.button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() || isBusy}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    className="
                      flex h-[42px] w-[42px] shrink-0 items-center
                      justify-center rounded-xl bg-primary-500 text-white
                      shadow-sm shadow-primary-500/20 transition-colors
                      duration-150 hover:bg-primary-600
                      disabled:cursor-not-allowed disabled:bg-slate-200
                      disabled:text-slate-400 disabled:shadow-none
                    "
                    aria-label="Send reply"
                  >
                    {isBusy ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2 size={16} />
                      </motion.div>
                    ) : (
                      <Send size={16} strokeWidth={2} />
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TicketMessagesModal;
