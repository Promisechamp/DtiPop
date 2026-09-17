// backend/controllers/userController.js
import { supabase, supabaseAdmin } from '../../db/index.js';
import { cleanupImages, deleteImage, extractPublicId } from '../../utils/cloudinary.js';
import { autoUnbanUsers } from '../../utils/autoUnban.js';

/**
 * Run auto-unban check manually
 */
export const runAutoUnban = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await autoUnbanUsers();
    
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Auto-unban error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run auto-unban'
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

    // ✅ First, get the profile data
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
          error: 'User not found'
        });
      }
      return res.status(400).json({
        success: false,
        error: profileError.message
      });
    }

    // If no profile exists, create one
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
            updated_at: new Date().toISOString()
          }
        ])
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile'
        });
      }

      // Get counts
      const [itemsGiven, itemsReceived, applications] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('donor_id', userId),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('winner_id', userId),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', userId)
      ]);

      const result = {
        ...newProfile,
        items_given: itemsGiven.count || 0,
        items_received: itemsReceived.count || 0,
        applications_count: applications.count || 0,
        items_given_count: itemsGiven.count || 0,
        items_received_count: itemsReceived.count || 0,
        won_items: []
      };

      if (currentUserId !== userId) {
        delete result.phone;
        delete result.email;
      }

      return res.json({
        success: true,
        profile: result
      });
    }

    // ✅ Get counts separately
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
        .eq('winner_id', userId)
    ]);

    // ✅ Build the result with all profile fields
    const result = {
      // All profile fields
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
      created_at: profileData.created_at || new Date().toISOString(),
      updated_at: profileData.updated_at || new Date().toISOString(),
      
      // Counts
      items_given: itemsGiven.count || 0,
      items_received: itemsReceived.count || 0,
      applications_count: applications.count || 0,
      items_given_count: itemsGiven.count || 0,
      items_received_count: itemsReceived.count || 0,
      won_items: winners.data || []
    };

    // Get user data separately for email and phone if needed
    const { data: userData, error: userError } = await supabase.auth.admin
      .getUserById(userId);

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
        email_confirmed_at: userData.user.email_confirmed_at
      };
    }

    // Don't return sensitive info if not the owner
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
      profile: result
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
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
        error: 'User ID is required'
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
        error: error.message
      });
    }

    res.json({
      success: true,
      exists: !!profile,
      profile: profile || null
    });

  } catch (error) {
    console.error('❌ Check profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

    // Fields that can be updated
    const allowedFields = [
      'full_name',
      'avatar_url',
      'location',
      'country',
      'phone',
      'bio'
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
        error: 'No valid fields to update'
      });
    }

    // ✅ If avatar_url is being updated, get the old avatar URL
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

    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    // ✅ If database update fails, clean up the newly uploaded image
    if (error) {
      console.error('❌ Database update failed:', error);
      
      if (updates.avatar_url) {
        console.log('🧹 Cleaning up newly uploaded avatar image...');
        const cleanupResult = await cleanupImages([updates.avatar_url]);
        console.log('✅ Cleanup result:', cleanupResult);
      }
      
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Database updated successfully');

    // ✅ If avatar was updated and old avatar exists, delete the old image
    if (oldAvatarUrl && updates.avatar_url && oldAvatarUrl !== updates.avatar_url) {
      console.log('🧹 Attempting to delete old avatar image from Cloudinary...');
      console.log('📋 Old avatar URL:', oldAvatarUrl);
      
      try {
        // Extract public ID from the old avatar URL
        const publicId = extractPublicId(oldAvatarUrl);
        console.log('📋 Extracted public ID:', publicId);
        
        if (publicId) {
          // ✅ Check if the public ID contains the profiles folder
          if (publicId.includes('donttrashit/profiles')) {
            console.log('✅ Public ID has correct profiles folder structure');
          } else if (publicId.includes('donttrashit/items')) {
            console.warn('⚠️ Old avatar is in items folder (should be in profiles)');
            // Still try to delete it
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
      profile: data
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (req.body.avatar_url) {
      console.log('🧹 Cleaning up uploaded avatar image on error...');
      await cleanupImages([req.body.avatar_url]).catch(err => {
        console.error('Failed to clean up image on error:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
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

      latitude:
        typeof latitude === 'number' ? latitude : null,

      longitude:
        typeof longitude === 'number' ? longitude : null,

      source,

      updated_at: new Date().toISOString(),
    };

    // Don't accept obviously invalid coordinates.
    if (
      location.latitude !== null &&
      (location.latitude < -90 ||
        location.latitude > 90)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude',
      });
    }

    if (
      location.longitude !== null &&
      (location.longitude < -180 ||
        location.longitude > 180)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude',
      });
    }

    const {
      data: profile,
      error: updateError,
    } = await supabase
      .from('profiles')
      .update({
        location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      console.error(
        '❌ Location update error:',
        updateError
      );

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
    console.error(
      '❌ Update location error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Failed to update location',
    });
  }
};




/**
 * Get user stats
 */
export const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get counts
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
        .eq('winner_id', userId)
    ]);

    res.json({
      success: true,
      stats: {
        items_given: itemsGiven.count || 0,
        items_received: itemsReceived.count || 0,
        applications_submitted: applications.count || 0,
        wins: wins.count || 0
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
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
        error: 'Email is required'
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send reset email'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
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
        error: 'Password and token are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Update password using the token
    const { error } = await supabase.auth.updateUser({
      password: password
    }, {
      token: token
    });

    if (error) {
      console.error('Reset password error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
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
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    // Get user email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (verifyError) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

// ============================================
// ADMIN USER MANAGEMENT FUNCTIONS
// ============================================



// backend/controllers/userController.js

export const adminGetAllUsers = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search, role, verified, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    let query = supabase
      .from('profiles')
      .select(`
        *,
        items_given:items!donor_id(count),
        items_received:items!winner_id(count),
        applications:applications!applicant_id(count),
        wins:winners!winner_id(count)
      `, { count: 'exact' });

    if (search && search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) query = query.eq('role', role);
    if (verified !== undefined && verified !== '') {
      query = query.eq('email_verified', verified === 'true');
    }

    const validSortFields = ['created_at', 'full_name', 'email', 'role', 'ban_count'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
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
        details: error
      });
    }

    const transformedUsers = (data || []).map(user => ({
      ...user,
      ban_count: user.ban_count || 0,
      items_given_count: user.items_given?.[0]?.count || 0,
      items_received_count: user.items_received?.[0]?.count || 0,
      applications_count: user.applications?.[0]?.count || 0,
      wins_count: user.wins?.[0]?.count || 0
    }));

    res.json({
      success: true,
      users: transformedUsers,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Admin get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message
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
      .select(`
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
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Transform the data to ensure consistent structure
    const transformedProfile = {
      ...profile,
      ban_count: profile.ban_count || 0,
      ban_history: profile.ban_history || [], // Include ban history
      items_given: (profile.items_given || []).map(item => ({
        ...item,
        images: item.images || [],
        applications_count: item.applications_count || 0,
        views_count: item.views_count || 0,
      })),
      items_received: (profile.items_received || []).map(item => ({
        ...item,
        images: item.images || [],
        applications_count: item.applications_count || 0,
        views_count: item.views_count || 0,
      })),
      applications: (profile.applications || []).map(app => ({
        ...app,
        item: app.item ? {
          ...app.item,
          images: app.item.images || [],
        } : null,
      })),
      wins: (profile.wins || []).map(win => ({
        ...win,
        item: win.item ? {
          ...win.item,
          images: win.item.images || [],
        } : null,
      })),
    };

    res.json({
      success: true,
      user: transformedProfile
    });

  } catch (error) {
    console.error('Admin get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
};


/**
 * Admin: Update user
 */
export const adminUpdateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, is_admin, email_verified, ban_status, full_name, location, country, phone } = req.body;

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: data
    });

  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
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
        error: 'Invalid ban status. Must be "banned" or "active"'
      });
    }

    // Get current user data
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id, full_name, ban_status, ban_count, ban_history, banned_until')
      .eq('id', userId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get admin profile info
    const { data: adminData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', adminId)
      .single();

    const adminName = adminData?.full_name || 'Admin';

    // Prepare update data
    const updates = {
      ban_status: ban_status,
      updated_at: new Date().toISOString()
    };

    // If banning
    if (ban_status === 'banned') {
      const now = new Date();
      const nowISO = now.toISOString();
      
      // Calculate banned_until based on duration
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
      
      // Create ban record with generated ID
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
        auto_unban: bannedUntil !== null
      };

      // Get existing ban history or create new array
      const currentHistory = existing.ban_history || [];
      const updatedHistory = [...currentHistory, banRecord];

      // Update profile with new ban
      updates.ban_count = (existing.ban_count || 0) + 1;
      updates.ban_reason = reason || 'No reason provided';
      updates.banned_at = nowISO;
      updates.banned_by = adminId;
      updates.banned_by_name = adminName;
      updates.ban_duration = banDurationText;
      updates.banned_until = bannedUntil;
      updates.ban_history = updatedHistory;

    } else {
      // If unbanning - find the current active ban and mark it as lifted
      const currentHistory = existing.ban_history || [];
      
      // Find the most recent active ban and mark it as lifted
      const updatedHistory = currentHistory.map(record => {
        if (record.status === 'active' && record.ban_number === existing.ban_count) {
          return {
            ...record,
            status: 'lifted',
            lifted_at: new Date().toISOString(),
            lifted_by: adminId,
            lifted_by_name: adminName,
            lifted_reason: 'Manually lifted by admin'
          };
        }
        return record;
      });

      // Clear ban details but keep history
      updates.ban_reason = null;
      updates.banned_at = null;
      updates.banned_by = null;
      updates.banned_by_name = null;
      updates.ban_duration = null;
      updates.banned_until = null;
      updates.ban_history = updatedHistory;
      // Keep ban_count as is for historical record
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
        error: error.message
      });
    }

    // Log the ban action
    console.log(`User ${userId} ${ban_status === 'banned' ? 'banned' : 'unbanned'}. Ban count: ${data.ban_count}`);

    res.json({
      success: true,
      message: ban_status === 'banned' ? 'User banned successfully' : 'User unbanned successfully',
      user: data
    });

  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user ban status'
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
        error: 'User not found'
      });
    }

    if (existing.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete a super admin user'
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
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'User deleted permanently'
      });
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ban_status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'User soft deleted successfully',
        user: data
      });
    }

  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
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
        error: 'Invalid role. Must be "user", "admin", or "super_admin"'
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
        error: 'User not found'
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: role,
        is_admin: role === 'admin' || role === 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `User role changed to ${role}`,
      user: data
    });

  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change user role'
    });
  }
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================

export default {
  getProfile,
  checkProfile,
  updateProfile,
		updateMyLocation,
  getUserStats,
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