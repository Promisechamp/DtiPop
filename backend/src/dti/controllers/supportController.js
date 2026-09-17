// backend/controllers/supportController.js
import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================
// HELPER: Format item images
// ============================================

const formatItemImages = (item) => {
  if (!item) return null;
  if (item.images) {
    if (Array.isArray(item.images)) {
      return item.images;
    }
    try {
      const parsed = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// ============================================
// HELPER: Get admin users
// ============================================

const getAdminUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('role', ['admin', 'super_admin']);

  if (error) {
    console.error('❌ Error fetching admin users:', error);
    return [];
  }
  return data || [];
};

// ============================================
// CREATE SUPPORT TICKET
// ============================================

export const createSupportTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      item_id, 
      application_id, 
      applicant_id, 
      reason, 
      description,
      reporter_type 
    } = req.body;

    // Validate required fields
    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }

    // Get reporter info for notification
    const { data: reporter } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    // Create the ticket
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        reporter_id: userId,
        item_id: item_id || null,
        application_id: application_id || null,
        applicant_id: applicant_id || null,
        reason: reason,
        description: description || null,
        reporter_type: reporter_type || 'unknown',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        reporter:profiles!reporter_id(
          id,
          full_name,
          email,
          avatar_url
        ),
        item:items(
          id,
          title,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url
          )
        ),
        applicant:profiles!applicant_id(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Support ticket creation error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Format images in the response
    if (data.item) {
      data.item.images = formatItemImages(data.item);
    }

    // ✅ Send notification to ALL admins
    const admins = await getAdminUsers();
    const reporterName = reporter?.full_name || 'A user';
    const reporterRole = reporter_type === 'donor' ? 'Donor' : 
                         reporter_type === 'winner' ? 'Winner' : 'User';

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'new_support_ticket',
        'New Support Ticket',
        `${reporterName} (${reporterRole}) created a new support ticket: ${reason}`,
        {
          ticket_id: data.id,
          reporter_id: userId,
          reporter_name: reporterName,
          reporter_type: reporter_type,
          item_id: item_id,
          reason: reason
        }
      );
    }

    // ✅ Send confirmation notification to the reporter
    await createNotification(
      userId,
      'support_ticket_created',
      'Support Ticket Created',
      `Your support ticket "${reason}" has been created. Our team will review it shortly.`,
      {
        ticket_id: data.id,
        reason: reason
      }
    );

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully. Our team will follow up shortly.',
      ticket: data
    });

  } catch (error) {
    console.error('❌ Create support ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report'
    });
  }
};

// ============================================
// GET MY TICKETS
// ============================================

export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        reporter:profiles!reporter_id(
          id,
          full_name,
          email,
          avatar_url
        ),
        item:items(
          id,
          title,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url
          )
        ),
        applicant:profiles!applicant_id(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Get my tickets error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const formattedData = (data || []).map(ticket => {
      if (ticket.item) {
        ticket.item.images = formatItemImages(ticket.item);
      }
      return ticket;
    });

    res.json({
      success: true,
      tickets: formattedData
    });

  } catch (error) {
    console.error('❌ Get my tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets'
    });
  }
};

// ============================================
// GET A SPECIFIC TICKET
// ============================================

// ============================================
// GET A SPECIFIC TICKET
// ============================================

