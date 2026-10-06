import {
	useEffect,
	useState,
	useCallback,
	useRef,
	useMemo,
	createContext,
	useContext,
} from "react";

import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

/* ============================================================
   CONFIG
============================================================ */

const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const NOTIFICATIONS_LIMIT = 50;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

/*
 * All notification REST calls go through the backend directly,
 * not through a relative URL. Without this, in dev, Vite serves
 * `/api/*` from port 5173 (the frontend) and the backend on 5000
 * is never reached.
 */
const NOTIFICATIONS_BASE_URL = `${BACKEND_URL}/api/notifications`;

/* ============================================================
   HELPERS
============================================================ */

const getAuthHeaders = () => ({
	Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
	"Content-Type": "application/json",
});

const parseResponse = async (response) => {
	let data = {};

	try {
		data = await response.json();
	} catch {
		data = {};
	}

	if (!response.ok) {
		const error = new Error(
			data?.error ||
				data?.message ||
				`Request failed with status ${response.status}`,
		);

		error.status = response.status;
		error.code = data?.code || response.status;
		error.details = data?.details || null;

		throw error;
	}

	return data;
};

/*
 * Turns any thrown value into a structured, loggable payload.
 * Prevents the "Error {}" empty-object console output.
 */
const describeError = (error) => {
	if (!error) return { message: "Unknown error" };

	return {
		message: error.message || String(error),
		code: error.code || error.status || null,
		status: error.status || null,
		details: error.details || null,
	};
};

/* ============================================================
   HOOK
============================================================ */

