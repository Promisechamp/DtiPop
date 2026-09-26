// backend/controllers/userController.js
import { supabase, supabaseAdmin } from '../../db/index.js';
import { cleanupImages, deleteImage, extractPublicId } from '../../utils/cloudinary.js';
import { autoUnbanUsers } from '../../utils/autoUnban.js';
import { createNotification } from './notificationController.js';
import { randomUUID } from 'crypto';

/**
 * Run auto-unban check manually
 */
export const runAutoUnban = async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const result = await autoUnbanUsers();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Auto-unban error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run auto-unban',
    });
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      return res.status(400).json({
        success: false,
        error: profileError.message,
      });
    }

    if (!profileData) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            user_id: userId,
            full_name: '',
            bio: '',
            location: '',
            country: '',
            phone: '',
            avatar_url: '',
            email_verified: false,
            ban_status: 'active',
            rating: 0,
            rating_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile',
        });
      }

      const [itemsGiven, itemsReceived, applications] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('donor_id', userId),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('winner_id', userId),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', userId),
      ]);

      const result = {
        ...newProfile,
        items_given: itemsGiven.count || 0,
        items_received: itemsReceived.count || 0,
        applications_count: applications.count || 0,
        items_given_count: itemsGiven.count || 0,
        items_received_count: itemsReceived.count || 0,
        won_items: [],
      };

      if (currentUserId !== userId) {
        delete result.phone;
        delete result.email;
      }

      return res.json({
        success: true,
        profile: result,
      });
    }

    const [itemsGiven, itemsReceived, applications, winners] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('donor_id', userId),
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('winner_id', userId),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', userId),
      supabase
        .from('winners')
        .select(`
          id,
          item:items(
            id,
            title,
            images,
            category,
            description,
            status,
            created_at
          )
        `)
        .eq('winner_id', userId),
    ]);

    const result = {
      id: profileData.id,
      user_id: profileData.user_id,
      full_name: profileData.full_name || '',
      bio: profileData.bio || '',
      location: profileData.location || '',
      country: profileData.country || '',
      phone: profileData.phone || '',
      avatar_url: profileData.avatar_url || '',
      email_verified: profileData.email_verified || false,
      email: profileData.email || '',
      ban_status: profileData.ban_status || 'active',
      rating: profileData.rating || 0,
      rating_count: profileData.rating_count || 0,

      services: Array.isArray(profileData.services) ? profileData.services : [],

      created_at: profileData.created_at || new Date().toISOString(),
      updated_at: profileData.updated_at || new Date().toISOString(),

      items_given: itemsGiven.count || 0,
      items_received: itemsReceived.count || 0,
      applications_count: applications.count || 0,
      items_given_count: itemsGiven.count || 0,
      items_received_count: itemsReceived.count || 0,
      won_items: winners.data || [],
    };

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (!userError && userData) {
      result.email = userData.user.email || result.email;
      result.phone = userData.user.phone || result.phone;
      result.user = {
        id: userData.user.id,
        email: userData.user.email,
        phone: userData.user.phone,
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        email_confirmed_at: userData.user.email_confirmed_at,
      };
    }

    if (currentUserId !== userId) {
      delete result.phone;
      delete result.email;
      if (result.user) {
        delete result.user.email;
        delete result.user.phone;
      }
    }

    console.log('📤 Returning profile with all fields:', Object.keys(result));
    res.json({
      success: true,
      profile: result,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

/**
 * Check if user has a profile
 */
export const checkProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Check profile error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      exists: !!profile,
      profile: profile || null,
    });
  } catch (error) {
    console.error('❌ Check profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update user profile with automatic image cleanup
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const allowedFields = [
      'full_name',
      'avatar_url',
      'location',
      'country',
      'phone',
      'bio',
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    let oldAvatarUrl = null;
    if (updates.avatar_url) {
      console.log('📤 Avatar update detected');
      console.log('📋 New avatar URL:', updates.avatar_url);

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      oldAvatarUrl = currentProfile?.avatar_url || null;
      console.log('📋 Old avatar URL:', oldAvatarUrl || 'None');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update failed:', error);

      if (updates.avatar_url) {
        console.log('🧹 Cleaning up newly uploaded avatar image...');
        const cleanupResult = await cleanupImages([updates.avatar_url]);
        console.log('✅ Cleanup result:', cleanupResult);
      }

      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.log('✅ Database updated successfully');

    if (oldAvatarUrl && updates.avatar_url && oldAvatarUrl !== updates.avatar_url) {
      console.log('🧹 Attempting to delete old avatar image from Cloudinary...');
      console.log('📋 Old avatar URL:', oldAvatarUrl);

      try {
        const publicId = extractPublicId(oldAvatarUrl);
        console.log('📋 Extracted public ID:', publicId);

        if (publicId) {
          if (publicId.includes('donttrashit/profiles')) {
            console.log('✅ Public ID has correct profiles folder structure');
          } else if (publicId.includes('donttrashit/items')) {
            console.warn('⚠️ Old avatar is in items folder (should be in profiles)');
          } else {
            console.warn('⚠️ Public ID may not have the correct folder structure:', publicId);
          }

          const deleteResult = await deleteImage(publicId);
          if (deleteResult.success) {
            console.log('✅ Old avatar deleted successfully');
          } else {
            console.warn('⚠️ Failed to delete old avatar:', deleteResult.error);
          }
        } else {
          console.warn('⚠️ Could not extract public ID from old avatar URL');
        }
      } catch (deleteError) {
        console.error('Error deleting old avatar:', deleteError);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: data,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (req.body.avatar_url) {
      console.log('🧹 Cleaning up uploaded avatar image on error...');
      await cleanupImages([req.body.avatar_url]).catch((err) => {
        console.error('Failed to clean up image on error:', err);
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

export const updateMyLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const {
      country,
      country_code,
      state,
      state_code,
      city,
      postal_code,
      latitude,
      longitude,
      source = 'manual',
    } = req.body;

    if (!country || !state || !city) {
      return res.status(400).json({
        success: false,
        error: 'Country, state, and city are required',
      });
    }

    const allowedSources = ['manual', 'profile', 'device'];

    if (!allowedSources.includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location source',
      });
    }

    const location = {
      country: country.trim(),
      country_code: country_code?.trim() || null,

      state: state.trim(),
      state_code: state_code?.trim() || null,

      city: city.trim(),

      postal_code: postal_code?.trim() || null,

      latitude: typeof latitude === 'number' ? latitude : null,

      longitude: typeof longitude === 'number' ? longitude : null,

      source,

      updated_at: new Date().toISOString(),
    };

    if (
      location.latitude !== null &&
      (location.latitude < -90 || location.latitude > 90)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude',
      });
    }

    if (
      location.longitude !== null &&
      (location.longitude < -180 || location.longitude > 180)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude',
      });
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Location update error:', updateError);

      return res.status(500).json({
        success: false,
        error: 'Failed to save location',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: profile.location,
    });
  } catch (error) {
    console.error('❌ Update location error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update location',
    });
  }
};

/**
 * Get user stats
 */
export const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const [itemsGiven, itemsReceived, applications, wins] = await Promise.all([
      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('donor_id', userId)
        .eq('status', 'completed'),

      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('winner_id', userId)
        .eq('status', 'completed'),

      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('applicant_id', userId),

      supabase
        .from('winners')
        .select('id', { count: 'exact', head: true })
        .eq('winner_id', userId),
    ]);

    res.json({
      success: true,
      stats: {
        items_given: itemsGiven.count || 0,
        items_received: itemsReceived.count || 0,
        applications_submitted: applications.count || 0,
        wins: wins.count || 0,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats',
    });
  }
};

