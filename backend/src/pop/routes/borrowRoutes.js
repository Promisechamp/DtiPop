import express from 'express';
import { authenticate } from '../../middleware/auth.js';

import {
  createBorrowRequest,
  getBorrowRequests,
  getBorrowRequest,

  // Borrower selection
  selectBorrower,
  acceptBorrowSelection,
  expireBorrowSelection,

  // Borrow lifecycle
  markPickedUp,
  markInUse,
  markReturned,
  markCompleted,
  cancelBorrowRequest,

  // Convenience
  getMyBorrowRequests,
  getMyLendRequests,
		
		// history
		getPublicBorrowHistory,
} from '../controllers/borrowController.js';

const router = express.Router();

router.use(authenticate);

// Create
router.post('/', createBorrowRequest);

// Collections
router.get('/', getBorrowRequests);
router.get('/my-borrows', getMyBorrowRequests);
router.get('/my-lends', getMyLendRequests);



// history
router.get('/public/:userId/history', getPublicBorrowHistory);

// Single request
router.get('/:id', getBorrowRequest);

// Borrower selection
router.post('/:id/select', selectBorrower);
router.post('/:id/accept', acceptBorrowSelection);
router.post('/:id/expire-selection', expireBorrowSelection);

// Borrow lifecycle
router.post('/:id/pickup', markPickedUp);
router.post('/:id/in-use', markInUse);
router.post('/:id/return', markReturned);
router.post('/:id/complete', markCompleted);
router.post('/:id/cancel', cancelBorrowRequest);

export default router;