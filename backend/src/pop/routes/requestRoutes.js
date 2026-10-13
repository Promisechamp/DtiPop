import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  getProviderProfile,
  createRequest,
  getRequests,
  getRequestsForMe,
  getRequest,
  updateRequest,
  deleteRequest,
  fulfillRequest,
  cancelRequest,
  getMyRequests,
  getHouseholdRequests,
  getOpenHouseholdRequests,
  findRequestProvidersHandler,
  getRequestProviders,
  connectRequestProvider,
  respondToRequestProvider,
  startRequestProvider,
  completeRequestProvider,
  grantAssetHistoryAccess,
  revokeAssetHistoryAccess,
  checkAssetHistoryAccess,
} from '../controllers/request/index.js';

const router = express.Router();

router.use(authenticate);

router.get('/providers/:providerId/profile', getProviderProfile);

router.get('/mine', getMyRequests);
router.get('/for-me', getRequestsForMe);

router.get('/household/:householdId/open', getOpenHouseholdRequests);
router.get('/household/:householdId', getHouseholdRequests);

router.get('/', getRequests);
router.post('/', createRequest);

router.get('/:id', getRequest);
router.patch('/:id', updateRequest);
router.delete('/:id', deleteRequest);

router.patch('/:id/fulfill', fulfillRequest);
router.patch('/:id/cancel', cancelRequest);

router.get('/:id/providers/find', findRequestProvidersHandler);
router.get('/:id/providers', getRequestProviders);
router.post('/:id/providers', connectRequestProvider);

router.patch('/request-providers/:id/respond', respondToRequestProvider);
router.patch('/request-providers/:id/start', startRequestProvider);
router.patch('/request-providers/:id/complete', completeRequestProvider);

router.post('/request-providers/:id/asset-history/grant', grantAssetHistoryAccess);
router.post('/request-providers/:id/asset-history/revoke', revokeAssetHistoryAccess);
router.get('/request-providers/:id/asset-history/access', checkAssetHistoryAccess);

export default router;