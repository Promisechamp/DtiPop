// backend/controllers/chatController.js
import { supabase } from '../../db/index.js';
import { sendNotification } from '../../index.js';
import { createNotification } from './notificationController.js';


/**
 * Get or create a conversation for a specific item and applicant
 * ✅ Only the applicant can CREATE a conversation. If the donor calls
 * this and no conversation exists yet, we return 404 instead of
 * silently inserting one — donors should never be able to originate
 * a chat thread from their side.
 */
export const getOrCreateConversationWithApplicant = async (req, res) => {
  try {
    const { itemId, applicantId } = req.params;
    const userId = req.user.id;

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id, title, status')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Determine if current user is donor or applicant
    const isDonor = item.donor_id === userId;
    const isApplicant = userId === applicantId;

    if (!isDonor && !isApplicant) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access this conversation'
      });
    }

    // Set donor and applicant IDs
    const donorId = isDonor ? userId : item.donor_id;
    const applicantIdFinal = isDonor ? applicantId : userId;

    // Check if conversation already exists
    let { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', itemId)
      .eq('donor_id', donorId)
      .eq('applicant_id', applicantIdFinal)
      .eq('is_deleted', false)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: findError.message
      });
    }

    // If conversation exists, return it
    if (existing) {
      const otherUserId = isDonor ? applicantIdFinal : donorId;
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location, country')
        .eq('id', otherUserId)
        .single();

      return res.json({
        success: true,
        conversation: existing,
        other_user: otherUser,
        is_donor: isDonor,
        item: item
      });
    }

    // ✅ No conversation exists. Only the applicant is allowed to
    // originate one — the donor must wait for the applicant to start it.
    if (isDonor) {
      return res.status(404).json({
        success: false,
        error: 'No conversation exists yet. The applicant has not started a chat.',
        conversationExists: false
      });
    }

    // Create new conversation (applicant only)
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        item_id: itemId,
        donor_id: donorId,
        applicant_id: applicantIdFinal,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Create conversation error:', createError);
      return res.status(400).json({
        success: false,
        error: createError.message
      });
    }

    // Get other user's profile
    const otherUserId = donorId; // applicant is creating, so "other" is the donor
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, location, country')
      .eq('id', otherUserId)
      .single();

    res.status(201).json({
      success: true,
      conversation: newConversation,
      other_user: otherUser,
      is_donor: isDonor,
      item: item
    });

  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get or create conversation'
    });
  }
};



