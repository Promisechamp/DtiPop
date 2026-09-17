import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';
import { isOverdue } from '../../utils/dateHelpers.js';

// ============================================================
// HELPERS (shared)
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

const validateTaskAccess = async (taskId, userId) => {
  const { data, error } = await supabase
    .from('pop_tasks')
    .select(`
      id,
      household_id,
      created_by,
      assigned_to,
      maintenance_id,
      asset_id,
      pop_assets:asset_id (household_id)
    `)
    .eq('id', taskId)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Task not found.' };
  }

  // Check if user is creator or assignee
  if (data.created_by === userId || data.assigned_to === userId) {
    return { valid: true, data };
  }

  // Check household membership
  let effectiveHouseholdId = data.household_id;
  if (!effectiveHouseholdId && data.asset_id && data.pop_assets) {
    effectiveHouseholdId = data.pop_assets.household_id;
  }

  if (effectiveHouseholdId) {
    const membership = await verifyHouseholdMembership(userId, effectiveHouseholdId);
    if (membership.valid) {
      return { valid: true, data, role: membership.role };
    }
  }

  return { valid: false, error: 'You do not have access to this task.' };
};

// ============================================================
// CREATE TASK
// ============================================================

export const createTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assignedTo,
      assetId,
      maintenanceId,
      title,
      description,
      dueDate,
      priority,
      status,
    } = req.body;

    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }
    if (!householdId) {
      return res.status(400).json({ success: false, message: 'Household is required.' });
    }

    // Verify membership
    const membership = await verifyHouseholdMembership(userId, householdId);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }

    // If assignedTo is provided, verify they are a member of the household
    if (assignedTo) {
      const assigneeMembership = await verifyHouseholdMembership(assignedTo, householdId);
      if (!assigneeMembership.valid) {
        return res.status(400).json({ success: false, message: 'Assigned user is not a member of this household.' });
      }
    }

    // If assetId is provided, verify it belongs to the household
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

    // If maintenanceId is provided, verify it exists and belongs to the household
    if (maintenanceId) {
      const { data: maintenance, error: maintError } = await supabase
        .from('pop_maintenance')
        .select('household_id')
        .eq('id', maintenanceId)
        .single();
      if (maintError || !maintenance) {
        return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
      }
      if (maintenance.household_id !== householdId) {
        return res.status(400).json({ success: false, message: 'Maintenance record does not belong to this household.' });
      }
    }

    const taskData = {
      household_id: householdId,
      created_by: userId,
      assigned_to: assignedTo || null,
      asset_id: assetId || null,
      maintenance_id: maintenanceId || null,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: dueDate || null,
      priority: priority || 'medium',
      status: status || 'pending',
    };

    const { data, error } = await supabase
      .from('pop_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;

    // Notify assignee if different from creator
    if (assignedTo && assignedTo !== userId) {
      await createNotification(
        assignedTo,
        'task_assigned',
        'Task assigned',
        `You have been assigned a new task: "${data.title}".`
      );
    }

    // Notify creator
    await createNotification(
      userId,
      'task_created',
      'Task created',
      `Task "${data.title}" was created.`
    );

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data,
    });
  } catch (error) {
    console.error('createTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET TASKS (with filters)
// ============================================================

export const getTasks = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const {
      householdId,
      assignedTo,
      status,
      priority,
      overdueOnly,
      assetId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build accessible households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (memberError) throw memberError;
    const accessibleHouseholdIds = memberHouseholds.map(h => h.household_id);

    if (accessibleHouseholdIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 },
      });
    }

    // Build query
    let query = supabase
      .from('pop_tasks')
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
          location
        ),
        pop_maintenance (
          id,
          title,
          maintenance_type,
          next_due_at
        ),
        creator:profiles!pop_tasks_created_by_fkey (id, full_name, email),
        assignee:profiles!pop_tasks_assigned_to_fkey (id, full_name, email)
      `, { count: 'exact' })
      .in('household_id', accessibleHouseholdIds);

    // Apply filters
    if (householdId) {
      const membership = await verifyHouseholdMembership(userId, householdId);
      if (!membership.valid) {
        return res.status(403).json({ success: false, message: membership.error });
      }
      query = query.eq('household_id', householdId);
    }
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assetId) query = query.eq('asset_id', assetId);
    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    // Pagination
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('due_date', { ascending: true, nullsLast: true });

    const { data, error, count } = await query;
    if (error) throw error;

    let result = data || [];

    // If overdueOnly, filter tasks that are pending and due_date < today
    if (overdueOnly === 'true') {
      result = result.filter(task => task.status === 'pending' && task.due_date && isOverdue(task.due_date));
    }

    return res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('getTasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SINGLE TASK
// ============================================================

export const getTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('pop_tasks')
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
          location
        ),
        pop_maintenance (
          id,
          title,
          maintenance_type,
          next_due_at
        ),
        creator:profiles!pop_tasks_created_by_fkey (id, full_name, email),
        assignee:profiles!pop_tasks_assigned_to_fkey (id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Verify access
    const access = await validateTaskAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE TASK
// ============================================================

export const updateTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const {
      assignedTo,
      title,
      description,
      dueDate,
      priority,
      status,
    } = req.body;

    // Verify access
    const access = await validateTaskAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Only allow update if user is creator, assignee, or has admin role in household
    const isCreator = access.data.created_by === userId;
    const isAssignee = access.data.assigned_to === userId;
    const isAdmin = access.role === 'admin' || access.role === 'owner';
    if (!isCreator && !isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task.',
      });
    }

    // If assignedTo is being changed, verify the new user is a household member
    if (assignedTo !== undefined && assignedTo !== access.data.assigned_to) {
      const householdId = access.data.household_id;
      const membership = await verifyHouseholdMembership(assignedTo, householdId);
      if (!membership.valid) {
        return res.status(400).json({ success: false, message: 'Assigned user is not a member of this household.' });
      }
    }

    const update = {};
    if (title !== undefined) update.title = title?.trim() || null;
    if (description !== undefined) update.description = description?.trim() || null;
    if (dueDate !== undefined) update.due_date = dueDate || null;
    if (priority !== undefined) update.priority = priority;
    if (status !== undefined) {
      update.status = status;
      if (status === 'completed') {
        update.completed_at = new Date().toISOString();
      } else {
        update.completed_at = null;
      }
    }
    if (assignedTo !== undefined) update.assigned_to = assignedTo || null;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const { data, error } = await supabase
      .from('pop_tasks')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify assignee if changed and not the same as the updater
    if (assignedTo !== undefined && assignedTo !== userId && assignedTo !== access.data.assigned_to) {
      await createNotification(
        assignedTo,
        'task_assigned',
        'Task assigned',
        `You have been assigned a task: "${data.title}".`
      );
    }

    // If status completed and task is linked to maintenance, maybe update maintenance too?
    // This could be handled separately.

    await createNotification(
      userId,
      'task_updated',
      'Task updated',
      `Task "${data.title}" was updated.`
    );

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      data,
    });
  } catch (error) {
    console.error('updateTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// COMPLETE TASK
// ============================================================

export const completeTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    // Verify access (only assignee or creator or admin)
    const access = await validateTaskAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    const isAssignee = access.data.assigned_to === userId;
    const isCreator = access.data.created_by === userId;
    const isAdmin = access.role === 'admin' || access.role === 'owner';
    if (!isAssignee && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to complete this task.',
      });
    }

    // If task is already completed, just return
    if (access.data.status === 'completed') {
      return res.json({ success: true, message: 'Task already completed.', data: access.data });
    }

    const update = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (notes) {
      // Append to existing description or add a note
      const currentDesc = access.data.description || '';
      update.description = currentDesc ? `${currentDesc}\n\nCompletion note: ${notes.trim()}` : `Completion note: ${notes.trim()}`;
    }

    const { data, error } = await supabase
      .from('pop_tasks')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If task is linked to maintenance, we could auto-complete it as well
    if (access.data.maintenance_id) {
      const { error: maintError } = await supabase
        .from('pop_maintenance')
        .update({
          status: 'completed',
          last_completed_at: new Date().toISOString().split('T')[0],
        })
        .eq('id', access.data.maintenance_id);
      if (maintError) console.error('Failed to complete linked maintenance:', maintError);
    }

    // Notification
    await createNotification(
      userId,
      'task_completed',
      'Task completed',
      `Task "${data.title}" was marked as completed.`
    );

    // Also notify creator if different
    if (access.data.created_by !== userId) {
      await createNotification(
        access.data.created_by,
        'task_completed',
        'Task completed',
        `Task "${data.title}" was completed by ${req.user?.full_name || 'a member'}.`
      );
    }

    return res.json({
      success: true,
      message: 'Task completed successfully.',
      data,
    });
  } catch (error) {
    console.error('completeTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// DELETE TASK
// ============================================================

export const deleteTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Verify access
    const access = await validateTaskAccess(id, userId);
    if (!access.valid) {
      return res.status(403).json({ success: false, message: access.error });
    }

    // Only allow delete if creator or admin
    const isCreator = access.data.created_by === userId;
    const isAdmin = access.role === 'admin' || access.role === 'owner';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task.',
      });
    }

    const { error } = await supabase
      .from('pop_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'task_deleted',
      'Task deleted',
      `Task "${access.data.title}" was deleted.`
    );

    return res.json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    console.error('deleteTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// CONVENIENCE: Get tasks by household
// ============================================================

export const getHouseholdTasks = async (req, res) => {
  req.query.householdId = req.params.householdId;
  return getTasks(req, res);
};

// ============================================================
// CONVENIENCE: Get tasks assigned to current user
// ============================================================

export const getMyTasks = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User ID is required.' });
  }
  req.query.assignedTo = userId;
  return getTasks(req, res);
};