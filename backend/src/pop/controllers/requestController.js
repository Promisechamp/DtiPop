import { supabaseAdmin } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import {
  recordServiceCompleted,
} from '../services/reliabilityService.js';


// ============================================================
// CONSTANTS
// ============================================================

const REQUEST_TYPES = [
  'recommendation',
  'help',
  'service',
  'repair',
  'maintenance',
];

const URGENCIES = ['low', 'medium', 'high'];

const REQUEST_STATUSES = [
  'open',
  'in_progress',
  'fulfilled',
  'cancelled',
  'expired',
];

const VISIBILITIES = [
  'private',
  'household',
  'network',
  'public',
];

const MAINTENANCE_ACCESS = [
  'none',
  'public',
  'provider',
];

const TRACKABLE_REQUEST_TYPES = [
  'service',
  'repair',
  'maintenance',
];

const PROVIDER_RELATIONSHIP_STATUSES = [
  'contacted',
  'selected',
  'accepted',
  'in_progress',
  'completed',
  'declined',
  'cancelled',
];

const ACTIVE_PROVIDER_RELATIONSHIP_STATUSES = [
  'contacted',
  'selected',
  'accepted',
  'in_progress',
];

const LOCATION_MODES = [
  'local',
  'remote',
  'anywhere',
];

const LOCATION_VALUE_FIELDS = [
  'country',
  'state',
  'region',
  'city',
  'area',
  'district',
  'address',
];


// ============================================================
// SELECTS
// ============================================================

const REQUEST_SELECT = `
  *,
  profiles:user_id (
    id,
    full_name,
    email,
    avatar_url
  ),
  pop_households (
    id,
    name,
    household_type
  ),
  pop_assets (
    id,
    name,
    asset_type,
    location,
    condition
  )
`;

const PROVIDER_PROFILE_SELECT = `
  id,
  full_name,
  email,
  avatar_url,
  phone,
  bio,
  location,
  services
`;

const PROVIDER_PUBLIC_SELECT = `
  id,
  full_name,
  avatar_url,
  bio,
  location,
  services
`;


// ============================================================
// BASIC HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const isJsonObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const notify = async (userId, payload) => {
  if (!userId) return;

  try {
    await createNotification(userId, payload);
  } catch (error) {
    console.error('Notification error:', error);
  }
};

const validateDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const parsePagination = (page, limit) => {
  const parsedPage = Math.max(
    Number.parseInt(page, 10) || 1,
    1
  );

  const parsedLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    100
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
    from: (parsedPage - 1) * parsedLimit,
    to: parsedPage * parsedLimit - 1,
  };
};


// ============================================================
// LOCATION
// ============================================================

const getLocationMode = (location) => {
  if (
    !isJsonObject(location) ||
    location.mode === undefined ||
    location.mode === null ||
    location.mode === ''
  ) {
    return 'local';
  }

  return String(location.mode)
    .trim()
    .toLowerCase();
};

const normalizeLocation = (location = {}) => {
  if (!isJsonObject(location)) {
    return {
      mode: 'local',
    };
  }

  const mode = getLocationMode(location);

  if (
    mode === 'remote' ||
    mode === 'anywhere'
  ) {
    return {
      mode,
    };
  }

  const toStringValue = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const trimmed = String(value).trim();

    return trimmed || null;
  };

  const toNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  };

  return {
    mode: 'local',

    country: toStringValue(
      location.country
    ),

    state: toStringValue(
      location.state || location.region
    ),

    city: toStringValue(
      location.city
    ),

    area: toStringValue(
      location.area || location.district
    ),

    address: toStringValue(
      location.address
    ),

    latitude: toNumber(
      location.latitude
    ),

    longitude: toNumber(
      location.longitude
    ),
  };
};

const hasLocationValue = (location) =>
  isJsonObject(location) &&
  LOCATION_VALUE_FIELDS.some((key) => {
    const value = location[key];

    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    );
  });

const validateLocation = (location) => {
  if (!isJsonObject(location)) {
    return {
      valid: false,
      message:
        'location must be a JSON object.',
    };
  }

  const mode = getLocationMode(location);

  if (!LOCATION_MODES.includes(mode)) {
    return {
      valid: false,
      message:
        `Invalid location mode. Allowed values: ${LOCATION_MODES.join(', ')}.`,
    };
  }

  const normalized =
    normalizeLocation(location);

  if (
    mode === 'remote' ||
    mode === 'anywhere'
  ) {
    return {
      valid: true,
      location: normalized,
    };
  }

  if (!hasLocationValue(normalized)) {
    return {
      valid: false,
      message:
        'At least one location field is required for a local request.',
    };
  }

  return {
    valid: true,
    location: normalized,
  };
};

const getLocationMatchScore = (
  requestLocation,
  providerLocation
) => {
  const request =
    normalizeLocation(requestLocation);

  const provider =
    normalizeLocation(providerLocation);

  if (
    request.mode !== 'local' ||
    provider.mode !== 'local'
  ) {
    return 0;
  }

  const same = (a, b) =>
    typeof a === 'string' &&
    typeof b === 'string' &&
    a.trim().toLowerCase() ===
      b.trim().toLowerCase();

  let score = 0;

  if (
    request.country &&
    same(request.country, provider.country)
  ) {
    score += 40;
  }

  if (
    request.state &&
    same(request.state, provider.state)
  ) {
    score += 25;
  }

  if (
    request.city &&
    same(request.city, provider.city)
  ) {
    score += 25;
  }

  if (
    request.area &&
    same(request.area, provider.area)
  ) {
    score += 10;
  }

  return Math.min(score, 100);
};

