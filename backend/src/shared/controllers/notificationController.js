// backend/src/shared/controllers/notificationController.js

import { supabase } from "../../db/index.js";
import { sendNotification } from "../../index.js";

/* ============================================================
 * Helpers
 * ========================================================== */

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* ============================================================
 * Create generic notification
 *
 * IMPORTANT:
 * source is REQUIRED.
 *
 * Use:
 *   createDTINotification(...)
 *   createPOPNotification(...)
 *
 * from source-specific code.
 * ========================================================== */

export async function createNotification(
  userId,
  type,
  title,
  message,
  data = {},
  source
) {
  if (!userId) {
    console.warn(
      "createNotification called without userId."
    );

    return null;
  }

  if (!source) {
    console.error(
      "createNotification requires an explicit source."
    );

    return null;
  }

  try {
    /* --------------------------------------------------------
     * Check user's in-app notification setting
     * ------------------------------------------------------ */

    const { data: settings, error: settingsError } =
      await supabase
        .from("user_settings")
        .select("in_app_notifications")
        .eq("user_id", userId)
        .maybeSingle();

    if (settingsError) {
      console.warn(
        "Failed to load notification settings:",
        settingsError
      );
    }

    /*
     * If the user explicitly disabled in-app notifications,
     * do not create the notification.
     *
     * We allow NULL/missing settings to behave as enabled.
     */
    if (
      settings &&
      settings.in_app_notifications === false
    ) {
      return null;
    }

    /* --------------------------------------------------------
     * Insert notification
     * ------------------------------------------------------ */

    const notificationPayload = {
      user_id: userId,
      type,
      title,
      message,
      data: data || {},
      is_read: false,
      source,
    };

    const { data: notification, error } =
      await supabase
        .from("notifications")
        .insert(notificationPayload)
        .select()
        .single();

    if (error) {
      console.error(
        "Failed to create notification:",
        error
      );

      return null;
    }

    /* --------------------------------------------------------
     * Push / external notification service
     * ------------------------------------------------------ */

    try {
      await sendNotification(
        userId,
        notification
      );
    } catch (sendError) {
      /*
       * The notification was successfully stored.
       * A failure in the secondary notification service
       * should not make the database operation fail.
       */
      console.error(
        "Failed to send notification:",
        sendError
      );
    }

    return notification;
  } catch (error) {
    console.error(
      "createNotification error:",
      getErrorMessage(error)
    );

    return null;
  }
}

/* ============================================================
 * DTI notification
 * ========================================================== */

export async function createDTINotification(
  userId,
  type,
  title,
  message,
  data = {}
) {
  return createNotification(
    userId,
    type,
    title,
    message,
    data,
    "dti"
  );
}

/* ============================================================
 * POP notification
 * ========================================================== */

export async function createPOPNotification(
  userId,
  type,
  title,
  message,
  data = {}
) {
  return createNotification(
    userId,
    type,
    title,
    message,
    data,
    "pop"
  );
}

/* ============================================================
 * POP CHAT NOTIFICATION
 *
 * IMPORTANT:
 *
 * There is ONLY ONE notification for:
 *
 * user + conversation
 *
 * Every new message updates that notification instead of
 * creating another notification.
 *
 * Example:
 *
 * chat:abc123
 *
 * Message 1 -> creates notification
 * Message 2 -> updates notification
 * Message 3 -> updates notification
 * ...
 *
 * This prevents:
 *
 * 100 messages
 * =
 * 100 notification rows
 *
 * ========================================================== */