// ============================================
// SERVICES (stored in profiles.services JSONB array)
// ============================================

/*
 * Services used to live in pop_services. That table has been
 * dropped. Services are now a JSONB array inside profiles.
 *
 * Each service object shape:
 *   {
 *     id:              uuid  (client-generated or server-generated)
 *     household_id:    uuid | null
 *     service_type:    text  (required)
 *     title:           text  (required)
 *     description:     text | null
 *     price:           number | null
 *     price_type:      text  ('fixed' | 'negotiable' | ...)
 *     categories:      text[]
 *     availability:    text | null
 *     is_active:       boolean
 *     created_at:      ISO string
 *     updated_at:      ISO string
 *   }
 */

const SERVICE_PROVIDER_FIELDS = `
  id,
  full_name,
  email,
  avatar_url,
  phone,
  bio,
  rating,
  location,
  services
`;

const getProfileServices = (profile) =>
  Array.isArray(profile?.services)
    ? profile.services.filter((s) => s && typeof s === 'object')
    : [];

const normalizeServiceInput = (body = {}) => {
  const {
    id,
    householdId,
    household_id,
    serviceType,
    service_type,
    title,
    description,
    price,
    priceType,
    price_type,
    categories,
    tags,
    availability,
    isActive,
    is_active,
  } = body || {};

  const resolvedServiceType =
    typeof serviceType === 'string'
      ? serviceType.trim()
      : typeof service_type === 'string'
      ? service_type.trim()
      : '';

  const resolvedCategories = Array.isArray(categories)
    ? categories.filter((c) => typeof c === 'string' && c.trim())
    : Array.isArray(tags)
    ? tags.filter((c) => typeof c === 'string' && c.trim())
    : [];

  return {
    id: typeof id === 'string' && id.trim() ? id.trim() : null,
    household_id: householdId || household_id || null,
    service_type: resolvedServiceType,
    title: typeof title === 'string' ? title.trim() : '',
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : null,
    price:
      price === undefined || price === null || price === ''
        ? null
        : Number(price),
    price_type: priceType || price_type || 'fixed',
    categories: resolvedCategories,
    availability:
      typeof availability === 'string' && availability.trim()
        ? availability.trim()
        : null,
    is_active:
      isActive !== undefined
        ? Boolean(isActive)
        : is_active !== undefined
        ? Boolean(is_active)
        : true,
  };
};