/**
 * Legacy: Get or create a conversation for an item
 * This creates a conversation with the first applicant or the current user as applicant
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('donor_id, title, status')
      .eq('id', itemId)
      .single();

    if (itemError) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const isDonor = item.donor_id === userId;

    // If user is donor, find the accepted applicant or first applicant
    if (isDonor) {
      // Find the accepted applicant first
      let { data: acceptedApp, error: appError } = await supabase
        .from('applications')
        .select('applicant_id')
        .eq('item_id', itemId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (appError) {
        return res.status(500).json({
          success: false,
          error: appError.message
        });
      }

      // If no accepted applicant, find the first pending applicant
      if (!acceptedApp) {
        const { data: pendingApp, error: pendingError } = await supabase
          .from('applications')
          .select('applicant_id')
          .eq('item_id', itemId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (pendingError) {
          return res.status(500).json({
            success: false,
            error: pendingError.message
          });
        }

        acceptedApp = pendingApp;
      }

      if (!acceptedApp) {
        return res.status(404).json({
          success: false,
          error: 'No applicant found for this item'
        });
      }

      // Now get or create conversation with the found applicant
      return getOrCreateConversationWithApplicant({
        ...req,
        params: { ...req.params, applicantId: acceptedApp.applicant_id }
      }, res);
    }

    // User is applicant - find their application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('applicant_id')
      .eq('item_id', itemId)
      .eq('applicant_id', userId)
      .maybeSingle();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: 'No application found for this item'
      });
    }

    // Get or create conversation with the applicant
    return getOrCreateConversationWithApplicant({
      ...req,
      params: { ...req.params, applicantId: userId }
    }, res);

  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get or create conversation'
    });
  }
};



export const processMessage = async (conversationId, userId, content, fileData = null) => {
  try {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, applicant_id, item_id, is_closed')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return { success: false, error: 'Conversation not found' };
    }

    const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;
    if (!isParticipant) {
      return { success: false, error: 'Not a participant' };
    }

    // ✅ Reject any message once the chat is closed (ended or reported)
    if (conversation.is_closed) {
      return { success: false, error: 'This chat has been closed and no longer accepts messages' };
    }

    const otherUserId = conversation.donor_id === userId ? conversation.applicant_id : conversation.donor_id;

    const messageData = {
      conversation_id: conversationId,
      sender_id: userId,
      content: content || null,
    };

    if (fileData) {
      messageData.file_url = fileData.fileUrl;
      messageData.file_name = fileData.fileName;
      messageData.file_type = fileData.fileType;
      messageData.file_size = fileData.fileSize;
      messageData.public_id = fileData.publicId;
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert(messageData)
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, avatar_url)
      `)
      .single();

    if (msgError) throw msgError;

    const lastMessageContent = fileData ? (fileData.fileName || 'File') : content;
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message: lastMessageContent
      })
      .eq('id', conversationId);

    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const notificationData = {
      chat_id: conversationId,
      sender_id: userId,
      sender_name: sender?.full_name || 'Someone',
      message_preview: fileData ? '📎 ' + (fileData.fileName || 'File') : (content || '').substring(0, 50)
    };

    await createNotification(
      otherUserId,
      'chat',
      'New Message',
      `${sender?.full_name || 'Someone'} sent you a message`,
      notificationData
    );

    return { success: true, message };

  } catch (error) {
    console.error('Process message error:', error);
    return { success: false, error: 'Failed to process message' };
  }
};



/**
 * Send a message via REST API
 */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await processMessage(conversationId, userId, content.trim());
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: result.message });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

/**
 * NEW: Save file message after Cloudinary upload
 * This receives the Cloudinary URL from frontend and saves it to the database
 */
export const saveFileMessage = async (req, res) => {
  try {
    const { 
      conversationId, 
      content, 
      fileUrl, 
      fileName, 
      fileType, 
      fileSize, 
      publicId 
    } = req.body;
    const userId = req.user.id;

    if (!conversationId || !fileUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: conversationId and fileUrl are required' 
      });
    }

    // Prepare file data
    const fileData = {
      fileUrl,
      fileName: fileName || 'file',
      fileType: fileType || 'application/octet-stream',
      fileSize: fileSize || 0,
      publicId: publicId || null,
    };

    // Process message with file
    const result = await processMessage(
      conversationId, 
      userId, 
      content || fileName || 'File', 
      fileData
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ 
      success: true, 
      message: result.message 
    });

  } catch (error) {
    console.error('Save file message error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save file message' 
    });
  }
};




export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    // ── Check if user is admin ──
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({ success: false, error: 'Failed to fetch user role' });
    }

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

    // ── Get conversation ──
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, applicant_id, is_closed, closed_at, closed_by, closed_reason')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;

    // ── Admin bypass ──
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // ── Fetch messages ──
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (msgError) throw msgError;

    const sortedMessages = (messages || []).reverse();

    // ── Return messages + conversation status ──
    res.json({
      success: true,
      messages: sortedMessages,
      conversation: {
        is_closed: conversation.is_closed,
        closed_at: conversation.closed_at,
        closed_by: conversation.closed_by,
        closed_reason: conversation.closed_reason,
        donor_id: conversation.donor_id,
        applicant_id: conversation.applicant_id,
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};




/**
 * Get all conversations for a user
 * UPDATED: Better unread count handling
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        item_id,
        donor_id,
        applicant_id,
        last_message_at,
        created_at,
        is_closed,
        closed_at,
        closed_by,
        closed_reason,
        donor:profiles!donor_id(id, full_name, avatar_url),
        applicant:profiles!applicant_id(id, full_name, avatar_url),
        item:items(id, title, images, status)
      `)
      .or(`donor_id.eq.${userId},applicant_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (convError) throw convError;

    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId);

        if (countError) console.error('Error counting unread:', countError);

        const otherUser = conv.donor_id === userId ? conv.applicant : conv.donor;

        return {
          ...conv,
          other_user: otherUser,
          unread_count: count || 0,
          last_message: lastMsg || null
        };
      })
    );

    res.json({ success: true, conversations: conversationsWithDetails });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
};



/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, applicant_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true, message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
};



/**
 * Close a chat (donor only)
 */
export const closeChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, item_id, is_closed')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (conversation.donor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the donor can close this chat'
      });
    }

    if (conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'This chat is already closed'
      });
    }

    const { error } = await supabase
      .from('conversations')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closed_reason: 'donor_closed'
      })
      .eq('id', conversationId);

    if (error) throw error;

    res.json({ success: true, message: 'Chat closed successfully' });

  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to close chat' });
  }
};

