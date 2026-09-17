import express from "express";
import { authenticate } from "../../middleware/auth.js";

import {
  createClaim,
  getClaims,
  getClaim,
  updateClaim,
  deleteClaim,
  summarizeComplaints,
  forwardClaim,
} from "../controllers/claimController.js";

const router = express.Router();

// Protect all claim routes
router.use(authenticate);

router.post("/", createClaim);
router.get("/", getClaims);
router.get("/:id", getClaim);
router.put("/:id", updateClaim);
router.delete("/:id", deleteClaim);
router.post("/summarize", summarizeComplaints);
router.post("/:id/forward", forwardClaim);

export default router;