export const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    console.log('==========================================');
    console.log('📩 GET TICKET');
    console.log('Ticket ID:', ticketId);
    console.log('Viewer ID:', userId);

    // ============================================
    // GET TICKET + REPLIES
    // ============================================

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        reporter:profiles!reporter_id(
          id,
          full_name,
          email,
          avatar_url,
          role
        ),
        item:items(
          id,
          title,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url
          )
        ),
        applicant:profiles!applicant_id(
          id,
          full_name,
          email,
          avatar_url,
          role
        ),
        replies:support_ticket_replies(
          id,
          ticket_id,
          sender_id,
          message,
          is_admin,
          created_at,
          sender:profiles!sender_id(
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        )
      `)
      .eq('id', ticketId)
      .single();

    // ============================================
    // TICKET NOT FOUND
    // ============================================

    if (error || !data) {
      console.error('❌ Get ticket error:', error);

      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // ============================================
    // AUTHORIZATION
    // ============================================

    if (data.reporter_id !== userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error(
          '❌ Profile lookup error:',
          profileError
        );

        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this ticket',
        });
      }

      const isAdmin =
        profile.role === 'admin' ||
        profile.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this ticket',
        });
      }
    }

    // ============================================
    // FORMAT ITEM IMAGES
    // ============================================

    if (data.item) {
      data.item.images = formatItemImages(data.item);
    }

    // ============================================
    // NORMALIZE REPLIES
    //
    // IMPORTANT:
    // We use BOTH:
    //
    // 1. database is_admin
    // 2. sender.profile.role
    //
    // This prevents the UI from receiving an
    // incorrect sender type.
    // ============================================

    const replies = Array.isArray(data.replies)
      ? data.replies
      : [];

    data.replies = replies
      .map((reply) => {
        const senderRole = String(
          reply.sender?.role || ''
        )
          .toLowerCase()
          .trim();

        const roleSaysAdmin =
          senderRole === 'admin' ||
          senderRole === 'super_admin';

        const databaseSaysAdmin =
          reply.is_admin === true ||
          reply.is_admin === 1 ||
          reply.is_admin === '1' ||
          (
            typeof reply.is_admin === 'string' &&
            reply.is_admin.toLowerCase().trim() === 'true'
          );

        /*
         * If either the stored value OR the sender's
         * actual profile role says admin, treat it
         * as an admin message.
         */
        const isAdmin =
          databaseSaysAdmin || roleSaysAdmin;

        return {
          id: reply.id,
          ticket_id: reply.ticket_id,
          sender_id: reply.sender_id,
          message: reply.message,
          created_at: reply.created_at,

          // This is what the frontend should use.
          is_admin: isAdmin,

          // Explicit sender information.
          sender: reply.sender
            ? {
                id: reply.sender.id,
                full_name: reply.sender.full_name,
                email: reply.sender.email,
                avatar_url: reply.sender.avatar_url,
                role: reply.sender.role,
              }
            : null,

          // Helpful explicit value for the frontend.
          sender_type: isAdmin ? 'admin' : 'user',
        };
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

    // ============================================
    // DEBUG
    // ============================================

    console.log(
      '💬 REPLIES:',
      data.replies.map((reply) => ({
        id: reply.id,
        sender_id: reply.sender_id,
        sender_name: reply.sender?.full_name,
        sender_role: reply.sender?.role,
        is_admin: reply.is_admin,
        sender_type: reply.sender_type,
        message: reply.message,
      }))
    );

    console.log('==========================================');

    // ============================================
    // RESPONSE
    // ============================================

    return res.json({
      success: true,
      ticket: data,
    });

  } catch (error) {
    console.error(
      '❌ Get ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket',
    });
  }
};




// ============================================
// REPLY TO TICKET
// ============================================

export const replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const { message } = req.body;

    // ============================================
    // VALIDATE MESSAGE
    // ============================================

    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // ============================================
    // GET TICKET
    // ============================================

    const { data: ticket, error: ticketError } =
      await supabase
        .from('support_tickets')
        .select(
          'id, reporter_id, status, reason'
        )
        .eq('id', ticketId)
        .single();

    if (ticketError || !ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // ============================================
    // CHECK TICKET STATUS
    // ============================================

    const status = String(
      ticket.status || ''
    ).toLowerCase();

    if (
      status === 'closed' ||
      status === 'resolved'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Cannot reply to a resolved or closed ticket',
      });
    }

    // ============================================
    // GET CURRENT USER ROLE
    // ============================================

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select(
          'id, full_name, role'
        )
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        error: 'Unable to verify user permissions',
      });
    }

    const isAdmin =
      profile.role === 'admin' ||
      profile.role === 'super_admin';

    const isReporter =
      ticket.reporter_id === userId;

    // ============================================
    // AUTHORIZATION
    // ============================================

    if (!isAdmin && !isReporter) {
      return res.status(403).json({
        success: false,
        error:
          'Not authorized to reply to this ticket',
      });
    }

    // ============================================
    // CREATE REPLY
    // ============================================

    const { data: reply, error: replyError } =
      await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: ticketId,
          sender_id: userId,
          message: cleanMessage,

          // IMPORTANT:
          // This is the ONLY source of truth for
          // whether the message came from support.
          is_admin: Boolean(isAdmin),

          created_at:
            new Date().toISOString(),
        })
        .select(`
          id,
          ticket_id,
          sender_id,
          message,
          is_admin,
          created_at,
          sender:profiles!sender_id(
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .single();

    if (replyError) {
      console.error(
        '❌ Reply creation error:',
        replyError
      );

      return res.status(400).json({
        success: false,
        error: replyError.message,
      });
    }

    // ============================================
    // NORMALIZE REPLY
    // ============================================

    const normalizedReply = {
      ...reply,

      is_admin:
        reply.is_admin === true ||
        reply.is_admin === 1 ||
        reply.is_admin === '1' ||
        (
          typeof reply.is_admin === 'string' &&
          reply.is_admin.toLowerCase().trim() ===
            'true'
        ),
    };

    // ============================================
    // UPDATE TICKET
    // ============================================

    const { error: updateError } =
      await supabase
        .from('support_tickets')
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', ticketId);

    if (updateError) {
      console.error(
        '⚠️ Ticket timestamp update failed:',
        updateError
      );
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================

    if (isAdmin) {
      // ------------------------------------------
      // ADMIN -> USER
      // ------------------------------------------

      await createNotification(
        ticket.reporter_id,
        'support_reply',
        'Support Team Replied',
        'Support team has replied to your ticket.',
        {
          ticket_id: ticketId,
          reply_id: normalizedReply.id,
          message: cleanMessage,
        }
      );
    } else {
      // ------------------------------------------
      // USER -> ADMINS
      // ------------------------------------------

      const admins =
        await getAdminUsers();

      const senderName =
        profile?.full_name ||
        'A user';

      for (const admin of admins) {
        await createNotification(
          admin.id,
          'support_user_reply',
          'User Replied to Ticket',
          `${senderName} replied to support ticket #${ticketId.slice(
            0,
            8
          )}`,
          {
            ticket_id: ticketId,
            reply_id: normalizedReply.id,
            user_id: userId,
            user_name: senderName,
            message: cleanMessage,
          }
        );
      }
    }

    // ============================================
    // RESPONSE
    // ============================================

    return res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      reply: normalizedReply,
    });

  } catch (error) {
    console.error(
      '❌ Reply to ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to send reply',
    });
  }
};


