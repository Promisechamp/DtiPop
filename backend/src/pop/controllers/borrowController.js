import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import { updateReputation } from './reputationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const createReliabilityEventOnce = async ({
  userId,
  borrowRequestId = null,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  if (!userId || !eventType) {
    return {
      created: false,
      data: null,
      error: null,
    };
  }

  let existingQuery = supabase
    .from('pop_reliability_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', eventType);

  existingQuery = borrowRequestId
    ? existingQuery.eq('borrow_request_id', borrowRequestId)
    : existingQuery.is('borrow_request_id', null);

  const {
    data: existing,
    error: existingError,
  } = await existingQuery.maybeSingle();

  if (existingError) {
    console.warn(
      'Reliability duplicate check warning:',
      existingError.message
    );
  }

  if (existing) {
    return {
      created: false,
      data: existing,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('pop_reliability_events')
    .insert({
      user_id: userId,
      borrow_request_id: borrowRequestId,
      asset_id: assetId,
      event_type: eventType,
      severity,
      description,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error(
      'createReliabilityEventOnce:',
      error.message
    );

    return {
      created: false,
      data: null,
      error,
    };
  }

  return {
    created: true,
    data,
    error: null,
  };
};

const processReliabilityEvent = async ({
  userId,
  eventType,
}) => {
  try {
    let updates = {};

    switch (eventType) {
      case 'borrow_completed':
        updates = {
          total_borrows: 1,
          successful_borrows: 1,
        };
        break;

      case 'returned_on_time':
        updates = {
          returned_on_time: 1,
        };
        break;

      case 'returned_late':
        updates = {
          returned_late: 1,
        };
        break;

      case 'item_damaged':
        updates = {
          damaged_items: 1,
        };
        break;

      case 'borrower_ghosted':
        return null;

      default:
        return null;
    }

    const {
      data: current,
      error: currentError,
    } = await supabase
      .from('pop_reputation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (currentError) {
      throw currentError;
    }

    const merged = {
      total_borrows: Number(current?.total_borrows || 0),
      successful_borrows: Number(current?.successful_borrows || 0),
      returned_on_time: Number(current?.returned_on_time || 0),
      returned_late: Number(current?.returned_late || 0),
      damaged_items: Number(current?.damaged_items || 0),
      total_jobs: Number(current?.total_jobs || 0),
      successful_jobs: Number(current?.successful_jobs || 0),
      disputes: Number(current?.disputes || 0),
      repeat_users: Number(current?.repeat_users || 0),
      rating: Number(current?.rating || 0),
    };

    Object.entries(updates).forEach(([key, value]) => {
      merged[key] =
        Number(merged[key] || 0) +
        Number(value || 0);
    });

    return await updateReputation(
      userId,
      merged
    );
  } catch (error) {
    console.error(
      `processReliabilityEvent(${eventType}):`,
      error.message
    );

    return null;
  }
};

const recordAndProcessReliabilityEvent = async ({
  userId,
  borrowRequestId,
  assetId,
  eventType,
  severity,
  description,
  metadata = {},
}) => {
  const result =
    await createReliabilityEventOnce({
      userId,
      borrowRequestId,
      assetId,
      eventType,
      severity,
      description,
      metadata,
    });

  if (!result.created) {
    return {
      event: result.data,
      reputationUpdated: false,
    };
  }

  const reputation =
    await processReliabilityEvent({
      userId,
      borrowRequestId,
      assetId,
      eventType,
    });

  return {
    event: result.data,
    reputationUpdated: Boolean(reputation),
  };
};

// ============================================================
// TRUST SCORE
// ============================================================

export const calculateTrustScore = (reputation) => {
  if (!reputation) {
    return 0;
  }

  let borrowScore = 0;

  const returnedBorrows =
    Number(reputation.returned_on_time || 0) +
    Number(reputation.returned_late || 0);

  if (Number(reputation.total_borrows || 0) > 0) {
    const onTimeRate =
      returnedBorrows > 0
        ? Number(reputation.returned_on_time || 0) /
          returnedBorrows
        : 0;

    const successRate =
      Number(reputation.successful_borrows || 0) /
      Number(reputation.total_borrows);

    borrowScore =
      (onTimeRate * 0.6 +
        successRate * 0.4) *
      5;
  }

  let serviceScore = 0;

  if (Number(reputation.total_jobs || 0) > 0) {
    const successRate =
      Number(reputation.successful_jobs || 0) /
      Number(reputation.total_jobs);

    const repeatRate = Math.min(
      Number(reputation.repeat_users || 0) /
        Number(reputation.total_jobs),
      1
    );

    serviceScore =
      (successRate * 0.7 +
        repeatRate * 0.3) *
      5;
  }

  let trustScore = 0;

  if (
    Number(reputation.total_borrows || 0) > 0 &&
    Number(reputation.total_jobs || 0) > 0
  ) {
    trustScore =
      borrowScore * 0.4 +
      serviceScore * 0.6;
  } else if (
    Number(reputation.total_borrows || 0) > 0
  ) {
    trustScore = borrowScore;
  } else if (
    Number(reputation.total_jobs || 0) > 0
  ) {
    trustScore = serviceScore;
  }

  trustScore = Math.max(
    0,
    trustScore -
      Number(reputation.damaged_items || 0) * 0.5 -
      Number(reputation.disputes || 0) * 0.5
  );

  return Math.min(
    5,
    Math.round(trustScore * 100) / 100
  );
};

// ============================================================
// HOUSEHOLD ACCESS
// ============================================================

const verifyHouseholdMembership = async (
  userId,
  householdId
) => {
  if (!householdId) {
    return { valid: true };
  }

  const {
    data,
    error,
  } = await supabase
    .from('pop_household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error:
        'User is not a member of this household.',
    };
  }

  return {
    valid: true,
    role: data.role,
  };
};

// ============================================================
// BORROW ACCESS
// ============================================================

const validateBorrowAccess = async (
  borrowId,
  userId
) => {
  const {
    data,
    error,
  } = await supabase
    .from('pop_borrow_requests')
    .select(`
      id,
      requester_id,
      owner_id,
      asset_id,
      household_id,
      status,
      accepted_at,
      response_deadline_at,
      borrow_start_date,
      borrow_end_date
    `)
    .eq('id', borrowId)
    .single();

  if (error || !data) {
    return {
      valid: false,
      error: 'Borrow request not found.',
    };
  }

  // Requester and owner always have access.
  if (
    data.requester_id === userId ||
    data.owner_id === userId
  ) {
    return {
      valid: true,
      data,
    };
  }

  // Household members can access household borrow records.
  if (data.household_id) {
    const membership =
      await verifyHouseholdMembership(
        userId,
        data.household_id
      );

    if (membership.valid) {
      return {
        valid: true,
        data,
        role: membership.role,
      };
    }
  }

  return {
    valid: false,
    error:
      'You do not have access to this borrow request.',
  };
};

// ============================================================
// CREATE BORROW REQUEST
// ============================================================

export const createBorrowRequest = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const {
      requestId,
      assetId,
      sharingId,
      ownerId,
      borrowStartDate,
      borrowEndDate,
      notes,
    } = req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: 'Asset is required.',
      });
    }

    if (!sharingId) {
      return res.status(400).json({
        success: false,
        message: 'Lending configuration is required.',
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Owner is required.',
      });
    }

    if (!borrowStartDate || !borrowEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Borrow dates are required.',
      });
    }

    if (userId === ownerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot borrow from yourself.',
      });
    }

    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    const start = new Date(borrowStartDate);
    const end = new Date(borrowEndDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid borrow dates.',
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message:
          'End date must be after start date.',
      });
    }

    // --------------------------------------------------------
    // ASSET
    // --------------------------------------------------------

    const {
      data: asset,
      error: assetError,
    } = await supabase
      .from('pop_assets')
      .select(`
        id,
        household_id,
        name,
        user_id,
        status
      `)
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    if (asset.user_id !== ownerId) {
      return res.status(400).json({
        success: false,
        message:
          'Asset does not belong to the specified owner.',
      });
    }

    if (
      asset.status &&
      [
        'inactive',
        'maintenance',
        'retired',
        'in_use',
      ].includes(asset.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This asset is not currently available.',
      });
    }

    // --------------------------------------------------------
    // SHARING CONFIGURATION
    // --------------------------------------------------------

    const {
      data: sharing,
      error: sharingError,
    } = await supabase
      .from('pop_asset_sharing')
      .select(`
        id,
        asset_id,
        sharing_scope,
        sharing_enabled,
        allow_borrowing,
        max_borrow_days
      `)
      .eq('id', sharingId)
      .eq('asset_id', assetId)
      .eq('sharing_enabled', true)
      .eq('allow_borrowing', true)
      .maybeSingle();

    if (sharingError) {
      throw sharingError;
    }

    if (!sharing) {
      return res.status(400).json({
        success: false,
        message:
          'This lending listing is no longer available for borrowing.',
      });
    }

    // --------------------------------------------------------
    // OWNER CONSISTENCY
    // --------------------------------------------------------

    if (sharing.asset_id !== asset.id) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid lending configuration for this asset.',
      });
    }

    if (asset.user_id !== ownerId) {
      return res.status(400).json({
        success: false,
        message:
          'The specified owner does not own this asset.',
      });
    }

    const sharingScope =
      sharing.sharing_scope || 'household';

    // --------------------------------------------------------
    // ACCESS
    // --------------------------------------------------------

    if (sharingScope === 'household') {
      if (!asset.household_id) {
        return res.status(400).json({
          success: false,
          message:
            'This household asset is missing its household.',
        });
      }

      const membership =
        await verifyHouseholdMembership(
          userId,
          asset.household_id
        );

      if (!membership.valid) {
        return res.status(403).json({
          success: false,
          message:
            'You must be a member of the household to borrow this item.',
        });
      }
    }

    if (sharingScope === 'network') {
      /*
       * IMPORTANT:
       * Implement your actual network-access check here.
       *
       * Do not use household membership as a substitute
       * for network access.
       */
    }

    // Public sharing requires no household membership.

    // --------------------------------------------------------
    // MAX BORROW DAYS
    // --------------------------------------------------------

    if (
      Number(sharing.max_borrow_days || 0) > 0
    ) {
      const durationDays = Math.ceil(
        (end.getTime() - start.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const maxBorrowDays =
        Number(sharing.max_borrow_days);

      if (durationDays > maxBorrowDays) {
        return res.status(400).json({
          success: false,
          message:
            `This asset can only be borrowed for a maximum of ${maxBorrowDays} day${
              maxBorrowDays === 1 ? '' : 's'
            }.`,
        });
      }
    }

    // --------------------------------------------------------
    // EXISTING ACTIVE BORROW
    // --------------------------------------------------------

    const {
      data: existingBorrow,
      error: borrowCheckError,
    } = await supabase
      .from('pop_borrow_requests')
      .select('id, status')
      .eq('asset_id', assetId)
      .in('status', [
        'requested',
        'approved',
        'picked_up',
        'in_use',
        'returned',
      ])
      .limit(1)
      .maybeSingle();

    if (borrowCheckError) {
      throw borrowCheckError;
    }

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message:
          'This asset is currently unavailable for borrowing.',
      });
    }

    // --------------------------------------------------------
    // OPTIONAL COMMUNITY REQUEST
    // --------------------------------------------------------

    if (requestId) {
      const {
        data: request,
        error: requestError,
      } = await supabase
        .from('pop_requests')
        .select(`
          id,
          status,
          request_type,
          user_id
        `)
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found.',
        });
      }

      if (request.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message:
            'You can only use your own community request.',
        });
      }

      if (request.request_type !== 'borrow') {
        return res.status(400).json({
          success: false,
          message:
            'This community request is not a borrow request.',
        });
      }

      if (request.status !== 'open') {
        return res.status(400).json({
          success: false,
          message:
            'This request is no longer open.',
        });
      }
    }

    // --------------------------------------------------------
    // CREATE BORROW
    // --------------------------------------------------------

    const borrowData = {
      request_id: requestId || null,

      // The asset being borrowed.
      asset_id: assetId,

      // The household that owns/contains the asset.
      household_id: asset.household_id,

      // Exact lending/sharing configuration selected
      // from the Community available-to-borrow listing.
      sharing_id: sharing.id,

      requester_id: userId,
      owner_id: ownerId,

      borrow_start_date: borrowStartDate,
      borrow_end_date: borrowEndDate,

      notes: notes?.trim() || null,

      status: 'requested',
    };

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .insert(borrowData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // COMMUNITY REQUEST → IN PROGRESS
    // --------------------------------------------------------

    if (requestId) {
      const {
        error: requestUpdateError,
      } = await supabase
        .from('pop_requests')
        .update({
          status: 'in_progress',
        })
        .eq('id', requestId);

      if (requestUpdateError) {
        console.error(
          'Failed to update community request:',
          requestUpdateError.message
        );
      }
    }

    // --------------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------------

    try {
      await createNotification({
        userId: ownerId,
        type: 'borrow_requested',
        title: 'Borrow request',
        message:
          `A user wants to borrow "${asset.name}" ` +
          `from ${borrowStartDate} to ${borrowEndDate}.`,
        data: {
          borrowRequestId: data.id,
          assetId: asset.id,
          sharingId: sharing.id,
          requesterId: userId,
        },
      });

      await createNotification({
        userId,
        type: 'borrow_requested',
        title: 'Borrow request sent',
        message:
          `You requested to borrow "${asset.name}" ` +
          `from ${borrowStartDate} to ${borrowEndDate}.`,
        data: {
          borrowRequestId: data.id,
          assetId: asset.id,
          sharingId: sharing.id,
          ownerId,
        },
      });
    } catch (notificationError) {
      console.error(
        'Borrow notification error:',
        notificationError.message
      );
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        'Borrow request created successfully.',
      data,
    });
  } catch (error) {
    console.error(
      'createBorrowRequest:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to create borrow request.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};






// ============================================================
// GET BORROW REQUESTS
// ============================================================
export const getBorrowRequests = async (req, res, forcedFilters = {}) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      householdId,
      status,
      assetId,
      requesterId,
      ownerId,
      page = 1,
      limit = 50,
    } = {
      ...req.query,
      ...forcedFilters,
    };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const offset = (pageNumber - 1) * limitNumber;

    // ------------------------------------------------------------
    // Household access
    // ------------------------------------------------------------

    const { data: memberships, error: membershipError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (membershipError) {
      console.error('getBorrowRequests membership error:', membershipError);

      return res.status(500).json({
        success: false,
        message: 'Failed to verify household access',
      });
    }

    const accessibleHouseholdIds = (memberships || [])
      .map((member) => member.household_id)
      .filter(Boolean);

    // ------------------------------------------------------------
    // Validate explicit household filter
    // ------------------------------------------------------------

    if (householdId) {
      if (!accessibleHouseholdIds.includes(householdId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this household',
        });
      }
    }

    // ------------------------------------------------------------
    // Build query
    // ------------------------------------------------------------

    let query = supabase
      .from('pop_borrow_requests')
      .select(`
        *,
        requester:requester_id (
          id,
          full_name,
          avatar_url
        ),
        owner:owner_id (
          id,
          full_name,
          avatar_url
        ),
        pop_assets (
          id,
          name,
          asset_type,
          location,
          status,
          user_id,
          household_id
        ),
        household:household_id (
          id,
          name
        ),
        pop_requests (
          id,
          title,
          description,
          request_type,
          status,
          urgency
        )
      `, { count: 'exact' });

    // ------------------------------------------------------------
    // Visibility
    //
    // 1. User's own requests are always visible.
    // 2. User's own lending requests are always visible.
    // 3. Other requests are visible only inside accessible
    //    households.
    //
    // This is the important fix for public borrows:
    // requester_id = current user does NOT require a household.
    // ------------------------------------------------------------

    const isRequesterQuery = requesterId === userId;
    const isOwnerQuery = ownerId === userId;

    if (!isRequesterQuery && !isOwnerQuery) {
      const visibilityParts = [
        `requester_id.eq.${userId}`,
        `owner_id.eq.${userId}`,
      ];

      if (accessibleHouseholdIds.length) {
        visibilityParts.push(
          `household_id.in.(${accessibleHouseholdIds.join(',')})`
        );
      }

      query = query.or(visibilityParts.join(','));
    }

    // ------------------------------------------------------------
    // Filters
    // ------------------------------------------------------------

    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (requesterId) {
      query = query.eq('requester_id', requesterId);
    }

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    // ------------------------------------------------------------
    // Pagination
    // ------------------------------------------------------------

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNumber - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('getBorrowRequests error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch borrow requests',
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNumber),
      },
    });
  } catch (error) {
    console.error('getBorrowRequests server error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching borrow requests',
    });
  }
};




