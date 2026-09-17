import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createMaintenance,
  getMaintenance,
  getMaintenanceRecord,
  updateMaintenance,
  deleteMaintenance,
  completeMaintenance,
  getHouseholdMaintenance,
  getAssetMaintenance,
} from '../controllers/maintenanceController.js';

const router = express.Router();

// All maintenance routes require authentication
router.use(authenticate);

// Create
router.post('/', createMaintenance);

// List with filters
router.get('/', getMaintenance);
router.get('/household/:householdId', getHouseholdMaintenance);
router.get('/asset/:assetId', getAssetMaintenance);

// Single record
router.get('/:id', getMaintenanceRecord);

// Update and delete
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

// Convenience: complete maintenance
router.post('/:id/complete', completeMaintenance);

export default router;