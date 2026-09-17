import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.6-flash";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const status = error?.status;
  return [429, 500, 502, 503, 504].includes(status);
};

// ============================================================
// HOUSEHOLD ACCESS HELPER (shared with warranty)
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
// SUMMARIZE COMPLAINTS (unchanged)
// ============================================================

export const summarizeComplaints = async (req, res) => {
  try {
    const { complaints } = req.body;

    // 1. Validate input
    if (!Array.isArray(complaints) || complaints.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No complaints provided.",
      });
    }

    const cleanedComplaints = complaints
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item.complaint === "string") return item.complaint.trim();
        return "";
      })
      .filter(Boolean);

    if (cleanedComplaints.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid complaints provided.",
      });
    }

    const limitedComplaints = cleanedComplaints.slice(0, 20);
    const complaintText = limitedComplaints
      .map((complaint, index) => `${index + 1}. ${complaint}`)
      .join("\n");

    // 2. Updated prompt with explicit tone enforcement
    const prompt = `
						Convert these customer complaints into a professional warranty claim description and a concise title written directly from the perspective of the gadget/item/product owner/customer.
						
						Crucial Tone Guidelines:
						- Write strictly in the first-person perspective or direct statements as if submitted by the device owner (e.g., "I am experiencing...", "The device/item/product has the following issues:", or list the problems directly).
						- DO NOT use meta-language, robotic phrasing, or AI conversational padding like "This warranty claim covers...", "Reported by the user:", or "The user states...". Dive straight into the issue descriptions.
						- Do not invent facts, diagnose symptoms, or add unstated details.
						- Preserve all numbers, percentages, durations, and measurements precisely.
						- Correct grammar and spelling.
						- For the title: Aim for a short phrase (ideally under 8 words). If the core issue requires more words, condense it gracefully or fallback to "Other Warranty Claim".
						- For the description: Provide a thorough, complete summary of all issues listed without arbitrary length truncation.
						
						Complaints:
						${complaintText}
`;

    let response = null;
    let lastError = null;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            maxOutputTokens: 2000,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                title: { 
                  type: "STRING", 
                  description: "Professional warranty claim title from the owner's perspective. Keep it concise; if it exceeds 8 words, use a summarized version or 'Other Warranty Claim'." 
                },
                description: { 
                  type: "STRING", 
                  description: "Comprehensive warranty claim description written directly from the owner's perspective covering all feedback details provided." 
                },
              },
              required: ["title", "description"],
            },
          },
        });

        break;
      } catch (error) {
        lastError = error;
        console.error(`Gemini attempt ${attempt}/${MAX_ATTEMPTS} failed:`, {
          status: error?.status,
          message: error?.message,
        });

        if (!isRetryableError(error) || attempt === MAX_ATTEMPTS) {
          break;
        }

        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Gemini failed to return a valid response.");
    }

    let parsed;
    try {
      parsed = JSON.parse(response.text.trim());
    } catch {
      throw new Error(`Failed to parse Gemini output as JSON: ${response.text}`);
    }

    const title = parsed.title?.trim() || "";
    const description = parsed.description?.trim() || "";

    if (!title || !description) {
      throw new Error("Gemini returned incomplete claim fields.");
    }

    return res.json({
      success: true,
      data: { title, description },
    });

  } catch (error) {
    console.error("Gemini claim summarization error:", error);

    if (isRetryableError(error)) {
      return res.status(503).json({
        success: false,
        message: "The AI service is temporarily unavailable. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "AI summarization failed.",
    });
  }
};

// ============================================================
// CREATE CLAIM
// ============================================================

export const createClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { purchaseId, warrantyId, title, description, manufacturerName } = req.body;

    if (!purchaseId || !title) {
      return res.status(400).json({ success: false, message: "Purchase and title are required." });
    }

    // Verify access to the purchase (own or household member)
    const access = await validatePurchaseAccess(purchaseId, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Prevent duplicate claims for same purchase (any status except rejected)
    const { data: existingClaim, error: existingError } = await supabase
      .from("pop_claims")
      .select("id, status")
      .eq("purchase_id", purchaseId)
      .eq("user_id", userId)  // claims are owned by the user who creates them
      .neq("status", "rejected")
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: "A claim already exists for this purchase.",
      });
    }

    // Compile complaints if no description
    let compiledDescription = description || null;
    if (!compiledDescription) {
      const { data: complaints, error: complaintsError } = await supabase
        .from("pop_complaints")
        .select("complaint")
        .eq("purchase_id", purchaseId)
        .order("created_at", { ascending: true });

      if (complaintsError) console.error("Error fetching complaints:", complaintsError);
      else if (complaints && complaints.length > 0) {
        compiledDescription = complaints
          .map((c, index) => `${index + 1}. ${c.complaint}`)
          .join("\n");
      }
    }

    const { data, error } = await supabase
      .from("pop_claims")
      .insert({
        user_id: userId,
        purchase_id: purchaseId,
        warranty_id: warrantyId || null,
        title,
        description: compiledDescription,
        manufacturer_name: manufacturerName || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    await createNotification(
      userId,
      'claim_created',
      'Claim created',
      `Your claim "${title}" has been created.`
    );

    return res.status(201).json({ success: true, message: "Claim created.", data });
  } catch (error) {
    console.error("createClaim:", error);
    return res.status(500).json({ success: false, message: "Failed to create claim." });
  }
};

