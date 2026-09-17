import express from 'express';
import { 
  getWinners,
  getWinnerOfTheWeek,
  getWinnersByDateRange,
  getWinnersByUser,
  getMyPendingWinnerNotices,
  updateWinnerNotice,
} from '../controllers/winnerController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', getWinners);
router.get('/week', getWinnerOfTheWeek);
router.get('/date-range', getWinnersByDateRange);
router.get('/user/:userId', getWinnersByUser);
router.get('/my-pending-notices', authenticate, getMyPendingWinnerNotices);
router.patch('/:winnerId/notice', authenticate, updateWinnerNotice);

export default router;


