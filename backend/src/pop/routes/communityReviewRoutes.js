import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  submitCommunityReview,
  getUserCommunityReviews,
  getMyCommunityReviews,
} from '../controllers/communityReviewController.js';

const router = express.Router();

router.use(authenticate);

// ============================================================
// REVIEWS WRITTEN BY CURRENT USER
// ============================================================

router.get(
  '/my-reviews',
  getMyCommunityReviews
);

// ============================================================
// SUBMIT REVIEW FOR A BORROW
// ============================================================

router.post(
  '/:borrowRequestId',
  submitCommunityReview
);

// ============================================================
// REVIEWS RECEIVED BY USER
// ============================================================

router.get(
  '/user/:userId',
  getUserCommunityReviews
);

export default router;