const getLocationFlags = (score) => ({
  sameCountry: score >= 40,
  sameState: score >= 65,
  sameCity: score >= 90,
});


// ============================================================
// PROFILE SERVICES
// ============================================================

const getProfileServices = (profile) =>
  Array.isArray(profile?.services)
    ? profile.services.filter(isJsonObject)
    : [];

const isActiveService = (service) =>
  service?.is_active !== false;

const getActiveServices = (profile) =>
  getProfileServices(profile)
    .filter(isActiveService);

const profileHasAnyActiveService = (profile) =>
  getActiveServices(profile).length > 0;

const findActiveServiceById = (
  profile,
  serviceId
) =>
  getActiveServices(profile)
    .find(
      (service) =>
        service?.id === serviceId
    ) || null;


// ============================================================
// HOUSEHOLD HELPERS
// ============================================================

const verifyHouseholdMembership = async (
  userId,
  householdId
) => {
  if (!userId || !householdId) {
    return {
      isMember: false,
      role: null,
      error: null,
    };
  }

  const { data, error } =
    await supabaseAdmin
      .from('pop_household_members')
      .select(
        'household_id, role, status'
      )
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .eq('status', 'active')
      .maybeSingle();

  if (error) {
    return {
      isMember: false,
      role: null,
      error,
    };
  }

  return {
    isMember: !!data,
    role: data?.role || null,
    error: null,
  };
};

const getUserHouseholdIds = async (
  userId
) => {
  const { data, error } =
    await supabaseAdmin
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.household_id)
    .filter(Boolean);
};


// ============================================================
// REQUEST ACCESS
// ============================================================

const validateRequestAccess = async (
  requestId,
  userId
) => {
  const { data, error } =
    await supabaseAdmin
      .from('pop_requests')
      .select(`
        id,
        user_id,
        household_id,
        visibility,
        provider_access,
        request_type,
        status
      `)
      .eq('id', requestId)
      .maybeSingle();

  if (error) {
    return {
      valid: false,
      status: 500,
      message: error.message,
      data: null,
      role: null,
    };
  }

  if (!data) {
    return {
      valid: false,
      status: 404,
      message: 'Request not found.',
      data: null,
      role: null,
    };
  }

  if (data.user_id === userId) {
    return {
      valid: true,
      status: 200,
      message: null,
      data,
      role: 'owner',
    };
  }

  if (
    data.visibility === 'public' ||
    data.visibility === 'network'
  ) {
    return {
      valid: true,
      status: 200,
      message: null,
      data,
      role: null,
    };
  }

  if (
    data.visibility === 'household' &&
    data.household_id
  ) {
    const membership =
      await verifyHouseholdMembership(
        userId,
        data.household_id
      );

    if (membership.error) {
      return {
        valid: false,
        status: 500,
        message:
          membership.error.message,
        data,
        role: null,
      };
    }

    if (membership.isMember) {
      return {
        valid: true,
        status: 200,
        message: null,
        data,
        role: membership.role,
      };
    }
  }

  return {
    valid: false,
    status: 403,
    message:
      'You do not have access to this request.',
    data,
    role: null,
  };
};


// ============================================================
// REQUEST TYPE HELPERS
// ============================================================

const ensureTrackableRequest = (
  requestType
) => {
  if (
    !TRACKABLE_REQUEST_TYPES.includes(
      requestType
    )
  ) {
    return {
      valid: false,
      message:
        'Provider workflow is only available for service, repair, and maintenance requests.',
    };
  }

  return {
    valid: true,
    message: null,
  };
};


// ============================================================
// PROVIDER VALIDATION
// ============================================================

const fetchProviderProfile = async (
  providerId
) => {
  const { data, error } =
    await supabaseAdmin
      .from('profiles')
      .select(PROVIDER_PROFILE_SELECT)
      .eq('id', providerId)
      .maybeSingle();

  if (error) {
    return {
      provider: null,
      error,
    };
  }

  return {
    provider: data,
    error: null,
  };
};

