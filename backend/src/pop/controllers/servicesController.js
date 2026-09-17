import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) return { valid: true };
  const { data, error } = await supabase
    .from('pop_household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (error || !data) {
    return { valid: false, error: 'User is not a member of this household.' };
  }
  return { valid: true, role: data.role };
};

const validateServiceAccess = async (serviceId, userId) => {
  const { data, error } = await supabase
    .from('pop_services')
    .select('id, user_id, household_id')
    .eq('id', serviceId)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Service not found.' };
  }

  // Check if user is the owner
  if (data.user_id === userId) {
    return { valid: true, data };
  }

  // Check if user is a member of the household
  if (data.household_id) {
    const membership = await verifyHouseholdMembership(userId, data.household_id);
    if (membership.valid) {
      return { valid: true, data, role: membership.role };
    }
  }

  return { valid: false, error: 'You do not have access to this service.' };
};

// ============================================================
// CREATE SERVICE
// ============================================================

export const createService = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      serviceType,
      title,
      description,
      price,
      priceType,
      categories,
      availability,
      isActive,
    } = req.body;

    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }
    if (!serviceType) {
      return res.status(400).json({ success: false, message: 'Service type is required.' });
    }

    // Verify household membership if provided
    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
    }

    // Check if user is a service provider
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_service_provider')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    if (!profile?.is_service_provider) {
      return res.status(403).json({
        success: false,
        message: 'You must be a service provider to create a service listing.',
      });
    }

    const serviceData = {
      user_id: userId,
      household_id: householdId || null,
      service_type: serviceType,
      title: title.trim(),
      description: description?.trim() || null,
      price: price ? parseFloat(price) : null,
      price_type: priceType || 'fixed',
      categories: categories || [],
      availability: availability?.trim() || null,
      is_active: isActive !== undefined ? isActive : true,
    };

    const { data, error } = await supabase
      .from('pop_services')
      .insert(serviceData)
      .select()
      .single();

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'service_created',
      'Service created',
      `Your service "${data.title}" is now live.`
    );

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data,
    });
  } catch (error) {
    console.error('createService:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create service.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SERVICES (with filters)
// ============================================================

export const getServices = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
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

    // Build query
    let query = supabase
      .from('pop_services')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          business_name,
          person_type,
          business_verified,
          is_service_provider
        ),
        pop_households (
          id,
          name,
          household_type
        )
      `, { count: 'exact' });

    // Access filter: user must be either the owner, or a member of the service's household
    // If a householdId is provided, verify membership
    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
      query = query.eq('household_id', householdId);
    } else {
      // Otherwise, show services from all households the user is a member of
      const { data: memberHouseholds, error: memberError } = await supabase
        .from('pop_household_members')
        .select('household_id')
        .eq('user_id', userId)
        .eq('status', 'active');
      if (memberError) throw memberError;
      const householdIds = memberHouseholds.map(h => h.household_id);
      if (householdIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 },
        });
      }
      query = query.in('household_id', householdIds);
    }

    // Apply filters
    if (providerId) query = query.eq('user_id', providerId);
    if (serviceType) query = query.eq('service_type', serviceType);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');
    if (category) query = query.contains('categories', [category]);
    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    // Only show active services by default
    if (isActive === undefined) {
      query = query.eq('is_active', true);
    }

    // Pagination
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('getServices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch services.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SINGLE SERVICE
// ============================================================

export const getService = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('pop_services')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          business_name,
          person_type,
          business_verified,
          is_service_provider
        ),
        pop_households (
          id,
          name,
          household_type
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    // Verify access
    const access = await validateServiceAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getService:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE SERVICE
// ============================================================

export const updateService = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const {
      serviceType,
      title,
      description,
      price,
      priceType,
      categories,
      availability,
      isActive,
    } = req.body;

    // Verify access
    const access = await validateServiceAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const update = {};
    if (serviceType !== undefined) update.service_type = serviceType;
    if (title !== undefined) update.title = title?.trim() || null;
    if (description !== undefined) update.description = description?.trim() || null;
    if (price !== undefined) update.price = price ? parseFloat(price) : null;
    if (priceType !== undefined) update.price_type = priceType;
    if (categories !== undefined) update.categories = categories || [];
    if (availability !== undefined) update.availability = availability?.trim() || null;
    if (isActive !== undefined) update.is_active = isActive;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const { data, error } = await supabase
      .from('pop_services')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'service_updated',
      'Service updated',
      `Your service "${data.title}" was updated.`
    );

    return res.json({
      success: true,
      message: 'Service updated successfully.',
      data,
    });
  } catch (error) {
    console.error('updateService:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update service.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// DELETE SERVICE
// ============================================================

export const deleteService = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Verify access
    const access = await validateServiceAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const { error } = await supabase
      .from('pop_services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'service_deleted',
      'Service deleted',
      'Your service was deleted.'
    );

    return res.json({
      success: true,
      message: 'Service deleted successfully.',
    });
  } catch (error) {
    console.error('deleteService:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete service.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// TOGGLE SERVICE ACTIVE
// ============================================================

export const toggleServiceActive = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Verify access
    const access = await validateServiceAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('pop_services')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = !current.is_active;

    const { data, error } = await supabase
      .from('pop_services')
      .update({ is_active: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await createNotification(
      userId,
      'service_updated',
      `Service ${newStatus ? 'activated' : 'deactivated'}`,
      `Your service "${data.title}" is now ${newStatus ? 'live' : 'paused'}.`
    );

    return res.json({
      success: true,
      message: `Service ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data,
    });
  } catch (error) {
    console.error('toggleServiceActive:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle service status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};