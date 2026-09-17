import express from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  createComplaint,
  getComplaintsByPurchase,
  updateComplaint,
  deleteComplaint,
} from "../controllers/complaintController.js";

const router = express.Router();

// Protect all complaint routes
router.use(authenticate);

router.post("/", createComplaint);
router.get("/purchase/:purchaseId", getComplaintsByPurchase);
router.put("/:id", updateComplaint);
router.delete("/:id", deleteComplaint);

export default router;