const validateProvider = async (
  providerId
) => {
  if (!providerId) {
    return {
      valid: false,
      status: 400,
      message:
        'Provider ID is required.',
      provider: null,
    };
  }

  const {
    provider,
    error,
  } =
    await fetchProviderProfile(
      providerId
    );

  if (error) {
    return {
      valid: false,
      status: 500,
      message: error.message,
      provider: null,
    };
  }

  if (!provider) {
    return {
      valid: false,
      status: 404,
      message:
        'Provider profile not found.',
      provider: null,
    };
  }

  if (
    !profileHasAnyActiveService(
      provider
    )
  ) {
    return {
      valid: false,
      status: 400,
      message:
        'Selected profile is not an active service provider.',
      provider: null,
    };
  }

  return {
    valid: true,
    status: 200,
    message: null,
    provider,
  };
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
    const providerId = req.params.providerId;

    if (!viewerId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message:
          'Provider ID is required.',
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('profiles')
      .select(PROVIDER_PROFILE_SELECT)
      .eq('id', providerId)
      .maybeSingle();

    if (profileError) {
      console.error(
        'getProviderProfile profile error:',
        profileError
      );

      return res.status(500).json({
        success: false,
        message: profileError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message:
          'Provider profile not found.',
      });
    }

    const services =
      getActiveServices(profile);

    const {
      data: reputation,
      error: reputationError,
    } = await supabaseAdmin
      .from('pop_reputation')
      .select(`
        total_jobs,
        successful_jobs,
        disputes,
        repeat_users,
        trust_score,
        rating
      `)
      .eq('user_id', providerId)
      .maybeSingle();

    if (reputationError) {
      console.error(
        'getProviderProfile reputation error:',
        reputationError
      );

      return res.status(500).json({
        success: false,
        message:
          reputationError.message,
      });
    }

    const {
      data: workRows,
      error: workError,
    } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        id,
        request_id,
        provider_id,
        service_id,
        scope,
        status,
        accepted_at,
        started_at,
        completed_at,
        completion_notes,
        created_at,

        request:pop_requests (
          id,
          request_type,
          title,
          description,
          asset_id,
          details
        )
      `)
      .eq('provider_id', providerId)
      .eq('status', 'completed')
      .order('completed_at', {
        ascending: false,
      })
      .limit(50);

    if (workError) {
      console.error(
        'getProviderProfile work history error:',
        workError
      );

      return res.status(500).json({
        success: false,
        message: workError.message,
      });
    }

    const workHistory =
      (workRows || []).map(
        (work) => {
          const service =
            work.service_id
              ? services.find(
                  (item) =>
                    item?.id ===
                    work.service_id
                ) || null
              : null;

          return {
            id: work.id,
            requestId:
              work.request_id,

            requestType:
              work.request?.request_type ||
              null,

            title:
              work.request?.title ||
              null,

            description:
              work.request?.description ||
              null,

            assetId:
              work.request?.asset_id ||
              null,

            service,
            scope: work.scope,

            acceptedAt:
              work.accepted_at,

            startedAt:
              work.started_at,

            completedAt:
              work.completed_at,

            completionNotes:
              work.completion_notes,

            createdAt:
              work.created_at,
          };
        }
      );

    const {
      data: maintenanceRows,
      error: maintenanceError,
    } = await supabaseAdmin
      .from('pop_maintenance')
      .select(`
        id,
        household_id,
        user_id,
        asset_id,
        title,
        description,
        maintenance_type,
        last_completed_at,
        provider_name,
        cost,
        notes,
        status,
        provider_id,
        created_at
      `)
      .eq('provider_id', providerId)
      .order('last_completed_at', {
        ascending: false,
        nullsFirst: false,
      })
      .limit(50);

    if (maintenanceError) {
      console.error(
        'getProviderProfile maintenance error:',
        maintenanceError
      );

      return res.status(500).json({
        success: false,
        message:
          maintenanceError.message,
      });
    }

    return res.json({
      success: true,

      profile: {
        id: profile.id,
        fullName:
          profile.full_name,
        avatarUrl:
          profile.avatar_url,
        bio: profile.bio,
        location:
          profile.location,

        services,

        reputation: {
          totalJobs:
            reputation?.total_jobs || 0,

          successfulJobs:
            reputation?.successful_jobs ||
            0,

          disputes:
            reputation?.disputes || 0,

          repeatUsers:
            reputation?.repeat_users || 0,

          trustScore:
            reputation?.trust_score || 0,

          rating:
            reputation?.rating || 0,
        },

        workHistory,

        maintenanceHistory:
          maintenanceRows || [],

        isProvider:
          services.length > 0,
      },
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
      householdId,
      assetId,
      requestType,
      title,
      description,
      urgency = 'medium',
      location,
      details = {},
      expiresAt,
      visibility = 'household',
      providerAccess = 'none',
      maintenanceProviderId = null,
    } = req.body || {};

    const chosenProviderAccess = providerAccess;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required.',
      });
    }

    if (!REQUEST_TYPES.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid request type. Allowed values: ${REQUEST_TYPES.join(', ')}.`,
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

    if (!MAINTENANCE_ACCESS.includes(chosenProviderAccess)) {
      return res.status(400).json({
        success: false,
        message: `Invalid provider access. Allowed values: ${MAINTENANCE_ACCESS.join(', ')}.`,
      });
    }

    const trackable = ensureTrackableRequest(requestType);

    if (chosenProviderAccess !== 'none' && !trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (chosenProviderAccess === 'provider' && !maintenanceProviderId) {
      return res.status(400).json({
        success: false,
        message:
          'maintenanceProviderId is required when providerAccess is provider.',
      });
    }

    if (chosenProviderAccess !== 'provider' && maintenanceProviderId) {
      return res.status(400).json({
        success: false,
        message:
          'maintenanceProviderId can only be supplied when providerAccess is provider.',
      });
    }

    if (visibility === 'household' && !householdId) {
      return res.status(400).json({
        success: false,
        message: 'householdId is required when visibility is household.',
      });
    }

    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);

      if (membership.error) {
        return res.status(500).json({
          success: false,
          message: membership.error.message,
        });
      }

      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not an active member of this household.',
        });
      }
    }

    if (assetId) {
      const { data: asset, error } = await supabaseAdmin
        .from('pop_assets')
        .select('id,household_id,name,asset_type')
        .eq('id', assetId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found.',
        });
      }

      if (
        householdId &&
        asset.household_id &&
        asset.household_id !== householdId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The selected asset does not belong to the selected household.',
        });
      }
    }

    const locationValidation = validateLocation(location);

    if (!locationValidation.valid) {
      return res.status(400).json({
        success: false,
        message: locationValidation.message,
      });
    }

    if (!isJsonObject(details)) {
      return res.status(400).json({
        success: false,
        message: 'details must be a JSON object.',
      });
    }

    let normalizedExpiresAt = null;

    if (expiresAt !== null && expiresAt !== undefined && expiresAt !== '') {
      normalizedExpiresAt = validateDate(expiresAt);

      if (!normalizedExpiresAt) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be a valid date.',
        });
      }
    }

    if (maintenanceProviderId) {
      const providerValidation = await validateProvider(maintenanceProviderId);

      if (!providerValidation.valid) {
        return res.status(providerValidation.status).json({
          success: false,
          message: providerValidation.message,
        });
      }
    }

    const chosenVisibility =
      !householdId && visibility === 'household' ? 'public' : visibility;

    const insertPayload = {
      user_id: userId,
      household_id: householdId || null,
      asset_id: assetId || null,
      request_type: requestType,
      title: title.trim(),
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : null,
      urgency,
      location: locationValidation.location,
      visibility: chosenVisibility,
      provider_access: chosenProviderAccess,
      maintenance_provider_id: maintenanceProviderId || null,
      status: 'open',
      expires_at: normalizedExpiresAt,
      details,
    };

    const { data, error } = await supabaseAdmin
      .from('pop_requests')
      .insert(insertPayload)
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      console.error('createRequest insert error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (householdId && chosenVisibility !== 'private') {
      const { data: members } = await supabaseAdmin
        .from('pop_household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .eq('status', 'active')
        .neq('user_id', userId);

      await Promise.all(
        (members || []).map((member) =>
          notify(member.user_id, {
            type: 'request_created',
            requestId: data.id,
            title: data.title,
            message: `${data.title} was posted in your household.`,
          })
        )
      );
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
// GET REQUESTS
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

    const householdId = params.householdId;
    const requestType = params.requestType;
    const status = params.status;
    const urgency = params.urgency;
    const search = params.search;
    const createdBy = params.userId;
    const assetId = params.assetId;
    const showOpenOnly = params.showOpenOnly;
    const visibility = params.visibility;
    const providerAccess = params.providerAccess;

    const { page, limit } = parsePagination(params.page, params.limit);

    const householdIds = await getUserHouseholdIds(viewerId);

    if (householdId && !householdIds.includes(householdId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not an active member of this household.',
      });
    }

    if (requestType && !REQUEST_TYPES.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request type.',
      });
    }

    if (status && !REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request status.',
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

    if (providerAccess && !MAINTENANCE_ACCESS.includes(providerAccess)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider access.',
      });
    }

    const accessBranches = [
      `user_id.eq.${viewerId}`,
      'visibility.eq.public',
      'visibility.eq.network',
    ];

    if (householdId) {
      accessBranches.push(
        `and(visibility.eq.household,household_id.eq.${householdId})`
      );
    } else if (householdIds.length) {
      accessBranches.push(
        `and(visibility.eq.household,household_id.in.(${householdIds.join(',')}))`
      );
    }

    let query = supabaseAdmin
      .from('pop_requests')
      .select(REQUEST_SELECT, { count: 'exact' });

    query = query.or(accessBranches.join(','));

    if (search?.trim()) {
      const term = search
        .trim()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');

      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    if (requestType) query = query.eq('request_type', requestType);
    if (status) query = query.eq('status', status);
    if (urgency) query = query.eq('urgency', urgency);
    if (createdBy) query = query.eq('user_id', createdBy);
    if (assetId) query = query.eq('asset_id', assetId);
    if (visibility) query = query.eq('visibility', visibility);
    if (providerAccess) query = query.eq('provider_access', providerAccess);

    if (showOpenOnly === true || showOpenOnly === 'true') {
      query = query.in('status', ['open', 'in_progress']);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('getRequests query error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
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

export const getRequest = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    const requestId =
      req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message:
          'Request ID is required.',
      });
    }

    const access =
      await validateRequestAccess(
        requestId,
        userId
      );

    if (!access.valid) {
      return res
        .status(access.status)
        .json({
          success: false,
          message:
            access.message,
        });
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('pop_requests')
      .select(REQUEST_SELECT)
      .eq('id', requestId)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
      request: data,
    });
  } catch (error) {
    console.error(
      'getRequest error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch request.',
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

    const access = await validateRequestAccess(requestId, userId);

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (access.data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the request owner can update this request.',
      });
    }

    const {
      title,
      description,
      urgency,
      location,
      details,
      expiresAt,
      visibility,
      providerAccess,
      maintenanceProviderId,
      status,
    } = req.body || {};

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty.',
        });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description =
        typeof description === 'string' && description.trim()
          ? description.trim()
          : null;
    }

    if (urgency !== undefined) {
      if (!URGENCIES.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid urgency.',
        });
      }
      updates.urgency = urgency;
    }

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

    if (details !== undefined) {
      if (!isJsonObject(details)) {
        return res.status(400).json({
          success: false,
          message: 'details must be a JSON object.',
        });
      }
      updates.details = details;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        updates.expires_at = null;
      } else {
        const normalized = validateDate(expiresAt);

        if (!normalized) {
          return res.status(400).json({
            success: false,
            message: 'expiresAt must be a valid date.',
          });
        }
        updates.expires_at = normalized;
      }
    }

    if (visibility !== undefined) {
      if (!VISIBILITIES.includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid visibility.',
        });
      }

      if (visibility === 'household' && !access.data.household_id) {
        return res.status(400).json({
          success: false,
          message: 'Household visibility requires a household.',
        });
      }

      updates.visibility = visibility;
    }

    if (providerAccess !== undefined) {
      if (!MAINTENANCE_ACCESS.includes(providerAccess)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid provider access.',
        });
      }

      const trackable = ensureTrackableRequest(access.data.request_type);

      if (providerAccess !== 'none' && !trackable.valid) {
        return res.status(400).json({
          success: false,
          message: trackable.message,
        });
      }

      updates.provider_access = providerAccess;
    }

    if (maintenanceProviderId !== undefined) {
      const effectiveAccess =
        providerAccess !== undefined
          ? providerAccess
          : access.data.provider_access;

      if (maintenanceProviderId && effectiveAccess !== 'provider') {
        return res.status(400).json({
          success: false,
          message:
            'maintenanceProviderId requires providerAccess to be provider.',
        });
      }

      if (!maintenanceProviderId && effectiveAccess === 'provider') {
        return res.status(400).json({
          success: false,
          message:
            'A maintenance provider is required when providerAccess is provider.',
        });
      }

      if (maintenanceProviderId) {
        const validation = await validateProvider(maintenanceProviderId);

        if (!validation.valid) {
          return res.status(validation.status).json({
            success: false,
            message: validation.message,
          });
        }
      }

      updates.maintenance_provider_id = maintenanceProviderId || null;
    }

    if (status !== undefined) {
      if (!REQUEST_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request status.',
        });
      }
      updates.status = status;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields were supplied for update.',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('pop_requests')
      .update(updates)
      .eq('id', requestId)
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (status && status !== access.data.status && data.household_id) {
      const { data: members } = await supabaseAdmin
        .from('pop_household_members')
        .select('user_id')
        .eq('household_id', data.household_id)
        .eq('status', 'active')
        .neq('user_id', userId);

      await Promise.all(
        (members || []).map((member) =>
          notify(member.user_id, {
            type: 'request_status_updated',
            requestId: data.id,
            title: data.title,
            status,
            message: `Request "${data.title}" is now ${status}.`,
          })
        )
      );
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

export const deleteRequest = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    const requestId =
      req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const access =
      await validateRequestAccess(
        requestId,
        userId
      );

    if (!access.valid) {
      return res
        .status(access.status)
        .json({
          success: false,
          message:
            access.message,
        });
    }

    const isOwner =
      access.data.user_id ===
      userId;

    const isHouseholdAdmin =
      access.data.household_id &&
      ['owner', 'admin'].includes(
        access.role
      );

    if (
      !isOwner &&
      !isHouseholdAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the request owner or household owner/admin can delete this request.',
      });
    }

    const { error } =
      await supabaseAdmin
        .from('pop_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
      message:
        'Request deleted successfully.',
    });
  } catch (error) {
    console.error(
      'deleteRequest error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete request.',
      error: error.message,
    });
  }
};


