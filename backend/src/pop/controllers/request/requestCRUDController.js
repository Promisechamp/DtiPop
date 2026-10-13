// controllers/request/requestCRUDController.js
//
// CRUD operations for pop_requests:
//   - createRequest
//   - getRequests (list + filters + pagination)
//   - getRequest (single)
//   - updateRequest
//   - deleteRequest

import { supabaseAdmin } from '../../../db/index.js';

import {
  REQUEST_TYPES,
  URGENCIES,
  REQUEST_STATUSES,
  VISIBILITIES,
  MIN_EXPIRY_LEAD_MS,
  REQUEST_SELECT,
  ACTIVE_PROVIDER_RELATIONSHIP_STATUSES,
} from './requestHelpers.js';

import {
  getUserId,
  isJsonObject,
  validateDate,
  parsePagination,
  notify,
  mapPostgresError,
  getScopeKey,
  validateLocation,
  verifyHouseholdMembership,
  getUserHouseholdIds,
  validateRequestAccess,
  validateRequestScopes,
} from './requestHelpers.js';

// ============================================================
// CREATE REQUEST
// ============================================================

export const createRequest = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      householdId = null,
      assetId = null,
      requestType,
      title,
      urgency = 'medium',
      location = {},
      details = {},
      settings = {},
      scopes = [],
      expiresAt = null,
      visibility = 'public',
    } = req.body || {};

    // ----------------------------------------------------------
    // Basic validation
    // ----------------------------------------------------------

    if (!REQUEST_TYPES.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request type.',
      });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required.',
      });
    }

    if (!URGENCIES.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid urgency.',
      });
    }

    if (!VISIBILITIES.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visibility.',
      });
    }

    if (visibility === 'household' && !householdId) {
      return res.status(400).json({
        success: false,
        message: 'householdId is required for household visibility.',
      });
    }

    // ----------------------------------------------------------
    // Details
    // ----------------------------------------------------------

    if (!isJsonObject(details)) {
      return res.status(400).json({
        success: false,
        message: 'details must be an object.',
      });
    }

    if (
      details.summary !== undefined &&
      details.summary !== null &&
      typeof details.summary !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'details.summary must be a string.',
      });
    }

    const normalizedDetails = {
      ...details,
      ...(typeof details.summary === 'string'
        ? { summary: details.summary.trim() }
        : {}),
    };

    // ----------------------------------------------------------
    // Settings
    // ----------------------------------------------------------

    if (!isJsonObject(settings)) {
      return res.status(400).json({
        success: false,
        message: 'settings must be an object.',
      });
    }

    const normalizedSettings = {
      accept_chat: settings.accept_chat !== false,
      ...settings,
    };

    // ----------------------------------------------------------
    // Scopes
    // ----------------------------------------------------------

    const scopesValidation = validateRequestScopes(scopes);

    if (!scopesValidation.valid) {
      return res.status(400).json({
        success: false,
        message: scopesValidation.message,
      });
    }

    // ----------------------------------------------------------
    // Location
    // ----------------------------------------------------------

    const locationValidation = validateLocation(location);

    if (!locationValidation.valid) {
      return res.status(400).json({
        success: false,
        message: locationValidation.message,
      });
    }

    // ----------------------------------------------------------
    // Expiry
    // ----------------------------------------------------------

    const expiry = validateDate(expiresAt);

    if (!expiry.valid) {
      return res.status(400).json({
        success: false,
        message: 'expiresAt must be a valid date.',
      });
    }

    if (
      expiry.value &&
      new Date(expiry.value).getTime() <=
        Date.now() + MIN_EXPIRY_LEAD_MS
    ) {
      return res.status(400).json({
        success: false,
        message: 'expiresAt must be at least 5 seconds in the future.',
      });
    }

    // ----------------------------------------------------------
    // Household authorization
    // ----------------------------------------------------------

    if (householdId) {
      const membership = await verifyHouseholdMembership(
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
          message: 'You are not a member of this household.',
        });
      }
    }

    // ----------------------------------------------------------
    // Asset authorization
    //
    // An asset may be:
    //   1. directly owned by the requester, OR
    //   2. associated with a household the requester belongs to.
    //
    // A null asset.user_id must NOT bypass authorization.
    // ----------------------------------------------------------

    if (assetId) {
      const { data: asset, error: assetError } = await supabaseAdmin
        .from('pop_assets')
        .select('id, user_id, household_id')
        .eq('id', assetId)
        .maybeSingle();

      if (assetError) {
        return res.status(500).json({
          success: false,
          message: assetError.message,
        });
      }

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found.',
        });
      }

      const isAssetOwner =
        asset.user_id &&
        String(asset.user_id) === String(userId);

      const assetHouseholdId = asset.household_id || null;

      let hasAssetHouseholdAccess = false;

      if (assetHouseholdId) {
        const membership = await verifyHouseholdMembership(
          userId,
          assetHouseholdId
        );

        if (membership.error) {
          return res.status(500).json({
            success: false,
            message: membership.error.message,
          });
        }

        hasAssetHouseholdAccess = membership.isMember;
      }

      if (!isAssetOwner && !hasAssetHouseholdAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this asset.',
        });
      }

      // If the request explicitly targets a household, the asset
      // must belong to that same household when the asset itself
      // is household-associated.
      if (
        householdId &&
        assetHouseholdId &&
        String(assetHouseholdId) !== String(householdId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The asset does not belong to the selected household.',
        });
      }

      // A household-visible request must not attach a household
      // asset from a different household. The membership check
      // above protects assets whose user_id is null.
      if (
        visibility === 'household' &&
        householdId &&
        assetHouseholdId &&
        String(assetHouseholdId) !== String(householdId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The asset does not belong to the selected household.',
        });
      }
    }

    // ----------------------------------------------------------
    // Insert
    // ----------------------------------------------------------

    const { data, error } = await supabaseAdmin
      .from('pop_requests')
      .insert({
        user_id: userId,
        household_id: householdId || null,
        asset_id: assetId || null,
        request_type: requestType,
        title: title.trim(),
        urgency,
        location: locationValidation.location,
        visibility,
        status: 'open',
        expires_at: expiry.value,
        details: normalizedDetails,
        settings: normalizedSettings,
        scopes,
      })
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return mapPostgresError(res, error, {
        checkStatus: 400,
        fkStatus: 409,
        p0001Status: 400,
      });
    }

    // ----------------------------------------------------------
    // Household notification
    // ----------------------------------------------------------

    if (householdId && visibility !== 'private') {
      const { data: members, error: membersError } =
        await supabaseAdmin
          .from('pop_household_members')
          .select('user_id')
          .eq('household_id', householdId)
          .eq('status', 'active')
          .neq('user_id', userId);

      if (membersError) {
        console.error(
          'createRequest household notification lookup error:',
          membersError
        );
      } else {
        await Promise.all(
          (members || []).map((member) =>
            notify(member.user_id, {
              type: 'request_created',
              requestId: data.id,
              title: data.title,
              message: `A new request "${data.title}" was created.`,
            })
          )
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Request created successfully.',
      request: data,
    });
  } catch (error) {
    console.error('createRequest error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create request.',
      error: error.message,
    });
  }
};

