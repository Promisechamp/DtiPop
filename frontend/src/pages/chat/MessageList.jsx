import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ArrowDown, Loader2, MessageCircle, Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";

/* ============================================================
   DATE HELPERS
============================================================ */

const sameDay = (a, b) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const formatDay = (iso) => {
	const d = new Date(iso);
	const now = new Date();
	const yesterday = new Date(now);

	yesterday.setDate(now.getDate() - 1);

	if (sameDay(d, now)) return "Today";
	if (sameDay(d, yesterday)) return "Yesterday";

	return d.toLocaleDateString([], {
		month: "short",
		day: "numeric",
		year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
	});
};

/* ============================================================
   DATE SEPARATOR
============================================================ */

function DateSeparator({ label }) {
	return (
		<div className="flex items-center justify-center py-5">
			<span
				className="
          rounded-full
          border
          border-ink-200
          bg-white
          px-3.5
          py-1.5
          text-[10px]
          font-extrabold
          tracking-wide
          text-ink-400
          shadow-xs
        "
			>
				{label}
			</span>
		</div>
	);
}

/* ============================================================
   TYPING INDICATOR
============================================================ */

function TypingIndicator({ users, other }) {
	if (!users?.length) return null;

	const name = users[0]?.name || other?.full_name || "Someone";

	return (
		<div className="flex items-end gap-2 px-1 pb-2 pt-3">
			<div
				className="
          flex
          items-center
          gap-1
          rounded-[18px]
          rounded-bl-md
          border
          border-ink-200
          bg-white
          px-3.5
          py-2.5
          shadow-xs
        "
			>
				{[0, 1, 2].map((i) => (
					<span
						key={i}
						className="typing-dot"
						style={{
							animationDelay: `${i * 0.15}s`,
						}}
					/>
				))}
			</div>

			<span className="pb-1 text-[10px] font-bold text-ink-400">
				{name} is typing…
			</span>
		</div>
	);
}

/* ============================================================
   LOADING
============================================================ */

function LoadingState() {
	return (
		<div className="flex h-full items-center justify-center">
			<div
				className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-2xl
          border
          border-primary-100
          bg-primary-50
          text-primary-600
        "
			>
				<Loader2 size={19} className="animate-spin" />
			</div>
		</div>
	);
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center px-6 text-center">
			<div
				className="
          relative
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-[22px]
          border
          border-primary-100
          bg-primary-50
          text-primary-600
          shadow-xs
        "
			>
				<MessageCircle size={25} strokeWidth={2.1} />

				<span
					className="
            absolute
            -right-1
            -top-1
            flex
            h-5
            w-5
            items-center
            justify-center
            rounded-full
            bg-white
            text-primary-500
            shadow-xs
          "
				>
					<Sparkles size={10} />
				</span>
			</div>

			<p className="mt-4 text-sm font-black text-ink-800">No messages yet</p>

			<p className="mt-1 max-w-[220px] text-[11px] font-medium leading-relaxed text-ink-400">
				Start the conversation by sending your first message.
			</p>
		</div>
	);
}

/* ============================================================
   LOADING MORE
============================================================ */

function LoadingMoreIndicator() {
	return (
		<div className="flex justify-center py-2">
			<div
				className="
          flex
          items-center
          gap-2
          rounded-full
          border
          border-ink-200
          bg-white
          px-3
          py-1.5
          shadow-xs
        "
			>
				<Loader2 size={12} className="animate-spin text-primary-500" />

				<span className="text-[10px] font-bold text-ink-400">
					Loading older messages
				</span>
			</div>
		</div>
	);
}

/* ============================================================
   MESSAGE LIST
============================================================ */

