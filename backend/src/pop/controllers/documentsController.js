import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import { uploadToCloudinary, deleteImage } from '../../utils/cloudinary.js';

// ============================================================
// HELPERS (shared)
// ============================================================

const getUserId = (req) => req.user?.id || null;

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) return { valid: true };
  const { data, error } = await supabase
    .from('pop_household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (error || !data) {
    return { valid: false, error: 'User is not a member of this household.' };
  }
  return { valid: true, role: data.role };
};

/**
 * Validate that the user can access a document.
 * A document is accessible if:
 * - The user is the document owner (user_id)
 * - Or the document has a household_id and the user is a member of that household
 * - Or the document has an asset_id and the asset's household is accessible
 * - Or the document has a purchase_id and the purchase's household is accessible
 */
const validateDocumentAccess = async (documentId, userId) => {
  const { data, error } = await supabase
    .from('pop_documents')
    .select(`
      id,
      user_id,
      household_id,
      asset_id,
      purchase_id,
      pop_assets:asset_id (household_id),
      pop_purchases:purchase_id (household_id)
    `)
    .eq('id', documentId)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Document not found.' };
  }

  // Check direct ownership
  if (data.user_id === userId) {
    return { valid: true, data };
  }

  // Check household access via document.household_id
  if (data.household_id) {
    const membership = await verifyHouseholdMembership(userId, data.household_id);
    if (membership.valid) {
      return { valid: true, data, role: membership.role };
    }
  }

  // Check via asset's household
  if (data.asset_id && data.pop_assets) {
    const assetHouseholdId = data.pop_assets.household_id;
    if (assetHouseholdId) {
      const membership = await verifyHouseholdMembership(userId, assetHouseholdId);
      if (membership.valid) {
        return { valid: true, data, role: membership.role };
      }
    }
  }

  // Check via purchase's household
  if (data.purchase_id && data.pop_purchases) {
    const purchaseHouseholdId = data.pop_purchases.household_id;
    if (purchaseHouseholdId) {
      const membership = await verifyHouseholdMembership(userId, purchaseHouseholdId);
      if (membership.valid) {
        return { valid: true, data, role: membership.role };
      }
    }
  }

  return { valid: false, error: 'You do not have access to this document.' };
};

/**
 * Helper to get the household ID from any of the linked entities
 */
const resolveHouseholdId = async (householdId, assetId, purchaseId) => {
  if (householdId) return householdId;
  if (assetId) {
    const { data, error } = await supabase
      .from('pop_assets')
      .select('household_id')
      .eq('id', assetId)
      .single();
    if (!error && data) return data.household_id;
  }
  if (purchaseId) {
    const { data, error } = await supabase
      .from('pop_purchases')
      .select('household_id')
      .eq('id', purchaseId)
      .single();
    if (!error && data) return data.household_id;
  }
  return null;
};

// ============================================================
// CREATE DOCUMENT
// ============================================================

