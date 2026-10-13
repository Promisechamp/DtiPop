// controllers/request/requestHelpers.js
//
// Shared helpers, constants, and small utilities for the request module.
// Imported by every controller under controllers/request/.

import { supabaseAdmin } from '../../../db/index.js';
import { createPOPNotification } from '../../../shared/controllers/notificationController.js';

// ============================================================
// CONSTANTS
// ============================================================

export const REQUEST_TYPES = [
  'recommendation', 'help', 'service', 'repair', 'maintenance',
];

export const URGENCIES = ['low', 'medium', 'high'];

export const REQUEST_STATUSES = [
  'open', 'in_progress', 'fulfilled', 'cancelled', 'expired',
];

export const VISIBILITIES = ['private', 'household', 'network', 'public'];

export const LOCATION_MODES = ['local', 'remote', 'anywhere'];

export const TRACKABLE_REQUEST_TYPES = ['service', 'repair', 'maintenance'];

export const PROVIDER_RELATIONSHIP_STATUSES = [
  'selected', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled',
];

export const ACTIVE_PROVIDER_RELATIONSHIP_STATUSES = [
  'selected', 'accepted', 'in_progress',
];

export const ASSET_HISTORY_ACCESS = ['none', 'read'];

export const LOCATION_VALUE_FIELDS = [
  'country', 'state', 'region', 'city', 'area', 'district', 'address',
];

// Minimum future lead for expires_at to avoid the DB
// pop_requests_expires_after_created_check race.
export const MIN_EXPIRY_LEAD_MS = 5_000;

export const REQUEST_SELECT = `
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

export const PROVIDER_PROFILE_SELECT = `
  id,
  full_name,
  email,
  avatar_url,
  phone,
  bio,
  location,
  services
`;

export const PROVIDER_PUBLIC_SELECT = `
  id,
  full_name,
  avatar_url,
  bio,
  location,
  services
