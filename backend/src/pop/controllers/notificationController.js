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
    return data?.value !== undefined ? data.value : true;
  } catch (err) {
    console.error(`Unexpected error fetching user preference:`, err);
    return true;
  }
};

// ─── Create notification (central entry) ──────────────────
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const { data: notification, error } = await supabase
      .from('pop_notifications')
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

    const inAppEnabled = await getUserInAppPreference(userId);

    let realtimeSent = false;
    if (inAppEnabled) {
      try {
        realtimeSent = sendNotification(userId, notification);
        console.log(`📦 Notification for user ${userId}: ${title} (WebSocket: ${realtimeSent ? '✅' : '❌'})`);
      } catch (sendError) {
        console.error('WebSocket send failed:', sendError);
        realtimeSent = false;
      }
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
    const userId = req.user?.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = supabase
      .from('pop_notifications')
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
      return res.status(400).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// ─── Get unread count ──────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { count, error } = await supabase
      .from('pop_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, unread_count: count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
};

// ─── Mark a notification as read ──────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const { data: existing, error: checkError } = await supabase
      .from('pop_notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (checkError) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to update this notification' });
    }

    const { data, error } = await supabase
      .from('pop_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, notification: data });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

// ─── Mark all notifications as read ──────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { error } = await supabase
      .from('pop_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
};

// ─── Delete a notification ─────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const { data: existing, error: checkError } = await supabase
      .from('pop_notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (checkError) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this notification' });
    }

    const { error } = await supabase
      .from('pop_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

// ─── Delete ALL notifications for current user ─────────────
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { error } = await supabase
      .from('pop_notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all notifications' });
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
  deleteAllNotifications,
  
};