export default function MessageList({
	messages,
	loading,
	loadingMore,
	hasOlder,
	onLoadOlder,
	currentUserId,
	other,
	typingUsers = [],
	onReply,
	onEdit,
	onDelete,

	/*
    IMPORTANT:

    This comes from useMessages():

      isDeletingMessage

    Example:

      const {
        isDeletingMessage,
      } = useMessages(...);
  */
	isDeletingMessage,
}) {
	const scrollRef = useRef(null);
	const bottomRef = useRef(null);

	const [atBottom, setAtBottom] = useState(true);
	const [newBelow, setNewBelow] = useState(false);

	const lastCount = useRef(0);
	const previousScrollHeight = useRef(0);
	const initialized = useRef(false);

	/* ----------------------------------------------------------
     HYDRATE REPLIES ONLY

     No visual grouping is applied here.
     Every message remains its own independent bubble.
  ---------------------------------------------------------- */

	const preparedMessages = useMemo(() => {
		const byId = new Map();

		for (const message of messages || []) {
			if (message?.id) {
				byId.set(String(message.id), message);
			}
		}

		return (messages || []).map((message) => {
			if (message.reply_to || !message.reply_to_id) {
				return message;
			}

			return {
				...message,
				reply_to: byId.get(String(message.reply_to_id)) || null,
			};
		});
	}, [messages]);

	/* ----------------------------------------------------------
     SCROLL TRACKING
  ---------------------------------------------------------- */

	const handleScroll = useCallback(() => {
		const element = scrollRef.current;

		if (!element) return;

		const distanceFromBottom =
			element.scrollHeight - element.scrollTop - element.clientHeight;

		const isNearBottom = distanceFromBottom < 80;

		setAtBottom(isNearBottom);

		if (isNearBottom) {
			setNewBelow(false);
		}

		if (element.scrollTop < 70 && hasOlder && !loadingMore) {
			previousScrollHeight.current = element.scrollHeight;

			onLoadOlder?.();
		}
	}, [hasOlder, loadingMore, onLoadOlder]);

	/* ----------------------------------------------------------
     KEEP POSITION WHEN OLDER MESSAGES ARE PREPENDED
  ---------------------------------------------------------- */

	useLayoutEffect(() => {
		const element = scrollRef.current;

		if (!element || !previousScrollHeight.current) {
			return;
		}

		const delta = element.scrollHeight - previousScrollHeight.current;

		if (delta > 0) {
			element.scrollTop = delta;
		}

		previousScrollHeight.current = 0;
	}, [messages.length]);

	/* ----------------------------------------------------------
     INITIAL SCROLL
  ---------------------------------------------------------- */

	useEffect(() => {
		const element = scrollRef.current;

		if (!element || !messages.length || initialized.current) {
			return;
		}

		initialized.current = true;

		requestAnimationFrame(() => {
			element.scrollTop = element.scrollHeight;

			setAtBottom(true);
		});
	}, [messages.length]);

	/* ----------------------------------------------------------
     NEW MESSAGE AUTO-SCROLL
  ---------------------------------------------------------- */

	useEffect(() => {
		const element = scrollRef.current;

		if (!element) return;

		const grew = messages.length > lastCount.current;

		lastCount.current = messages.length;

		if (!grew || !initialized.current) {
			return;
		}

		if (atBottom) {
			requestAnimationFrame(() => {
				bottomRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "end",
				});
			});
		} else {
			setNewBelow(true);
		}
	}, [messages.length, atBottom]);

	/* ----------------------------------------------------------
     RESET WHEN CONVERSATION CHANGES
  ---------------------------------------------------------- */

	useEffect(() => {
		initialized.current = false;
		lastCount.current = 0;
		previousScrollHeight.current = 0;

		setAtBottom(true);
		setNewBelow(false);
	}, [other?.id]);

	/* ----------------------------------------------------------
     JUMP TO BOTTOM
  ---------------------------------------------------------- */

	const jumpToBottom = useCallback(() => {
		bottomRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});

		setNewBelow(false);
		setAtBottom(true);
	}, []);

	/* ----------------------------------------------------------
     RENDER STATES
  ---------------------------------------------------------- */

	if (loading) {
		return <LoadingState />;
	}

	if (!messages?.length) {
		return <EmptyState />;
	}

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden bg-ink-50/40">
		
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="
          h-full
          overflow-y-auto
          overscroll-contain
          px-3
          pb-5
          pt-2
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
			>
				{loadingMore && <LoadingMoreIndicator />}

				{!hasOlder && messages.length > 6 && (
					<div className="flex justify-center py-3">
						<span
							className="
                  rounded-full
                  border
                  border-ink-200
                  bg-white
                  px-3
                  py-1
                  text-[9px]
                  font-extrabold
                  uppercase
                  tracking-wider
                  text-ink-300
                "
						>
							Beginning of conversation
						</span>
					</div>
				)}

				<div className="flex flex-col">
					{preparedMessages.map((message, index) => {
						const currentDate = new Date(
							message.created_at || Date.now(),
						).toDateString();

						const previousMessage = preparedMessages[index - 1];

						const previousDate = previousMessage
							? new Date(previousMessage.created_at || Date.now()).toDateString()
							: null;

						const showDate = index === 0 || currentDate !== previousDate;

						/*
                IMPORTANT:

                Resolve deletion state using the
                actual message ID.

                This means while the DELETE request
                is pending, MessageBubble receives:

                  isDeleting={true}

                and can show:

                  Deleting…

                with a spinner.
              */
						const deleting =
							typeof isDeletingMessage === "function"
								? isDeletingMessage(message.id)
								: false;

						return (
							<React.Fragment
								key={
									message.id ||
									message.__tempId ||
									`message_${message.created_at}_${index}`
								}
							>
								{showDate && <DateSeparator label={formatDay(message.created_at)} />}

								<div className="py-[3px]">
									<MessageBubble
										message={message}
										isMine={String(message.sender_id) === String(currentUserId)}
										other={other}
										onReply={onReply}
										onEdit={onEdit}
										onDelete={onDelete}

										/*
                        THIS IS THE IMPORTANT
                        ADDITION.
                      */
										isDeleting={deleting}
									/>
								</div>
							</React.Fragment>
						);
					})}
				</div>

				<TypingIndicator users={typingUsers} other={other} />

				<div ref={bottomRef} className="h-px" />
			</div>

			{/* ======================================================
          NEW MESSAGES
      ====================================================== */}

			{newBelow && (
				<button
					type="button"
					onClick={jumpToBottom}
					className="
            absolute
            bottom-4
            left-1/2
            z-20
            flex
            -translate-x-1/2
            items-center
            gap-2
            rounded-full
            border
            border-primary-500
            bg-primary-600
            px-4
            py-2
            text-[10px]
            font-black
            text-white
            shadow-primary
            transition-all
            duration-200
            hover:-translate-x-1/2
            hover:bg-primary-700
            active:scale-95
          "
				>
					<span
						className="
              flex
              h-4
              w-4
              items-center
              justify-center
              rounded-full
              bg-white/15
            "
					>
						<ArrowDown size={11} strokeWidth={2.5} />
					</span>

					<span>New messages</span>
				</button>
			)}

			{/* ======================================================
          JUMP TO LATEST
      ====================================================== */}

			{!atBottom && !newBelow && (
				<button
					type="button"
					onClick={jumpToBottom}
					aria-label="Jump to latest"
					title="Jump to latest"
					className="
              absolute
              bottom-4
              right-4
              z-20
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-ink-200
              bg-white
              text-ink-600
              shadow-card
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:border-primary-200
              hover:bg-primary-50
              hover:text-primary-600
              active:scale-95
            "
				>
					<ArrowDown size={16} strokeWidth={2.4} />
				</button>
			)}
		</div>
	);
}
