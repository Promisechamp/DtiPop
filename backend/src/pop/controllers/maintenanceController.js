import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import { parseFrequencyToDays } from '../../utils/dateHelpers.js';

// ============================================================
// CONSTANTS
// ============================================================

const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

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
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error: 'User is not a member of this household.',
    };
  }

  return {
    valid: true,
    role: data.role,
  };
};

// ============================================================
// ASSET / HOUSEHOLD VALIDATION
// ============================================================

const getAsset = async (assetId) => {
  if (!assetId) return null;

  const { data, error } = await supabase
    .from('pop_assets')
    .select(`
      id,
      household_id,
      user_id,
      purchase_id,
      name,
      status
    `)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const resolveMaintenanceHousehold = async ({
  householdId,
  assetId,
}) => {
  let resolvedHouseholdId = householdId || null;
  let asset = null;

  if (assetId) {
    asset = await getAsset(assetId);

    if (!asset) {
      return {
        valid: false,
        status: 404,
        error: 'Asset not found.',
      };
    }

    // If both were supplied, they MUST agree.
    if (
      resolvedHouseholdId &&
      asset.household_id &&
      resolvedHouseholdId !== asset.household_id
    ) {
      return {
        valid: false,
        status: 400,
        error: 'The selected asset does not belong to the selected household.',
      };
    }

    // Asset becomes the source of truth if household wasn't supplied.
    if (!resolvedHouseholdId) {
      resolvedHouseholdId = asset.household_id;
    }
  }

  if (!resolvedHouseholdId) {
    return {
      valid: false,
      status: 400,
      error: 'Could not determine household for this maintenance.',
    };
  }

  return {
    valid: true,
    householdId: resolvedHouseholdId,
    asset,
  };
};

// ============================================================
// ACCESS VALIDATION
// ============================================================

const validateMaintenanceAccess = async (maintenanceId, userId) => {
  const { data, error } = await supabase
    .from('pop_maintenance')
    .select(`
      id,
      user_id,
      household_id,
      asset_id,
      title,
      description,
      frequency,
      last_completed_at,
      next_due_at,
      status,
      pop_assets:asset_id (
        id,
        household_id,
        user_id,
        purchase_id,
        name
      )
    `)
    .eq('id', maintenanceId)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error: 'Maintenance record not found.',
    };
  }

  // Direct ownership
  if (data.user_id === userId) {
    return {
      valid: true,
      data,
    };
  }

  // Determine effective household
  let effectiveHouseholdId = data.household_id;

  if (
    !effectiveHouseholdId &&
    data.asset_id &&
    data.pop_assets
  ) {
    effectiveHouseholdId = data.pop_assets.household_id;
  }

  if (effectiveHouseholdId) {
    const membership = await verifyHouseholdMembership(
      userId,
      effectiveHouseholdId
    );

    if (membership.valid) {
      return {
        valid: true,
        data,
        role: membership.role,
      };
    }
  }

  return {
    valid: false,
    error: 'You do not have access to this maintenance record.',
  };
};

// ============================================================
// DATE HELPERS
// ============================================================

const computeNextDueDate = (lastCompleted, frequency) => {
  if (!lastCompleted || !frequency) {
    return null;
  }

  const days = parseFrequencyToDays(frequency);

  if (!days) {
    return null;
  }

  const next = new Date(`${lastCompleted}T00:00:00`);

  if (Number.isNaN(next.getTime())) {
    return null;
  }

  next.setDate(next.getDate() + days);

  return next.toISOString().split('T')[0];
};

const getComputedStatus = (maintenance) => {
  const storedStatus = maintenance?.status || 'pending';

  // "overdue" may exist from older records.
  // Treat it as a computed presentation status, not a stored lifecycle status.
  if (storedStatus === 'overdue') {
    return 'overdue';
  }

  if (
    storedStatus === 'pending' &&
    maintenance?.next_due_at
  ) {
    const today = getToday();

    if (maintenance.next_due_at < today) {
      return 'overdue';
    }
  }

  return storedStatus;
};

const normalizeStoredStatus = (status) => {
  if (!status) return 'pending';

  // Never persist "overdue".
  if (status === 'overdue') {
    return 'pending';
  }

  return status;
};

