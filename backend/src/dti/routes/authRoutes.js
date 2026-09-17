import express from 'express';
import { 
  register, 
  login, 
  logout, 
  getCurrentUser, 
  verifyEmail,
  resendVerification,
  checkEmailConfirmation,
  checkUserExists,
  googleSignIn,
  getGoogleAuthUrl,
  googleAuthCallback
} from '../controllers/authController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/check-user-exists', checkUserExists);
router.get('/check-email-confirmation', checkEmailConfirmation);

// Google OAuth routes
router.post('/google', googleSignIn);
router.get('/google/url', getGoogleAuthUrl);
router.get('/google/callback', googleAuthCallback);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;