export async function createPOPChatNotification(
  userId,
  conversationId,
  senderId,
  senderName,
  messagePreview
) {
  if (!userId) {
    console.warn(
      "createPOPChatNotification called without userId."
    );

    return null;
  }

  if (!conversationId) {
    console.warn(
      "createPOPChatNotification called without conversationId."
    );

    return null;
  }

  const normalizedConversationId =
    String(conversationId);

  const normalizedSenderId =
    senderId
      ? String(senderId)
      : null;

  const normalizedSenderName =
    senderName || "Someone";

  const normalizedPreview =
    String(messagePreview || "").trim();

  const groupKey =
    `chat:${normalizedConversationId}`;

  try {
    /* --------------------------------------------------------
     * Check notification settings
     * ------------------------------------------------------ */

    const { data: settings, error: settingsError } =
      await supabase
        .from("user_settings")
        .select("in_app_notifications")
        .eq("user_id", userId)
        .maybeSingle();

    if (settingsError) {
      console.warn(
        "Failed to load notification settings:",
        settingsError
      );
    }

    if (
      settings &&
      settings.in_app_notifications === false
    ) {
      return null;
    }

    /* --------------------------------------------------------
     * Build payload
     * ------------------------------------------------------ */

    const notificationData = {
      chat_id: normalizedConversationId,
      conversation_id: normalizedConversationId,
      sender_id: normalizedSenderId,
      sender_name: normalizedSenderName,
      message_preview: normalizedPreview,
    };

    const notificationPayload = {
      user_id: userId,
      type: "chat",
      title: `💬 ${normalizedSenderName}`,
      message:
        normalizedPreview ||
        `${normalizedSenderName} sent you a message`,
      data: notificationData,
      is_read: false,
      source: "pop",
      group_key: groupKey,
    };

    /* --------------------------------------------------------
     * Find existing notification
     *
     * We use group_key rather than only chat_id because
     * group_key has a database-level unique constraint.
     * ------------------------------------------------------ */

    const { data: existing, error: findError } =
      await supabase
        .from("notifications")
        .select(
          "id, user_id, type, source, group_key, is_read"
        )
        .eq("user_id", userId)
        .eq("type", "chat")
        .eq("source", "pop")
        .eq("group_key", groupKey)
        .maybeSingle();

    if (findError) {
      console.error(
        "Failed to find existing chat notification:",
        findError
      );

      return null;
    }

    /* --------------------------------------------------------
     * UPDATE EXISTING
     *
     * A new message should make the notification unread again.
     * ------------------------------------------------------ */

    if (existing?.id) {
      const { data: updated, error: updateError } =
        await supabase
          .from("notifications")
          .update({
            title: `💬 ${normalizedSenderName}`,
            message:
              normalizedPreview ||
              `${normalizedSenderName} sent you a message`,
            data: notificationData,

            /*
             * New message = notification becomes unread.
             */
            is_read: false,

            /*
             * Keep the same group.
             */
            group_key: groupKey,
          })
          .eq("id", existing.id)
          .select()
          .single();

      if (updateError) {
        console.error(
          "Failed to update chat notification:",
          updateError
        );

        return null;
      }

      /* ------------------------------------------------------
       * Send notification service event
       * ---------------------------------------------------- */

      try {
        await sendNotification(
          userId,
          updated
        );
      } catch (sendError) {
        console.error(
          "Failed to send updated chat notification:",
          sendError
        );
      }

      return updated;
    }

    /* --------------------------------------------------------
     * CREATE NEW
     * ------------------------------------------------------ */

    const { data: created, error: createError } =
      await supabase
        .from("notifications")
        .insert(notificationPayload)
        .select()
        .single();

    if (createError) {
      /*
       * Because the database has a UNIQUE constraint,
       * simultaneous messages can race here.
       *
       * If another request created the notification between
       * our SELECT and INSERT, recover by loading it and
       * updating it.
       */
      if (
        createError.code === "23505"
      ) {
        const { data: racedNotification } =
          await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .eq("type", "chat")
            .eq("source", "pop")
            .eq("group_key", groupKey)
            .maybeSingle();

        if (racedNotification?.id) {
          const { data: recovered } =
            await supabase
              .from("notifications")
              .update({
                title: `💬 ${normalizedSenderName}`,
                message:
                  normalizedPreview ||
                  `${normalizedSenderName} sent you a message`,
                data: notificationData,
                is_read: false,
              })
              .eq(
                "id",
                racedNotification.id
              )
              .select()
              .single();

          if (recovered) {
            try {
              await sendNotification(
                userId,
                recovered
              );
            } catch (sendError) {
              console.error(
                "Failed to send recovered chat notification:",
                sendError
              );
            }

            return recovered;
          }
        }
      }

      console.error(
        "Failed to create chat notification:",
        createError
      );

      return null;
    }

    /* --------------------------------------------------------
     * Send notification service event
     * ------------------------------------------------------ */

    try {
      await sendNotification(
        userId,
        created
      );
    } catch (sendError) {
      console.error(
        "Failed to send chat notification:",
        sendError
      );
    }

    return created;
  } catch (error) {
    console.error(
      "createPOPChatNotification error:",
      getErrorMessage(
        error,
        "Failed to create chat notification."
      )
    );

    return null;
  }
}

