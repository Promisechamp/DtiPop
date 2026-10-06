import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  getOrCreateRequestProviderConversation,
  getMyConversations,
  getConversation,
  deleteConversationForMe,
  pinConversation,
  muteConversation,
  archiveConversation,
  protectConversation,
  markConversationRead,
  closeConversation,
  reopenConversation,
  downloadConversationTranscript,
  sendMessage,
  editMessage,
  deleteMessage,
} from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticate);

router.post('/requests/:requestId/providers/:relationshipId/conversation', getOrCreateRequestProviderConversation);

router.get('/conversations', getMyConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversationForMe);

router.patch('/conversations/:id/pin', pinConversation);
router.patch('/conversations/:id/mute', muteConversation);
router.patch('/conversations/:id/archive', archiveConversation);
router.patch('/conversations/:id/protect', protectConversation);

router.patch('/conversations/:id/read', markConversationRead);
router.patch('/conversations/:id/close', closeConversation);
router.patch('/conversations/:id/reopen', reopenConversation);

router.get('/conversations/:id/transcript', downloadConversationTranscript);

router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/messages/:messageId', editMessage);
router.delete('/conversations/:id/messages/:messageId', deleteMessage);

export default router;