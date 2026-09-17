// routes/userSettingsRoutes.js
import Router from 'express';
import { 
  getSettings,
  updateSettings,
  getSetting,
  deleteSetting,
} from '../controllers/userSettingsController.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/settings/:key', getSetting);
router.delete('/settings/:key', deleteSetting);

export default router;