// ============================================
// ADMIN: GET ALL TICKETS
// ============================================

export const adminGetAllTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view all tickets'
      });
    }

    const { 
      limit = 50, 
      offset = 0, 
      status,
      reporter_type
    } = req.query;

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        reporter:profiles!reporter_id(
          id,
          full_name,
          email,
          avatar_url
        ),
        item:items(
          id,
          title,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url
          )
        ),
        applicant:profiles!applicant_id(
          id,
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (reporter_type) {
      query = query.eq('reporter_type', reporter_type);
    }

    const from = parseInt(offset);
    const to = parseInt(offset) + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Admin get all tickets error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const formattedData = (data || []).map(ticket => {
      if (ticket.item) {
        ticket.item.images = formatItemImages(ticket.item);
      }
      return ticket;
    });

    res.json({
      success: true,
      tickets: formattedData || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Admin get all tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets'
    });
  }
};

// ============================================
// ADMIN: UPDATE TICKET STATUS
// ============================================

export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    console.log("TICKET ID:", {ticketId} )
    console.log("STATUS:", {status} )
    console.log("USER ID:", userId )
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update ticket status'
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: open, in_progress, resolved, closed'
      });
    }

    // Get current ticket to notify reporter
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('reporter_id, reason')
      .eq('id', ticketId)
      .single();

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // ✅ Send notification to reporter about status change
    if (currentTicket?.reporter_id) {
      const statusLabels = {
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed'
      };
      
      await createNotification(
        currentTicket.reporter_id,
        'support_status_update',
        `Ticket Status: ${statusLabels[status]}`,
        `Your support ticket "${currentTicket.reason}" has been updated to ${statusLabels[status]}.`,
        {
          ticket_id: ticketId,
          status: status,
          status_label: statusLabels[status]
        }
      );
    }

    res.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket: data
    });

  } catch (error) {
    console.error('❌ Update ticket status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket status'
    });
  }
};

// ============================================
// ADMIN: DELETE TICKET
// ============================================

export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete tickets'
      });
    }

    // Get ticket info before deletion for notification
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('reporter_id, reason')
      .eq('id', ticketId)
      .single();

    const { error } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      console.error('❌ Delete ticket error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // ✅ Notify reporter that ticket was deleted
    if (ticket?.reporter_id) {
      await createNotification(
        ticket.reporter_id,
        'support_ticket_deleted',
        'Support Ticket Deleted',
        `Your support ticket "${ticket.reason}" has been deleted by an administrator.`,
        {
          ticket_id: ticketId,
          reason: ticket.reason
        }
      );
    }

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ticket'
    });
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  createSupportTicket,
  getMyTickets,
  getTicket,
  replyToTicket,
  adminGetAllTickets,
  updateTicketStatus,
  deleteTicket
};