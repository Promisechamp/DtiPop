// src/pop/controllers/request/assetAccessController.js

import { supabaseAdmin } from '../../../db/index.js';


import {
  getUserId,
  getErrorMessage,
} from './requestHelpers.js';


const loadRelationship = async ({ requestId, providerId }) => {
  const { data, error } = await supabaseAdmin
    .from('pop_request_providers')
    .select(`
      id,
      request_id,
      provider_id,
      status,
      asset_history_access,
      asset_history_access_granted_by,
      asset_history_access_granted_at
    `)
    .eq('request_id', requestId)
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) throw error;

  return data;
};


/**
 * Check whether a provider currently has asset-history access.
 *
 * Owner:
 *   always has access.
 *
 * Provider:
 *   only has access when the relationship has
 *   asset_history_access = "read".
 */
export const checkAssetHistoryAccess = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { requestId, providerId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    if (!requestId || !providerId) {
      return res.status(400).json({
        error: 'requestId and providerId are required.',
      });
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from('pop_requests')
      .select(`
        id,
        user_id,
        asset_id,
        status
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      throw requestError;
    }

    if (!request) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    const isOwner =
      String(request.user_id) === String(userId);

    /*
     * The request owner can always inspect the access state.
     */
    if (isOwner) {
      const relationship = await loadRelationship({
        requestId,
        providerId,
      });

      return res.json({
        hasAccess: true,
        assetHistoryAccess:
          relationship?.asset_history_access || 'none',
        relationshipId: relationship?.id || null,
        grantedBy:
          relationship?.asset_history_access_granted_by || null,
        grantedAt:
          relationship?.asset_history_access_granted_at || null,
      });
    }

    /*
     * A provider can only inspect their own relationship.
     */
    if (String(providerId) !== String(userId)) {
      return res.status(403).json({
        error: 'You are not authorized to check this access.',
      });
    }

    const relationship = await loadRelationship({
      requestId,
      providerId: userId,
    });

    if (!relationship) {
      return res.json({
        hasAccess: false,
        assetHistoryAccess: 'none',
        relationshipId: null,
        grantedBy: null,
        grantedAt: null,
      });
    }

    const hasAccess =
      relationship.asset_history_access === 'read';

    return res.json({
      hasAccess,
      assetHistoryAccess:
        relationship.asset_history_access || 'none',
      relationshipId: relationship.id,
      grantedBy:
        relationship.asset_history_access_granted_by || null,
      grantedAt:
        relationship.asset_history_access_granted_at || null,
    });
  } catch (error) {
    console.error(
      'checkAssetHistoryAccess error:',
      error
    );

    return res.status(500).json({
      error: getErrorMessage(
        error,
        'Failed to check asset history access.'
      ),
    });
  }
};


/**
 * Grant a provider read access to the request asset history.
 */
export const grantAssetHistoryAccess = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { requestId, providerId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from('pop_requests')
      .select('id, user_id, asset_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;

    if (!request) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    if (String(request.user_id) !== String(userId)) {
      return res.status(403).json({
        error: 'Only the request owner can grant asset history access.',
      });
    }

    if (!request.asset_id) {
      return res.status(400).json({
        error: 'This request has no asset.',
      });
    }

    const relationship = await loadRelationship({
      requestId,
      providerId,
    });

    if (!relationship) {
      return res.status(404).json({
        error: 'Provider relationship not found.',
      });
    }

    if (
      !['selected', 'accepted', 'in_progress'].includes(
        relationship.status
      )
    ) {
      return res.status(400).json({
        error: 'Asset history can only be granted to an active provider.',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('pop_request_providers')
      .update({
        asset_history_access: 'read',
        asset_history_access_granted_by: userId,
        asset_history_access_granted_at: new Date().toISOString(),
      })
      .eq('id', relationship.id)
      .select(`
        id,
        request_id,
        provider_id,
        status,
        asset_history_access,
        asset_history_access_granted_by,
        asset_history_access_granted_at
      `)
      .single();

    if (error) throw error;

    return res.json({
      message: 'Asset history access granted.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'grantAssetHistoryAccess error:',
      error
    );

    return res.status(500).json({
      error: getErrorMessage(
        error,
        'Failed to grant asset history access.'
      ),
    });
  }
};


/**
 * Revoke a provider's asset-history access.
 */
export const revokeAssetHistoryAccess = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { requestId, providerId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from('pop_requests')
      .select('id, user_id')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;

    if (!request) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    if (String(request.user_id) !== String(userId)) {
      return res.status(403).json({
        error: 'Only the request owner can revoke asset history access.',
      });
    }

    const relationship = await loadRelationship({
      requestId,
      providerId,
    });

    if (!relationship) {
      return res.status(404).json({
        error: 'Provider relationship not found.',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('pop_request_providers')
      .update({
        asset_history_access: 'none',
        asset_history_access_granted_by: null,
        asset_history_access_granted_at: null,
      })
      .eq('id', relationship.id)
      .select(`
        id,
        request_id,
        provider_id,
        status,
        asset_history_access,
        asset_history_access_granted_by,
        asset_history_access_granted_at
      `)
      .single();

    if (error) throw error;

    return res.json({
      message: 'Asset history access revoked.',
      relationship: data,
    });
  } catch (error) {
    console.error(
      'revokeAssetHistoryAccess error:',
      error
    );

    return res.status(500).json({
      error: getErrorMessage(
        error,
        'Failed to revoke asset history access.'
      ),
    });
  }
};