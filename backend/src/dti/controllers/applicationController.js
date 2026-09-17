// backend/controllers/applicationController.js

import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================
// CREATE APPLICATION
// ============================================

/**
 * Create an application for an item
 */
export const createApplication = async (req, res) => {
  try {
    const { itemId, message, shipping_estimate } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    // Check if item exists and is active
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, donor_id, status, title, quantity')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    if (item.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `This item is no longer available (${item.status})`
      });
    }

    if (item.donor_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot apply for your own item'
      });
    }

    // Check if user already applied
    const { data: existing, error: existingError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('item_id', itemId)
      .eq('applicant_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({
          success: false,
          error: 'You have already applied for this item'
        });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: 'You have already been accepted for this item'
        });
      }
      // If rejected or cancelled, allow re-application
      if (existing.status === 'rejected' || existing.status === 'cancelled') {
        // Delete old application
        await supabase
          .from('applications')
          .delete()
          .eq('id', existing.id);
      }
    }

    // Get applicant profile for notification
    const { data: applicantProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Create application with re-interest fields
    const { data, error } = await supabase
      .from('applications')
      .insert({
        item_id: itemId,
        applicant_id: userId,
        message: message || '',
        shipping_estimate: shipping_estimate || null,
        status: 'pending',
        reinterest_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // ✅ Send notification to donor
    await createNotification(
      item.donor_id,
      'application_received',
      'New Application Received',
      `${applicantProfile?.full_name || 'Someone'} applied for "${item.title}"`,
      {
        item_id: itemId,
        application_id: data.id,
        applicant_id: userId,
        applicant_name: applicantProfile?.full_name || 'Someone'
      }
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      application: data
    });

  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application'
    });
  }
};

// ============================================
// GET ITEM APPLICATIONS
// ============================================
/**
 * Get applications for an item (for donors)
 */
export const getItemApplications = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id, title, status, quantity, donor_confirmed_at, winner_confirmed_at, completed_at')
      .eq('id', itemId)
      .single();

    if (itemError) {
      console.error('Item fetch error:', itemError);
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    if (item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view applications for this item'
      });
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .eq('item_id', itemId)
      .order('reinterest_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Applications fetch error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      applications: data || [],
      item: {
        donor_confirmed_at: item.donor_confirmed_at,
        winner_confirmed_at: item.winner_confirmed_at,
        completed_at: item.completed_at,
        quantity: item.quantity || 1,
        accepted_count: data.filter(a => a.status === 'accepted').length
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
};





// ============================================
// GET APPLICATION BY ID
// ============================================

/**
 * Get a single application by ID
 */
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          quantity,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get application error:', error);
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (data.applicant_id !== userId && data.item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this application'
      });
    }

    res.json({
      success: true,
      application: data
    });

  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application'
    });
  }
};

// ============================================
// GET USER APPLICATIONS
// ============================================

