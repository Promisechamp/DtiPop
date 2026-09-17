import { supabase } from "../../db/index.js";
import { createNotification } from "./notificationController.js";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

const getUserId = (req) => {
  return req.user?.id || null;
};

const normalizeHouseholdId = (value) => {
  return value || null;
};

const householdIdsMatch = (
  assetHouseholdId,
  purchaseHouseholdId
) => {
  return (
    normalizeHouseholdId(assetHouseholdId) ===
    normalizeHouseholdId(purchaseHouseholdId)
  );
};

/**
 * Verify that a user is an active member of a household.
 *
 * Household membership controls visibility/access.
 */
const verifyHouseholdMembership = async (
  userId,
  householdId
) => {
  if (!userId || !householdId) {
    return false;
  }

  const { data, error } = await supabase
    .from("pop_household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error(
      "verifyHouseholdMembership error:",
      error
    );

    return false;
  }

  return !!data;
};

/**
 * Read access:
 *
 * - Owner can access the asset.
 * - Household member can access a household asset.
 * - Private assets are only accessible by their owner.
 */
const validateAssetAccess = async (
  asset,
  userId
) => {
  if (!asset || !userId) {
    return false;
  }

  if (asset.user_id === userId) {
    return true;
  }

  if (asset.household_id) {
    return await verifyHouseholdMembership(
      userId,
      asset.household_id
    );
  }

  return false;
};

/**
 * Mutation access:
 *
 * Household membership does NOT make someone the owner.
 * Only the asset owner can update/delete the asset.
 */
const validateAssetOwnership = (
  asset,
  userId
) => {
  return (
    !!asset &&
    !!userId &&
    asset.user_id === userId
  );
};

/**
 * Validate that a purchase belongs to the
 * authenticated user and load its relationship data.
 */
const validatePurchaseForAssetLink = async (
  purchaseId,
  userId
) => {
  if (!purchaseId || !userId) {
    return {
      valid: false,
      error:
        "Purchase ID and authenticated user are required.",
    };
  }

  const {
    data: purchase,
    error,
  } = await supabase
    .from("pop_purchases")
    .select(`
      id,
      user_id,
      household_id,
      asset_id
    `)
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    console.error(
      "validatePurchaseForAssetLink error:",
      error
    );

    return {
      valid: false,
      error: "Unable to validate purchase.",
    };
  }

  if (!purchase) {
    return {
      valid: false,
      error: "Purchase not found.",
    };
  }

  if (purchase.user_id !== userId) {
    return {
      valid: false,
      error: "You do not own this purchase.",
    };
  }

  return {
    valid: true,
    purchase,
  };
};

/**
 * Standard asset select payload (without sharing).
 */
const ASSET_SELECT = `
  *,
  household:pop_households (
    id,
    name,
    household_type
  ),
  purchase:pop_purchases!pop_assets_purchase_id_fkey (
    id,
    product_name,
    brand,
    model,
    category,
    store_name,
    purchase_date,
    price,
    tax,
    currency,
    serial_number,
    receipt_url,
    product_image_url,
    warranty_months,
    warranty_start_date,
    warranty_end_date,
    notes,
    status
  )
`;

/**
 * Fetch sharing settings for multiple assets.
 *
 * Uses a separate query because there is no FK relationship
 * required between the asset query and sharing settings.
 */
const attachSharingSettings = async (
  assets
) => {
  if (!assets || assets.length === 0) {
    return assets;
  }

  const assetIds = assets
    .map((asset) => asset.id)
    .filter(Boolean);

  if (assetIds.length === 0) {
    return assets;
  }

  const {
    data: sharingRows,
    error: sharingError,
  } = await supabase
    .from("pop_asset_sharing")
    .select("*")
    .in("asset_id", assetIds);

  if (sharingError) {
    console.error(
      "attachSharingSettings error:",
      sharingError
    );

    return assets.map((asset) => ({
      ...asset,
      sharing: null,
    }));
  }

  const sharingMap = new Map();

  (sharingRows || []).forEach((row) => {
    sharingMap.set(row.asset_id, row);
  });

  return assets.map((asset) => ({
    ...asset,
    sharing:
      sharingMap.get(asset.id) || null,
  }));
};

/**
 * Fetch sharing settings for one asset.
 */
