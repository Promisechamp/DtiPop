import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  createRequest,
  getRequests,
  getRequest,
  updateRequest,
  deleteRequest,
  fulfillRequest,

  // Provider profile / matching
  getProviderProfile,
  getRequestProviders,
  findRequestProviders,
  connectRequestProvider,

  // Provider relationship lifecycle
  respondToRequestProvider,
  startRequestProvider,
  completeRequestProvider,

  // Household / user requests
  getHouseholdRequests,
  getMyRequests,
  getOpenHouseholdRequests,
} from '../controllers/requestController.js';

const router = express.Router();

router.use(authenticate);

// ─────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────

router.post('/', createRequest);

router.get('/', getRequests);
router.get('/my', getMyRequests);

router.get('/household/:householdId', getHouseholdRequests);
router.get('/household/:householdId/open', getOpenHouseholdRequests);

// ─────────────────────────────────────────────
// Provider profile / matching
// Keep these BEFORE /:id for clarity and safety.
// ─────────────────────────────────────────────

// Provider profile lookup (no request context needed)
router.get('/providers/:providerId/profile', getProviderProfile);
router.get('/:id/providers', getRequestProviders);
router.get('/:id/matching-providers', findRequestProviders);

router.post('/:id/providers', connectRequestProvider);

// ─────────────────────────────────────────────
// Provider relationship lifecycle
// pending → accepted/declined → in_progress → completed
// ─────────────────────────────────────────────

router.patch(
  '/provider-relationships/:id/respond',
  respondToRequestProvider
);

router.patch(
  '/provider-relationships/:id/start',
  startRequestProvider
);

router.patch(
  '/provider-relationships/:id/complete',
  completeRequestProvider
);

// ─────────────────────────────────────────────
// Single request
// Keep this AFTER the more specific /:id/... routes.
// ─────────────────────────────────────────────

router.get('/:id', getRequest);

router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

router.post('/:id/fulfill', fulfillRequest);

export default router;