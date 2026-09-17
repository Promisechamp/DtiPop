// backend/src/controllers/itemDiscussionController.js
import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// RLS is disabled on item_discussions — all authorization happens here.

const PROFILE_FIELDS = 'id, full_name, avatar_url, role, email_verified';

// ─── Get all discussion messages for an item (public — no auth required) ───
export const getItemDiscussions = async (req, res) => {
  try {
    const { itemId } = req.params;

    // 1. Fetch the item details (including donor profile)
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        category,
        condition,
        status,
        images,
        donor_id,
        created_at,
        updated_at,
        donor:profiles!donor_id(id, full_name, avatar_url, location, email, email_verified)
      `)
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // 2. Fetch discussion messages
    const { data: messages, error: messagesError } = await supabase
      .from('item_discussions')
      .select(`*, user:profiles!user_id(${PROFILE_FIELDS})`)
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching item discussions:', messagesError);
      return res.status(500).json({ success: false, error: 'Failed to load discussion' });
    }

    return res.json({
      success: true,
      item,           // full item details + donor profile
      messages,
    });
  } catch (error) {
    console.error('getItemDiscussions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load discussion' });
  }
};

// ─── Post a new message or reply ────────────────────────────────────────────
export const createDiscussionMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { itemId } = req.params;
    const { content, parentId = null, mentionedUserIds = [] } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Verify item exists and grab donor_id for later notification/ownership checks
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, donor_id, title')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // If replying, make sure the parent belongs to the same item
    let parentMessage = null;
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('item_discussions')
        .select('id, user_id, item_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parent || parent.item_id !== itemId) {
        return res.status(400).json({ success: false, error: 'Invalid parent message' });
      }
      parentMessage = parent;
    }

    const { data: message, error: insertError } = await supabase
      .from('item_discussions')
      .insert({
        item_id: itemId,
        user_id: userId,
        parent_id: parentId,
        content: content.trim(),
        mentioned_user_ids: mentionedUserIds,
      })
      .select(`*, user:profiles!user_id(${PROFILE_FIELDS})`)
      .single();

    if (insertError) {
      console.error('Error creating discussion message:', insertError);
      return res.status(500).json({ success: false, error: 'Failed to post message' });
    }

    // Emit to everyone viewing this item's discussion
    const io = req.app.get('io');
    if (io) {
      io.to(`item-discussion:${itemId}`).emit('discussion:new', message);
    }

    // Notify mentioned users (dedupe, exclude self)
    const notifyIds = new Set(mentionedUserIds.filter((id) => id && id !== userId));

    // Also notify the parent message's author if not already mentioned and not self
    if (parentMessage && parentMessage.user_id !== userId) {
      notifyIds.add(parentMessage.user_id);
    }

    if (notifyIds.size > 0) {
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const senderName = sender?.full_name || 'Someone';
      const isReplyOnly = notifyIds.size === 1 && parentMessage && !mentionedUserIds.includes([...notifyIds][0]);

      for (const targetId of notifyIds) {
        const wasMentioned = mentionedUserIds.includes(targetId);
        await createNotification(
          targetId,
          wasMentioned ? 'mention' : 'discussion_reply',
          wasMentioned ? 'You were mentioned' : 'New reply',
          wasMentioned
            ? `${senderName} mentioned you in a discussion on "${item.title}"`
            : `${senderName} replied to your message on "${item.title}"`,
          {
            item_id: itemId,
            message_id: message.id,
            sender_id: userId,
            sender_name: senderName,
          }
        );
      }
    }

    return res.json({ success: true, message });
  } catch (error) {
    console.error('createDiscussionMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to post message' });
  }
};

// ─── Edit a message (owner only) ────────────────────────────────────────────
export const updateDiscussionMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('item_discussions')
      .select('id, user_id, item_id, is_deleted')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (existing.is_deleted) {
      return res.status(400).json({ success: false, error: 'Cannot edit a deleted message' });
    }

    // Edit is owner-only (unlike delete, which the item donor can also do)
    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this message' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('item_discussions')
      .update({ content: content.trim(), is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, user:profiles!user_id(${PROFILE_FIELDS})`)
      .single();

    if (updateError) {
      console.error('Error updating discussion message:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update message' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`item-discussion:${existing.item_id}`).emit('discussion:update', updated);
    }

    return res.json({ success: true, message: updated });
  } catch (error) {
    console.error('updateDiscussionMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update message' });
  }
};

// ─── Delete a message (message owner OR item owner/donor) ─────────────────
export const deleteDiscussionMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from('item_discussions')
      .select('id, user_id, item_id, is_deleted, items:item_id(donor_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const isMessageOwner = existing.user_id === userId;
    const isItemOwner = existing.items?.donor_id === userId;

    if (!isMessageOwner && !isItemOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }

    const { error: deleteError } = await supabase
      .from('item_discussions')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting discussion message:', deleteError);
      return res.status(500).json({ success: false, error: 'Failed to delete message' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`item-discussion:${existing.item_id}`).emit('discussion:delete', { id, itemId: existing.item_id });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteDiscussionMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
};

// ─── Report a message (authenticated users only) ────────────────────────────
export const reportDiscussionMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }

    // Check the message exists and is not already deleted
    const { data: message, error: fetchError } = await supabase
      .from('item_discussions')
      .select('id, item_id, is_deleted')
      .eq('id', id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.is_deleted) {
      return res.status(400).json({ success: false, error: 'Cannot report a deleted message' });
    }

    // Insert into your new table
    const { data: report, error: insertError } = await supabase
      .from('item_discussion_reports')
      .insert({
        item_discussion_id: id,
        reported_by: userId,
        reason: reason.trim(),
        description: description?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating report:', insertError);
      return res.status(500).json({ success: false, error: 'Failed to submit report' });
    }

    return res.json({ success: true, report });
  } catch (error) {
    console.error('reportDiscussionMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
};

// ─── Admin: Get all item discussion reports ──────────────────────────────
export const adminGetItemDiscussionReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('item_discussion_reports')
      .select(`
        *,
        reporter:reported_by(id, full_name, avatar_url, email),
        message:item_discussion_id(
          id,
          content,
          user_id,
          item_id,
          created_at,
          is_deleted,
          user:profiles!user_id(id, full_name, avatar_url)
        )
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ success: false, error: 'Failed to load reports' });
    }

    // Mask deleted message content if admin? Actually we show original content for admin, but we already have it.
    const reports = data.map(r => ({
      ...r,
      message: r.message ? {
        ...r.message,
        // if message is deleted, still show content for admin (we have it in the DB)
        // but we might want to show a flag
        content: r.message.is_deleted ? r.message.content : r.message.content,
        author: r.message.user,
      } : null,
    }));

    return res.json({
      success: true,
      reports,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('adminGetItemDiscussionReports error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load reports' });
  }
};

// ─── Admin: Update report status ────────────────────────────────────────────
export const adminUpdateItemDiscussionReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('item_discussion_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return res.status(500).json({ success: false, error: 'Failed to update report' });
    }

    return res.json({ success: true, report: data });
  } catch (error) {
    console.error('adminUpdateItemDiscussionReportStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update report' });
  }
};

// ─── Admin: Delete a report ────────────────────────────────────────────────
export const adminDeleteItemDiscussionReport = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('item_discussion_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete report' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('adminDeleteItemDiscussionReport error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
};