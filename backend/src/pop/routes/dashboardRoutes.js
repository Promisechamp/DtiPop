import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  getDashboard,
  getDTIDonations,
  getExpiringWarranties,
  getOverdueMaintenance,
  getOverdueTasks,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);

// Main dashboard
router.get('/', getDashboard);

// DTI donations
router.get('/dti-donations', getDTIDonations);

// Expiring warranties
router.get('/expiring-warranties', getExpiringWarranties);

// Overdue maintenance
router.get('/overdue-maintenance', getOverdueMaintenance);

// Overdue tasks
router.get('/overdue-tasks', getOverdueTasks);

export default router;