const parseCost = (cost) => {
  if (cost === undefined || cost === null || cost === '') {
    return null;
  }

  const parsed = Number(cost);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

// ============================================================
// CREATE MAINTENANCE
// ============================================================

export const createMaintenance = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const {
      householdId,
      assetId,
      title,
      description,
      maintenanceType,
      frequency,
      lastCompletedAt,
      nextDueAt,
      providerName,
      cost,
      notes,
      status,
    } = req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required.',
      });
    }

    if (!maintenanceType) {
      return res.status(400).json({
        success: false,
        message: 'Maintenance type is required.',
      });
    }

    if (!householdId && !assetId) {
      return res.status(400).json({
        success: false,
        message:
          'Maintenance must be linked to a household or an asset.',
      });
    }

    // --------------------------------------------------------
    // RESOLVE HOUSEHOLD + VALIDATE ASSET
    // --------------------------------------------------------

    const resolved = await resolveMaintenanceHousehold({
      householdId,
      assetId,
    });

    if (!resolved.valid) {
      return res.status(resolved.status || 400).json({
        success: false,
        message: resolved.error,
      });
    }

    const effectiveHouseholdId = resolved.householdId;

    // --------------------------------------------------------
    // HOUSEHOLD MEMBERSHIP
    // --------------------------------------------------------

    const membership = await verifyHouseholdMembership(
      userId,
      effectiveHouseholdId
    );

    if (!membership.valid) {
      return res.status(403).json({
        success: false,
        message: membership.error,
      });
    }

    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    let computedNextDueAt = nextDueAt || null;

    if (
      !computedNextDueAt &&
      lastCompletedAt &&
      frequency
    ) {
      computedNextDueAt = computeNextDueDate(
        lastCompletedAt,
        frequency
      );
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const storedStatus = normalizeStoredStatus(status);

    if (!VALID_STATUSES.includes(storedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid maintenance status. Allowed values: ${VALID_STATUSES.join(
          ', '
        )}.`,
      });
    }

    const maintenanceData = {
      household_id: effectiveHouseholdId,
      user_id: userId,
      asset_id: assetId || null,
      title: title.trim(),
      description: description?.trim() || null,
      maintenance_type: maintenanceType,
      frequency: frequency || null,
      last_completed_at: lastCompletedAt || null,
      next_due_at: computedNextDueAt,
      provider_name: providerName?.trim() || null,
      cost: parseCost(cost),
      notes: notes?.trim() || null,

      // IMPORTANT:
      // Never store "overdue".
      status: storedStatus,
    };

    // --------------------------------------------------------
    // INSERT
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from('pop_maintenance')
      .insert(maintenanceData)
      .select(`
        *,
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
          condition,
          purchase_id,
          status
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // COMPUTED STATUS
    // --------------------------------------------------------

    const computedStatus = getComputedStatus(data);

    // --------------------------------------------------------
    // AUTO CREATE TASK
    // --------------------------------------------------------

    if (storedStatus === 'pending') {
      await createTaskFromMaintenance(
        data.id,
        userId,
        effectiveHouseholdId
      );
    }

    // --------------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------------

    await createNotification(
      userId,
      'maintenance_created',
      'Maintenance scheduled',
      `Maintenance "${data.title}" was created.`
    );

    return res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully.',
      data: {
        ...data,
        computed_status: computedStatus,
      },
    });
  } catch (error) {
    console.error('createMaintenance:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create maintenance record.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET MAINTENANCE RECORDS
// ============================================================

export const getMaintenance = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const {
      householdId,
      assetId,
      status,
      maintenanceType,
      overdueOnly,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // --------------------------------------------------------
    // ACCESSIBLE HOUSEHOLDS
    // --------------------------------------------------------

    const {
      data: memberHouseholds,
      error: memberError,
    } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) {
      throw memberError;
    }

    const accessibleHouseholdIds =
      memberHouseholds?.map(
        (household) => household.household_id
      ) || [];

    if (accessibleHouseholdIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: 0,
          pages: 0,
        },
      });
    }

    // --------------------------------------------------------
    // HOUSEHOLD FILTER VALIDATION
    // --------------------------------------------------------

    if (householdId) {
      const membership = await verifyHouseholdMembership(
        userId,
        householdId
      );

      if (!membership.valid) {
        return res.status(403).json({
          success: false,
          message: membership.error,
        });
      }
    }

    // --------------------------------------------------------
    // QUERY
    // --------------------------------------------------------

    let query = supabase
      .from('pop_maintenance')
      .select(
        `
          *,
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
            condition,
            purchase_id,
            status
          )
        `
      )
      .in('household_id', accessibleHouseholdIds);

    if (householdId) {
      query = query.eq(
        'household_id',
        householdId
      );
    }

    if (assetId) {
      query = query.eq(
        'asset_id',
        assetId
      );
    }

    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    // "overdue" is computed, so don't query it directly unless
    // we want to support old legacy rows.
    if (status && status !== 'overdue') {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid maintenance status.',
        });
      }

      query = query.eq('status', status);
    }

    if (maintenanceType) {
      query = query.eq(
        'maintenance_type',
        maintenanceType
      );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search?.trim()) {
      const term = search
        .trim()
        .replace(/[%_]/g, '\\$&')
        .replace(/,/g, '');

      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,provider_name.ilike.%${term}%`
      );
    }

    // --------------------------------------------------------
    // FETCH
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await query.order(
      'next_due_at',
      {
        ascending: true,
        nullsLast: true,
      }
    );

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // COMPUTED STATUS
    // --------------------------------------------------------

    let result = (data || []).map((item) => ({
      ...item,
      computed_status: getComputedStatus(item),
    }));

    // --------------------------------------------------------
    // OVERDUE FILTER
    // --------------------------------------------------------

    if (overdueOnly === 'true') {
      result = result.filter(
        (item) =>
          item.computed_status === 'overdue'
      );
    }

    // If status=overdue was requested, treat it as computed.
    if (status === 'overdue') {
      result = result.filter(
        (item) =>
          item.computed_status === 'overdue'
      );
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(
      1,
      Number(page) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(limit) || 20
      )
    );

    const total = result.length;

    const from =
      (pageNumber - 1) * pageSize;

    const paginatedResult = result.slice(
      from,
      from + pageSize
    );

    return res.json({
      success: true,
      data: paginatedResult,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(
          total / pageSize
        ),
      },
    });
  } catch (error) {
    console.error('getMaintenance:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance records.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET SINGLE MAINTENANCE RECORD
// ============================================================

export const getMaintenanceRecord = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      data,
      error,
    } = await supabase
      .from('pop_maintenance')
      .select(`
        *,
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
          condition,
          purchase_id,
          status
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found.',
      });
    }

    // --------------------------------------------------------
    // ACCESS
    // --------------------------------------------------------

    const access =
      await validateMaintenanceAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    // --------------------------------------------------------
    // COMPUTED STATUS
    // --------------------------------------------------------

    const computedStatus =
      getComputedStatus(data);

    return res.json({
      success: true,
      data: {
        ...data,
        computed_status: computedStatus,
      },
    });
  } catch (error) {
    console.error(
      'getMaintenanceRecord:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch maintenance record.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// UPDATE MAINTENANCE RECORD
// ============================================================

export const updateMaintenance = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;

    const {
      householdId,
      assetId,
      title,
      description,
      maintenanceType,
      frequency,
      lastCompletedAt,
      nextDueAt,
      providerName,
      cost,
      notes,
      status,
    } = req.body;

    // --------------------------------------------------------
    // ACCESS
    // --------------------------------------------------------

    const access =
      await validateMaintenanceAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    // --------------------------------------------------------
    // VALIDATE STATUS
    // --------------------------------------------------------

    if (
      status !== undefined &&
      status !== 'overdue' &&
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid maintenance status. Allowed values: ${VALID_STATUSES.join(
          ', '
        )}.`,
      });
    }

    // --------------------------------------------------------
    // UPDATE OBJECT
    // --------------------------------------------------------

    const update = {};

    if (title !== undefined) {
      const trimmedTitle =
        title?.trim();

      if (!trimmedTitle) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty.',
        });
      }

      update.title = trimmedTitle;
    }

    if (description !== undefined) {
      update.description =
        description?.trim() || null;
    }

    if (maintenanceType !== undefined) {
      if (!maintenanceType) {
        return res.status(400).json({
          success: false,
          message:
            'Maintenance type cannot be empty.',
        });
      }

      update.maintenance_type =
        maintenanceType;
    }

    if (frequency !== undefined) {
      update.frequency =
        frequency || null;
    }

    if (lastCompletedAt !== undefined) {
      update.last_completed_at =
        lastCompletedAt || null;
    }

    if (nextDueAt !== undefined) {
      update.next_due_at =
        nextDueAt || null;
    }

    if (providerName !== undefined) {
      update.provider_name =
        providerName?.trim() || null;
    }

    if (cost !== undefined) {
      update.cost = parseCost(cost);
    }

    if (notes !== undefined) {
      update.notes =
        notes?.trim() || null;
    }

    if (status !== undefined) {
      // Never persist overdue.
      update.status =
        normalizeStoredStatus(status);
    }

    // --------------------------------------------------------
    // OPTIONAL RELATIONSHIP UPDATE
    // --------------------------------------------------------

    if (
      householdId !== undefined ||
      assetId !== undefined
    ) {
      const effectiveAssetId =
        assetId !== undefined
          ? assetId || null
          : access.data.asset_id;

      const effectiveHouseholdId =
        householdId !== undefined
          ? householdId || null
          : access.data.household_id;

      if (
        !effectiveHouseholdId &&
        !effectiveAssetId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Maintenance must remain linked to a household or an asset.',
        });
      }

      const resolved =
        await resolveMaintenanceHousehold({
          householdId:
            effectiveHouseholdId,
          assetId:
            effectiveAssetId,
        });

      if (!resolved.valid) {
        return res.status(
          resolved.status || 400
        ).json({
          success: false,
          message: resolved.error,
        });
      }

      const membership =
        await verifyHouseholdMembership(
          userId,
          resolved.householdId
        );

      if (!membership.valid) {
        return res.status(403).json({
          success: false,
          message: membership.error,
        });
      }

      update.household_id =
        resolved.householdId;

      update.asset_id =
        effectiveAssetId;
    }

    // --------------------------------------------------------
    // COMPLETION LOGIC
    // --------------------------------------------------------

    const effectiveFrequency =
      frequency !== undefined
        ? frequency
        : access.data.frequency;

    let effectiveLastCompleted =
      lastCompletedAt !== undefined
        ? lastCompletedAt
        : access.data.last_completed_at;

    if (status === 'completed') {
      if (!effectiveLastCompleted) {
        effectiveLastCompleted =
          getToday();

        update.last_completed_at =
          effectiveLastCompleted;
      }

      // A completed recurring maintenance gets
      // a next due date.
      if (effectiveFrequency) {
        const next =
          computeNextDueDate(
            effectiveLastCompleted,
            effectiveFrequency
          );

        if (next) {
          update.next_due_at =
            next;
        }
      }
    }

    // --------------------------------------------------------
    // AUTO COMPUTE NEXT DUE
    // --------------------------------------------------------

    if (
      lastCompletedAt !== undefined &&
      frequency !== undefined &&
      nextDueAt === undefined &&
      status !== 'completed'
    ) {
      const computed =
        computeNextDueDate(
          lastCompletedAt,
          frequency
        );

      update.next_due_at =
        computed || null;
    }

    // --------------------------------------------------------
    // NOTHING TO UPDATE
    // --------------------------------------------------------

    if (
      Object.keys(update).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided.',
      });
    }

    // --------------------------------------------------------
    // UPDATE DATABASE
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from('pop_maintenance')
      .update(update)
      .eq('id', id)
      .select(`
        *,
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
          condition,
          purchase_id,
          status
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // TASK HANDLING
    // --------------------------------------------------------

    const resultingStatus =
      data.status;

    if (resultingStatus === 'pending') {
      await createTaskFromMaintenance(
        id,
        userId,
        data.household_id
      );
    }

    if (resultingStatus === 'completed') {
      await completeAssociatedTask(id);
    }

    // --------------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------------

    await createNotification(
      userId,
      'maintenance_updated',
      'Maintenance updated',
      `Maintenance "${data.title}" was updated.`
    );

    return res.json({
      success: true,
      message:
        'Maintenance record updated successfully.',
      data: {
        ...data,
        computed_status:
          getComputedStatus(data),
      },
    });
  } catch (error) {
    console.error(
      'updateMaintenance:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to update maintenance record.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// DELETE MAINTENANCE RECORD
// ============================================================

export const deleteMaintenance = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;

    // --------------------------------------------------------
    // ACCESS
    // --------------------------------------------------------

    const access =
      await validateMaintenanceAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    // --------------------------------------------------------
    // DELETE ASSOCIATED TASK
    // --------------------------------------------------------

    const {
      error: taskDeleteError,
    } = await supabase
      .from('pop_tasks')
      .delete()
      .eq('maintenance_id', id);

    if (taskDeleteError) {
      console.error(
        'Failed to delete maintenance task:',
        taskDeleteError
      );
    }

    // --------------------------------------------------------
    // DELETE MAINTENANCE
    // --------------------------------------------------------

    const { error } =
      await supabase
        .from('pop_maintenance')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------------

    await createNotification(
      userId,
      'maintenance_deleted',
      'Maintenance deleted',
      'Maintenance record was deleted.'
    );

    return res.json({
      success: true,
      message:
        'Maintenance record deleted successfully.',
    });
  } catch (error) {
    console.error(
      'deleteMaintenance:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete maintenance record.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// COMPLETE MAINTENANCE
// ============================================================

export const completeMaintenance = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const { id } = req.params;
    const { notes } = req.body;

    // --------------------------------------------------------
    // ACCESS
    // --------------------------------------------------------

    const access =
      await validateMaintenanceAccess(
        id,
        userId
      );

    if (!access.valid) {
      return res.status(403).json({
        success: false,
        message: access.error,
      });
    }

    const today = getToday();

    const update = {
      status: 'completed',
      last_completed_at: today,
    };

    // --------------------------------------------------------
    // RECURRING NEXT DUE
    // --------------------------------------------------------

    if (access.data.frequency) {
      const next =
        computeNextDueDate(
          today,
          access.data.frequency
        );

      if (next) {
        update.next_due_at =
          next;
      }
    }

    if (
      notes !== undefined
    ) {
      update.notes =
        notes?.trim() || null;
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from('pop_maintenance')
      .update(update)
      .eq('id', id)
      .select(`
        *,
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
          condition,
          purchase_id,
          status
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // COMPLETE ASSOCIATED TASK
    // --------------------------------------------------------

    await completeAssociatedTask(id);

    // --------------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------------

    await createNotification(
      userId,
      'maintenance_completed',
      'Maintenance completed',
      `Maintenance "${data.title}" was marked as completed.`
    );

    return res.json({
      success: true,
      message:
        'Maintenance completed successfully.',
      data: {
        ...data,
        computed_status:
          getComputedStatus(data),
      },
    });
  } catch (error) {
    console.error(
      'completeMaintenance:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to complete maintenance.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// HELPER: CREATE TASK FROM MAINTENANCE
// ============================================================

const createTaskFromMaintenance = async (
  maintenanceId,
  userId,
  householdId
) => {
  try {
    // --------------------------------------------------------
    // CHECK EXISTING TASK
    // --------------------------------------------------------

    const {
      data: existing,
      error: checkError,
    } = await supabase
      .from('pop_tasks')
      .select('id, status')
      .eq('maintenance_id', maintenanceId)
      .maybeSingle();

    if (checkError) {
      console.error(
        'Failed checking maintenance task:',
        checkError
      );
    }

    if (existing) {
      // If the maintenance was moved back to pending
      // and its task was completed, reopen it.
      if (
        existing.status === 'completed'
      ) {
        const { error: reopenError } =
          await supabase
            .from('pop_tasks')
            .update({
              status: 'pending',
              completed_at: null,
            })
            .eq('id', existing.id);

        if (reopenError) {
          console.error(
            'Failed reopening maintenance task:',
            reopenError
          );
        }
      }

      return existing;
    }

    // --------------------------------------------------------
    // FETCH MAINTENANCE
    // --------------------------------------------------------

    const {
      data: maintenance,
      error: fetchError,
    } = await supabase
      .from('pop_maintenance')
      .select(`
        title,
        description,
        next_due_at,
        asset_id
      `)
      .eq('id', maintenanceId)
      .single();

    if (
      fetchError ||
      !maintenance
    ) {
      console.error(
        'Failed fetching maintenance for task:',
        fetchError
      );

      return null;
    }

    // --------------------------------------------------------
    // CREATE TASK
    // --------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from('pop_tasks')
      .insert({
        household_id: householdId,
        created_by: userId,
        assigned_to: null,
        asset_id:
          maintenance.asset_id || null,
        maintenance_id: maintenanceId,
        title: `Maintenance: ${maintenance.title}`,
        description:
          maintenance.description || null,
        due_date:
          maintenance.next_due_at || null,
        priority: 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error(
        'Failed to auto-create task from maintenance:',
        error
      );

      return null;
    }

    return data;
  } catch (error) {
    console.error(
      'createTaskFromMaintenance:',
      error
    );

    return null;
  }
};

// ============================================================
// HELPER: COMPLETE ASSOCIATED TASK
// ============================================================

const completeAssociatedTask = async (
  maintenanceId
) => {
  const {
    error,
  } = await supabase
    .from('pop_tasks')
    .update({
      status: 'completed',
      completed_at:
        new Date().toISOString(),
    })
    .eq(
      'maintenance_id',
      maintenanceId
    )
    .neq(
      'status',
      'completed'
    );

  if (error) {
    console.error(
      'Failed to complete associated task:',
      error
    );
  }
};

// ============================================================
// CONVENIENCE: GET HOUSEHOLD MAINTENANCE
// ============================================================

export const getHouseholdMaintenance = async (
  req,
  res
) => {
  req.query.householdId =
    req.params.householdId;

  return getMaintenance(
    req,
    res
  );
};

// ============================================================
// CONVENIENCE: GET ASSET MAINTENANCE
// ============================================================

export const getAssetMaintenance = async (
  req,
  res
) => {
  req.query.assetId =
    req.params.assetId;

  return getMaintenance(
    req,
    res
  );
};