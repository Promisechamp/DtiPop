// backend/controllers/itemsController.js

import { supabase } from '../../db/index.js';
import { deleteMultipleImages } from '../../utils/cloudinary.js';
import { createNotification } from './notificationController.js';

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const ADMIN_ROLES = ['admin', 'super_admin'];

const VALID_STATUSES = [
  'pending',
  'active',
  'cancelled',
  'completed',
  'deleted',
];

const VALID_MODERATION_ACTIONS = [
  'approve',
  'cancel',
  'complete',
  'feature',
  'unfeature',
  'allow_apply',
  'disable_apply',
  'flag',
  'unflag',
];

/* ============================================================
   GENERAL HELPERS
============================================================ */

/**
 * Safely parse a positive integer.
 */
const parsePositiveInt = (
  value,
  fallback,
  max = Number.MAX_SAFE_INTEGER
) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

/**
 * Safely parse pagination.
 */
const getPagination = (query = {}) => {
  const limit = Math.min(
    parsePositiveInt(query.limit, DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const offset = parsePositiveInt(query.offset, 0);

  return {
    limit,
    offset,
    from: offset,
    to: offset + limit - 1,
  };
};

/**
 * Escape values used inside PostgREST .or() filters.
 *
 * This prevents commas/periods/etc. from accidentally changing
 * the filter expression.
 */
const escapePostgrestValue = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/[%]/g, '\\%')
    .replace(/[,]/g, '\\,')
    .replace(/[()]/g, '')
    .replace(/\./g, '\\.');
};

/**
 * Normalize an array.
 */
const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
};

/**
 * Convert a possible numeric value to number.
 */
const nullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Get the current user's role.
 */
const getUserRole = async (userId) => {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to get user role:', error);
    return null;
  }

  return data?.role || null;
};

/**
 * Check whether a user is an admin.
 */
const isAdminUser = async (userId) => {
  const role = await getUserRole(userId);
  return ADMIN_ROLES.includes(role);
};

/* ============================================================
   FEATURED JSONB HELPERS
============================================================ */

/**
 * items.featured MUST remain a JSONB object:
 *
 * {
 *   is_featured: boolean,
 *   can_apply: boolean,
 *   featured_at?: string | null
 * }
 *
 * There are intentionally NO separate is_featured / featured_at
 * database column references here.
 */

const normalizeFeatured = (featured) => {
  const source =
    featured && typeof featured === 'object'
      ? featured
      : {};

  return {
    ...source,
    is_featured: Boolean(source.is_featured),
    can_apply:
      source.can_apply === undefined
        ? true
        : Boolean(source.can_apply),
  };
};

/**
 * Build a featured object without accidentally deleting
 * existing properties.
 */
const buildFeaturedUpdate = (
  currentFeatured,
  changes = {}
) => {
  const current = normalizeFeatured(currentFeatured);

  return {
    ...current,
    ...changes,
    is_featured:
      changes.is_featured !== undefined
        ? Boolean(changes.is_featured)
        : current.is_featured,
    can_apply:
      changes.can_apply !== undefined
        ? Boolean(changes.can_apply)
        : current.can_apply,
  };
};

/* ============================================================
   CLOUDINARY HELPERS
============================================================ */

/**
 * Extract a Cloudinary public ID from a URL.
 *
 * Expected uploads are normally something like:
 *
 * https://res.cloudinary.com/.../image/upload/v123456789/
 * donttrashit/items/abc123.jpg
 *
 * Result:
 *
 * donttrashit/items/abc123
 */
const extractCloudinaryPublicId = (url) => {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const parsedUrl = new URL(url);

    const pathname = parsedUrl.pathname;

    const uploadMarker = '/upload/';

    const uploadIndex = pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return null;
    }

    let afterUpload = pathname.slice(
      uploadIndex + uploadMarker.length
    );

    // Remove transformations/version prefix.
    const segments = afterUpload
      .split('/')
      .filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    /*
     * Cloudinary may contain transformation segments.
     *
     * We only need to identify the version segment and then
     * everything after it.
     */
    if (
      segments[0].startsWith('v') &&
      /^v\d+$/.test(segments[0])
    ) {
      segments.shift();
    }

    if (segments.length === 0) {
      return null;
    }

    const filename = segments.pop();

    /*
     * Remove only the final extension.
     *
     * This is safer than split('.')[0] because a public ID
     * itself may contain periods.
     */
    const publicIdWithoutExtension =
      filename.replace(/\.[^/.]+$/, '');

    if (!publicIdWithoutExtension) {
      return null;
    }

    segments.push(publicIdWithoutExtension);

    return segments.join('/');
  } catch (error) {
    console.error(
      'Failed to extract Cloudinary public ID:',
      url,
      error
    );

    return null;
  }
};

/**
 * Extract multiple Cloudinary public IDs.
 */
const getCloudinaryPublicIds = (imageUrls = []) => {
  return normalizeArray(imageUrls)
    .map(extractCloudinaryPublicId)
    .filter(Boolean);
};

/**
 * Delete uploaded images from Cloudinary.
 *
 * This is used for rollback when an item operation fails.
 */
const cleanupUploadedImages = async (imageUrls) => {
  const urls = normalizeArray(imageUrls);

  if (urls.length === 0) {
    return {
      success: true,
      deleted: 0,
    };
  }

  try {
    const publicIds = getCloudinaryPublicIds(urls);

    if (publicIds.length === 0) {
      console.warn(
        '⚠️ No valid Cloudinary public IDs found for cleanup'
      );

      return {
        success: true,
        deleted: 0,
        message: 'No valid Cloudinary public IDs found',
      };
    }

    console.log(
      '🗑️ Cleaning up Cloudinary public IDs:',
      publicIds
    );

    const result =
      await deleteMultipleImages(publicIds);

    console.log(
      `✅ Cleaned up ${result?.deleted || 0} Cloudinary image(s)`
    );

    return {
      success: true,
      deleted: result?.deleted || 0,
    };
  } catch (error) {
    console.error(
      '❌ Failed to clean up Cloudinary images:',
      error
    );

    return {
      success: false,
      deleted: 0,
      error: error.message,
    };
  }
};

/**
 * Delete item images from Cloudinary.
 *
 * Used ONLY for hard deletion.
 */
const deleteItemImages = async (images) => {
  const publicIds = getCloudinaryPublicIds(images);

  if (publicIds.length === 0) {
    return {
      success: true,
      deleted: 0,
    };
  }

  try {
    const result =
      await deleteMultipleImages(publicIds);

    return {
      success: true,
      deleted: result?.deleted || 0,
    };
  } catch (error) {
    console.error(
      'Failed deleting Cloudinary item images:',
      error
    );

    return {
      success: false,
      deleted: 0,
      error: error.message,
    };
  }
};

/* ============================================================
   NOTIFICATION HELPER
============================================================ */

/**
 * Notifications should not make the main database operation
 * fail.
 */
const safeNotification = async (
  userId,
  type,
  title,
  message,
  metadata = {}
) => {
  if (!userId) {
    return;
  }

  try {
    await createNotification(
      userId,
      type,
      title,
      message,
      metadata
    );
  } catch (error) {
    console.error(
      'Notification error:',
      error
    );
  }
};

/* ============================================================
   RATINGS
============================================================ */

/**
 * Create the two pending ratings for a completed donation.
 *
 * Winner → Donor
 * Donor  → Winner
 *
 * Each direction is independent.
 */
