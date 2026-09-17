import { supabaseAdmin } from '../../db/index.js';

/**
 * POP Borrow Lifecycle Worker
 *
 * Handles time-based borrow lifecycle transitions:
 *
 * 1. Unanswered lender requests -> lender ghosted
 * 2. Selected borrower who doesn't respond -> borrower ghosted
 * 3. Releases assets after borrower ghosting
 * 4. Marks ghosted requests as eligible for review
 *
 * The worker is designed to be safely repeatable:
 * - lifecycle updates use conditional WHERE clauses
 * - reliability events are checked before insertion
 * - borrower ghosting explicitly requires accepted_at IS NULL
 *
 * NOTE:
 * This worker is still an application-level process. For true
 * cross-instance atomicity, the lifecycle transitions should eventually
 * move into PostgreSQL RPCs/transactions.
 */

// ============================================================
// CONFIG
// ============================================================

const WORKER_INTERVAL_MS = 60 * 1000; // every 60 seconds

let workerTimer = null;
let workerRunning = false;

// ============================================================
// RELIABILITY EVENTS
// ============================================================

/**
 * Create a reliability event only if the same event has not already
 * been recorded for this borrow request/user/event type.
 *
 * This prevents normal worker retries from creating duplicate events.
 *
 * NOTE:
 * Without a database UNIQUE constraint, this is idempotent for normal
 * sequential/repeated worker runs, but it is not completely race-proof
 * across multiple worker processes.
 */
