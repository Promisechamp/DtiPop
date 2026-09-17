import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createHousehold,
  getUserHouseholds,
  getHousehold,
  updateHousehold,
  deleteHousehold,
  addMember,
  updateMemberRole,
  removeMember,
  leaveHousehold,
} from '../controllers/householdController.js';

const router = express.Router();

// All household routes require authentication
router.use(authenticate);

// Household CRUD
router.post('/', createHousehold);
router.get('/', getUserHouseholds);
router.get('/:id', getHousehold);
router.put('/:id', updateHousehold);
router.delete('/:id', deleteHousehold);

// Member management
router.post('/:id/members', addMember);
router.put('/:id/members/:memberId', updateMemberRole);
router.delete('/:id/members/:memberId', removeMember);
router.post('/:id/leave', leaveHousehold);

export default router;