export const getUserApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    let query = supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          quantity,
          donor_confirmed_at,
          winner_confirmed_at,
          completed_at,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `)
      .eq('applicant_id', userId)
      .order('reinterest_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (status && status !== '') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      applications: data || []
    });

  } catch (error) {
    console.error('Get user applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
};




// ============================================
// UPDATE APPLICATION STATUS
// ============================================
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "accepted" or "rejected"',
      });
    }

    // Fetch the application with its item (inner join ensures item exists)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        item:items!inner(
          id,
          donor_id,
          title,
          status
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }

    // Only the item's donor can update applications
    if (application.item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this application',
      });
    }

    // Only pending (or previously rejected) applications can be updated
    if (application.status !== 'pending' && application.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: `Cannot update a ${application.status} application`,
      });
    }

    // If accepting, ensure there isn't already an accepted winner for this item
    if (status === 'accepted') {
      const { data: existingWinner } = await supabase
        .from('applications')
        .select('id, applicant_id')
        .eq('item_id', application.item_id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (existingWinner) {
        return res.status(400).json({
          success: false,
          error: 'This item already has an accepted winner.',
        });
      }
    }

    // Get donor profile for notification messages
    const { data: donorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Update the chosen application
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items!inner(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          quantity,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `)
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
      });
    }

    // ====================
    // ACCEPTED LOGIC
    // ====================
    if (status === 'accepted') {
      // 1. Fetch all other pending applications for this item (for notifications)
      const { data: otherPending } = await supabase
        .from('applications')
        .select('id, applicant_id')
        .eq('item_id', application.item_id)
        .eq('status', 'pending')
        .neq('id', applicationId);

      // 2. Auto‑close all of them to 'not_selected'
      const { error: bulkError } = await supabase
        .from('applications')
        .update({
          status: 'not_selected',
          updated_at: new Date().toISOString(),
        })
        .eq('item_id', application.item_id)
        .eq('status', 'pending')
        .neq('id', applicationId);

      if (bulkError) {
        console.error('Error auto‑rejecting pending applications:', bulkError);
        // non‑fatal – the acceptance itself succeeded
      }

      // 3. Notify each auto‑closed applicant
      if (otherPending) {
        for (const other of otherPending) {
          await createNotification(
            other.applicant_id,
            'application_rejected',
            'Item Awarded to Someone Else',
            `"${application.item.title}" has been awarded to another applicant. Your application was automatically closed.`,
            {
              item_id: application.item_id,
              application_id: other.id,
              winner_name: updatedApplication.applicant?.full_name || 'Another user',
            }
          );
        }
      }

      // 4. Update the item: status → 'pending', set winner_id
      await supabase
        .from('items')
        .update({
          status: 'pending',
          winner_id: application.applicant_id,
          winner_announced_at: new Date().toISOString(),
        })
        .eq('id', application.item_id);

      // 5. Notify the winner
      await createNotification(
        application.applicant_id,
        'application_accepted',
        '🎉 Application Accepted!',
        `Your application for "${application.item.title}" has been accepted! Coordinate with the donor to receive your item.`,
        {
          item_id: application.item_id,
          application_id: applicationId,
          donor_id: userId,
        }
      );

      // 6. Notify the donor
      await createNotification(
        userId,
        'winner_announced',
        '🏆 Winner Selected!',
        `You selected ${updatedApplication.applicant?.full_name || 'a winner'} for "${application.item.title}". Confirm receipt once you've handed over the item.`,
        {
          item_id: application.item_id,
          winner_id: application.applicant_id,
          winner_name: updatedApplication.applicant?.full_name,
        }
      );
    }

    // ====================
    // REJECTED LOGIC
    // ====================
    if (status === 'rejected') {
      // Notify the rejected applicant
      await createNotification(
        application.applicant_id,
        'application_rejected',
        'Application Update',
        `Your application for "${application.item.title}" was not selected at this time.`,
        {
          item_id: application.item_id,
          application_id: applicationId,
        }
      );
    }

    res.json({
      success: true,
      message: `Application ${status} successfully!`,
      application: updatedApplication,
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application',
    });
  }
};



// ============================================
// RE-ACCEPT A REJECTED APPLICATION
// ============================================

