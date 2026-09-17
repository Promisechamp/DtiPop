// backend/routes/notificationRoutes.js
import express from 'express';
import { 
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
  bulkMarkAsRead
} from '../controllers/notificationController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:notificationId/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:notificationId', deleteNotification);
router.post('/bulk/delete', bulkDeleteNotifications);
router.post('/bulk/read', bulkMarkAsRead);

export default router;