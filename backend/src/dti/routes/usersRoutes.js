import express from 'express';
import {
  getProfile,
  checkProfile,
  updateProfile,
  updateMyLocation,
  getUserStats,
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
  toggleServiceActive,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/userController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/check-profile/:userId', checkProfile);
router.get('/:userId/stats', getUserStats);

router.use(authenticate);

router.put('/profile', updateProfile);
router.patch('/profile/location', updateMyLocation);
router.put('/profile/password', changePassword);

router.post('/services', createService);
router.get('/services', getServices);
router.get('/services/:id', getService);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);
router.patch('/services/:id/toggle', toggleServiceActive);

router.get('/:userId', getProfile);

export default router;