// ============================================================
// FULFILL REQUEST
// ============================================================

export const fulfillRequest = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    const requestId =
      req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const access =
      await validateRequestAccess(
        requestId,
        userId
      );

    if (!access.valid) {
      return res
        .status(access.status)
        .json({
          success: false,
          message:
            access.message,
        });
    }

    if (
      access.data.user_id !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only the request owner can fulfill this request.',
      });
    }

    if (
      !['open', 'in_progress'].includes(
        access.data.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only open or in-progress requests can be fulfilled.',
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
      .select(REQUEST_SELECT)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (data.household_id) {
      const {
        data: members,
      } = await supabaseAdmin
        .from(
          'pop_household_members'
        )
        .select('user_id')
        .eq(
          'household_id',
          data.household_id
        )
        .eq('status', 'active')
        .neq(
          'user_id',
          userId
        );

      await Promise.all(
        (members || []).map(
          (member) =>
            notify(member.user_id, {
              type:
                'request_fulfilled',

              requestId:
                data.id,

              title:
                data.title,

              message:
                `Request "${data.title}" has been fulfilled.`,
            })
        )
      );
    }

    return res.json({
      success: true,
      message:
        'Request fulfilled successfully.',
      request: data,
    });
  } catch (error) {
    console.error(
      'fulfillRequest error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fulfill request.',
      error: error.message,
    });
  }
};


