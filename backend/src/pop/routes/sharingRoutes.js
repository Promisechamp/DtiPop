import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  upsertSharing,
  getSharingByAssetId,
  getSharedAssets,
  updateSharing,
  toggleSharing,
  deleteSharing,
  findAvailableAssets,
} from '../controllers/sharingController.js';

const router = express.Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(authenticate);

// ============================================================
// SHARING SETTINGS
// ============================================================

// Create or update sharing settings for an asset
router.post('/', upsertSharing);

// List sharing records accessible to the user/household
router.get('/', getSharedAssets);

// Find assets available for borrowing
// IMPORTANT: Must come before /:id
router.get('/available', findAvailableAssets);

// Get sharing settings for a specific asset
router.get('/asset/:assetId', getSharingByAssetId);

// Update sharing settings
router.put('/:id', updateSharing);

// Enable / disable sharing
router.patch('/:id/toggle', toggleSharing);

// Remove sharing settings
router.delete('/:id', deleteSharing);

export default router;