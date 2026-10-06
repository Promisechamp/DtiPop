import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { requestsChatAPI } from "@/services/api/popApi";
import { useWebSocketContext } from "@/reusables/Websocket";

/* ============================================================
   HELPERS
============================================================ */

function extractMessage(response) {
	console.log(response.data)
	if (!response) return null;

	return (
		response?.data?.message ||
		response?.data?.data?.message ||
		response?.message ||
		response?.data ||
		response
	);
}

/* ============================================================
   MESSAGE ID HELPERS
============================================================ */

function getMessageId(message) {
	return message?.id || message?.message_id || null;
}

function getConversationIdFromMessage(message) {
	return message?.conversation_id || message?.conversationId || null;
}

function getSenderId(message) {
	return message?.sender_id || message?.senderId || null;
}

function getRecipientId(message) {
	return message?.recipient_id || message?.recipientId || null;
}

/* ============================================================
   REPLY HELPERS
============================================================ */

function getReplyToId(message) {
	if (!message) return null;

	return (
		message?.reply_to_id ||
		message?.replyToId ||
		message?.reply_to?.id ||
		message?.replyTo?.id ||
		message?.replied_to?.id ||
		message?.repliedTo?.id ||
		null
	);
}

function getReplyObject(message) {
	if (!message) return null;

	const rawReply =
		message?.reply_to ||
		message?.replyTo ||
		message?.replied_to ||
		message?.repliedTo ||
		null;

	if (Array.isArray(rawReply)) {
		return rawReply[0] ?? null;
	}

	return rawReply;
}

/* ============================================================
   NORMALIZE MESSAGE
============================================================ */

function normalizeMessage(message) {
	if (!message) return null;

	const replyObj = getReplyObject(message);

	const replyToId =
		getReplyToId(message) ||
		replyObj?.id ||
		null;

	return {
		...message,

		id:
			message.id ||
			message.message_id ||
			null,

		conversation_id:
			message.conversation_id ||
			message.conversationId ||
			null,

		sender_id:
			message.sender_id ||
			message.senderId ||
			null,

		recipient_id:
			message.recipient_id ||
			message.recipientId ||
			null,

		client_id:
			message.client_id ||
			message.clientId ||
			null,

		content:
			message.content ??
			message.text ??
			message.body ??
			"",

		created_at:
			message.created_at ||
			message.createdAt ||
			new Date().toISOString(),

		...(replyObj
			? {
					reply_to: replyObj,
				}
			: {}),

		...(replyToId
			? {
					reply_to_id: replyToId,
				}
			: {}),
	};
}

/* ============================================================
   HYDRATE ONE REPLY
============================================================ */

function hydrateReply(message, list = []) {
	if (!message) {
		return null;
	}

	const existingReply = getReplyObject(message);

	if (
		existingReply &&
		getMessageId(existingReply)
	) {
		return {
			...message,

			reply_to: existingReply,

			reply_to_id:
				getReplyToId(message) ||
				getMessageId(existingReply),
		};
	}

	const replyToId = getReplyToId(message);

	if (!replyToId) {
		return message;
	}

	const original = list.find(
		(item) =>
			String(getMessageId(item)) ===
			String(replyToId),
	);

	if (!original) {
		return {
			...message,

			reply_to_id: replyToId,
		};
	}

	return {
		...message,

		reply_to_id: replyToId,

		reply_to: original,
	};
}

/* ============================================================
   HYDRATE ALL REPLIES
============================================================ */

function hydrateReplies(messages = []) {
	if (!Array.isArray(messages)) {
		return [];
	}

	const messageMap = new Map();

	messages.forEach((message) => {
		const id = getMessageId(message);

		if (id) {
			messageMap.set(
				String(id),
				message,
			);
		}
	});

	return messages.map((message) => {
		const replyToId = getReplyToId(message);

		if (!replyToId) {
			return message;
		}

		const existingReply = getReplyObject(message);

		if (
			existingReply &&
			getMessageId(existingReply)
		) {
			return {
				...message,

				reply_to: existingReply,

				reply_to_id: replyToId,
			};
		}

		const original = messageMap.get(
			String(replyToId),
		);

		if (!original) {
			return {
				...message,

				reply_to_id: replyToId,
			};
		}

		return {
			...message,

			reply_to_id: replyToId,

			reply_to: original,
		};
	});
}

/* ============================================================
   TYPING HELPERS
============================================================ */

function getTypingUserId(data) {
	return (
		data?.userId ||
		data?.user_id ||
		data?.senderId ||
		data?.sender_id ||
		data?.fromUserId ||
		data?.from_user_id ||
		null
	);
}

function getTypingName(data) {
	return (
		data?.name ||
		data?.userName ||
		data?.user_name ||
		data?.senderName ||
		data?.sender_name ||
		data?.full_name ||
		"Someone"
	);
}

