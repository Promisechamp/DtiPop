import { supabase } from '../../db/index.js';

// ============================================================
// CREATE RELIABILITY EVENT ONCE
// ============================================================
//
// Borrow event identity:
//   borrow_request_id + user_id + event_type
//
// Service event identity:
//   request_id + request_provider_id + user_id + event_type
//
// The database UNIQUE constraint remains the final protection
// against race conditions.
//
// IMPORTANT:
// Reputation counters are updated only when `created === true`.
// ============================================================

export const createReliabilityEventOnce = async ({
  userId,
  borrowRequestId = null,
  requestId = null,
  requestProviderId = null,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  if (!userId) {
    throw new Error('userId is required');
  }

  if (!eventType) {
    throw new Error('eventType is required');
  }

  // ----------------------------------------------------------
  // Validate event identity
  // ----------------------------------------------------------

  if (requestProviderId && !requestId) {
    throw new Error(
      'requestId is required when requestProviderId is supplied'
    );
  }

  // ----------------------------------------------------------
  // Build identity query
  // ----------------------------------------------------------

  const buildIdentityQuery = () => {
    let query = supabase
      .from('pop_reliability_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', eventType);

    if (borrowRequestId) {
      query = query.eq(
        'borrow_request_id',
        borrowRequestId
      );
    } else if (requestId && requestProviderId) {
      query = query
        .eq('request_id', requestId)
        .eq('request_provider_id', requestProviderId);
    } else if (requestId) {
      query = query
        .eq('request_id', requestId)
        .is('request_provider_id', null);
    } else {
      query = query
        .is('borrow_request_id', null)
        .is('request_id', null)
        .is('request_provider_id', null);
    }

    return query.limit(1);
  };

  // ----------------------------------------------------------
  // Fast-path lookup
  // ----------------------------------------------------------

  const {
    data: existing,
    error: existingError,
  } = await buildIdentityQuery().maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return {
      created: false,
      event: existing,
    };
  }

  // ----------------------------------------------------------
  // Insert
  // ----------------------------------------------------------

  const { data: inserted, error: insertError } = await supabase
    .from('pop_reliability_events')
    .insert({
      user_id: userId,
      borrow_request_id: borrowRequestId,
      request_id: requestId,
      request_provider_id: requestProviderId,
      asset_id: assetId,
      event_type: eventType,
      severity,
      description,
      metadata,
    })
    .select()
    .single();

  // ----------------------------------------------------------
  // Race-condition protection
  // ----------------------------------------------------------

  if (insertError) {
    const duplicate =
      insertError.code === '23505' ||
      insertError.message
        ?.toLowerCase()
        .includes('duplicate') ||
      insertError.message
        ?.toLowerCase()
        .includes('unique');

    if (!duplicate) {
      throw insertError;
    }

    const {
      data: duplicateEvent,
      error: duplicateFetchError,
    } = await buildIdentityQuery().maybeSingle();

    if (duplicateFetchError) {
      throw duplicateFetchError;
    }

    if (!duplicateEvent) {
      throw insertError;
    }

    return {
      created: false,
      event: duplicateEvent,
    };
  }

  return {
    created: true,
    event: inserted,
  };
};

// ============================================================
// CALCULATE TRUST SCORE
// ============================================================

const calculateTrustScore = ({
  totalBorrows = 0,
  successfulBorrows = 0,
  returnedOnTime = 0,
  damagedItems = 0,
  totalJobs = 0,
  successfulJobs = 0,
  repeatUsers = 0,
  disputes = 0,
}) => {
  let borrowScore = 0;

  if (totalBorrows > 0) {
    const onTimeRate =
      returnedOnTime / totalBorrows;

    const successRate =
      successfulBorrows / totalBorrows;

    borrowScore =
      ((onTimeRate * 0.6) +
        (successRate * 0.4)) * 5;
  }

  let serviceScore = 0;

  if (totalJobs > 0) {
    const successRate =
      successfulJobs / totalJobs;

    const repeatRate = Math.min(
      repeatUsers / totalJobs,
      1
    );

    serviceScore =
      ((successRate * 0.7) +
        (repeatRate * 0.3)) * 5;
  }

  let trustScore = 0;

  if (totalBorrows > 0 && totalJobs > 0) {
    trustScore =
      (borrowScore * 0.4) +
      (serviceScore * 0.6);
  } else if (totalBorrows > 0) {
    trustScore = borrowScore;
  } else if (totalJobs > 0) {
    trustScore = serviceScore;
  }

  if (damagedItems > 0) {
    trustScore = Math.max(
      0,
      trustScore - damagedItems * 0.5
    );
  }

  if (disputes > 0) {
    trustScore = Math.max(
      0,
      trustScore - disputes * 0.5
    );
  }

  return Math.min(
    5,
    Math.round(trustScore * 100) / 100
  );
};

// ============================================================
// UPDATE REPUTATION COUNTERS
// ============================================================

