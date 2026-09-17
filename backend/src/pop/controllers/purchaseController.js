import { supabase } from '../../db/index.js';
import { deleteImage, deleteMultipleImages } from "../../utils/cloudinary.js";
import { uploadToCloudinary } from "../../utils/cloudinary.js";
import { calculateWarrantyEnd } from "../../utils/dateHelpers.js";
import { createNotification } from './notificationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const isValidEmail = (email) => {
  if (!email) return true;
  return /^\S+@\S+\.\S+$/.test(email);
};

const getOwnedPurchase = async (purchaseId, userId) => {
  const { data, error } = await supabase
    .from("pop_purchases")
    .select("*")
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .single();

  return { data, error };
};

/**
 * Cleanup uploaded images from Cloudinary if database operations fail
 */
const cleanupUploadedImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) {
    return { success: true };
  }

  try {
    const publicIds = imageUrls
      .map((url) => {
        try {
          const parts = url.split("/");
          const filename = parts[parts.length - 1];
          const publicId = filename.split(".")[0];

          const uploadIndex = parts.indexOf("upload");

          if (uploadIndex === -1) {
            return `POP/${publicId}`;
          }

          const folderParts = parts.slice(
            uploadIndex + 2,
            parts.length - 1
          );

          const folderPath = folderParts.join("/");

          return folderPath
            ? `${folderPath}/${publicId}`
            : `POP/${publicId}`;
        } catch (err) {
          console.error(
            "Error extracting public ID from URL:",
            url,
            err
          );
          return null;
        }
      })
      .filter((id) => id !== null);

    if (publicIds.length === 0) {
      console.warn("⚠️ No valid public IDs found to clean up");

      return {
        success: true,
        message: "No valid public IDs found",
      };
    }

    console.log("📋 Cleaning up public IDs:", publicIds);

    // deleteMultipleImages expects an array
    const result = await deleteMultipleImages(publicIds);

    console.log(
      `✅ Cleaned up ${result.deleted} images successfully`
    );

    return {
      success: true,
      deleted: result.deleted,
    };
  } catch (error) {
    console.error("❌ Failed to clean up images:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if request has files for backend upload
 */
const hasFilesToUpload = (req) => {
  return (
    req.files?.receipt?.[0] ||
    req.files?.productImage?.[0]
  );
};

/**
 * Upload files from request (backend upload method)
 */
const uploadFilesFromRequest = async (req) => {
  const results = {
    receipt: null,
    productImage: null,
  };

  if (req.files?.receipt?.[0]) {
    results.receipt = await uploadToCloudinary(
      req.files.receipt[0].buffer,
      "POP/receipts",
      { resourceType: "auto" }
    );
  }

  if (req.files?.productImage?.[0]) {
    results.productImage = await uploadToCloudinary(
      req.files.productImage[0].buffer,
      "POP/products",
      { resourceType: "image" }
    );
  }

  return results;
};

/**
 * Check if frontend direct upload is being used
 */
const isFrontendDirectUpload = (body) => {
  return (
    body.receiptUrl !== undefined ||
    body.productImageUrl !== undefined
  );
};

// ============================================================
// HOUSEHOLD & ASSET HELPERS
// ============================================================

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) {
    return { valid: true };
  }

  const { data, error } = await supabase
    .from("pop_household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return {
      valid: false,
      error: "User is not a member of this household.",
    };
  }

  return { valid: true };
};

/**
 * NEW
 *
 * Fetch an asset owned by the current user.
 * Assets are user-owned even when they belong to a household.
 */
const getOwnedAsset = async (assetId, userId) => {
  const { data, error } = await supabase
    .from("pop_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", userId)
    .single();

  return { data, error };
};

/**
 * NEW
 *
 * Validate an asset before linking it to a purchase.
 *
 * Rules:
 * - Asset must belong to the current user.
 * - If purchase has a household, asset must belong to that household.
 * - If asset already belongs to another purchase, reject it.
 */
const validateAssetForPurchase = async (
  assetId,
  userId,
  householdId = null,
  currentPurchaseId = null
) => {
  if (!assetId) {
    return {
      valid: true,
      asset: null,
    };
  }

  const { data: asset, error } = await getOwnedAsset(
    assetId,
    userId
  );

  if (error || !asset) {
    return {
      valid: false,
      status: 404,
      error: "Asset not found or you do not have access to it.",
    };
  }

  if (
    householdId &&
    asset.household_id &&
    asset.household_id !== householdId
  ) {
    return {
      valid: false,
      status: 400,
      error:
        "The selected asset does not belong to the selected household.",
    };
  }

  if (
    householdId &&
    !asset.household_id
  ) {
    return {
      valid: false,
      status: 400,
      error:
        "The selected asset is not assigned to the selected household.",
    };
  }

  if (
    asset.purchase_id &&
    asset.purchase_id !== currentPurchaseId
  ) {
    return {
      valid: false,
      status: 409,
      error:
        "The selected asset is already linked to another purchase.",
    };
  }

  return {
    valid: true,
    asset,
  };
};




/**
 * Update purchase.asset_id
 */
const updatePurchaseAssetId = async (
  purchaseId,
  assetId
) => {
  const { error } = await supabase
    .from("pop_purchases")
    .update({
      asset_id: assetId || null,
    })
    .eq("id", purchaseId);

  if (error) {
    throw new Error(
      `Failed to link asset: ${error.message}`
    );
  }
};

/**
 * NEW
 *
 * Link both sides of the Purchase <-> Asset relationship.
 */
const linkPurchaseAndAsset = async (
  purchaseId,
  assetId
) => {
  if (!purchaseId || !assetId) {
    throw new Error(
      "Purchase ID and asset ID are required to create a relationship."
    );
  }

  const { error: purchaseError } = await supabase
    .from("pop_purchases")
    .update({
      asset_id: assetId,
    })
    .eq("id", purchaseId);

  if (purchaseError) {
    throw new Error(
      `Failed to link purchase to asset: ${purchaseError.message}`
    );
  }

  const { error: assetError } = await supabase
    .from("pop_assets")
    .update({
      purchase_id: purchaseId,
    })
    .eq("id", assetId);

  if (assetError) {
    // Best-effort rollback of purchase side
    await supabase
      .from("pop_purchases")
      .update({
        asset_id: null,
      })
      .eq("id", purchaseId);

    throw new Error(
      `Failed to link asset to purchase: ${assetError.message}`
    );
  }
};

/**
 * NEW
 *
 * Unlink both sides without deleting either record.
 */
const unlinkPurchaseAndAsset = async (
  purchaseId,
  assetId
) => {
  if (!purchaseId && !assetId) return;

  if (assetId) {
    const { error: assetError } = await supabase
      .from("pop_assets")
      .update({
        purchase_id: null,
      })
      .eq("id", assetId)
      .eq("purchase_id", purchaseId);

    if (assetError) {
      throw new Error(
        `Failed to unlink asset: ${assetError.message}`
      );
    }
  }

  if (purchaseId) {
    const { error: purchaseError } = await supabase
      .from("pop_purchases")
      .update({
        asset_id: null,
      })
      .eq("id", purchaseId);

    if (purchaseError) {
      throw new Error(
        `Failed to unlink purchase: ${purchaseError.message}`
      );
    }
  }
};

// ============================================================
// CREATE PURCHASE
// ============================================================

