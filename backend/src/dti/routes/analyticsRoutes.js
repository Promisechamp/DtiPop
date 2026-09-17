// backend/routes/analyticsRoutes.js
import express from 'express';
import {
  getDashboardStats,
  getAnalyticsOverview,
  getFunnelAnalytics,
  getItemPerformance,
  getUserInsights,
  getFulfilmentAnalytics,
} from '../controllers/analyticsController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();


router.get('/dashboard', authenticate, getDashboardStats);
router.get('/overview', authenticate, getAnalyticsOverview);
router.get('/funnel', authenticate, getFunnelAnalytics);
router.get('/items', authenticate, getItemPerformance);
router.get('/users', authenticate, getUserInsights);
router.get('/fulfilment', authenticate, getFulfilmentAnalytics);

export default router;