// ============================================================
// MATCHING
// ============================================================

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getRequestTerms = (
  request
) => {
  const values = [
    request.request_type,
    request.title,
    request.description,
  ];

  const collect = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      values.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (
      typeof value === 'object'
    ) {
      Object.values(value).forEach(
        collect
      );
    }
  };

  collect(request.details);

  return normalizeText(
    values
      .filter(Boolean)
      .join(' ')
  );
};

const getWords = (text) =>
  [
    ...new Set(
      normalizeText(text)
        .split(/[^a-z0-9]+/)
        .map((word) =>
          word.trim()
        )
        .filter(
          (word) =>
            word.length >= 3
        )
    ),
  ];

const scoreService = (
  request,
  service
) => {
  const requestText =
    getRequestTerms(request);

  const requestWords =
    getWords(requestText);

  const requestTitle =
    normalizeText(
      request.title
    );

  const categoryText =
    normalizeText(
      Array.isArray(
        service.categories
      )
        ? service.categories.join(
            ' '
          )
        : service.categories || ''
    );

  const serviceText =
    normalizeText(
      [
        service.service_type,
        service.title,
        service.description,
        categoryText,
      ]
        .filter(Boolean)
        .join(' ')
    );

  let score = 0;

  if (requestTitle) {
    if (
      categoryText.includes(
        requestTitle
      )
    ) {
      score += 50;
    } else if (
      serviceText.includes(
        requestTitle
      )
    ) {
      score += 35;
    } else {
      const titleWords =
        getWords(
          requestTitle
        );

      const titleHits =
        titleWords.filter(
          (word) =>
            categoryText.includes(
              word
            ) ||
            serviceText.includes(
              word
            )
        ).length;

      if (
        titleWords.length &&
        titleHits ===
          titleWords.length
      ) {
        score += 25;
      } else if (titleHits) {
        score +=
          titleHits * 5;
      }
    }
  }

  const requestType =
    normalizeText(
      request.request_type
    );

  const serviceType =
    normalizeText(
      service.service_type
    );

  if (
    requestType &&
    serviceType
  ) {
    if (
      serviceType ===
      requestType
    ) {
      score += 30;
    } else if (
      serviceType.includes(
        requestType
      ) ||
      requestType.includes(
        serviceType
      )
    ) {
      score += 20;
    }
  }

  const seen = new Set();

  for (
    const word of requestWords
  ) {
    if (seen.has(word)) {
      continue;
    }

    seen.add(word);

    if (
      categoryText.includes(word)
    ) {
      score += 5;
    } else if (
      serviceText.includes(word)
    ) {
      score += 3;
    }
  }

  return score;
};


