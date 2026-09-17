import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
  toggleServiceActive,
} from '../controllers/servicesController.js';

const router = express.Router();

// All service routes require authentication
router.use(authenticate);

router.post('/', createService);
router.get('/', getServices);
router.get('/:id', getService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);
router.patch('/:id/toggle', toggleServiceActive);

export default router;