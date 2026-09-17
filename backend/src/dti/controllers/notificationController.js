// backend/controllers/notificationController.js
import { supabase } from '../../db/index.js';
import { sendNotification } from '../../index.js';
// ─── Helper: fetch user's in‑app notification preference ───
const getUserInAppPreference = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'in_app_notifications')
      .maybeSingle();

    if (error) {
      console.error(`Error fetching in_app_notifications for user ${userId}:`, error);
      return true; // fallback to enabled
    }
    // Default to true if not set
    return data?.value !== undefined ? data.value : true;
  } catch (err) {
    console.error(`Unexpected error fetching user preference:`, err);
    return true;
  }
};

// ─── Create notification (central entry) ──────────────────
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    // 1. Always save to database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    // 2. Check if user wants real‑time alerts
    const inAppEnabled = await getUserInAppPreference(userId);

    let realtimeSent = false;
    if (inAppEnabled) {
      realtimeSent = sendNotification(userId, notification);
      console.log(`📦 Notification for user ${userId}: ${title} (WebSocket: ${realtimeSent ? '✅' : '❌'})`);
    } else {
      console.log(`🚫 In-app notifications disabled for user ${userId}, skipping WebSocket send`);
    }

    return {
      success: true,
      notification,
      realtime_sent: realtimeSent,
      skipped: !inAppEnabled
    };

  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
};

// ─── Get all notifications for current user ──────────────────
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const unreadCount = data?.filter(n => !n.is_read).length || 0;

    res.json({
      success: true,
      notifications: data || [],
      total: count || 0,
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// ─── Get unread count ──────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      unread_count: count || 0
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
};

// ─── Mark a notification as read ──────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const { data: existing, error: checkError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this notification'
      });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      notification: data
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// ─── Mark all notifications as read ──────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
};

// ─── Delete a notification ─────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const { data: existing, error: checkError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this notification'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
};

// ─── Bulk delete notifications ────────────────────────────
export const bulkDeleteNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No notification IDs provided'
      });
    }

    const { data: existing, error: checkError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .in('id', notificationIds);

    if (checkError) {
      return res.status(400).json({
        success: false,
        error: checkError.message
      });
    }

    const unauthorized = existing?.filter(n => n.user_id !== userId);
    if (unauthorized && unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete some of these notifications'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `${notificationIds.length} notification${notificationIds.length > 1 ? 's' : ''} deleted successfully`,
      deleted_count: notificationIds.length
    });

  } catch (error) {
    console.error('Bulk delete notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notifications'
    });
  }
};

// ─── Bulk mark as read ──────────────────────────────────────
export const bulkMarkAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No notification IDs provided'
      });
    }

    const { data: existing, error: checkError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .in('id', notificationIds);

    if (checkError) {
      return res.status(400).json({
        success: false,
        error: checkError.message
      });
    }

    const unauthorized = existing?.filter(n => n.user_id !== userId);
    if (unauthorized && unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to mark some of these notifications as read'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .in('id', notificationIds);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `${notificationIds.length} notification${notificationIds.length > 1 ? 's' : ''} marked as read`,
      marked_count: notificationIds.length
    });

  } catch (error) {
    console.error('Bulk mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
};

// ─── Default export ──────────────────────────────────────────
export default {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
  bulkMarkAsRead,
};