// ============================================================
// FIND REQUEST PROVIDERS
// ============================================================

export const findRequestProviders = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const access = await validateRequestAccess(requestId, userId);

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from('pop_requests')
      .select(`
        id,
        user_id,
        request_type,
        title,
        description,
        urgency,
        location,
        details,
        status,
        provider_access
      `)
      .eq('id', requestId)
      .single();

    if (requestError) {
      return res.status(500).json({
        success: false,
        message: requestError.message,
      });
    }

    const trackable = ensureTrackableRequest(request.request_type);

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (request.provider_access !== 'public') {
      return res.status(400).json({
        success: false,
        message:
          'Provider discovery is only available when provider access is public.',
      });
    }

    if (!['open', 'in_progress'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message:
          'Providers can only be discovered for open or in-progress requests.',
      });
    }

    const { data: relationships, error: relationshipError } =
      await supabaseAdmin
        .from('pop_request_providers')
        .select('provider_id,status,service_id')
        .eq('request_id', requestId);

    if (relationshipError) {
      return res.status(500).json({
        success: false,
        message: relationshipError.message,
      });
    }

    const activeProviderIds = new Set(
      (relationships || [])
        .filter((row) =>
          ACTIVE_PROVIDER_RELATIONSHIP_STATUSES.includes(row.status)
        )
        .map((row) => row.provider_id)
    );

    const { data: profileRows, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(PROVIDER_PROFILE_SELECT);

    if (profilesError) {
      return res.status(500).json({
        success: false,
        message: profilesError.message,
      });
    }

    const candidates = (profileRows || [])
      .filter((profile) => profile.id !== request.user_id)
      .filter((profile) => !activeProviderIds.has(profile.id))
      .filter(profileHasAnyActiveService);

    const locationMode = getLocationMode(request.location);

    const providers = candidates
      .map((profile) => {
        const services = getActiveServices(profile);

        let bestService = null;
        let bestServiceScore = 0;

        for (const service of services) {
          const score = scoreService(request, service);

          if (score > bestServiceScore) {
            bestServiceScore = score;
            bestService = service;
          }
        }

        if (!bestService) return null;

        const locationScore =
          locationMode === 'local'
            ? getLocationMatchScore(request.location, profile.location)
            : 0;

        const totalScore = bestServiceScore + locationScore;

        return {
          provider: {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            location: profile.location,
          },
          service: bestService,
          match: {
            score: totalScore,
            serviceScore: bestServiceScore,
            locationScore,
            ...(locationMode === 'local'
              ? getLocationFlags(locationScore)
              : { sameCountry: false, sameState: false, sameCity: false }),
            locationMode,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.match.score - a.match.score);

    return res.json({
      success: true,
      request,
      providers,
    });
  } catch (error) {
    console.error('findRequestProviders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to find request providers.',
      error: error.message,
    });
  }
};



// ============================================================
// CONNECT / SELECT PROVIDER
// ============================================================

export const connectRequestProvider = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { providerId, serviceId = null, scope = null } = req.body || {};

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId is required.',
      });
    }

    const access = await validateRequestAccess(requestId, userId);

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (access.data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the request owner can select a provider.',
      });
    }

    const trackable = ensureTrackableRequest(access.data.request_type);

    if (!trackable.valid) {
      return res.status(400).json({
        success: false,
        message: trackable.message,
      });
    }

    if (!['open', 'in_progress'].includes(access.data.status)) {
      return res.status(400).json({
        success: false,
        message:
          'A provider can only be selected for an open or in-progress request.',
      });
    }

    if (!['public', 'provider'].includes(access.data.provider_access)) {
      return res.status(400).json({
        success: false,
        message: 'Provider selection requires provider discovery access.',
      });
    }

    if (providerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot select yourself as the provider.',
      });
    }

    const validation = await validateProvider(providerId);

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    const provider = validation.provider;

    if (serviceId) {
      const service = findActiveServiceById(provider, serviceId);

      if (!service) {
        return res.status(404).json({
          success: false,
          message:
            'The selected service does not belong to this provider or is inactive.',
        });
      }
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('pop_request_providers')
      .select('id,status,provider_id')
      .eq('request_id', requestId)
      .eq('provider_id', providerId)
      .not('status', 'in', '(declined,cancelled)')
      .limit(1);

    if (existingError) {
      return res.status(500).json({
        success: false,
        message: existingError.message,
      });
    }

    if (existingRows?.length) {
      return res.status(409).json({
        success: false,
        message: 'This provider is already connected to the request.',
        relationship: existingRows[0],
      });
    }

    const now = new Date().toISOString();

    const { data: relationship, error: relationshipError } = await supabaseAdmin
      .from('pop_request_providers')
      .insert({
        request_id: requestId,
        provider_id: providerId,
        service_id: serviceId || null,
        scope:
          typeof scope === 'string' && scope.trim() ? scope.trim() : null,
        status: 'selected',
        selected_at: now,
      })
      .select('*')
      .single();

    if (relationshipError) {
      if (relationshipError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'This provider is already connected to the request.',
        });
      }

      return res.status(500).json({
        success: false,
        message: relationshipError.message,
      });
    }

    const { data: updatedRequest, error: requestUpdateError } =
      await supabaseAdmin
        .from('pop_requests')
        .select(REQUEST_SELECT)
        .eq('id', requestId)
        .single();

    if (requestUpdateError) {
      await supabaseAdmin
        .from('pop_request_providers')
        .delete()
        .eq('id', relationship.id);

      return res.status(500).json({
        success: false,
        message: requestUpdateError.message,
      });
    }

    await notify(providerId, {
      type: 'request_provider_selected',
      requestId,
      requestProviderId: relationship.id,
      title: updatedRequest.title,
      message: `You were selected for the request "${updatedRequest.title}".`,
    });

    return res.status(201).json({
      success: true,
      message: 'Provider selected successfully.',
      request: updatedRequest,
      relationship,
      provider: {
        id: provider.id,
        full_name: provider.full_name,
        avatar_url: provider.avatar_url,
        bio: provider.bio,
        location: provider.location,
        services: getActiveServices(provider),
      },
    });
  } catch (error) {
    console.error('connectRequestProvider error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect provider.',
      error: error.message,
    });
  }
};