export const useWebSocket = () => {
	const { user } = useAuth();

	/*
	 * Derive a stable primitive. `user` is often a fresh object
	 * on every AuthContext render; keying effects on `userId`
	 * prevents the entire socket/init machinery from tearing
	 * down and rebuilding on unrelated auth updates.
	 */
	const userId = user?.id ?? null;

	const [isConnected, setIsConnected] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);

	const socketRef = useRef(null);
	const reconnectTimeoutRef = useRef(null);
	const reconnectAttemptsRef = useRef(0);
	const mountedRef = useRef(false);

	/*
	 * Refs so callbacks can read the current user id and the
	 * current notification list without depending on them.
	 */
	const userIdRef = useRef(userId);
	useEffect(() => {
		userIdRef.current = userId;
	}, [userId]);

	const notificationsRef = useRef(notifications);
	useEffect(() => {
		notificationsRef.current = notifications;
	}, [notifications]);

	/*
	 * Prevents the reconnect chain from being scheduled twice
	 * for the same "generation" of the socket.
	 */
	const reconnectGenerationRef = useRef(0);

	/* ==========================================================
     CLEAR RECONNECT TIMER
  ========================================================== */

	const clearReconnectTimeout = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
	}, []);

	/* ==========================================================
     FETCH NOTIFICATIONS
  ========================================================== */

	const fetchNotifications = useCallback(async () => {
		const activeUserId = userIdRef.current;

		if (!activeUserId) {
			return;
		}

		const token = localStorage.getItem("token");

		if (!token) {
			console.warn("⚠️ No authentication token available.");

			return;
		}

		try {
			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}?limit=${NOTIFICATIONS_LIMIT}`,
				{
					method: "GET",
					headers: getAuthHeaders(),
				},
			);

			const data = await parseResponse(response);

			if (!mountedRef.current) {
				return;
			}

			const fetchedNotifications = Array.isArray(data.notifications)
				? data.notifications
				: [];

			setNotifications(fetchedNotifications);

			if (typeof data.unread_count === "number") {
				setUnreadCount(data.unread_count);
			} else {
				setUnreadCount(
					fetchedNotifications.filter(
						(notification) => !notification.is_read,
					).length,
				);
			}
		} catch (error) {
			console.error(
				"❌ Error fetching notifications:",
				describeError(error),
			);
		}
	}, []);

	/* ==========================================================
     ADD REALTIME NOTIFICATION
  ========================================================== */

	const addRealtimeNotification = useCallback((notification) => {
		if (!notification?.id) {
			return;
		}

		setNotifications((current) => {
			const alreadyExists = current.some(
				(existing) => existing.id === notification.id,
			);

			if (alreadyExists) {
				return current;
			}

			return [notification, ...current];
		});

		setUnreadCount((currentUnread) => {
			if (notification.is_read) {
				return currentUnread;
			}

			return currentUnread + 1;
		});
	}, []);

	/* ==========================================================
     SETUP SOCKET
     ----------------------------------------------------------
     Kept stable via refs. This is a `useCallback` with an
     empty dep array; it reads the current userId through
     `userIdRef.current` so it never needs `user` in its deps.
  ========================================================== */

	const setupSocket = useCallback(() => {
		const activeUserId = userIdRef.current;

		if (!activeUserId) {
			return;
		}

		const token = localStorage.getItem("token");

		if (!token) {
			console.warn("⚠️ No token available for WebSocket connection.");

			setIsConnected(false);

			return;
		}

		/*
		 * Bump generation so any in-flight scheduled reconnect
		 * from the previous socket becomes a no-op.
		 */
		reconnectGenerationRef.current += 1;

		const generation = reconnectGenerationRef.current;

		/*
		 * Clean up an existing socket before creating another one.
		 */
		if (socketRef.current) {
			socketRef.current.removeAllListeners();
			socketRef.current.disconnect();
			socketRef.current = null;
		}

		clearReconnectTimeout();

		const attemptNumber = reconnectAttemptsRef.current + 1;

		//console.log(
			//`📡 Setting up WebSocket connection... (Attempt: ${attemptNumber})`,
	//	);

		try {
		//	console.log("🔌 Socket.IO connecting to:", BACKEND_URL);

			const socket = io(BACKEND_URL, {
				auth: {
					userId: activeUserId,
					/*
					 * Send the token as well. If the backend
					 * expects it, this prevents a permanent
					 * `connect_error` → reconnect storm.
					 */
					token,
				},

				transports: ["websocket"],

				reconnection: false,
			});

			socketRef.current = socket;

			/* ======================================================
         CONNECT
      ====================================================== */

			socket.on("connect", () => {
				if (!mountedRef.current) {
					return;
				}

				console.log("📡 WebSocket connected ✅");

				setIsConnected(true);

				reconnectAttemptsRef.current = 0;

				clearReconnectTimeout();
			});

			/* ======================================================
         DISCONNECT
      ====================================================== */

			socket.on("disconnect", (reason) => {
				console.log("📡 WebSocket disconnected:", reason);

				if (!mountedRef.current) {
					return;
				}

				setIsConnected(false);

				/*
				 * If this is a stale socket (user changed or
				 * a new socket was created), skip reconnect.
				 */
				if (generation !== reconnectGenerationRef.current) {
					return;
				}

				if (!userIdRef.current) {
					return;
				}

				if (
					reconnectAttemptsRef.current >=
					MAX_RECONNECT_ATTEMPTS
				) {
					console.warn(
						"⚠️ Maximum WebSocket reconnect attempts reached.",
					);

					toast.warning(
						"Unable to connect to real-time notifications. Please refresh the page.",
					);

					return;
				}

				const delay = Math.min(
					BASE_RECONNECT_DELAY *
						Math.pow(1.5, reconnectAttemptsRef.current),
					MAX_RECONNECT_DELAY,
				);

				reconnectAttemptsRef.current += 1;

				console.log(
					`🔄 Attempting to reconnect WebSocket in ${delay / 1000}s... ` +
						`(Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
				);

				clearReconnectTimeout();

				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectTimeoutRef.current = null;

					if (!mountedRef.current) {
						return;
					}

					if (
						generation !==
						reconnectGenerationRef.current
					) {
						return;
					}

					if (!userIdRef.current) {
						return;
					}

					setupSocket();
				}, delay);
			});

			/* ======================================================
         CONNECTION ERROR
      ====================================================== */

			socket.on("connect_error", (error) => {
				console.error(
					"📡 WebSocket connection error:",
					describeError(error),
				);

				if (!mountedRef.current) {
					return;
				}

				setIsConnected(false);
			});

			/* ======================================================
         NOTIFICATIONS
      ====================================================== */

			socket.on("notification", (notification) => {
				console.log("🔔 New notification received:", notification);

				addRealtimeNotification(notification);
			});

			/* ======================================================
         CHAT: RECEIVE
      ====================================================== */

			socket.on("chat:receive", (message) => {
				window.dispatchEvent(
					new CustomEvent("chat:receive", {
						detail: message,
					}),
				);
			});

			/* ======================================================
         MESSAGE DELETED
      ====================================================== */

			socket.on("chat:message:deleted", (data) => {
				console.log("🗑️ chat:message:deleted received:", data);

				window.dispatchEvent(
					new CustomEvent("chat:message:deleted", {
						detail: data,
					}),
				);
			});

			/* ======================================================
         CHAT: CONVERSATION UPDATE
         
         Replaces the Supabase conversations UPDATE listener.
      ====================================================== */

			socket.on("chat:conversation:update", (data) => {
				console.log("🔄 Conversation updated:", data);

				window.dispatchEvent(
					new CustomEvent("chat:conversation:update", {
						detail: data,
					}),
				);
			});

			/* ======================================================
         CHAT: READ
      ====================================================== */

			socket.on("chat:read", (data) => {
				console.log("📖 Messages read:", data);

				window.dispatchEvent(
					new CustomEvent("chat:read", {
						detail: data,
					}),
				);
			});

			/* ======================================================
         CHAT: TYPING
      ====================================================== */

			socket.on("chat:typing", (data) => {
				window.dispatchEvent(
					new CustomEvent("chat:typing", {
						detail: data,
					}),
				);
			});

			/* ======================================================
         DISCUSSION: NEW
      ====================================================== */

			socket.on("discussion:new", (message) => {
				window.dispatchEvent(
					new CustomEvent("discussion:new", {
						detail: message,
					}),
				);
			});

			/* ======================================================
         DISCUSSION: UPDATE
      ====================================================== */

			socket.on("discussion:update", (message) => {
				window.dispatchEvent(
					new CustomEvent("discussion:update", {
						detail: message,
					}),
				);
			});

			/* ======================================================
         DISCUSSION: DELETE
      ====================================================== */

			socket.on("discussion:delete", (data) => {
				window.dispatchEvent(
					new CustomEvent("discussion:delete", {
						detail: data,
					}),
				);
			});
		} catch (error) {
			console.error(
				"❌ Error creating WebSocket:",
				describeError(error),
			);

			if (!mountedRef.current) {
				return;
			}

			setIsConnected(false);

			clearReconnectTimeout();

			reconnectTimeoutRef.current = setTimeout(() => {
				reconnectTimeoutRef.current = null;

				if (!mountedRef.current) {
					return;
				}

				if (generation !== reconnectGenerationRef.current) {
					return;
				}

				if (!userIdRef.current) {
					return;
				}

				setupSocket();
			}, 5000);
		}
	}, [addRealtimeNotification, clearReconnectTimeout]);

	/* ==========================================================
     SEND CHAT MESSAGE
  ========================================================== */

	const sendChatMessage = useCallback(
		(data) => {
			if (!socketRef.current || !isConnected) {
				console.error("WebSocket not connected");

				return Promise.reject(
					new Error("WebSocket not connected"),
				);
			}

			return new Promise((resolve, reject) => {
				socketRef.current.emit(
					"chat:send",
					data,
					(response) => {
						if (response?.success) {
							resolve(response);
						} else {
							reject(
								new Error(
									response?.error ||
										"Failed to send chat message",
								),
							);
						}
					},
				);
			});
		},
		[isConnected],
	);

	/* ==========================================================
     MARK CHAT AS READ
  ========================================================== */

	const markChatAsRead = useCallback(
		(conversationId) => {
			if (socketRef.current && isConnected && conversationId) {
				socketRef.current.emit("chat:markRead", {
					conversationId,
				});
			}
		},
		[isConnected],
	);

	/* ==========================================================
     SEND TYPING INDICATOR
  ========================================================== */

	const sendTyping = useCallback(
		(conversationId, recipientId, isTyping) => {
			if (
				socketRef.current &&
				isConnected &&
				conversationId &&
				recipientId
			) {
				socketRef.current.emit("chat:typing", {
					conversationId,
					recipientId,
					isTyping,
				});
			}
		},
		[isConnected],
	);

	/* ==========================================================
     JOIN DISCUSSION
  ========================================================== */

	const joinDiscussion = useCallback((itemId) => {
		if (itemId && socketRef.current) {
			socketRef.current.emit("discussion:join", {
				itemId,
			});
		}
	}, []);

	/* ==========================================================
     LEAVE DISCUSSION
  ========================================================== */

	const leaveDiscussion = useCallback((itemId) => {
		if (itemId && socketRef.current) {
			socketRef.current.emit("discussion:leave", {
				itemId,
			});
		}
	}, []);

	/* ==========================================================
     INITIALIZE
     ----------------------------------------------------------
     Depends only on `userId` (a primitive). The socket, fetch,
     and reconnect machinery is now immune to auth-context
     object identity churn.
  ========================================================== */

	useEffect(() => {
		mountedRef.current = true;

		if (!userId) {
			setIsConnected(false);
			setNotifications([]);
			setUnreadCount(0);

			if (socketRef.current) {
				socketRef.current.removeAllListeners();
				socketRef.current.disconnect();
				socketRef.current = null;
			}

			clearReconnectTimeout();

			reconnectAttemptsRef.current = 0;
			reconnectGenerationRef.current += 1;

			return () => {
				mountedRef.current = false;
			};
		}

		fetchNotifications();

		const timer = setTimeout(() => {
			if (mountedRef.current && userIdRef.current) {
				setupSocket();
			}
		}, 1000);

		return () => {
			clearTimeout(timer);

			clearReconnectTimeout();

			if (socketRef.current) {
				socketRef.current.removeAllListeners();
				socketRef.current.disconnect();
				socketRef.current = null;
			}

			setIsConnected(false);

			reconnectAttemptsRef.current = 0;
			reconnectGenerationRef.current += 1;
		};
	}, [userId, fetchNotifications, setupSocket, clearReconnectTimeout]);

	/* ==========================================================
     MARK NOTIFICATION AS READ
  ========================================================== */

	const markAsRead = useCallback(async (id) => {
		if (!id) {
			return;
		}

		try {
			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}/${id}/read`,
				{
					method: "PUT",
					headers: getAuthHeaders(),
				},
			);

			await parseResponse(response);

			if (!mountedRef.current) {
				return;
			}

			setNotifications((current) =>
				current.map((notification) =>
					notification.id === id
						? {
								...notification,
								is_read: true,
							}
						: notification,
				),
			);

			setUnreadCount((currentUnread) =>
				Math.max(0, currentUnread - 1),
			);
		} catch (error) {
			console.error(
				"❌ Error marking notification as read:",
				describeError(error),
			);

			toast.error("Failed to mark notification as read");
		}
	}, []);

	/* ==========================================================
     MARK ALL NOTIFICATIONS AS READ
  ========================================================== */

	const markAllAsRead = useCallback(async () => {
		try {
			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}/read-all`,
				{
					method: "PUT",
					headers: getAuthHeaders(),
				},
			);

			await parseResponse(response);

			if (!mountedRef.current) {
				return;
			}

			setNotifications((current) =>
				current.map((notification) => ({
					...notification,
					is_read: true,
				})),
			);

			setUnreadCount(0);

			toast.success("All notifications marked as read");
		} catch (error) {
			console.error(
				"❌ Error marking all notifications as read:",
				describeError(error),
			);

			toast.error("Failed to mark all notifications as read");
		}
	}, []);

	/* ==========================================================
     BULK DELETE NOTIFICATIONS
  ========================================================== */

	const bulkDeleteNotifications = useCallback(async (ids) => {
		if (!Array.isArray(ids) || ids.length === 0) {
			return {
				success: true,
				deleted: 0,
			};
		}

		try {
			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}/bulk/delete`,
				{
					method: "POST",
					headers: getAuthHeaders(),
					body: JSON.stringify({
						ids,
					}),
				},
			);

			const data = await parseResponse(response);

			if (!mountedRef.current) {
				return data;
			}

			setNotifications((current) => {
				const deletedUnreadCount = current.filter(
					(notification) =>
						ids.includes(notification.id) &&
						!notification.is_read,
				).length;

				if (deletedUnreadCount > 0) {
					setUnreadCount((currentUnread) =>
						Math.max(
							0,
							currentUnread - deletedUnreadCount,
						),
					);
				}

				return current.filter(
					(notification) => !ids.includes(notification.id),
				);
			});

			return data;
		} catch (error) {
			console.error(
				"❌ Error bulk deleting notifications:",
				describeError(error),
			);

			throw error;
		}
	}, []);

	/* ==========================================================
     BULK MARK NOTIFICATIONS AS READ
  ========================================================== */

	const bulkMarkAsRead = useCallback(async (ids) => {
		if (!Array.isArray(ids) || ids.length === 0) {
			return {
				success: true,
				updated: 0,
			};
		}

		try {
			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}/bulk/read`,
				{
					method: "POST",
					headers: getAuthHeaders(),
					body: JSON.stringify({
						ids,
					}),
				},
			);

			const data = await parseResponse(response);

			if (!mountedRef.current) {
				return data;
			}

			setNotifications((current) => {
				const markedUnreadCount = current.filter(
					(notification) =>
						ids.includes(notification.id) &&
						!notification.is_read,
				).length;

				if (markedUnreadCount > 0) {
					setUnreadCount((currentUnread) =>
						Math.max(
							0,
							currentUnread - markedUnreadCount,
						),
					);
				}

				return current.map((notification) =>
					ids.includes(notification.id)
						? {
								...notification,
								is_read: true,
							}
						: notification,
				);
			});

			return data;
		} catch (error) {
			console.error(
				"❌ Error bulk marking notifications as read:",
				describeError(error),
			);

			throw error;
		}
	}, []);

	/* ==========================================================
     DELETE NOTIFICATION
     ----------------------------------------------------------
     Reads the current list from a ref instead of the closure
     so the callback identity is stable and there is no race
     with realtime inserts.
  ========================================================== */

	const deleteNotification = useCallback(async (id) => {
		if (!id) {
			return;
		}

		try {
			const notificationToDelete =
				notificationsRef.current.find(
					(notification) => notification.id === id,
				);

			const response = await fetch(
				`${NOTIFICATIONS_BASE_URL}/${id}`,
				{
					method: "DELETE",
					headers: getAuthHeaders(),
				},
			);

			await parseResponse(response);

			if (!mountedRef.current) {
				return;
			}

			setNotifications((current) =>
				current.filter(
					(notification) => notification.id !== id,
				),
			);

			if (
				notificationToDelete &&
				!notificationToDelete.is_read
			) {
				setUnreadCount((currentUnread) =>
					Math.max(0, currentUnread - 1),
				);
			}

			toast.success("Notification deleted");
		} catch (error) {
			console.error(
				"❌ Error deleting notification:",
				describeError(error),
			);

			toast.error("Failed to delete notification");
		}
	}, []);

	/* ==========================================================
     REFRESH NOTIFICATIONS
  ========================================================== */

	const refetchNotifications = useCallback(async () => {
		await fetchNotifications();
	}, [fetchNotifications]);

	/* ==========================================================
     RETURN API
     ----------------------------------------------------------
     Memoized so consumers only re-render when a value they
     read actually changes, not on every parent render.
  ========================================================== */

	return useMemo(
		() => ({
			isConnected,
			notifications,
			unreadCount,

			// Notifications
			markAsRead,
			markAllAsRead,
			deleteNotification,
			bulkDeleteNotifications,
			bulkMarkAsRead,
			refetchNotifications,

			// Chat
			sendChatMessage,
			markChatAsRead,
			sendTyping,

			// Item discussions
			joinDiscussion,
			leaveDiscussion,
		}),
		[
			isConnected,
			notifications,
			unreadCount,
			markAsRead,
			markAllAsRead,
			deleteNotification,
			bulkDeleteNotifications,
			bulkMarkAsRead,
			refetchNotifications,
			sendChatMessage,
			markChatAsRead,
			sendTyping,
			joinDiscussion,
			leaveDiscussion,
		],
	);
};

/* ============================================================
   SHARED WEBSOCKET CONTEXT
============================================================ */

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
	const ws = useWebSocket();

	return (
		<WebSocketContext.Provider value={ws}>
			{children}
		</WebSocketContext.Provider>
	);
};

/* ============================================================
   WEBSOCKET CONTEXT HOOK
============================================================ */

export const useWebSocketContext = () => {
	const ctx = useContext(WebSocketContext);

	if (!ctx) {
		throw new Error(
			"useWebSocketContext must be used within a WebSocketProvider",
		);
	}

	return ctx;
};