`;

// ============================================================
// BASIC UTILS
// ============================================================

export const getUserId = (req) =>
  req.user?.id ||
  req.user?.user_id ||
  req.auth?.user?.id ||
  req.auth?.user_id ||
  null;

export const isJsonObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const getErrorMessage = (error, fallback = 'Something went wrong.') =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const validateDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, value: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { valid: false, value: null };
  return { valid: true, value: date.toISOString() };
};

export const parsePagination = (req) => {
  const rawPage = Number(req.query?.page ?? 1);
  const rawLimit = Number(req.query?.limit ?? 20);

  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 20;

  return { page, limit, offset: (page - 1) * limit };
};

export const notify = async (userId, payload) => {
  if (!userId) return null;
  try {
    return await createPOPNotification({ userId, ...payload });
  } catch (error) {
    console.error('POP notification error:', error);
    return null;
  }
};

// Postgres / PostgREST error → HTTP response mapper.
export const mapPostgresError = (res, error, overrides = {}) => {
  if (error?.code === 'P0001') {
    return res.status(overrides.p0001Status || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (error?.code === '23514') {
    return res.status(overrides.checkStatus || 400).json({
      success: false,
      message: error.message || 'Constraint violation.',
    });
  }

  if (error?.code === '23505') {
    return res.status(overrides.uniqueStatus || 409).json({
      success: false,
      message:
        overrides.uniqueMessage ||
        'Conflict: uniqueness constraint violation.',
    });
  }

  if (error?.code === '23503') {
    return res.status(overrides.fkStatus || 409).json({
      success: false,
      message:
        overrides.fkMessage ||
        'Conflict: foreign key constraint violation.',
    });
  }

  if (error?.code === 'PGRST116') {
    return res.status(overrides.noRowsStatus || 404).json({
      success: false,
      message: overrides.noRowsMessage || 'Not found.',
    });
  }

  return res.status(500).json({
    success: false,
    message: error?.message || 'Database error.',
  });
};

// ============================================================
// SCOPE HELPERS
// ============================================================

export const getScopeId = (scope) => {
  if (!scope || typeof scope !== 'object') return null;
  return scope.id || scope.scope_id || scope.scopeId || null;
};

export const getScopeKey = (scope) => {
  const id = getScopeId(scope);
  return id ? String(id) : null;
};

// Resolve an array of scope IDs into the request's actual scope objects.
export const resolveScopeObjects = (requestScopes, requestedIds) => {
  const safeScopes = Array.isArray(requestScopes) ? requestScopes : [];

  const wantedIds = [
    ...new Set(
      (requestedIds || [])
        .map((value) =>
          value && typeof value === 'object'
            ? getScopeId(value)
            : String(value)
        )
        .filter(Boolean)
    ),
  ];

  const requestIds = safeScopes
    .map((scope) => getScopeId(scope))
    .filter(Boolean)
    .map(String);

  const invalidIds = wantedIds.filter((id) => !requestIds.includes(id));

  const objects = safeScopes.filter((scope) => {
    const id = getScopeId(scope);
    return id && wantedIds.includes(String(id));
  });

  return { objects, invalidIds, wantedIds, requestIds };
};

// ============================================================
// LOCATION HELPERS
// ============================================================

const getLocationMode = (location) => {
  if (!isJsonObject(location)) return 'local';
  return LOCATION_MODES.includes(location.mode) ? location.mode : 'local';
};

export const normalizeLocation = (location = {}) => {
  if (typeof location === 'string') {
    return { mode: 'local', address: location.trim() };
  }

  if (!isJsonObject(location)) return { mode: 'local' };

  const normalized = { mode: getLocationMode(location) };

  for (const field of LOCATION_VALUE_FIELDS) {
    if (
      location[field] !== undefined &&
      location[field] !== null &&
      String(location[field]).trim()
    ) {
      normalized[field] = String(location[field]).trim();
    }
  }

  if (
    location.latitude !== undefined &&
    location.latitude !== null &&
    location.latitude !== ''
  ) {
    const latitude = Number(location.latitude);
    if (Number.isFinite(latitude)) normalized.latitude = latitude;
  }

  if (
    location.longitude !== undefined &&
    location.longitude !== null &&
    location.longitude !== ''
  ) {
    const longitude = Number(location.longitude);
    if (Number.isFinite(longitude)) normalized.longitude = longitude;
  }

  return normalized;
};

const hasLocationValue = (location) =>
  LOCATION_VALUE_FIELDS.some(
    (field) =>
      location?.[field] !== undefined &&
      location?.[field] !== null &&
      String(location[field]).trim()
  ) ||
  Number.isFinite(Number(location?.latitude)) ||
  Number.isFinite(Number(location?.longitude));

export const validateLocation = (location = {}) => {
  if (!isJsonObject(location) && typeof location !== 'string') {
    return {
      valid: false,
      message: 'location must be an object or string.',
      location: null,
    };
  }

  const normalized = normalizeLocation(location);

  if (!LOCATION_MODES.includes(normalized.mode)) {
    return { valid: false, message: 'Invalid location mode.', location: null };
  }

  if (normalized.mode === 'local' && !hasLocationValue(normalized)) {
    return {
      valid: false,
      message: 'A local request must include a location.',
      location: null,
    };
  }

  return { valid: true, message: null, location: normalized };
};

export const getLocationMatchScore = (requestLocation, providerLocation) => {
  const request = normalizeLocation(requestLocation);
  const provider = normalizeLocation(providerLocation);

  if (request.mode === 'anywhere' || request.mode === 'remote') return 100;

  const eq = (a, b) =>
    a && b && String(a).toLowerCase() === String(b).toLowerCase();

  let score = 0;

  if (eq(request.country, provider.country)) score += 20;
  if (eq(request.state, provider.state)) score += 25;
  if (eq(request.region, provider.region)) score += 10;
  if (eq(request.city, provider.city)) score += 25;
  if (eq(request.area, provider.area)) score += 10;
  if (eq(request.district, provider.district)) score += 10;

  return Math.min(score, 100);
};

export const getLocationFlags = (requestLocation, providerLocation) => {
  const request = normalizeLocation(requestLocation);
  const provider = normalizeLocation(providerLocation);

  const eq = (a, b) =>
    a && b && String(a).toLowerCase() === String(b).toLowerCase();

  const sameCountry = eq(request.country, provider.country);
  const sameState = sameCountry && eq(request.state, provider.state);
  const sameCity = sameState && eq(request.city, provider.city);

  return {
    sameCountry,
    sameState,
    sameCity,
    score: getLocationMatchScore(request, provider),
  };
};

// ============================================================
// PROFILE / SERVICE HELPERS
// ============================================================

export const getProfileServices = (profile) => {
  if (!profile) return [];
  if (Array.isArray(profile.services)) return profile.services;
  if (isJsonObject(profile.services) && Array.isArray(profile.services.items)) {
    return profile.services.items;
  }
  return [];
};

export const isActiveService = (service) => {
  if (!isJsonObject(service)) return false;

  if (
    service.active === false ||
    service.is_active === false ||
    service.enabled === false
  ) return false;

  if (
    service.status &&
    ['inactive', 'disabled', 'archived'].includes(
      String(service.status).toLowerCase()
    )
  ) return false;

  return true;
};

export const getActiveServices = (profile) =>
  getProfileServices(profile).filter(isActiveService);

export const profileHasAnyActiveService = (profile) =>
  getActiveServices(profile).length > 0;

export const findActiveServiceById = (profile, serviceId) => {
  if (!serviceId) return null;
  return (
    getActiveServices(profile).find(
      (service) =>
        String(service?.id ?? service?.service_id ?? '') === String(serviceId)
    ) || null
  );
};

export const fetchProviderProfile = async (providerId, publicOnly = false) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(publicOnly ? PROVIDER_PUBLIC_SELECT : PROVIDER_PROFILE_SELECT)
    .eq('id', providerId)
    .maybeSingle();

  return { data, error };
};

export const validateProvider = async (providerId) => {
  const { data: profile, error } = await fetchProviderProfile(providerId);

  if (error) {
    return {
      valid: false, status: 500, message: error.message,
      profile: null, services: [],
    };
  }

  if (!profile) {
    return {
      valid: false, status: 404, message: 'Provider not found.',
      profile: null, services: [],
    };
  }

  const services = getActiveServices(profile);

  if (!services.length) {
    return {
      valid: false,
      status: 400,
      message: 'This user does not currently have an active provider service.',
      profile,
      services,
    };
  }

  return { valid: true, status: 200, message: null, profile, services };
};

// ============================================================
// HOUSEHOLD HELPERS
// ============================================================

export const verifyHouseholdMembership = async (userId, householdId) => {
  if (!userId || !householdId) {
    return { isMember: false, role: null, error: null };
  }

  const { data, error } = await supabaseAdmin
    .from('pop_household_members')
    .select('id, user_id, household_id, role, status')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .eq('status', 'active')
    .maybeSingle();

  return {
    isMember: Boolean(data),
    role: data?.role || null,
    error,
  };
};

export const getUserHouseholdIds = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('pop_household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) return { ids: [], error };

  return {
    ids: [
      ...new Set(
        (data || []).map((row) => row.household_id).filter(Boolean)
      ),
    ],
    error: null,
  };
};

// ============================================================
// REQUEST ACCESS
// ============================================================

export const validateRequestAccess = async (requestId, userId) => {
  const { data, error } = await supabaseAdmin
    .from('pop_requests')
    .select(`
      id,
      user_id,
      household_id,
      asset_id,
      request_type,
      title,
      urgency,
      location,
      visibility,
      status,
      expires_at,
      details,
      settings,
      scopes,
      created_at,
      updated_at
    `)
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    return {
      valid: false, status: 500, message: error.message,
      data: null, role: null,
    };
  }

  if (!data) {
    return {
      valid: false, status: 404, message: 'Request not found.',
      data: null, role: null,
    };
  }

  if (String(data.user_id) === String(userId)) {
    return { valid: true, status: 200, message: null, data, role: 'owner' };
  }

  if (data.visibility === 'public') {
    return { valid: true, status: 200, message: null, data, role: null };
  }

  if (data.visibility === 'household' && data.household_id) {
    const membership = await verifyHouseholdMembership(
      userId,
      data.household_id
    );

    if (membership.error) {
      return {
        valid: false, status: 500, message: membership.error.message,
        data, role: null,
      };
    }

    if (membership.isMember) {
      return {
        valid: true, status: 200, message: null,
        data, role: membership.role,
      };
    }
  }

  // network visibility intentionally not granted — no real source yet
  return {
    valid: false,
    status: 403,
    message: 'You do not have access to this request.',
    data,
    role: null,
  };
};

// ============================================================
// REQUEST VALIDATION
// ============================================================

export const ensureTrackableRequest = (requestType) => {
  if (!TRACKABLE_REQUEST_TYPES.includes(requestType)) {
    return {
      valid: false,
      message:
        'Provider workflow is only available for service, repair, and maintenance requests.',
    };
  }
  return { valid: true, message: null };
};

export const validateRequestScopes = (scopes) => {
  if (!Array.isArray(scopes)) {
    return {
      valid: false,
      message: 'scopes must be an array.',
    };
  }

  const seenIds = new Set();

  for (const scope of scopes) {
    if (!isJsonObject(scope)) {
      return {
        valid: false,
        message: 'Each scope must be an object.',
      };
    }

    const scopeId = getScopeId(scope);

    if (!scopeId) {
      return {
        valid: false,
        message: 'Each scope must have an id.',
      };
    }

    const key = String(scopeId);

    if (seenIds.has(key)) {
      return {
        valid: false,
        message: `Duplicate scope id: ${key}.`,
      };
    }

    seenIds.add(key);
  }

  return {
    valid: true,
    message: null,
  };
};





// ============================================================
// MATCHING HELPERS
// ============================================================

export const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getRequestTerms = (request) => {
  const values = [];

  const walk = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') return values.push(value);
    if (typeof value === 'number') return values.push(String(value));
    if (Array.isArray(value)) return value.forEach(walk);
    if (isJsonObject(value)) Object.values(value).forEach(walk);
  };

  walk(request?.request_type);
  walk(request?.title);
  walk(request?.details);

  return values.map(normalizeText).filter(Boolean);
};

export const getWords = (value) =>
  new Set(
    normalizeText(value)
      .split(/\s+/)
      .filter((word) => word.length >= 3)
  );

export const scoreService = (request, service) => {
  const requestTitle = normalizeText(request?.title);
  const requestType = normalizeText(request?.request_type);

  const serviceType = normalizeText(
    service?.service_type || service?.type || ''
  );
  const category = normalizeText(
    service?.category || service?.category_name || ''
  );
  const serviceTitle = normalizeText(
    service?.title || service?.name || ''
  );
  const description = normalizeText(service?.description || '');

  const serviceText = [serviceType, category, serviceTitle, description]
    .filter(Boolean)
    .join(' ');

  let score = 0;

  if (requestType && serviceType && requestType === serviceType) {
    score += 35;
  }

  if (requestTitle && serviceText && serviceText.includes(requestTitle)) {
    score += 30;
  }

  const requestWords = getWords(requestTitle);
  const serviceWords = getWords(serviceText);

  let matchingWords = 0;
  requestWords.forEach((word) => {
    if (serviceWords.has(word)) matchingWords += 1;
  });

  if (requestWords.size) {
    score += (matchingWords / requestWords.size) * 35;
  }

  return Math.min(Math.round(score), 100);
};

export const getBestProviderService = (request, services) => {
  if (!services?.length) return { service: null, score: 0 };

  let best = { service: null, score: 0 };

  for (const service of services) {
    const score = scoreService(request, service);
    if (score > best.score) best = { service, score };
  }

  return best;
};

// ============================================================
// ASSET HISTORY RELATIONSHIP HELPER
// ============================================================

export const getAssetHistoryRelationship = async ({
  relationshipId,
  requestId,
  providerId,
}) => {
  let query = supabaseAdmin
    .from('pop_request_providers')
    .select(`
      *,
      request:pop_requests (
        id,
        user_id,
        household_id,
        asset_id,
        request_type,
        title,
        status
      )
    `);

  if (relationshipId) query = query.eq('id', relationshipId);
  if (requestId) query = query.eq('request_id', requestId);
  if (providerId) query = query.eq('provider_id', providerId);

  return query.maybeSingle();
};