const attachSharingSettingsSingle = async (
  asset
) => {
  if (!asset || !asset.id) {
    return asset;
  }

  const {
    data: sharing,
    error,
  } = await supabase
    .from("pop_asset_sharing")
    .select("*")
    .eq("asset_id", asset.id)
    .maybeSingle();

  if (error) {
    console.error(
      "attachSharingSettingsSingle error:",
      error
    );

    return {
      ...asset,
      sharing: null,
    };
  }

  return {
    ...asset,
    sharing: sharing || null,
  };
};

/**
 * =========================================================
 * Create Asset
 * =========================================================
 *
 * Rules:
 *
 * Asset:
 *   - may exist without household
 *   - may exist without purchase
 *   - may optionally link to purchase
 *
 * Purchase:
 *   - must belong to current user
 *   - may already be purchase-only
 *   - may only be linked if asset_id is currently null
 *
 * When linked:
 *   asset.household_id === purchase.household_id
 *
 * The controller NEVER changes the purchase household.
 */
export const createAsset = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      householdId,
      purchaseId,
      name,
      assetType,
      location,
      condition,
      status = "active",
      notes,
    } = req.body;

    const targetHouseholdId =
      normalizeHouseholdId(householdId);

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Asset name is required.",
      });
    }

    /**
     * Household is optional.
     *
     * If supplied, the creator must be an active member.
     */
    if (targetHouseholdId) {
      const isMember =
        await verifyHouseholdMembership(
          userId,
          targetHouseholdId
        );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message:
            "You are not an active member of this household.",
        });
      }
    }

    let purchase = null;

    if (purchaseId) {
      const purchaseValidation =
        await validatePurchaseForAssetLink(
          purchaseId,
          userId
        );

      if (!purchaseValidation.valid) {
        return res.status(403).json({
          success: false,
          message:
            purchaseValidation.error,
        });
      }

      purchase =
        purchaseValidation.purchase;

      /**
       * A purchase can only be linked to one asset.
       */
      if (purchase.asset_id) {
        return res.status(409).json({
          success: false,
          message:
            "This purchase is already linked to another asset.",
          assetId: purchase.asset_id,
        });
      }

      /**
       * IMPORTANT:
       *
       * Household IDs must match exactly.
       *
       * Valid:
       *   null + null
       *   householdA + householdA
       *
       * Invalid:
       *   null + householdA
       *   householdA + null
       *   householdA + householdB
       *
       * Never silently repair this by changing either record.
       */
      if (
        !householdIdsMatch(
          targetHouseholdId,
          purchase.household_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The purchase and asset must belong to the same household. Both can be private, but a household purchase cannot be linked to a private asset and vice versa.",
        });
      }
    }

    /**
     * Create the Asset first.
     */
    const {
      data: asset,
      error: assetError,
    } = await supabase
      .from("pop_assets")
      .insert({
        household_id:
          targetHouseholdId,
        user_id: userId,
        purchase_id:
          purchaseId || null,
        name: name.trim(),
        asset_type:
          assetType || null,
        location:
          location?.trim() || null,
        condition:
          condition || null,
        status:
          status || "active",
        notes:
          notes?.trim() || null,
      })
      .select()
      .single();

    if (assetError) {
      console.error(
        "createAsset insert error:",
        assetError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create asset.",
        error: assetError.message,
      });
    }

    /**
     * Link the purchase to the newly-created asset.
     *
     * No household mutation occurs here.
     */
    if (purchaseId) {
      const {
        error: purchaseUpdateError,
      } = await supabase
        .from("pop_purchases")
        .update({
          asset_id: asset.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", purchaseId)
        .eq("user_id", userId)
        .is("asset_id", null);

      if (purchaseUpdateError) {
        console.error(
          "createAsset purchase link error:",
          purchaseUpdateError
        );

        /**
         * Roll back the Asset because the
         * Purchase ↔ Asset relationship failed.
         */
        await supabase
          .from("pop_assets")
          .delete()
          .eq("id", asset.id)
          .eq("user_id", userId);

        return res.status(500).json({
          success: false,
          message:
            "Asset could not be linked to the purchase.",
          error:
            purchaseUpdateError.message,
        });
      }
    }

    /**
     * Notification.
     */
    try {
      if (
        typeof createNotification ===
        "function"
      ) {
        const notificationMessage =
          targetHouseholdId
            ? `${asset.name} was added to your household assets.`
            : `${asset.name} was added to your private assets.`;

        await createNotification(
          userId,
          "asset_created",
          "Asset added",
          notificationMessage
        );
      }
    } catch (notificationError) {
      console.warn(
        "Asset notification failed:",
        notificationError
      );
    }

    /**
     * Return fully populated asset.
     */
    const {
      data: finalAsset,
      error: finalAssetError,
    } = await supabase
      .from("pop_assets")
      .select(ASSET_SELECT)
      .eq("id", asset.id)
      .single();

    if (finalAssetError) {
      const withSharing =
        await attachSharingSettingsSingle(
          asset
        );

      return res.status(201).json({
        success: true,
        message:
          "Asset created successfully.",
        data: withSharing,
      });
    }

    const withSharing =
      await attachSharingSettingsSingle(
        finalAsset
      );

    return res.status(201).json({
      success: true,
      message:
        "Asset created successfully.",
      data: withSharing,
    });
  } catch (error) {
    console.error(
      "createAsset error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while creating the asset.",
    });
  }
};

