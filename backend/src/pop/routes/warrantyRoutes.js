import express from "express";
import { authenticate } from "../../middleware/auth.js";

import {
  getWarranties,
  getWarranty,
  createWarranty,
  updateWarranty,
  deleteWarranty,
} from "../controllers/warrantyController.js";

const router = express.Router();

// Protect all warranty routes
router.use(authenticate);

// GET /api/pop/warranties?status=active&householdId=xxx&page=1&limit=20
router.get("/", getWarranties);

router.get("/:id", getWarranty);
router.post("/", createWarranty);
router.put("/:id", updateWarranty);
router.delete("/:id", deleteWarranty);

export default router;