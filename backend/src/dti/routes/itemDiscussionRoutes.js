// backend/src/routes/itemDiscussionRoutes.js
import express from 'express';
import {
  getItemDiscussions,
  createDiscussionMessage,
  updateDiscussionMessage,
  deleteDiscussionMessage,
		reportDiscussionMessage,
} from '../controllers/itemDiscussionController.js';

import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// Public — anyone (including unauthenticated) can view a discussion
router.get('/item/:itemId', getItemDiscussions);

// Authenticated only
router.post('/item/:itemId', authenticate, createDiscussionMessage);
router.put('/:id', authenticate, updateDiscussionMessage);
router.delete('/:id', authenticate, deleteDiscussionMessage);
router.post('/:id/report', authenticate, reportDiscussionMessage);

export default router;