/**
 * Reopen a chat
 * ✅ Only allowed if the chat was manually closed (not reported), and
 * only by whoever closed it in the first place.
 */
export const reopenChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('donor_id, applicant_id, is_closed, closed_by, closed_reason')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (!conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'This chat is not closed'
      });
    }

    // ✅ Reported chats can never be reopened by participants
    if (conversation.closed_reason === 'reported') {
      return res.status(403).json({
        success: false,
        error: 'This chat was reported and cannot be reopened'
      });
    }

    // ✅ Only whoever closed it can reopen it
    if (conversation.closed_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the person who closed this chat can reopen it'
      });
    }

    const { error } = await supabase
      .from('conversations')
      .update({
        is_closed: false,
        closed_at: null,
        closed_by: null,
        closed_reason: null
      })
      .eq('id', conversationId);

    if (error) throw error;

    res.json({ success: true, message: 'Chat reopened successfully' });

  } catch (error) {
    console.error('Reopen chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to reopen chat' });
  }
};


/**
 * Report a chat
 * ✅ Reporting now also closes the conversation — no one can send
 * further messages, and the UI shows who reported it.
 */
export const reportChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }

    // Check if user is part of conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, is_closed')
      .eq('id', conversationId)
      .or(`donor_id.eq.${userId},applicant_id.eq.${userId}`)
      .single();

    if (convError) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'This chat is already closed'
      });
    }

    const { error: reportError } = await supabase
      .from('chat_reports')
      .insert({
        conversation_id: conversationId,
        reported_by: userId,
        reason: reason,
        description: description || null,
        status: 'pending'
      });

    if (reportError) throw reportError;

    // ✅ Close the conversation as a result of the report
    const { error: closeError } = await supabase
      .from('conversations')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closed_reason: 'reported'
      })
      .eq('id', conversationId);

    if (closeError) throw closeError;

    res.json({ success: true, message: 'Chat reported and closed successfully' });

  } catch (error) {
    console.error('Report chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to report chat' });
  }
};








// ─── Admin: Get all chat reports ──────────────────────────────────────────
export const adminGetChatReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('chat_reports')
      .select(`
        *,
        reporter:reported_by(id, full_name, avatar_url, email),
        conversation:conversation_id(
          id,
          donor_id,
          applicant_id,
          item_id
        )
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching chat reports:', error);
      return res.status(500).json({ success: false, error: 'Failed to load chat reports' });
    }

    return res.json({
      success: true,
      reports: data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('adminGetChatReports error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load chat reports' });
  }
};

// ─── Admin: Update chat report status ─────────────────────────────────────
export const adminUpdateChatReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('chat_reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat report:', error);
      return res.status(500).json({ success: false, error: 'Failed to update report' });
    }

    return res.json({ success: true, report: data });
  } catch (error) {
    console.error('adminUpdateChatReportStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update report' });
  }
};

// ─── Admin: Delete chat report ─────────────────────────────────────────────
export const adminDeleteChatReport = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('chat_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chat report:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete report' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('adminDeleteChatReport error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
};






export default {
  getOrCreateConversation,
  sendMessage,
  saveFileMessage,
  getMessages,
  getConversations,
  markMessagesAsRead,
  closeChat,
  reopenChat,
  reportChat,
  processMessage,
		
		adminGetChatReports,
		adminUpdateChatReportStatus,
		adminDeleteChatReport
};