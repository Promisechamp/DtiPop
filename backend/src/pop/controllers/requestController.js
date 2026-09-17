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

const validateRequestAccess = async (requestId, userId) => {
  const { data, error } = await supabase
    .from('pop_requests')
    .select('id, user_id, household_id, visibility')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Request not found.' };
  }

  if (data.user_id === userId) {
    return { valid: true, data };
  }

  // Public/network requests — always accessible
  if (['public', 'network'].includes(data.visibility)) {
    return { valid: true, data };
  }

  // Household requests — must be a member
  if (data.household_id && data.visibility === 'household') {
    const membership = await verifyHouseholdMembership(userId, data.household_id);
    if (membership.valid) {
      return { valid: true, data, role: membership.role };
    }
  }

  return { valid: false, error: 'You do not have access to this request.' };
};

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

// ============================================================
// CREATE REQUEST
// ============================================================

export const createRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assetId,
      requestType,
      title,
      description,
      category,
      urgency,
      location,
      expiresAt,
      borrowStartDate,
      borrowEndDate,
      providerName,
      providerPhone,
      providerEmail,
      visibility,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }
    if (!requestType) {
      return res.status(400).json({ success: false, message: 'Request type is required.' });
    }
    if (!householdId) {
      return res.status(400).json({ success: false, message: 'Household is required.' });
    }

    const membership = await verifyHouseholdMembership(userId, householdId);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }

    if (assetId) {
      const { data: asset, error: assetError } = await supabase
        .from('pop_assets')
        .select('household_id')
        .eq('id', assetId)
        .single();
      if (assetError || !asset) {
        return res.status(404).json({ success: false, message: 'Asset not found.' });
      }
      if (asset.household_id !== householdId) {
        return res.status(400).json({ success: false, message: 'Asset does not belong to this household.' });
      }
    }

    const validVisibilities = ['private', 'household', 'network', 'public'];
    const chosenVisibility = validVisibilities.includes(visibility) ? visibility : 'household';

    const requestData = {
      user_id: userId,
      household_id: householdId,
      asset_id: assetId || null,
      request_type: requestType,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || null,
      urgency: urgency || 'medium',
      location: location?.trim() || null,
      expires_at: expiresAt || null,
      borrow_start_date: borrowStartDate || null,
      borrow_end_date: borrowEndDate || null,
      provider_name: providerName?.trim() || null,
      provider_phone: providerPhone?.trim() || null,
      provider_email: providerEmail?.trim() || null,
      visibility: chosenVisibility,
      status: 'open',
    };

    const { data, error } = await supabase
      .from('pop_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;

    // Notify household members (only if not private)
    if (chosenVisibility !== 'private') {
      const { data: members, error: memberError } = await supabase
        .from('pop_household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .neq('user_id', userId);

      if (!memberError && members) {
        for (const member of members) {
          await createNotification(
            member.user_id,
            'request_created',
            'New request',
            `A household member posted: "${data.title}"`
          );
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Request created successfully.',
      data,
    });
  } catch (error) {
    console.error('createRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET REQUESTS
// ============================================================

export const getRequests = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      requestType,
      status,
      urgency,
      category,
      search,
      userId: createdBy,
      assetId,
      showOpenOnly,
      visibility,
      page = 1,
      limit = 20,
    } = req.query;

    // Get user's households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (memberError) throw memberError;
    const accessibleHouseholdIds = memberHouseholds.map(h => h.household_id);

    // If a specific householdId is requested, verify membership
    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
    }

    let query = supabase
      .from('pop_requests')
      .select(REQUEST_SELECT, { count: 'exact' });

    // VISIBILITY FILTER
    // User sees:
    //   1. Their own requests (any visibility)
    //   2. Requests in their households (visibility != 'private')
    //   3. Public/network requests from anyone
    if (householdId) {
      // Scoped to a specific household the user belongs to
      query = query.or(
        `user_id.eq.${userId},` +
        `and(household_id.eq.${householdId},visibility.neq.private),` +
        `visibility.in.(public,network)`
      );
    } else {
      const orParts = [`user_id.eq.${userId}`, `visibility.in.(public,network)`];

      if (accessibleHouseholdIds.length > 0) {
        orParts.push(
          `and(household_id.in.(${accessibleHouseholdIds.join(',')}),visibility.neq.private)`
        );
      }

      query = query.or(orParts.join(','));
    }

    // Other filters
    if (requestType) query = query.eq('request_type', requestType);
    if (status) query = query.eq('status', status);
    if (urgency) query = query.eq('urgency', urgency);
    if (category) query = query.eq('category', category);
    if (createdBy) query = query.eq('user_id', createdBy);
    if (assetId) query = query.eq('asset_id', assetId);
    if (visibility) query = query.eq('visibility', visibility);
    if (showOpenOnly === 'true') {
      query = query.in('status', ['open', 'in_progress']);
    }
    if (search?.trim()) {
      const term = search.trim().replace(/[%_,]/g, '');
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
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
    console.error('getRequests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SINGLE REQUEST
// ============================================================

export const getRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('pop_requests')
      .select(REQUEST_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const access = await validateRequestAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE REQUEST
// ============================================================

export const updateRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const {
      title,
      description,
      category,
      urgency,
      location,
      expiresAt,
      borrowStartDate,
      borrowEndDate,
      providerName,
      providerPhone,
      providerEmail,
      visibility,
      status,
    } = req.body;

    const access = await validateRequestAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Only creator can edit
    if (access.data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can edit this request.',
      });
    }

    const update = {};
    if (title !== undefined) update.title = title?.trim() || null;
    if (description !== undefined) update.description = description?.trim() || null;
    if (category !== undefined) update.category = category || null;
    if (urgency !== undefined) update.urgency = urgency;
    if (location !== undefined) update.location = location?.trim() || null;
    if (expiresAt !== undefined) update.expires_at = expiresAt || null;
    if (borrowStartDate !== undefined) update.borrow_start_date = borrowStartDate || null;
    if (borrowEndDate !== undefined) update.borrow_end_date = borrowEndDate || null;
    if (providerName !== undefined) update.provider_name = providerName?.trim() || null;
    if (providerPhone !== undefined) update.provider_phone = providerPhone?.trim() || null;
    if (providerEmail !== undefined) update.provider_email = providerEmail?.trim() || null;

    if (visibility !== undefined) {
      const validVisibilities = ['private', 'household', 'network', 'public'];
      if (!validVisibilities.includes(visibility)) {
        return res.status(400).json({ success: false, message: 'Invalid visibility.' });
      }
      update.visibility = visibility;
    }

    if (status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'fulfilled', 'cancelled', 'expired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      }
      update.status = status;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const { data, error } = await supabase
      .from('pop_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (status && data.user_id !== userId) {
      await createNotification(
        data.user_id,
        'request_updated',
        'Request status updated',
        `Your request "${data.title}" is now ${status}.`
      );
    }

    return res.json({
      success: true,
      message: 'Request updated successfully.',
      data,
    });
  } catch (error) {
    console.error('updateRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// DELETE REQUEST
// ============================================================

export const deleteRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const access = await validateRequestAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    if (access.data.user_id !== userId && access.role !== 'owner' && access.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this request.',
      });
    }

    const { error } = await supabase
      .from('pop_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Request deleted successfully.',
    });
  } catch (error) {
    console.error('deleteRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// FULFILL REQUEST
// ============================================================

export const fulfillRequest = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const access = await validateRequestAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    if (access.data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can mark this request as fulfilled.',
      });
    }

    const update = { status: 'fulfilled' };

    const { data, error } = await supabase
      .from('pop_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { data: members, error: memberError } = await supabase
      .from('pop_household_members')
      .select('user_id')
      .eq('household_id', data.household_id)
      .neq('user_id', userId);

    if (!memberError && members) {
      for (const member of members) {
        await createNotification(
          member.user_id,
          'request_fulfilled',
          'Request fulfilled',
          `Request "${data.title}" has been fulfilled.`
        );
      }
    }

    return res.json({
      success: true,
      message: 'Request marked as fulfilled.',
      data,
    });
  } catch (error) {
    console.error('fulfillRequest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fulfill request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// CONVENIENCE
// ============================================================

export const getHouseholdRequests = async (req, res) => {
  req.query.householdId = req.params.householdId;
  return getRequests(req, res);
};

export const getMyRequests = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User ID is required.' });
  }
  req.query.userId = userId;
  return getRequests(req, res);
};

export const getOpenHouseholdRequests = async (req, res) => {
  req.query.householdId = req.params.householdId;
  req.query.showOpenOnly = 'true';
  return getRequests(req, res);
};