/* ============================================================
 * GET NOTIFICATIONS
 * ========================================================== */

export async function getNotifications(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 50,
        1
      ),
      100
    );

    const offset = Math.max(
      Number.parseInt(
        req.query.offset,
        10
      ) || 0,
      0
    );

    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .range(
        offset,
        offset + limit - 1
      );

    if (error) {
      console.error(
        "getNotifications error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load notifications.",
      });
    }

    const {
      count: unreadCount,
      error: unreadError,
    } = await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (unreadError) {
      console.error(
        "Unread notification count error:",
        unreadError
      );
    }

    return res.json({
      notifications: data || [],
      unread_count:
        unreadCount || 0,
    });
  } catch (error) {
    console.error(
      "getNotifications unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load notifications.",
    });
  }
}

/* ============================================================
 * GET UNREAD COUNT
 * ========================================================== */

export async function getUnreadCount(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const {
      count,
      error,
    } = await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "getUnreadCount error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get unread notification count.",
      });
    }

    return res.json({
      unread_count: count || 0,
    });
  } catch (error) {
    console.error(
      "getUnreadCount unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to get unread notification count.",
    });
  }
}

/* ============================================================
 * MARK ONE AS READ
 * ========================================================== */

export async function markAsRead(
  req,
  res
) {
  try {
    const userId = req.user?.id;
    const notificationId =
      req.params?.notificationId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        message:
          "Notification ID is required.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error(
        "markAsRead error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to mark notification as read.",
      });
    }

    return res.json({
      notification: data,
    });
  } catch (error) {
    console.error(
      "markAsRead unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to mark notification as read.",
    });
  }
}

/* ============================================================
 * MARK ALL AS READ
 * ========================================================== */

export async function markAllAsRead(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const {
      error,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "markAllAsRead error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to mark notifications as read.",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "markAllAsRead unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to mark notifications as read.",
    });
  }
}

/* ============================================================
 * DELETE ONE
 * ========================================================== */

export async function deleteNotification(
  req,
  res
) {
  try {
    const userId = req.user?.id;
    const notificationId =
      req.params?.notificationId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        message:
          "Notification ID is required.",
      });
    }

    const {
      error,
    } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "deleteNotification error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete notification.",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "deleteNotification unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete notification.",
    });
  }
}

/* ============================================================
 * DELETE ALL
 * ========================================================== */

export async function deleteAllNotifications(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const {
      error,
    } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error(
        "deleteAllNotifications error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete notifications.",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "deleteAllNotifications unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete notifications.",
    });
  }
}

/* ============================================================
 * BULK DELETE
 * ========================================================== */

export async function bulkDeleteNotifications(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const ids =
      Array.isArray(req.body?.ids)
        ? req.body.ids
        : [];

    if (!ids.length) {
      return res.status(400).json({
        message:
          "Notification IDs are required.",
      });
    }

    const {
      error,
    } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      console.error(
        "bulkDeleteNotifications error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete notifications.",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "bulkDeleteNotifications unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to delete notifications.",
    });
  }
}

/* ============================================================
 * BULK MARK AS READ
 *
 * IMPORTANT:
 * notifications table does NOT have updated_at.
 * ========================================================== */

export async function bulkMarkAsRead(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const ids =
      Array.isArray(req.body?.ids)
        ? req.body.ids
        : [];

    if (!ids.length) {
      return res.status(400).json({
        message:
          "Notification IDs are required.",
      });
    }

    const {
      error,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      console.error(
        "bulkMarkAsRead error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to mark notifications as read.",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "bulkMarkAsRead unexpected error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to mark notifications as read.",
    });
  }
}





export default {
  createNotification,
  createDTINotification,
  createPOPNotification,

  getNotifications,
  getUnreadCount,

  markAsRead,
  markAllAsRead,

  deleteNotification,
  deleteAllNotifications,

  bulkDeleteNotifications,
  bulkMarkAsRead,
		createPOPChatNotification
};