export const createDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assetId,
      purchaseId,
      documentType,
      name,
      fileUrl,
      filePublicId,
      issuedAt,
      expiresAt,
      notes,
    } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Document name is required.' });
    }
    if (!documentType) {
      return res.status(400).json({ success: false, message: 'Document type is required.' });
    }
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File URL is required.' });
    }

    // At least one of householdId, assetId, purchaseId must be provided
    if (!householdId && !assetId && !purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'Document must be linked to a household, asset, or purchase.',
      });
    }

    // Resolve the effective household ID for membership check
    const effectiveHouseholdId = await resolveHouseholdId(householdId, assetId, purchaseId);
    if (!effectiveHouseholdId) {
      return res.status(400).json({ success: false, message: 'Could not determine the household for this document.' });
    }

    // Verify membership
    const membership = await verifyHouseholdMembership(userId, effectiveHouseholdId);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }

    const docData = {
      user_id: userId,
      household_id: householdId || effectiveHouseholdId, // we can set it directly
      asset_id: assetId || null,
      purchase_id: purchaseId || null,
      document_type: documentType,
      name: name.trim(),
      file_url: fileUrl,
      file_public_id: filePublicId || null,
      issued_at: issuedAt || null,
      expires_at: expiresAt || null,
      notes: notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('pop_documents')
      .insert(docData)
      .select()
      .single();

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'document_created',
      'Document created',
      `Document "${data.name}" was added.`
    );

    return res.status(201).json({
      success: true,
      message: 'Document created successfully.',
      data,
    });
  } catch (error) {
    console.error('createDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// CREATE DOCUMENT WITH BACKEND UPLOAD
// ============================================================

export const createDocumentWithUpload = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assetId,
      purchaseId,
      documentType,
      name,
      issuedAt,
      expiresAt,
      notes,
    } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Document name is required.' });
    }
    if (!documentType) {
      return res.status(400).json({ success: false, message: 'Document type is required.' });
    }

    // File must be present in request
    if (!req.files || !req.files.file || !req.files.file[0]) {
      return res.status(400).json({ success: false, message: 'File is required.' });
    }

    // At least one of householdId, assetId, purchaseId must be provided
    if (!householdId && !assetId && !purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'Document must be linked to a household, asset, or purchase.',
      });
    }

    // Resolve effective household ID
    const effectiveHouseholdId = await resolveHouseholdId(householdId, assetId, purchaseId);
    if (!effectiveHouseholdId) {
      return res.status(400).json({ success: false, message: 'Could not determine the household for this document.' });
    }

    // Verify membership
    const membership = await verifyHouseholdMembership(userId, effectiveHouseholdId);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }

    // Upload file to Cloudinary
    const fileBuffer = req.files.file[0].buffer;
    const uploaded = await uploadToCloudinary(fileBuffer, 'POP/documents', {
      resourceType: 'auto',
    });

    if (!uploaded.url) {
      throw new Error('File upload failed.');
    }

    const docData = {
      user_id: userId,
      household_id: householdId || effectiveHouseholdId,
      asset_id: assetId || null,
      purchase_id: purchaseId || null,
      document_type: documentType,
      name: name.trim(),
      file_url: uploaded.url,
      file_public_id: uploaded.publicId,
      issued_at: issuedAt || null,
      expires_at: expiresAt || null,
      notes: notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('pop_documents')
      .insert(docData)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await deleteImage(uploaded.publicId);
      throw error;
    }

    // Notification
    await createNotification(
      userId,
      'document_created',
      'Document created',
      `Document "${data.name}" was added.`
    );

    return res.status(201).json({
      success: true,
      message: 'Document created successfully.',
      data,
    });
  } catch (error) {
    console.error('createDocumentWithUpload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET DOCUMENTS (with filters)
// ============================================================

export const getDocuments = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assetId,
      purchaseId,
      documentType,
      status, // we could filter by expiry (active/expiring/expired)
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build accessible households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (memberError) throw memberError;
    const accessibleHouseholdIds = memberHouseholds.map(h => h.household_id);

    if (accessibleHouseholdIds.length === 0) {
      // No households, return empty
      return res.json({
        success: true,
        data: [],
        pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 },
      });
    }

    // Build query – we need to filter documents that belong to accessible households
    let query = supabase
      .from('pop_documents')
      .select(`
        *,
        pop_households (
          id,
          name,
          household_type
        ),
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_purchases (
          id,
          product_name,
          brand,
          model
        )
      `, { count: 'exact' })
      .in('household_id', accessibleHouseholdIds);

    // Apply filters
    if (householdId) {
      // Verify membership explicitly
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
      query = query.eq('household_id', householdId);
    }
    if (assetId) query = query.eq('asset_id', assetId);
    if (purchaseId) query = query.eq('purchase_id', purchaseId);
    if (documentType) query = query.eq('document_type', documentType);
    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,notes.ilike.%${term}%,document_type.ilike.%${term}%`);
    }

    // Pagination
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    // If status filter is provided (active, expiring, expired) based on expires_at
    let result = data || [];
    if (status) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      result = result.filter(doc => {
        if (!doc.expires_at) return false;
        const expiry = new Date(doc.expires_at);
        if (status === 'active') return expiry > thirtyDaysFromNow;
        if (status === 'expiring') return expiry <= thirtyDaysFromNow && expiry > now;
        if (status === 'expired') return expiry <= now;
        return true;
      });
    }

    return res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: result.length, // we don't have the count after filtering by status, but we can compute
      },
    });
  } catch (error) {
    console.error('getDocuments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch documents.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SINGLE DOCUMENT
// ============================================================

export const getDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('pop_documents')
      .select(`
        *,
        pop_households (
          id,
          name,
          household_type
        ),
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_purchases (
          id,
          product_name,
          brand,
          model
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Verify access
    const access = await validateDocumentAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE DOCUMENT
// ============================================================

export const updateDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const {
      documentType,
      name,
      issuedAt,
      expiresAt,
      notes,
      fileUrl,
      filePublicId,
    } = req.body;

    // Verify access (user must have edit permission)
    const access = await validateDocumentAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Only allow updates if user is the document owner or has admin role
    const isOwner = access.data.user_id === userId;
    const isAdmin = access.role === 'admin' || access.role === 'owner';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this document.',
      });
    }

    const update = {};
    if (documentType !== undefined) update.document_type = documentType;
    if (name !== undefined) update.name = name?.trim() || null;
    if (issuedAt !== undefined) update.issued_at = issuedAt || null;
    if (expiresAt !== undefined) update.expires_at = expiresAt || null;
    if (notes !== undefined) update.notes = notes?.trim() || null;
    if (fileUrl !== undefined) {
      update.file_url = fileUrl;
      // if new file provided, old one should be deleted; we handle that after update
    }
    if (filePublicId !== undefined) update.file_public_id = filePublicId;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    // If file is being replaced, we need to delete the old one later
    const oldFilePublicId = access.data.file_public_id;

    const { data, error } = await supabase
      .from('pop_documents')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Delete old file if replaced
    if (fileUrl !== undefined && oldFilePublicId && fileUrl !== access.data.file_url) {
      await deleteImage(oldFilePublicId);
    }

    // Notification
    await createNotification(
      userId,
      'document_updated',
      'Document updated',
      `Document "${data.name}" was updated.`
    );

    return res.json({
      success: true,
      message: 'Document updated successfully.',
      data,
    });
  } catch (error) {
    console.error('updateDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// DELETE DOCUMENT
// ============================================================

export const deleteDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Verify access
    const access = await validateDocumentAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Only allow delete if user is owner or admin/owner
    const isOwner = access.data.user_id === userId;
    const isAdmin = access.role === 'admin' || access.role === 'owner';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this document.',
      });
    }

    // Store file public id before deleting
    const filePublicId = access.data.file_public_id;

    // Delete document
    const { error } = await supabase
      .from('pop_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Delete file from Cloudinary
    if (filePublicId) {
      await deleteImage(filePublicId);
    }

    // Notification
    await createNotification(
      userId,
      'document_deleted',
      'Document deleted',
      `Document "${access.data.name}" was deleted.`
    );

    return res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    console.error('deleteDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET DOCUMENTS BY HOUSEHOLD (convenience)
// ============================================================

export const getHouseholdDocuments = async (req, res) => {
  req.query.householdId = req.params.householdId;
  return getDocuments(req, res);
};

// ============================================================
// GET DOCUMENTS BY ASSET (convenience)
// ============================================================

export const getAssetDocuments = async (req, res) => {
  req.query.assetId = req.params.assetId;
  return getDocuments(req, res);
};