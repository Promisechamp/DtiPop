// controllers/request/requestDiscoveryController.js

import { supabaseAdmin } from '../../../db/index.js';

import {
  REQUEST_SELECT,
  TRACKABLE_REQUEST_TYPES,
  PROVIDER_PUBLIC_SELECT,
  ACTIVE_PROVIDER_RELATIONSHIP_STATUSES,
  getUserId,
  mapPostgresError,
  validateRequestAccess,
  ensureTrackableRequest,
  fetchProviderProfile,
  getActiveServices,
  getLocationFlags,
  getLocationMatchScore,
  normalizeText,
  isJsonObject,
} from './requestHelpers.js';

// ============================================================
// INTERNAL HELPERS
// ============================================================

const getRequestId = (request) =>
  request?.id ||
  request?.request_id ||
  request?.requestId ||
  null;

const getProviderId = (provider) =>
  provider?.id ||
  provider?.provider_id ||
  provider?.providerId ||
  null;

const getRequestScopes = (request) =>
  Array.isArray(request?.scopes)
    ? request.scopes
    : [];

const getRequestSummary = (request) => {
  const details = isJsonObject(request?.details)
    ? request.details
    : {};

  return (
    details.summary ||
    details.description ||
    request?.description ||
    ''
  );
};

const getServiceName = (service) =>
  normalizeText(
    service?.name ||
      service?.title ||
      service?.service_name ||
      service?.serviceName ||
      service?.category ||
      service?.type ||
      ''
  );

const getServiceCategories = (profile) => {
  const services = getActiveServices(profile);

  return [
    ...new Set(
      services
        .flatMap((service) => {
          const values = [
            service?.name,
            service?.title,
            service?.service_name,
            service?.serviceName,
            service?.category,
            service?.type,
          ];

          return values
            .filter(Boolean)
            .map((value) =>
              String(value).trim()
            );
        })
        .filter(Boolean)
    ),
  ];
};