const incrementReputation = async (
  userId,
  increments
) => {
  if (!userId) {
    throw new Error('userId is required');
  }

  const {
    data: current,
    error: fetchError,
  } = await supabase
    .from('pop_reputation')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  // ----------------------------------------------------------
  // Create reputation row
  // ----------------------------------------------------------

  if (!current) {
    const totalBorrows =
      Number(increments.total_borrows || 0);

    const successfulBorrows =
      Number(increments.successful_borrows || 0);

    const returnedOnTime =
      Number(increments.returned_on_time || 0);

    const damagedItems =
      Number(increments.damaged_items || 0);

    const totalJobs =
      Number(increments.total_jobs || 0);

    const successfulJobs =
      Number(increments.successful_jobs || 0);

    const disputes =
      Number(increments.disputes || 0);

    const repeatUsers =
      Number(increments.repeat_users || 0);

    const trustScore = calculateTrustScore({
      totalBorrows,
      successfulBorrows,
      returnedOnTime,
      damagedItems,
      totalJobs,
      successfulJobs,
      repeatUsers,
      disputes,
    });

    const initial = {
      user_id: userId,

      total_borrows: totalBorrows,
      successful_borrows: successfulBorrows,
      returned_on_time: returnedOnTime,
      returned_late:
        Number(increments.returned_late || 0),
      damaged_items: damagedItems,

      total_jobs: totalJobs,
      successful_jobs: successfulJobs,
      disputes,
      repeat_users: repeatUsers,

      trust_score: trustScore,

      // Rating belongs to the review system.
      rating: 0,
    };

    const {
      data,
      error,
    } = await supabase
      .from('pop_reputation')
      .insert(initial)
      .select()
      .single();

    if (error) {
      // Another request may have created the row first.
      if (error.code === '23505') {
        return incrementReputation(userId, increments);
      }

      throw error;
    }

    return data;
  }

  // ----------------------------------------------------------
  // Calculate next counters
  // ----------------------------------------------------------

  const next = {
    total_borrows:
      Number(current.total_borrows || 0) +
      Number(increments.total_borrows || 0),

    successful_borrows:
      Number(current.successful_borrows || 0) +
      Number(increments.successful_borrows || 0),

    returned_on_time:
      Number(current.returned_on_time || 0) +
      Number(increments.returned_on_time || 0),

    returned_late:
      Number(current.returned_late || 0) +
      Number(increments.returned_late || 0),

    damaged_items:
      Number(current.damaged_items || 0) +
      Number(increments.damaged_items || 0),

    total_jobs:
      Number(current.total_jobs || 0) +
      Number(increments.total_jobs || 0),

    successful_jobs:
      Number(current.successful_jobs || 0) +
      Number(increments.successful_jobs || 0),

    disputes:
      Number(current.disputes || 0) +
      Number(increments.disputes || 0),

    repeat_users:
      Number(current.repeat_users || 0) +
      Number(increments.repeat_users || 0),

    // Never overwrite rating here.
    rating: Number(current.rating || 0),
  };

  const trustScore = calculateTrustScore({
    totalBorrows: next.total_borrows,
    successfulBorrows: next.successful_borrows,
    returnedOnTime: next.returned_on_time,
    damagedItems: next.damaged_items,
    totalJobs: next.total_jobs,
    successfulJobs: next.successful_jobs,
    repeatUsers: next.repeat_users,
    disputes: next.disputes,
  });

  const {
    data,
    error,
  } = await supabase
    .from('pop_reputation')
    .update({
      total_borrows: next.total_borrows,
      successful_borrows: next.successful_borrows,
      returned_on_time: next.returned_on_time,
      returned_late: next.returned_late,
      damaged_items: next.damaged_items,

      total_jobs: next.total_jobs,
      successful_jobs: next.successful_jobs,
      disputes: next.disputes,
      repeat_users: next.repeat_users,

      trust_score: trustScore,
    })
    .eq('id', current.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// ============================================================
// PROCESS RELIABILITY EVENT
// ============================================================

export const processReliabilityEvent = async ({
  userId,
  borrowRequestId = null,
  requestId = null,
  requestProviderId = null,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  const result = await createReliabilityEventOnce({
    userId,
    borrowRequestId,
    requestId,
    requestProviderId,
    assetId,
    eventType,
    severity,
    description,
    metadata,
  });

  // Already processed.
  if (!result.created) {
    return {
      created: false,
      reputationUpdated: false,
      event: result.event,
      reputation: null,
    };
  }

  let increments = null;

  switch (eventType) {
    // --------------------------------------------------------
    // BORROW
    // --------------------------------------------------------

    case 'borrow_completed':
      increments = {
        total_borrows: 1,
        successful_borrows: 1,
      };
      break;

    case 'returned_on_time':
      increments = {
        returned_on_time: 1,
      };
      break;

    case 'returned_late':
      increments = {
        returned_late: 1,
      };
      break;

    case 'item_damaged':
      increments = {
        damaged_items: 1,
      };
      break;

    // --------------------------------------------------------
    // SERVICE
    // --------------------------------------------------------

    case 'service_completed':
      increments = {
        total_jobs: 1,
        successful_jobs: 1,
      };
      break;

    // --------------------------------------------------------
    // LEDGER-ONLY EVENTS
    // --------------------------------------------------------

    case 'borrower_ghosted':
    case 'lender_ghosted':
    case 'dispute_opened':
    case 'dispute_resolved':
    case 'service_cancelled':
    case 'provider_ghosted':
    case 'requester_ghosted':
    default:
      increments = null;
      break;
  }

  let reputation = null;

  if (increments) {
    reputation = await incrementReputation(
      userId,
      increments
    );
  }

  return {
    created: true,
    reputationUpdated: Boolean(increments),
    event: result.event,
    reputation,
  };
};

// ============================================================
// SERVICE COMPLETED
// ============================================================
//
// Single public helper for service / repair / maintenance
// completion.
// ============================================================

export const recordServiceCompleted = async ({
  userId,
  requestId,
  requestProviderId,
  assetId = null,
  requestType = null,
  title = null,
}) => {
  if (!userId) {
    throw new Error('userId is required');
  }

  if (!requestId) {
    throw new Error('requestId is required');
  }

  if (!requestProviderId) {
    throw new Error('requestProviderId is required');
  }

  return processReliabilityEvent({
    userId,
    requestId,
    requestProviderId,
    assetId,
    eventType: 'service_completed',
    severity: 'positive',
    description: title
      ? `Completed request: ${title}`
      : 'Service request completed.',
    metadata: {
      request_type: requestType,
    },
  });
};