// ============================================================
// GET REQUEST PROVIDERS
// ============================================================

export const getRequestProviders = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const access = await validateRequestAccess(requestId, userId);

    if (!access.valid) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        *,
        provider:profiles!pop_request_providers_provider_id_fkey (
          id,
          full_name,
          avatar_url,
          bio,
          location,
          services
        )
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const providers = (data || []).map((relationship) => {
      const providerServices = getActiveServices(relationship.provider);

      const service = relationship.service_id
        ? providerServices.find(
            (item) => item?.id === relationship.service_id
          ) || null
        : null;

      return {
        ...relationship,
        provider: relationship.provider
          ? {
              id: relationship.provider.id,
              full_name: relationship.provider.full_name,
              avatar_url: relationship.provider.avatar_url,
              bio: relationship.provider.bio,
              location: relationship.provider.location,
              services: providerServices,
            }
          : null,
        service,
        isSelected:
          access.data.maintenance_provider_id === relationship.provider_id,
      };
    });

    return res.json({
      success: true,
      request: {
        id: access.data.id,
        providerAccess: access.data.provider_access,
        maintenanceProviderId: access.data.maintenance_provider_id,
      },
      providers,
    });
  } catch (error) {
    console.error('getRequestProviders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request providers.',
      error: error.message,
    });
  }
};






// ============================================================
// RESPOND TO PROVIDER REQUEST
// ============================================================

export const respondToRequestProvider = async (req, res) => {
  try {
    const userId = getUserId(req);
    const relationshipId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { action, scope = null } = req.body || {};

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be accept or decline.',
      });
    }

    const { data: relationship, error } = await supabaseAdmin
      .from('pop_request_providers')
      .select(`
        *,
        request:pop_requests (
          id,
          user_id,
          title,
          request_type,
          status
        )
      `)
      .eq('id', relationshipId)
      .eq('provider_id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Provider relationship not found.',
      });
    }

    if (!['contacted', 'selected'].includes(relationship.status)) {
      return res.status(400).json({
        success: false,
        message:
          'This provider relationship can no longer be responded to.',
      });
    }

    if (!['open', 'in_progress'].includes(relationship.request?.status)) {
      return res.status(400).json({
        success: false,
        message: 'The request is no longer active.',
      });
    }

    const now = new Date().toISOString();

    const updatePayload =
      action === 'accept'
        ? {
            status: 'accepted',
            accepted_at: now,
            scope:
              scope !== null && scope !== undefined
                ? String(scope).trim() || relationship.scope || null
                : relationship.scope,
          }
        : {
            status: 'declined',
            declined_at: now,
          };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pop_request_providers')
      .update(updatePayload)
      .eq('id', relationshipId)
      .eq('provider_id', userId)
      .in('status', ['contacted', 'selected'])
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    await notify(relationship.request.user_id, {
      type:
        action === 'accept'
          ? 'request_provider_accepted'
          : 'request_provider_declined',
      requestId: relationship.request.id,
      requestProviderId: relationshipId,
      title: relationship.request.title,
      message:
        action === 'accept'
          ? `A provider accepted your request "${relationship.request.title}".`
          : `A provider declined your request "${relationship.request.title}".`,
    });

    return res.json({
      success: true,
      message:
        action === 'accept'
          ? 'Request accepted successfully.'
          : 'Request declined successfully.',
      relationship: updated,
    });
  } catch (error) {
    console.error('respondToRequestProvider error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to provider request.',
      error: error.message,
    });
  }
};





// ============================================================
// START PROVIDER WORK
// ============================================================