// ============================================================
// GET REQUESTS (LIST)
// ============================================================

export const getRequests = async (req, res, overrides = {}) => {
  try {
    const viewerId = getUserId(req);

    if (!viewerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const params = {
      ...(req.query || {}),
      ...overrides,
    };

    const {
      householdId,
      requestType,
      status,
      urgency,
      search,
      createdBy,
      assetId,
      showOpenOnly,
      visibility,
      excludeUserId,
      trackableOnly,
      excludeConnectedForProvider,
    } = params;

    // ----------------------------------------------------------
    // Filter validation
    // ----------------------------------------------------------

    if (requestType && !REQUEST_TYPES.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid requestType.',
      });
    }

    if (status && !REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    if (urgency && !URGENCIES.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid urgency.',
      });
    }

    if (visibility && !VISIBILITIES.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visibility.',
      });
    }

    const { page, limit, offset } = parsePagination(req);

    // ----------------------------------------------------------
    // Viewer households
    // ----------------------------------------------------------

    const householdResult = await getUserHouseholdIds(viewerId);

    if (householdResult.error) {
      return res.status(500).json({
        success: false,
        message: householdResult.error.message,
      });
    }

    const householdIds = householdResult.ids;

    // ----------------------------------------------------------
    // Provider relationship exclusions
    // ----------------------------------------------------------

    let connectedIds = [];

    if (
      excludeConnectedForProvider === true ||
      excludeConnectedForProvider === 'true'
    ) {
      const { data: relationships, error } = await supabaseAdmin
        .from('pop_request_providers')
        .select('request_id')
        .eq('provider_id', viewerId)
        .in('status', ACTIVE_PROVIDER_RELATIONSHIP_STATUSES);

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      connectedIds = (relationships || [])
        .map((row) => row.request_id)
        .filter(Boolean);
    }

    // ----------------------------------------------------------
    // Base query
    // ----------------------------------------------------------

    let query = supabaseAdmin
      .from('pop_requests')
      .select(REQUEST_SELECT, { count: 'exact' });

    // ----------------------------------------------------------
    // Explicit filters
    // ----------------------------------------------------------

    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    if (requestType) {
      query = query.eq('request_type', requestType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    if (createdBy) {
      query = query.eq('user_id', createdBy);
    }

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    if (
      showOpenOnly === true ||
      showOpenOnly === 'true'
    ) {
      // "Open" in provider workflow means currently active.
      query = query.in('status', ['open', 'in_progress']);
    }

    if (
      trackableOnly === true ||
      trackableOnly === 'true'
    ) {
      query = query.in(
        'request_type',
        ['service', 'repair', 'maintenance']
      );
    }

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    // ----------------------------------------------------------
    // Authorization
    //
    // Viewer can see:
    //   - their own requests
    //   - public requests
    //   - household-visible requests in their households
    //
    // Network visibility remains intentionally excluded until
    // the network membership model is established.
    // ----------------------------------------------------------

    const accessBranches = [
      `user_id.eq.${viewerId}`,
      `visibility.eq.public`,
    ];

    if (householdIds.length) {
      accessBranches.push(
        `and(visibility.eq.household,household_id.in.(${householdIds.join(',')}))`
      );
    }

    query = query.or(accessBranches.join(','));

    // ----------------------------------------------------------
    // Search
    //
    // This is intentionally applied AFTER the authorization
    // branch. Supabase/PostgREST combines separate filters with
    // AND, giving:
    //
    //   authorization AND (title OR summary)
    //
    // rather than allowing the search branch to bypass access.
    // ----------------------------------------------------------

    if (search?.trim()) {
      const safeSearch = search
        .trim()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/,/g, '\\,')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

      query = query.or(
        `title.ilike.%${safeSearch}%,details->>summary.ilike.%${safeSearch}%`
      );
    }

    // ----------------------------------------------------------
    // Exclude active provider relationships
    // ----------------------------------------------------------

    if (connectedIds.length) {
      query = query.not(
        'id',
        'in',
        `(${connectedIds.join(',')})`
      );
    }

    // ----------------------------------------------------------
    // Ordering + pagination
    // ----------------------------------------------------------

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return mapPostgresError(res, error);
    }

    return res.json({
      success: true,
      requests: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('getRequests error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests.',
      error: error.message,
    });
  }
};