const createPendingRatings = async (
  winnerId,
  donorId,
  itemId,
  applicationId
) => {
  try {
    if (
      !winnerId ||
      !donorId ||
      !itemId ||
      !applicationId
    ) {
      return {
        success: false,
        error: 'Missing required rating data',
      };
    }

    if (winnerId === donorId) {
      return {
        success: false,
        error:
          'Winner and donor cannot be the same user',
      };
    }

    const now = new Date().toISOString();

    /*
     * Check existing ratings first so this helper remains
     * safe if completion is triggered twice.
     */
    const {
      data: existingRatings,
      error: existingError,
    } = await supabase
      .from('ratings')
      .select(
        `
        id,
        rater_id,
        rated_user_id,
        rating,
        review,
        status
      `
      )
      .eq('application_id', applicationId);

    if (existingError) {
      console.error(
        'Failed checking existing ratings:',
        existingError
      );

      return {
        success: false,
        error: existingError.message,
      };
    }

    const existing =
      existingRatings || [];

    const ratingsToCreate = [];

    const winnerRatingExists =
      existing.some(
        (rating) =>
          rating.rater_id === winnerId &&
          rating.rated_user_id === donorId
      );

    if (!winnerRatingExists) {
      ratingsToCreate.push({
        item_id: itemId,
        application_id: applicationId,
        rater_id: winnerId,
        rated_user_id: donorId,
        rating: null,
        review: null,
        status: 'pending',
        reply_text: null,
        reply_created_at: null,
        reply_updated_at: null,
        reminder_at: null,
        created_at: now,
        updated_at: now,
      });
    }

    const donorRatingExists =
      existing.some(
        (rating) =>
          rating.rater_id === donorId &&
          rating.rated_user_id === winnerId
      );

    if (!donorRatingExists) {
      ratingsToCreate.push({
        item_id: itemId,
        application_id: applicationId,
        rater_id: donorId,
        rated_user_id: winnerId,
        rating: null,
        review: null,
        status: 'pending',
        reply_text: null,
        reply_created_at: null,
        reply_updated_at: null,
        reminder_at: null,
        created_at: now,
        updated_at: now,
      });
    }

    if (ratingsToCreate.length === 0) {
      return {
        success: true,
        created: 0,
        message:
          'Both pending ratings already exist',
      };
    }

    const {
      data,
      error,
    } = await supabase
      .from('ratings')
      .insert(ratingsToCreate)
      .select();

    if (error) {
      console.error(
        'Failed creating pending ratings:',
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      created: data?.length || 0,
      ratings: data || [],
    };
  } catch (error) {
    console.error(
      'createPendingRatings error:',
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
};





/* ============================================================
   GET ITEMS
============================================================ */
export const getItems = async (req, res) => {
  try {
    const {
      category,
      condition,
      status = 'active',
      search,
      donor_pays_shipping,
      region,
    } = req.query;

    const { limit, offset, from, to } = getPagination(req.query);

    let query = supabase
      .from('items')
      .select(
        `
        *,
        donor:profiles!donor_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          rating
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url
        ),
        applications(count)
        `,
        { count: 'exact' }
      );

    if (category) {
      query = query.eq('category', category);
    }

    if (condition) {
      query = query.eq('condition', condition);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (donor_pays_shipping !== undefined) {
      query = query.eq('donor_pays_shipping', donor_pays_shipping === 'true');
    }

    if (region) {
      const cleanRegion = escapePostgrestValue(region);
      query = query.or(
        `shipping_regions->>region.eq.${cleanRegion},shipping_regions->>region.eq.anywhere`
      );
    }

    // ✅ NEW: featured filter
    if (req.query.featured === 'true') {
      query = query.eq('featured->>is_featured', 'true');
    }

    if (search?.trim()) {
      const cleanSearch = escapePostgrestValue(search.trim());
      query = query.or(
        `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase getItems error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const total = count || 0;

    return res.json({
      success: true,
      items: data || [],
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Get items error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
    });
  }
};





/* ============================================================
   GET SINGLE ITEM
============================================================ */
export const getItemById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required',
      });
    }

    /* --------------------------------------------------------
       IP ADDRESS
    -------------------------------------------------------- */

    let ipAddress = 'unknown';

    const forwarded =
      req.headers[
        'x-forwarded-for'
      ];

    if (forwarded) {
      ipAddress = forwarded
        .split(',')[0]
        .trim();
    } else if (
      req.headers['x-real-ip']
    ) {
      ipAddress =
        req.headers['x-real-ip'];
    } else if (
      req.socket?.remoteAddress
    ) {
      ipAddress =
        req.socket.remoteAddress;
    } else if (req.ip) {
      ipAddress = req.ip;
    }

    if (
      ipAddress.startsWith(
        '::ffff:'
      )
    ) {
      ipAddress =
        ipAddress.substring(7);
    }

    if (
      ipAddress === '::1' ||
      ipAddress === '127.0.0.1'
    ) {
      ipAddress = 'localhost';
    }

    const userAgent =
      req.headers[
        'user-agent'
      ] || 'unknown';

    /* --------------------------------------------------------
       ITEM
    -------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabase
      .from('items')
      .select(
        `
        *,
        donor:profiles!donor_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          bio,
          rating,
          items_given
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url,
          location
        ),
        applications(
          id,
          applicant_id,
          message,
          status,
          created_at,
          applicant:profiles!applicant_id(
            id,
            full_name,
            avatar_url,
            location
          )
        )
        `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(
        'Get item database error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    /* --------------------------------------------------------
       ACCEPTED APPLICATION
    -------------------------------------------------------- */

    const {
      data: acceptedApplication,
      error:
        acceptedApplicationError,
    } = await supabase
      .from('applications')
      .select(
        `
        id,
        applicant_id,
        status,
        created_at
        `
      )
      .eq('item_id', id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (
      acceptedApplicationError
    ) {
      console.error(
        'Error getting accepted application:',
        acceptedApplicationError
      );
    }

    data.accepted_application =
      acceptedApplication || null;

    /* --------------------------------------------------------
       VIEW TRACKING
    -------------------------------------------------------- */

    if (
      !userId ||
      data.donor_id !== userId
    ) {
      try {
        const {
          data: trackResult,
          error: trackError,
        } = await supabase.rpc(
          'track_item_view',
          {
            p_item_id: id,
            p_viewer_id:
              userId || null,
            p_ip_address:
              ipAddress,
            p_user_agent:
              userAgent,
            p_cooldown_minutes: 60,
          }
        );

        if (trackError) {
          console.error(
            'Track item view error:',
            trackError
          );
        } else if (
          trackResult
        ) {
          if (
            trackResult.view_recorded
          ) {
            data.views_count =
              trackResult.views_count;
          }
        }
      } catch (viewError) {
        console.error(
          'Error tracking item view:',
          viewError
        );
      }
    }

    return res.json({
      success: true,
      item: data,
    });
  } catch (error) {
    console.error(
      'Get item error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
    });
  }
};

/* ============================================================
   CREATE ITEM
============================================================ */

/**
 * Create a new item.
 *
 * New listings start as "pending".
 * Admin approval changes them to "active".
 */
export const createItem = async (
  req,
  res
) => {
  const uploadedImages =
    normalizeArray(req.body?.images);

  try {
    const userId =
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const {
      title,
      description,
      category,
      condition,
      quantity = 1,
      weight_kg,
      length_cm,
      width_cm,
      height_cm,
      donor_pays_shipping = false,
      shipping_region,
      exclude_countries,
      images,
    } = req.body;

    /* --------------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------------- */

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category?.trim() ||
      !condition?.trim()
    ) {
      await cleanupUploadedImages(
        uploadedImages
      );

      return res.status(400).json({
        success: false,
        error:
          'Please provide title, description, category, and condition',
      });
    }

    const parsedQuantity =
      Number.parseInt(
        quantity,
        10
      );

    if (
      !Number.isInteger(
        parsedQuantity
      ) ||
      parsedQuantity < 1
    ) {
      await cleanupUploadedImages(
        uploadedImages
      );

      return res.status(400).json({
        success: false,
        error:
          'Quantity must be at least 1',
      });
    }

    /* --------------------------------------------------------
       EMAIL VERIFICATION
    -------------------------------------------------------- */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'email_verified'
      )
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      await cleanupUploadedImages(
        uploadedImages
      );

      console.error(
        'Error checking verification:',
        profileError
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to verify user status',
      });
    }

    if (!profile) {
      await cleanupUploadedImages(
        uploadedImages
      );

      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    if (!profile.email_verified) {
      await cleanupUploadedImages(
        uploadedImages
      );

      return res.status(403).json({
        success: false,
        error:
          'Please verify your email address before creating items. Check your inbox for the verification link.',
        requiresVerification: true,
      });
    }

    /* --------------------------------------------------------
       SHIPPING
    -------------------------------------------------------- */

    let shippingRegions = null;

    if (
      donor_pays_shipping === true ||
      donor_pays_shipping === 'true'
    ) {
      if (
        !shipping_region?.trim()
      ) {
        await cleanupUploadedImages(
          uploadedImages
        );

        return res.status(400).json({
          success: false,
          error:
            'Please select a shipping region when donor pays shipping',
        });
      }

      shippingRegions = {
        region:
          shipping_region.trim(),
        exclude:
          normalizeArray(
            exclude_countries
          ),
      };
    }

    const imageUrls =
      normalizeArray(images);

    /* --------------------------------------------------------
       INSERT
    -------------------------------------------------------- */

    const now =
      new Date().toISOString();

    const itemToInsert = {
      donor_id: userId,

      title: title.trim(),
      description:
        description.trim(),
      category: category.trim(),
      condition: condition.trim(),

      quantity:
        parsedQuantity,

      images: imageUrls,

      weight_kg:
        nullableNumber(
          weight_kg
        ),

      length_cm:
        nullableNumber(
          length_cm
        ),

      width_cm:
        nullableNumber(
          width_cm
        ),

      height_cm:
        nullableNumber(
          height_cm
        ),

      donor_pays_shipping:
        donor_pays_shipping ===
          true ||
        donor_pays_shipping ===
          'true',

      shipping_regions:
        shippingRegions,

      /*
       * featured is JSONB.
       */
      featured: {
        is_featured: false,
        can_apply: true,
      },

      /*
       * New listings require admin approval.
       */
      status: 'pending',

      created_at: now,
      updated_at: now,
    };

    const {
      data,
      error,
    } = await supabase
      .from('items')
      .insert(itemToInsert)
      .select()
      .single();

    if (error) {
      console.error(
        'Item creation error:',
        error
      );

      await cleanupUploadedImages(
        imageUrls
      );

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    /* --------------------------------------------------------
       UPDATE DONOR COUNT
    -------------------------------------------------------- */

    try {
      const {
        data: currentProfile,
        error:
          currentProfileError,
      } = await supabase
        .from('profiles')
        .select(
          'items_given'
        )
        .eq('id', userId)
        .maybeSingle();

      if (
        !currentProfileError &&
        currentProfile
      ) {
        await supabase
          .from('profiles')
          .update({
            items_given:
              (currentProfile.items_given ||
                0) + 1,
          })
          .eq('id', userId);
      }
    } catch (updateError) {
      console.error(
        'Error updating items_given:',
        updateError
      );
    }

    return res.status(201).json({
      success: true,
      message:
        'Item listed successfully and submitted for approval!',
      item: data,
    });
  } catch (error) {
    console.error(
      'Create item error:',
      error
    );

    await cleanupUploadedImages(
      uploadedImages
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to create item',
    });
  }
};

/* ============================================================
   UPDATE ITEM
============================================================ */

/**
 * Update an item owned by the donor.
 *
 * Protected fields cannot be changed by normal donors.
 */
export const updateItem = async (
  req,
  res
) => {
  let newlyUploadedImages = [];

  try {
    const { id } = req.params;
    const userId =
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const incomingUpdates = {
      ...(req.body || {}),
    };

    const incomingImages =
      normalizeArray(
        incomingUpdates.images
      );

    /* --------------------------------------------------------
       FETCH EXISTING ITEM
    -------------------------------------------------------- */

    const {
      data: existing,
      error: checkError,
    } = await supabase
      .from('items')
      .select(
        `
        id,
        donor_id,
        status,
        images,
        quantity,
        donor_pays_shipping,
        shipping_regions,
        featured
        `
      )
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      return res.status(400).json({
        success: false,
        error: checkError.message,
      });
    }

    if (!existing) {
      await cleanupUploadedImages(
        incomingImages
      );

      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    /* --------------------------------------------------------
       AUTHORIZATION
    -------------------------------------------------------- */

    if (
      existing.donor_id !==
      userId
    ) {
      const existingImages =
        normalizeArray(
          existing.images
        );

      newlyUploadedImages =
        incomingImages.filter(
          (url) =>
            !existingImages.includes(
              url
            )
        );

      await cleanupUploadedImages(
        newlyUploadedImages
      );

      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to edit this item',
      });
    }

    /* --------------------------------------------------------
       COMPLETED ITEMS
    -------------------------------------------------------- */

    if (
      existing.status ===
      'completed'
    ) {
      const existingImages =
        normalizeArray(
          existing.images
        );

      newlyUploadedImages =
        incomingImages.filter(
          (url) =>
            !existingImages.includes(
              url
            )
        );

      await cleanupUploadedImages(
        newlyUploadedImages
      );

      return res.status(400).json({
        success: false,
        error:
          'Cannot update a completed item',
      });
    }

    /* --------------------------------------------------------
       REMOVE PROTECTED FIELDS
    -------------------------------------------------------- */

    const updates = {
      ...incomingUpdates,
    };

    const protectedFields = [
      'id',
      'donor_id',
      'created_at',
      'updated_at',

      'winner_id',
      'winner_announced_at',

      'donor_confirmed_at',
      'winner_confirmed_at',
      'completed_at',

      'views_count',
      'applications_count',

      'is_flagged',
      'flagged_at',
      'flag_reason',

      'deleted_at',
      'deleted_by',

      /*
       * featured is controlled by admin.
       */
      'featured',

      /*
       * Status is controlled by the workflow/admin.
       */
      'status',
    ];

    protectedFields.forEach(
      (field) => {
        delete updates[field];
      }
    );

    /* --------------------------------------------------------
       QUANTITY
    -------------------------------------------------------- */

    if (
      updates.quantity !==
      undefined
    ) {
      const parsedQuantity =
        Number.parseInt(
          updates.quantity,
          10
        );

      if (
        !Number.isInteger(
          parsedQuantity
        ) ||
        parsedQuantity < 1
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Quantity must be at least 1',
        });
      }

      updates.quantity =
        parsedQuantity;
    }

    /* --------------------------------------------------------
       NUMERIC FIELDS
    -------------------------------------------------------- */

    for (const field of [
      'weight_kg',
      'length_cm',
      'width_cm',
      'height_cm',
    ]) {
      if (
        updates[field] !==
        undefined
      ) {
        updates[field] =
          nullableNumber(
            updates[field]
          );
      }
    }

    /* --------------------------------------------------------
       IMAGES
    -------------------------------------------------------- */

    const existingImages =
      normalizeArray(
        existing.images
      );

    if (
      updates.images !==
      undefined
    ) {
      if (
        !Array.isArray(
          updates.images
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Images must be an array',
        });
      }

      newlyUploadedImages =
        updates.images.filter(
          (url) =>
            !existingImages.includes(
              url
            )
        );
    }

    /* --------------------------------------------------------
       SHIPPING REGIONS
    -------------------------------------------------------- */

    if (
      updates.shipping_region !==
        undefined ||
      updates.exclude_countries !==
        undefined ||
      updates.donor_pays_shipping !==
        undefined
    ) {
      const donorPaysShipping =
        updates.donor_pays_shipping !==
        undefined
          ? updates.donor_pays_shipping ===
              true ||
            updates.donor_pays_shipping ===
              'true'
          : Boolean(
              existing.donor_pays_shipping
            );

      if (donorPaysShipping) {
        let currentRegion =
          updates.shipping_region;

        if (
          currentRegion ===
            undefined &&
          existing.shipping_regions
        ) {
          currentRegion =
            existing.shipping_regions
              ?.region;
        }

        if (
          !currentRegion?.trim()
        ) {
          await cleanupUploadedImages(
            newlyUploadedImages
          );

          return res.status(400).json({
            success: false,
            error:
              'Please select a shipping region when donor pays shipping',
          });
        }

        let excludeCountries =
          updates.exclude_countries;

        if (
          excludeCountries ===
            undefined &&
          existing.shipping_regions
        ) {
          excludeCountries =
            existing.shipping_regions
              ?.exclude || [];
        }

        updates.shipping_regions =
          {
            region:
              currentRegion.trim(),
            exclude:
              normalizeArray(
                excludeCountries
              ),
          };
      } else {
        updates.shipping_regions =
          null;
      }

      delete updates.shipping_region;
      delete updates.exclude_countries;
    }

    /* --------------------------------------------------------
       EMPTY UPDATE
    -------------------------------------------------------- */

    if (
      Object.keys(updates)
        .length === 0
    ) {
      return res.json({
        success: true,
        message:
          'No changes were made',
        item: existing,
      });
    }

    updates.updated_at =
      new Date().toISOString();

    /* --------------------------------------------------------
       UPDATE
    -------------------------------------------------------- */

    const {
      data,
      error,
    } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .eq('donor_id', userId)
      .select()
      .single();

    if (error) {
      console.error(
        'Item update error:',
        error
      );

      await cleanupUploadedImages(
        newlyUploadedImages
      );

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message:
        'Item updated successfully!',
      item: data,
    });
  } catch (error) {
    console.error(
      'Update item error:',
      error
    );

    if (
      newlyUploadedImages.length >
      0
    ) {
      await cleanupUploadedImages(
        newlyUploadedImages
      );
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update item',
    });
  }
};

/* ============================================================
   DELETE ITEM
============================================================ */

/**
 * Delete an item owned by the donor.
 *
 * Cloudinary images are deleted only after the database delete
 * succeeds.
 */
export const deleteItem = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const userId =
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const {
      data: existing,
      error: checkError,
    } = await supabase
      .from('items')
      .select(
        'id, donor_id, status, images'
      )
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      return res.status(400).json({
        success: false,
        error: checkError.message,
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    if (
      existing.donor_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to delete this item',
      });
    }

    if (
      existing.status ===
      'completed'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Cannot delete a completed item',
      });
    }

    /*
     * Delete database record first.
     *
     * This prevents a Cloudinary failure from blocking the
     * actual item deletion.
     */
    const {
      error: deleteError,
    } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('donor_id', userId);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        error:
          deleteError.message,
      });
    }

    /*
     * Cloudinary cleanup happens after successful DB deletion.
     */
    if (
      existing.images &&
      existing.images.length >
        0
    ) {
      await deleteItemImages(
        existing.images
      );
    }

    return res.json({
      success: true,
      message:
        'Item deleted successfully!',
    });
  } catch (error) {
    console.error(
      'Delete item error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to delete item',
    });
  }
};

/* ============================================================
   DONOR CONFIRMS ITEM GIVEN
============================================================ */

/**
 * Donor marks the item as given.
 *
 * The winner must subsequently confirm receipt.
 */
export const confirmItemReceived = async (
  req,
  res
) => {
  try {
    const { itemId } =
      req.params;

    const userId =
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const {
      data: item,
      error: itemError,
    } = await supabase
      .from('items')
      .select(
        `
        id,
        donor_id,
        status,
        title,
        quantity,
        winner_id,
        donor_confirmed_at
        `
      )
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) {
      console.error(
        'Item lookup error:',
        itemError
      );

      return res.status(400).json({
        success: false,
        error: itemError.message,
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    if (
      item.donor_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Only the donor can mark an item as given',
      });
    }

    if (
      item.status ===
      'completed'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Item is already completed',
      });
    }

    if (
      item.status ===
      'cancelled'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Cancelled items cannot be marked as given',
      });
    }

    if (
      item.donor_confirmed_at
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Item has already been marked as given',
      });
    }

    /*
     * A winner must exist before the donor can complete the
     * handoff process.
     */
    if (!item.winner_id) {
      return res.status(400).json({
        success: false,
        error:
          'This item does not have a selected winner yet',
      });
    }

    const confirmedAt =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from('items')
      .update({
        status: 'pending',
        donor_confirmed_at:
          confirmedAt,
        updated_at:
          confirmedAt,
      })
      .eq('id', itemId)
      .eq('donor_id', userId)
      .is(
        'donor_confirmed_at',
        null
      )
      .select()
      .single();

    if (error) {
      console.error(
        'Error marking item as given:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    /*
     * Notify the selected winner.
     */
    await safeNotification(
      item.winner_id,
      'item_shipped',
      'Item Has Been Given!',
      `The donor has marked "${item.title}" as given. Please confirm when you receive it.`,
      {
        item_id: itemId,
        applicant_id:
          item.winner_id,
      }
    );

    return res.json({
      success: true,
      message:
        'Item marked as given. Waiting for winner to confirm receipt.',
      item: data,
    });
  } catch (error) {
    console.error(
      'Confirm item received error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Failed to mark item as given',
    });
  }
};

/* ============================================================
   WINNER CONFIRMS RECEIPT
============================================================ */

/**
 * Winner confirms receipt.
 *
 * This finalizes the donation:
 *
 * pending → completed
 */
export const confirmItemReceivedByWinner =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            'Authentication required',
        });
      }

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select(
          `
          id,
          donor_id,
          status,
          title,
          winner_id,
          donor_confirmed_at
          `
        )
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      if (
        item.winner_id !==
        userId
      ) {
        return res.status(403).json({
          success: false,
          error:
            'Only the winner can confirm receipt',
        });
      }

      if (
        item.status ===
        'completed'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Item is already completed',
        });
      }

      if (
        item.status ===
        'cancelled'
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Cancelled items cannot be completed',
        });
      }

      if (
        !item.donor_confirmed_at
      ) {
        return res.status(400).json({
          success: false,
          error:
            'The donor has not yet marked this item as given. Please wait for the donor to confirm.',
        });
      }

      /*
       * Find the accepted application BEFORE completing the
       * item. We need its ID for ratings.
       */
      const {
        data: acceptedApp,
        error:
          acceptedAppError,
      } = await supabase
        .from('applications')
        .select(
          'id, applicant_id'
        )
        .eq('item_id', itemId)
        .eq('status', 'accepted')
        .eq('applicant_id', userId)
        .maybeSingle();

      if (acceptedAppError) {
        console.error(
          'Accepted application lookup error:',
          acceptedAppError
        );

        return res.status(400).json({
          success: false,
          error:
            'Failed to verify winning application',
        });
      }

      if (!acceptedApp) {
        return res.status(400).json({
          success: false,
          error:
            'No accepted application was found for this winner',
        });
      }

      const now =
        new Date().toISOString();

      /*
       * Atomic-ish guard against completing twice.
       */
      const {
        data: updatedItem,
        error: updateError,
      } = await supabase
        .from('items')
        .update({
          status: 'completed',
          winner_confirmed_at:
            now,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', itemId)
        .eq('winner_id', userId)
        .neq(
          'status',
          'completed'
        )
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({
          success: false,
          error:
            updateError.message,
        });
      }

      /* ------------------------------------------------------
         WINNER PROFILE COUNT
      ------------------------------------------------------ */

      try {
        const {
          data: winnerProfile,
        } = await supabase
          .from('profiles')
          .select(
            'items_received'
          )
          .eq('id', userId)
          .maybeSingle();

        if (winnerProfile) {
          await supabase
            .from('profiles')
            .update({
              items_received:
                (winnerProfile.items_received ||
                  0) + 1,
            })
            .eq(
              'id',
              userId
            );
        }
      } catch (profileError) {
        console.error(
          'Error updating items_received:',
          profileError
        );
      }

      /* ------------------------------------------------------
         WINNER RECORD
      ------------------------------------------------------ */

      try {
        const {
          data: existingWinner,
        } = await supabase
          .from('winners')
          .select('id')
          .eq(
            'item_id',
            itemId
          )
          .eq(
            'winner_id',
            userId
          )
          .maybeSingle();

        if (!existingWinner) {
          await supabase
            .from('winners')
            .insert({
              item_id:
                itemId,
              winner_id:
                userId,
              week_start:
                now,
              week_end:
                new Date(
                  Date.now() +
                    7 *
                      24 *
                      60 *
                      60 *
                      1000
                ).toISOString(),
            });
        }
      } catch (winnerError) {
        console.error(
          'Error creating winner record:',
          winnerError
        );
      }

      /* ------------------------------------------------------
         CLOSE PENDING APPLICATIONS
      ------------------------------------------------------ */

      const {
        data: remainingPending,
        error:
          pendingError,
      } = await supabase
        .from('applications')
        .select(
          'id, applicant_id'
        )
        .eq('item_id', itemId)
        .eq('status', 'pending');

      if (pendingError) {
        console.error(
          'Error fetching pending applications:',
          pendingError
        );
      } else if (
        remainingPending &&
        remainingPending.length >
          0
      ) {
        const {
          error:
            rejectError,
        } = await supabase
          .from('applications')
          .update({
            status:
              'not_selected',
            updated_at: now,
          })
          .eq(
            'item_id',
            itemId
          )
          .eq(
            'status',
            'pending'
          );

        if (rejectError) {
          console.error(
            'Error closing pending applications:',
            rejectError
          );
        }

        for (const app of remainingPending) {
          await safeNotification(
            app.applicant_id,
            'application_rejected',
            'Item Completed',
            `"${item.title}" has been completed and is no longer available.`,
            {
              item_id:
                itemId,
              application_id:
                app.id,
            }
          );
        }
      }

      /* ------------------------------------------------------
         CREATE BOTH RATINGS
      ------------------------------------------------------ */

      const ratingResult =
        await createPendingRatings(
          userId,
          item.donor_id,
          itemId,
          acceptedApp.id
        );

      if (
        !ratingResult.success
      ) {
        console.warn(
          'Could not create pending ratings:',
          ratingResult.error
        );
      }

      /* ------------------------------------------------------
         NOTIFY DONOR
      ------------------------------------------------------ */

      await safeNotification(
        item.donor_id,
        'item_completed',
        'Item Successfully Received!',
        `The winner has confirmed receipt of "${item.title}". The donation is now complete! 🎉`,
        {
          item_id: itemId,
          winner_id: userId,
        }
      );

      return res.json({
        success: true,
        message:
          'Item confirmed as received. Donation complete! 🎉',
        item: updatedItem,
      });
    } catch (error) {
      console.error(
        'Confirm item received by winner error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to confirm receipt',
      });
    }
  };

/* ============================================================
   GET ITEMS BY DONOR
============================================================ */

/**
 * Get items owned by a donor.
 */
export const getItemsByDonor =
  async (req, res) => {
    try {
      const { donorId } =
        req.params;

      const { status } =
        req.query;

      if (!donorId) {
        return res.status(400).json({
          success: false,
          error:
            'Donor ID is required',
        });
      }

      let query = supabase
        .from('items')
        .select(
          `
          *,
          winner:profiles!winner_id(
            id,
            full_name,
            avatar_url
          )
          `
        )
        .eq(
          'donor_id',
          donorId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (status) {
        query = query.eq(
          'status',
          status
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      /*
       * Get application counts separately.
       *
       * This avoids malformed nested relationship filters.
       */
      const items =
        data || [];

      if (items.length > 0) {
        const itemIds =
          items.map(
            (item) => item.id
          );

        const {
          data:
            applications,
          error:
            applicationsError,
        } = await supabase
          .from('applications')
          .select(
            'id, item_id, status'
          )
          .in(
            'item_id',
            itemIds
          );

        if (
          applicationsError
        ) {
          console.error(
            'Error fetching application counts:',
            applicationsError
          );
        } else {
          const countMap =
            new Map();

          for (const app of
            applications ||
            []) {
            if (
              !countMap.has(
                app.item_id
              )
            ) {
              countMap.set(
                app.item_id,
                {
                  total: 0,
                  accepted: 0,
                }
              );
            }

            const counts =
              countMap.get(
                app.item_id
              );

            counts.total += 1;

            if (
              app.status ===
              'accepted'
            ) {
              counts.accepted +=
                1;
            }
          }

          for (const item of items) {
            const counts =
              countMap.get(
                item.id
              ) || {
                total: 0,
                accepted: 0,
              };

            item.applications_count =
              counts.total;

            item.accepted_count =
              counts.accepted;
          }
        }
      }

      return res.json({
        success: true,
        items,
      });
    } catch (error) {
      console.error(
        'Get donor items error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to fetch donor items',
      });
    }
  };

/* ============================================================
   GET APPLICANT COUNT
============================================================ */

/**
 * Get total applicant count for an item.
 *
 * Only:
 * - donor
 * - admin
 * can view it.
 */
export const getApplicantCount =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            'Authentication required',
        });
      }

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select('donor_id')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      const isDonor =
        item.donor_id ===
        userId;

      const isAdmin =
        await isAdminUser(
          userId
        );

      if (
        !isDonor &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          error:
            'You are not authorized to view applicant count',
        });
      }

      const {
        count,
        error,
      } = await supabase
        .from('applications')
        .select(
          '*',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'item_id',
          itemId
        );

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.json({
        success: true,
        count: count || 0,
        itemId,
      });
    } catch (error) {
      console.error(
        'Get applicant count error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to get applicant count',
      });
    }
  };

/* ============================================================
   GET CONVERSATION COUNT
============================================================ */

/**
 * Get conversation count for an item.
 */
export const getConversationCount =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            'Authentication required',
        });
      }

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select('donor_id')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      const isDonor =
        item.donor_id ===
        userId;

      const isAdmin =
        await isAdminUser(
          userId
        );

      const {
        data: application,
        error:
          applicationError,
      } = await supabase
        .from('applications')
        .select('id')
        .eq(
          'item_id',
          itemId
        )
        .eq(
          'applicant_id',
          userId
        )
        .maybeSingle();

      if (applicationError) {
        console.error(
          'Conversation authorization application lookup error:',
          applicationError
        );
      }

      const isApplicant =
        Boolean(
          application
        );

      if (
        !isDonor &&
        !isApplicant &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          error:
            'You are not authorized to view conversation count',
        });
      }

      const {
        count,
        error,
      } = await supabase
        .from('conversations')
        .select(
          '*',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'item_id',
          itemId
        );

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.json({
        success: true,
        count: count || 0,
        itemId,
      });
    } catch (error) {
      console.error(
        'Get conversation count error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to get conversation count',
      });
    }
  };

/* ============================================================
   GET APPLICANTS
============================================================ */

/**
 * Get applicants for an item.
 */
export const getApplicants =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            'Authentication required',
        });
      }

      const {
        limit,
        offset,
        from,
        to,
      } = getPagination(
        req.query
      );

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select('donor_id')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      const isDonor =
        item.donor_id ===
        userId;

      const isAdmin =
        await isAdminUser(
          userId
        );

      if (
        !isDonor &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          error:
            'You are not authorized to view applicants',
        });
      }

      const {
        data,
        error,
        count,
      } = await supabase
        .from('applications')
        .select(
          `
          id,
          message,
          status,
          created_at,
          applicant:profiles!applicant_id(
            id,
            full_name,
            avatar_url,
            location,
            rating
          )
          `,
          {
            count: 'exact',
          }
        )
        .eq(
          'item_id',
          itemId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .range(from, to);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.json({
        success: true,
        applicants:
          data || [],
        total: count || 0,
        limit,
        offset,
        hasMore:
          offset + limit <
          (count || 0),
      });
    } catch (error) {
      console.error(
        'Get applicants error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to get applicants',
      });
    }
  };

/* ============================================================
   GET ITEM CONVERSATIONS
============================================================ */

/**
 * Get conversations associated with an item.
 */
export const getItemConversations =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const userId =
        req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            'Authentication required',
        });
      }

      const {
        limit,
        offset,
        from,
        to,
      } = getPagination(
        req.query
      );

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select('donor_id')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      const isDonor =
        item.donor_id ===
        userId;

      const isAdmin =
        await isAdminUser(
          userId
        );

      if (
        !isDonor &&
        !isAdmin
      ) {
        /*
         * Applicants can also view conversations for items
         * they applied for.
         */
        const {
          data: application,
        } = await supabase
          .from('applications')
          .select('id')
          .eq(
            'item_id',
            itemId
          )
          .eq(
            'applicant_id',
            userId
          )
          .maybeSingle();

        if (!application) {
          return res.status(403).json({
            success: false,
            error:
              'You are not authorized to view conversations',
          });
        }
      }

      const {
        data,
        error,
        count,
      } = await supabase
        .from('conversations')
        .select(
          `
          id,
          created_at,
          last_message_at,

          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url
          ),

          applicant:profiles!applicant_id(
            id,
            full_name,
            avatar_url
          ),

          messages(
            id,
            content,
            created_at,
            sender_id
          )
          `,
          {
            count: 'exact',
          }
        )
        .eq(
          'item_id',
          itemId
        )
        .eq(
          'is_deleted',
          false
        )
        .order(
          'last_message_at',
          {
            ascending: false,
          }
        )
        .range(from, to);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      const processedData =
        (data || []).map(
          (conversation) => {
            const messages =
              conversation.messages ||
              [];

            const sorted =
              [...messages].sort(
                (a, b) =>
                  new Date(
                    b.created_at
                  ) -
                  new Date(
                    a.created_at
                  )
              );

            return {
              ...conversation,

              message_count:
                messages.length,

              last_message:
                sorted[0] ||
                null,

              messages:
                undefined,
            };
          }
        );

      return res.json({
        success: true,
        conversations:
          processedData,
        total: count || 0,
        limit,
        offset,
        hasMore:
          offset + limit <
          (count || 0),
      });
    } catch (error) {
      console.error(
        'Get item conversations error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to get conversations',
      });
    }
  };

/* ============================================================
   ADMIN: GET ALL ITEMS
============================================================ */
export const adminGetAllItems = async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      status,
      donor_id,
      date_from,
      date_to,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const { limit, offset, from, to } = getPagination(req.query);

    let query = supabase
      .from('items')
      .select(
        `
        *,
        donor:profiles!donor_id(
          id,
          full_name,
          email,
          avatar_url,
          location
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url
        )
        `,
        { count: 'exact' }
      );

    // ─── SEARCH ──────────────────────────────────────────────
    if (search?.trim()) {
      const cleanSearch = escapePostgrestValue(search.trim());
      query = query.or(
        `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,category.ilike.%${cleanSearch}%`
      );
    }

    // ─── CATEGORY ─────────────────────────────────────────────
    if (category) {
      query = query.eq('category', category);
    }

    // ─── CONDITION ────────────────────────────────────────────
    if (condition) {
      query = query.eq('condition', condition);
    }

    // ─── STATUS ──────────────────────────────────────────────
    if (status) {
      query = query.eq('status', status);
    }

    // ─── DONOR ───────────────────────────────────────────────
    if (donor_id) {
      query = query.eq('donor_id', donor_id);
    }

    // ─── DATE FROM ────────────────────────────────────────────
    if (date_from) {
      const dateFrom = new Date(date_from);
      if (!Number.isNaN(dateFrom.getTime())) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
    }

    // ─── DATE TO ──────────────────────────────────────────────
    if (date_to) {
      const dateTo = new Date(date_to);
      if (!Number.isNaN(dateTo.getTime())) {
        // If date is only YYYY-MM-DD, make it inclusive to end of day
        if (/^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
          dateTo.setUTCHours(23, 59, 59, 999);
        }
        query = query.lte('created_at', dateTo.toISOString());
      }
    }

    // ✅ ─── FEATURED (NEW) ──────────────────────────────────
    if (req.query.featured === 'true') {
      query = query.eq('featured->>is_featured', 'true');
    }

    // ─── SORTING ──────────────────────────────────────────────
    // Valid column names – no JSONB keys like 'featured_at'
    const validSortFields = [
      'created_at',
      'title',
      'views_count',
      'status',
      'quantity',
      'category',
      'condition',
    ];

    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    query = query
      .order(safeSortBy, { ascending: safeSortOrder === 'asc' })
      .range(from, to);

    // ─── EXECUTE ──────────────────────────────────────────────
    const { data, error, count } = await query;

    if (error) {
      console.error('Admin items query error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const items = data || [];

    // ─── APPLICATION COUNTS ──────────────────────────────────
    if (items.length > 0) {
      const itemIds = items.map((item) => item.id);
      const { data: applications, error: applicationsError } = await supabase
        .from('applications')
        .select('id, item_id, status')
        .in('item_id', itemIds);

      if (applicationsError) {
        console.error('Admin application count error:', applicationsError);
      } else {
        const countMap = new Map();
        for (const app of applications || []) {
          if (!countMap.has(app.item_id)) {
            countMap.set(app.item_id, { total: 0, accepted: 0 });
          }
          const counts = countMap.get(app.item_id);
          counts.total += 1;
          if (app.status === 'accepted') {
            counts.accepted += 1;
          }
        }
        for (const item of items) {
          const counts = countMap.get(item.id) || { total: 0, accepted: 0 };
          item.applications_count = counts.total;
          item.accepted_count = counts.accepted;
        }
      }
    }

    // ─── RESPONSE ─────────────────────────────────────────────
    return res.json({
      success: true,
      items,
      total: count || 0,
      limit,
      offset,
      hasMore: offset + limit < (count || 0),
    });
  } catch (error) {
    console.error('Admin get all items error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
    });
  }
};



/* ============================================================
   ADMIN: MODERATE ITEM
============================================================ */

/**
 * Admin moderation.
 *
 * Supported actions:
 *
 * approve
 * cancel
 * complete
 * feature
 * unfeature
 * allow_apply
 * disable_apply
 * flag
 * unflag
 */
export const adminModerateItem =
  async (req, res) => {
			console.log(req.body)
    try {
      const { itemId } =
        req.params;

      const {
        action,
        reason,
      } = req.body || {};

      if (
        !VALID_MODERATION_ACTIONS.includes(
          action
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid action. Must be: approve, cancel, complete, feature, unfeature, allow_apply, disable_apply, flag, unflag',
        });
      }

      const {
        data: item,
        error: itemError,
      } = await supabase
        .from('items')
        .select(
          `
          id,
          title,
          status,
          donor_id,
          winner_id,
          donor_confirmed_at,
          winner_confirmed_at,
          completed_at,
          featured,
          is_flagged,
          flagged_at,
          flag_reason
          `
        )
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        return res.status(400).json({
          success: false,
          error: itemError.message,
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      let updates = {};
      let message = '';

      const now =
        new Date().toISOString();

      /* ------------------------------------------------------
         APPROVE
      ------------------------------------------------------ */

      switch (action) {
        case 'approve': {
          if (
            item.status !==
            'pending'
          ) {
            return res.status(400).json({
              success: false,
              error:
                'Only pending items can be approved',
            });
          }

          updates.status =
            'active';

          message =
            'Item approved successfully';

          break;
        }

        /* ----------------------------------------------------
           CANCEL
        ---------------------------------------------------- */

        case 'cancel': {
          if (
            item.status ===
              'completed' ||
            item.status ===
              'cancelled' ||
            item.status ===
              'deleted'
          ) {
            return res.status(400).json({
              success: false,
              error:
                'Cannot cancel a completed, deleted, or already cancelled item',
            });
          }

          updates.status =
            'cancelled';

          updates.cancellation_reason =
            reason?.trim() ||
            'Cancelled by admin';

          message =
            'Item cancelled successfully';

          /*
           * Close pending applications.
           */
          const {
            data: pendingApplications,
            error:
              pendingApplicationsError,
          } = await supabase
            .from('applications')
            .select(
              'id, applicant_id'
            )
            .eq(
              'item_id',
              itemId
            )
            .eq(
              'status',
              'pending'
            );

          if (
            pendingApplicationsError
          ) {
            console.error(
              'Error getting pending applications:',
              pendingApplicationsError
            );
          } else {
            await supabase
              .from('applications')
              .update({
                status:
                  'not_selected',
                updated_at:
                  now,
              })
              .eq(
                'item_id',
                itemId
              )
              .eq(
                'status',
                'pending'
              );

            for (const app of
              pendingApplications ||
              []) {
              await safeNotification(
                app.applicant_id,
                'application_rejected',
                'Item Cancelled',
                `"${item.title}" has been cancelled and is no longer available.`,
                {
                  item_id:
                    itemId,
                  application_id:
                    app.id,
                }
              );
            }
          }

          break;
        }

        /* ----------------------------------------------------
           COMPLETE
        ---------------------------------------------------- */

        case 'complete': {
          if (
            item.status ===
            'completed'
          ) {
            return res.status(400).json({
              success: false,
              error:
                'Item is already completed',
            });
          }

          if (
            item.status ===
            'deleted'
          ) {
            return res.status(400).json({
              success: false,
              error:
                'Deleted items cannot be completed',
            });
          }

          updates.status =
            'completed';

          updates.winner_confirmed_at =
            item.winner_confirmed_at ||
            now;

          updates.completed_at =
            item.completed_at ||
            now;

          /*
           * Admin can force completion, so if donor confirmation
           * is missing, create it.
           */
          updates.donor_confirmed_at =
            item.donor_confirmed_at ||
            now;

          message =
            'Item marked as completed by admin';

          /*
           * Find accepted winner.
           */
          if (item.winner_id) {
            const {
              data: acceptedApp,
              error:
                acceptedAppError,
            } = await supabase
              .from('applications')
              .select('id')
              .eq(
                'item_id',
                itemId
              )
              .eq(
                'status',
                'accepted'
              )
              .eq(
                'applicant_id',
                item.winner_id
              )
              .maybeSingle();

            if (
              acceptedAppError
            ) {
              console.error(
                'Error finding accepted application:',
                acceptedAppError
              );
            } else if (
              acceptedApp
            ) {
              const ratingResult =
                await createPendingRatings(
                  item.winner_id,
                  item.donor_id,
                  itemId,
                  acceptedApp.id
                );

              if (
                !ratingResult.success
              ) {
                console.warn(
                  'Admin completion rating creation failed:',
                  ratingResult.error
                );
              }
            } else {
              console.warn(
                'No accepted application found for item:',
                itemId
              );
            }
          }

          /*
           * Close pending applications.
           */
          const {
            data: remainingPending,
          } = await supabase
            .from('applications')
            .select(
              'id, applicant_id'
            )
            .eq(
              'item_id',
              itemId
            )
            .eq(
              'status',
              'pending'
            );

          if (
            remainingPending &&
            remainingPending.length >
              0
          ) {
            await supabase
              .from('applications')
              .update({
                status:
                  'not_selected',
                updated_at:
                  now,
              })
              .eq(
                'item_id',
                itemId
              )
              .eq(
                'status',
                'pending'
              );

            for (const app of
              remainingPending) {
              await safeNotification(
                app.applicant_id,
                'application_rejected',
                'Item Completed',
                `"${item.title}" has been completed and is no longer available.`,
                {
                  item_id:
                    itemId,
                  application_id:
                    app.id,
                }
              );
            }
          }

          break;
        }

        /* ----------------------------------------------------
           FEATURE
        ---------------------------------------------------- */

        case 'feature': {
													const featuredUpdate = {
															is_featured: true,
															featured_at: now,
													};
											
													// If can_apply is explicitly provided, set it
													if (req.body.can_apply !== undefined) {
															featuredUpdate.can_apply = req.body.can_apply;
													}
											
													updates.featured = buildFeaturedUpdate(
															item.featured,
															featuredUpdate
													);
											
													message = 'Item featured successfully';
													break;
											}

        /* ----------------------------------------------------
           UNFEATURE
        ---------------------------------------------------- */

        case 'unfeature': {
          updates.featured =
            buildFeaturedUpdate(
              item.featured,
              {
                is_featured:
                  false,
                featured_at:
                  null,
              }
            );

          message =
            'Item unfeatured successfully';

          break;
        }

        /* ----------------------------------------------------
           ALLOW APPLICATIONS
        ---------------------------------------------------- */

        case 'allow_apply': {
          updates.featured =
            buildFeaturedUpdate(
              item.featured,
              {
                can_apply:
                  true,
              }
            );

          message =
            'Applications enabled successfully';

          break;
        }

        /* ----------------------------------------------------
           DISABLE APPLICATIONS
        ---------------------------------------------------- */

        case 'disable_apply': {
          updates.featured =
            buildFeaturedUpdate(
              item.featured,
              {
                can_apply:
                  false,
              }
            );

          message =
            'Applications disabled successfully';

          break;
        }

        /* ----------------------------------------------------
           FLAG
        ---------------------------------------------------- */

        case 'flag': {
          updates.is_flagged =
            true;

          updates.flagged_at =
            now;

          updates.flag_reason =
            reason?.trim() ||
            'Flagged by admin';

          message =
            'Item flagged successfully';

          break;
        }

        /* ----------------------------------------------------
           UNFLAG
        ---------------------------------------------------- */

        case 'unflag': {
          updates.is_flagged =
            false;

          updates.flagged_at =
            null;

          updates.flag_reason =
            null;

          message =
            'Item unflagged successfully';

          break;
        }

        default:
          break;
      }

      updates.updated_at =
        now;

      /* ------------------------------------------------------
         UPDATE ITEM
      ------------------------------------------------------ */

      const {
        data,
        error,
      } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        console.error(
          'Admin moderation update error:',
          error
        );

        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      /* ------------------------------------------------------
         COMPLETION NOTIFICATIONS
      ------------------------------------------------------ */

      if (
        action ===
        'complete'
      ) {
        await safeNotification(
          item.donor_id,
          'item_completed',
          'Item Completed by Admin',
          `Admin has marked "${item.title}" as completed. Thank you for your donation! 🎉`,
          {
            item_id:
              itemId,
          }
        );

        if (item.winner_id) {
          await safeNotification(
            item.winner_id,
            'item_completed',
            'Item Completed by Admin',
            `Admin has marked "${item.title}" as completed. Thank you for participating! 🎉`,
            {
              item_id:
                itemId,
            }
          );
        }
      }

      /* ------------------------------------------------------
         APPROVAL NOTIFICATION
      ------------------------------------------------------ */

      if (
        action ===
        'approve'
      ) {
        await safeNotification(
          item.donor_id,
          'item_approved',
          'Item Approved',
          `Your item "${item.title}" has been approved and is now available for applications.`,
          {
            item_id:
              itemId,
          }
        );
      }

      /* ------------------------------------------------------
         CANCELLATION NOTIFICATION
      ------------------------------------------------------ */

      if (
        action ===
        'cancel'
      ) {
        await safeNotification(
          item.donor_id,
          'item_cancelled',
          'Item Cancelled',
          `Your item "${item.title}" has been cancelled by an administrator.`,
          {
            item_id:
              itemId,
            reason:
              reason ||
              'Cancelled by admin',
          }
        );
      }

      return res.json({
        success: true,
        message,
        item: data,
      });
    } catch (error) {
      console.error(
        'Admin moderate item error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to moderate item',
      });
    }
  };

/* ============================================================
   ADMIN: DELETE ITEM
============================================================ */

/**
 * Admin delete item.
 *
 * soft delete:
 *   status = deleted
 *
 * hard delete:
 *   permanently removes DB record
 *   and Cloudinary images
 */
export const adminDeleteItem =
  async (req, res) => {
    try {
      const { itemId } =
        req.params;

      const hardDelete =
        req.query.hard_delete ===
        'true';

      const {
        data: existing,
        error: checkError,
      } = await supabase
        .from('items')
        .select(
          'id, images, status'
        )
        .eq('id', itemId)
        .maybeSingle();

      if (checkError) {
        return res.status(400).json({
          success: false,
          error: checkError.message,
        });
      }

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
        });
      }

      /* ------------------------------------------------------
         HARD DELETE
      ------------------------------------------------------ */

      if (hardDelete) {
        const {
          error: deleteError,
        } = await supabase
          .from('items')
          .delete()
          .eq(
            'id',
            itemId
          );

        if (deleteError) {
          return res.status(400).json({
            success: false,
            error:
              deleteError.message,
          });
        }

        /*
         * Only hard deletion removes images from Cloudinary.
         */
        if (
          existing.images &&
          existing.images.length >
            0
        ) {
          await deleteItemImages(
            existing.images
          );
        }

        return res.json({
          success: true,
          message:
            'Item deleted permanently',
        });
      }

      /* ------------------------------------------------------
         SOFT DELETE
      ------------------------------------------------------ */

      const now =
        new Date().toISOString();

      const {
        data,
        error,
      } = await supabase
        .from('items')
        .update({
          status: 'deleted',
          deleted_at: now,
          deleted_by:
            req.user?.id ||
            null,
          updated_at: now,
        })
        .eq(
          'id',
          itemId
        )
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      /*
       * IMPORTANT:
       *
       * Do NOT delete Cloudinary images here.
       * The item still exists in the database and could
       * potentially be restored.
       */

      return res.json({
        success: true,
        message:
          'Item soft deleted successfully',
        item: data,
      });
    } catch (error) {
      console.error(
        'Admin delete item error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to delete item',
      });
    }
  };

/* ============================================================
   ADMIN: GET REPORTED ITEMS
============================================================ */

/**
 * Admin: Get reported/flagged items.
 */
export const adminGetReportedItems =
  async (req, res) => {
    try {
      const {
        status = 'pending',
      } = req.query;

      const {
        limit,
        offset,
        from,
        to,
      } = getPagination(
        req.query
      );

      /*
       * First retrieve flagged items.
       */
      let query = supabase
        .from('items')
        .select(
          `
          *,
          donor:profiles!donor_id(
            id,
            full_name,
            email,
            avatar_url
          ),
          reports:item_reports(
            id,
            reason,
            description,
            status,
            created_at,
            reporter:profiles!reporter_id(
              id,
              full_name,
              email
            )
          )
          `,
          {
            count: 'exact',
          }
        )
        .eq(
          'is_flagged',
          true
        )
        .order(
          'flagged_at',
          {
            ascending: false,
          }
        )
        .range(
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
          'Reported items query error:',
          error
        );

        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      let items =
        data || [];

      /*
       * Filter reports in JavaScript instead of relying on:
       *
       * .eq('reports.status', ...)
       *
       * which can behave unexpectedly with nested arrays.
       */
      if (status) {
        items = items
          .map((item) => {
            const reports =
              normalizeArray(
                item.reports
              ).filter(
                (report) =>
                  report.status ===
                  status
              );

            return {
              ...item,
              reports,
            };
          })
          .filter(
            (item) =>
              item.reports.length >
              0
          );
      }

      return res.json({
        success: true,
        items,
        total:
          status
            ? items.length
            : count || 0,
        limit,
        offset,
        hasMore:
          offset + limit <
          (count || 0),
      });
    } catch (error) {
      console.error(
        'Admin get reported items error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to fetch reported items',
      });
    }
  };