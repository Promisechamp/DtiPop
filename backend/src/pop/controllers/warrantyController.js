import { supabase } from '../../db/index.js';
import { getWarrantyStatus, getDaysRemaining } from "../../utils/dateHelpers.js";
import { createNotification } from './notificationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

/**
 * Verify that a user is an active member of a given household.
 * Returns { valid: boolean, error?: string }
 */
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

/**
 * Validate that the user can access a purchase (ownership or household membership)
 * If purchase belongs to a household, check membership; otherwise check user_id.
 * Returns { valid: boolean, data?: purchase, error?: string }
 */
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
    // Direct ownership
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
// GET WARRANTIES
// ============================================================

export const getWarranties = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { status, householdId, page = 1, limit = 20 } = req.query;

    // Start building the query – join with purchases to filter by household if needed
    let query = supabase
      .from("pop_warranties")
      .select(`
        *,
        pop_purchases(
          id,
          product_name,
          brand,
          model,
          category,
          store_name,
          purchase_date,
          price,
          currency,
          serial_number,
          receipt_url,
          product_image_url,
          household_id,
          asset_id
        ),
        pop_assets!inner(
          id,
          name,
          asset_type,
          location,
          condition,
          status
        ),
        pop_households!inner(
          id,
          name,
          household_type,
          owner_id
        )
      `, { count: "exact" });

    // Access filter: user must be either owner of purchase or member of purchase's household
    // This is a bit tricky with Supabase; we'll filter after fetching.
    // To avoid over-fetching, we first get warranties where either:
    // - purchase.user_id = userId, or
    // - purchase.household_id is in a household where user is a member.
    // We'll do a subquery approach using in().

    // Get list of household IDs where user is a member
    const { data: memberHouseholds, error: memberError } = await supabase
      .from("pop_household_members")
      .select("household_id")
      .eq("user_id", userId)
      .eq("status", "active");

    if (memberError) throw memberError;
    const householdIds = memberHouseholds.map(h => h.household_id);

    // Build filter: (purchase.user_id = userId) OR (purchase.household_id IN (...))
    // We'll use or filter with the purchase relation.
    // Supabase supports filtering on nested tables using 'pop_purchases.user_id' etc.
    // We'll use the 'or' filter on the main table referencing the nested table.

    // Using raw filter: or(user_id.eq.${userId}, household_id.in.(${householdIds.join(',')}))
    // But we need to reference the purchase's fields. Since we're selecting from warranties,
    // we can filter using the purchase relation: pop_purchases.user_id and pop_purchases.household_id.
    // Supabase doesn't support nested filtering directly with .or() on relation, so we'll do it manually.
    // Alternative: fetch all warranties for the user's own purchases, and separately for household purchases,
    // then union. But we can do a single query with an 'or' filter on the main table using the nested fields.

    // We'll use the 'filter' approach: query.or(`pop_purchases.user_id.eq.${userId},pop_purchases.household_id.in.(${householdIds.join(',')})`)
    // But that's not supported. So we'll fetch all warranties for purchases where user_id = userId OR household_id IN (...)
    // We'll do this by building a query with a filter on the purchase table using .eq on the relation.
    // Actually, we can use .in on a subquery: get purchase ids that are accessible, then filter warranties by purchase_id in that list.

    // Build list of accessible purchase IDs:
    let purchaseQuery = supabase
      .from("pop_purchases")
      .select("id")
      .or(`user_id.eq.${userId},household_id.in.(${householdIds.length ? householdIds.join(',') : 'null'})`);

    // Also if householdId is provided, further restrict to that household
    if (householdId) {
      // Verify membership first
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
      // Then filter purchases by that household
      purchaseQuery = purchaseQuery.eq("household_id", householdId);
    }

    const { data: accessiblePurchases, error: purchaseError } = await purchaseQuery;
    if (purchaseError) throw purchaseError;
    const purchaseIds = accessiblePurchases.map(p => p.id);

    if (purchaseIds.length === 0) {
      // No accessible purchases, return empty list
      return res.json({
        success: true,
        data: [],
        pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 }
      });
    }

    // Now filter warranties by these purchase IDs
    query = query.in("purchase_id", purchaseIds);

    // Apply status filter if provided
    if (status) {
      // status is computed, not stored, but we can filter after fetching
      // So we'll fetch all and filter in JS
    }

    // Pagination
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    // Compute status and days_remaining, and filter by status if requested
    let result = data.map((warranty) => {
      const computedStatus = getWarrantyStatus(warranty.end_date);
      return {
        ...warranty,
        status: computedStatus,
        days_remaining: getDaysRemaining(warranty.end_date),
      };
    });

    if (status) {
      result = result.filter((item) => item.status === status);
    }

    // Recalculate total count after status filter if needed
    const totalCount = status ? result.length : (count || 0);

    return res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: totalCount,
        pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("getWarranties:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch warranties." });
  }
};

// ============================================================
// GET SINGLE WARRANTY
// ============================================================

