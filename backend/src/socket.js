// backend/src/socket.js

import { supabaseAdmin } from "./db/index.js";

import { createPOPChatNotification } from "./shared/controllers/notificationController.js";

export const setupSocketHandlers = (io) => {
	io.on("connection", (socket) => {
		const userId = socket.handshake.auth.userId;

		// ============================================================
		// AUTHENTICATION
		// ============================================================

		if (!userId) {
			console.log("⚠️ Socket connection rejected: No userId provided");

			socket.disconnect();
			return;
		}

		socket.join(`user:${userId}`);

		console.log(`📡 Socket connected for user: ${userId}`);

		// ============================================================
		// SEND CHAT MESSAGE
		// ============================================================

		socket.on("chat:send", async (data, callback) => {
			try {
				const {
					conversationId,
					content,
					clientId,

					reply_to_id: rawReplyToId,

					replyToId: rawReplyToIdCamel,
				} = data || {};

				const replyToId = rawReplyToId || rawReplyToIdCamel || null;

				// --------------------------------------------------------
				// Validate conversation
				// --------------------------------------------------------

				if (!conversationId) {
					callback?.({
						success: false,
						error: "Conversation ID is required",
					});

					return;
				}

				// --------------------------------------------------------
				// Validate message
				// --------------------------------------------------------

				if (!content || typeof content !== "string" || !content.trim()) {
					callback?.({
						success: false,
						error: "Message is required",
					});

					return;
				}

				const trimmedContent = content.trim().slice(0, 5000);

				// ========================================================
				// LOAD CONVERSATION
				// ========================================================

				const { data: conversation, error: conversationError } = await supabaseAdmin
					.from("conversations")
					.select(
						`
            id,
            context_type,
            requester_id,
            provider_id,
            request_id,
            provider_relationship_id,
            is_closed,
            is_deleted
          `,
					)
					.eq("id", conversationId)
					.eq("context_type", "request")
					.maybeSingle();

				if (conversationError) {
					console.error("❌ Conversation lookup error:", conversationError);

					callback?.({
						success: false,
						error: "Failed to verify conversation",
					});

					return;
				}

				if (!conversation) {
					console.error("❌ Conversation not found:", conversationId);

					callback?.({
						success: false,
						error: "Conversation not found",
					});

					return;
				}

				// ========================================================
				// VERIFY PARTICIPANT
				// ========================================================

				const isRequester = String(conversation.requester_id) === String(userId);

				const isProvider = String(conversation.provider_id) === String(userId);

				if (!isRequester && !isProvider) {
					console.error(
						`❌ User ${userId} is not a participant of conversation ${conversationId}`,
					);

					callback?.({
						success: false,
						error: "Not a participant",
					});

					return;
				}

				// ========================================================
				// CHECK CLOSED CONVERSATION
				// ========================================================

				if (conversation.is_closed) {
					callback?.({
						success: false,
						error: "Conversation is closed",
					});

					return;
				}

				// ========================================================
				// CHECK DELETED CONVERSATION
				// ========================================================

				if (conversation.is_deleted) {
					callback?.({
						success: false,
						error: "Conversation is deleted",
					});

					return;
				}

				// ========================================================
				// DETERMINE RECIPIENT
				// ========================================================

				const recipientId = isRequester
					? conversation.provider_id
					: conversation.requester_id;

				if (!recipientId) {
					console.error(
						"❌ Could not determine recipient for conversation:",
						conversationId,
					);

					callback?.({
						success: false,
						error: "Recipient could not be determined",
					});

					return;
				}

				// ========================================================
				// VALIDATE REPLY TARGET
				// ========================================================

				let replyTarget = null;

				if (replyToId) {
					const { data: replyMessage, error: replyLookupError } = await supabaseAdmin
						.from("messages")
						.select(
							`
              id,
              conversation_id,
              sender_id,
              content,
              type,
              client_id,
              metadata,
              is_read,
              read_at,
              delivered_at,
              is_deleted,
              deleted_at,
              deleted_for,
              edited_at,
              created_at,
              updated_at,

              sender:profiles!messages_sender_id_fkey(
                id,
                full_name,
                avatar_url
              )
            `,
						)
						.eq("id", replyToId)
						.eq("conversation_id", conversationId)
						.maybeSingle();

					if (replyLookupError) {
						console.error("❌ Reply target lookup error:", replyLookupError);

						callback?.({
							success: false,
							error: "Failed to verify reply message",
						});

						return;
					}

					if (!replyMessage) {
						console.error(
							`❌ Reply target ${replyToId} was not found in conversation ${conversationId}`,
						);

						callback?.({
							success: false,
							error: "Reply message not found",
						});

						return;
					}

					replyTarget = replyMessage;

					console.log(`↩️ Reply target verified: ${replyToId}`);
				}

				// ========================================================
				// SAVE MESSAGE
				// ========================================================

				const { data: message, error: messageError } = await supabaseAdmin
					.from("messages")
					.insert({
						conversation_id: conversationId,

						sender_id: userId,

						content: trimmedContent,

						type: "text",

						client_id: clientId || null,

						reply_to_id: replyToId || null,

						is_read: false,

						is_deleted: false,

						metadata: {},
					})
					.select(
						`
            id,
            conversation_id,
            sender_id,
            content,
            type,
            client_id,
            reply_to_id,
            metadata,
            is_read,
            read_at,
            delivered_at,
            is_deleted,
            deleted_at,
            deleted_for,
            edited_at,
            created_at,
            updated_at,

            sender:profiles!messages_sender_id_fkey(
              id,
              full_name,
              avatar_url
            )
          `,
					)
					.single();

				if (messageError) {
					console.error("❌ Error saving message:", messageError);

					callback?.({
						success: false,
						error: "Failed to save message",
					});

					return;
				}

				// ========================================================
				// HYDRATE REPLY OBJECT
				// ========================================================

				const realtimeMessage = {
					...message,

					reply_to: replyTarget
						? {
								...replyTarget,
							}
						: null,
				};

				console.log(`💾 Message saved: ${message.id}`);

				if (replyToId) {
					console.log(`↩️ Message ${message.id} replies to ${replyToId}`);
				}

				// ========================================================
				// UPDATE CONVERSATION
				// ========================================================

				const now = new Date().toISOString();

				const { data: updatedConversation, error: conversationUpdateError } =
					await supabaseAdmin
						.from("conversations")
						.update({
							last_message: trimmedContent.slice(0, 200),

							last_message_at: now,

							last_message_sender_id: userId,

							updated_at: now,

							deleted_by: [],
						})
						.eq("id", conversationId)
						.select(
							`
            id,
            context_type,
            requester_id,
            provider_id,
            request_id,
            provider_relationship_id,
            last_message,
            last_message_at,
            last_message_sender_id,
            is_closed,
            is_deleted,
            deleted_by,
            created_at,
            updated_at
          `,
						)
						.single();

				if (conversationUpdateError) {
					console.error("⚠️ Conversation update error:", conversationUpdateError);
				}

				// ========================================================
				// SOCKET.IO REALTIME DELIVERY
				// ========================================================

				const recipientRoom = `user:${recipientId}`;

				const senderRoom = `user:${userId}`;

				console.log("💬 chat:send emitting to:", recipientRoom);

				// --------------------------------------------------------
				// Recipient
				// --------------------------------------------------------

				io.to(recipientRoom).emit("chat:receive", realtimeMessage);

				// --------------------------------------------------------
				// Sender
				// --------------------------------------------------------

				io.to(senderRoom).emit("chat:receive", realtimeMessage);

				// ========================================================
				// CONVERSATION METADATA REALTIME
				// ========================================================

				if (updatedConversation) {
					const conversationUpdatePayload = {
						conversationId,
						conversation: updatedConversation,
					};

					io
						.to(recipientRoom)
						.emit("chat:conversation:update", conversationUpdatePayload);

					io
						.to(senderRoom)
						.emit("chat:conversation:update", conversationUpdatePayload);

					console.log(`🔄 Conversation update emitted for ${conversationId}`);
				}

				// ========================================================
				// GET SENDER PROFILE
				// ========================================================

				const { data: sender, error: senderError } = await supabaseAdmin
					.from("profiles")
					.select(
						`
            id,
            full_name
          `,
					)
					.eq("id", userId)
					.maybeSingle();

				if (senderError) {
					console.error("⚠️ Sender profile lookup error:", senderError);
				}

				// ========================================================
				// CREATE / UPDATE POP CHAT NOTIFICATION
				// ========================================================

				try {
					const notificationResult = await createPOPChatNotification(
						recipientId,
						conversationId,
						userId,
						sender?.full_name || "Someone",
						trimmedContent.substring(0, 120),
					);

					if (!notificationResult?.success) {
						console.error(
							"❌ Failed to create/update POP chat notification:",
							notificationResult?.error,
						);
					}
				} catch (notificationError) {
					console.error("❌ POP chat notification error:", notificationError);
				}

				// ========================================================
				// ACKNOWLEDGE CLIENT
				// ========================================================

				callback?.({
					success: true,

					message: realtimeMessage,

					conversation: updatedConversation || null,
				});
			} catch (error) {
				console.error("❌ Chat send error:", error);

				callback?.({
					success: false,
					error: "Failed to send message",
				});
			}
		});

		// ============================================================
		// MARK MESSAGES AS READ
		// ============================================================

		socket.on("chat:markRead", async (data) => {
			try {
				const { conversationId } = data || {};

				if (!conversationId) {
					return;
				}

				const { data: conversation, error: conversationError } = await supabaseAdmin
					.from("conversations")
					.select(
						`
              id,
              context_type,
              requester_id,
              provider_id
            `,
					)
					.eq("id", conversationId)
					.eq("context_type", "request")
					.maybeSingle();

				if (conversationError) {
					console.error(
						"❌ Mark read conversation lookup error:",
						conversationError,
					);

					return;
				}

				if (!conversation) {
					console.error("❌ Mark read conversation not found:", conversationId);

					return;
				}

				const isParticipant =
					String(conversation.requester_id) === String(userId) ||
					String(conversation.provider_id) === String(userId);

				if (!isParticipant) {
					console.error(
						`❌ User ${userId} is not a participant of conversation ${conversationId}`,
					);

					return;
				}

				const otherUserId =
					String(conversation.requester_id) === String(userId)
						? conversation.provider_id
						: conversation.requester_id;

				const readAt = new Date().toISOString();

				const { error: updateError } = await supabaseAdmin
					.from("messages")
					.update({
						is_read: true,

						read_at: readAt,

						delivered_at: readAt,
					})
					.eq("conversation_id", conversationId)
					.neq("sender_id", userId)
					.eq("is_read", false);

				if (updateError) {
					console.error("❌ Mark read update error:", updateError);

					return;
				}

				if (otherUserId) {
					io.to(`user:${otherUserId}`).emit("chat:read", {
						conversationId,
						readBy: userId,
						readAt,
					});
				}
			} catch (error) {
				console.error("❌ Mark read error:", error);
			}
		});

		// ============================================================
		// TYPING INDICATOR
		// ============================================================

		socket.on("chat:typing", (data) => {
			try {
				const { conversationId, recipientId, isTyping } = data || {};

				if (!conversationId || !recipientId) {
					return;
				}

				io.to(`user:${recipientId}`).emit("chat:typing", {
					conversationId,
					userId,
					isTyping,
				});
			} catch (error) {
				console.error("❌ Typing event error:", error);
			}
		});

		// ============================================================
		// DISCONNECT
		// ============================================================

		socket.on("disconnect", () => {
			console.log(`📡 Socket disconnected for user: ${userId}`);
		});

		// ============================================================
		// SOCKET ERROR
		// ============================================================

		socket.on("error", (error) => {
			console.error(`❌ Socket error for user ${userId}:`, error);
		});
	});
};
