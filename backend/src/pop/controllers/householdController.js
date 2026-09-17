import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const verifyHouseholdOwnership = async (householdId, userId) => {
  const { data, error } = await supabase
    .from('pop_households')
    .select('id, owner_id')
    .eq('id', householdId)
    .single();
  if (error || !data) {
    return { valid: false, error: 'Household not found.' };
  }
  if (data.owner_id !== userId) {
    return { valid: false, error: 'Only the household owner can perform this action.' };
  }
  return { valid: true, data };
};

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

// ============================================================
// CREATE HOUSEHOLD
// ============================================================

export const createHousehold = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { name, description, householdType, avatarUrl, avatarPublicId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Household name is required.' });
    }

    // Insert household
    const { data, error } = await supabase
      .from('pop_households')
      .insert({
        owner_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        household_type: householdType || 'family',
        avatar_url: avatarUrl || null,
        avatar_public_id: avatarPublicId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically add the owner as a member with role 'owner'
    const { error: memberError } = await supabase
      .from('pop_household_members')
      .insert({
        household_id: data.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Failed to add owner as member:', memberError);
      // Rollback household creation?
      await supabase.from('pop_households').delete().eq('id', data.id);
      throw new Error('Failed to add owner to household.');
    }

    // Notification
    await createNotification(
      userId,
      'household_created',
      'Household created',
      `Your household "${data.name}" was created.`
    );

    return res.status(201).json({
      success: true,
      message: 'Household created successfully.',
      data,
    });
  } catch (error) {
    console.error('createHousehold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create household.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET USER'S HOUSEHOLDS
// ============================================================

export const getUserHouseholds = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    // Fetch households where user is a member
    const { data, error } = await supabase
      .from('pop_household_members')
      .select(`
        household_id,
        role,
        status,
        joined_at,
        pop_households:household_id (
          id,
          name,
          description,
          household_type,
          avatar_url,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    const households = data.map(item => ({
      ...item.pop_households,
      membership: {
        role: item.role,
        status: item.status,
        joined_at: item.joined_at,
      }
    }));

    return res.json({ success: true, data: households });
  } catch (error) {
    console.error('getUserHouseholds:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch households.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// GET SINGLE HOUSEHOLD (with members)
// ============================================================

export const getHousehold = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Verify membership
    const membership = await verifyHouseholdMembership(userId, id);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }

    // Fetch household details with members
    const { data, error } = await supabase
      .from('pop_households')
      .select(`
        *,
        pop_household_members (
          id,
          user_id,
          role,
          status,
          joined_at,
          profiles:user_id (id, email, full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Household not found.' });
    }

    // Add current user's role to response for convenience
    const currentUserMember = data.pop_household_members.find(m => m.user_id === userId);
    const userRole = currentUserMember ? currentUserMember.role : null;

    return res.json({
      success: true,
      data: {
        ...data,
        user_role: userRole,
      }
    });
  } catch (error) {
    console.error('getHousehold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch household.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE HOUSEHOLD (owner only)
// ============================================================

export const updateHousehold = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const { name, description, householdType, avatarUrl, avatarPublicId } = req.body;

    // Verify ownership
    const ownership = await verifyHouseholdOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ success: false, message: ownership.error });
    }

    const update = {};
    if (name !== undefined) update.name = name?.trim() || null;
    if (description !== undefined) update.description = description?.trim() || null;
    if (householdType !== undefined) update.household_type = householdType;
    if (avatarUrl !== undefined) update.avatar_url = avatarUrl;
    if (avatarPublicId !== undefined) update.avatar_public_id = avatarPublicId;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const { data, error } = await supabase
      .from('pop_households')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notification for all members? Could be heavy. We'll notify the owner.
    await createNotification(
      userId,
      'household_updated',
      'Household updated',
      `Your household "${data.name}" was updated.`
    );

    return res.json({
      success: true,
      message: 'Household updated successfully.',
      data,
    });
  } catch (error) {
    console.error('updateHousehold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update household.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// DELETE HOUSEHOLD (owner only)
// ============================================================

export const deleteHousehold = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    const ownership = await verifyHouseholdOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ success: false, message: ownership.error });
    }

    // Delete household (cascades to members, assets, etc. if foreign keys are set)
    const { error } = await supabase
      .from('pop_households')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'household_deleted',
      'Household deleted',
      'Your household was permanently deleted.'
    );

    return res.json({
      success: true,
      message: 'Household deleted successfully.',
    });
  } catch (error) {
    console.error('deleteHousehold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete household.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// ADD MEMBER TO HOUSEHOLD (owner or admin only)
// ============================================================

export const addMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;
    const { email, role } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    // Verify the user adding has permission (owner or admin)
    const membership = await verifyHouseholdMembership(userId, id);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can add members.' });
    }

    // Find the user by email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (userError || !user) {
      return res.status(404).json({ success: false, message: 'No user found with that email.' });
    }

    if (user.id === userId) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself.' });
    }

    // Check if already a member
    const { data: existing, error: existingError } = await supabase
      .from('pop_household_members')
      .select('id, status')
      .eq('household_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({ success: false, message: 'User is already an active member.' });
      } else {
        // Re-activate with new role
        const { data, error } = await supabase
          .from('pop_household_members')
          .update({
            role: role || 'member',
            status: 'active',
            joined_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        // Notify new member
        await createNotification(
          user.id,
          'household_member_added',
          'Added to household',
          `You have been added to household "${membership.data?.name || id}".`
        );
        return res.json({
          success: true,
          message: 'Member re-activated successfully.',
          data,
        });
      }
    }

    // Insert new member
    const { data, error } = await supabase
      .from('pop_household_members')
      .insert({
        household_id: id,
        user_id: user.id,
        role: role || 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify new member
    await createNotification(
      user.id,
      'household_member_added',
      'Added to household',
      `You have been added to household "${membership.data?.name || id}".`
    );

    // Also notify the adder
    await createNotification(
      userId,
      'household_member_added',
      'Member added',
      `You added ${user.full_name || user.email} to the household.`
    );

    return res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      data,
    });
  } catch (error) {
    console.error('addMember:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add member.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// UPDATE MEMBER ROLE (owner only, or admin with restrictions)
// ============================================================

export const updateMemberRole = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required.' });
    }

    // Verify the user updating is owner or admin
    const membership = await verifyHouseholdMembership(userId, id);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can update member roles.' });
    }

    // If the updater is admin, prevent changing owner or other admin's role? We'll allow but we can restrict.
    // For simplicity, we allow any admin to change roles except for owner.
    // But we'll check: if target user is owner, only owner can change (or prevent)
    const { data: targetMember, error: targetError } = await supabase
      .from('pop_household_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('household_id', id)
      .single();

    if (targetError || !targetMember) {
      return res.status(404).json({ success: false, message: 'Member not found in this household.' });
    }

    // Prevent changing the owner's role
    if (targetMember.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot change the owner\'s role.' });
    }

    // Prevent a non-owner from changing another admin's role? We'll allow for now.

    const { data, error } = await supabase
      .from('pop_household_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    // Notify the member
    await createNotification(
      targetMember.user_id,
      'household_role_changed',
      'Household role updated',
      `Your role in the household has been changed to "${role}".`
    );

    return res.json({
      success: true,
      message: 'Member role updated.',
      data,
    });
  } catch (error) {
    console.error('updateMemberRole:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update member role.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// REMOVE MEMBER FROM HOUSEHOLD (owner or admin)
// ============================================================

export const removeMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id, memberId } = req.params;

    // Verify the user removing has permission
    const membership = await verifyHouseholdMembership(userId, id);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: membership.error });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can remove members.' });
    }

    // Get target member info
    const { data: targetMember, error: targetError } = await supabase
      .from('pop_household_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('household_id', id)
      .single();

    if (targetError || !targetMember) {
      return res.status(404).json({ success: false, message: 'Member not found in this household.' });
    }

    // Prevent removing owner
    if (targetMember.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot remove the household owner.' });
    }

    // Prevent self-removal via this endpoint? We'll allow only if user is not owner.
    if (targetMember.user_id === userId) {
      return res.status(403).json({ success: false, message: 'Use the "leave household" endpoint to remove yourself.' });
    }

    // Delete member
    const { error } = await supabase
      .from('pop_household_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    // Notify removed member
    await createNotification(
      targetMember.user_id,
      'household_member_removed',
      'Removed from household',
      `You have been removed from the household.`
    );

    return res.json({
      success: true,
      message: 'Member removed successfully.',
    });
  } catch (error) {
    console.error('removeMember:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove member.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
// LEAVE HOUSEHOLD (user removes themselves)
// ============================================================

export const leaveHousehold = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID is required.' });
    }

    const { id } = req.params;

    // Check membership
    const membership = await verifyHouseholdMembership(userId, id);
    if (!membership.valid) {
      return res.status(403).json({ success: false, message: 'You are not a member of this household.' });
    }

    // Check if user is owner – they can't leave, must delete or transfer ownership
    const { data: household, error: householdError } = await supabase
      .from('pop_households')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (householdError) throw householdError;

    if (household.owner_id === userId) {
      return res.status(400).json({
        success: false,
        message: 'The household owner cannot leave. Transfer ownership or delete the household first.',
      });
    }

    // Delete membership
    const { error } = await supabase
      .from('pop_household_members')
      .delete()
      .eq('household_id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Notification
    await createNotification(
      userId,
      'household_left',
      'Left household',
      'You have left the household.'
    );

    return res.json({
      success: true,
      message: 'You have left the household.',
    });
  } catch (error) {
    console.error('leaveHousehold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave household.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};