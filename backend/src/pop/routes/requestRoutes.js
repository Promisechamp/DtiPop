import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createRequest,
  getRequests,
  getRequest,
  updateRequest,
  deleteRequest,
  fulfillRequest,
  getHouseholdRequests,
  getMyRequests,
  getOpenHouseholdRequests,
} from '../controllers/requestController.js';

const router = express.Router();

// All request routes require authentication
router.use(authenticate);

// Create
router.post('/', createRequest);

// List with filters
router.get('/', getRequests);
router.get('/my', getMyRequests);
router.get('/household/:householdId', getHouseholdRequests);
router.get('/household/:householdId/open', getOpenHouseholdRequests);

// Single
router.get('/:id', getRequest);

// Update and delete
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

// Fulfill
router.post('/:id/fulfill', fulfillRequest);

export default router;