const serviceMatchesRequest = (
  request,
  service
) => {
  if (!service) return false;

  const requestText = normalizeText(
    [
      request?.title,
      getRequestSummary(request),
      request?.request_type,
      ...getRequestScopes(request).flatMap(
        (scope) => {
          if (!isJsonObject(scope)) {
            return [scope];
          }

          return [
            scope?.name,
            scope?.title,
            scope?.description,
            scope?.type,
            ...(isJsonObject(scope?.fields)
              ? Object.values(scope.fields)
              : []),
          ];
        }
      ),
    ]
      .filter(Boolean)
      .join(' ')
  );

  const serviceText = normalizeText(
    [
      service?.name,
      service?.title,
      service?.service_name,
      service?.serviceName,
      service?.category,
      service?.type,
      service?.description,
      ...(Array.isArray(service?.categories)
        ? service.categories
        : []),
      ...(Array.isArray(service?.skills)
        ? service.skills
        : []),
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (!requestText || !serviceText) {
    return false;
  }

  const requestWords = new Set(
    requestText
      .split(/\s+/)
      .filter((word) => word.length >= 3)
  );

  const serviceWords = serviceText
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  return serviceWords.some((word) =>
    requestWords.has(word)
  );
};

const getServiceMatchScore = (
  request,
  profile
) => {
  const services = getActiveServices(profile);

  if (!services.length) {
    return 0;
  }

  if (
    services.some((service) =>
      serviceMatchesRequest(request, service)
    )
  ) {
    return 100;
  }

  const requestType =
    normalizeText(request?.request_type);

  if (
    services.some((service) => {
      const serviceType = normalizeText(
        service?.type ||
          service?.category ||
          service?.service_type ||
          ''
      );

      return (
        serviceType &&
        requestType &&
        serviceType.includes(requestType)
      );
    })
  ) {
    return 80;
  }

  return 0;
};

const calculateProviderMatch = (
  request,
  provider
) => {
  const serviceScore =
    getServiceMatchScore(
      request,
      provider
    );

  const locationScore =
    getLocationMatchScore(
      request?.location,
      provider?.location
    );

  // Service relevance carries more weight than
  // physical location. Location is still useful for
  // local requests.
  const score =
    serviceScore * 0.7 +
    locationScore * 0.3;

  const locationFlags =
    getLocationFlags(
      request?.location,
      provider?.location
    );

  return {
    score: Math.round(score),
    serviceScore,
    locationScore,
    ...locationFlags,
  };
};

const getProviderPublicProfile = (
  profile
) => {
  if (!profile) return null;

  const activeServices =
    getActiveServices(profile);

  return {
    id: profile.id,
    full_name: profile.full_name || null,
    avatar_url: profile.avatar_url || null,
    bio: profile.bio || null,
    location: profile.location || null,
    services: activeServices,
  };
};

const getActiveRelationshipIds = async (
  providerId,
  requestIds
) => {
  if (
    !providerId ||
    !Array.isArray(requestIds) ||
    !requestIds.length
  ) {
    return {
      ids: new Set(),
      error: null,
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from('pop_request_providers')
    .select('request_id')
    .eq('provider_id', providerId)
    .in(
      'status',
      ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
    )
    .in('request_id', requestIds);

  if (error) {
    return {
      ids: new Set(),
      error,
    };
  }

  return {
    ids: new Set(
      (data || [])
        .map((row) => row.request_id)
        .filter(Boolean)
        .map(String)
    ),
    error: null,
  };
};

// ============================================================
// FIND PROVIDERS FOR A REQUEST
// ============================================================

export const findRequestProvidersHandler = async (
  req,
  res
) => {
  try {
    const viewerId = getUserId(req);
    const requestId =
      req.params.id ||
      req.params.requestId ||
      req.query?.requestId;

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

    const access =
      await validateRequestAccess(
        requestId,
        viewerId
      );

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const request = access.data;

    const trackable =
      ensureTrackableRequest(
        request.request_type
      );

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (
      !['open', 'in_progress'].includes(
        request.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Provider discovery is only available for active requests.',
      });
    }

    const search =
      typeof req.query?.search === 'string'
        ? req.query.search.trim()
        : '';

    const rawLimit = Number(
      req.query?.limit ?? 20
    );

    const limit =
      Number.isFinite(rawLimit) &&
      rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 20;

    const offsetRaw = Number(
      req.query?.offset ?? 0
    );

    const offset =
      Number.isFinite(offsetRaw) &&
      offsetRaw >= 0
        ? Math.floor(offsetRaw)
        : 0;

    // ----------------------------------------------------------
    // Load provider profiles.
    //
    // Only profiles that actually have active provider services
    // can participate in provider discovery.
    // ----------------------------------------------------------

    const {
      data: profiles,
      error: profilesError,
    } = await supabaseAdmin
      .from('profiles')
      .select(PROVIDER_PUBLIC_SELECT)
      .neq('id', request.user_id);

    if (profilesError) {
      return mapPostgresError(
        res,
        profilesError
      );
    }

    const candidates = [];

    for (const profile of profiles || []) {
      const activeServices =
        getActiveServices(profile);

      if (!activeServices.length) {
        continue;
      }

      if (search) {
        const searchText =
          normalizeText(search);

        const profileText =
          normalizeText(
            [
              profile.full_name,
              profile.bio,
              ...getServiceCategories(
                profile
              ),
            ]
              .filter(Boolean)
              .join(' ')
          );

        if (
          !profileText.includes(
            searchText
          )
        ) {
          continue;
        }
      }

      const match =
        calculateProviderMatch(
          request,
          profile
        );

      // A provider must have some service relevance
      // to appear in request-specific discovery.
      if (match.serviceScore <= 0) {
        continue;
      }

      candidates.push({
        provider:
          getProviderPublicProfile(
            profile
          ),
        match,
      });
    }

    // ----------------------------------------------------------
    // Remove providers already actively connected.
    //
    // Historical completed/declined/cancelled rows are NOT
    // considered connected.
    // ----------------------------------------------------------

    const candidateIds =
      candidates
        .map((candidate) =>
          getProviderId(
            candidate.provider
          )
        )
        .filter(Boolean);

    const {
      ids: connectedProviderIds,
      error: relationshipError,
    } = await (async () => {
      if (!candidateIds.length) {
        return {
          ids: new Set(),
          error: null,
        };
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from('pop_request_providers')
        .select('provider_id')
        .eq('request_id', requestId)
        .in(
          'provider_id',
          candidateIds
        )
        .in(
          'status',
          ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
        );

      return {
        ids: new Set(
          (data || [])
            .map(
              (row) => row.provider_id
            )
            .filter(Boolean)
            .map(String)
        ),
        error,
      };
    })();

    if (relationshipError) {
      return mapPostgresError(
        res,
        relationshipError
      );
    }

    const availableCandidates =
      candidates.filter(
        (candidate) =>
          !connectedProviderIds.has(
            String(
              getProviderId(
                candidate.provider
              )
            )
          )
      );

    availableCandidates.sort(
      (a, b) =>
        b.match.score -
        a.match.score
    );

    const total =
      availableCandidates.length;

    const paginated =
      availableCandidates.slice(
        offset,
        offset + limit
      );

    return res.json({
      success: true,
      requestId,
      providers: paginated,
      pagination: {
        offset,
        limit,
        total,
        hasMore:
          offset + limit < total,
      },
    });
  } catch (error) {
    console.error(
      'findRequestProvidersHandler error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to find request providers.',
      error: error.message,
    });
  }
};

// ============================================================
// GET REQUESTS FOR ME
// ============================================================

export const getRequestsForMe = async (
  req,
  res
) => {
  try {
    const providerId = getUserId(req);

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const rawLimit = Number(
      req.query?.limit ?? 20
    );

    const limit =
      Number.isFinite(rawLimit) &&
      rawLimit > 0
        ? Math.min(
            Math.floor(rawLimit),
            100
          )
        : 20;

    const rawPage = Number(
      req.query?.page ?? 1
    );

    const page =
      Number.isFinite(rawPage) &&
      rawPage > 0
        ? Math.floor(rawPage)
        : 1;

    const offset =
      (page - 1) * limit;

    const search =
      typeof req.query?.search === 'string'
        ? req.query.search.trim()
        : '';

    const requestType =
      req.query?.requestType;

    if (
      requestType &&
      !TRACKABLE_REQUEST_TYPES.includes(
        requestType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'requestType must be service, repair, or maintenance.',
      });
    }

    // ----------------------------------------------------------
    // Load publicly discoverable active requests.
    //
    // Provider discovery does not bypass request visibility.
    // ----------------------------------------------------------

    let query = supabaseAdmin
      .from('pop_requests')
      .select(REQUEST_SELECT, {
        count: 'exact',
      })
      .in(
        'request_type',
        TRACKABLE_REQUEST_TYPES
      )
      .in('status', [
        'open',
        'in_progress',
      ])
      .or(
        'visibility.eq.public,visibility.eq.network'
      );

    if (requestType) {
      query = query.eq(
        'request_type',
        requestType
      );
    }

    if (search) {
      const safeSearch = search
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

    query = query
      .order('created_at', {
        ascending: false,
      });

    const {
      data: requests,
      error: requestsError,
      count,
    } = await query;

    if (requestsError) {
      return mapPostgresError(
        res,
        requestsError
      );
    }

    const requestIds =
      (requests || [])
        .map(getRequestId)
        .filter(Boolean);

    // ----------------------------------------------------------
    // CRITICAL:
    // Only active relationships make a request connected.
    //
    // completed / declined / cancelled relationships are
    // historical and therefore must not hide the request.
    // ----------------------------------------------------------

    const {
      ids: connectedRequestIds,
      error: connectedError,
    } =
      await getActiveRelationshipIds(
        providerId,
        requestIds
      );

    if (connectedError) {
      return mapPostgresError(
        res,
        connectedError
      );
    }

    const availableRequests =
      (requests || []).filter(
        (request) =>
          !connectedRequestIds.has(
            String(
              getRequestId(request)
            )
          )
      );

    // ----------------------------------------------------------
    // Score each request against the provider.
    // ----------------------------------------------------------

    const scoredRequests =
      availableRequests.map(
        (request) => {
          const match =
            calculateProviderMatch(
              request,
              {
                id: providerId,
              }
            );

          return {
            ...request,
            match,
          };
        }
      );

    // Fetch provider profile once for accurate service/location
    // scoring.
    const {
      data: providerProfile,
      error: providerError,
    } =
      await fetchProviderProfile(
        providerId,
        true
      );

    if (providerError) {
      return mapPostgresError(
        res,
        providerError
      );
    }

    if (!providerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const rescoredRequests =
      availableRequests.map(
        (request) => {
          const match =
            calculateProviderMatch(
              request,
              providerProfile
            );

          return {
            ...request,
            match,
          };
        }
      );

    rescoredRequests.sort(
      (a, b) =>
        b.match.score -
        a.match.score
    );

    const total =
      count !== null &&
      count !== undefined
        ? Math.max(
            0,
            Number(count) -
              connectedRequestIds.size
          )
        : rescoredRequests.length;

    const paginated =
      rescoredRequests.slice(
        offset,
        offset + limit
      );

    return res.json({
      success: true,
      requests: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    });
  } catch (error) {
    console.error(
      'getRequestsForMe error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch requests for you.',
      error: error.message,
    });
  }
};

// ============================================================
// GET PROVIDER PROFILE
// ============================================================

export const getProviderProfile = async (
  req,
  res
) => {
  try {
    const viewerId = getUserId(req);

    if (!viewerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const providerId =
      req.params.providerId ||
      req.params.id ||
      req.query?.providerId;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId is required.',
      });
    }

    const {
      data: profile,
      error: profileError,
    } =
      await fetchProviderProfile(
        providerId,
        true
      );

    if (profileError) {
      return mapPostgresError(
        res,
        profileError
      );
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found.',
      });
    }

    const activeServices =
      getActiveServices(profile);

    if (!activeServices.length) {
      return res.status(404).json({
        success: false,
        message:
          'This user does not currently have an active provider service.',
      });
    }

    // ----------------------------------------------------------
    // Completed provider work.
    // ----------------------------------------------------------

    const {
      data: completedRelationships,
      error: completedError,
    } =
      await supabaseAdmin
        .from('pop_request_providers')
        .select(`
          id,
          request_id,
          provider_id,
          status,
          completed_at,
          completion_notes,
          created_at,
          request:pop_requests (
            id,
            request_type,
            title,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .order(
          'completed_at',
          {
            ascending: false,
          }
        )
        .limit(20);

    if (completedError) {
      return mapPostgresError(
        res,
        completedError
      );
    }

    // ----------------------------------------------------------
    // Current active work.
    // ----------------------------------------------------------

    const {
      data: activeRelationships,
      error: activeError,
    } =
      await supabaseAdmin
        .from('pop_request_providers')
        .select(`
          id,
          request_id,
          provider_id,
          status,
          selected_at,
          accepted_at,
          started_at,
          request:pop_requests (
            id,
            request_type,
            title,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('provider_id', providerId)
        .in(
          'status',
          ACTIVE_PROVIDER_RELATIONSHIP_STATUSES
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

    if (activeError) {
      return mapPostgresError(
        res,
        activeError
      );
    }

    // ----------------------------------------------------------
    // Public provider response.
    //
    // Do not expose email, phone, private request details,
    // asset records, or maintenance history through this
    // discovery endpoint.
    // ----------------------------------------------------------

    const completedCount =
      completedRelationships?.length || 0;

    const activeCount =
      activeRelationships?.length || 0;

    const publicProfile = {
      id: profile.id,
      full_name:
        profile.full_name || null,
      avatar_url:
        profile.avatar_url || null,
      bio: profile.bio || null,
      location:
        profile.location || null,
      services: activeServices,
    };

    return res.json({
      success: true,
      provider: publicProfile,
      stats: {
        completedJobs: completedCount,
        activeJobs: activeCount,
      },
      completedWork:
        (completedRelationships || []).map(
          (relationship) => ({
            id: relationship.id,
            requestId:
              relationship.request_id,
            status:
              relationship.status,
            completedAt:
              relationship.completed_at,
            completionNotes:
              relationship.completion_notes,
            request:
              relationship.request
                ? {
                    id:
                      relationship.request.id,
                    requestType:
                      relationship.request
                        .request_type,
                    title:
                      relationship.request
                        .title,
                    status:
                      relationship.request
                        .status,
                    createdAt:
                      relationship.request
                        .created_at,
                    updatedAt:
                      relationship.request
                        .updated_at,
                  }
                : null,
          })
        ),
      activeWork:
        (activeRelationships || []).map(
          (relationship) => ({
            id: relationship.id,
            requestId:
              relationship.request_id,
            status:
              relationship.status,
            selectedAt:
              relationship.selected_at,
            acceptedAt:
              relationship.accepted_at,
            startedAt:
              relationship.started_at,
            request:
              relationship.request
                ? {
                    id:
                      relationship.request.id,
                    requestType:
                      relationship.request
                        .request_type,
                    title:
                      relationship.request
                        .title,
                    status:
                      relationship.request
                        .status,
                    createdAt:
                      relationship.request
                        .created_at,
                    updatedAt:
                      relationship.request
                        .updated_at,
                  }
                : null,
          })
        ),
    });
  } catch (error) {
    console.error(
      'getProviderProfile error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch provider profile.',
      error: error.message,
    });
  }
};