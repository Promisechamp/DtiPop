// controllers/request/requestProviderController.js
//
// Provider workflow for pop_requests:
//   - getRequestProviders
//   - connectRequestProvider
//   - respondToRequestProvider
//   - startRequestProvider
//   - completeRequestProvider

import { supabaseAdmin } from '../../../db/index.js';

import {
  ACTIVE_PROVIDER_RELATIONSHIP_STATUSES,
  PROVIDER_RELATIONSHIP_STATUSES,
  REQUEST_STATUSES,
  TRACKABLE_REQUEST_TYPES,
  PROVIDER_PUBLIC_SELECT,
  REQUEST_SELECT,
} from './requestHelpers.js';

import {
  getUserId,
  getErrorMessage,
  mapPostgresError,
  notify,
  validateRequestAccess,
  ensureTrackableRequest,
  validateProvider,
  resolveScopeObjects,
  validateRequestScopes,
} from './requestHelpers.js';

// ============================================================
// INTERNAL HELPERS
// ============================================================

const isActiveRequest = (request) =>
  request &&
  ['open', 'in_progress'].includes(request.status);

const getRequestId = (request) =>
  request?.id || request?.request_id || request?.requestId || null;

const getProviderId = (relationship) =>
  relationship?.provider_id ||
  relationship?.providerId ||
  null;

const getProviderName = (profile) =>
  profile?.full_name ||
  profile?.name ||
  'Provider';

const normalizeScopesInput = (scopes) =>
  Array.isArray(scopes)
    ? scopes
    : scopes === undefined
      ? undefined
      : [];

// ============================================================
// GET REQUEST PROVIDERS
// ============================================================