/* ============================================================
   HOOK
============================================================ */

export default function useMessages({
	conversationId,
	currentUserId,

	/*
	 * IMPORTANT:
	 *
	 * Pass the full conversation object when possible.
	 *
	 * Example:
	 *
	 * useMessages({
	 *   conversationId,
	 *   currentUserId,
	 *   conversation,
	 * })
	 *
	 * This allows sendMessage() to determine the
	 * recipient even when the conversation has no
	 * existing messages yet.
	 */
	conversation = null,

	isDeleted = false,
	enabled = true,
}) {
	const {
		sendChatMessage,
		markChatAsRead,
		sendTyping,
		isConnected,
	} = useWebSocketContext();

	/* ==========================================================
	   STATE
	========================================================== */

	const [messages, setMessages] = useState([]);

	const [loading, setLoading] = useState(false);

	const [loadingMore, setLoadingMore] = useState(false);

	const [sending, setSending] = useState(false);

	const [deletingMessageIds, setDeletingMessageIds] =
		useState([]);

	const [error, setError] = useState(null);

	const [hasOlder, setHasOlder] = useState(false);

	const [typingUsers, setTypingUsers] = useState([]);

	const [onlineUserIds, setOnlineUserIds] = useState([]);

	const [realtimeStatus, setRealtimeStatus] =
		useState("disconnected");

	/* ==========================================================
	   REFS
	========================================================== */

	const mountedRef = useRef(true);

	const messagesRef = useRef([]);

	const loadingRef = useRef(false);

	const loadingMoreRef = useRef(false);

	const typingTimeoutsRef = useRef(new Map());

	const otherParticipantIdRef = useRef(null);

	/* ==========================================================
	   MESSAGE REF
	========================================================== */

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	/* ==========================================================
	   MOUNT
	========================================================== */

	useEffect(() => {
		mountedRef.current = true;

		return () => {
			mountedRef.current = false;
		};
	}, []);

	/* ==========================================================
	   REALTIME STATUS
	========================================================== */

	useEffect(() => {
		if (!enabled || !conversationId) {
			setRealtimeStatus("disconnected");

			return;
		}

		setRealtimeStatus(
			isConnected
				? "connected"
				: "disconnected",
		);
	}, [
		conversationId,
		enabled,
		isConnected,
	]);

	/* ==========================================================
	   DETERMINE RECIPIENT FROM CONVERSATION
	========================================================== */

	const conversationRecipientId = useMemo(() => {
		if (!conversation || !currentUserId) {
			return null;
		}

		const requesterId =
			conversation?.requester_id ||
			conversation?.requesterId ||
			conversation?.requester?.id ||
			conversation?.requester?.user_id ||
			conversation?.requester?.userId ||
			null;

		const providerId =
			conversation?.provider_id ||
			conversation?.providerId ||
			conversation?.provider?.id ||
			conversation?.provider?.user_id ||
			conversation?.provider?.userId ||
			null;

		if (!requesterId || !providerId) {
			return null;
		}

		if (
			String(requesterId) ===
			String(currentUserId)
		) {
			return providerId;
		}

		if (
			String(providerId) ===
			String(currentUserId)
		) {
			return requesterId;
		}

		/*
		 * Current user is not one of the two
		 * conversation participants.
		 */
		return null;
	}, [
		conversation,
		currentUserId,
	]);

	/* ==========================================================
	   KEEP RECIPIENT REF IN SYNC
	========================================================== */

	useEffect(() => {
		if (conversationRecipientId) {
			otherParticipantIdRef.current =
				conversationRecipientId;
		}
	}, [conversationRecipientId]);

	/* ==========================================================
	   DELETING HELPERS
	========================================================== */

	const setMessageDeleting = useCallback(
		(messageId, value) => {
			if (!messageId) {
				return;
			}

			const key = String(messageId);

			setDeletingMessageIds((previous) => {
				const exists = previous.some(
					(id) =>
						String(id) === key,
				);

				if (value) {
					if (exists) {
						return previous;
					}

					return [
						...previous,
						messageId,
					];
				}

				return previous.filter(
					(id) =>
						String(id) !== key,
				);
			});
		},
		[],
	);

	const isMessageDeleting = useCallback(
		(messageId) => {
			if (!messageId) {
				return false;
			}

			return deletingMessageIds.some(
				(id) =>
					String(id) ===
					String(messageId),
			);
		},
		[deletingMessageIds],
	);

	/* ==========================================================
	   MESSAGE MERGE
	========================================================== */

	const mergeMessage = useCallback(
		(incomingMessage) => {
			if (!conversationId) {
				return;
			}

			const normalizedIncoming =
				normalizeMessage(
					incomingMessage,
				);

			if (!normalizedIncoming) {
				return;
			}

			const messageConversationId =
				getConversationIdFromMessage(
					normalizedIncoming,
				);

			if (
				messageConversationId &&
				String(messageConversationId) !==
					String(conversationId)
			) {
				return;
			}

			const senderId =
				getSenderId(
					normalizedIncoming,
				);

			const recipientId =
				getRecipientId(
					normalizedIncoming,
				);

			if (
				senderId &&
				currentUserId &&
				String(senderId) !==
					String(currentUserId)
			) {
				otherParticipantIdRef.current =
					senderId;
			}

			if (
				recipientId &&
				currentUserId &&
				String(recipientId) !==
					String(currentUserId)
			) {
				otherParticipantIdRef.current =
					recipientId;
			}

			setMessages((previous) => {
				let nextMessages = [
					...previous,
				];

				const messageId =
					getMessageId(
						normalizedIncoming,
					);

				if (messageId) {
					const existingIndex =
						nextMessages.findIndex(
							(item) =>
								String(
									getMessageId(item),
								) ===
								String(messageId),
						);

					if (
						existingIndex !== -1
					) {
						nextMessages[
							existingIndex
						] = {
							...nextMessages[
								existingIndex
							],
							...normalizedIncoming,
						};
					} else {
						nextMessages.push(
							normalizedIncoming,
						);
					}
				} else if (
					normalizedIncoming.client_id
				) {
					const existingIndex =
						nextMessages.findIndex(
							(item) =>
								item.client_id &&
								String(
									item.client_id,
								) ===
									String(
										normalizedIncoming.client_id,
									),
						);

					if (
						existingIndex !== -1
					) {
						nextMessages[
							existingIndex
						] = {
							...nextMessages[
								existingIndex
							],
							...normalizedIncoming,
						};
					} else {
						nextMessages.push(
							normalizedIncoming,
						);
					}
				} else {
					nextMessages.push(
						normalizedIncoming,
					);
				}

				return hydrateReplies(
					nextMessages,
				);
			});
		},
		[
			conversationId,
			currentUserId,
		],
	);

	/* ==========================================================
	   REPLACE MESSAGE
	========================================================== */

	const replaceMessage = useCallback(
		(incomingMessage) => {
			if (!conversationId) {
				return;
			}

			const message =
				normalizeMessage(
					incomingMessage,
				);

			if (!message) {
				return;
			}

			const messageConversationId =
				getConversationIdFromMessage(
					message,
				);

			if (
				messageConversationId &&
				String(messageConversationId) !==
					String(conversationId)
			) {
				return;
			}

			const messageId =
				getMessageId(message);

			if (!messageId) {
				return;
			}

			setMessages((previous) => {
				const nextMessages = [
					...previous,
				];

				const existingIndex =
					nextMessages.findIndex(
						(item) =>
							String(
								getMessageId(item),
							) ===
							String(messageId),
					);

				if (
					existingIndex === -1
				) {
					nextMessages.push(
						message,
					);
				} else {
					nextMessages[
						existingIndex
					] = {
						...nextMessages[
							existingIndex
						],
						...message,
					};
				}

				return hydrateReplies(
					nextMessages,
				);
			});
		},
		[conversationId],
	);

	/* ==========================================================
	   REMOVE MESSAGE
	   ONLY FOR DELETE-FOR-ME
	========================================================== */

	const removeMessage = useCallback(
		(messageId) => {
			if (!messageId) {
				return;
			}

			setMessages((previous) => {
				const filtered =
					previous.filter(
						(item) =>
							String(
								getMessageId(item),
							) !==
							String(messageId),
					);

				return hydrateReplies(
					filtered,
				);
			});
		},
		[],
	);

	/* ==========================================================
	   LOAD MESSAGES
	========================================================== */

	const loadMessages = useCallback(
		async ({
			silent = false,
			before = null,
			limit = 50,
		} = {}) => {
			if (
				!conversationId ||
				!enabled
			) {
				return [];
			}

			if (before) {
				if (
					loadingMoreRef.current
				) {
					return [];
				}

				loadingMoreRef.current =
					true;

				if (
					mountedRef.current
				) {
					setLoadingMore(true);
				}
			} else {
				if (loadingRef.current) {
					return [];
				}

				loadingRef.current =
					true;

				if (
					!silent &&
					mountedRef.current
				) {
					setLoading(true);
				}
			}

			try {
				if (
					mountedRef.current
				) {
					setError(null);
				}

				const params = {
					limit,
				};

				if (before) {
					params.before =
						before;
				}

				const response =
					await requestsChatAPI.getConversation(
						conversationId,
						params,
					);

				const body =
					response?.data ||
					response ||
					{};

				let serverMessages =
					body?.messages ||
					body?.data?.messages ||
					[];

				if (
					!Array.isArray(
						serverMessages,
					)
				) {
					serverMessages = [];
				}

				let normalized =
					serverMessages
						.map(
							normalizeMessage,
						)
						.filter(Boolean)
						.filter(
							(message) => {
								const id =
									getConversationIdFromMessage(
										message,
									);

								return (
									!id ||
									String(id) ===
										String(
											conversationId,
										)
								);
							},
						);

				normalized =
					hydrateReplies(
						normalized,
					);

				const moreAvailable =
					body?.pagination
						?.hasMore ??
					body?.pagination
						?.has_more ??
					body?.hasMore ??
					body?.has_more ??
					false;

				if (
					mountedRef.current
				) {
					setHasOlder(
						Boolean(
							moreAvailable,
						),
					);

					setMessages(
						(previous) => {
							if (!before) {
								return hydrateReplies(
									normalized,
								);
							}

							const combined = [
								...normalized,
								...previous,
							];

							const unique = [];

							const seenIds =
								new Set();

							const seenClientIds =
								new Set();

							for (const message of combined) {
								const id =
									getMessageId(
										message,
									);

								if (id) {
									const key =
										String(id);

									if (
										seenIds.has(
											key,
										)
									) {
										continue;
									}

									seenIds.add(
										key,
									);
								}

								if (
									message.client_id
								) {
									const clientId =
										String(
											message.client_id,
										);

									if (
										seenClientIds.has(
											clientId,
										)
									) {
										continue;
									}

									seenClientIds.add(
										clientId,
									);
								}

								unique.push(
									message,
								);
							}

							return hydrateReplies(
								unique,
							);
						},
					);
				}

				/*
				 * Learn the other participant from
				 * existing messages as a fallback.
				 */
				normalized.forEach(
					(message) => {
						const senderId =
							getSenderId(
								message,
							);

						const recipientId =
							getRecipientId(
								message,
							);

						if (
							senderId &&
							currentUserId &&
							String(
								senderId,
							) !==
								String(
									currentUserId,
								)
						) {
							otherParticipantIdRef.current =
								senderId;
						}

						if (
							recipientId &&
							currentUserId &&
							String(
								recipientId,
							) !==
								String(
									currentUserId,
								)
						) {
							otherParticipantIdRef.current =
								recipientId;
						}
					},
				);

				return normalized;
			} catch (err) {
				console.error(
					"[useMessages] load error:",
					err,
				);

				if (
					mountedRef.current
				) {
					setError(
						err?.response
							?.data?.message ||
							err?.response
								?.data?.error ||
							err?.message ||
							"Failed to load messages.",
					);
				}

				throw err;
			} finally {
				if (before) {
					loadingMoreRef.current =
						false;

					if (
						mountedRef.current
					) {
						setLoadingMore(
							false,
						);
					}
				} else {
					loadingRef.current =
						false;

					if (
						mountedRef.current
					) {
						setLoading(false);
					}
				}
			}
		},
		[
			conversationId,
			currentUserId,
			enabled,
		],
	);

	/* ==========================================================
	   INITIAL LOAD
	========================================================== */

	useEffect(() => {
		if (
			!conversationId ||
			!enabled
		) {
			setMessages([]);
			setLoading(false);
			setLoadingMore(false);
			setHasOlder(false);
			setError(null);

			return;
		}

		loadMessages().catch(() => {});
	}, [
		conversationId,
		enabled,
		loadMessages,
	]);

	/* ==========================================================
	   LOAD OLDER
	========================================================== */

	const loadOlder = useCallback(
		async () => {
			if (
				!conversationId ||
				!enabled ||
				loadingMoreRef.current
			) {
				return [];
			}

			const currentMessages =
				messagesRef.current;

			if (
				currentMessages.length ===
				0
			) {
				return [];
			}

			const oldest =
				currentMessages[0];

			const before =
				getMessageId(oldest);

			if (!before) {
				return [];
			}

			return loadMessages({
				before,
				limit: 50,
			});
		},
		[
			conversationId,
			enabled,
			loadMessages,
		],
	);

	/* ==========================================================
	   SOCKET.IO: CHAT RECEIVE
	========================================================== */

	useEffect(() => {
		if (
			!enabled ||
			!conversationId
		) {
			return undefined;
		}

		const handleChatReceive = (
			event,
		) => {
			const incoming =
				event?.detail;

			if (!incoming) {
				return;
			}

			const incomingConversationId =
				getConversationIdFromMessage(
					incoming,
				);

			if (
				incomingConversationId &&
				String(
					incomingConversationId,
				) !==
					String(conversationId)
			) {
				return;
			}

			if (!incomingConversationId) {
				return;
			}

			mergeMessage(incoming);
		};

		window.addEventListener(
			"chat:receive",
			handleChatReceive,
		);

		return () => {
			window.removeEventListener(
				"chat:receive",
				handleChatReceive,
			);
		};
	}, [
		conversationId,
		enabled,
		mergeMessage,
	]);

	/* ==========================================================
	   SOCKET.IO: MESSAGE DELETED
	========================================================== */

	useEffect(() => {
		if (
			!enabled ||
			!conversationId
		) {
			return undefined;
		}

		const handleChatMessageDeleted = (
			event,
		) => {
			const data =
				event?.detail;

			if (!data) {
				return;
			}

			const deletedConversationId =
				data?.conversation_id ||
				data?.conversationId ||
				data?.message
					?.conversation_id ||
				data?.message
					?.conversationId;

			if (
				deletedConversationId &&
				String(
					deletedConversationId,
				) !==
					String(conversationId)
			) {
				return;
			}

			const deletedMessage =
				data?.message ||
				data?.data?.message ||
				null;

			const messageId =
				data?.messageId ||
				data?.message_id ||
				deletedMessage?.id ||
				deletedMessage
					?.message_id ||
				null;

			if (!messageId) {
				return;
			}

			const scope =
				String(
					data?.scope ||
						"all",
				).toLowerCase();

			/*
			 * DELETE FOR ME
			 *
			 * The server sends only to the
			 * current user, so remove locally.
			 */
			if (scope === "me") {
				removeMessage(
					messageId,
				);

				setMessageDeleting(
					messageId,
					false,
				);

				return;
			}

			/*
			 * DELETE FOR EVERYONE
			 *
			 * Keep the row and replace it
			 * with the tombstone.
			 */
			if (deletedMessage) {
				replaceMessage(
					deletedMessage,
				);
			} else {
				/*
				 * Fallback when the server sends
				 * only the message ID.
				 */
				setMessages(
					(previous) =>
						hydrateReplies(
							previous.map(
								(message) => {
									if (
										String(
											getMessageId(
												message,
											),
										) !==
										String(
											messageId,
										)
									) {
										return message;
									}

									return {
										...message,

										is_deleted:
											true,

										deleted_at:
											new Date().toISOString(),

										content:
											"",

										metadata:
											{},
									};
								},
							),
						),
				);
			}

			setMessageDeleting(
				messageId,
				false,
			);
		};

		window.addEventListener(
			"chat:message:deleted",
			handleChatMessageDeleted,
		);

		return () => {
			window.removeEventListener(
				"chat:message:deleted",
				handleChatMessageDeleted,
			);
		};
	}, [
		conversationId,
		enabled,
		removeMessage,
		replaceMessage,
		setMessageDeleting,
	]);

	/* ==========================================================
	   SOCKET.IO: CONVERSATION UPDATE
	========================================================== */

	useEffect(() => {
		if (
			!enabled ||
			!conversationId
		) {
			return undefined;
		}

		const handleConversationUpdate = (
			event,
		) => {
			const data =
				event?.detail;

			if (!data) {
				return;
			}

			const updatedConversation =
				data?.conversation ||
				data?.data
					?.conversation ||
				data?.data ||
				null;

			const updatedConversationId =
				data?.conversationId ||
				data?.conversation_id ||
				updatedConversation?.id ||
				updatedConversation
					?.conversation_id;

			if (
				!updatedConversationId ||
				String(
					updatedConversationId,
				) !==
					String(conversationId)
			) {
				return;
			}
		};

		window.addEventListener(
			"chat:conversation:update",
			handleConversationUpdate,
		);

		return () => {
			window.removeEventListener(
				"chat:conversation:update",
				handleConversationUpdate,
			);
		};
	}, [
		conversationId,
		enabled,
	]);

	/* ==========================================================
	   SOCKET.IO: MESSAGE READ
	========================================================== */

	useEffect(() => {
		if (
			!enabled ||
			!conversationId
		) {
			return undefined;
		}

		const handleChatRead = (
			event,
		) => {
			const data =
				event?.detail;

			if (!data) {
				return;
			}

			const readConversationId =
				data?.conversationId ||
				data?.conversation_id;

			if (
				readConversationId &&
				String(
					readConversationId,
				) !==
					String(conversationId)
			) {
				return;
			}

			const readUpToId =
				data?.messageId ||
				data?.message_id ||
				data?.upToMessageId ||
				data?.up_to_message_id;

			if (!readUpToId) {
				return;
			}

			setMessages(
				(previous) =>
					hydrateReplies(
						previous.map(
							(message) => {
								const id =
									getMessageId(
										message,
									);

								if (
									String(
										id,
									) ===
									String(
										readUpToId,
									)
								) {
									return {
										...message,

										is_read:
											true,

										read_at:
											data?.readAt ||
											data?.read_at ||
											message.read_at,
									};
								}

								return message;
							},
						),
					),
			);
		};

		window.addEventListener(
			"chat:read",
			handleChatRead,
		);

		return () => {
			window.removeEventListener(
				"chat:read",
				handleChatRead,
			);
		};
	}, [
		conversationId,
		enabled,
	]);

	/* ==========================================================
	   SOCKET.IO: TYPING
	========================================================== */

	useEffect(() => {
		if (
			!enabled ||
			!conversationId
		) {
			return undefined;
		}

		const handleTyping = (
			event,
		) => {
			const data =
				event?.detail;

			if (!data) {
				return;
			}

			const typingConversationId =
				data?.conversationId ||
				data?.conversation_id;

			if (
				!typingConversationId ||
				String(
					typingConversationId,
				) !==
					String(conversationId)
			) {
				return;
			}

			const userId =
				getTypingUserId(data);

			if (
				userId &&
				currentUserId &&
				String(userId) ===
					String(currentUserId)
			) {
				return;
			}

			const name =
				getTypingName(data);

			const isTyping =
				data?.isTyping ??
				data?.is_typing ??
				false;

			if (!userId) {
				return;
			}

			const userKey =
				String(userId);

			const existingTimeout =
				typingTimeoutsRef.current.get(
					userKey,
				);

			if (existingTimeout) {
				clearTimeout(
					existingTimeout,
				);
			}

			if (!isTyping) {
				setTypingUsers(
					(previous) =>
						previous.filter(
							(item) =>
								String(
									item?.id ??
										item?.userId ??
										item?.user_id,
								) !==
								userKey,
						),
				);

				typingTimeoutsRef.current.delete(
					userKey,
				);

				return;
			}

			setTypingUsers(
				(previous) => {
					const exists =
						previous.some(
							(item) =>
								String(
									item?.id ??
										item?.userId ??
										item?.user_id,
								) ===
								userKey,
						);

					if (exists) {
						return previous.map(
							(item) =>
								String(
									item?.id ??
										item?.userId ??
										item?.user_id,
								) ===
								userKey
									? {
											...item,
											id: userId,
											userId,
											name,
										}
									: item,
						);
					}

					return [
						...previous,
						{
							id: userId,
							userId,
							name,
						},
					];
				},
			);

			const timeout =
				setTimeout(() => {
					setTypingUsers(
						(previous) =>
							previous.filter(
								(item) =>
									String(
										item?.id ??
											item?.userId ??
											item?.user_id,
									) !==
									userKey,
							),
					);

					typingTimeoutsRef.current.delete(
						userKey,
					);
				}, 4000);

			typingTimeoutsRef.current.set(
				userKey,
				timeout,
			);
		};

		window.addEventListener(
			"chat:typing",
			handleTyping,
		);

		return () => {
			window.removeEventListener(
				"chat:typing",
				handleTyping,
			);

			typingTimeoutsRef.current.forEach(
				(timeout) => {
					clearTimeout(
						timeout,
					);
				},
			);

			typingTimeoutsRef.current.clear();
		};
	}, [
		conversationId,
		currentUserId,
		enabled,
	]);

	/* ==========================================================
	   SEND MESSAGE
	========================================================== */

	const sendMessage = useCallback(
		async (payload = {}) => {
			if (!conversationId) {
				throw new Error(
					"Conversation ID is required.",
				);
			}

			const isStringPayload =
				typeof payload ===
				"string";

			const content =
				isStringPayload
					? payload
					: payload?.content;

			if (
				!content ||
				!String(content).trim()
			) {
				throw new Error(
					"Message content is required.",
				);
			}

			if (!isConnected) {
				throw new Error(
					"Chat connection is not available.",
				);
			}

			/*
			 * Generate a client ID so the local
			 * optimistic/server message can be
			 * matched safely.
			 */
			const clientId =
				(!isStringPayload &&
					(payload?.client_id ||
						payload?.clientId)) ||
				(
					typeof crypto !==
						"undefined" &&
					typeof crypto.randomUUID ===
						"function"
				)
					? crypto.randomUUID()
					: `${Date.now()}-${Math.random()
							.toString(36)
							.slice(2)}`;

			/*
			 * ======================================================
			 * RECIPIENT RESOLUTION
			 * ======================================================
			 *
			 * Priority:
			 *
			 * 1. Explicit recipientId supplied by caller
			 * 2. recipient_id supplied by caller
			 * 3. Recipient determined from conversation
			 * 4. Recipient learned from existing messages
			 */
			const recipientId =
				(!isStringPayload &&
					(payload?.recipientId ||
						payload?.recipient_id)) ||
				conversationRecipientId ||
				otherParticipantIdRef.current;

			if (!recipientId) {
				throw new Error(
					"Recipient ID is required to send a chat message.",
				);
			}

			/*
			 * ======================================================
			 * REPLY
			 * ======================================================
			 */
			const replyToId =
				(!isStringPayload &&
					(payload?.reply_to_id ||
						payload?.replyToId ||
						payload?.replyTo
							?.id ||
						payload?.reply_to
							?.id ||
						payload?.repliedTo
							?.id ||
						payload?.replied_to
							?.id)) ||
				null;

			if (
				mountedRef.current
			) {
				setSending(true);
				setError(null);
			}

			try {
				const serverResponse =
					await sendChatMessage({
						conversationId,

						content:
							String(
								content,
							).trim(),

						recipientId,

						/*
						 * Send both forms because
						 * different layers of your
						 * chat system support both.
						 */
						recipient_id:
							recipientId,

						clientId,

						client_id:
							clientId,

						replyToId,

						reply_to_id:
							replyToId,
					});

				let normalized =
					normalizeMessage(
						extractMessage(
							serverResponse,
						),
					);

				if (normalized) {
					normalized =
						hydrateReply(
							normalized,
							messagesRef.current,
						);

					/*
					 * Make sure the recipient remains
					 * available for the next message.
					 */
					const returnedRecipientId =
						getRecipientId(
							normalized,
						);

					const returnedSenderId =
						getSenderId(
							normalized,
						);

					if (
						returnedRecipientId &&
						currentUserId &&
						String(
							returnedRecipientId,
						) !==
							String(
								currentUserId,
							)
					) {
						otherParticipantIdRef.current =
							returnedRecipientId;
					} else if (
						returnedSenderId &&
						currentUserId &&
						String(
							returnedSenderId,
						) !==
							String(
								currentUserId,
							)
					) {
						otherParticipantIdRef.current =
							returnedSenderId;
					}

					mergeMessage(
						normalized,
					);
				}

				return (
					normalized ||
					serverResponse
				);
			} catch (err) {
				console.error(
					"[useMessages] Socket.IO send error:",
					err,
				);

				if (
					mountedRef.current
				) {
					setError(
						err?.response
							?.data?.message ||
							err?.response
								?.data?.error ||
							err?.message ||
							"Failed to send message.",
					);
				}

				throw err;
			} finally {
				if (
					mountedRef.current
				) {
					setSending(false);
				}
			}
		},
		[
			conversationId,
			conversationRecipientId,
			currentUserId,
			isConnected,
			mergeMessage,
			sendChatMessage,
		],
	);

	/* ==========================================================
	   EDIT MESSAGE
	========================================================== */

	const editMessage = useCallback(
		async (
			messageId,
			content,
		) => {
			if (!conversationId) {
				throw new Error(
					"Conversation ID is required.",
				);
			}

			if (!messageId) {
				throw new Error(
					"Message ID is required.",
				);
			}

			if (
				!content ||
				!String(content).trim()
			) {
				throw new Error(
					"Message content is required.",
				);
			}

			const response =
				await requestsChatAPI.editMessage(
					conversationId,
					messageId,
					{
						content:
							String(
								content,
							).trim(),
					},
				);

			const message =
				extractMessage(
					response,
				);

			if (message) {
				replaceMessage(
					message,
				);
			}

			return message;
		},
		[
			conversationId,
			replaceMessage,
		],
	);

	/* ==========================================================
	   DELETE MESSAGE
	========================================================== */

	const deleteMessage = useCallback(
		async (
			messageId,
			scope = "me",
		) => {
			if (!conversationId) {
				throw new Error(
					"Conversation ID is required.",
				);
			}

			if (!messageId) {
				throw new Error(
					"Message ID is required.",
				);
			}

			const normalizedScope =
				String(scope)
					.toLowerCase() ===
					"everyone" ||
				String(scope)
					.toLowerCase() ===
					"all"
					? "all"
					: "me";

			setMessageDeleting(
				messageId,
				true,
			);

			try {
				const response =
					await requestsChatAPI.deleteMessage(
						conversationId,
						messageId,
						normalizedScope,
					);

				/*
				 * ==================================================
				 * DELETE FOR ME
				 * ==================================================
				 */
				if (
					normalizedScope ===
					"me"
				) {
					removeMessage(
						messageId,
					);

					return response;
				}

				/*
				 * ==================================================
				 * DELETE FOR EVERYONE
				 * ==================================================
				 *
				 * NEVER remove the message.
				 *
				 * Replace it with the tombstone returned
				 * by the server.
				 */
				const deletedMessage =
					normalizeMessage(
						extractMessage(
							response,
						),
					);

				if (deletedMessage) {
					replaceMessage(
						deletedMessage,
					);

					/*
					 * Update this window immediately.
					 *
					 * The backend Socket.IO event handles
					 * the other participant.
					 */
					window.dispatchEvent(
						new CustomEvent(
							"chat:message:deleted",
							{
								detail: {
									conversationId,

									conversation_id:
										conversationId,

									messageId,

									message_id:
										messageId,

									scope:
										"all",

									message:
										deletedMessage,
								},
							},
						),
					);
				} else {
					/*
					 * Fallback if the API does not return
					 * the updated tombstone.
					 */
					setMessages(
						(previous) =>
							hydrateReplies(
								previous.map(
									(message) => {
										if (
											String(
												getMessageId(
													message,
												),
											) !==
											String(
												messageId,
											)
										) {
											return message;
										}

										return {
											...message,

											is_deleted:
												true,

											deleted_at:
												new Date().toISOString(),

											content:
												"",

											metadata:
												{},
										};
									},
								),
							),
					);
				}

				return response;
			} catch (err) {
				console.error(
					"[useMessages] delete error:",
					err,
				);

				/*
				 * Refresh only after a failed request.
				 */
				try {
					await loadMessages({
						silent: true,
					});
				} catch {
					// Ignore refresh failure.
				}

				throw err;
			} finally {
				setMessageDeleting(
					messageId,
					false,
				);
			}
		},
		[
			conversationId,
			loadMessages,
			removeMessage,
			replaceMessage,
			setMessageDeleting,
		],
	);

	/* ==========================================================
	   MARK READ
	========================================================== */

	const markRead = useCallback(
		async () => {
			if (!conversationId) {
				return;
			}

			if (
				typeof markChatAsRead ===
				"function"
			) {
				markChatAsRead(
					conversationId,
				);
			}

			try {
				return await requestsChatAPI.markRead(
					conversationId,
				);
			} catch (err) {
				console.error(
					"[useMessages] mark read error:",
					err,
				);

				throw err;
			}
		},
		[
			conversationId,
			markChatAsRead,
		],
	);

	/* ==========================================================
	   MARK READ UP TO
	========================================================== */

	const markReadUpTo = useCallback(
		async (messageId) => {
			if (
				!conversationId ||
				!messageId
			) {
				return;
			}

			return requestsChatAPI.markRead(
				conversationId,
				messageId,
			);
		},
		[conversationId],
	);

	/* ==========================================================
	   TYPING
	========================================================== */

	const emitTyping = useCallback(
		(name) => {
			if (!conversationId) {
				return;
			}

			/*
			 * Conversation-derived recipient is preferred.
			 */
			const recipientId =
				conversationRecipientId ||
				otherParticipantIdRef.current;

			if (!recipientId) {
				return;
			}

			if (
				typeof sendTyping !==
				"function"
			) {
				return;
			}

			sendTyping(
				conversationId,
				recipientId,
				true,
			);
		},
		[
			conversationId,
			conversationRecipientId,
			sendTyping,
		],
	);

	const emitTypingStop =
		useCallback(() => {
			if (!conversationId) {
				return;
			}

			const recipientId =
				conversationRecipientId ||
				otherParticipantIdRef.current;

			if (!recipientId) {
				return;
			}

			if (
				typeof sendTyping !==
				"function"
			) {
				return;
			}

			sendTyping(
				conversationId,
				recipientId,
				false,
			);
		}, [
			conversationId,
			conversationRecipientId,
			sendTyping,
		]);

	/* ==========================================================
	   REFRESH
	========================================================== */

	const refresh = useCallback(
		async () => {
			if (!conversationId) {
				setMessages([]);
				setHasOlder(false);

				return [];
			}

			return loadMessages({
				silent: true,
			});
		},
		[
			conversationId,
			loadMessages,
		],
	);

	/* ==========================================================
	   CLEANUP
	========================================================== */

	useEffect(() => {
		return () => {
			typingTimeoutsRef.current.forEach(
				(timeout) => {
					clearTimeout(
						timeout,
					);
				},
			);

			typingTimeoutsRef.current.clear();
		};
	}, []);

	/* ==========================================================
	   RETURN
	========================================================== */

	return {
		/* Messages */
		messages,

		/* Loading */
		loading,
		loadingMore,
		sending,

		/* Deleting */
		deletingMessageIds,
		isMessageDeleting,

		/* Error */
		error,

		/* Pagination */
		hasOlder,

		/* Realtime */
		isConnected,
		realtimeStatus,

		/* Typing */
		typingUsers,
		onlineUserIds,

		/* Recipient */
		recipientId:
			conversationRecipientId ||
			otherParticipantIdRef.current,

		/* Actions */
		sendMessage,

		editMessage,
		deleteMessage,

		markRead,
		markReadUpTo,

		emitTyping,
		emitTypingStop,

		/* Loading */
		loadMessages,
		loadOlder,
		refresh,
	};
}