const validateServiceInput = (service, { partial = false } = {}) => {
  if (!partial) {
    if (!service.title) return 'Title is required.';
    if (!service.service_type) return 'Service type is required.';
  } else {
    if (service.title !== undefined && !service.title) {
      return 'Title cannot be empty.';
    }
    if (service.service_type !== undefined && !service.service_type) {
      return 'Service type cannot be empty.';
    }
  }

  if (service.price !== null && service.price !== undefined) {
    if (!Number.isFinite(service.price) || service.price < 0) {
      return 'Price must be a valid non-negative number.';
    }
  }

  return null;
};

const buildProviderSummary = (profile) => ({
  id: profile.id,
  full_name: profile.full_name,
  email: profile.email,
  avatar_url: profile.avatar_url,
  phone: profile.phone,
  bio: profile.bio,
  rating: profile.rating,
  location: profile.location,
});

// ------------------------------------------------------------
// CREATE SERVICE
// ------------------------------------------------------------
export const createService = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const input = normalizeServiceInput(req.body);

    const validationError = validateServiceInput(input);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, services')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    const currentServices = getProfileServices(profile);

    const now = new Date().toISOString();

    const newService = {
      ...input,
      id: input.id || randomUUID(),
      created_at: now,
      updated_at: now,
    };

    const nextServices = [...currentServices, newService];

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        services: nextServices,
        updated_at: now,
      })
      .eq('id', userId)
      .select('services')
      .single();

    if (updateError) {
      console.error('createService update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create service.',
      });
    }

    try {
      await createNotification(userId, {
        type: 'service_created',
        title: 'Service created',
        message: `Your service "${newService.title}" is now live.`,
      });
    } catch (notifyError) {
      console.error('Service notification error:', notifyError);
    }

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: newService,
      services: updated.services,
    });
  } catch (error) {
    console.error('createService:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create service.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ------------------------------------------------------------
// GET SERVICES (with filters)
// ------------------------------------------------------------
export const getServices = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      userId: providerId,
      householdId,
      serviceType,
      category,
      search,
      isActive,
      page = 1,
      limit = 20,
    } = req.query;

    let query = supabase.from('profiles').select(SERVICE_PROVIDER_FIELDS);

    if (providerId) {
      query = query.eq('id', providerId);
    }

    const { data: profiles, error } = await query;

    if (error) throw error;

    const allServices = [];

    for (const profile of profiles || []) {
      const profileServices = getProfileServices(profile);

      for (const service of profileServices) {
        allServices.push({
          ...service,
          user_id: profile.id,
          provider: buildProviderSummary(profile),
        });
      }
    }

    let filtered = allServices;

    if (serviceType) {
      filtered = filtered.filter(
        (s) => s.service_type === serviceType
      );
    }

    if (category) {
      filtered = filtered.filter(
        (s) =>
          Array.isArray(s.categories) &&
          s.categories.includes(category)
      );
    }

    if (householdId) {
      filtered = filtered.filter(
        (s) => s.household_id === householdId
      );
    }

    if (isActive !== undefined) {
      const activeValue = isActive === 'true' || isActive === true;
      filtered = filtered.filter(
        (s) => (s.is_active !== false) === activeValue
      );
    } else {
      filtered = filtered.filter((s) => s.is_active !== false);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(term) ||
          (s.description || '').toLowerCase().includes(term) ||
          (s.service_type || '').toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize;
    const paginated = filtered.slice(from, to);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: filtered.length,
        pages: Math.ceil(filtered.length / pageSize),
      },
    });
  } catch (error) {
    console.error('getServices:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch services.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ------------------------------------------------------------
// GET SINGLE SERVICE
// ------------------------------------------------------------
export const getService = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(SERVICE_PROVIDER_FIELDS)
      .contains('services', [{ id }]);

    if (error) throw error;

    let found = null;

    for (const profile of profiles || []) {
      const match = getProfileServices(profile).find(
        (s) => s.id === id
      );

      if (match) {
        found = {
          ...match,
          user_id: profile.id,
          provider: buildProviderSummary(profile),
        };
        break;
      }
    }

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    return res.json({ success: true, data: found });
  } catch (error) {
    console.error('getService:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ------------------------------------------------------------
// UPDATE SERVICE
// ------------------------------------------------------------
export const updateService = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, services')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    const currentServices = getProfileServices(profile);

    const index = currentServices.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found on your profile.',
      });
    }

    const input = normalizeServiceInput(req.body);

    const validationError = validateServiceInput(input, {
      partial: true,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const now = new Date().toISOString();

    const updatedService = {
      ...currentServices[index],
      ...(req.body?.serviceType !== undefined ||
      req.body?.service_type !== undefined
        ? { service_type: input.service_type }
        : {}),
      ...(req.body?.title !== undefined ? { title: input.title } : {}),
      ...(req.body?.description !== undefined
        ? { description: input.description }
        : {}),
      ...(req.body?.price !== undefined ? { price: input.price } : {}),
      ...(req.body?.priceType !== undefined ||
      req.body?.price_type !== undefined
        ? { price_type: input.price_type }
        : {}),
      ...(req.body?.categories !== undefined ||
      req.body?.tags !== undefined
        ? { categories: input.categories }
        : {}),
      ...(req.body?.availability !== undefined
        ? { availability: input.availability }
        : {}),
      ...(req.body?.isActive !== undefined ||
      req.body?.is_active !== undefined
        ? { is_active: input.is_active }
        : {}),
      ...(req.body?.householdId !== undefined ||
      req.body?.household_id !== undefined
        ? { household_id: input.household_id }
        : {}),
      updated_at: now,
    };

    const nextServices = [
      ...currentServices.slice(0, index),
      updatedService,
      ...currentServices.slice(index + 1),
    ];

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        services: nextServices,
        updated_at: now,
      })
      .eq('id', userId)
      .select('services')
      .single();

    if (updateError) {
      console.error('updateService update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update service.',
      });
    }

    try {
      await createNotification(userId, {
        type: 'service_updated',
        title: 'Service updated',
        message: `Your service "${updatedService.title}" was updated.`,
      });
    } catch (notifyError) {
      console.error('Service notification error:', notifyError);
    }

    return res.json({
      success: true,
      message: 'Service updated successfully.',
      data: updatedService,
      services: updated.services,
    });
  } catch (error) {
    console.error('updateService:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update service.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ------------------------------------------------------------
// DELETE SERVICE
// ------------------------------------------------------------
export const deleteService = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, services')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    const currentServices = getProfileServices(profile);

    const target = currentServices.find((s) => s.id === id);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Service not found on your profile.',
      });
    }

    const nextServices = currentServices.filter((s) => s.id !== id);
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        services: nextServices,
        updated_at: now,
      })
      .eq('id', userId)
      .select('services')
      .single();

    if (updateError) {
      console.error('deleteService update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete service.',
      });
    }

    try {
      await createNotification(userId, {
        type: 'service_deleted',
        title: 'Service deleted',
        message: 'Your service was deleted.',
      });
    } catch (notifyError) {
      console.error('Service notification error:', notifyError);
    }

    return res.json({
      success: true,
      message: 'Service deleted successfully.',
      services: updated.services,
    });
  } catch (error) {
    console.error('deleteService:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete service.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ------------------------------------------------------------
// TOGGLE SERVICE ACTIVE
// ------------------------------------------------------------
export const toggleServiceActive = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, services')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    const currentServices = getProfileServices(profile);

    const index = currentServices.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found on your profile.',
      });
    }

    const now = new Date().toISOString();
    const previous = currentServices[index];
    const newStatus = previous.is_active === false ? true : false;

    const updatedService = {
      ...previous,
      is_active: newStatus,
      updated_at: now,
    };

    const nextServices = [
      ...currentServices.slice(0, index),
      updatedService,
      ...currentServices.slice(index + 1),
    ];

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        services: nextServices,
        updated_at: now,
      })
      .eq('id', userId)
      .select('services')
      .single();

    if (updateError) {
      console.error('toggleServiceActive update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle service status.',
      });
    }

    try {
      await createNotification(userId, {
        type: 'service_updated',
        title: `Service ${newStatus ? 'activated' : 'deactivated'}`,
        message: `Your service "${updatedService.title}" is now ${
          newStatus ? 'live' : 'paused'
        }.`,
      });
    } catch (notifyError) {
      console.error('Service notification error:', notifyError);
    }

    return res.json({
      success: true,
      message: `Service ${
        newStatus ? 'activated' : 'deactivated'
      } successfully.`,
      data: updatedService,
      services: updated.services,
    });
  } catch (error) {
    console.error('toggleServiceActive:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to toggle service status.',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// PASSWORD MANAGEMENT
// ============================================

/**
 * Reset password for logged-out user (forgot password)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.json({
        success: true,
        message:
          'If an account exists with this email, you will receive a password reset link',
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send reset email',
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
    });
  }
};

// NO IN USE, HANDLED IN FRONTEND RESET PASSWORD PAHE
/**
 * Reset password with token (for logged-out user)
 */
export const resetPassword = async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        error: 'Password and token are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    const { error } = await supabase.auth.updateUser(
      {
        password: password,
      },
      {
        token: token,
      }
    );

    if (error) {
      console.error('Reset password error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid or expired reset token',
      });
    }

    res.json({
      success: true,
      message:
        'Password reset successfully! You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
};

/**
 * Change password for logged-in user
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (verifyError) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
};

// ============================================
// ADMIN USER MANAGEMENT FUNCTIONS
// ============================================

export const adminGetAllUsers = async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      search,
      role,
      verified,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    let query = supabase
      .from('profiles')
      .select(
        `
        *,
        items_given:items!donor_id(count),
        items_received:items!winner_id(count),
        applications:applications!applicant_id(count),
        wins:winners!winner_id(count)
      `,
        { count: 'exact' }
      );

    if (search && search.trim()) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (role) query = query.eq('role', role);
    if (verified !== undefined && verified !== '') {
      query = query.eq('email_verified', verified === 'true');
    }

    const validSortFields = [
      'created_at',
      'full_name',
      'email',
      'role',
      'ban_count',
    ];
    const safeSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'created_at';
    query = query.order(safeSortBy, { ascending: sortOrder === 'asc' });

    const from = parseInt(offset);
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Supabase query error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error,
      });
    }

    const transformedUsers = (data || []).map((user) => ({
      ...user,
      ban_count: user.ban_count || 0,
      items_given_count: user.items_given?.[0]?.count || 0,
      items_received_count: user.items_received?.[0]?.count || 0,
      applications_count: user.applications?.[0]?.count || 0,
      wins_count: user.wins?.[0]?.count || 0,
    }));

    res.json({
      success: true,
      users: transformedUsers,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Admin get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message,
    });
  }
};

/**
 * Admin: Get user by ID (full details)
 */
export const adminGetUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        items_given:items!donor_id(
          id,
          title,
          description,
          category,
          status,
          images,
          views_count,
          applications_count,
          created_at,
          updated_at,
          donor:profiles!items_donor_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        items_received:items!winner_id(
          id,
          title,
          description,
          category,
          status,
          images,
          views_count,
          applications_count,
          created_at,
          updated_at,
          donor:profiles!items_donor_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        applications:applications(
          id,
          status,
          message,
          created_at,
          updated_at,
          item:items(
            id,
            title,
            description,
            category,
            status,
            images,
            views_count,
            applications_count,
            created_at,
            donor:profiles!items_donor_id_fkey(
              id,
              full_name,
              avatar_url
            )
          ),
          applicant:profiles!applications_applicant_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        ),
        wins:winners(
          id,
          item_id,
          winner_id,
          week_start,
          week_end,
          story,
          impact,
          highlights,
          created_at,
          notice_status,
          snoozed_until,
          item:items(
            id,
            title,
            description,
            category,
            status,
            images,
            views_count,
            applications_count,
            created_at,
            donor:profiles!items_donor_id_fkey(
              id,
              full_name,
              avatar_url
            )
          ),
          winner:profiles!winners_winner_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        )
      `
      )
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const transformedProfile = {
      ...profile,
      ban_count: profile.ban_count || 0,
      ban_history: profile.ban_history || [],

      services: Array.isArray(profile.services) ? profile.services : [],

      items_given: (profile.items_given || []).map((item) => ({
        ...item,
        images: item.images || [],
        applications_count: item.applications_count || 0,
        views_count: item.views_count || 0,
      })),
      items_received: (profile.items_received || []).map((item) => ({
        ...item,
        images: item.images || [],
        applications_count: item.applications_count || 0,
        views_count: item.views_count || 0,
      })),
      applications: (profile.applications || []).map((app) => ({
        ...app,
        item: app.item
          ? {
              ...app.item,
              images: app.item.images || [],
            }
          : null,
      })),
      wins: (profile.wins || []).map((win) => ({
        ...win,
        item: win.item
          ? {
              ...win.item,
              images: win.item.images || [],
            }
          : null,
      })),
    };

    res.json({
      success: true,
      user: transformedProfile,
    });
  } catch (error) {
    console.error('Admin get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
};

/**
 * Admin: Update user
 */
export const adminUpdateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      role,
      is_admin,
      email_verified,
      ban_status,
      full_name,
      location,
      country,
      phone,
    } = req.body;

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (email_verified !== undefined) updates.email_verified = email_verified;
    if (ban_status !== undefined) updates.ban_status = ban_status;
    if (full_name !== undefined) updates.full_name = full_name;
    if (location !== undefined) updates.location = location;
    if (country !== undefined) updates.country = country;
    if (phone !== undefined) updates.phone = phone;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: data,
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
};

/**
 * Admin: Ban/Unban user
 */
const generateBanId = () => {
  return `ban_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const adminBanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban_status, reason, duration } = req.body;
    const adminId = req.user.id;

    if (!ban_status || !['banned', 'active'].includes(ban_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ban status. Must be "banned" or "active"',
      });
    }

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, ban_status, ban_count, ban_history, banned_until'
      )
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { data: adminData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', adminId)
      .single();

    const adminName = adminData?.full_name || 'Admin';

    const updates = {
      ban_status: ban_status,
      updated_at: new Date().toISOString(),
    };

    if (ban_status === 'banned') {
      const now = new Date();
      const nowISO = now.toISOString();

      let bannedUntil = null;
      let banDurationText = 'permanent';

      if (duration && duration !== 'permanent') {
        const days = parseInt(duration);
        if (!isNaN(days) && days > 0) {
          const untilDate = new Date(now);
          untilDate.setDate(untilDate.getDate() + days);
          bannedUntil = untilDate.toISOString();
          banDurationText = `${days} days`;
        }
      }

      const banRecord = {
        id: generateBanId(),
        reason: reason || 'No reason provided',
        banned_at: nowISO,
        banned_by: adminId,
        banned_by_name: adminName,
        ban_number: (existing.ban_count || 0) + 1,
        status: 'active',
        duration: banDurationText,
        banned_until: bannedUntil,
        auto_unban: bannedUntil !== null,
      };

      const currentHistory = existing.ban_history || [];
      const updatedHistory = [...currentHistory, banRecord];

      updates.ban_count = (existing.ban_count || 0) + 1;
      updates.ban_reason = reason || 'No reason provided';
      updates.banned_at = nowISO;
      updates.banned_by = adminId;
      updates.banned_by_name = adminName;
      updates.ban_duration = banDurationText;
      updates.banned_until = bannedUntil;
      updates.ban_history = updatedHistory;
    } else {
      const currentHistory = existing.ban_history || [];

      const updatedHistory = currentHistory.map((record) => {
        if (
          record.status === 'active' &&
          record.ban_number === existing.ban_count
        ) {
          return {
            ...record,
            status: 'lifted',
            lifted_at: new Date().toISOString(),
            lifted_by: adminId,
            lifted_by_name: adminName,
            lifted_reason: 'Manually lifted by admin',
          };
        }
        return record;
      });

      updates.ban_reason = null;
      updates.banned_at = null;
      updates.banned_by = null;
      updates.banned_by_name = null;
      updates.ban_duration = null;
      updates.banned_until = null;
      updates.ban_history = updatedHistory;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.log(
      `User ${userId} ${
        ban_status === 'banned' ? 'banned' : 'unbanned'
      }. Ban count: ${data.ban_count}`
    );

    res.json({
      success: true,
      message:
        ban_status === 'banned'
          ? 'User banned successfully'
          : 'User unbanned successfully',
      user: data,
    });
  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user ban status',
    });
  }
};

/**
 * Admin: Delete user
 */
export const adminDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hard_delete = false } = req.query;

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (existing.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete a super admin user',
      });
    }

    if (hard_delete === 'true') {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authError) {
        console.error('Auth delete error:', authError);
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.json({
        success: true,
        message: 'User deleted permanently',
      });
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ban_status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.json({
        success: true,
        message: 'User soft deleted successfully',
        user: data,
      });
    }
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

/**
 * Admin: Change user role
 */
export const adminChangeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "user", "admin", or "super_admin"',
      });
    }

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: role,
        is_admin: role === 'admin' || role === 'super_admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `User role changed to ${role}`,
      user: data,
    });
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change user role',
    });
  }
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================

export default {
  runAutoUnban,
  getProfile,
  checkProfile,
  updateProfile,
  updateMyLocation,
  getUserStats,

  // Services (JSONB on profiles)
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
  toggleServiceActive,

  forgotPassword,
  resetPassword,
  changePassword,

  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminBanUser,
  adminDeleteUser,
  adminChangeUserRole,
};