/**
 * =========================================================
 * Get Assets
 * =========================================================
 *
 * Read visibility:
 *
 * - User's own private assets
 * - User's own household assets
 * - Assets belonging to households where user is active member
 */
export const getAssets = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      householdId,
      assetType,
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        parseInt(limit, 10) || 20,
        1
      ),
      100
    );

    let query = supabase
      .from("pop_assets")
      .select(
        ASSET_SELECT,
        { count: "exact" }
      )
      .order("created_at", {
        ascending: false,
      });

    /**
     * Explicit household filter.
     */
    if (householdId) {
      const isMember =
        await verifyHouseholdMembership(
          userId,
          householdId
        );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message:
            "You are not an active member of this household.",
        });
      }

      query = query.eq(
        "household_id",
        householdId
      );
    } else {
      /**
       * No household filter:
       *
       * Return:
       * - user's own assets
       * - assets in households the user belongs to
       */
      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("pop_household_members")
        .select("household_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (membershipError) {
        console.error(
          "getAssets membership error:",
          membershipError
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to load household memberships.",
        });
      }

      const householdIds =
        memberships?.map(
          (item) => item.household_id
        ) || [];

      if (householdIds.length > 0) {
        query = query.or(
          `user_id.eq.${userId},household_id.in.(${householdIds.join(
            ","
          )})`
        );
      } else {
        query = query.eq(
          "user_id",
          userId
        );
      }
    }

    if (assetType) {
      query = query.eq(
        "asset_type",
        assetType
      );
    }

    if (status) {
      query = query.eq(
        "status",
        status
      );
    }

    if (search?.trim()) {
      const safeSearch = search
        .trim()
        .replace(
          /[%_,]/g,
          (char) => `\\${char}`
        );

      query = query.or(
        `name.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%,asset_type.ilike.%${safeSearch}%`
      );
    }

    const from =
      (pageNumber - 1) *
      limitNumber;

    const to =
      from + limitNumber - 1;

    query = query.range(
      from,
      to
    );

    const {
      data,
      error,
      count,
    } = await query;

    if (error) {
      console.error(
        "getAssets error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve assets.",
        error: error.message,
      });
    }

    const enrichedData =
      await attachSharingSettings(
        data || []
      );

    return res.json({
      success: true,
      data: enrichedData,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count || 0,
        totalPages: Math.ceil(
          (count || 0) /
            limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "getAssets error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while retrieving assets.",
    });
  }
};

/**
 * =========================================================
 * Get Single Asset
 * =========================================================
 */

