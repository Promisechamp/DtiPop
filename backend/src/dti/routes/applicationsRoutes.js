// routes/applications.js
import express from 'express';
import { 
  createApplication,
  getItemApplications,
  getUserApplications,
  updateApplicationStatus,
  cancelApplication,
  redeclareInterest,
  getReinterestHistory,
  getApplicationsWithReinterest,
  getApplicationById,
  
} from '../controllers/applicationController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All application routes require authentication
router.use(authenticate);

// ============================================
// EXISTING ROUTES
// ============================================

// Get user's applications
router.get('/my', getUserApplications);

// Get applications for a specific item (donor only)
router.get('/item/:itemId', getItemApplications);

// Get applications with re-interest filter (for donors)
router.get('/item/:itemId/reinterest', getApplicationsWithReinterest);

// ✅ CRITICAL: Put specific routes BEFORE generic ones
// Update application status (accept/reject) - MUST come before /:id
router.put('/:applicationId/status', updateApplicationStatus);

// Get single application by ID
router.get('/:id', getApplicationById);

// Create a new application
router.post('/', createApplication);

// Cancel an application
router.delete('/:applicationId', cancelApplication);

// Re-declare interest on an application
router.post('/:applicationId/redeclare-interest', redeclareInterest);

// Get re-interest history for an application
router.get('/:applicationId/reinterest-history', getReinterestHistory);


export default router;