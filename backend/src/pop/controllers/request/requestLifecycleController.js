// controllers/request/requestLifecycleController.js

import { supabaseAdmin } from '../../../db/index.js';

import {
  REQUEST_STATUSES,
  ACTIVE_PROVIDER_RELATIONSHIP_STATUSES,
  REQUEST_SELECT,
  getUserId,
  mapPostgresError,
  notify,
  validateRequestAccess,
  verifyHouseholdMembership,
} from './requestHelpers.js';

// ============================================================
// INTERNAL HELPERS
// ============================================================

const ACTIVE_REQUEST_STATUSES = ['open', 'in_progress'];

const getRequestId = (request) =>
  request?.id ||
  request?.request_id ||
  request?.requestId ||
  null;

const isActiveRequest = (request) =>
  ACTIVE_REQUEST_STATUSES.includes(request?.status);

const cancelActiveProviderRelationships = async ({
  requestId,
  requestTitle,
}) => {
  const {
    data: activeProviders,
    error: fetchError,
  } = await supabaseAdmin
    .from('pop_request_providers')
    .select('id, provider_id')
    .eq('request_id', requestId)
    .in(
      'status',
      ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
    );

  if (fetchError) {
    return {
      success: false,
      error: fetchError,
      providers: [],
    };
  }

  if (!activeProviders?.length) {
    return {
      success: true,
      error: null,
      providers: [],
    };
  }

  const {
    error: updateError,
  } = await supabaseAdmin
    .from('pop_request_providers')
    .update({
      status: 'cancelled',
      asset_history_access: 'none',
      asset_history_access_granted_by: null,
      asset_history_access_granted_at: null,
    })
    .eq('request_id', requestId)
    .in(
      'status',
      ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
    );

  if (updateError) {
    return {
      success: false,
      error: updateError,
      providers: activeProviders,
    };
  }

  await Promise.all(
    activeProviders.map((provider) =>
      notify(provider.provider_id, {
        type: 'request_cancelled',
        requestId,
        requestProviderId: provider.id,
        title: requestTitle,
        message:
          `The request "${requestTitle}" is no longer active.`,
      })
    )
  );

  return {
    success: true,
    error: null,
    providers: activeProviders,
  };
};

// ============================================================
// FULFILL REQUEST
// ============================================================

export const fulfillRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request id is required.',
      });
    }

    const access = await validateRequestAccess(
      requestId,
      userId
    );

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (
      String(access.data.user_id) !==
      String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the request owner can fulfill this request.',
      });
    }

    if (!isActiveRequest(access.data)) {
      return res.status(400).json({
        success: false,
        message:
          `This request cannot be fulfilled because it is already ${access.data.status}.`,
      });
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_requests')
      .update({
        status: 'fulfilled',
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .in('status', ACTIVE_REQUEST_STATUSES)
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return mapPostgresError(res, error, {
        checkStatus: 400,
        p0001Status: 400,
      });
    }

    // A fulfilled request is no longer active. Any provider
    // relationship that is still active must therefore be
    // closed. required_providers is informational only and is
    // deliberately not used here.
    const cleanup =
      await cancelActiveProviderRelationships({
        requestId,
        requestTitle: data.title,
      });

    if (!cleanup.success) {
      console.error(
        'fulfillRequest provider cleanup error:',
        cleanup.error
      );

      // The parent request has already been successfully
      // fulfilled. Do not report a false failure to the client.
    }

    await notify(data.user_id, {
      type: 'request_fulfilled',
      requestId: data.id,
      title: data.title,
      message:
        `Your request "${data.title}" has been marked as fulfilled.`,
    });

    return res.json({
      success: true,
      message: 'Request fulfilled successfully.',
      request: data,
    });
  } catch (error) {
    console.error(
      'fulfillRequest error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fulfill request.',
      error: error.message,
    });
  }
};

// ============================================================
// CANCEL REQUEST
// ============================================================

export const cancelRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request id is required.',
      });
    }

    const access = await validateRequestAccess(
      requestId,
      userId
    );

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (
      String(access.data.user_id) !==
      String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the request owner can cancel this request.',
      });
    }

    if (!isActiveRequest(access.data)) {
      return res.status(400).json({
        success: false,
        message:
          `This request cannot be cancelled because it is already ${access.data.status}.`,
      });
    }

    const now = new Date().toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_requests')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: userId,
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .in('status', ACTIVE_REQUEST_STATUSES)
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return mapPostgresError(res, error, {
        checkStatus: 400,
        p0001Status: 400,
      });
    }

    const cleanup =
      await cancelActiveProviderRelationships({
        requestId,
        requestTitle: data.title,
      });

    if (!cleanup.success) {
      console.error(
        'cancelRequest provider cleanup error:',
        cleanup.error
      );

      // Keep the successful parent cancellation response.
      // The cleanup failure is logged rather than pretending
      // the request itself was not cancelled.
    }

    return res.json({
      success: true,
      message: 'Request cancelled successfully.',
      request: data,
    });
  } catch (error) {
    console.error(
      'cancelRequest error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to cancel request.',
      error: error.message,
    });
  }
};

// ============================================================
// GET MY REQUESTS
// ============================================================

export const getMyRequests = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      getRequests,
    } = await import('./requestCRUDController.js');

    return getRequests(req, res, {
      createdBy: userId,
    });
  } catch (error) {
    console.error(
      'getMyRequests error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your requests.',
      error: error.message,
    });
  }
};

// ============================================================
// GET HOUSEHOLD REQUESTS
// ============================================================

export const getHouseholdRequests = async (
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

    const householdId =
      req.params.householdId ||
      req.query?.householdId;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'householdId is required.',
      });
    }

    const membership =
      await verifyHouseholdMembership(
        userId,
        householdId
      );

    if (membership.error) {
      return res.status(500).json({
        success: false,
        message: membership.error.message,
      });
    }

    if (!membership.isMember) {
      return res.status(403).json({
        success: false,
        message:
          'You are not a member of this household.',
      });
    }

    const {
      getRequests,
    } = await import('./requestCRUDController.js');

    return getRequests(req, res, {
      householdId,
    });
  } catch (error) {
    console.error(
      'getHouseholdRequests error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch household requests.',
      error: error.message,
    });
  }
};

// ============================================================
// GET OPEN HOUSEHOLD REQUESTS
// ============================================================

export const getOpenHouseholdRequests = async (
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

    const householdId =
      req.params.householdId ||
      req.query?.householdId;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: 'householdId is required.',
      });
    }

    const membership =
      await verifyHouseholdMembership(
        userId,
        householdId
      );

    if (membership.error) {
      return res.status(500).json({
        success: false,
        message: membership.error.message,
      });
    }

    if (!membership.isMember) {
      return res.status(403).json({
        success: false,
        message:
          'You are not a member of this household.',
      });
    }

    const {
      getRequests,
    } = await import('./requestCRUDController.js');

    return getRequests(req, res, {
      householdId,
      showOpenOnly: true,
    });
  } catch (error) {
    console.error(
      'getOpenHouseholdRequests error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch open household requests.',
      error: error.message,
    });
  }
};