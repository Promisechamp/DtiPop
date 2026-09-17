import express from 'express';
import { 
  getShippingEstimate,
  getCheapestDestinations
} from '../controllers/shippingController.js';

const router = express.Router();

router.get('/estimate', getShippingEstimate);
router.get('/cheapest', getCheapestDestinations);

export default router;