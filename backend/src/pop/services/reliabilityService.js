// backend/src/pop/services/reliabilityService.js

import { supabase } from '../../db/index.js';

// ============================================================
// CREATE RELIABILITY EVENT ONCE
// ============================================================
//
// 4E-5A added the idempotency protection:
//
//   (borrow_request_id, user_id, event_type)
//
// This function guarantees that the same lifecycle event cannot
// be recorded twice.
//
// Returns:
//   { created: true, event }
//   { created: false, event }  <-- already existed
//
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
    throw new Error('userId is required');
  }

  if (!eventType) {
    throw new Error('eventType is required');
  }

  // ----------------------------------------------------------
  // Fast-path lookup
  // ----------------------------------------------------------

  let existingQuery = supabase
    .from('pop_reliability_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .limit(1);

  if (borrowRequestId) {
    existingQuery = existingQuery.eq(
      'borrow_request_id',
      borrowRequestId
    );
  } else {
    existingQuery = existingQuery.is(
      'borrow_request_id',
      null
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await existingQuery.maybeSingle();

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
  // Attempt insert
  // ----------------------------------------------------------

  const { data: inserted, error: insertError } = await supabase
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

  // ----------------------------------------------------------
  // Race-condition protection
  //
  // Another worker/request may have inserted the exact same
  // event between our SELECT and INSERT.
  //
  // PostgreSQL unique constraint from 4E-5A protects us.
  // ----------------------------------------------------------

  if (insertError) {
    const duplicate =
      insertError.code === '23505' ||
      insertError.message?.toLowerCase().includes('duplicate') ||
      insertError.message?.toLowerCase().includes('unique');

    if (duplicate) {
      let duplicateQuery = supabase
        .from('pop_reliability_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', eventType)
        .limit(1);

      if (borrowRequestId) {
        duplicateQuery = duplicateQuery.eq(
          'borrow_request_id',
          borrowRequestId
        );
      } else {
        duplicateQuery = duplicateQuery.is(
          'borrow_request_id',
          null
        );
      }

      const {
        data: duplicateEvent,
        error: duplicateFetchError,
      } = await duplicateQuery.maybeSingle();

      if (duplicateFetchError) {
        throw duplicateFetchError;
      }

      return {
        created: false,
        event: duplicateEvent,
      };
    }

    throw insertError;
  }

  return {
    created: true,
    event: inserted,
  };
};


// ============================================================
// UPDATE REPUTATION COUNTERS
// ============================================================

const incrementReputation = async (userId, increments) => {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Fetch existing reputation.
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
  // Create reputation record if missing
  // ----------------------------------------------------------

  if (!current) {
    const initial = {
      user_id: userId,

      total_borrows: increments.total_borrows || 0,
      successful_borrows: increments.successful_borrows || 0,
      returned_on_time: increments.returned_on_time || 0,
      returned_late: increments.returned_late || 0,
      damaged_items: increments.damaged_items || 0,

      total_jobs: 0,
      successful_jobs: 0,
      disputes: 0,
      repeat_users: 0,

      trust_score: 0,
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
      throw error;
    }

    return data;
  }

  // ----------------------------------------------------------
  // Calculate new counters
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

    total_jobs: Number(current.total_jobs || 0),
    successful_jobs: Number(current.successful_jobs || 0),
    disputes: Number(current.disputes || 0),
    repeat_users: Number(current.repeat_users || 0),

    // Keep existing rating here.
    // Community reviews will handle rating separately.
    rating: Number(current.rating || 0),
  };

  // ----------------------------------------------------------
  // Recalculate trust score
  // ----------------------------------------------------------

  let borrowScore = 0;

  if (next.total_borrows > 0) {
    const onTimeRate =
      next.returned_on_time / next.total_borrows;

    const successRate =
      next.successful_borrows / next.total_borrows;

    borrowScore =
      ((onTimeRate * 0.6) +
        (successRate * 0.4)) * 5;
  }

  let serviceScore = 0;

  if (next.total_jobs > 0) {
    const successRate =
      next.successful_jobs / next.total_jobs;

    const repeatRate = Math.min(
      next.repeat_users / next.total_jobs,
      1
    );

    serviceScore =
      ((successRate * 0.7) +
        (repeatRate * 0.3)) * 5;
  }

  let trustScore = 0;

  if (
    next.total_borrows > 0 &&
    next.total_jobs > 0
  ) {
    trustScore =
      (borrowScore * 0.4) +
      (serviceScore * 0.6);
  } else if (next.total_borrows > 0) {
    trustScore = borrowScore;
  } else if (next.total_jobs > 0) {
    trustScore = serviceScore;
  }

  if (next.damaged_items > 0) {
    trustScore = Math.max(
      0,
      trustScore -
        (next.damaged_items * 0.5)
    );
  }

  if (next.disputes > 0) {
    trustScore = Math.max(
      0,
      trustScore -
        (next.disputes * 0.5)
    );
  }

  trustScore = Math.min(
    5,
    Math.round(trustScore * 100) / 100
  );

  // ----------------------------------------------------------
  // Save
  // ----------------------------------------------------------

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
//
// IMPORTANT:
//
// Reputation counters are changed ONLY when the reliability
// event is newly created.
//
// If the event already exists:
//     created = false
//
// therefore:
//     NO reputation increment.
//
// This prevents duplicate worker executions from inflating
// reputation.
// ============================================================

export const processReliabilityEvent = async ({
  userId,
  borrowRequestId = null,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  const result = await createReliabilityEventOnce({
    userId,
    borrowRequestId,
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
    };
  }

  // ----------------------------------------------------------
  // Lifecycle events that affect borrow counters
  // ----------------------------------------------------------

  let increments = null;

  switch (eventType) {
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

    default:
      // Ghosting, disputes, etc. are recorded in the
      // reliability ledger but do not automatically alter
      // borrow counters here.
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