export const reacceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    // Fetch application with item details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        item:items!inner(
          id,
          donor_id,
          title,
          status
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }

    // Check authorization (donor only)
    if (application.item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this application',
      });
    }

    // Only rejected or not_selected applications can be re-accepted
    if (application.status !== 'rejected' && application.status !== 'not_selected') {
      return res.status(400).json({
        success: false,
        error: `Only rejected/not_selected applications can be re-accepted. Current status: ${application.status}`,
      });
    }

    // Check if item is still available
    if (application.item.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot re-accept – item is already completed',
      });
    }

    // Ensure there isn't already an accepted winner for this item
    const { data: existingWinner } = await supabase
      .from('applications')
      .select('id, applicant_id')
      .eq('item_id', application.item_id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (existingWinner) {
      return res.status(400).json({
        success: false,
        error: 'This item already has an accepted winner.',
      });
    }

    // Update application to accepted
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items!inner(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `)
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
      });
    }

    // ---- Auto-close other pending applications ----
    // 1. Fetch other pending applicants (for notifications)
    const { data: otherPending } = await supabase
      .from('applications')
      .select('id, applicant_id')
      .eq('item_id', application.item_id)
      .eq('status', 'pending')
      .neq('id', applicationId);

    // 2. Close them to 'not_selected'
    const { error: bulkError } = await supabase
      .from('applications')
      .update({
        status: 'not_selected',
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', application.item_id)
      .eq('status', 'pending')
      .neq('id', applicationId);

    if (bulkError) {
      console.error('Error auto-closing pending applications:', bulkError);
    }

    // 3. Notify each auto-closed applicant
    if (otherPending) {
      for (const other of otherPending) {
        await createNotification(
          other.applicant_id,
          'application_not_selected',
          'Item Awarded to Someone Else',
          `"${application.item.title}" has been awarded to another applicant. Your application was automatically closed.`,
          {
            item_id: application.item_id,
            application_id: other.id,
            winner_name: updatedApplication.applicant?.full_name || 'Another user',
          }
        );
      }
    }

    // 4. Update item status to 'pending' and set winner_id
    await supabase
      .from('items')
      .update({
        status: 'pending',
        winner_id: application.applicant_id,
        winner_announced_at: new Date().toISOString(),
      })
      .eq('id', application.item_id);

    // ---- Notifications ----
    // Notify the newly accepted applicant
    await createNotification(
      application.applicant_id,
      'application_accepted',
      '🎉 You\'ve Been Selected!',
      `Great news! You've been selected for "${application.item.title}"!`,
      {
        item_id: application.item_id,
        application_id: applicationId,
        donor_id: userId,
      }
    );

    // Notify the donor
    await createNotification(
      userId,
      'winner_announced',
      '🏆 Winner Re‑selected!',
      `You have re‑accepted ${updatedApplication.applicant?.full_name || 'an applicant'} for "${application.item.title}".`,
      {
        item_id: application.item_id,
        winner_id: application.applicant_id,
        winner_name: updatedApplication.applicant?.full_name || 'Applicant',
      }
    );

    res.json({
      success: true,
      message: 'Application re‑accepted successfully!',
      application: updatedApplication,
    });

  } catch (error) {
    console.error('Re‑accept application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re‑accept application',
    });
  }
};




// ============================================
// CANCEL APPLICATION
// ============================================

/**
 * Cancel an application (by applicant) - only pending applications
 */