// ============================================================
// GET ALL CLAIMS (supports household filter)
// ============================================================

export const getClaims = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const { status, purchaseId, householdId } = req.query;

    let accessiblePurchaseIds = [];
    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
      const { data: purchases, error: purchaseError } = await supabase
        .from("pop_purchases")
        .select("id")
        .eq("household_id", householdId);
      if (purchaseError) throw purchaseError;
      accessiblePurchaseIds = purchases.map(p => p.id);
      if (accessiblePurchaseIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
    }

    let query = supabase
      .from("pop_claims")
      .select(`
        *,
        pop_purchases(
          *,
          pop_assets!pop_purchases_asset_id_fkey(*),
          pop_households!pop_purchases_household_id_fkey(*)
        ),
        pop_warranties(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (purchaseId) query = query.eq("purchase_id", purchaseId);
    if (householdId) {
      query = query.in("purchase_id", accessiblePurchaseIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase getClaims error:", error);
      throw error;
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getClaims error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch claims.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// ============================================================
// GET SINGLE CLAIM
// ============================================================

export const getClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    const { data: claim, error } = await supabase
  .from("pop_claims")
  .select(`
    *,
    pop_purchases(
      *,
      pop_assets!pop_purchases_asset_id_fkey(*),
      pop_households!pop_purchases_household_id_fkey(*)
    ),
    pop_warranties(*)
  `)
  .eq("id", id)
  .single();

    if (error || !claim) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    // Verify access: user must be the claim owner AND have access to the purchase
    if (claim.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this claim." });
    }

    const purchase = claim.pop_purchases;
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Associated purchase not found." });
    }

    const access = await validatePurchaseAccess(purchase.id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({ success: true, data: claim });
  } catch (error) {
    console.error("getClaim:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch claim." });
  }
};

// ============================================================
// UPDATE CLAIM
// ============================================================

export const updateClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;
    const { title, description, manufacturerName, manufacturerResponse, status } = req.body;

    // Fetch claim to check ownership and purchase access
    const { data: existingClaim, error: fetchError } = await supabase
      .from("pop_claims")
      .select("id, user_id, purchase_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingClaim) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    if (existingClaim.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this claim." });
    }

    const access = await validatePurchaseAccess(existingClaim.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (manufacturerName !== undefined) update.manufacturer_name = manufacturerName;
    if (manufacturerResponse !== undefined) update.manufacturer_response = manufacturerResponse;

    if (status !== undefined) {
      update.status = status;
      if (status === "submitted") update.submitted_at = new Date().toISOString();
      if (status === "resolved") update.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("pop_claims")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 🔔 Notification: status updated
    if (status !== undefined) {
      await createNotification(
        userId,
        'claim_status_updated',
        'Claim status updated',
        `Your claim status is now "${status}".`
      );
    }

    return res.json({ success: true, message: "Claim updated.", data });
  } catch (error) {
    console.error("updateClaim:", error);
    return res.status(500).json({ success: false, message: "Failed to update claim." });
  }
};

// ============================================================
// DELETE CLAIM
// ============================================================

export const deleteClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // Verify claim ownership and purchase access
    const { data: claim, error: fetchError } = await supabase
      .from("pop_claims")
      .select("id, user_id, purchase_id")
      .eq("id", id)
      .single();

    if (fetchError || !claim) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    if (claim.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this claim." });
    }

    const access = await validatePurchaseAccess(claim.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { error } = await supabase
      .from("pop_claims")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // 🔔 Notification: claim deleted
    await createNotification(
      userId,
      'claim_deleted',
      'Claim deleted',
      'Your claim has been deleted.'
    );

    return res.json({ success: true, message: "Claim deleted." });
  } catch (error) {
    console.error("deleteClaim:", error);
    return res.status(500).json({ success: false, message: "Failed to delete claim." });
  }
};

// ============================================================
// FORWARD CLAIM TO VENDOR/STORE
// ============================================================

export const forwardClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // Fetch claim with purchase info
    const { data: claim, error } = await supabase
      .from("pop_claims")
      .select(`
        *,
        pop_purchases(store_email, store_name)
      `)
      .eq("id", id)
      .single();

    if (error || !claim) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    if (claim.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You do not own this claim." });
    }

    const purchase = claim.pop_purchases;
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Associated purchase not found." });
    }

    const access = await validatePurchaseAccess(purchase.id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const storeEmail = purchase.store_email;
    if (!storeEmail) {
      return res.status(400).json({ success: false, message: "Store email is not available for this purchase." });
    }

    console.log(`Forwarding claim ${id} to ${storeEmail}`);

    // If claim is still draft, mark as submitted
    if (claim.status === "draft") {
      await supabase
        .from("pop_claims")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", id);
    }

    // 🔔 Notification: claim forwarded
    await createNotification(
      userId,
      'claim_forwarded',
      'Claim forwarded',
      `Your claim has been forwarded to ${storeEmail}.`
    );

    return res.json({ success: true, message: "Claim forwarded to vendor." });
  } catch (error) {
    console.error("forwardClaim error:", error);
    return res.status(500).json({ success: false, message: "Failed to forward claim." });
  }
};