// ============================================================
// GET SINGLE BORROW REQUEST
// ============================================================

export const getBorrowRequest = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .select(`
        *,
        requester:profiles!pop_borrow_requests_requester_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        owner:profiles!pop_borrow_requests_owner_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        pop_assets (
          id,
          name,
          asset_type,
          location,
          condition,
          status
        ),
        pop_households (
          id,
          name,
          household_type
        ),
        pop_requests (
          id,
          title,
          description,
          request_type,
          status
        ),
        pop_community_reviews (
          id,
          reviewer_id,
          reviewed_user_id,
          review_type,
          rating,
          review_text,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message:
          'Borrow request not found.',
      });
    }

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      'getBorrowRequest:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch borrow request.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// SELECT BORROWER
// ============================================================

export const selectBorrower = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          'Borrow request ID is required.',
      });
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      'pop_select_borrower',
      {
        p_borrow_request_id: id,
        p_owner_id: userId,
      }
    );

    if (error) {
      console.error(
        'selectBorrower RPC:',
        error
      );

      const message =
        error.message || '';

      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message:
            'Borrow request not found.',
        });
      }

      if (
        message.includes(
          'Only the asset owner'
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Only the asset owner can select a borrower.',
        });
      }

      if (
        message.includes(
          'already been selected'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Another borrower has already been selected for this asset.',
        });
      }

      if (
        message.includes(
          'no longer available'
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This borrow request is no longer available for selection.',
        });
      }

      throw error;
    }

    const selected = data?.selected;

    if (!selected) {
      return res.status(500).json({
        success: false,
        message:
          'Borrower selection failed.',
      });
    }

    try {
      await createNotification({
        userId:
          selected.requester_id,
        type:
          'borrow_selected',
        title:
          'You were selected',
        message:
          'You have been selected to borrow the requested item. You have 48 hours to respond.',
        data: {
          borrowRequestId:
            selected.id,
          assetId:
            selected.asset_id,
          responseDeadlineAt:
            selected.response_deadline_at,
        },
      });

      await createNotification({
        userId:
          selected.owner_id,
        type:
          'borrow_selected',
        title:
          'Borrower selected',
        message:
          'You selected a borrower. They have 48 hours to respond.',
        data: {
          borrowRequestId:
            selected.id,
          assetId:
            selected.asset_id,
          borrowerId:
            selected.requester_id,
          responseDeadlineAt:
            selected.response_deadline_at,
        },
      });
    } catch (notificationError) {
      console.error(
        'Borrow selection notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        'Borrower selected successfully.',
      data: selected,
      rejectedCount:
        data.rejected_count || 0,
      responseDeadlineAt:
        selected.response_deadline_at,
    });
  } catch (error) {
    console.error(
      'selectBorrower:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to select borrower.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// ACCEPT BORROW SELECTION
// ============================================================

export const acceptBorrowSelection = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error:
          'Authentication required.',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error:
          'Borrow request ID is required.',
      });
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      'pop_accept_borrow_selection',
      {
        p_borrow_request_id: id,
        p_borrower_id: userId,
      }
    );

    if (error) {
      console.error(
        'acceptBorrowSelection RPC error:',
        error
      );

      if (error.code === 'P0002') {
        return res.status(404).json({
          success: false,
          error:
            'Borrow request not found.',
        });
      }

      if (error.code === 'P0003') {
        return res.status(403).json({
          success: false,
          error:
            'You are not the selected borrower.',
        });
      }

      if (error.code === 'P0004') {
        return res.status(409).json({
          success: false,
          error:
            'This borrow selection is no longer awaiting acceptance.',
        });
      }

      if (error.code === 'P0005') {
        return res.status(410).json({
          success: false,
          error:
            'The 48-hour response window has expired.',
          ghosted: true,
        });
      }

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          'Failed to accept borrow selection.',
      });
    }

    const borrowRequest =
      data?.borrowRequest;

    if (borrowRequest?.owner_id) {
      try {
        await createNotification({
          userId:
            borrowRequest.owner_id,
          type:
            'borrow_selection_accepted',
          title:
            'Borrow request accepted',
          message:
            'The borrower has accepted your borrow selection.',
          data: {
            borrowRequestId:
              borrowRequest.id,
            assetId:
              borrowRequest.asset_id,
            borrowerId:
              borrowRequest.requester_id,
          },
        });
      } catch (notificationError) {
        console.error(
          'Failed to notify lender:',
          notificationError.message
        );
      }
    }

    return res.json({
      success: true,
      message:
        'Borrow selection accepted successfully.',
      borrowRequest,
    });
  } catch (error) {
    console.error(
      'acceptBorrowSelection:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Failed to accept borrow selection.',
    });
  }
};

// ============================================================
// MARK AS PICKED UP
// ============================================================

export const markPickedUp = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      conditionBefore,
      borrowerReceivedNotes,
    } = req.body;

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    if (
      access.data.requester_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the requester can mark this as picked up.',
      });
    }

    if (
      access.data.status !==
      'approved'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow request cannot be marked as picked up.',
      });
    }

    if (!access.data.accepted_at) {
      return res.status(400).json({
        success: false,
        message:
          'The borrower must accept the selection before pickup.',
      });
    }

    const update = {
      status: 'picked_up',
      picked_up_at:
        new Date().toISOString(),
    };

    if (conditionBefore) {
      update.condition_before =
        conditionBefore.trim();
    }

    if (borrowerReceivedNotes) {
      update.borrower_received_notes =
        borrowerReceivedNotes.trim();
    }

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const {
      error: assetError,
    } = await supabase
      .from('pop_assets')
      .update({
        status: 'in_use',
      })
      .eq('id', data.asset_id);

    if (assetError) {
      console.error(
        'Failed to update asset after pickup:',
        assetError.message
      );
    }

    try {
      await createNotification({
        userId: data.owner_id,
        type: 'borrow_picked_up',
        title: 'Item picked up',
        message:
          'The item has been picked up by the requester.',
        data: {
          borrowRequestId: data.id,
          assetId: data.asset_id,
        },
      });
    } catch (notificationError) {
      console.error(
        'Pickup notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        'Item marked as picked up.',
      data,
    });
  } catch (error) {
    console.error(
      'markPickedUp:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark as picked up.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// MARK AS IN USE
// ============================================================

export const markInUse = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const { id } = req.params;

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    if (
      access.data.requester_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the requester can mark this as in use.',
      });
    }

    if (
      access.data.status !==
      'picked_up'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow request cannot be marked as in use.',
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .update({
        status: 'in_use',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      message:
        'Item marked as in use.',
      data,
    });
  } catch (error) {
    console.error(
      'markInUse:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark as in use.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// MARK AS RETURNED
// ============================================================

export const markReturned = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      conditionAfter,
      borrowerReturnNotes,
    } = req.body;

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    if (
      access.data.requester_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the requester can mark this as returned.',
      });
    }

    if (
      ![
        'picked_up',
        'in_use',
      ].includes(
        access.data.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow request cannot be marked as returned.',
      });
    }

    const now = new Date();
    const endDate =
      new Date(
        access.data.borrow_end_date
      );

    const wasLate = now > endDate;

    const update = {
      status: 'returned',
      returned_at:
        now.toISOString(),
    };

    if (conditionAfter) {
      update.condition_after =
        conditionAfter.trim();
    }

    if (borrowerReturnNotes) {
      update.borrower_return_notes =
        borrowerReturnNotes.trim();
    }

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const reliabilityResult =
      await recordAndProcessReliabilityEvent({
        userId:
          data.requester_id,
        borrowRequestId:
          data.id,
        assetId:
          data.asset_id,
        eventType:
          wasLate
            ? 'returned_late'
            : 'returned_on_time',
        severity:
          wasLate
            ? 'negative'
            : 'positive',
        description:
          wasLate
            ? 'Borrowed item was returned after the agreed return date.'
            : 'Borrowed item was returned on time.',
        metadata: {
          borrowEndDate:
            data.borrow_end_date,
          returnedAt:
            data.returned_at,
        },
      });

    try {
      await createNotification({
        userId:
          data.owner_id,
        type: 'borrow_returned',
        title: 'Item returned',
        message:
          'The item has been returned to you and is awaiting your confirmation.',
        data: {
          borrowRequestId:
            data.id,
          assetId:
            data.asset_id,
          wasLate,
        },
      });
    } catch (notificationError) {
      console.error(
        'Return notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        'Item marked as returned.',
      data,
      wasLate,
      reliabilityEvent:
        reliabilityResult.event,
    });
  } catch (error) {
    console.error(
      'markReturned:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark as returned.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// MARK AS COMPLETED
// ============================================================

export const markCompleted = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      ownerReturnConfirmationNotes,
    } = req.body;

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    if (
      access.data.owner_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the owner can mark this as completed.',
      });
    }

    if (
      access.data.status !==
      'returned'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow request cannot be marked as completed.',
      });
    }

    const update = {
      status: 'completed',
      review_eligible_at:
        new Date().toISOString(),
    };

    if (
      ownerReturnConfirmationNotes
    ) {
      update.owner_return_confirmation_notes =
        ownerReturnConfirmationNotes.trim();
    }

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const {
      error: assetError,
    } = await supabase
      .from('pop_assets')
      .update({
        status: 'active',
      })
      .eq('id', data.asset_id);

    if (assetError) {
      console.error(
        'Failed to reactivate asset:',
        assetError.message
      );
    }

    if (data.request_id) {
      const {
        error: requestError,
      } = await supabase
        .from('pop_requests')
        .update({
          status: 'fulfilled',
        })
        .eq(
          'id',
          data.request_id
        );

      if (requestError) {
        console.error(
          'Failed to fulfill community request:',
          requestError.message
        );
      }
    }

    const reliabilityResult =
      await recordAndProcessReliabilityEvent({
        userId:
          data.requester_id,
        borrowRequestId:
          data.id,
        assetId:
          data.asset_id,
        eventType:
          'borrow_completed',
        severity:
          'positive',
        description:
          'Borrow was completed successfully after the item was returned.',
        metadata: {
          completedAt:
            new Date().toISOString(),
        },
      });

    try {
      await createNotification({
        userId:
          data.requester_id,
        type:
          'borrow_completed',
        title:
          'Borrow completed',
        message:
          'The borrow has been completed. You can now leave a community review.',
        data: {
          borrowRequestId:
            data.id,
          assetId:
            data.asset_id,
          reviewEligibleAt:
            data.review_eligible_at,
        },
      });

      await createNotification({
        userId:
          data.owner_id,
        type:
          'borrow_completed',
        title:
          'Borrow completed',
        message:
          'The borrow has been completed. You can now leave a community review.',
        data: {
          borrowRequestId:
            data.id,
          assetId:
            data.asset_id,
          reviewEligibleAt:
            data.review_eligible_at,
        },
      });
    } catch (notificationError) {
      console.error(
        'Completion notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        'Borrow completed successfully.',
      data,
      reliabilityEvent:
        reliabilityResult.event,
      reviewEligibleAt:
        data.review_eligible_at,
    });
  } catch (error) {
    console.error(
      'markCompleted:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to mark as completed.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// CANCEL BORROW REQUEST
// ============================================================

export const cancelBorrowRequest = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    if (
      access.data.requester_id !==
        userId &&
      access.data.owner_id !==
        userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You cannot cancel this borrow request.',
      });
    }

    if (
      ![
        'requested',
        'approved',
      ].includes(
        access.data.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow request cannot be cancelled.',
      });
    }

    const update = {
      status: 'cancelled',
      cancelled_at:
        new Date().toISOString(),
    };

    if (reason?.trim()) {
      update.notes =
        `Cancelled: ${reason.trim()}`;
    }

    const {
      data,
      error,
    } = await supabase
      .from('pop_borrow_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    try {
      const otherPartyId =
        userId === data.requester_id
          ? data.owner_id
          : data.requester_id;

      await createNotification({
        userId:
          otherPartyId,
        type:
          'borrow_cancelled',
        title:
          'Borrow cancelled',
        message:
          'The borrow request has been cancelled.',
        data: {
          borrowRequestId:
            data.id,
          assetId:
            data.asset_id,
        },
      });
    } catch (notificationError) {
      console.error(
        'Cancellation notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message:
        'Borrow request cancelled.',
      data,
    });
  } catch (error) {
    console.error(
      'cancelBorrowRequest:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to cancel borrow request.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// EXPIRE SELECTED BORROWER
// ============================================================

export const expireBorrowSelection = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error:
          'Authentication required.',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error:
          'Borrow request ID is required.',
      });
    }

    const access =
      await validateBorrowAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        error: access.error,
      });
    }

    if (
      access.data.owner_id !==
        userId &&
      access.role !== 'owner' &&
      access.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Only the lender can expire this selection.',
      });
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      'pop_ghost_borrow_selection',
      {
        p_borrow_request_id: id,
      }
    );

    if (error) {
      console.error(
        'expireBorrowSelection RPC error:',
        error
      );

      if (error.code === 'P0002') {
        return res.status(404).json({
          success: false,
          error:
            'Borrow request not found.',
        });
      }

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          'Failed to expire borrow selection.',
      });
    }

    if (!data?.ghosted) {
      return res.status(409).json({
        success: false,
        ghosted: false,
        error:
          data?.reason ||
          'Borrow selection cannot be expired yet.',
        responseDeadlineAt:
          data?.responseDeadlineAt ||
          null,
      });
    }

    const borrowRequest =
      data.borrowRequest;

    try {
      await createNotification({
        userId:
          borrowRequest.requester_id,
        type:
          'borrower_ghosted',
        title:
          'Borrow selection expired',
        message:
          'You did not respond to the borrow selection within 48 hours. The lender may now select another borrower.',
        data: {
          borrowRequestId:
            borrowRequest.id,
          assetId:
            borrowRequest.asset_id,
          ghostedAt:
            borrowRequest.ghosted_at,
        },
      });

      await createNotification({
        userId:
          borrowRequest.owner_id,
        type:
          'borrow_selection_expired',
        title:
          'Borrower did not respond',
        message:
          'The selected borrower did not respond within 48 hours. You can now select another borrower.',
        data: {
          borrowRequestId:
            borrowRequest.id,
          assetId:
            borrowRequest.asset_id,
          ghostedAt:
            borrowRequest.ghosted_at,
        },
      });
    } catch (notificationError) {
      console.error(
        'Ghosting notification error:',
        notificationError.message
      );
    }

    return res.json({
      success: true,
      ghosted: true,
      message:
        'Borrow selection expired and the borrower was recorded as ghosted.',
      borrowRequest,
      reliabilityEvent:
        data.reliabilityEvent || null,
      reputation:
        data.reputation || null,
    });
  } catch (error) {
    console.error(
      'expireBorrowSelection:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Failed to expire borrow selection.',
    });
  }
};

// ============================================================
// MY BORROWS
// ============================================================

export const getMyBorrowRequests = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  return getBorrowRequests(req, res, {
    requesterId: userId,
  });
};



// ============================================================
// MY LENDS
// ============================================================

export const getMyLendRequests = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  return getBorrowRequests(req, res, {
    ownerId: userId,
  });
};




// ============================================================
// PUBLIC BORROW HISTORY
// ============================================================
//
// Community-safe borrowing history for a user's public profile.
//
// This intentionally does NOT use getBorrowRequests() because
// that endpoint is private and household-aware.
//
// Only completed borrowing activity is exposed publicly.
// ============================================================

export const getPublicBorrowHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const {
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(
      1,
      Number(page) || 1
    );

    const pageSize = Math.min(
      50,
      Math.max(
        1,
        Number(limit) || 20
      )
    );

    const offset =
      (pageNumber - 1) * pageSize;

    // --------------------------------------------------------
    // PUBLIC COMMUNITY HISTORY
    // --------------------------------------------------------
    //
    // Only completed borrows where this user is the asset owner.
    //
    // Private household information is intentionally excluded.
    // --------------------------------------------------------

    const {
      data,
      error,
      count,
    } = await supabase
      .from('pop_borrow_requests')
      .select(
        `
          id,
          asset_id,
          requester_id,
          owner_id,
          borrow_start_date,
          borrow_end_date,
          status,
          picked_up_at,
          returned_at,
          review_eligible_at,
          condition_before,
          condition_after,

          requester:profiles!pop_borrow_requests_requester_id_fkey (
            id,
            full_name,
            avatar_url,
            business_name,
            person_type
          ),

          pop_assets (
            id,
            name,
            asset_type,
            condition
          )
        `,
        { count: 'exact' }
      )
      .eq('owner_id', userId)
      .eq('status', 'completed')
      .order('borrow_end_date', {
        ascending: false,
      })
      .range(
        offset,
        offset + pageSize - 1
      );

    if (error) {
      console.error(
        'getPublicBorrowHistory:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch public borrow history.',
      });
    }

    // --------------------------------------------------------
    // SAFE PUBLIC RESPONSE
    // --------------------------------------------------------

    const history = (data || []).map(
      (borrow) => ({
        id: borrow.id,

        asset: borrow.pop_assets
          ? {
              id: borrow.pop_assets.id,
              name: borrow.pop_assets.name,
              assetType:
                borrow.pop_assets.asset_type,
              condition:
                borrow.pop_assets.condition,
            }
          : null,

        borrower: borrow.requester
          ? {
              id: borrow.requester.id,
              fullName:
                borrow.requester.full_name,
              avatarUrl:
                borrow.requester.avatar_url,
              businessName:
                borrow.requester.business_name,
              personType:
                borrow.requester.person_type,
            }
          : null,

        borrowStartDate:
          borrow.borrow_start_date,

        borrowEndDate:
          borrow.borrow_end_date,

        pickedUpAt:
          borrow.picked_up_at,

        returnedAt:
          borrow.returned_at,

        conditionBefore:
          borrow.condition_before,

        conditionAfter:
          borrow.condition_after,

        status: borrow.status,
      })
    );

    return res.json({
      success: true,
      data: history,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        totalPages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      'getPublicBorrowHistory server error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while fetching public borrow history.',
    });
  }
};