const createPurchase = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const {
    productName,
    brand,
    model,
    category,
    storeName,
    storeEmail,
    purchaseDate,
    price,
    tax,
    currency,
    serialNumber,
    warrantyMonths,
    notes,
    receiptUrl,
    receiptPublicId,
    productImageUrl,
    productImagePublicId,
    householdId,
    assetId,
    registerAsAsset = false,
    asset: assetInput = {},
  } = req.body;

  try {
    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (!productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!storeName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Store name is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    const parsedPrice = parseNumber(price, null);

    if (
      parsedPrice === null ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid non-negative price is required",
      });
    }

    if (storeEmail && !isValidEmail(storeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store email address",
      });
    }

    const parsedTax = parseNumber(tax, 0);

    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      return res.status(400).json({
        success: false,
        message: "Tax must be a valid non-negative number",
      });
    }

    const parsedWarrantyMonths = parseNumber(warrantyMonths, 0);

    if (
      !Number.isFinite(parsedWarrantyMonths) ||
      parsedWarrantyMonths < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Warranty months must be a valid non-negative number",
      });
    }

    // ---------------------------------------------------------
    // Asset creation/linking contract validation
    //
    // assetId = link an existing asset
    // registerAsAsset = explicitly create a new asset
    // neither = purchase only
    // ---------------------------------------------------------

    if (assetId && registerAsAsset === true) {
      return res.status(400).json({
        success: false,
        message:
          "assetId and registerAsAsset cannot be used together. Choose an existing asset or register a new asset.",
      });
    }

    // ---------------------------------------------------------
    // Household validation
    // ---------------------------------------------------------

    if (householdId) {
      const householdCheck = await verifyHouseholdMembership(
        userId,
        householdId
      );

      if (!householdCheck.valid) {
        return res.status(householdCheck.status || 403).json({
          success: false,
          message:
            householdCheck.message ||
            "You are not authorized to use this household",
        });
      }
    }

    // ---------------------------------------------------------
    // Existing asset validation
    //
    // Only runs when assetId was explicitly supplied.
    // ---------------------------------------------------------

    let selectedAsset = null;
    let resolvedHouseholdId = householdId || null;

    if (assetId) {
      const assetValidation = await validateAssetForPurchase(
        assetId,
        userId,
        householdId
      );

      if (!assetValidation.valid) {
        return res.status(assetValidation.status || 400).json({
          success: false,
          message:
            assetValidation.message ||
            "The selected asset cannot be linked to this purchase",
        });
      }

      selectedAsset = assetValidation.asset;

      // If the caller did not explicitly provide a household,
      // preserve the existing asset's household.
      if (!resolvedHouseholdId && selectedAsset?.household_id) {
        resolvedHouseholdId = selectedAsset.household_id;

        const householdCheck = await verifyHouseholdMembership(
          userId,
          resolvedHouseholdId
        );

        if (!householdCheck.valid) {
          return res.status(householdCheck.status || 403).json({
            success: false,
            message:
              householdCheck.message ||
              "You are not authorized to use this household",
          });
        }
      }
    }

    // ---------------------------------------------------------
    // Prepare purchase data
    // ---------------------------------------------------------

    const purchaseData = {
      user_id: userId,
      product_name: productName.trim(),
      brand: brand?.trim() || null,
      model: model?.trim() || null,
      category: category?.trim() || null,
      store_name: storeName.trim(),
      store_email: storeEmail?.trim() || null,
      purchase_date: purchaseDate,
      price: parsedPrice,
      tax: parsedTax,
      currency: currency?.trim() || "NGN",
      serial_number: serialNumber?.trim() || null,
      warranty_months: parsedWarrantyMonths || null,
      notes: notes?.trim() || null,
      receipt_url: receiptUrl || null,
      receipt_public_id: receiptPublicId || null,
      product_image_url: productImageUrl || null,
      product_image_public_id: productImagePublicId || null,
      household_id: resolvedHouseholdId,
      asset_id: assetId || null,
    };

    // ---------------------------------------------------------
    // Insert purchase
    // ---------------------------------------------------------

    const { data, error } = await supabase
      .from("pop_purchases")
      .insert(purchaseData)
      .select()
      .single();

    if (error) {
      console.error("Error creating purchase:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create purchase",
        error: error.message,
      });
    }

    // ---------------------------------------------------------
    // Create warranty
    // ---------------------------------------------------------

    if (parsedWarrantyMonths > 0) {
      try {
        const warrantyEnd = calculateWarrantyEnd(
          purchaseDate,
          parsedWarrantyMonths
        );

        if (warrantyEnd) {
          const { error: warrantyError } = await supabase
            .from("pop_warranties")
            .insert({
              purchase_id: data.id,
              warranty_start: purchaseDate,
              warranty_end: warrantyEnd,
              warranty_months: parsedWarrantyMonths,
            });

          if (warrantyError) {
            console.error(
              "Error creating purchase warranty:",
              warrantyError
            );
          }
        }
      } catch (warrantyError) {
        console.error(
          "Error calculating/creating warranty:",
          warrantyError
        );
      }
    }

    // ---------------------------------------------------------
    // Asset relationship
    //
    // 1. Existing asset -> link it
    // 2. registerAsAsset -> explicitly create new asset
    // 3. Otherwise -> purchase remains purchase-only
    // ---------------------------------------------------------

    let asset = selectedAsset;
    let newlyCreatedAsset = null;

    try {
      if (assetId) {
        // Existing asset.
        // The purchase was inserted with asset_id already set,
        // so now complete the reverse relationship.
        const { error: assetUpdateError } = await supabase
          .from("pop_assets")
          .update({
            purchase_id: data.id,
          })
          .eq("id", assetId)
          .eq("user_id", userId);

        if (assetUpdateError) {
          throw assetUpdateError;
        }

        asset = {
          ...selectedAsset,
          purchase_id: data.id,
        };
      } else if (registerAsAsset === true) {
        // Explicitly create a NEW asset.
        //
        // A household is optional. household_id === null means
        // the asset remains private to the owner.
        const newAssetPayload = {
          household_id: resolvedHouseholdId || null,
          user_id: userId,
          purchase_id: data.id,

          // Asset-specific fields.
          // Purchase fields are not duplicated unnecessarily.
          name:
            assetInput?.name?.trim() ||
            data.product_name,

          asset_type:
            assetInput?.assetType?.trim() ||
            data.category ||
            null,

          location:
            assetInput?.location?.trim() ||
            null,

          condition:
            assetInput?.condition ||
            "good",

          status:
            assetInput?.status ||
            "active",

          notes:
            assetInput?.notes?.trim() ||
            null,
        };

        const { data: createdAsset, error: assetCreateError } =
          await supabase
            .from("pop_assets")
            .insert(newAssetPayload)
            .select()
            .single();

        if (assetCreateError) {
          throw assetCreateError;
        }

        newlyCreatedAsset = createdAsset;
        asset = createdAsset;

        // Complete the purchase -> asset relationship.
        const { error: purchaseAssetError } = await supabase
          .from("pop_purchases")
          .update({
            asset_id: createdAsset.id,
          })
          .eq("id", data.id)
          .eq("user_id", userId);

        if (purchaseAssetError) {
          throw purchaseAssetError;
        }

        data.asset_id = createdAsset.id;
      } else {
        // Purchase-only.
        //
        // IMPORTANT:
        // householdId does NOT automatically create an asset.
        asset = null;
      }
    } catch (assetError) {
      console.error(
        "Error creating/linking purchase asset:",
        assetError
      );

      // Remove the newly-created asset if relationship setup failed.
      if (newlyCreatedAsset?.id) {
        const { error: assetCleanupError } = await supabase
          .from("pop_assets")
          .delete()
          .eq("id", newlyCreatedAsset.id)
          .eq("user_id", userId);

        if (assetCleanupError) {
          console.error(
            "Error cleaning up newly created asset:",
            assetCleanupError
          );
        }
      }

      // Remove the purchase because creation of the requested
      // Purchase + Asset relationship failed.
      const { error: purchaseCleanupError } = await supabase
        .from("pop_purchases")
        .delete()
        .eq("id", data.id)
        .eq("user_id", userId);

      if (purchaseCleanupError) {
        console.error(
          "Error cleaning up purchase after asset failure:",
          purchaseCleanupError
        );
      }

      return res.status(500).json({
        success: false,
        message: "Purchase created, but asset relationship failed",
        error: assetError.message,
      });
    }

    // Keep the response data consistent with the final relationship.
    data.asset_id = asset?.id || null;

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    try {
      await createNotification({
        userId,
        type: "purchase_created",
        title: "Purchase added",
        message: `${data.product_name} was added to your purchases.`,
        data: {
          purchaseId: data.id,
          assetId: data.asset_id,
        },
      });
    } catch (notificationError) {
      console.error(
        "Error creating purchase notification:",
        notificationError
      );
    }

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: registerAsAsset
        ? "Purchase and asset created successfully"
        : assetId
          ? "Purchase created and linked to asset successfully"
          : "Purchase created successfully",
      data: {
        ...data,
        asset,
      },
    });
  } catch (error) {
    console.error("Unexpected error creating purchase:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase",
      error: error.message,
    });
  }
};




// ============================================================
// CREATE PURCHASE - BACKEND UPLOAD METHOD
// ============================================================

