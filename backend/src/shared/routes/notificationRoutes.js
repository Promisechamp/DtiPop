// src/shared/routes/notificationRoutes.js

import express from 'express';

import { authenticate } from '../../middleware/auth.js';

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  bulkDeleteNotifications,
  bulkMarkAsRead,
} from '../controllers/notificationController.js';


const router = express.Router();


/* ============================================================
   AUTHENTICATION
============================================================ */

router.use(authenticate);


/* ============================================================
   GET NOTIFICATIONS
============================================================ */

// GET /api/notifications
// GET /api/pop/notifications
router.get(
  '/',
  getNotifications
);


/* ============================================================
   GET UNREAD COUNT
============================================================ */

// GET /api/notifications/unread-count
// GET /api/pop/notifications/unread-count
router.get(
  '/unread-count',
  getUnreadCount
);


/* ============================================================
   MARK ALL AS READ
   IMPORTANT:
   This must come before /:notificationId/read
============================================================ */

// PUT /api/notifications/read-all
// PUT /api/pop/notifications/read-all
router.put(
  '/read-all',
  markAllAsRead
);


/* ============================================================
   MARK ONE AS READ
============================================================ */

// PUT /api/notifications/:notificationId/read
// PUT /api/pop/notifications/:notificationId/read
router.put(
  '/:notificationId/read',
  markAsRead
);


/* ============================================================
   DELETE ALL NOTIFICATIONS
   IMPORTANT:
   This must come before /:notificationId
============================================================ */

// DELETE /api/notifications/delete-all
// DELETE /api/pop/notifications/delete-all
router.delete(
  '/delete-all',
  deleteAllNotifications
);


/* ============================================================
   DELETE ONE NOTIFICATION
============================================================ */

// DELETE /api/notifications/:notificationId
// DELETE /api/pop/notifications/:notificationId
router.delete(
  '/:notificationId',
  deleteNotification
);


/* ============================================================
   BULK DELETE
============================================================ */

// POST /api/notifications/bulk/delete
// POST /api/pop/notifications/bulk/delete
router.post(
  '/bulk/delete',
  bulkDeleteNotifications
);


/* ============================================================
   BULK MARK AS READ
============================================================ */

// POST /api/notifications/bulk/read
// POST /api/pop/notifications/bulk/read
router.post(
  '/bulk/read',
  bulkMarkAsRead
);


/* ============================================================
   EXPORT
============================================================ */

export default router;