export const getRequestProviders = async (req, res) => {
  try {
    const viewerId = getUserId(req);
    const requestId = req.params.id;

    if (!viewerId) {
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
      viewerId
    );

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const { data: relationships, error } =
      await supabaseAdmin
        .from('pop_request_providers')
        .select(`
          *,
          provider:profiles!provider_id (
            id,
            full_name,
            avatar_url,
            bio,
            location,
            services
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) {
      return mapPostgresError(res, error);
    }

    const providers = (relationships || []).map(
      (relationship) => {
        const profile = relationship.provider || null;

        const activeServices = profile?.services
          ? (
              Array.isArray(profile.services)
                ? profile.services
                : Array.isArray(profile.services?.items)
                  ? profile.services.items
                  : []
            ).filter((service) => {
              if (!service || typeof service !== 'object') {
                return false;
              }

              if (
                service.active === false ||
                service.is_active === false ||
                service.enabled === false
              ) {
                return false;
              }

              if (
                service.status &&
                ['inactive', 'disabled', 'archived'].includes(
                  String(service.status).toLowerCase()
                )
              ) {
                return false;
              }

              return true;
            })
          : [];

        return {
          ...relationship,
          provider: profile
            ? {
                ...profile,
                services: activeServices,
              }
            : null,
        };
      }
    );

    return res.json({
      success: true,
      request: {
        ...access.data,
        scopes: Array.isArray(access.data.scopes)
          ? access.data.scopes
          : [],
      },
      providers,
    });
  } catch (error) {
    console.error(
      'getRequestProviders error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request providers.',
      error: error.message,
    });
  }
};

// ============================================================
// CONNECT REQUEST PROVIDER
// ============================================================

export const connectRequestProvider = async (req, res) => {
  try {
    const requesterId = getUserId(req);
    const requestId = req.params.id;

    if (!requesterId) {
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

    const {
      providerId,
      scopes: requestedScopes,
    } = req.body || {};

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId is required.',
      });
    }

    // ----------------------------------------------------------
    // Request access
    // ----------------------------------------------------------

    const access = await validateRequestAccess(
      requestId,
      requesterId
    );

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (
      String(access.data.user_id) !==
      String(requesterId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the request owner can connect a provider.',
      });
    }

    const trackable = ensureTrackableRequest(
      access.data.request_type
    );

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (!isActiveRequest(access.data)) {
      return res.status(400).json({
        success: false,
        message:
          'Providers can only be connected to active requests.',
      });
    }

    // ----------------------------------------------------------
    // Prevent self-selection
    // ----------------------------------------------------------

    if (
      String(providerId) ===
      String(requesterId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot connect yourself as the provider.',
      });
    }

    // ----------------------------------------------------------
    // Provider validation
    // ----------------------------------------------------------

    const providerValidation =
      await validateProvider(providerId);

    if (!providerValidation.valid) {
      return res.status(providerValidation.status).json({
        success: false,
        message: providerValidation.message,
      });
    }

    // ----------------------------------------------------------
    // Resolve requested scopes.
    //
    // The relationship stores the actual request-scope objects,
    // not { scope_id, status } wrappers.
    // ----------------------------------------------------------

    const requestScopes = Array.isArray(
      access.data.scopes
    )
      ? access.data.scopes
      : [];

    const scopesInput =
      normalizeScopesInput(requestedScopes);

    let providerScopes = [];

    if (scopesInput === undefined) {
      // No scopes supplied means assign no explicit scopes.
      providerScopes = [];
    } else {
      const scopeValidation =
        validateRequestScopes(scopesInput);

      if (!scopeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: scopeValidation.message,
        });
      }

      const resolved = resolveScopeObjects(
        requestScopes,
        scopesInput
      );

      if (resolved.invalidIds.length) {
        return res.status(400).json({
          success: false,
          message:
            'One or more requested scopes do not belong to this request.',
          invalidScopeIds: resolved.invalidIds,
        });
      }

      providerScopes = resolved.objects;
    }

    // ----------------------------------------------------------
    // Prevent duplicate active relationship.
    //
    // The database partial unique index is authoritative, but
    // this check provides a friendly application-level response.
    // ----------------------------------------------------------

    const {
      data: existingRelationship,
      error: existingError,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .select('id, status')
      .eq('request_id', requestId)
      .eq('provider_id', providerId)
      .in(
        'status',
        ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
      )
      .maybeSingle();

    if (existingError) {
      return mapPostgresError(
        res,
        existingError
      );
    }

    if (existingRelationship) {
      return res.status(409).json({
        success: false,
        message:
          'This provider is already connected to the request.',
        relationship: existingRelationship,
      });
    }

    // ----------------------------------------------------------
    // Create relationship
    // ----------------------------------------------------------

    const { data, error } = await supabaseAdmin
      .from('pop_request_providers')
      .insert({
        request_id: requestId,
        provider_id: providerId,
        status: 'selected',
        selected_at: new Date().toISOString(),
        scopes: providerScopes,
        asset_history_access: 'none',
        asset_history_access_granted_by: null,
        asset_history_access_granted_at: null,
      })
      .select(`
        *,
        provider:profiles!provider_id (
          id,
          full_name,
          avatar_url,
          bio,
          location,
          services
        )
      `)
      .single();

    if (error) {
      return mapPostgresError(res, error, {
        uniqueStatus: 409,
        uniqueMessage:
          'This provider is already connected to the request.',
        checkStatus: 400,
        fkStatus: 409,
      });
    }

    // ----------------------------------------------------------
    // Notify provider
    // ----------------------------------------------------------

    await notify(providerId, {
      type: 'request_provider_selected',
      requestId,
      requestProviderId: data.id,
      title: access.data.title,
      message:
        `You have been selected for the request "${access.data.title}".`,
    });

    return res.status(201).json({
      success: true,
      message: 'Provider connected successfully.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'connectRequestProvider error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to connect provider.',
      error: error.message,
    });
  }
};

// ============================================================
// RESPOND TO REQUEST PROVIDER RELATIONSHIP
// ============================================================

export const respondToRequestProvider = async (
  req,
  res
) => {
  try {
    const providerId = getUserId(req);
    const relationshipId = req.params.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!relationshipId) {
      return res.status(400).json({
        success: false,
        message:
          'Provider relationship id is required.',
      });
    }

    const {
      action,
      scopes: requestedScopes,
    } = req.body || {};

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message:
          'action must be either accept or decline.',
      });
    }

    // ----------------------------------------------------------
    // Load relationship + request
    // ----------------------------------------------------------

    const {
      data: relationship,
      error: relationshipError,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          request_type,
          title,
          status,
          scopes,
          asset_id,
          visibility
        )
      `)
      .eq('id', relationshipId)
      .maybeSingle();

    if (relationshipError) {
      return mapPostgresError(
        res,
        relationshipError
      );
    }

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Provider relationship not found.',
      });
    }

    if (
      String(relationship.provider_id) !==
      String(providerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have permission to respond to this provider relationship.',
      });
    }

    const request = relationship.request;

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      });
    }

    const trackable = ensureTrackableRequest(
      request.request_type
    );

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (!isActiveRequest(request)) {
      return res.status(400).json({
        success: false,
        message:
          'This request is no longer active.',
      });
    }

    // ----------------------------------------------------------
    // Only selected relationships may be accepted/declined.
    // ----------------------------------------------------------

    if (relationship.status !== 'selected') {
      return res.status(400).json({
        success: false,
        message:
          `A provider relationship with status "${relationship.status}" cannot be ${action}ed.`,
      });
    }

    // ----------------------------------------------------------
    // DECLINE
    // ----------------------------------------------------------

    if (action === 'decline') {
      const { data, error } =
        await supabaseAdmin
          .from('pop_request_providers')
          .update({
            status: 'declined',
            declined_at:
              new Date().toISOString(),
            asset_history_access: 'none',
            asset_history_access_granted_by: null,
            asset_history_access_granted_at: null,
          })
          .eq('id', relationshipId)
          .eq('provider_id', providerId)
          .eq('status', 'selected')
          .select(`
            *,
            request:pop_requests (
              id,
              user_id,
              title,
              status
            )
          `)
          .single();

      if (error) {
        return mapPostgresError(
          res,
          error
        );
      }

      await notify(data.request.user_id, {
        type: 'provider_declined',
        requestId: data.request.id,
        requestProviderId: data.id,
        title: data.request.title,
        message:
          `A provider declined your request "${data.request.title}".`,
      });

      return res.json({
        success: true,
        message:
          'Provider relationship declined.',
        relationship: data,
      });
    }

    // ----------------------------------------------------------
    // ACCEPT
    // ----------------------------------------------------------
    //
    // IMPORTANT:
    // requestedScopes === undefined means:
    //   preserve the relationship's existing scopes.
    //
    // requestedScopes === [] means:
    //   explicitly replace scopes with [].
    // ----------------------------------------------------------

    const updatePayload = {
      status: 'accepted',
      accepted_at:
        new Date().toISOString(),
    };

    if (requestedScopes !== undefined) {
      const scopeValidation =
        validateRequestScopes(requestedScopes);

      if (!scopeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: scopeValidation.message,
        });
      }

      const requestScopes = Array.isArray(
        request.scopes
      )
        ? request.scopes
        : [];

      const resolved = resolveScopeObjects(
        requestScopes,
        requestedScopes
      );

      if (resolved.invalidIds.length) {
        return res.status(400).json({
          success: false,
          message:
            'One or more requested scopes do not belong to this request.',
          invalidScopeIds:
            resolved.invalidIds,
        });
      }

      updatePayload.scopes =
        resolved.objects;
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .update(updatePayload)
      .eq('id', relationshipId)
      .eq('provider_id', providerId)
      .eq('status', 'selected')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          title,
          status
        )
      `)
      .single();

    if (error) {
      return mapPostgresError(
        res,
        error,
        {
          checkStatus: 400,
          p0001Status: 400,
        }
      );
    }

    await notify(data.request.user_id, {
      type: 'provider_accepted',
      requestId: data.request.id,
      requestProviderId: data.id,
      title: data.request.title,
      message:
        `A provider accepted your request "${data.request.title}".`,
    });

    return res.json({
      success: true,
      message:
        'Provider relationship accepted.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'respondToRequestProvider error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to respond to provider relationship.',
      error: error.message,
    });
  }
};

// ============================================================
// START REQUEST PROVIDER
// ============================================================

export const startRequestProvider = async (
  req,
  res
) => {
  try {
    const providerId = getUserId(req);
    const relationshipId = req.params.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!relationshipId) {
      return res.status(400).json({
        success: false,
        message:
          'Provider relationship id is required.',
      });
    }

    const {
      data: relationship,
      error: relationshipError,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          request_type,
          title,
          status,
          scopes
        )
      `)
      .eq('id', relationshipId)
      .maybeSingle();

    if (relationshipError) {
      return mapPostgresError(
        res,
        relationshipError
      );
    }

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Provider relationship not found.',
      });
    }

    if (
      String(relationship.provider_id) !==
      String(providerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have permission to start this provider relationship.',
      });
    }

    const request = relationship.request;

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      });
    }

    const trackable = ensureTrackableRequest(
      request.request_type
    );

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (!isActiveRequest(request)) {
      return res.status(400).json({
        success: false,
        message:
          'This request is no longer active.',
      });
    }

    if (relationship.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message:
          'Only an accepted provider relationship can be started.',
      });
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .update({
        status: 'in_progress',
        started_at:
          new Date().toISOString(),
      })
      .eq('id', relationshipId)
      .eq('provider_id', providerId)
      .eq('status', 'accepted')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          title,
          status
        )
      `)
      .single();

    if (error) {
      return mapPostgresError(
        res,
        error,
        {
          checkStatus: 400,
          p0001Status: 400,
        }
      );
    }

    // The database trigger is responsible for synchronizing
    // the parent request to in_progress.
    await notify(data.request.user_id, {
      type: 'provider_started',
      requestId: data.request.id,
      requestProviderId: data.id,
      title: data.request.title,
      message:
        `Work has started on your request "${data.request.title}".`,
    });

    return res.json({
      success: true,
      message:
        'Provider work started successfully.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'startRequestProvider error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to start provider work.',
      error: error.message,
    });
  }
};

// ============================================================
// COMPLETE REQUEST PROVIDER
// ============================================================

export const completeRequestProvider = async (
  req,
  res
) => {
  try {
    const providerId = getUserId(req);
    const relationshipId = req.params.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!relationshipId) {
      return res.status(400).json({
        success: false,
        message:
          'Provider relationship id is required.',
      });
    }

    const {
      completionNote,
    } = req.body || {};

    if (
      completionNote !== undefined &&
      completionNote !== null &&
      typeof completionNote !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'completionNote must be a string.',
      });
    }

    const {
      data: relationship,
      error: relationshipError,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          request_type,
          title,
          status,
          scopes
        )
      `)
      .eq('id', relationshipId)
      .maybeSingle();

    if (relationshipError) {
      return mapPostgresError(
        res,
        relationshipError
      );
    }

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Provider relationship not found.',
      });
    }

    if (
      String(relationship.provider_id) !==
      String(providerId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have permission to complete this provider relationship.',
      });
    }

    // Idempotent completion.
    if (relationship.status === 'completed') {
      return res.json({
        success: true,
        message:
          'Provider relationship is already completed.',
        relationship,
      });
    }

    const request = relationship.request;

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      });
    }

    const trackable = ensureTrackableRequest(
      request.request_type
    );

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (!isActiveRequest(request)) {
      return res.status(400).json({
        success: false,
        message:
          'This request is no longer active.',
      });
    }

    if (relationship.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message:
          'Only an in-progress provider relationship can be completed.',
      });
    }

    const normalizedCompletionNote =
      typeof completionNote === 'string'
        ? completionNote.trim()
        : null;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .update({
        status: 'completed',
        completed_at:
          new Date().toISOString(),
        completion_notes:
          normalizedCompletionNote,
        asset_history_access: 'none',
        asset_history_access_granted_by: null,
        asset_history_access_granted_at: null,
      })
      .eq('id', relationshipId)
      .eq('provider_id', providerId)
      .eq('status', 'in_progress')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          title,
          status
        )
      `)
      .single();

    if (error) {
      return mapPostgresError(
        res,
        error,
        {
          checkStatus: 400,
          p0001Status: 400,
        }
      );
    }

    // Parent request fulfillment is determined by the database
    // trigger. The controller does not calculate required_providers
    // or manually change the parent request status.
    await notify(data.request.user_id, {
      type: 'provider_completed',
      requestId: data.request.id,
      requestProviderId: data.id,
      title: data.request.title,
      message:
        `A provider completed work on your request "${data.request.title}".`,
    });

    return res.json({
      success: true,
      message:
        'Provider work completed successfully.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'completeRequestProvider error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to complete provider work.',
      error: error.message,
    });
  }
};