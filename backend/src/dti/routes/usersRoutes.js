// backend/routes/userRoutes.js
import express from 'express';
import { 
  getProfile,
  checkProfile,
  updateProfile,
		updateMyLocation,
  getUserStats,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/userController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

// Password management (public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Check if user has a profile
router.get('/check-profile/:userId', checkProfile);

// Get user stats by ID
router.get('/:userId/stats', getUserStats);

// ============================================
// PROTECTED USER ROUTES (Require Authentication)
// ============================================
// These MUST come BEFORE the /:userId route
router.use(authenticate);

// Profile management
router.put('/profile', updateProfile);
router.patch('/profile/location', updateMyLocation);

// Change password for logged-in users
router.put('/profile/password', changePassword);

// ============================================
// GET PROFILE BY ID - MUST BE LAST
// ============================================
router.get('/:userId', getProfile);

export default router;