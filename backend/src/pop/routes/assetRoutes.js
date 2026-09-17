import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  getHouseholdAssets,
} from '../controllers/assetsController.js';

const router = express.Router();

// All asset routes require authentication
router.use(authenticate);

router.post('/', createAsset);
router.get('/', getAssets);
router.get('/household/:householdId', getHouseholdAssets);
router.get('/:id', getAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;