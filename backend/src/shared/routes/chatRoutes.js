// shared/routes/chatRoutes.js
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isAdmin } from '../../middleware/admin.js';
import { supabase } from '../../db/index.js';

import {
  // ── Unified entrypoints ──────────────────────────────
  getOrCreateConversation,
  getOrCreateConversationWithApplicant,
  getOrCreateRequestProviderConversation,
  getOrCreateDirectConversation,

  // ── Listing / fetching ───────────────────────────────
  getMyConversations,
  getConversations,
  getConversation,
  getMessages,

  // ── Messages ─────────────────────────────────────────
  sendMessage,
  saveFileMessage, 
  editMessage,
  deleteMessage,

  // ── Lifecycle ────────────────────────────────────────
  deleteConversationForMe,
  pinConversation,
  muteConversation,
  archiveConversation,
  protectConversation,
  markConversationRead,
  markMessagesAsRead,
  closeConversation,
  closeChat,
  reopenConversation,
  reopenChat,
  reportChat,

  // ── Transcript ───────────────────────────────────────
  downloadConversationTranscript,

  // ── Admin ────────────────────────────────────────────
  adminGetChatReports,
  adminUpdateChatReportStatus,
  adminDeleteChatReport,
} from '../controllers/chatController.js';

const router = express.Router();

// Every route requires auth
router.use(authenticate);

// ============================================================
// 1) LEGACY ROOT-LEVEL HELPERS
//    Declared first so nothing shadows them later.
// ============================================================

// ---- POST /save-file-message ---------------------------------
// Legacy DTI shape → adapts to unified sendMessage.
router.post('/save-file-message', saveFileMessage);

// ---- GET /unread-count ---------------------------------------
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`requester_id.eq.${userId},provider_id.eq.${userId}`)
      .eq('is_deleted', false)
      .not('deleted_by', 'cs', `{${userId}}`);

    if (convError) throw convError;
    if (!conversations?.length) {
      return res.json({ success: true, count: 0 });
    }

    const ids = conversations.map((c) => c.id);

    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .eq('is_read', false)
      .eq('is_deleted', false)
      .neq('sender_id', userId);

    if (countError) throw countError;
    return res.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to get unread count' });
  }
});

// ---- GET /item/:itemId/available -----------------------------
// Legacy DTI chat-availability probe.
router.get('/item/:itemId/available', async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res
        .status(404)
        .json({ success: false, error: 'Item not found' });
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
        return res
          .status(500)
          .json({ success: false, error: appError.message });
      }

      return res.json({
        success: true,
        available: !!app,
        reason: app
          ? 'Chat available for accepted applicant'
          : 'No accepted applicant yet',
      });
    }

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('status')
      .eq('item_id', itemId)
      .eq('applicant_id', userId)
      .maybeSingle();

    if (appError) {
      return res
        .status(500)
        .json({ success: false, error: appError.message });
    }

    const available =
      app && (app.status === 'pending' || app.status === 'accepted');

    return res.json({
      success: true,
      available: !!available,
      status: app?.status || null,
      reason: available
        ? 'Chat available'
        : 'You need an application to chat',
    });
  } catch (error) {
    console.error('Chat availability check error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to check chat availability' });
  }
});

// ---- DELETE /messages/:messageId -----------------------------
// Legacy DTI shape: no conversation id in the path.
// Looks it up, then delegates to the unified deleteMessage.
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const { data: msg, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .single();

    if (error || !msg) {
      return res
        .status(404)
        .json({ success: false, error: 'Message not found' });
    }

    req.params.id = msg.conversation_id;
    return deleteMessage(req, res);
  } catch (error) {
    console.error('Legacy delete message error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to delete message' });
  }
});

// ============================================================
// 2) ADMIN  (must precede /conversations/:id catches)
// ============================================================

router.get('/admin/reports', isAdmin, adminGetChatReports);
router.put('/admin/reports/:id/status', isAdmin, adminUpdateChatReportStatus);
router.delete('/admin/reports/:id', isAdmin, adminDeleteChatReport);

// ============================================================
// 3) CONVERSATION CREATION / FETCH-OR-CREATE ENTRYPOINTS
//    All static-prefixed paths go above /:id routes.
// ============================================================

// Unified POST /conversations  →  context_type in body
router.post('/conversations', getOrCreateConversation);

// POP: request-context, provider relationship
router.post(
  '/requests/:requestId/providers/:relationshipId/conversation',
  getOrCreateRequestProviderConversation
);

// POP: direct
router.post('/conversations/direct', getOrCreateDirectConversation);

// DTI: item + applicant
router.get(
  '/conversations/item/:itemId/applicant/:applicantId',
  getOrCreateConversationWithApplicant
);

// DTI: item only (legacy — donor falls back to accepted/pending applicant;
// applicant uses their own application)
router.get('/conversations/item/:itemId', (req, res) => {
  req.body = {
    ...(req.body || {}),
    context_type: 'item',
    context_id: req.params.itemId,
  };
  return getOrCreateConversation(req, res);
});

// ============================================================
// 4) LIST + FETCH ONE
// ============================================================

router.get('/conversations', getMyConversations);

router.get('/conversations/:id', getConversation);

// ============================================================
// 5) MESSAGES
// ============================================================

// Legacy DTI alias: GET .../messages (returns conversation + messages)
router.get('/conversations/:id/messages', getMessages);

router.post('/conversations/:id/messages', sendMessage);

router.patch(
  '/conversations/:id/messages/:messageId',
  editMessage
);

router.delete(
  '/conversations/:id/messages/:messageId',
  deleteMessage
);

// ============================================================
// 6) CONVERSATION LIFECYCLE
// ============================================================

// Delete for me
router.delete('/conversations/:id', deleteConversationForMe);

// Pin / Mute / Archive / Protect
router.patch('/conversations/:id/pin', pinConversation);
router.patch('/conversations/:id/mute', muteConversation);
router.patch('/conversations/:id/archive', archiveConversation);
router.patch('/conversations/:id/protect', protectConversation);

// Read — accept both PATCH (POP) and PUT (DTI)
router.patch('/conversations/:id/read', markConversationRead);
router.put('/conversations/:id/read', markMessagesAsRead);

// Close — accept both PATCH (POP) and POST (DTI)
router.patch('/conversations/:id/close', closeConversation);
router.post('/conversations/:id/close', closeChat);

// Reopen — accept both PATCH (POP) and POST (DTI)
router.patch('/conversations/:id/reopen', reopenConversation);
router.post('/conversations/:id/reopen', reopenChat);

// Report — DTI-style POST, kept for both
router.post('/conversations/:id/report', reportChat);

// ============================================================
// 7) TRANSCRIPT
// ============================================================

router.get(
  '/conversations/:id/transcript',
  downloadConversationTranscript
);

export default router;