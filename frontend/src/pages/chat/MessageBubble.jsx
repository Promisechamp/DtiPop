import React, { useCallback, useEffect, useRef, useState } from "react";

import {
	AlertCircle,
	Check,
	CheckCheck,
	Clock,
	Copy,
	Download,
	Loader2,
	FileText,
	MoreHorizontal,
	Pencil,
	Reply,
	Trash2,
} from "lucide-react";

/* ============================================================
   HELPERS
============================================================ */

const getMessageText = (message) =>
	message?.content ?? message?.text ?? message?.body ?? "";

const getSenderName = (message, fallback = "Message") =>
	message?.sender?.full_name ||
	message?.sender?.name ||
	message?.sender_name ||
	message?.author_name ||
	fallback;

const getAttachment = (message) =>
	message?.attachments?.[0] ||
	message?.attachment ||
	message?.meta?.attachment ||
	null;

const formatFileSize = (bytes) => {
	if (
		bytes === null ||
		bytes === undefined ||
		bytes === "" ||
		Number.isNaN(Number(bytes))
	) {
		return "";
	}

	const size = Number(bytes);

	if (size < 1024) {
		return `${size} B`;
	}

	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} KB`;
	}

	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

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

const isImageAttachment = (attachment) => {
	if (!attachment) return false;

	const type =
		attachment.type || attachment.mime_type || attachment.mimeType || "";

	const url = attachment.url || attachment.file_url || attachment.fileUrl || "";

	return (
		type.startsWith("image/") ||
		/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url)
	);
};

const getFileExt = (name = "") => {
	if (!name.includes(".")) {
		return "";
	}

	const ext = name.split(".").pop() || "";

	return ext.length <= 4 ? ext.toUpperCase() : "";
};

const EMOJI_ONLY =
	/^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D|\p{Emoji_Modifier})*\s*){1,3}$/u;

const isDeletedMessage = (message) =>
	Boolean(
		message?.is_deleted ||
		message?.isDeleted ||
		message?.deleted_at ||
		message?.deletedAt,
	);

const vibrate = (pattern = 12) => {
	try {
		if (
			typeof navigator !== "undefined" &&
			typeof navigator.vibrate === "function"
		) {
			navigator.vibrate(pattern);
		}
	} catch {
		// Vibration unavailable.
	}
};

/* ============================================================
   REPLY RESOLUTION
============================================================ */

const getReplyObject = (message) => {
	const raw =
		message?.reply_to ??
		message?.replyTo ??
		message?.replied_to ??
		message?.repliedTo ??
		null;

	if (Array.isArray(raw)) {
		return raw[0] ?? null;
	}

	return raw;
};

const getReplyId = (message) =>
	message?.reply_to_id ??
	message?.replyToId ??
	message?.replied_to_id ??
	message?.repliedToId ??
	getReplyObject(message)?.id ??
	null;

const resolveReplyTo = (message, messageList = []) => {
	const directReply = getReplyObject(message);

	if (directReply) {
		return directReply;
	}

	const replyId = getReplyId(message);

	if (!replyId) {
		return null;
	}

	const original = messageList.find(
		(item) => String(item?.id || item?.message_id) === String(replyId),
	);

	return original || null;
};

/* ============================================================
   STATUS
============================================================ */

function StatusIcon({ status, isRead, isMine }) {
	if (!isMine) {
		return null;
	}

	if (status === "sending") {
		return <Clock size={12} strokeWidth={2.2} className="text-white/60" />;
	}

	if (status === "failed") {
		return <AlertCircle size={12} strokeWidth={2.2} className="text-red-200" />;
	}

	if (isRead || status === "read") {
		return <CheckCheck size={14} strokeWidth={2.4} className="text-sky-300" />;
	}

	if (status === "delivered") {
		return <CheckCheck size={14} strokeWidth={2.4} className="text-white/70" />;
	}

	return <Check size={14} strokeWidth={2.4} className="text-white/70" />;
}

/* ============================================================
   REPLY ARROW
============================================================ */

function ReplyArrow({ isMine }) {
	return (
		<svg
			viewBox="0 0 20 36"
			preserveAspectRatio="none"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className={`
				h-full
				w-5
				shrink-0
				${isMine ? "text-white/70" : "text-primary-500"}
			`}
		>
			<path
				d="M 12 3 C 4 12, 3 24, 13 30 L 17 30"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			<path
				d="M 14.5 27 L 17.5 30 L 14.5 33"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

/* ============================================================
   REPLY REFERENCE
============================================================ */

function ReplyReference({ replyTo, isMine, onClick }) {
	if (!replyTo) {
		return null;
	}

	const senderName = getSenderName(replyTo, "Message");

	const text = String(getMessageText(replyTo) || "").trim();

	const attachment = getAttachment(replyTo);

	const image =
		isImageAttachment(attachment) &&
		(attachment?.url || attachment?.file_url || attachment?.fileUrl);

	const attachmentName =
		attachment?.name || attachment?.file_name || attachment?.filename || "";

	const deleted = isDeletedMessage(replyTo);

	let preview = text;

	if (deleted) {
		preview = "This message was deleted";
	} else if (!preview) {
		if (image) {
			preview = "Photo";
		} else if (attachmentName) {
			preview = attachmentName;
		} else if (attachment) {
			preview = "Attachment";
		} else {
			preview = "Message";
		}
	}

	const truncated = preview.length > 90 ? `${preview.slice(0, 90)}…` : preview;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`
				group/reply
				mb-2.5
				flex
				w-full
				min-w-0
				items-stretch
				gap-2.5
				overflow-hidden
				rounded-xl
				border
				text-left
				outline-none
				transition-all
				duration-150
				active:scale-[0.99]

				${
					isMine
						? `
							border-white/15
							bg-black/10
							hover:bg-black/15
						`
						: `
							border-ink-200
							bg-ink-100/80
							hover:bg-ink-100
						`
				}
			`}
			aria-label={`Replying to ${senderName}`}
		>
			<span
				className={`
					flex
					w-1
					shrink-0
					rounded-l-xl
					${isMine ? "bg-white/70" : "bg-primary-500"}
				`}
				aria-hidden="true"
			/>

			<span className="flex min-w-0 flex-1 items-stretch gap-2.5 py-2 pr-2.5">
				<ReplyArrow isMine={isMine} />

				<span className="min-w-0 flex-1 self-center">
					<span
						className={`
							block
							truncate
							text-[11px]
							font-extrabold
							tracking-[-0.01em]
							${isMine ? "text-white" : "text-primary-600"}
						`}
					>
						{senderName}
					</span>

					<span
						className={`
							mt-0.5
							block
							truncate
							text-[12px]
							leading-[1.35]
							${
								deleted
									? isMine
										? "italic text-white/50"
										: "italic text-ink-400"
									: isMine
										? "text-white/70"
										: "text-ink-600"
							}
						`}
					>
						{truncated}
					</span>
				</span>

				{image && !deleted && (
					<img
						src={image}
						alt=""
						className="
							h-10
							w-10
							shrink-0
							self-center
							rounded-lg
							object-cover
						"
					/>
				)}
			</span>
		</button>
	);
}

/* ============================================================
   ATTACHMENT
============================================================ */

function Attachment({ message, isMine, hasText }) {
	const attachment = getAttachment(message);

	if (!attachment) {
		return null;
	}

	const url = attachment.url || attachment.file_url || attachment.fileUrl || "";

	const name =
		attachment.name ||
		attachment.file_name ||
		attachment.filename ||
		"Attachment";

	const size = formatFileSize(
		attachment.size || attachment.file_size || attachment.fileSize,
	);

	const marginBottom = hasText ? "mb-2" : "";

	if (isImageAttachment(attachment) && url) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				className={`
					group/img
					relative
					block
					overflow-hidden
					rounded-2xl
					${marginBottom}
				`}
			>
				<img
					src={url}
					alt={name}
					loading="lazy"
					className="
						block
						max-h-80
						w-full
						max-w-[320px]
						object-cover
						transition-transform
						duration-300
						group-hover/img:scale-[1.02]
					"
				/>
			</a>
		);
	}

	const ext = getFileExt(name);

	return (
		<a
			href={url || "#"}
			target={url ? "_blank" : undefined}
			rel={url ? "noreferrer" : undefined}
			download={!url ? name : undefined}
			onClick={(event) => {
				if (!url) {
					event.preventDefault();
				}
			}}
			className={`
				flex
				min-w-0
				items-center
				gap-3
				rounded-2xl
				px-3
				py-2.5
				transition-colors
				${marginBottom}
				${
					isMine
						? "bg-white/[0.14] hover:bg-white/[0.20]"
						: "bg-white hover:bg-ink-100"
				}
			`}
		>
			<span
				className={`
					flex
					h-10
					w-10
					shrink-0
					flex-col
					items-center
					justify-center
					rounded-xl
					${isMine ? "bg-white/20 text-white" : "bg-primary-50 text-primary-600"}
				`}
			>
				<FileText size={ext ? 14 : 17} strokeWidth={2.2} />

				{ext && (
					<span className="mt-0.5 text-[8px] font-bold leading-none">{ext}</span>
				)}
			</span>

			<span className="min-w-0 flex-1">
				<span
					className={`
						block
						truncate
						text-[13px]
						font-semibold
						${isMine ? "text-white" : "text-ink-800"}
					`}
				>
					{name}
				</span>

				{size && (
					<span
						className={`
							mt-0.5
							block
							text-[11px]
							${isMine ? "text-white/60" : "text-ink-400"}
						`}
					>
						{size}
					</span>
				)}
			</span>

			<Download
				size={16}
				strokeWidth={2.2}
				className={isMine ? "shrink-0 text-white/70" : "shrink-0 text-ink-400"}
			/>
		</a>
	);
}

/* ============================================================
   ACTION MENU
============================================================ */

function ActionMenu({
	x,
	y,
	isMine,
	isDeleted,
	isDeleting,
	onReply,
	onEdit,
	onDelete,
	onCopy,
	onClose,
}) {
	const menuRef = useRef(null);

	const [entered, setEntered] = useState(false);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setEntered(true);
		});

		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, []);

	useEffect(() => {
		const handlePointerDown = (event) => {
			if (!menuRef.current?.contains(event.target)) {
				onClose?.();
			}
		};

		const handleEscape = (event) => {
			if (event.key === "Escape") {
				onClose?.();
			}
		};

		const handleScroll = () => {
			onClose?.();
		};

		document.addEventListener("mousedown", handlePointerDown);

		document.addEventListener("touchstart", handlePointerDown, {
			passive: true,
		});

		document.addEventListener("keydown", handleEscape);

		window.addEventListener("scroll", handleScroll, true);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);

			document.removeEventListener("touchstart", handlePointerDown);

			document.removeEventListener("keydown", handleEscape);

			window.removeEventListener("scroll", handleScroll, true);
		};
	}, [onClose]);

	const menuWidth = 200;
	const menuMargin = 10;

	const menuHeight = isDeleting ? 70 : isDeleted ? 70 : isMine ? 220 : 120;

	const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;

	const viewportHeight =
		typeof window !== "undefined" ? window.innerHeight : 768;

	const left = Math.min(
		Math.max(menuMargin, Number(x) || menuMargin),
		Math.max(menuMargin, viewportWidth - menuWidth - menuMargin),
	);

	const top = Math.min(
		Math.max(menuMargin, Number(y) || menuMargin),
		Math.max(menuMargin, viewportHeight - menuHeight - menuMargin),
	);

	const itemClass = `
		flex
		w-full
		items-center
		gap-3
		rounded-xl
		px-2.5
		py-2
		text-left
		text-[13px]
		font-medium
		text-ink-700
		transition-colors
		hover:bg-ink-50
	`;

	const iconClass = `
		flex
		h-7
		w-7
		shrink-0
		items-center
		justify-center
		rounded-lg
		bg-ink-50
		text-ink-500
	`;

	return (
		<div
			ref={menuRef}
			role="menu"
			aria-label="Message actions"
			className={`
				fixed
				z-[200]
				w-[200px]
				origin-top
				overflow-hidden
				rounded-2xl
				border
				border-ink-100
				bg-white
				p-1.5
				shadow-actionMenu
				transition
				duration-150
				ease-out
				${entered ? "scale-100 opacity-100" : "scale-95 opacity-0"}
			`}
			style={{
				left,
				top,
			}}
		>
			{/* ======================================================
			    DELETING STATE
			====================================================== */}

			{isDeleting ? (
				<div
					className="
						flex
						w-full
						items-center
						gap-3
						rounded-xl
						px-2.5
						py-2.5
						text-[13px]
						font-semibold
						text-ink-500
					"
				>
					<span
						className="
							flex
							h-7
							w-7
							shrink-0
							items-center
							justify-center
							rounded-lg
							bg-ink-50
							text-primary-500
						"
					>
						<Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
					</span>

					<span>Deleting message…</span>
				</div>
			) : (
				<>
					{!isDeleted && (
						<button
							type="button"
							role="menuitem"
							className={itemClass}
							onClick={() => {
								onReply?.();
								onClose?.();
							}}
						>
							<span className={`${iconClass} !bg-primary-50 !text-primary-600`}>
								<Reply size={14} strokeWidth={2.3} />
							</span>
							Reply
						</button>
					)}

					{!isDeleted && (
						<button
							type="button"
							role="menuitem"
							className={itemClass}
							onClick={() => {
								onCopy?.();
								onClose?.();
							}}
						>
							<span className={iconClass}>
								<Copy size={14} strokeWidth={2.3} />
							</span>
							Copy text
						</button>
					)}

					{isMine && !isDeleted && (
						<button
							type="button"
							role="menuitem"
							className={itemClass}
							onClick={() => {
								onEdit?.();
								onClose?.();
							}}
						>
							<span className={iconClass}>
								<Pencil size={14} strokeWidth={2.3} />
							</span>
							Edit message
						</button>
					)}

					{!isDeleted && <div className="mx-2 my-1 h-px bg-ink-100" />}

					<button
						type="button"
						role="menuitem"
						className={itemClass}
						onClick={() => {
							onDelete?.("me");
							onClose?.();
						}}
					>
						<span className={iconClass}>
							<Trash2 size={14} strokeWidth={2.3} />
						</span>
						Delete for me
					</button>

					{isMine && !isDeleted && (
						<button
							type="button"
							role="menuitem"
							className="
								flex
								w-full
								items-center
								gap-3
								rounded-xl
								px-2.5
								py-2
								text-left
								text-[13px]
								font-medium
								text-red-500
								transition-colors
								hover:bg-red-50
							"
							onClick={() => {
								onDelete?.("everyone");
								onClose?.();
							}}
						>
							<span
								className="
									flex
									h-7
									w-7
									shrink-0
									items-center
									justify-center
									rounded-lg
									bg-red-50
									text-red-500
								"
							>
								<Trash2 size={14} strokeWidth={2.3} />
							</span>
							Delete for everyone
						</button>
					)}
				</>
			)}
		</div>
	);
}

/* ============================================================
   MESSAGE BUBBLE
============================================================ */

export default function MessageBubble({
	message,
	isMine,
	other,
	onReply,
	onEdit,
	onDelete,

	/*
	 * IMPORTANT:
	 * Parent should pass true while this message is being deleted.
	 */
	isDeleting = false,

	messageList = [],
}) {
	const [menuPos, setMenuPos] = useState(null);

	const [copied, setCopied] = useState(false);

	const [replyPulse, setReplyPulse] = useState(false);

	const longPressTimer = useRef(null);

	const swipeStartX = useRef(null);

	const swipeStartY = useRef(null);

	const swipeActive = useRef(false);

	const swipeTriggered = useRef(false);

	const swipeEl = useRef(null);

	const replyPulseTimer = useRef(null);

	/*
	 * Tracks the "Copied" toast timer so it can be cleared on
	 * unmount. Without this, navigating away while the toast is
	 * visible triggers a setState-on-unmounted-component warning.
	 */
	const copyToastTimer = useRef(null);

	/*
	 * Ref to the outer row element, used to attach a real
	 * `selectstart` listener (React does not support the
	 * `onSelectStart` prop, which was causing:
	 *   "Unknown event handler property `onSelectStart`"
	 */
	const rowEl = useRef(null);

	const text = getMessageText(message);

	const attachment = getAttachment(message);

	const timestamp =
		message?.created_at || message?.sent_at || message?.createdAt;

	const status =
		message?.status || message?.delivery_status || message?.deliveryStatus;

	const isRead =
		message?.is_read || message?.isRead || message?.read_at || message?.readAt;

	const isDeleted = isDeletedMessage(message);

	const replyTo = resolveReplyTo(message, messageList);

	const avatar = other?.avatar_url || other?.avatar || null;

	const otherName = other?.full_name || other?.name || "Community member";

	const initials =
		otherName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join("")
			.toUpperCase() || "?";

	const isEmojiOnly =
		!isDeleted && !attachment && !replyTo && EMOJI_ONLY.test(String(text).trim());

	const isFailed = status === "failed";

	/* ==========================================================
	   PREVENT NATIVE TEXT SELECTION ON TOUCH
	   ----------------------------------------------------------
	   Replaces the invalid `onSelectStart` JSX prop with a real
	   DOM listener attached in an effect. Prevents long-press
	   from triggering the OS "select text" UI on iOS/Android.
	========================================================== */

	useEffect(() => {
		const el = rowEl.current;

		if (!el) {
			return undefined;
		}

		const handleSelectStart = (event) => {
			event.preventDefault();
		};

		el.addEventListener("selectstart", handleSelectStart);

		return () => {
			el.removeEventListener("selectstart", handleSelectStart);
		};
	}, []);

	/* ==========================================================
	   COPY
	========================================================== */

	const handleCopy = useCallback(async () => {
		if (!text || isDeleted) {
			return;
		}

		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const textarea = document.createElement("textarea");

				textarea.value = text;

				textarea.style.position = "fixed";

				textarea.style.opacity = "0";

				document.body.appendChild(textarea);

				textarea.select();

				document.execCommand("copy");

				textarea.remove();
			}

			setCopied(true);

			if (copyToastTimer.current) {
				window.clearTimeout(copyToastTimer.current);
			}

			copyToastTimer.current = window.setTimeout(() => {
				setCopied(false);

				copyToastTimer.current = null;
			}, 1400);
		} catch {
			// Clipboard unavailable.
		}
	}, [text, isDeleted]);

	/* ==========================================================
	   OPEN MENU
	========================================================== */

	const openMenu = useCallback(
		(x, y) => {
			if (isDeleting) {
				return;
			}

			setMenuPos({
				x,
				y,
			});
		},
		[isDeleting],
	);

	/* ==========================================================
	   REPLY PULSE
	========================================================== */

	const triggerReplyPulse = useCallback(() => {
		if (replyPulseTimer.current) {
			window.clearTimeout(replyPulseTimer.current);
		}

		setReplyPulse(true);

		vibrate(12);

		replyPulseTimer.current = window.setTimeout(() => {
			setReplyPulse(false);

			replyPulseTimer.current = null;
		}, 180);
	}, []);

	useEffect(() => {
		return () => {
			if (replyPulseTimer.current) {
				window.clearTimeout(replyPulseTimer.current);
			}

			if (copyToastTimer.current) {
				window.clearTimeout(copyToastTimer.current);
			}
		};
	}, []);

	/* ==========================================================
	   SWIPE OFFSET
	========================================================== */

	const setSwipeOffset = useCallback((px, animate) => {
		const el = swipeEl.current;

		if (!el) {
			return;
		}

		el.style.transition = animate ? "transform 180ms ease-out" : "none";

		el.style.transform = px ? `translateX(${px}px)` : "";
	}, []);

	/* ==========================================================
	   CONTEXT MENU
	========================================================== */

	const handleContextMenu = useCallback(
		(event) => {
			event.preventDefault();

			if (isDeleting) {
				return;
			}

			openMenu(event.clientX, event.clientY);
		},
		[openMenu, isDeleting],
	);

	/* ==========================================================
	   LONG PRESS
	========================================================== */

	const clearLongPress = useCallback(() => {
		if (longPressTimer.current) {
			window.clearTimeout(longPressTimer.current);

			longPressTimer.current = null;
		}
	}, []);

	const handleTouchStart = useCallback(
		(event) => {
			if (isDeleting) {
				return;
			}

			const touch = event.touches?.[0];

			if (!touch) {
				return;
			}

			clearLongPress();

			swipeStartX.current = touch.clientX;

			swipeStartY.current = touch.clientY;

			swipeActive.current = false;

			swipeTriggered.current = false;

			longPressTimer.current = window.setTimeout(() => {
				if (swipeActive.current) {
					return;
				}

				openMenu(touch.clientX, touch.clientY);
			}, 550);
		},
		[clearLongPress, openMenu, isDeleting],
	);

	/* ==========================================================
	   SWIPE RIGHT TO REPLY
	========================================================== */

	const handleTouchMove = useCallback(
		(event) => {
			const touch = event.touches?.[0];

			if (!touch) {
				return;
			}

			if (swipeStartX.current === null || swipeStartY.current === null) {
				return;
			}

			if (isDeleted || isDeleting) {
				return;
			}

			const deltaX = touch.clientX - swipeStartX.current;

			const deltaY = touch.clientY - swipeStartY.current;

			if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
				clearLongPress();

				swipeActive.current = false;

				swipeTriggered.current = false;

				setSwipeOffset(0, true);

				return;
			}

			if (Math.abs(deltaX) > 8) {
				clearLongPress();

				swipeActive.current = true;
			}

			if (swipeActive.current && deltaX > 0) {
				setSwipeOffset(Math.min(deltaX * 0.5, 36), false);
			}

			const passed = deltaX >= 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

			if (passed && !swipeTriggered.current) {
				swipeTriggered.current = true;

				triggerReplyPulse();
			} else if (!passed && swipeTriggered.current) {
				swipeTriggered.current = false;
			}
		},
		[isDeleted, isDeleting, clearLongPress, triggerReplyPulse, setSwipeOffset],
	);

	/* ==========================================================
	   TOUCH END / CANCEL
	========================================================== */

	const resetSwipe = useCallback(() => {
		clearLongPress();

		swipeStartX.current = null;

		swipeStartY.current = null;

		swipeActive.current = false;

		swipeTriggered.current = false;

		setSwipeOffset(0, true);
	}, [clearLongPress, setSwipeOffset]);

	const handleTouchEnd = useCallback(() => {
		const shouldReply = swipeTriggered.current && !isDeleted && !isDeleting;

		resetSwipe();

		if (shouldReply) {
			onReply?.(message);
		}
	}, [isDeleted, isDeleting, resetSwipe, onReply, message]);

	const handleTouchCancel = resetSwipe;

	useEffect(() => {
		return () => {
			clearLongPress();
		};
	}, [clearLongPress]);

	/* ==========================================================
	   ACTIONS
	========================================================== */

	const handleReply = useCallback(() => {
		if (isDeleted || isDeleting) {
			return;
		}

		triggerReplyPulse();

		onReply?.(message);
	}, [isDeleted, isDeleting, message, onReply, triggerReplyPulse]);

	const handleEdit = useCallback(() => {
		if (isDeleted || isDeleting) {
			return;
		}

		onEdit?.(message);
	}, [isDeleted, isDeleting, message, onEdit]);

	const handleDelete = useCallback(
		(scope) => {
			if (isDeleting) {
				return;
			}

			if (scope !== "me" && scope !== "everyone") {
				return;
			}

			if (scope === "everyone" && isDeleted) {
				return;
			}

			onDelete?.(message, scope);
		},
		[message, isDeleted, isDeleting, onDelete],
	);

	const handleReplyReferenceClick = useCallback((event) => {
		event.stopPropagation();
	}, []);

	/* ==========================================================
	   ACTION BUTTON POSITION
	========================================================== */

	const openFromButton = (event) => {
		if (isDeleting) {
			return;
		}

		const rect = event.currentTarget.getBoundingClientRect();

		if (isMine) {
			openMenu(rect.left - 208, rect.bottom + 4);
		} else {
			openMenu(rect.right + 8, rect.bottom + 4);
		}
	};

	/* ==========================================================
	   BUBBLE SURFACE
	========================================================== */

	const bubbleSurface = isDeleted
		? `
			rounded-[20px]
			rounded-br-md
			border
			border-dashed
			border-ink-200
			bg-ink-50/70
		`
		: isMine
			? `
				rounded-[20px]
				rounded-br-md
				bg-primary-600
				text-white
				shadow-[0_1px_2px_rgba(15,23,42,0.08)]
			`
			: `
				rounded-[20px]
				rounded-bl-md
				bg-ink-50
				text-ink-800
			`;

	const replyTransform = replyPulse ? "scale-[0.98]" : "scale-100";

	/* ==========================================================
	   RENDER
	========================================================== */

	return (
		<>
			<div
				ref={rowEl}
				className={`
					group
					flex
					w-full
					select-none
					items-end
					gap-2
					[-webkit-touch-callout:none]
					${isMine ? "justify-end" : "justify-start"}
					${isDeleting ? "pointer-events-none" : ""}
				`}
				onContextMenu={handleContextMenu}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onTouchCancel={handleTouchCancel}
			>
				{/* OTHER USER AVATAR */}

				{!isMine && (
					<div className="shrink-0 self-start">
						{avatar ? (
							<img
								src={avatar}
								alt={otherName}
								className="
									h-7
									w-7
									rounded-full
									object-cover
								"
							/>
						) : (
							<div
								className="
									flex
									h-7
									w-7
									items-center
									justify-center
									rounded-full
									bg-primary-50
									text-[10px]
									font-bold
									text-primary-600
								"
							>
								{initials}
							</div>
						)}
					</div>
				)}

				{/* MESSAGE COLUMN */}

				<div
					ref={swipeEl}
					className={`
						relative
						flex
						min-w-0
						max-w-[82%]
						flex-col
						sm:max-w-[68%]
						${isMine ? "items-end" : "items-start"}
					`}
				>
					{/* ==================================================
					    MESSAGE CONTENT
					================================================== */}

					{isEmojiOnly ? (
						<div
							className={`
								py-0.5
								text-[38px]
								leading-none
								transition-transform
								duration-150
								ease-out
								${replyTransform}
							`}
						>
							{text}
						</div>
					) : (
						<div
							className={`
								relative
								max-w-full
								overflow-hidden
								px-3.5
								py-2
								transition-all
								duration-150
								ease-out
								${replyTransform}
								${bubbleSurface}
								${isDeleting ? "opacity-70" : ""}
							`}
							style={{
								transformOrigin: isMine ? "right center" : "left center",
							}}
							data-reply-pulse={replyPulse ? "true" : "false"}
						>
							<div>
								{/* =========================================
								    VISUAL QUOTED MESSAGE
								========================================= */}

								{replyTo && (
									<ReplyReference
										replyTo={replyTo}
										isMine={isMine}
										onClick={handleReplyReferenceClick}
									/>
								)}

								{/* =========================================
								    DELETED MESSAGE
								========================================= */}

								{isDeleted ? (
									<div
										className="
											flex
											items-center
											gap-2
											py-0.5
											text-[12.5px]
											italic
											text-ink-400
										"
									>
										<Trash2 size={13} strokeWidth={2.2} />

										<span>This message was deleted</span>
									</div>
								) : (
									<>
										<Attachment
											message={message}
											isMine={isMine}
											hasText={Boolean(text)}
										/>

										{text && (
											<div
												className="
													whitespace-pre-wrap
													break-words
													text-[14.5px]
													leading-[1.4]
													tracking-[-0.005em]
												"
											>
												{text}
											</div>
										)}
									</>
								)}
							</div>

							{/* =================================================
							    DELETING OVERLAY
							================================================= */}

							{isDeleting && (
								<div
									className="
										absolute
										inset-0
										flex
										items-center
										justify-center
										rounded-[inherit]
										bg-black/10
										backdrop-blur-[1px]
									"
								>
									<div
										className="
											flex
											items-center
											gap-1.5
											rounded-full
											bg-black/35
											px-2.5
											py-1.5
											text-[11px]
											font-semibold
											text-white
											shadow-sm
										"
									>
										<Loader2 size={13} strokeWidth={2.5} className="animate-spin" />

										<span>Deleting…</span>
									</div>
								</div>
							)}
						</div>
					)}

					{/* ==================================================
					    META
					================================================== */}

					{(timestamp || isMine || message?.edited) && (
						<div
							className={`
								mt-1
								flex
								items-center
								gap-1.5
								px-1
								text-[11px]
								text-ink-400
								${isMine ? "flex-row" : "flex-row-reverse"}
							`}
						>
							{isFailed && <span className="font-medium text-red-500">Not sent</span>}

							{!isDeleted && (
								<StatusIcon status={status} isRead={isRead} isMine={isMine} />
							)}

							{message?.edited && !isDeleted && <span>Edited</span>}

							{timestamp && <span>{formatTime(timestamp)}</span>}
						</div>
					)}

					{/* ==================================================
					    COPIED
					================================================== */}

					{copied && (
						<div
							className={`
								absolute
								-top-8
								z-10
								rounded-full
								bg-ink-800
								px-3
								py-1
								text-[11px]
								font-semibold
								text-white
								shadow-card
								${isMine ? "right-0" : "left-0"}
							`}
						>
							Copied
						</div>
					)}

					{/* ==================================================
					    DESKTOP ACTION RAIL
					================================================== */}

					{!isDeleted && !isDeleting && (
						<div
							className={`
								absolute
								top-0
								hidden
								items-center
								gap-0.5
								rounded-full
								border
								border-ink-100
								bg-white
								p-0.5
								opacity-0
								shadow-card
								transition-all
								duration-150
								group-hover:translate-y-0
								group-hover:opacity-100
								focus-within:opacity-100
								sm:flex
								${isMine ? "right-full mr-2 translate-y-1" : "left-full ml-2 translate-y-1"}
							`}
						>
							<button
								type="button"
								aria-label="Reply"
								title="Reply"
								onClick={handleReply}
								className="
									flex
									h-7
									w-7
									items-center
									justify-center
									rounded-full
									text-ink-500
									transition-colors
									hover:bg-primary-50
									hover:text-primary-600
								"
							>
								<Reply size={14} strokeWidth={2.3} />
							</button>

							<button
								type="button"
								aria-label="Message actions"
								title="More"
								onClick={openFromButton}
								className="
									flex
									h-7
									w-7
									items-center
									justify-center
									rounded-full
									text-ink-500
									transition-colors
									hover:bg-ink-100
									hover:text-ink-800
								"
							>
								<MoreHorizontal size={15} strokeWidth={2.3} />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* ==========================================================
			    ACTION MENU
			========================================================== */}

			{menuPos && (
				<ActionMenu
					x={menuPos.x}
					y={menuPos.y}
					isMine={isMine}
					isDeleted={isDeleted}
					isDeleting={isDeleting}
					onReply={handleReply}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onCopy={handleCopy}
					onClose={() => setMenuPos(null)}
				/>
			)}
		</>
	);
}