export const getAsset = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      data: asset,
      error,
    } = await supabase
      .from("pop_assets")
      .select(`
        *,
        household:pop_households (
          id,
          name,
          household_type
        ),
        purchase:pop_purchases!pop_assets_purchase_id_fkey (
          id,
          product_name,
          brand,
          model,
          category,
          store_name,
          purchase_date,
          price,
          tax,
          currency,
          serial_number,
          receipt_url,
          product_image_url,
          warranty_months,
          warranty_start_date,
          warranty_end_date,
          notes,
          status
        ),
        maintenance:pop_maintenance (
          id,
          title,
          description,
          maintenance_type,
          frequency,
          last_completed_at,
          next_due_at,
          provider_name,
          cost,
          notes,
          status,
          created_at,
          updated_at
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "getAsset error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve asset.",
        error: error.message,
      });
    }

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    const hasAccess =
      await validateAssetAccess(
        asset,
        userId
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this asset.",
      });
    }

    const enrichedAsset =
      await attachSharingSettingsSingle(
        asset
      );

    return res.json({
      success: true,
      data: enrichedAsset,
    });
  } catch (error) {
    console.error(
      "getAsset error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while retrieving the asset.",
    });
  }
};

/**
 * =========================================================
 * Update Asset
 * =========================================================
 *
 * Mutation rules:
 *
 * - Only asset owner may update.
 * - Household membership is required when moving the asset
 *   into a household.
 * - Linked Purchase and Asset household IDs must match
 *   exactly.
 * - The controller never changes the Purchase household.
 */
export const updateAsset = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /**
     * Load the existing Asset.
     */
    const {
      data: existingAsset,
      error: fetchError,
    } = await supabase
      .from("pop_assets")
      .select(`
        *,
        purchase:pop_purchases!pop_assets_purchase_id_fkey (
          id,
          user_id,
          household_id,
          asset_id
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "updateAsset fetch error:",
        fetchError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load asset.",
      });
    }

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message:
          "Asset not found.",
      });
    }

    /**
     * IMPORTANT:
     *
     * Household access does not grant mutation ownership.
     */
    const isOwner =
      validateAssetOwnership(
        existingAsset,
        userId
      );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Only the asset owner can update this asset.",
      });
    }

    const purchaseIdWasProvided =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "purchaseId"
      );

    const householdIdWasProvided =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "householdId"
      );

    /**
     * Determine target relationship.
     */
    const targetHouseholdId =
      householdIdWasProvided
        ? normalizeHouseholdId(
            householdIdWasProvided
              ? req.body.householdId
              : null
          )
        : normalizeHouseholdId(
            existingAsset.household_id
          );

    const targetPurchaseId =
      purchaseIdWasProvided
        ? req.body.purchaseId || null
        : existingAsset.purchase_id ||
          null;

    /**
     * If household is changing to a household,
     * the owner must be a member.
     */
    if (
      householdIdWasProvided &&
      targetHouseholdId !==
        normalizeHouseholdId(
          existingAsset.household_id
        ) &&
      targetHouseholdId
    ) {
      const isMember =
        await verifyHouseholdMembership(
          userId,
          targetHouseholdId
        );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message:
            "You are not an active member of the target household.",
        });
      }
    }

    let targetPurchase = null;

    /**
     * Validate target Purchase if there is one.
     */
    if (targetPurchaseId) {
      const purchaseValidation =
        await validatePurchaseForAssetLink(
          targetPurchaseId,
          userId
        );

      if (!purchaseValidation.valid) {
        return res.status(403).json({
          success: false,
          message:
            purchaseValidation.error,
        });
      }

      targetPurchase =
        purchaseValidation.purchase;

      /**
       * It can already point to this asset.
       * It cannot point to another asset.
       */
      if (
        targetPurchase.asset_id &&
        targetPurchase.asset_id !== id
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This purchase is already linked to another asset.",
          assetId:
            targetPurchase.asset_id,
        });
      }

      /**
       * CRITICAL INVARIANT:
       *
       * Purchase and Asset household IDs must
       * be exactly equal.
       */
      if (
        !householdIdsMatch(
          targetHouseholdId,
          targetPurchase.household_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The purchase and asset must belong to the same household. Both can be private, but a household purchase cannot be linked to a private asset and vice versa.",
        });
      }
    }

    const previousPurchaseId =
      existingAsset.purchase_id ||
      null;

    const previousHouseholdId =
      normalizeHouseholdId(
        existingAsset.household_id
      );

    const relationshipChanging =
      (targetPurchaseId || null) !==
      previousPurchaseId;

    /**
     * If an existing linked purchase is being kept
     * while the household changes, validate the invariant.
     */
    if (
      !purchaseIdWasProvided &&
      previousPurchaseId
    ) {
      const existingPurchase =
        existingAsset.purchase;

      if (!existingPurchase) {
        return res.status(409).json({
          success: false,
          message:
            "The linked purchase could not be loaded.",
        });
      }

      if (
        !householdIdsMatch(
          targetHouseholdId,
          existingPurchase.household_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The asset and linked purchase must belong to the same household. Change the purchase household first or unlink the purchase before moving the asset.",
        });
      }
    }

    /**
     * ---------------------------------------------------------
     * Step 1: Unlink previous purchase if relationship changes
     * ---------------------------------------------------------
     */
    if (
      relationshipChanging &&
      previousPurchaseId
    ) {
      const {
        error: oldPurchaseError,
      } = await supabase
        .from("pop_purchases")
        .update({
          asset_id: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", previousPurchaseId)
        .eq("user_id", userId)
        .eq("asset_id", id);

      if (oldPurchaseError) {
        console.error(
          "updateAsset unlink old purchase error:",
          oldPurchaseError
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to unlink the previous purchase.",
          error:
            oldPurchaseError.message,
        });
      }
    }

    /**
     * ---------------------------------------------------------
     * Step 2: Update Asset
     * ---------------------------------------------------------
     */
    const updateData = {};

    if (householdIdWasProvided) {
      updateData.household_id =
        targetHouseholdId;
    }

    if (purchaseIdWasProvided) {
      updateData.purchase_id =
        targetPurchaseId;
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        /**
         * If we already unlinked the previous purchase,
         * restore it before returning.
         */
        if (
          relationshipChanging &&
          previousPurchaseId
        ) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: id,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              previousPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        return res.status(400).json({
          success: false,
          message:
            "Asset name cannot be empty.",
        });
      }

      updateData.name =
        name.trim();
    }

    if (assetType !== undefined) {
      updateData.asset_type =
        assetType || null;
    }

    if (location !== undefined) {
      updateData.location =
        location?.trim() || null;
    }

    if (condition !== undefined) {
      updateData.condition =
        condition || null;
    }

    if (status !== undefined) {
      updateData.status =
        status || "active";
    }

    if (notes !== undefined) {
      updateData.notes =
        notes?.trim() || null;
    }

    updateData.updated_at =
      new Date().toISOString();

    const {
      data: updatedAsset,
      error: updateError,
    } = await supabase
      .from("pop_assets")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "updateAsset update error:",
        updateError
      );

      /**
       * Restore previous purchase link.
       */
      if (
        relationshipChanging &&
        previousPurchaseId
      ) {
        await supabase
          .from("pop_purchases")
          .update({
            asset_id: id,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            previousPurchaseId
          )
          .eq(
            "user_id",
            userId
          );
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update asset.",
        error:
          updateError.message,
      });
    }

    /**
     * ---------------------------------------------------------
     * Step 3: Link new purchase
     * ---------------------------------------------------------
     */
    if (
      relationshipChanging &&
      targetPurchaseId
    ) {
      const {
        error: newPurchaseError,
      } = await supabase
        .from("pop_purchases")
        .update({
          asset_id: id,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          targetPurchaseId
        )
        .eq(
          "user_id",
          userId
        )
        .is(
          "asset_id",
          null
        );

      if (newPurchaseError) {
        console.error(
          "updateAsset link new purchase error:",
          newPurchaseError
        );

        /**
         * Roll Asset back.
         */
        await supabase
          .from("pop_assets")
          .update({
            purchase_id:
              previousPurchaseId,
            household_id:
              previousHouseholdId,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId);

        /**
         * Restore previous purchase link.
         */
        if (previousPurchaseId) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: id,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              previousPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        return res.status(500).json({
          success: false,
          message:
            "Failed to link the new purchase to the asset.",
          error:
            newPurchaseError.message,
        });
      }
    }

    /**
     * ---------------------------------------------------------
     * Step 4: Final relationship verification
     * ---------------------------------------------------------
     */
    if (targetPurchaseId) {
      const {
        data: linkedPurchase,
        error:
          linkedPurchaseError,
      } = await supabase
        .from("pop_purchases")
        .select(
          "id, asset_id, household_id, user_id"
        )
        .eq(
          "id",
          targetPurchaseId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      if (
        linkedPurchaseError ||
        !linkedPurchase
      ) {
        console.error(
          "updateAsset final purchase verification error:",
          linkedPurchaseError
        );

        /**
         * Best-effort rollback.
         */
        await supabase
          .from("pop_assets")
          .update({
            purchase_id:
              previousPurchaseId,
            household_id:
              previousHouseholdId,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId);

        if (previousPurchaseId) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: id,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              previousPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        if (
          targetPurchaseId !==
          previousPurchaseId
        ) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: null,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              targetPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        return res.status(500).json({
          success: false,
          message:
            "The purchase relationship could not be verified.",
        });
      }

      if (
        linkedPurchase.asset_id !== id ||
        !householdIdsMatch(
          targetHouseholdId,
          linkedPurchase.household_id
        )
      ) {
        console.error(
          "updateAsset relationship consistency failure:",
          {
            assetId: id,
            purchaseId:
              targetPurchaseId,
            assetHouseholdId:
              targetHouseholdId,
            purchaseAssetId:
              linkedPurchase.asset_id,
            purchaseHouseholdId:
              linkedPurchase.household_id,
          }
        );

        /**
         * Best-effort rollback.
         */
        await supabase
          .from("pop_assets")
          .update({
            purchase_id:
              previousPurchaseId,
            household_id:
              previousHouseholdId,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId);

        if (previousPurchaseId) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: id,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              previousPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        if (
          targetPurchaseId !==
          previousPurchaseId
        ) {
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: null,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              targetPurchaseId
            )
            .eq(
              "user_id",
              userId
            );
        }

        return res.status(500).json({
          success: false,
          message:
            "The asset and purchase relationship could not be synchronized.",
        });
      }
    }

    /**
     * ---------------------------------------------------------
     * Final asset response
     * ---------------------------------------------------------
     */
    const {
      data: finalAsset,
      error: finalAssetError,
    } = await supabase
      .from("pop_assets")
      .select(ASSET_SELECT)
      .eq("id", id)
      .single();

    if (finalAssetError) {
      const withSharing =
        await attachSharingSettingsSingle(
          updatedAsset
        );

      return res.json({
        success: true,
        message:
          "Asset updated successfully.",
        data: withSharing,
      });
    }

    const withSharing =
      await attachSharingSettingsSingle(
        finalAsset
      );

    return res.json({
      success: true,
      message:
        "Asset updated successfully.",
      data: withSharing,
    });
  } catch (error) {
    console.error(
      "updateAsset error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while updating the asset.",
    });
  }
};

/**
 * =========================================================
 * Delete Asset
 * =========================================================
 *
 * Deleting an Asset does NOT delete its Purchase.
 *
 * If linked:
 *   Purchase.asset_id -> null
 *
 * Then:
 *   Asset -> deleted
 *
 * Only the asset owner can delete it.
 */
export const deleteAsset = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      data: asset,
      error: fetchError,
    } = await supabase
      .from("pop_assets")
      .select(`
        *,
        purchase:pop_purchases!pop_assets_purchase_id_fkey (
          id,
          user_id,
          asset_id
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "deleteAsset fetch error:",
        fetchError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load asset.",
      });
    }

    if (!asset) {
      return res.status(404).json({
        success: false,
        message:
          "Asset not found.",
      });
    }

    /**
     * Household access does not grant delete permission.
     */
    const isOwner =
      validateAssetOwnership(
        asset,
        userId
      );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Only the asset owner can delete this asset.",
      });
    }

    /**
     * Unlink Purchase first.
     */
    if (asset.purchase_id) {
      const {
        error: unlinkError,
      } = await supabase
        .from("pop_purchases")
        .update({
          asset_id: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          asset.purchase_id
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "asset_id",
          id
        );

      if (unlinkError) {
        console.error(
          "deleteAsset unlink purchase error:",
          unlinkError
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to unlink the purchase from this asset.",
          error:
            unlinkError.message,
        });
      }
    }

    /**
     * Delete Asset.
     */
    const {
      error: deleteError,
    } = await supabase
      .from("pop_assets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error(
        "deleteAsset delete error:",
        deleteError
      );

      /**
       * Restore Purchase relationship.
       */
      if (asset.purchase_id) {
        await supabase
          .from("pop_purchases")
          .update({
            asset_id: id,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            asset.purchase_id
          )
          .eq(
            "user_id",
            userId
          );
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete asset.",
        error:
          deleteError.message,
      });
    }

    return res.json({
      success: true,
      message:
        "Asset deleted successfully.",
    });
  } catch (error) {
    console.error(
      "deleteAsset error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while deleting the asset.",
    });
  }
};

/**
 * =========================================================
 * Get Household Assets
 * =========================================================
 */

export const getHouseholdAssets = async (
  req,
  res
) => {
  const { householdId } = req.params;

  req.query = {
    ...req.query,
    householdId,
  };

  return getAssets(req, res);
};