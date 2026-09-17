// routes/favorites.js
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  clearAllFavorites,
  getFavoriteCount,
  checkBulkFavorites
} from '../controllers/favoriteController.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);

// GET /api/favorites - Get all favorites
router.get('/', getFavorites);

// POST /api/favorites - Add to favorites
router.post('/', addFavorite);

// GET /api/favorites/count - Get count (MUST be before /:itemId)
router.get('/count', getFavoriteCount);

// GET /api/favorites/check/:itemId - Check single item
router.get('/check/:itemId', checkFavorite);

// POST /api/favorites/check-bulk - Check multiple items
router.post('/check-bulk', checkBulkFavorites);

// DELETE /api/favorites - Clear all
router.delete('/', clearAllFavorites);

// DELETE /api/favorites/:itemId - Remove one
router.delete('/:itemId', removeFavorite);

export default router;