import express from "express";
import {
  create,
  update,
  getPurchases,
  getPurchase,
  deletePurchase,
  archivePurchase,
  getArchivedPurchases,
  restorePurchase,
  findUserByEmail,
  transferPurchase,
} from "../controllers/purchaseController.js";
import { upload } from "../../middleware/upload.js";
import { authenticate } from "../../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/archived", getArchivedPurchases);
router.get("/find-user", findUserByEmail);

router.post("/", upload.fields([
  { name: "receipt", maxCount: 1 },
  { name: "productImage", maxCount: 1 },
]), create);

// Get all purchases (supports householdId query param)
router.get("/", getPurchases);

router.post("/:id/transfer", transferPurchase);

router.put("/:id/restore", restorePurchase);

router.get("/:id", getPurchase);

router.put("/:id", upload.fields([
  { name: "receipt", maxCount: 1 },
  { name: "productImage", maxCount: 1 },
]), update);

router.delete("/:id", deletePurchase);

router.patch("/:id/archive", archivePurchase);

export default router;