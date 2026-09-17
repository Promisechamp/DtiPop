import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================================
// HOUSEHOLD ACCESS HELPERS (shared)
// ============================================================

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) return { valid: true };
  const { data, error } = await supabase
    .from('pop_household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (error || !data) {
    return { valid: false, error: 'User is not a member of this household.' };
  }
  return { valid: true };
};

const validatePurchaseAccess = async (purchaseId, userId) => {
  const { data, error } = await supabase
    .from("pop_purchases")
    .select("id, user_id, household_id")
    .eq("id", purchaseId)
    .single();

  if (error || !data) {
    return { valid: false, error: "Purchase not found." };
  }

  if (data.user_id === userId) {
    return { valid: true, data };
  }

  if (data.household_id) {
    const membership = await verifyHouseholdMembership(userId, data.household_id);
    if (membership.valid) {
      return { valid: true, data };
    } else {
      return { valid: false, error: "You don't have access to this purchase." };
    }
  }

  return { valid: false, error: "You don't have access to this purchase." };
};

// ============================================================
// CREATE COMPLAINT
// ============================================================

export const createComplaint = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { purchaseId, complaint } = req.body;

    if (!purchaseId || !complaint?.trim()) {
      return res.status(400).json({ success: false, message: "Purchase and complaint text are required." });
    }

    // Verify access to the purchase (own or household member)
    const access = await validatePurchaseAccess(purchaseId, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Prevent complaints if any non-rejected claim exists
    const { data: existingClaim, error: claimCheckError } = await supabase
      .from("pop_claims")
      .select("id, status")
      .eq("purchase_id", purchaseId)
      .neq("status", "rejected")
      .maybeSingle();

    if (claimCheckError) throw claimCheckError;

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: "A claim already exists for this purchase.",
      });
    }

    const { data, error } = await supabase
      .from("pop_complaints")
      .insert({ 
        user_id: userId, 
        purchase_id: purchaseId, 
        complaint: complaint.trim() 
      })
      .select()
      .single();

    if (error) throw error;

    await createNotification(
      userId,
      'complaint_logged',
      'Complaint logged',
      'Your complaint has been recorded.'
    );

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("createComplaint:", error);
    return res.status(500).json({ success: false, message: "Failed to log complaint." });
  }
};

// ============================================================
// GET COMPLAINTS BY PURCHASE
// ============================================================

export const getComplaintsByPurchase = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { purchaseId } = req.params;

    // Verify access to purchase
    const access = await validatePurchaseAccess(purchaseId, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { data, error } = await supabase
      .from("pop_complaints")
      .select("*")
      .eq("purchase_id", purchaseId)
      .eq("user_id", userId)  // complaints are owned by the user
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error) {
    console.error("getComplaintsByPurchase:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch complaints." });
  }
};

// ============================================================
// UPDATE COMPLAINT
// ============================================================

export const updateComplaint = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;
    const { complaint } = req.body;

    if (!complaint?.trim()) {
      return res.status(400).json({ success: false, message: "Complaint text is required." });
    }

    // Fetch complaint to verify ownership and purchase access
    const { data: existing, error: checkError } = await supabase
      .from("pop_complaints")
      .select("id, user_id, purchase_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this complaint." });
    }

    const access = await validatePurchaseAccess(existing.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { data, error } = await supabase
      .from("pop_complaints")
      .update({ complaint: complaint.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 🔔 Notification: complaint updated
    await createNotification(
      userId,
      'complaint_updated',
      'Complaint updated',
      'Your complaint has been updated.'
    );

    return res.json({ success: true, message: "Complaint updated.", data });
  } catch (error) {
    console.error("updateComplaint:", error);
    return res.status(500).json({ success: false, message: "Failed to update complaint." });
  }
};

// ============================================================
// DELETE COMPLAINT
// ============================================================

export const deleteComplaint = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // Verify complaint ownership and purchase access
    const { data: existing, error: checkError } = await supabase
      .from("pop_complaints")
      .select("id, user_id, purchase_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this complaint." });
    }

    const access = await validatePurchaseAccess(existing.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { error } = await supabase
      .from("pop_complaints")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // 🔔 Notification: complaint deleted
    await createNotification(
      userId,
      'complaint_deleted',
      'Complaint deleted',
      'Your complaint has been deleted.'
    );

    return res.json({ success: true, message: "Complaint deleted." });
  } catch (error) {
    console.error("deleteComplaint:", error);
    return res.status(500).json({ success: false, message: "Failed to delete complaint." });
  }
};