export const getWarranty = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // First get the warranty with purchase info
    const { data: warranty, error } = await supabase
      .from("pop_warranties")
      .select(`
        *,
        pop_purchases(
          id,
          user_id,
          household_id,
          asset_id,
          product_name,
          brand,
          model,
          category,
          store_name,
          purchase_date,
          price,
          currency,
          serial_number,
          receipt_url,
          product_image_url
        ),
        pop_assets(
          id,
          name,
          asset_type,
          location,
          condition,
          status
        ),
        pop_households(
          id,
          name,
          household_type,
          owner_id
        )
      `)
      .eq("id", id)
      .single();

    if (error || !warranty) {
      return res.status(404).json({ success: false, message: "Warranty not found." });
    }

    // Validate access: user must own the purchase or be a member of its household
    const purchase = warranty.pop_purchases;
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Associated purchase not found." });
    }

    const access = await validatePurchaseAccess(purchase.id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({
      success: true,
      data: {
        ...warranty,
        status: getWarrantyStatus(warranty.end_date),
        days_remaining: getDaysRemaining(warranty.end_date),
      },
    });
  } catch (error) {
    console.error("getWarranty:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch warranty." });
  }
};

// ============================================================
// CREATE WARRANTY
// ============================================================

export const createWarranty = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const {
      purchaseId,
      warrantyType,
      providerName,
      durationMonths,
      startDate,
      endDate,
      terms,
    } = req.body;

    if (!purchaseId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase, start date and end date are required.",
      });
    }

    // Validate access to the purchase
    const access = await validatePurchaseAccess(purchaseId, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Check if a warranty already exists for this purchase (optional)
    const { data: existing, error: checkError } = await supabase
      .from("pop_warranties")
      .select("id")
      .eq("purchase_id", purchaseId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ success: false, message: "A warranty already exists for this purchase." });
    }

    const { data, error } = await supabase
      .from("pop_warranties")
      .insert({
        user_id: userId,
        purchase_id: purchaseId,
        warranty_type: warrantyType || "manufacturer",
        provider_name: providerName || null,
        duration_months: Number(durationMonths || 0),
        start_date: startDate,
        end_date: endDate,
        status: getWarrantyStatus(endDate),
        terms: terms || null,
      })
      .select()
      .single();

    if (error) throw error;

    // 🔔 Notification
    await createNotification(
      userId,
      'warranty_created',
      'Warranty created',
      'A new warranty record was added.'
    );

    return res.status(201).json({ success: true, message: "Warranty created.", data });
  } catch (error) {
    console.error("createWarranty:", error);
    return res.status(500).json({ success: false, message: "Failed to create warranty." });
  }
};

// ============================================================
// UPDATE WARRANTY
// ============================================================

export const updateWarranty = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // First fetch the warranty to check access and get purchase info
    const { data: existingWarranty, error: fetchError } = await supabase
      .from("pop_warranties")
      .select("id, purchase_id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingWarranty) {
      return res.status(404).json({ success: false, message: "Warranty not found." });
    }

    // Verify user has access to the associated purchase
    const access = await validatePurchaseAccess(existingWarranty.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const {
      warrantyType,
      providerName,
      durationMonths,
      startDate,
      endDate,
      terms,
    } = req.body;

    const update = {};

    if (warrantyType !== undefined) update.warranty_type = warrantyType;
    if (providerName !== undefined) update.provider_name = providerName;
    if (durationMonths !== undefined) update.duration_months = Number(durationMonths);
    if (startDate !== undefined) update.start_date = startDate;
    if (endDate !== undefined) {
      update.end_date = endDate;
      update.status = getWarrantyStatus(endDate);
    }
    if (terms !== undefined) update.terms = terms;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No changes provided." });
    }

    const { data, error } = await supabase
      .from("pop_warranties")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 🔔 Notification
    await createNotification(
      userId,
      'warranty_updated',
      'Warranty updated',
      'Your warranty details have been updated.'
    );

    return res.json({ success: true, message: "Warranty updated.", data });
  } catch (error) {
    console.error("updateWarranty:", error);
    return res.status(500).json({ success: false, message: "Failed to update warranty." });
  }
};

// ============================================================
// DELETE WARRANTY
// ============================================================

export const deleteWarranty = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID is required." });
    }

    const { id } = req.params;

    // Fetch warranty to verify access
    const { data: warranty, error: fetchError } = await supabase
      .from("pop_warranties")
      .select("id, purchase_id")
      .eq("id", id)
      .single();

    if (fetchError || !warranty) {
      return res.status(404).json({ success: false, message: "Warranty not found." });
    }

    const access = await validatePurchaseAccess(warranty.purchase_id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { error } = await supabase
      .from("pop_warranties")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // 🔔 Notification
    await createNotification(
      userId,
      'warranty_deleted',
      'Warranty deleted',
      'A warranty record has been removed.'
    );

    return res.json({ success: true, message: "Warranty deleted." });
  } catch (error) {
    console.error("deleteWarranty:", error);
    return res.status(500).json({ success: false, message: "Failed to delete warranty." });
  }
};