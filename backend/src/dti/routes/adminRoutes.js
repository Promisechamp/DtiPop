// backend/routes/adminRoutes.js
import express from 'express';

import { 
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminBanUser,
  adminDeleteUser,
  adminChangeUserRole
} from '../controllers/userController.js';

import { 
  adminGetAllItems,
  adminModerateItem,
  adminDeleteItem,
  adminGetReportedItems
} from '../controllers/itemController.js';

import { 
  adminGetAllApplications,
  adminReviewApplication,
  adminDeleteApplication
} from '../controllers/applicationController.js';

import { 
  adminGetAllWinners,
  adminCreateWinner,
  adminUpdateWinner,
  adminDeleteWinner
} from '../controllers/winnerController.js';

import {
  getSettings,
  updateSettings,
  toggleMaintenance,
  getMaintenanceStatus,
  getSystemHealth
} from '../controllers/settingsController.js';

// ✅ Chat reports
import {
  adminGetChatReports,
  adminUpdateChatReportStatus,
  adminDeleteChatReport
} from '../controllers/chatController.js';

// ✅ Item discussion reports
import {
  adminGetItemDiscussionReports,
  adminUpdateItemDiscussionReportStatus,
  adminDeleteItemDiscussionReport
} from '../controllers/itemDiscussionController.js';

import { authenticate } from '../../middleware/auth.js';
import { isAdmin, isSuperAdmin } from '../../middleware/admin.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================
router.get('/maintenance/status', getMaintenanceStatus);

// ============================================
// ALL ADMIN ROUTES REQUIRE AUTH + ADMIN
// ============================================
router.use(authenticate);
router.use(isAdmin);

// ============================================
// USER MANAGEMENT 
// ============================================
router.get('/users', adminGetAllUsers);
router.get('/users/:userId', adminGetUserById);
router.put('/users/:userId', adminUpdateUser);
router.post('/users/:userId/ban', adminBanUser);
router.delete('/users/:userId', adminDeleteUser);
router.put('/users/:userId/role', adminChangeUserRole);

// ============================================
// ITEM MANAGEMENT
// ============================================
router.get('/items', adminGetAllItems);
router.put('/items/:itemId/moderate', adminModerateItem);
router.delete('/items/:itemId', adminDeleteItem);
router.get('/items/reported', adminGetReportedItems);

// ============================================
// APPLICATION MANAGEMENT
// ============================================
router.get('/applications', adminGetAllApplications);
router.put('/applications/:applicationId/review', adminReviewApplication);
router.delete('/applications/:applicationId', adminDeleteApplication);

// ============================================
// WINNER MANAGEMENT
// ============================================
router.get('/winners', adminGetAllWinners);
router.post('/winners', adminCreateWinner);
router.put('/winners/:winnerId', adminUpdateWinner);
router.delete('/winners/:winnerId', adminDeleteWinner);

// ============================================
// SETTINGS & MAINTENANCE
// ============================================
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/maintenance/toggle', toggleMaintenance);
router.get('/health', getSystemHealth);

// ============================================
// REPORT MANAGEMENT (Chat & Item Discussions)
// ============================================

// Chat reports
router.get('/chat-reports', adminGetChatReports);
router.put('/chat-reports/:id/status', adminUpdateChatReportStatus);
router.delete('/chat-reports/:id', adminDeleteChatReport);

// Item discussion reports
router.get('/discussion-reports', adminGetItemDiscussionReports);
router.put('/discussion-reports/:id/status', adminUpdateItemDiscussionReportStatus);
router.delete('/discussion-reports/:id', adminDeleteItemDiscussionReport);

export default router;