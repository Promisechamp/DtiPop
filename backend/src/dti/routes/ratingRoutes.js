// backend/routes/ratingRoutes.js

import Router from 'express';

import {
  createRating,
  getPendingRatings,
  getRatingById,
  getRatings,
  getUserRatings,
  getItemRatings,
  getRatingByApplication,
  updateRating,
  deleteRating,
  remindLater,
  replyToRating,
  updateReply,
  removeRatingReply,
  getUserRatingSummary,
} from '../controllers/ratingController.js';

import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// ============================================================
// PENDING
// ============================================================

router.get('/pending', getPendingRatings);

// ============================================================
// USER RATINGS
// ============================================================

router.get('/user/:userId', getUserRatings);
router.get('/user/:userId/summary', getUserRatingSummary);

// ============================================================
// APPLICATION / ITEM
// ============================================================

router.get('/application/:applicationId', getRatingByApplication);
router.get('/item/:itemId', getItemRatings);   // ✅ now works

// ============================================================
// SINGLE RATING
// ============================================================

router.get('/:id', getRatingById);

router.post('/', createRating);

router.put('/:id', updateRating);
router.delete('/:id', deleteRating);

// ============================================================
// REMINDER
// ============================================================

router.put('/:id/remind', remindLater);

// ============================================================
// REPLIES
// ============================================================

router.put('/:id/reply', replyToRating);
router.put('/:id/update-reply', updateReply);
router.delete('/:id/reply', removeRatingReply);

// ============================================================
// ALL MY RATINGS
// ============================================================

router.get('/', getRatings);

export default router;