const createPurchaseWithBackendUpload = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const {
    productName,
    brand,
    model,
    category,
    storeName,
    storeEmail,
    purchaseDate,
    price,
    tax,
    currency,
    serialNumber,
    warrantyMonths,
    notes,
    receiptUrl,
    receiptPublicId,
    productImageUrl,
    productImagePublicId,
    householdId,
    assetId,
    registerAsAsset = false,
    asset: assetInput = {},
  } = req.body;

  let uploadedReceipt = null;
  let uploadedProductImage = null;

  try {
    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (!productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!storeName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Store name is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    const parsedPrice = parseNumber(price, null);

    if (
      parsedPrice === null ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid non-negative price is required",
      });
    }

    if (storeEmail && !isValidEmail(storeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store email address",
      });
    }

    const parsedTax = parseNumber(tax, 0);

    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      return res.status(400).json({
        success: false,
        message: "Tax must be a valid non-negative number",
      });
    }

    const parsedWarrantyMonths = parseNumber(warrantyMonths, 0);

    if (
      !Number.isFinite(parsedWarrantyMonths) ||
      parsedWarrantyMonths < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Warranty months must be a valid non-negative number",
      });
    }

    // ---------------------------------------------------------
    // Asset creation/linking contract
    //
    // assetId = link existing asset
    // registerAsAsset = explicitly create new asset
    // neither = purchase only
    // ---------------------------------------------------------

    if (assetId && registerAsAsset === true) {
      return res.status(400).json({
        success: false,
        message:
          "assetId and registerAsAsset cannot be used together. Choose an existing asset or register a new asset.",
      });
    }

    // ---------------------------------------------------------
    // Household validation
    // ---------------------------------------------------------

    if (householdId) {
      const householdCheck = await verifyHouseholdMembership(
        userId,
        householdId
      );

      if (!householdCheck.valid) {
        return res.status(householdCheck.status || 403).json({
          success: false,
          message:
            householdCheck.message ||
            "You are not authorized to use this household",
        });
      }
    }

    // ---------------------------------------------------------
    // Existing asset validation
    // ---------------------------------------------------------

    let selectedAsset = null;
    let resolvedHouseholdId = householdId || null;

    if (assetId) {
      const assetValidation = await validateAssetForPurchase(
        assetId,
        userId,
        householdId
      );

      if (!assetValidation.valid) {
        return res.status(assetValidation.status || 400).json({
          success: false,
          message:
            assetValidation.message ||
            "The selected asset cannot be linked to this purchase",
        });
      }

      selectedAsset = assetValidation.asset;

      // If no household was supplied, preserve the existing
      // asset's household.
      if (!resolvedHouseholdId && selectedAsset?.household_id) {
        resolvedHouseholdId = selectedAsset.household_id;

        const householdCheck = await verifyHouseholdMembership(
          userId,
          resolvedHouseholdId
        );

        if (!householdCheck.valid) {
          return res.status(householdCheck.status || 403).json({
            success: false,
            message:
              householdCheck.message ||
              "You are not authorized to use this household",
          });
        }
      }
    }

    // ---------------------------------------------------------
    // Upload files
    // ---------------------------------------------------------

    try {
      const uploadResult = await uploadFilesFromRequest(req);

      uploadedReceipt = uploadResult?.receipt || null;
      uploadedProductImage = uploadResult?.productImage || null;
    } catch (uploadError) {
      console.error("Error uploading purchase files:", uploadError);

      // Clean up anything that was successfully uploaded before
      // another upload failed.
      const uploadedUrls = [
        uploadedReceipt?.secure_url ||
          uploadedReceipt?.url ||
          uploadedReceipt?.secureUrl,
        uploadedProductImage?.secure_url ||
          uploadedProductImage?.url ||
          uploadedProductImage?.secureUrl,
      ].filter(Boolean);

      if (uploadedUrls.length > 0) {
        try {
          await cleanupUploadedImages(uploadedUrls);
        } catch (cleanupError) {
          console.error(
            "Error cleaning up failed purchase uploads:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload purchase files",
        error: uploadError.message,
      });
    }

    // ---------------------------------------------------------
    // Resolve uploaded file values
    // ---------------------------------------------------------

    const finalReceiptUrl =
      uploadedReceipt?.secure_url ||
      uploadedReceipt?.url ||
      uploadedReceipt?.secureUrl ||
      receiptUrl ||
      null;

    const finalReceiptPublicId =
      uploadedReceipt?.public_id ||
      uploadedReceipt?.publicId ||
      receiptPublicId ||
      null;

    const finalProductImageUrl =
      uploadedProductImage?.secure_url ||
      uploadedProductImage?.url ||
      uploadedProductImage?.secureUrl ||
      productImageUrl ||
      null;

    const finalProductImagePublicId =
      uploadedProductImage?.public_id ||
      uploadedProductImage?.publicId ||
      productImagePublicId ||
      null;

    // ---------------------------------------------------------
    // Prepare purchase data
    // ---------------------------------------------------------

    const purchaseData = {
      user_id: userId,
      product_name: productName.trim(),
      brand: brand?.trim() || null,
      model: model?.trim() || null,
      category: category?.trim() || null,
      store_name: storeName.trim(),
      store_email: storeEmail?.trim() || null,
      purchase_date: purchaseDate,
      price: parsedPrice,
      tax: parsedTax,
      currency: currency?.trim() || "NGN",
      serial_number: serialNumber?.trim() || null,
      warranty_months: parsedWarrantyMonths || null,
      notes: notes?.trim() || null,
      receipt_url: finalReceiptUrl,
      receipt_public_id: finalReceiptPublicId,
      product_image_url: finalProductImageUrl,
      product_image_public_id: finalProductImagePublicId,
      household_id: resolvedHouseholdId,
      asset_id: assetId || null,
    };

    // ---------------------------------------------------------
    // Insert purchase
    // ---------------------------------------------------------

    const { data, error } = await supabase
      .from("pop_purchases")
      .insert(purchaseData)
      .select()
      .single();

    if (error) {
      console.error("Error creating purchase:", error);

      // Purchase failed, so uploaded Cloudinary files are now
      // orphaned unless explicitly cleaned up.
      const uploadedUrls = [
        finalReceiptUrl,
        finalProductImageUrl,
      ].filter(Boolean);

      if (uploadedUrls.length > 0) {
        try {
          await cleanupUploadedImages(uploadedUrls);
        } catch (cleanupError) {
          console.error(
            "Error cleaning up uploaded purchase images:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create purchase",
        error: error.message,
      });
    }

    // ---------------------------------------------------------
    // Create warranty
    // ---------------------------------------------------------

    if (parsedWarrantyMonths > 0) {
      try {
        const warrantyEnd = calculateWarrantyEnd(
          purchaseDate,
          parsedWarrantyMonths
        );

        if (warrantyEnd) {
          const { error: warrantyError } = await supabase
            .from("pop_warranties")
            .insert({
              purchase_id: data.id,
              warranty_start: purchaseDate,
              warranty_end: warrantyEnd,
              warranty_months: parsedWarrantyMonths,
            });

          if (warrantyError) {
            console.error(
              "Error creating purchase warranty:",
              warrantyError
            );
          }
        }
      } catch (warrantyError) {
        console.error(
          "Error calculating/creating warranty:",
          warrantyError
        );
      }
    }

    // ---------------------------------------------------------
    // Asset relationship
    //
    // 1. Existing asset -> link it
    // 2. registerAsAsset -> explicitly create new asset
    // 3. Otherwise -> purchase only
    // ---------------------------------------------------------

    let asset = selectedAsset;
    let newlyCreatedAsset = null;

    try {
      if (assetId) {
        // Existing asset.
        //
        // The purchase was inserted with asset_id already set,
        // so complete the reverse relationship.
        const { error: assetUpdateError } = await supabase
          .from("pop_assets")
          .update({
            purchase_id: data.id,
          })
          .eq("id", assetId)
          .eq("user_id", userId);

        if (assetUpdateError) {
          throw assetUpdateError;
        }

        asset = {
          ...selectedAsset,
          purchase_id: data.id,
        };
      } else if (registerAsAsset === true) {
        // Explicitly create a NEW asset.
        //
        // household_id may be null. That means the asset is
        // private to the owner.
        const newAssetPayload = {
          household_id: resolvedHouseholdId || null,
          user_id: userId,
          purchase_id: data.id,

          // Asset-specific fields only.
          name:
            assetInput?.name?.trim() ||
            data.product_name,

          asset_type:
            assetInput?.assetType?.trim() ||
            data.category ||
            null,

          location:
            assetInput?.location?.trim() ||
            null,

          condition:
            assetInput?.condition ||
            "good",

          status:
            assetInput?.status ||
            "active",

          notes:
            assetInput?.notes?.trim() ||
            null,
        };

        const {
          data: createdAsset,
          error: assetCreateError,
        } = await supabase
          .from("pop_assets")
          .insert(newAssetPayload)
          .select()
          .single();

        if (assetCreateError) {
          throw assetCreateError;
        }

        newlyCreatedAsset = createdAsset;
        asset = createdAsset;

        // Complete purchase -> asset relationship.
        const { error: purchaseAssetError } = await supabase
          .from("pop_purchases")
          .update({
            asset_id: createdAsset.id,
          })
          .eq("id", data.id)
          .eq("user_id", userId);

        if (purchaseAssetError) {
          throw purchaseAssetError;
        }

        data.asset_id = createdAsset.id;
      } else {
        // Purchase-only.
        //
        // IMPORTANT:
        // Having a household does NOT automatically create
        // an asset.
        asset = null;
      }
    } catch (assetError) {
      console.error(
        "Error creating/linking purchase asset:",
        assetError
      );

      // Remove newly-created asset if relationship setup failed.
      if (newlyCreatedAsset?.id) {
        const { error: assetCleanupError } = await supabase
          .from("pop_assets")
          .delete()
          .eq("id", newlyCreatedAsset.id)
          .eq("user_id", userId);

        if (assetCleanupError) {
          console.error(
            "Error cleaning up newly created asset:",
            assetCleanupError
          );
        }
      }

      // Remove the purchase because the requested asset
      // relationship could not be completed.
      const { error: purchaseCleanupError } = await supabase
        .from("pop_purchases")
        .delete()
        .eq("id", data.id)
        .eq("user_id", userId);

      if (purchaseCleanupError) {
        console.error(
          "Error cleaning up purchase after asset failure:",
          purchaseCleanupError
        );
      }

      // Clean up Cloudinary uploads because the purchase itself
      // is being rolled back.
      const uploadedUrls = [
        finalReceiptUrl,
        finalProductImageUrl,
      ].filter(Boolean);

      if (uploadedUrls.length > 0) {
        try {
          await cleanupUploadedImages(uploadedUrls);
        } catch (cleanupError) {
          console.error(
            "Error cleaning up purchase uploads after asset failure:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "Purchase created, but asset relationship failed",
        error: assetError.message,
      });
    }

    // Keep response consistent with final relationship.
    data.asset_id = asset?.id || null;

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    try {
      await createNotification({
        userId,
        type: "purchase_created",
        title: "Purchase added",
        message: `${data.product_name} was added to your purchases.`,
        data: {
          purchaseId: data.id,
          assetId: data.asset_id,
        },
      });
    } catch (notificationError) {
      console.error(
        "Error creating purchase notification:",
        notificationError
      );
    }

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: registerAsAsset
        ? "Purchase and asset created successfully"
        : assetId
          ? "Purchase created and linked to asset successfully"
          : "Purchase created successfully",
      data: {
        ...data,
        asset,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected error creating purchase with backend upload:",
      error
    );

    // If an unexpected error occurs before the purchase is
    // successfully persisted, clean up any uploaded files.
    const uploadedUrls = [
      uploadedReceipt?.secure_url ||
        uploadedReceipt?.url ||
        uploadedReceipt?.secureUrl,
      uploadedProductImage?.secure_url ||
        uploadedProductImage?.url ||
        uploadedProductImage?.secureUrl,
    ].filter(Boolean);

    if (uploadedUrls.length > 0) {
      try {
        await cleanupUploadedImages(uploadedUrls);
      } catch (cleanupError) {
        console.error(
          "Error cleaning up uploaded files:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase",
      error: error.message,
    });
  }
};




// ============================================================
// CREATE PURCHASE - UNIFIED
// ============================================================

const createPurchaseUnified = async (req, res) => {
  if (isFrontendDirectUpload(req.body)) {
    return createPurchase(req, res);
  }

  if (hasFilesToUpload(req)) {
    return createPurchaseWithBackendUpload(
      req,
      res
    );
  }

  return createPurchase(req, res);
};

// ============================================================
// GET ALL PURCHASES
// ============================================================

const getPurchases = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      search,
      category,
      status = "active",
      page = 1,
      limit = 20,
      householdId,
    } = req.query;

    let query = supabase
      .from("pop_purchases")
      .select(
        `
        *,
        pop_warranties(*),
        pop_claims(*),
        pop_households!pop_purchases_household_id_fkey(*),
        pop_assets!pop_purchases_asset_id_fkey(*)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (householdId) {
      const membership =
        await verifyHouseholdMembership(
          userId,
          householdId
        );

      if (!membership.valid) {
        return res.status(403).json({
          success: false,
          message: membership.error,
        });
      }

      query = query.eq(
        "household_id",
        householdId
      );
    }

    if (search?.trim()) {
      const term = search
        .trim()
        .replace(/[%_,]/g, "");

      if (term) {
        query = query.or(
          `product_name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,store_name.ilike.%${term}%`
        );
      }
    }

    const pageNumber = Math.max(
      1,
      parseNumber(page, 1)
    );

    const pageSize = Math.min(
      100,
      Math.max(1, parseNumber(limit, 20))
    );

    const from =
      (pageNumber - 1) * pageSize;

    const to =
      from + pageSize - 1;

    query = query
      .range(from, to)
      .order("created_at", {
        ascending: false,
      });

    const {
      data,
      error,
      count,
    } = await query;

    if (error) throw error;

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  } catch (error) {
    console.error("getPurchases:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchases.",
    });
  }
};

// ============================================================
// GET SINGLE PURCHASE
// ============================================================

const getPurchase = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Purchase ID is required.",
      });
    }

    const { data, error } = await supabase
      .from("pop_purchases")
      .select(
        `
        *,
        pop_warranties(*),
        pop_claims(*),
        pop_households!pop_purchases_household_id_fkey(*),
        pop_assets!pop_purchases_asset_id_fkey(*)
      `
      )
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getPurchase:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase.",
    });
  }
};

// ============================================================
// UPDATE PURCHASE
// ============================================================

const updatePurchase = async (req, res) => {
  const userId = getUserId(req);
  const { id: purchaseId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!purchaseId) {
    return res.status(400).json({
      success: false,
      message: "Purchase ID is required",
    });
  }

  let oldReceiptUrl = null;
  let oldProductImageUrl = null;

  try {
    const existing = await getOwnedPurchase(purchaseId, userId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    oldReceiptUrl = existing.receipt_url || null;
    oldProductImageUrl = existing.product_image_url || null;

    const {
      productName,
      brand,
      model,
      category,
      storeName,
      storeEmail,
      purchaseDate,
      price,
      tax,
      currency,
      serialNumber,
      warrantyMonths,
      notes,
      receiptUrl,
      receiptPublicId,
      productImageUrl,
      productImagePublicId,
      householdId,
      assetId,
    } = req.body;

    // ---------------------------------------------------------
    // Validate supplied fields
    // ---------------------------------------------------------

    if (productName !== undefined && !productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty",
      });
    }

    if (storeName !== undefined && !storeName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Store name cannot be empty",
      });
    }

    if (storeEmail !== undefined && storeEmail && !isValidEmail(storeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store email address",
      });
    }

    let parsedPrice;

    if (price !== undefined) {
      parsedPrice = parseNumber(price, null);

      if (
        parsedPrice === null ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
      }
    }

    let parsedTax;

    if (tax !== undefined) {
      parsedTax = parseNumber(tax, null);

      if (
        parsedTax === null ||
        !Number.isFinite(parsedTax) ||
        parsedTax < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Tax must be a valid non-negative number",
        });
      }
    }

    let parsedWarrantyMonths;

    if (warrantyMonths !== undefined) {
      parsedWarrantyMonths = parseNumber(warrantyMonths, null);

      if (
        parsedWarrantyMonths === null ||
        !Number.isFinite(parsedWarrantyMonths) ||
        parsedWarrantyMonths < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Warranty months must be a valid non-negative number",
        });
      }
    }

    // ---------------------------------------------------------
    // Household relationship
    //
    // IMPORTANT:
    // Changing/adding a household does NOT create an asset.
    // ---------------------------------------------------------

    const householdChanged =
      householdId !== undefined &&
      householdId !== existing.household_id;

    let targetHouseholdId =
      householdId !== undefined
        ? householdId || null
        : existing.household_id || null;

    // ---------------------------------------------------------
    // Validate target household
    // ---------------------------------------------------------

    if (targetHouseholdId) {
      const householdCheck = await verifyHouseholdMembership(
        userId,
        targetHouseholdId
      );

      if (!householdCheck.valid) {
        return res.status(householdCheck.status || 403).json({
          success: false,
          message:
            householdCheck.message ||
            "You are not authorized to use this household",
        });
      }
    }

    // ---------------------------------------------------------
    // Determine target asset
    // ---------------------------------------------------------

    let targetAssetId =
      assetId !== undefined
        ? assetId || null
        : existing.asset_id || null;

    let targetAsset = null;

    if (targetAssetId) {
      const assetValidation = await validateAssetForPurchase(
        targetAssetId,
        userId,
        targetHouseholdId,
        purchaseId
      );

      if (!assetValidation.valid) {
        return res.status(assetValidation.status || 400).json({
          success: false,
          message:
            assetValidation.message ||
            "The selected asset cannot be linked to this purchase",
        });
      }

      targetAsset = assetValidation.asset;

      // If the caller did not provide a household explicitly,
      // preserve the asset's household.
      if (
        householdId === undefined &&
        targetAsset?.household_id !== undefined
      ) {
        targetHouseholdId =
          targetAsset.household_id || null;
      }
    }

    // ---------------------------------------------------------
    // Existing asset with household change
    //
    // The asset and purchase must remain in the same household
    // when both are household-scoped.
    // ---------------------------------------------------------

    if (
      targetAssetId &&
      targetAsset &&
      householdChanged
    ) {
      if (
        targetHouseholdId &&
        targetAsset.household_id &&
        targetAsset.household_id !== targetHouseholdId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The linked asset and purchase must belong to the same household",
        });
      }

      // Moving an existing asset to a new household is allowed
      // only when the caller owns the asset and belongs to the
      // target household.
      if (
        targetHouseholdId !== targetAsset.household_id
      ) {
        const { error: assetHouseholdError } = await supabase
          .from("pop_assets")
          .update({
            household_id: targetHouseholdId,
          })
          .eq("id", targetAssetId)
          .eq("user_id", userId);

        if (assetHouseholdError) {
          return res.status(500).json({
            success: false,
            message: "Failed to update linked asset household",
            error: assetHouseholdError.message,
          });
        }

        targetAsset = {
          ...targetAsset,
          household_id: targetHouseholdId,
        };
      }
    }

    // ---------------------------------------------------------
    // Build purchase update
    // ---------------------------------------------------------

    const purchaseUpdates = {};

    if (productName !== undefined) {
      purchaseUpdates.product_name = productName.trim();
    }

    if (brand !== undefined) {
      purchaseUpdates.brand = brand?.trim() || null;
    }

    if (model !== undefined) {
      purchaseUpdates.model = model?.trim() || null;
    }

    if (category !== undefined) {
      purchaseUpdates.category = category?.trim() || null;
    }

    if (storeName !== undefined) {
      purchaseUpdates.store_name = storeName.trim();
    }

    if (storeEmail !== undefined) {
      purchaseUpdates.store_email = storeEmail?.trim() || null;
    }

    if (purchaseDate !== undefined) {
      purchaseUpdates.purchase_date = purchaseDate;
    }

    if (price !== undefined) {
      purchaseUpdates.price = parsedPrice;
    }

    if (tax !== undefined) {
      purchaseUpdates.tax = parsedTax;
    }

    if (currency !== undefined) {
      purchaseUpdates.currency =
        currency?.trim() || "NGN";
    }

    if (serialNumber !== undefined) {
      purchaseUpdates.serial_number =
        serialNumber?.trim() || null;
    }

    if (warrantyMonths !== undefined) {
      purchaseUpdates.warranty_months =
        parsedWarrantyMonths || null;
    }

    if (notes !== undefined) {
      purchaseUpdates.notes =
        notes?.trim() || null;
    }

    if (receiptUrl !== undefined) {
      purchaseUpdates.receipt_url =
        receiptUrl || null;
    }

    if (receiptPublicId !== undefined) {
      purchaseUpdates.receipt_public_id =
        receiptPublicId || null;
    }

    if (productImageUrl !== undefined) {
      purchaseUpdates.product_image_url =
        productImageUrl || null;
    }

    if (productImagePublicId !== undefined) {
      purchaseUpdates.product_image_public_id =
        productImagePublicId || null;
    }

    if (householdId !== undefined) {
      purchaseUpdates.household_id = targetHouseholdId;
    }

    if (assetId !== undefined) {
      purchaseUpdates.asset_id = targetAssetId;
    }

    // ---------------------------------------------------------
    // Update purchase
    // ---------------------------------------------------------

    let updatedPurchase = existing;

    if (Object.keys(purchaseUpdates).length > 0) {
      const { data, error } = await supabase
        .from("pop_purchases")
        .update(purchaseUpdates)
        .eq("id", purchaseId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating purchase:", error);

        // If the asset was moved before the purchase update and
        // the purchase update failed, restore the old household.
        if (
          targetAssetId &&
          targetAsset &&
          householdChanged &&
          targetAsset.household_id !== existing.household_id
        ) {
          await supabase
            .from("pop_assets")
            .update({
              household_id: existing.household_id || null,
            })
            .eq("id", targetAssetId)
            .eq("user_id", userId);
        }

        return res.status(500).json({
          success: false,
          message: "Failed to update purchase",
          error: error.message,
        });
      }

      updatedPurchase = data;
    }

    // ---------------------------------------------------------
    // Synchronize asset relationship
    // ---------------------------------------------------------

    if (assetId !== undefined) {
      // Asset relationship explicitly changed.

      // If the old asset is different from the new asset,
      // unlink the old one.
      if (
        existing.asset_id &&
        existing.asset_id !== targetAssetId
      ) {
        const { error: oldAssetError } = await supabase
          .from("pop_assets")
          .update({
            purchase_id: null,
          })
          .eq("id", existing.asset_id)
          .eq("user_id", userId);

        if (oldAssetError) {
          console.error(
            "Error unlinking previous purchase asset:",
            oldAssetError
          );
        }
      }

      // Link the new asset.
      if (targetAssetId) {
        const { error: newAssetError } = await supabase
          .from("pop_assets")
          .update({
            purchase_id: purchaseId,
          })
          .eq("id", targetAssetId)
          .eq("user_id", userId);

        if (newAssetError) {
          console.error(
            "Error linking updated purchase asset:",
            newAssetError
          );

          // Restore purchase's previous asset relationship.
          await supabase
            .from("pop_purchases")
            .update({
              asset_id: existing.asset_id || null,
              household_id: existing.household_id || null,
            })
            .eq("id", purchaseId)
            .eq("user_id", userId);

          // Restore old asset relationship if there was one.
          if (existing.asset_id) {
            await supabase
              .from("pop_assets")
              .update({
                purchase_id: purchaseId,
              })
              .eq("id", existing.asset_id)
              .eq("user_id", userId);
          }

          // Restore moved target asset household if necessary.
          if (
            targetAssetId &&
            targetAsset &&
            targetAsset.household_id !==
              existing.household_id
          ) {
            await supabase
              .from("pop_assets")
              .update({
                household_id:
                  targetAsset.household_id ||
                  null,
              })
              .eq("id", targetAssetId)
              .eq("user_id", userId);
          }

          return res.status(500).json({
            success: false,
            message:
              "Purchase updated, but asset relationship could not be completed",
            error: newAssetError.message,
          });
        }
      }
    } else if (
      householdId !== undefined &&
      targetAssetId
    ) {
      // Household changed while retaining the same linked asset.
      //
      // The asset household has already been synchronized above.
    }

    // ---------------------------------------------------------
    // Warranty
    // ---------------------------------------------------------

    if (
      warrantyMonths !== undefined ||
      purchaseDate !== undefined
    ) {
      const effectiveWarrantyMonths =
        warrantyMonths !== undefined
          ? parsedWarrantyMonths
          : Number(existing.warranty_months || 0);

      const effectivePurchaseDate =
        purchaseDate !== undefined
          ? purchaseDate
          : existing.purchase_date;

      if (effectiveWarrantyMonths > 0) {
        try {
          const warrantyEnd = calculateWarrantyEnd(
            effectivePurchaseDate,
            effectiveWarrantyMonths
          );

          if (warrantyEnd) {
            const { data: existingWarranty } =
              await supabase
                .from("pop_warranties")
                .select("id")
                .eq("purchase_id", purchaseId)
                .maybeSingle();

            if (existingWarranty?.id) {
              const { error: warrantyUpdateError } =
                await supabase
                  .from("pop_warranties")
                  .update({
                    warranty_start:
                      effectivePurchaseDate,
                    warranty_end: warrantyEnd,
                    warranty_months:
                      effectiveWarrantyMonths,
                  })
                  .eq("id", existingWarranty.id);

              if (warrantyUpdateError) {
                console.error(
                  "Error updating warranty:",
                  warrantyUpdateError
                );
              }
            } else {
              const { error: warrantyCreateError } =
                await supabase
                  .from("pop_warranties")
                  .insert({
                    purchase_id: purchaseId,
                    warranty_start:
                      effectivePurchaseDate,
                    warranty_end: warrantyEnd,
                    warranty_months:
                      effectiveWarrantyMonths,
                  });

              if (warrantyCreateError) {
                console.error(
                  "Error creating warranty:",
                  warrantyCreateError
                );
              }
            }
          }
        } catch (warrantyError) {
          console.error(
            "Error calculating warranty:",
            warrantyError
          );
        }
      } else {
        const { error: warrantyDeleteError } =
          await supabase
            .from("pop_warranties")
            .delete()
            .eq("purchase_id", purchaseId);

        if (warrantyDeleteError) {
          console.error(
            "Error removing warranty:",
            warrantyDeleteError
          );
        }
      }
    }

    // ---------------------------------------------------------
    // Clean up replaced Cloudinary images
    // ---------------------------------------------------------

    const imagesToDelete = [];

    if (
      receiptUrl !== undefined &&
      oldReceiptUrl &&
      receiptUrl !== oldReceiptUrl
    ) {
      imagesToDelete.push(oldReceiptUrl);
    }

    if (
      productImageUrl !== undefined &&
      oldProductImageUrl &&
      productImageUrl !== oldProductImageUrl
    ) {
      imagesToDelete.push(oldProductImageUrl);
    }

    if (imagesToDelete.length > 0) {
      try {
        await cleanupUploadedImages(imagesToDelete);
      } catch (cleanupError) {
        console.error(
          "Error cleaning up replaced purchase images:",
          cleanupError
        );
      }
    }

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    try {
      await createNotification({
        userId,
        type: "purchase_updated",
        title: "Purchase updated",
        message: `${updatedPurchase.product_name} was updated.`,
        data: {
          purchaseId: updatedPurchase.id,
          assetId: updatedPurchase.asset_id || null,
        },
      });
    } catch (notificationError) {
      console.error(
        "Error creating purchase update notification:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    console.error("Unexpected error updating purchase:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update purchase",
      error: error.message,
    });
  }
};






// ============================================================
// UPDATE PURCHASE - BACKEND UPLOAD METHOD
// ============================================================

const updatePurchaseWithBackendUpload = async (req, res) => {
  const userId = getUserId(req);
  const { id: purchaseId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!purchaseId) {
    return res.status(400).json({
      success: false,
      message: "Purchase ID is required",
    });
  }

  let uploadedReceipt = null;
  let uploadedProductImage = null;

  try {
    const existing = await getOwnedPurchase(purchaseId, userId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    const oldReceiptUrl = existing.receipt_url || null;
    const oldProductImageUrl =
      existing.product_image_url || null;

    const {
      productName,
      brand,
      model,
      category,
      storeName,
      storeEmail,
      purchaseDate,
      price,
      tax,
      currency,
      serialNumber,
      warrantyMonths,
      notes,
      receiptUrl,
      receiptPublicId,
      productImageUrl,
      productImagePublicId,
      householdId,
      assetId,
    } = req.body;

    // ---------------------------------------------------------
    // Validate supplied fields
    // ---------------------------------------------------------

    if (productName !== undefined && !productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty",
      });
    }

    if (storeName !== undefined && !storeName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Store name cannot be empty",
      });
    }

    if (
      storeEmail !== undefined &&
      storeEmail &&
      !isValidEmail(storeEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid store email address",
      });
    }

    let parsedPrice;

    if (price !== undefined) {
      parsedPrice = parseNumber(price, null);

      if (
        parsedPrice === null ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
      }
    }

    let parsedTax;

    if (tax !== undefined) {
      parsedTax = parseNumber(tax, null);

      if (
        parsedTax === null ||
        !Number.isFinite(parsedTax) ||
        parsedTax < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Tax must be a valid non-negative number",
        });
      }
    }

    let parsedWarrantyMonths;

    if (warrantyMonths !== undefined) {
      parsedWarrantyMonths = parseNumber(
        warrantyMonths,
        null
      );

      if (
        parsedWarrantyMonths === null ||
        !Number.isFinite(parsedWarrantyMonths) ||
        parsedWarrantyMonths < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Warranty months must be a valid non-negative number",
        });
      }
    }

    // ---------------------------------------------------------
    // Household relationship
    //
    // IMPORTANT:
    // A household does NOT automatically create an asset.
    // ---------------------------------------------------------

    const householdChanged =
      householdId !== undefined &&
      householdId !== existing.household_id;

    let targetHouseholdId =
      householdId !== undefined
        ? householdId || null
        : existing.household_id || null;

    // ---------------------------------------------------------
    // Validate target household
    // ---------------------------------------------------------

    if (targetHouseholdId) {
      const householdCheck = await verifyHouseholdMembership(
        userId,
        targetHouseholdId
      );

      if (!householdCheck.valid) {
        return res.status(householdCheck.status || 403).json({
          success: false,
          message:
            householdCheck.message ||
            "You are not authorized to use this household",
        });
      }
    }

    // ---------------------------------------------------------
    // Determine target asset
    // ---------------------------------------------------------

    let targetAssetId =
      assetId !== undefined
        ? assetId || null
        : existing.asset_id || null;

    let targetAsset = null;

    if (targetAssetId) {
      const assetValidation = await validateAssetForPurchase(
        targetAssetId,
        userId,
        targetHouseholdId,
        purchaseId
      );

      if (!assetValidation.valid) {
        return res.status(assetValidation.status || 400).json({
          success: false,
          message:
            assetValidation.message ||
            "The selected asset cannot be linked to this purchase",
        });
      }

      targetAsset = assetValidation.asset;

      // If household was not explicitly supplied, preserve
      // the linked asset's existing household.
      if (
        householdId === undefined &&
        targetAsset?.household_id !== undefined
      ) {
        targetHouseholdId =
          targetAsset.household_id || null;
      }
    }

    // ---------------------------------------------------------
    // Synchronize an existing linked asset when the household
    // changes.
    // ---------------------------------------------------------

    let assetHouseholdWasChanged = false;

    if (
      targetAssetId &&
      targetAsset &&
      householdChanged
    ) {
      if (
        targetHouseholdId &&
        targetAsset.household_id &&
        targetAsset.household_id !== targetHouseholdId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The linked asset and purchase must belong to the same household",
        });
      }

      if (
        targetHouseholdId !== targetAsset.household_id
      ) {
        const { error: assetHouseholdError } = await supabase
          .from("pop_assets")
          .update({
            household_id: targetHouseholdId,
          })
          .eq("id", targetAssetId)
          .eq("user_id", userId);

        if (assetHouseholdError) {
          return res.status(500).json({
            success: false,
            message:
              "Failed to update linked asset household",
            error: assetHouseholdError.message,
          });
        }

        assetHouseholdWasChanged = true;

        targetAsset = {
          ...targetAsset,
          household_id: targetHouseholdId,
        };
      }
    }

    // ---------------------------------------------------------
    // Upload replacement files
    // ---------------------------------------------------------

    try {
      const uploadResult = await uploadFilesFromRequest(req);

      uploadedReceipt = uploadResult?.receipt || null;
      uploadedProductImage =
        uploadResult?.productImage || null;
    } catch (uploadError) {
      console.error(
        "Error uploading updated purchase files:",
        uploadError
      );

      const uploadedUrls = [
        uploadedReceipt?.secure_url ||
          uploadedReceipt?.url ||
          uploadedReceipt?.secureUrl,
        uploadedProductImage?.secure_url ||
          uploadedProductImage?.url ||
          uploadedProductImage?.secureUrl,
      ].filter(Boolean);

      if (uploadedUrls.length > 0) {
        try {
          await cleanupUploadedImages(uploadedUrls);
        } catch (cleanupError) {
          console.error(
            "Error cleaning up failed update uploads:",
            cleanupError
          );
        }
      }

      // Restore asset household if it was already moved.
      if (assetHouseholdWasChanged && targetAssetId) {
        await supabase
          .from("pop_assets")
          .update({
            household_id:
              existing.household_id || null,
          })
          .eq("id", targetAssetId)
          .eq("user_id", userId);
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload purchase files",
        error: uploadError.message,
      });
    }

    // ---------------------------------------------------------
    // Resolve uploaded file values
    // ---------------------------------------------------------

    const finalReceiptUrl =
      uploadedReceipt?.secure_url ||
      uploadedReceipt?.url ||
      uploadedReceipt?.secureUrl ||
      (receiptUrl !== undefined
        ? receiptUrl || null
        : existing.receipt_url || null);

    const finalReceiptPublicId =
      uploadedReceipt?.public_id ||
      uploadedReceipt?.publicId ||
      (receiptPublicId !== undefined
        ? receiptPublicId || null
        : existing.receipt_public_id || null);

    const finalProductImageUrl =
      uploadedProductImage?.secure_url ||
      uploadedProductImage?.url ||
      uploadedProductImage?.secureUrl ||
      (productImageUrl !== undefined
        ? productImageUrl || null
        : existing.product_image_url || null);

    const finalProductImagePublicId =
      uploadedProductImage?.public_id ||
      uploadedProductImage?.publicId ||
      (productImagePublicId !== undefined
        ? productImagePublicId || null
        : existing.product_image_public_id || null);

    // ---------------------------------------------------------
    // Build purchase update
    // ---------------------------------------------------------

    const purchaseUpdates = {};

    if (productName !== undefined) {
      purchaseUpdates.product_name =
        productName.trim();
    }

    if (brand !== undefined) {
      purchaseUpdates.brand =
        brand?.trim() || null;
    }

    if (model !== undefined) {
      purchaseUpdates.model =
        model?.trim() || null;
    }

    if (category !== undefined) {
      purchaseUpdates.category =
        category?.trim() || null;
    }

    if (storeName !== undefined) {
      purchaseUpdates.store_name =
        storeName.trim();
    }

    if (storeEmail !== undefined) {
      purchaseUpdates.store_email =
        storeEmail?.trim() || null;
    }

    if (purchaseDate !== undefined) {
      purchaseUpdates.purchase_date =
        purchaseDate;
    }

    if (price !== undefined) {
      purchaseUpdates.price = parsedPrice;
    }

    if (tax !== undefined) {
      purchaseUpdates.tax = parsedTax;
    }

    if (currency !== undefined) {
      purchaseUpdates.currency =
        currency?.trim() || "NGN";
    }

    if (serialNumber !== undefined) {
      purchaseUpdates.serial_number =
        serialNumber?.trim() || null;
    }

    if (warrantyMonths !== undefined) {
      purchaseUpdates.warranty_months =
        parsedWarrantyMonths || null;
    }

    if (notes !== undefined) {
      purchaseUpdates.notes =
        notes?.trim() || null;
    }

    if (
      receiptUrl !== undefined ||
      uploadedReceipt
    ) {
      purchaseUpdates.receipt_url =
        finalReceiptUrl;
    }

    if (
      receiptPublicId !== undefined ||
      uploadedReceipt
    ) {
      purchaseUpdates.receipt_public_id =
        finalReceiptPublicId;
    }

    if (
      productImageUrl !== undefined ||
      uploadedProductImage
    ) {
      purchaseUpdates.product_image_url =
        finalProductImageUrl;
    }

    if (
      productImagePublicId !== undefined ||
      uploadedProductImage
    ) {
      purchaseUpdates.product_image_public_id =
        finalProductImagePublicId;
    }

    if (householdId !== undefined) {
      purchaseUpdates.household_id =
        targetHouseholdId;
    }

    if (assetId !== undefined) {
      purchaseUpdates.asset_id =
        targetAssetId;
    }

    // ---------------------------------------------------------
    // Update purchase
    // ---------------------------------------------------------

    let updatedPurchase = existing;

    if (Object.keys(purchaseUpdates).length > 0) {
      const { data, error } = await supabase
        .from("pop_purchases")
        .update(purchaseUpdates)
        .eq("id", purchaseId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error(
          "Error updating purchase:",
          error
        );

        // Restore moved asset household.
        if (
          assetHouseholdWasChanged &&
          targetAssetId
        ) {
          await supabase
            .from("pop_assets")
            .update({
              household_id:
                existing.household_id || null,
            })
            .eq("id", targetAssetId)
            .eq("user_id", userId);
        }

        // Clean up newly uploaded files.
        const uploadedUrls = [
          uploadedReceipt?.secure_url ||
            uploadedReceipt?.url ||
            uploadedReceipt?.secureUrl,
          uploadedProductImage?.secure_url ||
            uploadedProductImage?.url ||
            uploadedProductImage?.secureUrl,
        ].filter(Boolean);

        if (uploadedUrls.length > 0) {
          try {
            await cleanupUploadedImages(uploadedUrls);
          } catch (cleanupError) {
            console.error(
              "Error cleaning up failed update uploads:",
              cleanupError
            );
          }
        }

        return res.status(500).json({
          success: false,
          message: "Failed to update purchase",
          error: error.message,
        });
      }

      updatedPurchase = data;
    }

    // ---------------------------------------------------------
    // Synchronize asset relationship
    // ---------------------------------------------------------

    if (assetId !== undefined) {
      // Explicitly changing the asset relationship.

      // Unlink the previous asset if it is different.
      if (
        existing.asset_id &&
        existing.asset_id !== targetAssetId
      ) {
        const { error: oldAssetError } =
          await supabase
            .from("pop_assets")
            .update({
              purchase_id: null,
            })
            .eq("id", existing.asset_id)
            .eq("user_id", userId);

        if (oldAssetError) {
          console.error(
            "Error unlinking previous purchase asset:",
            oldAssetError
          );
        }
      }

      // Link the new asset.
      if (targetAssetId) {
        const { error: newAssetError } =
          await supabase
            .from("pop_assets")
            .update({
              purchase_id: purchaseId,
            })
            .eq("id", targetAssetId)
            .eq("user_id", userId);

        if (newAssetError) {
          console.error(
            "Error linking updated purchase asset:",
            newAssetError
          );

          // Restore purchase relationship.
          await supabase
            .from("pop_purchases")
            .update({
              asset_id:
                existing.asset_id || null,
              household_id:
                existing.household_id || null,
            })
            .eq("id", purchaseId)
            .eq("user_id", userId);

          // Restore old asset relationship.
          if (existing.asset_id) {
            await supabase
              .from("pop_assets")
              .update({
                purchase_id: purchaseId,
              })
              .eq("id", existing.asset_id)
              .eq("user_id", userId);
          }

          // Restore target asset household.
          if (
            assetHouseholdWasChanged &&
            targetAssetId
          ) {
            await supabase
              .from("pop_assets")
              .update({
                household_id:
                  existing.household_id || null,
              })
              .eq("id", targetAssetId)
              .eq("user_id", userId);
          }

          // Remove newly uploaded files.
          const uploadedUrls = [
            uploadedReceipt?.secure_url ||
              uploadedReceipt?.url ||
              uploadedReceipt?.secureUrl,
            uploadedProductImage?.secure_url ||
              uploadedProductImage?.url ||
              uploadedProductImage?.secureUrl,
          ].filter(Boolean);

          if (uploadedUrls.length > 0) {
            try {
              await cleanupUploadedImages(
                uploadedUrls
              );
            } catch (cleanupError) {
              console.error(
                "Error cleaning up uploaded files after asset failure:",
                cleanupError
              );
            }
          }

          return res.status(500).json({
            success: false,
            message:
              "Purchase updated, but asset relationship could not be completed",
            error: newAssetError.message,
          });
        }
      }
    }

    // ---------------------------------------------------------
    // Warranty
    // ---------------------------------------------------------

    if (
      warrantyMonths !== undefined ||
      purchaseDate !== undefined
    ) {
      const effectiveWarrantyMonths =
        warrantyMonths !== undefined
          ? parsedWarrantyMonths
          : Number(existing.warranty_months || 0);

      const effectivePurchaseDate =
        purchaseDate !== undefined
          ? purchaseDate
          : existing.purchase_date;

      if (effectiveWarrantyMonths > 0) {
        try {
          const warrantyEnd = calculateWarrantyEnd(
            effectivePurchaseDate,
            effectiveWarrantyMonths
          );

          if (warrantyEnd) {
            const { data: existingWarranty } =
              await supabase
                .from("pop_warranties")
                .select("id")
                .eq("purchase_id", purchaseId)
                .maybeSingle();

            if (existingWarranty?.id) {
              const { error: warrantyUpdateError } =
                await supabase
                  .from("pop_warranties")
                  .update({
                    warranty_start:
                      effectivePurchaseDate,
                    warranty_end: warrantyEnd,
                    warranty_months:
                      effectiveWarrantyMonths,
                  })
                  .eq(
                    "id",
                    existingWarranty.id
                  );

              if (warrantyUpdateError) {
                console.error(
                  "Error updating warranty:",
                  warrantyUpdateError
                );
              }
            } else {
              const { error: warrantyCreateError } =
                await supabase
                  .from("pop_warranties")
                  .insert({
                    purchase_id: purchaseId,
                    warranty_start:
                      effectivePurchaseDate,
                    warranty_end: warrantyEnd,
                    warranty_months:
                      effectiveWarrantyMonths,
                  });

              if (warrantyCreateError) {
                console.error(
                  "Error creating warranty:",
                  warrantyCreateError
                );
              }
            }
          }
        } catch (warrantyError) {
          console.error(
            "Error calculating warranty:",
            warrantyError
          );
        }
      } else {
        const { error: warrantyDeleteError } =
          await supabase
            .from("pop_warranties")
            .delete()
            .eq("purchase_id", purchaseId);

        if (warrantyDeleteError) {
          console.error(
            "Error removing warranty:",
            warrantyDeleteError
          );
        }
      }
    }

    // ---------------------------------------------------------
    // Clean up replaced Cloudinary files
    // ---------------------------------------------------------

    const imagesToDelete = [];

    if (
      (receiptUrl !== undefined ||
        uploadedReceipt) &&
      oldReceiptUrl &&
      finalReceiptUrl !== oldReceiptUrl
    ) {
      imagesToDelete.push(oldReceiptUrl);
    }

    if (
      (productImageUrl !== undefined ||
        uploadedProductImage) &&
      oldProductImageUrl &&
      finalProductImageUrl !== oldProductImageUrl
    ) {
      imagesToDelete.push(oldProductImageUrl);
    }

    if (imagesToDelete.length > 0) {
      try {
        await cleanupUploadedImages(
          imagesToDelete
        );
      } catch (cleanupError) {
        console.error(
          "Error cleaning up replaced purchase images:",
          cleanupError
        );
      }
    }

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    try {
      await createNotification({
        userId,
        type: "purchase_updated",
        title: "Purchase updated",
        message: `${updatedPurchase.product_name} was updated.`,
        data: {
          purchaseId: updatedPurchase.id,
          assetId:
            updatedPurchase.asset_id || null,
        },
      });
    } catch (notificationError) {
      console.error(
        "Error creating purchase update notification:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    console.error(
      "Unexpected error updating purchase with backend upload:",
      error
    );

    // Clean up files uploaded during the failed request.
    const uploadedUrls = [
      uploadedReceipt?.secure_url ||
        uploadedReceipt?.url ||
        uploadedReceipt?.secureUrl,
      uploadedProductImage?.secure_url ||
        uploadedProductImage?.url ||
        uploadedProductImage?.secureUrl,
    ].filter(Boolean);

    if (uploadedUrls.length > 0) {
      try {
        await cleanupUploadedImages(
          uploadedUrls
        );
      } catch (cleanupError) {
        console.error(
          "Error cleaning up uploaded files:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update purchase",
      error: error.message,
    });
  }
};





// ============================================================
// UPDATE PURCHASE - UNIFIED
// ============================================================

const updatePurchaseUnified = async (
  req,
  res
) => {
  if (isFrontendDirectUpload(req.body)) {
    return updatePurchase(req, res);
  }

  if (hasFilesToUpload(req)) {
    return updatePurchaseWithBackendUpload(
      req,
      res
    );
  }

  return updatePurchase(req, res);
};

// ============================================================
// DELETE PURCHASE
// ============================================================

const deletePurchase = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      data: purchase,
      error: findError,
    } = await getOwnedPurchase(
      id,
      userId
    );

    if (findError || !purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Delete purchase WITHOUT deleting asset.
    //
    // We explicitly unlink the asset first so the asset
    // survives independently as an asset/lifecycle record.
    // --------------------------------------------------------

    if (purchase.asset_id) {
      const { error: unlinkError } =
        await supabase
          .from("pop_assets")
          .update({
            purchase_id: null,
          })
          .eq("id", purchase.asset_id)
          .eq("user_id", userId)
          .eq("purchase_id", id);

      if (unlinkError) {
        throw unlinkError;
      }
    }

    const {
      error: deleteError,
    } = await supabase
      .from("pop_purchases")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      // Best-effort restore of relationship if purchase
      // deletion itself failed.
      if (purchase.asset_id) {
        await supabase
          .from("pop_assets")
          .update({
            purchase_id: id,
          })
          .eq("id", purchase.asset_id)
          .eq("user_id", userId);
      }

      throw deleteError;
    }

    // --------------------------------------------------------
    // Delete Cloudinary images
    // --------------------------------------------------------

    const imageUrls = [];

    if (purchase.receipt_url) {
      imageUrls.push(
        purchase.receipt_url
      );
    }

    if (purchase.product_image_url) {
      imageUrls.push(
        purchase.product_image_url
      );
    }

    if (imageUrls.length > 0) {
      await cleanupUploadedImages(
        imageUrls
      );
    }

    // --------------------------------------------------------
    // Notification
    // --------------------------------------------------------

    await createNotification(
      userId,
      "purchase_deleted",
      "Purchase deleted",
      `Your purchase "${purchase.product_name}" was permanently deleted.`
    );

    return res.json({
      success: true,
      message:
        "Purchase permanently deleted.",
    });
  } catch (error) {
    console.error(
      "deletePurchase:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete purchase.",
    });
  }
};

// ============================================================
// ARCHIVE PURCHASE
// ============================================================

const archivePurchase = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("pop_purchases")
      .update({
        status: "archived",
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Purchase not found.",
        });
      }

      throw error;
    }

    await createNotification(
      userId,
      "purchase_archived",
      "Purchase archived",
      `Your purchase "${data.product_name}" was archived.`
    );

    return res.json({
      success: true,
      message: "Purchase archived.",
      data,
    });
  } catch (error) {
    console.error(
      "archivePurchase:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to archive purchase.",
    });
  }
};

// ============================================================
// GET ARCHIVED PURCHASES
// ============================================================

const getArchivedPurchases = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      search,
      category,
      page = 1,
      limit = 20,
    } = req.query;

    let query = supabase
      .from("pop_purchases")
      .select("*", {
        count: "exact",
      })
      .eq("user_id", userId)
      .eq("status", "archived");

    if (category) {
      query = query.eq(
        "category",
        category
      );
    }

    if (search?.trim()) {
      const term = search
        .trim()
        .replace(/[%_,]/g, "");

      if (term) {
        query = query.or(
          `product_name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,store_name.ilike.%${term}%`
        );
      }
    }

    const pageNumber = Math.max(
      1,
      parseNumber(page, 1)
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        parseNumber(limit, 20)
      )
    );

    const from =
      (pageNumber - 1) * pageSize;

    const to =
      from + pageSize - 1;

    const {
      data,
      error,
      count,
    } = await query
      .range(from, to)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      "getArchivedPurchases:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch archived purchases.",
    });
  }
};

// ============================================================
// RESTORE PURCHASE
// ============================================================

const restorePurchase = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("pop_purchases")
      .update({
        status: "active",
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "archived")
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message:
          "Archived purchase not found.",
      });
    }

    await createNotification(
      userId,
      "purchase_restored",
      "Purchase restored",
      `Your purchase "${data.product_name}" was restored to active.`
    );

    return res.json({
      success: true,
      message:
        "Purchase restored successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "restorePurchase:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to restore purchase.",
    });
  }
};

// ============================================================
// FIND USER BY EMAIL
// ============================================================

const findUserByEmail = async (
  req,
  res
) => {
  try {
    const currentUserId =
      getUserId(req);

    const { email } = req.query;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name"
      )
      .eq(
        "email",
        email.trim().toLowerCase()
      )
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message:
          "No user found with that email.",
      });
    }

    if (
      data.id === currentUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot transfer an item to yourself.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "findUserByEmail:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to find user.",
    });
  }
};

// ============================================================
// TRANSFER / GIFT / SOLD PURCHASE - FIXED
// ============================================================

const transferPurchase = async (
  req,
  res
) => {
  try {
    const currentUserId =
      getUserId(req);

    const { id } = req.params;

    const {
      recipientEmail,
      type = "direct_gift",
      amount,
      currency = "NGN",
      notes,
    } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase ID is required.",
      });
    }

    if (
      ![
        "direct_gift",
        "gift_to_donttrashit",
        "sold",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid transfer type.",
      });
    }

    if (
      type === "sold" &&
      (
        amount === undefined ||
        amount === null ||
        Number(amount) <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid amount is required for sold items.",
      });
    }

    // --------------------------------------------------------
    // Get current purchase
    // --------------------------------------------------------

    const {
      data: purchase,
      error: purchaseError,
    } = await supabase
      .from("pop_purchases")
      .select("*")
      .eq("id", id)
      .eq("user_id", currentUserId)
      .single();

    if (
      purchaseError ||
      !purchase
    ) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    let recipient = null;
    let transferStatus =
      "completed";

    // --------------------------------------------------------
    // Find recipient
    // --------------------------------------------------------

    if (
      type !==
      "gift_to_donttrashit"
    ) {
      if (!recipientEmail?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Recipient email is required.",
        });
      }

      const email =
        recipientEmail
          .trim()
          .toLowerCase();

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name"
        )
        .eq("email", email)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (user) {
        if (
          user.id ===
          currentUserId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "You cannot transfer an item to yourself.",
          });
        }

        recipient = user;
        transferStatus =
          "completed";
      } else {
        recipient = null;
        transferStatus =
          "pending";
      }
    }

    // --------------------------------------------------------
    // Update purchase ownership
    // --------------------------------------------------------

    let updatedPurchase;

    if (
      type ===
      "gift_to_donttrashit"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("pop_purchases")
        .update({
          status: "archived",
        })
        .eq("id", id)
        .eq(
          "user_id",
          currentUserId
        )
        .select()
        .single();

      updatedPurchase = data;

      if (error) {
        throw error;
      }
    } else if (
      transferStatus ===
      "completed"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("pop_purchases")
        .update({
          user_id:
            recipient.id,
          status: "active",
        })
        .eq("id", id)
        .eq(
          "user_id",
          currentUserId
        )
        .select()
        .single();

      updatedPurchase = data;

      if (error) {
        throw error;
      }

      // ------------------------------------------------------
      // IMPORTANT:
      // Transfer linked asset ownership too.
      //
      // Otherwise the purchase belongs to the recipient while
      // the asset remains owned by the previous user.
      // ------------------------------------------------------

      if (purchase.asset_id) {
        const {
          error: assetTransferError,
        } = await supabase
          .from("pop_assets")
          .update({
            user_id:
              recipient.id,
          })
          .eq(
            "id",
            purchase.asset_id
          )
          .eq(
            "user_id",
            currentUserId
          );

        if (assetTransferError) {
          console.error(
            "Asset ownership transfer failed:",
            assetTransferError
          );

          // Best-effort rollback purchase ownership
          await supabase
            .from("pop_purchases")
            .update({
              user_id:
                currentUserId,
            })
            .eq("id", id)
            .eq(
              "user_id",
              recipient.id
            );

          throw assetTransferError;
        }
      }
    } else {
      updatedPurchase =
        purchase;
    }

    // --------------------------------------------------------
    // Transfer record
    // --------------------------------------------------------

    const transferRecord = {
      purchase_id: id,
      transfer_type: type,
      from_user_id:
        currentUserId,
      to_user_id:
        recipient
          ? recipient.id
          : null,
      recipient_email:
        recipient
          ? recipient.email
          : recipientEmail
              ?.trim()
              .toLowerCase(),
      amount:
        type === "sold"
          ? Number(amount)
          : null,
      currency:
        type === "sold"
          ? currency
          : null,
      status:
        transferStatus,
      notes:
        notes?.trim() || null,
    };

    const {
      error: transferError,
    } = await supabase
      .from(
        "pop_purchase_transfers"
      )
      .insert(
        transferRecord
      );

    if (transferError) {
      console.error(
        "Transfer record insert failed:",
        transferError
      );
    }

    // --------------------------------------------------------
    // Notifications
    // --------------------------------------------------------

    const notificationType =
      type === "direct_gift"
        ? "purchase_gifted"
        : type ===
          "gift_to_donttrashit"
        ? "purchase_donated"
        : "purchase_sold";

    const notificationTitle =
      type === "direct_gift"
        ? "Purchase gifted"
        : type ===
          "gift_to_donttrashit"
        ? "Purchase donated"
        : "Purchase sold";

    await createNotification(
      currentUserId,
      notificationType,
      notificationTitle,
      `Your purchase "${purchase.product_name}" was ${
        type === "direct_gift"
          ? "gifted"
          : type ===
            "gift_to_donttrashit"
          ? "donated"
          : "sold"
      }.`
    );

    if (recipient) {
      await createNotification(
        recipient.id,
        notificationType,
        notificationTitle,
        `You received a ${
          type === "direct_gift"
            ? "gift"
            : "purchase"
        }: "${purchase.product_name}".`
      );
    }

    let message;

    if (
      type ===
      "gift_to_donttrashit"
    ) {
      message =
        "Item donated successfully.";
    } else if (
      type === "direct_gift" &&
      transferStatus ===
        "pending"
    ) {
      message =
        "Recipient not found. Transfer recorded and will be completed when they join.";
    } else if (
      type === "direct_gift"
    ) {
      message =
        "Item gifted successfully.";
    } else if (
      type === "sold" &&
      transferStatus ===
        "pending"
    ) {
      message =
        "Recipient not found. Sale recorded and will be completed when they join.";
    } else {
      message =
        "Item sold successfully.";
    }

    return res.json({
      success: true,
      message,
      data: {
        purchase:
          updatedPurchase,
        transfer:
          transferRecord,
        recipient: recipient
          ? {
              id: recipient.id,
              email: recipient.email,
              full_name:
                recipient.full_name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "transferPurchase:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to transfer purchase.",
    });
  }
};

// ============================================================
// EXPORT ALL FUNCTIONS
// ============================================================

export const create =
  createPurchaseUnified;

export const update =
  updatePurchaseUnified;

export {
  createPurchase,
  createPurchaseWithBackendUpload,
  createPurchaseUnified,
  getPurchases,
  getPurchase,
  updatePurchase,
  updatePurchaseWithBackendUpload,
  updatePurchaseUnified,
  deletePurchase,
  archivePurchase,
  getArchivedPurchases,
  restorePurchase,
  findUserByEmail,
  transferPurchase,
};