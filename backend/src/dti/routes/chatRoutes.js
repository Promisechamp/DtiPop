import express from 'express';
import { 
  getOrCreateConversation,
  getOrCreateConversationWithApplicant,
  sendMessage,
  saveFileMessage,
  getMessages,
  getConversations,
  markMessagesAsRead,
  closeChat,
  reopenChat,
  reportChat
} from '../controllers/chatController.js';
import { 
  adminGetChatReports,
  adminUpdateChatReportStatus,
  adminDeleteChatReport
} from '../controllers/chatController.js';
import { authenticate } from '../../middleware/auth.js';
import { isAdmin } from '../../middleware/admin.js';
import { supabase } from '../../db/index.js';

const router = express.Router();

// ============================================
// CONVERSATION ROUTES
// ============================================

router.get('/conversations', authenticate, getConversations);
router.get('/conversations/item/:itemId/applicant/:applicantId', authenticate, getOrCreateConversationWithApplicant);
router.get('/conversations/item/:itemId', authenticate, getOrCreateConversation);
router.get('/conversations/:conversationId/messages', authenticate, getMessages);

// ============================================
// MESSAGE ROUTES
// ============================================

router.post('/conversations/:conversationId/messages', authenticate, sendMessage);
router.post('/save-file-message', authenticate, saveFileMessage);
router.put('/conversations/:conversationId/read', authenticate, markMessagesAsRead);

// ============================================
// CHAT MANAGEMENT
// ============================================

router.post('/conversations/:conversationId/close', authenticate, closeChat);
router.post('/conversations/:conversationId/reopen', authenticate, reopenChat);
router.post('/conversations/:conversationId/report', authenticate, reportChat);

// ============================================
// UNREAD COUNT
// ============================================

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`donor_id.eq.${userId},applicant_id.eq.${userId}`)
      .eq('is_deleted', false);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const conversationIds = conversations.map(c => c.id);
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (countError) throw countError;
    res.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// ============================================
// CHAT AVAILABILITY (without system_settings)
// ============================================

router.get('/item/:itemId/available', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const isDonor = item.donor_id === userId;

    if (isDonor) {
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('status')
        .eq('item_id', itemId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (appError) {
        return res.status(500).json({ success: false, error: appError.message });
      }

      return res.json({
        success: true,
        available: !!app,
        reason: app ? 'Chat available for accepted applicant' : 'No accepted applicant yet'
      });
    }

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('status')
      .eq('item_id', itemId)
      .eq('applicant_id', userId)
      .maybeSingle();

    if (appError) {
      return res.status(500).json({ success: false, error: appError.message });
    }

    const available = app && (app.status === 'pending' || app.status === 'accepted');

    res.json({
      success: true,
      available: !!available,
      status: app?.status || null,
      reason: available ? 'Chat available' : 'You need an application to chat'
    });
  } catch (error) {
    console.error('Chat availability check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check chat availability' });
  }
});

// ============================================
// DELETE ROUTES (soft delete)
// ============================================

router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', messageId)
      .single();

    if (msgError) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        content: '[Message deleted]'
      })
      .eq('id', messageId);

    if (updateError) throw updateError;
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

router.delete('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, applicant_id, item_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('status')
      .eq('id', conversation.item_id)
      .single();

    if (itemError) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (item.status !== 'completed' && item.status !== 'cancelled') {
      return res.status(403).json({ 
        success: false, 
        error: 'Conversation can only be deleted when item is completed or cancelled' 
      });
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: userId 
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

// ============================================
// ADMIN CHAT REPORTS
// ============================================

router.get('/admin/reports', authenticate, isAdmin, adminGetChatReports);
router.put('/admin/reports/:id/status', authenticate, isAdmin, adminUpdateChatReportStatus);
router.delete('/admin/reports/:id', authenticate, isAdmin, adminDeleteChatReport);

export default router;