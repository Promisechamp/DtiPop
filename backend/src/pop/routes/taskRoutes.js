import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask,
  getHouseholdTasks,
  getMyTasks,
} from '../controllers/tasksController.js';

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

// Create
router.post('/', createTask);

// List
router.get('/', getTasks);
router.get('/my', getMyTasks);
router.get('/household/:householdId', getHouseholdTasks);

// Single
router.get('/:id', getTask);

// Update
router.put('/:id', updateTask);
router.post('/:id/complete', completeTask);

// Delete
router.delete('/:id', deleteTask);

export default router;