export const startRequestProvider =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const relationshipId =
        req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      const {
        data: relationship,
        error,
      } = await supabaseAdmin
        .from(
          'pop_request_providers'
        )
        .select(`
          id,
          request_id,
          provider_id,
          status,
          request:pop_requests (
            id,
            user_id,
            title,
            status,
            maintenance_provider_id
          )
        `)
        .eq(
          'id',
          relationshipId
        )
        .eq(
          'provider_id',
          userId
        )
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!relationship) {
        return res.status(404).json({
          success: false,
          message:
            'Provider relationship not found.',
        });
      }

      if (
        relationship.status !==
        'accepted'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Only an accepted provider relationship can be started.',
        });
      }

      if (
        !['open', 'in_progress'].includes(
          relationship.request?.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The request is no longer active.',
        });
      }

      const now =
        new Date().toISOString();

      const {
        data: updatedRows,
        error:
          updateError,
      } = await supabaseAdmin
        .from(
          'pop_request_providers'
        )
        .update({
          status:
            'in_progress',

          started_at:
            now,
        })
        .eq(
          'id',
          relationshipId
        )
        .eq(
          'provider_id',
          userId
        )
        .eq(
          'status',
          'accepted'
        )
        .select('*');

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      if (
        !updatedRows?.length
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This provider relationship is no longer accepted.',
        });
      }

      const updated =
        updatedRows[0];

      if (
        relationship.request.status ===
        'open'
      ) {
        await supabaseAdmin
          .from('pop_requests')
          .update({
            status:
              'in_progress',
          })
          .eq(
            'id',
            relationship.request_id
          )
          .eq(
            'status',
            'open'
          );
      }

      await notify(
        relationship.request.user_id,
        {
          type:
            'request_provider_started',

          requestId:
            relationship.request_id,

          requestProviderId:
            relationshipId,

          title:
            relationship.request
              .title,

          message:
            `Work has started on your request "${relationship.request.title}".`,
        }
      );

      return res.json({
        success: true,

        message:
          'Provider work started successfully.',

        relationship:
          updated,
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
// COMPLETE PROVIDER WORK
// ============================================================

export const completeRequestProvider =
  async (req, res) => {
    try {
      const providerUserId =
        getUserId(req);

      const relationshipId =
        req.params.id;

      if (!providerUserId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      const {
        completionNotes = null,
      } = req.body || {};

      const {
        data: relationship,
        error,
      } = await supabaseAdmin
        .from(
          'pop_request_providers'
        )
        .select(`
          *,
          request:pop_requests (
            id,
            user_id,
            title,
            request_type,
            asset_id,
            status,
            household_id
          )
        `)
        .eq(
          'id',
          relationshipId
        )
        .eq(
          'provider_id',
          providerUserId
        )
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!relationship) {
        return res.status(404).json({
          success: false,
          message:
            'Provider relationship not found.',
        });
      }

      if (
        relationship.status ===
        'completed'
      ) {
        return res.json({
          success: true,
          message:
            'Provider work was already completed.',
          relationship,
          alreadyCompleted: true,
        });
      }

      if (
        relationship.status !==
        'in_progress'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Only an in-progress provider relationship can be completed.',
        });
      }

      const now =
        new Date().toISOString();

      const {
        data: updatedRows,
        error:
          updateError,
      } = await supabaseAdmin
        .from(
          'pop_request_providers'
        )
        .update({
          status:
            'completed',

          completed_at:
            now,

          completion_notes:
            typeof completionNotes ===
              'string' &&
            completionNotes.trim()
              ? completionNotes.trim()
              : null,
        })
        .eq(
          'id',
          relationshipId
        )
        .eq(
          'provider_id',
          providerUserId
        )
        .eq(
          'status',
          'in_progress'
        )
        .select(`
          *,
          request:pop_requests (
            id,
            user_id,
            title,
            request_type,
            asset_id,
            status,
            household_id
          )
        `);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      if (
        !updatedRows?.length
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This provider relationship is no longer in progress.',
        });
      }

      const completed =
        updatedRows[0];

      let reliability = null;

      try {
        reliability =
          await recordServiceCompleted({
            userId:
              providerUserId,

            requestId:
              completed.request.id,

            requestProviderId:
              completed.id,

            assetId:
              completed.request
                .asset_id ||
              null,

            requestType:
              completed.request
                .request_type ||
              null,

            title:
              completed.request
                .title ||
              null,
          });
      } catch (reliabilityError) {
        console.error(
          'recordServiceCompleted error:',
          reliabilityError
        );
      }

      await notify(
        completed.request?.user_id,
        {
          type:
            'request_provider_completed',

          requestId:
            completed.request_id,

          requestProviderId:
            completed.id,

          title:
            completed.request?.title,

          message:
            `The provider completed work on "${completed.request?.title}".`,
        }
      );

      return res.json({
        success: true,

        message:
          'Provider work completed successfully.',

        relationship:
          completed,

        reliability,

        requestFulfilled:
          completed.request?.status ===
          'fulfilled',
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


// ============================================================
// CONVENIENCE ENDPOINTS
// ============================================================

export const getHouseholdRequests =
  async (req, res) =>
    getRequests(
      req,
      res,
      {
        householdId:
          req.params.householdId,
      }
    );

export const getMyRequests =
  async (req, res) => {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    return getRequests(
      req,
      res,
      {
        userId,
      }
    );
  };

export const getOpenHouseholdRequests =
  async (req, res) =>
    getRequests(
      req,
      res,
      {
        householdId:
          req.params.householdId,

        showOpenOnly:
          'true',
      }
    );