export const cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        applicant_id, 
        status,
        item:items(
          id,
          donor_id,
          title
        ),
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.applicant_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to cancel this application'
      });
    }

    // ✅ Only pending applications can be cancelled
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a ${application.status} application. Only pending applications can be cancelled.`
      });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // ✅ Send notification to donor
    await createNotification(
      application.item.donor_id,
      'application_rejected',
      'Application Cancelled',
      `${application.applicant?.full_name || 'An applicant'} cancelled their application for "${application.item.title}"`,
      {
        item_id: application.item_id,
        application_id: applicationId,
        applicant_id: userId,
        applicant_name: application.applicant?.full_name || 'An applicant'
      }
    );

    res.json({
      success: true,
      message: 'Application cancelled successfully!',
      application: data
    });

  } catch (error) {
    console.error('Cancel application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel application'
    });
  }
};

// ============================================
// RE-DECLARE INTEREST
// ============================================

/**
 * Re-declare interest on an item (Re-Interest)
 */
export const redeclareInterest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        item:items(
          id,
          donor_id,
          status as item_status,
          title
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.applicant_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to re-declare interest on this application'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot re-declare interest on a ${application.status} application`
      });
    }

    if (application.item.item_status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Item is no longer available (${application.item.item_status})`
      });
    }

    const referenceDate = application.last_reinterest_date || application.created_at;
    const daysSince = Math.floor((new Date() - new Date(referenceDate)) / (1000 * 60 * 60 * 24));

    if (daysSince < 7) {
      const daysRemaining = Math.ceil(7 - daysSince);
      return res.status(400).json({
        success: false,
        error: `You can re-declare interest in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
        daysRemaining: daysRemaining,
        next_available_date: new Date(new Date(referenceDate).getTime() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({
        reinterest_count: (application.reinterest_count || 0) + 1,
        last_reinterest_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `)
      .single();

    if (error) {
      console.error('Re-interest update error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Get applicant profile for notification
    const { data: applicantProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // ✅ Send notification to donor
    await createNotification(
      application.item.donor_id,
      'reinterest',
      'Re-Interest Declared',
      `${applicantProfile?.full_name || 'A user'} has re-declared interest on "${application.item.title}" (${data.reinterest_count}x)`,
      {
        application_id: applicationId,
        item_id: application.item_id,
        applicant_id: userId,
        reinterest_count: data.reinterest_count,
        applicant_name: applicantProfile?.full_name || 'A user'
      }
    );

    res.json({
      success: true,
      message: 'Interest re-declared successfully!',
      application: data,
      reinterest_count: data.reinterest_count,
      next_available_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

  } catch (error) {
    console.error('Re-declare interest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re-declare interest'
    });
  }
};

// ============================================
// GET RE-INTEREST HISTORY
// ============================================

/**
 * Get re-interest history for an application
 */
export const getReinterestHistory = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        reinterest_count,
        last_reinterest_date,
        created_at,
        applicant_id,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country
        ),
        item:items(
          id,
          title,
          donor_id,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country
          )
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError) {
      console.error('Application fetch error:', appError);
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.applicant_id !== userId && application.item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this re-interest history'
      });
    }

    const lastReinterestDate = application.last_reinterest_date || application.created_at;
    const nextAvailableDate = new Date(new Date(lastReinterestDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((nextAvailableDate - new Date()) / (1000 * 60 * 60 * 24));

    const reinterestTimeline = [];
    
    reinterestTimeline.push({
      type: 'initial',
      date: application.created_at,
      description: 'Initial application submitted'
    });

    for (let i = 1; i <= (application.reinterest_count || 0); i++) {
      const eventDate = new Date(new Date(application.created_at).getTime() + i * 7 * 24 * 60 * 60 * 1000);
      reinterestTimeline.push({
        type: 'reinterest',
        date: eventDate,
        description: `Re-interest declared (${i})`
      });
    }

    res.json({
      success: true,
      application: {
        id: application.id,
        applicant: application.applicant,
        item: application.item,
        reinterest_count: application.reinterest_count || 0,
        last_reinterest_date: application.last_reinterest_date,
        initial_application_date: application.created_at,
        next_available_date: nextAvailableDate,
        days_until_next_reinterest: Math.max(0, daysRemaining),
        can_redeclare: daysRemaining <= 0,
        timeline: reinterestTimeline
      }
    });

  } catch (error) {
    console.error('Get re-interest history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch re-interest history'
    });
  }
};

// ============================================
// GET APPLICATIONS WITH RE-INTEREST
// ============================================

/**
 * Get applications with re-interest filter for donor
 */
export const getApplicationsWithReinterest = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    if (item.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view applications for this item'
      });
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .eq('item_id', itemId)
      .eq('status', 'pending')
      .order('reinterest_count', { ascending: false })
      .order('last_reinterest_date', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      applications: data,
      summary: {
        total: data.length,
        with_reinterest: data.filter(a => (a.reinterest_count || 0) > 0).length,
        total_reinterests: data.reduce((sum, a) => sum + (a.reinterest_count || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get applications with re-interest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Admin: Get all applications with filters and pagination
 */
export const adminGetAllApplications = async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      status,
      item_id,
      applicant_id,
      date_from,
      date_to,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        ),
        item:items!item_id(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor_pays_shipping,
          shipping_regions,
          status,
          quantity,
          created_at,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            country,
            phone,
            bio,
            rating,
            items_given,
            items_received,
            email_verified,
            created_at,
            ban_status
          )
        )
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (item_id) {
      query = query.eq('item_id', item_id);
    }

    if (applicant_id) {
      query = query.eq('applicant_id', applicant_id);
    }

    if (date_from) {
      query = query.gte('created_at', new Date(date_from).toISOString());
    }
    if (date_to) {
      query = query.lte('created_at', new Date(date_to).toISOString());
    }

    const validSortFields = ['created_at', 'status', 'updated_at'];
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
        error: error.message
      });
    }

    res.json({
      success: true,
      applications: data || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Admin get all applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
};

/**
 * Admin: Review application
 */
export const adminReviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !['accepted', 'rejected', 'pending', 'not_selected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: accepted, rejected, pending, not_selected',
      });
    }

    // Fetch application with item info
    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        *,
        item:items(
          id,
          status as item_status,
          donor_id,
          title
        )
      `)
      .eq('id', applicationId)
      .single();

    if (checkError) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // If accepting, ensure no other accepted winner exists for this item
    if (status === 'accepted') {
      const { data: existingWinner } = await supabase
        .from('applications')
        .select('id')
        .eq('item_id', existing.item_id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (existingWinner && existingWinner.id !== applicationId) {
        return res.status(400).json({
          success: false,
          error: 'This item already has an accepted winner.',
        });
      }
    }

    const updates = {
      status: status,
      admin_notes: admin_notes || null,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedApplication, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .select(`
        *,
        applicant:profiles!applicant_id(
          id, full_name, avatar_url, location, country,
          phone, email, bio, rating, items_given, items_received,
          email_verified, created_at, ban_status
        ),
        item:items!item_id(
          id, title, description, category, condition, images,
          donor_pays_shipping, shipping_regions, status, quantity,
          donor:profiles!donor_id(
            id, full_name, avatar_url, location, country,
            phone, bio, rating, items_given, items_received,
            email_verified, created_at, ban_status
          )
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // ====================
    // ACCEPTANCE LOGIC
    // ====================
    if (status === 'accepted') {
      // 1. Fetch other pending apps for notifications
      const { data: others } = await supabase
        .from('applications')
        .select('id, applicant_id')
        .eq('item_id', existing.item_id)
        .eq('status', 'pending')
        .neq('id', applicationId);

      // 2. Auto-close them
      await supabase
        .from('applications')
        .update({ status: 'not_selected', updated_at: new Date().toISOString() })
        .eq('item_id', existing.item_id)
        .eq('status', 'pending')
        .neq('id', applicationId);

      // 3. Notify them
      if (others) {
        for (const other of others) {
          await createNotification(
            other.applicant_id,
            'application_rejected',
            'Item Awarded to Someone Else',
            `"${existing.item.title}" has been awarded to another applicant. Your application was automatically closed.`,
            { item_id: existing.item_id, application_id: other.id }
          );
        }
      }

      // 4. Update item status to pending and set winner
      await supabase
        .from('items')
        .update({
          status: 'pending',
          winner_id: existing.applicant_id,
          winner_announced_at: new Date().toISOString(),
        })
        .eq('id', existing.item_id);

      // 5. Notify winner & donor
      await createNotification(
        existing.applicant_id,
        'application_accepted',
        '🎉 Application Accepted!',
        `Your application for "${existing.item.title}" has been accepted!`,
        { item_id: existing.item_id, application_id: applicationId, donor_id: existing.item.donor_id }
      );

      await createNotification(
        existing.item.donor_id,
        'winner_announced',
        '🏆 Winner Selected by Admin',
        `Admin selected ${updatedApplication.applicant?.full_name || 'a winner'} for "${existing.item.title}".`,
        { item_id: existing.item_id, winner_id: existing.applicant_id }
      );
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      application: updatedApplication,
    });

  } catch (error) {
    console.error('Admin review application error:', error);
    res.status(500).json({ success: false, error: 'Failed to review application' });
  }
};




/**
 * Admin: Delete application
 */
export const adminDeleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select(`
        id, 
        status,
        applicant:profiles!applicant_id(
          id,
          full_name,
          avatar_url,
          location,
          country,
          phone,
          email,
          bio,
          rating,
          items_given,
          items_received,
          email_verified,
          created_at,
          ban_status
        )
      `)
      .eq('id', applicationId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Application deleted successfully',
      application: existing
    });

  } catch (error) {
    console.error('Admin delete application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete application'
    });
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  createApplication,
  getItemApplications,
  getApplicationById,
  getUserApplications,
  updateApplicationStatus,
  reacceptApplication,
  cancelApplication,
  redeclareInterest,
  getReinterestHistory,
  getApplicationsWithReinterest,
  adminGetAllApplications,
  adminReviewApplication,
  adminDeleteApplication
};