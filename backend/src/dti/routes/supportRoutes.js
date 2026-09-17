import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createSupportTicket,
  getMyTickets,
  getTicket,
  replyToTicket,
  adminGetAllTickets,
  updateTicketStatus,
  deleteTicket
} from '../controllers/supportController.js';

const router = express.Router();

router.use(authenticate);

// User routes
router.post('/tickets', createSupportTicket);
router.get('/tickets', getMyTickets);
router.get('/tickets/:ticketId', getTicket);
router.post('/tickets/:ticketId/replies', replyToTicket);

// Admin routes
router.get('/admin/tickets', adminGetAllTickets);
router.put('/admin/tickets/:ticketId/status', updateTicketStatus);  // ✅ Updated path
router.delete('/admin/tickets/:ticketId', deleteTicket);

export default router;