import { supabase } from '../../db/index.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const DEFAULT_REPUTATION = {
  total_borrows: 0,
  successful_borrows: 0,
  returned_on_time: 0,
  returned_late: 0,
  damaged_items: 0,
  total_jobs: 0,
  successful_jobs: 0,
  disputes: 0,
  repeat_users: 0,
  trust_score: 0,
  rating: 0,
};

const calculateTrustScore = (reputation) => {
  if (!reputation) return 0;

  // ----------------------------------------------------------
  // BORROWING SCORE
  // ----------------------------------------------------------

  let borrowScore = 0;

  const totalBorrows = Number(reputation.total_borrows || 0);

  if (totalBorrows > 0) {
    const onTimeRate =
      Number(reputation.returned_on_time || 0) /
      totalBorrows;

    const successRate =
      Number(reputation.successful_borrows || 0) /
      totalBorrows;

    borrowScore =
      ((onTimeRate * 0.6) +
        (successRate * 0.4)) * 5;
  }

  // ----------------------------------------------------------
  // SERVICE SCORE
  // ----------------------------------------------------------

  let serviceScore = 0;

  const totalJobs = Number(reputation.total_jobs || 0);

  if (totalJobs > 0) {
    const successRate =
      Number(reputation.successful_jobs || 0) /
      totalJobs;

    const repeatRate = Math.min(
      Number(reputation.repeat_users || 0) /
        totalJobs,
      1
    );

    serviceScore =
      ((successRate * 0.7) +
        (repeatRate * 0.3)) * 5;
  }

  // ----------------------------------------------------------
  // WEIGHTED TRUST SCORE
  // ----------------------------------------------------------

  const hasBorrows = totalBorrows > 0;
  const hasJobs = totalJobs > 0;

  let trustScore = 0;

  if (hasBorrows && hasJobs) {
    trustScore =
      (borrowScore * 0.4) +
      (serviceScore * 0.6);
  } else if (hasBorrows) {
    trustScore = borrowScore;
  } else if (hasJobs) {
    trustScore = serviceScore;
  }

  // ----------------------------------------------------------
  // PENALTIES
  // ----------------------------------------------------------

  const damagedItems =
    Number(reputation.damaged_items || 0);

  const disputes =
    Number(reputation.disputes || 0);

  trustScore -= damagedItems * 0.5;
  trustScore -= disputes * 0.5;

  trustScore = Math.max(
    0,
    Math.min(5, trustScore)
  );

  return Math.round(trustScore * 100) / 100;
};


// ============================================================
// CREATE REPUTATION IF MISSING
//
// Internal helper.
// GET requests should NOT create database rows.
// Lifecycle/reputation mutations may use this helper.
// ============================================================

const ensureReputation = async (userId) => {
  if (!userId) {
    throw new Error('userId is required.');
  }

  const {
    data: existing,
    error: fetchError,
  } = await supabase
    .from('pop_reputation')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  const {
    data: created,
    error: createError,
  } = await supabase
    .from('pop_reputation')
    .upsert(
      {
        user_id: userId,
        ...DEFAULT_REPUTATION,
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      }
    )
    .select('*')
    .single();

  if (createError) {
    throw createError;
  }

  return created;
};


// ============================================================
// CALCULATE / UPDATE REPUTATION
//
// Internal service.
// This is NOT exposed as a client-controlled endpoint.
// ============================================================

export const updateReputation = async (
  userId,
  updates = {}
) => {
  if (!userId) {
    throw new Error('userId is required.');
  }

  const current = await ensureReputation(userId);

  const merged = {
    ...current,
    ...updates,
  };

  const trustScore =
    calculateTrustScore(merged);

  const {
    data,
    error,
  } = await supabase
    .from('pop_reputation')
    .update({
      ...updates,
      trust_score: trustScore,
    })
    .eq('id', current.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};


// ============================================================
// CREATE RELIABILITY EVENT ONCE
//
// This remains separate from reputation and reviews.
//
// The DB unique constraint is the final protection against
// duplicate lifecycle events.
// ============================================================

export const createReliabilityEventOnce = async ({
  userId,
  borrowRequestId = null,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  if (!userId) {
    throw new Error('userId is required.');
  }

  if (!eventType) {
    throw new Error('eventType is required.');
  }

  // ----------------------------------------------------------
  // IDEMPOTENT CHECK
  // ----------------------------------------------------------

  if (borrowRequestId) {
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from('pop_reliability_events')
      .select('*')
      .eq(
        'borrow_request_id',
        borrowRequestId
      )
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return {
        created: false,
        data: existing,
      };
    }
  }

  // ----------------------------------------------------------
  // INSERT
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from('pop_reliability_events')
    .insert({
      user_id: userId,
      borrow_request_id:
        borrowRequestId,
      asset_id: assetId,
      event_type: eventType,
      severity,
      description,
      metadata,
    })
    .select('*')
    .single();

  // ----------------------------------------------------------
  // RACE-SAFE UNIQUE VIOLATION HANDLING
  // ----------------------------------------------------------

  if (error?.code === '23505') {
    if (!borrowRequestId) {
      throw error;
    }

    const {
      data: existing,
      error: fetchError,
    } = await supabase
      .from('pop_reliability_events')
      .select('*')
      .eq(
        'borrow_request_id',
        borrowRequestId
      )
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return {
      created: false,
      data: existing,
    };
  }

  if (error) {
    throw error;
  }

  return {
    created: true,
    data,
  };
};


// ============================================================
// GET REPUTATION
//
// READ ONLY.
//
// IMPORTANT:
// This endpoint NEVER creates a pop_reputation row.
// ============================================================

export const getReputation = async (
  req,
  res
) => {
  try {
    const authenticatedUserId =
      getUserId(req);

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const targetUserId =
      req.params.userId ||
      authenticatedUserId;

    const {
      data: reputation,
      error: reputationError,
    } = await supabase
      .from('pop_reputation')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          business_name,
          person_type,
          business_verified,
          is_service_provider
        )
      `)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (reputationError) {
      throw reputationError;
    }

    // --------------------------------------------------------
    // NO ROW = RETURN DEFAULT IN MEMORY
    //
    // Do NOT INSERT.
    // --------------------------------------------------------

    if (!reputation) {
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          business_name,
          person_type,
          business_verified,
          is_service_provider
        `)
        .eq('id', targetUserId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      return res.json({
        success: true,
        data: {
          user_id: targetUserId,
          ...DEFAULT_REPUTATION,
          profiles: profile,
        },
      });
    }

    return res.json({
      success: true,
      data: reputation,
    });

  } catch (error) {
    console.error(
      'getReputation:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch reputation.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};


// ============================================================
// GET TOP PROVIDERS
// ============================================================

export const getTopProviders = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const requestedLimit =
      Number(req.query.limit) || 10;

    const limit = Math.min(
      50,
      Math.max(1, requestedLimit)
    );

    const {
      personType,
    } = req.query;

    let query = supabase
      .from('pop_reputation')
      .select(`
        user_id,
        trust_score,
        rating,
        total_jobs,
        successful_jobs,
        profiles!inner (
          id,
          full_name,
          email,
          avatar_url,
          business_name,
          person_type,
          business_verified,
          is_service_provider
        )
      `)
      .gte('total_jobs', 5)
      .order('trust_score', {
        ascending: false,
      })
      .limit(limit);

    if (personType) {
      query = query.eq(
        'profiles.person_type',
        personType
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      data: data || [],
    });

  } catch (error) {
    console.error(
      'getTopProviders:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch top providers.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};