// ============================================================
// GET SINGLE REQUEST
// ============================================================

export const getRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
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

    const { data, error } = await supabaseAdmin
      .from('pop_requests')
      .select(REQUEST_SELECT)
      .eq('id', requestId)
      .single();

    if (error) {
      return mapPostgresError(res, error);
    }

    return res.json({
      success: true,
      request: data,
    });
  } catch (error) {
    console.error('getRequest error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request.',
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE REQUEST
// ============================================================

export const updateRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
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

    if (String(access.data.user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only the request owner can update this request.',
      });
    }

    const {
      title,
      urgency,
      location,
      details,
      settings,
      scopes,
      expiresAt,
      visibility,
      status,
    } = req.body || {};

    const updates = {};

    // ----------------------------------------------------------
    // Title
    // ----------------------------------------------------------

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty.',
        });
      }

      updates.title = title.trim();
    }

    // ----------------------------------------------------------
    // Urgency
    // ----------------------------------------------------------

    if (urgency !== undefined) {
      if (!URGENCIES.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid urgency.',
        });
      }

      updates.urgency = urgency;
    }

    // ----------------------------------------------------------
    // Location
    // ----------------------------------------------------------

    if (location !== undefined) {
      const validation = validateLocation(location);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      updates.location = validation.location;
    }

    // ----------------------------------------------------------
    // Details
    // ----------------------------------------------------------

    if (details !== undefined) {
      if (!isJsonObject(details)) {
        return res.status(400).json({
          success: false,
          message: 'details must be an object.',
        });
      }

      if (
        details.summary !== undefined &&
        details.summary !== null &&
        typeof details.summary !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'details.summary must be a string.',
        });
      }

      const currentDetails = isJsonObject(access.data.details)
        ? access.data.details
        : {};

      const normalizedDetails = {
        ...currentDetails,
        ...details,
      };

      if (typeof normalizedDetails.summary === 'string') {
        normalizedDetails.summary =
          normalizedDetails.summary.trim();
      }

      updates.details = normalizedDetails;
    }

    // ----------------------------------------------------------
    // Settings
    // ----------------------------------------------------------

    if (settings !== undefined) {
      if (!isJsonObject(settings)) {
        return res.status(400).json({
          success: false,
          message: 'settings must be an object.',
        });
      }

      updates.settings = {
        ...(isJsonObject(access.data.settings)
          ? access.data.settings
          : {}),
        ...settings,
      };
    }

    // ----------------------------------------------------------
    // Scopes
    // ----------------------------------------------------------

    if (scopes !== undefined) {
      const validation = validateRequestScopes(scopes);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      const currentScopes = Array.isArray(access.data.scopes)
        ? access.data.scopes
        : [];

      const newScopeKeys = new Set(
        scopes
          .map((scope) => getScopeKey(scope))
          .filter(Boolean)
      );

      const isShrink = currentScopes.some((scope) => {
        const key = getScopeKey(scope);
        return key && !newScopeKeys.has(key);
      });

      if (isShrink) {
        const {
          data: activeProviders,
          error: providersError,
        } = await supabaseAdmin
          .from('pop_request_providers')
          .select('id, scopes, status')
          .eq('request_id', requestId)
          .in(
            'status',
            ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
          );

        if (providersError) {
          return res.status(500).json({
            success: false,
            message: providersError.message,
          });
        }

        const conflicts = (
          activeProviders || []
        ).filter((provider) => {
          const providerScopes = Array.isArray(provider.scopes)
            ? provider.scopes
            : [];

          return providerScopes.some((providerScope) => {
            const key = getScopeKey(providerScope);

            return (
              key &&
              !newScopeKeys.has(key)
            );
          });
        });

        if (conflicts.length) {
          return res.status(409).json({
            success: false,
            message:
              'Cannot shrink scopes while active providers hold scopes that would be removed.',
            conflictingProviderRelationshipIds:
              conflicts.map(
                (provider) => provider.id
              ),
          });
        }
      }

      updates.scopes = scopes;
    }

    // ----------------------------------------------------------
    // Expiry
    // ----------------------------------------------------------

    if (expiresAt !== undefined) {
      const expiry = validateDate(expiresAt);

      if (!expiry.valid) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be a valid date.',
        });
      }

      // null explicitly removes the expiry.
      //
      // A non-null expiry must be in the future with the same
      // small buffer used during creation.
      if (
        expiry.value &&
        new Date(expiry.value).getTime() <=
          Date.now() + MIN_EXPIRY_LEAD_MS
      ) {
        return res.status(400).json({
          success: false,
          message:
            'expiresAt must be at least 5 seconds in the future.',
        });
      }

      updates.expires_at = expiry.value;
    }

    // ----------------------------------------------------------
    // Visibility
    // ----------------------------------------------------------

    if (visibility !== undefined) {
      if (!VISIBILITIES.includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid visibility.',
        });
      }

      if (
        visibility === 'household' &&
        !access.data.household_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A household request requires household_id.',
        });
      }

      updates.visibility = visibility;
    }

    // ----------------------------------------------------------
    // Status
    // ----------------------------------------------------------

    if (status !== undefined) {
      if (!REQUEST_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request status.',
        });
      }

      if (status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message:
            'Use the cancel endpoint to cancel a request.',
        });
      }

      const currentStatus = access.data.status;

      const allowedTransitions = {
        open: [
          'in_progress',
          'fulfilled',
          'expired',
        ],
        in_progress: [
          'fulfilled',
          'expired',
        ],
        fulfilled: [],
        cancelled: [],
        expired: [],
      };

      if (
        status !== currentStatus &&
        !allowedTransitions[currentStatus]?.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cannot change request status from ${currentStatus} to ${status}.`,
        });
      }

      updates.status = status;
    }

    // ----------------------------------------------------------
    // Nothing to update
    // ----------------------------------------------------------

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields supplied for update.',
      });
    }

    // ----------------------------------------------------------
    // Update
    // ----------------------------------------------------------

    const { data, error } = await supabaseAdmin
      .from('pop_requests')
      .update(updates)
      .eq('id', requestId)
      .eq('user_id', userId)
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return mapPostgresError(res, error);
    }

    // ----------------------------------------------------------
    // Provider cleanup when owner explicitly fulfills/expires
    // the request.
    //
    // The DB owns provider -> request synchronization. This
    // cleanup only terminates remaining active relationships
    // after the request has legitimately left the active state.
    // ----------------------------------------------------------

    if (
      status &&
      ['fulfilled', 'expired'].includes(status) &&
      status !== access.data.status
    ) {
      const now = new Date().toISOString();

      const {
        data: active,
        error: activeError,
      } = await supabaseAdmin
        .from('pop_request_providers')
        .select('id, provider_id')
        .eq('request_id', requestId)
        .in(
          'status',
          ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
        );

      if (activeError) {
        console.error(
          'updateRequest active provider lookup error:',
          activeError
        );
      } else if (active?.length) {
        const {
          error: cleanupError,
        } = await supabaseAdmin
          .from('pop_request_providers')
          .update({
            status: 'cancelled',
            cancelled_at: now,
            asset_history_access: 'none',
            asset_history_access_granted_by: null,
            asset_history_access_granted_at: null,
          })
          .eq('request_id', requestId)
          .in(
            'status',
            ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
          );

        if (cleanupError) {
          console.error(
            'updateRequest provider cleanup error:',
            cleanupError
          );
        } else {
          await Promise.all(
            active.map((row) =>
              notify(row.provider_id, {
                type: 'request_cancelled',
                requestId,
                requestProviderId: row.id,
                title: data.title,
                message:
                  `The request "${data.title}" is no longer active.`,
              })
            )
          );
        }
      }
    }

    return res.json({
      success: true,
      message: 'Request updated successfully.',
      request: data,
    });
  } catch (error) {
    console.error('updateRequest error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update request.',
      error: error.message,
    });
  }
};

// ============================================================
// DELETE REQUEST
// ============================================================

export const deleteRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
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

    let allowed =
      String(access.data.user_id) === String(userId);

    if (!allowed && access.data.household_id) {
      const membership = await verifyHouseholdMembership(
        userId,
        access.data.household_id
      );

      if (
        !membership.error &&
        membership.isMember &&
        ['owner', 'admin'].includes(membership.role)
      ) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have permission to delete this request.',
      });
    }

    const { error } = await supabaseAdmin
      .from('pop_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      return mapPostgresError(res, error);
    }

    return res.json({
      success: true,
      message: 'Request deleted successfully.',
    });
  } catch (error) {
    console.error('deleteRequest error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete request.',
      error: error.message,
    });
  }
};