const createReliabilityEventOnce = async ({
  userId,
  borrowRequestId,
  assetId = null,
  eventType,
  severity = 'neutral',
  description = null,
  metadata = {},
}) => {
  if (!userId || !borrowRequestId || !eventType) {
    return {
      created: false,
      data: null,
      error: null,
    };
  }

  // ----------------------------------------------------------
  // Check whether this exact event already exists.
  // ----------------------------------------------------------

  const {
    data: existing,
    error: existingError,
  } = await supabaseAdmin
    .from('pop_reliability_events')
    .select('id')
    .eq('user_id', userId)
    .eq('borrow_request_id', borrowRequestId)
    .eq('event_type', eventType)
    .maybeSingle();

  if (existingError) {
    console.error(
      `❌ Reliability event duplicate check failed for ${borrowRequestId}:`,
      existingError
    );

    return {
      created: false,
      data: null,
      error: existingError,
    };
  }

  if (existing) {
    return {
      created: false,
      data: existing,
      error: null,
    };
  }

  // ----------------------------------------------------------
  // Create event.
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabaseAdmin
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
      `❌ Failed to create reliability event ${eventType} for ${borrowRequestId}:`,
      error
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

// ============================================================
// LENDER GHOSTING
// ============================================================

const processLenderGhosting = async () => {
  const now = new Date().toISOString();

  /**
   * A lender has ghosted when:
   *
   * - request is still requested
   * - response deadline has passed
   * - no borrower has been selected
   * - request has not already been ghosted
   */
  const {
    data: requests,
    error,
  } = await supabaseAdmin
    .from('pop_borrow_requests')
    .select(`
      id,
      asset_id,
      requester_id,
      owner_id,
      household_id,
      response_deadline_at,
      status,
      ghosted_at
    `)
    .eq('status', 'requested')
    .not('response_deadline_at', 'is', null)
    .lte('response_deadline_at', now)
    .is('ghosted_at', null);

  if (error) {
    console.error('❌ Lender ghosting query failed:', error);
    return;
  }

  if (!requests?.length) return;

  for (const borrow of requests) {
    try {
      // --------------------------------------------------------
      // Re-check immediately before mutation.
      // --------------------------------------------------------

      const {
        data: current,
        error: currentError,
      } = await supabaseAdmin
        .from('pop_borrow_requests')
        .select(`
          id,
          status,
          ghosted_at,
          accepted_at
        `)
        .eq('id', borrow.id)
        .single();

      if (currentError || !current) {
        continue;
      }

      /**
       * A requested borrow must not have been accepted.
       *
       * Normally requested rows have accepted_at = NULL, but
       * checking it here protects against a race with another
       * lifecycle action.
       */
      if (
        current.status !== 'requested' ||
        current.ghosted_at ||
        current.accepted_at
      ) {
        continue;
      }

      // --------------------------------------------------------
      // Conditionally transition requested -> ghosted.
      // --------------------------------------------------------

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from('pop_borrow_requests')
        .update({
          status: 'ghosted',
          ghosted_at: now,
          review_eligible_at: now,
        })
        .eq('id', borrow.id)
        .eq('status', 'requested')
        .is('ghosted_at', null)
        .is('accepted_at', null)
        .select()
        .single();

      if (updateError || !updated) {
        if (updateError) {
          console.error(
            `❌ Failed to ghost lender request ${borrow.id}:`,
            updateError
          );
        }

        continue;
      }

      // --------------------------------------------------------
      // Record lender reliability event once.
      // --------------------------------------------------------

      const {
        error: eventError,
      } = await createReliabilityEventOnce({
        userId: borrow.owner_id,
        borrowRequestId: borrow.id,
        assetId: borrow.asset_id,
        eventType: 'lender_ghosted',
        severity: 'negative',
        description:
          'Lender did not respond to a borrow request before the response deadline.',
        metadata: {
          response_deadline_at: borrow.response_deadline_at,
        },
      });

      if (eventError) {
        console.error(
          `❌ Failed to create lender ghosting event ${borrow.id}:`,
          eventError
        );
      }

      console.log(
        `👻 Lender ghosted request: ${borrow.id} | owner: ${borrow.owner_id}`
      );
    } catch (error) {
      console.error(
        `❌ Error processing lender ghosting ${borrow.id}:`,
        error
      );
    }
  }
};

// ============================================================
// BORROWER GHOSTING
// ============================================================

const processBorrowerGhosting = async () => {
  const now = new Date().toISOString();

  /**
   * A selected borrower has ghosted when:
   *
   * - request is approved
   * - borrower has NOT accepted the selection
   * - response deadline has passed
   * - request has not already been ghosted
   *
   * IMPORTANT:
   *
   * accepted_at IS NULL is part of the actual business rule.
   * Once accepted_at is populated, this worker must never ghost
   * that borrower because of the selection deadline.
   */
  const {
    data: requests,
    error,
  } = await supabaseAdmin
    .from('pop_borrow_requests')
    .select(`
      id,
      asset_id,
      requester_id,
      owner_id,
      household_id,
      accepted_at,
      response_deadline_at,
      status,
      ghosted_at
    `)
    .eq('status', 'approved')
    .is('accepted_at', null)
    .not('response_deadline_at', 'is', null)
    .lte('response_deadline_at', now)
    .is('ghosted_at', null);

  if (error) {
    console.error('❌ Borrower ghosting query failed:', error);
    return;
  }

  if (!requests?.length) return;

  for (const borrow of requests) {
    try {
      // --------------------------------------------------------
      // Re-check the row before mutation.
      // --------------------------------------------------------

      const {
        data: current,
        error: currentError,
      } = await supabaseAdmin
        .from('pop_borrow_requests')
        .select(`
          id,
          status,
          ghosted_at,
          accepted_at
        `)
        .eq('id', borrow.id)
        .single();

      if (currentError || !current) {
        continue;
      }

      /**
       * CRITICAL:
       *
       * accepted_at must be checked AGAIN here.
       *
       * Example race:
       *
       * 10:00:00 worker finds approved + accepted_at NULL
       * 10:00:01 borrower accepts
       * 10:00:02 worker reaches this row
       *
       * The worker must skip it.
       */
      if (
        current.status !== 'approved' ||
        current.ghosted_at ||
        current.accepted_at
      ) {
        continue;
      }

      // --------------------------------------------------------
      // Conditionally transition approved -> ghosted.
      // --------------------------------------------------------

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from('pop_borrow_requests')
        .update({
          status: 'ghosted',
          ghosted_at: now,
          review_eligible_at: now,
        })
        .eq('id', borrow.id)
        .eq('status', 'approved')
        .is('accepted_at', null)
        .is('ghosted_at', null)
        .select()
        .single();

      if (updateError || !updated) {
        if (updateError) {
          console.error(
            `❌ Failed to ghost borrower ${borrow.id}:`,
            updateError
          );
        }

        continue;
      }

      // --------------------------------------------------------
      // Release asset.
      // --------------------------------------------------------

      const {
        error: assetError,
      } = await supabaseAdmin
        .from('pop_assets')
        .update({
          status: 'active',
        })
        .eq('id', borrow.asset_id)
        .neq('status', 'active');

      if (assetError) {
        console.error(
          `❌ Failed to release asset ${borrow.asset_id}:`,
          assetError
        );
      }

      // --------------------------------------------------------
      // Record borrower reliability event once.
      // --------------------------------------------------------

      const {
        error: eventError,
      } = await createReliabilityEventOnce({
        userId: borrow.requester_id,
        borrowRequestId: borrow.id,
        assetId: borrow.asset_id,
        eventType: 'borrower_ghosted',
        severity: 'negative',
        description:
          'Selected borrower did not respond within the required response period.',
        metadata: {
          response_deadline_at: borrow.response_deadline_at,
          accepted_at: borrow.accepted_at,
        },
      });

      if (eventError) {
        console.error(
          `❌ Failed to create borrower ghosting event ${borrow.id}:`,
          eventError
        );
      }

      console.log(
        `👻 Borrower ghosted request: ${borrow.id} | requester: ${borrow.requester_id}`
      );
    } catch (error) {
      console.error(
        `❌ Error processing borrower ghosting ${borrow.id}:`,
        error
      );
    }
  }
};

// ============================================================
// START WORKER
// ============================================================

export const startBorrowLifecycleWorker = () => {
  if (workerTimer) {
    console.log('⚠️ Borrow lifecycle worker is already running.');
    return;
  }

  console.log('⏱️ Starting POP borrow lifecycle worker...');
  console.log(
    `   ↳ Checking lifecycle every ${WORKER_INTERVAL_MS / 1000}s`
  );

  // Run immediately on server startup.
  runBorrowLifecycleWorker();

  // Continue periodically.
  workerTimer = setInterval(
    runBorrowLifecycleWorker,
    WORKER_INTERVAL_MS
  );
};

// ============================================================
// STOP WORKER
// ============================================================

export const stopBorrowLifecycleWorker = () => {
  if (!workerTimer) return;

  clearInterval(workerTimer);
  workerTimer = null;

  console.log('🛑 POP borrow lifecycle worker stopped.');
};

// ============================================================
// WORKER RUN
// ============================================================

export const runBorrowLifecycleWorker = async () => {
  if (workerRunning) {
    console.log(
      '⏭️ Borrow lifecycle check skipped — previous run still active.'
    );

    return;
  }

  workerRunning = true;

  try {
    console.log('🔎 Checking POP borrow lifecycle...');

    await processLenderGhosting();
    await processBorrowerGhosting();

    console.log('✅ POP borrow lifecycle check completed.');
  } catch (error) {
    console.error(
      '❌ Borrow lifecycle worker failed:',
      error
    );
  } finally {
    workerRunning = false;
  }
};