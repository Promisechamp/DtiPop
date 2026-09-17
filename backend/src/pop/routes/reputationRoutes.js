import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  getReputation,
  getTopProviders,
} from '../controllers/reputationController.js';

const router = express.Router();

router.use(authenticate);

// ============================================================
// REPUTATION DISCOVERY
// ============================================================

router.get(
  '/top-providers',
  getTopProviders
);

// ============================================================
// MY REPUTATION
// GET /api/pop/reputation
// ============================================================

router.get(
  '/',
  getReputation
);

// ============================================================
// USER REPUTATION
//
// Keep this LAST because /:userId is a dynamic route.
// ============================================================

router.get(
  '/:userId',
  getReputation
);

export default router;