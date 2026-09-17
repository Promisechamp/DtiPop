// routes/items.js
import express from 'express';
import { 
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsByDonor,
  getApplicantCount,
  getConversationCount,
  getApplicants,
  getItemConversations,
  confirmItemReceived,
  confirmItemReceivedByWinner,
} from '../controllers/itemController.js';
import { authenticate } from '../../middleware/auth.js';
import { requireEmailVerified } from '../../middleware/verification.js';

const router = express.Router();

// Public routes
router.get('/', getItems);
router.get('/:id', getItemById);
router.get('/donor/:donorId', getItemsByDonor);

// Protected routes (require verification)
router.post(
  '/', 
  authenticate, 
  requireEmailVerified,
  createItem
);

router.put(
  '/:id', 
  authenticate, 
  requireEmailVerified,
  updateItem
);

router.delete('/:id', authenticate, requireEmailVerified, deleteItem);

router.get('/:itemId/applicants/count', authenticate, getApplicantCount);
router.get('/:itemId/conversations/count', authenticate, getConversationCount);
router.get('/:itemId/applicants', authenticate, getApplicants);
router.get('/:itemId/conversations', authenticate, getItemConversations);
router.post('/:itemId/confirm-received', authenticate, confirmItemReceived);
router.post('/:itemId/confirm-received-by-winner', authenticate, confirmItemReceivedByWinner);


export default router;