// backend/src/socket.js
import { supabase } from './db/index.js';
import { createNotification } from './dti/controllers/notificationController.js';

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      console.log('⚠️ Socket connection rejected: No userId provided');
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);
    console.log(`📡 Socket connected for user: ${userId}`);

    // ─── Send chat message ────────────────────────────────────────
    socket.on('chat:send', async (data, callback) => {
      try {
        const { conversationId, content, recipientId } = data;

        if (!content?.trim()) {
          callback({ success: false, error: 'Message is required' });
          return;
        }

        // Verify conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('donor_id, applicant_id')
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Conversation not found:', convError);
          callback({ success: false, error: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.donor_id === userId || conversation.applicant_id === userId;
        if (!isParticipant) {
          callback({ success: false, error: 'Not a participant' });
          return;
        }

        // Save message
        const { data: message, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content: content.trim()
          })
          .select(`
            *,
            sender:profiles!sender_id(id, full_name, avatar_url)
          `)
          .single();

        if (msgError) {
          console.error('Error saving message:', msgError);
          callback({ success: false, error: 'Failed to save message' });
          return;
        }

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        // Send message to recipient in real-time
        const recipientRoom = `user:${recipientId}`;
        io.to(recipientRoom).emit('chat:receive', message);
        console.log(`✅ Message sent to recipient ${recipientId}`);

        // Get sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        // Create notification via controller (handles DB + preference)
        const notifResult = await createNotification(
          recipientId,
          'chat',
          '💬 New Message',
          `${sender?.full_name || 'Someone'} sent you a message`,
          {
            chat_id: conversationId,
            sender_id: userId,
            sender_name: sender?.full_name || 'Someone',
            message_preview: content.trim().substring(0, 50)
          }
        );

        if (!notifResult.success) {
          console.error('❌ Failed to create notification:', notifResult.error);
        } else {
          console.log(`✅ Notification created (realtime: ${notifResult.realtime_sent ? '✅' : '❌ skipped'})`);
        }

        callback({ success: true, message });

      } catch (error) {
        console.error('Chat send error:', error);
        callback({ success: false, error: 'Failed to send message' });
      }
    });

    // ─── Mark messages as read ────────────────────────────────────
    socket.on('chat:markRead', async (data) => {
      try {
        const { conversationId } = data;

        const { data: conversation } = await supabase
          .from('conversations')
          .select('donor_id, applicant_id')
          .eq('id', conversationId)
          .single();

        const otherUserId = conversation?.donor_id === userId ? conversation.applicant_id : conversation.donor_id;

        await supabase
          .from('messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .eq('is_read', false);

        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit('chat:read', {
            conversationId,
            readBy: userId,
            readAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // ─── Typing indicator ────────────────────────────────────────
    socket.on('chat:typing', (data) => {
      const { conversationId, recipientId, isTyping } = data;
      io.to(`user:${recipientId}`).emit('chat:typing', {
        conversationId,
        userId,
        isTyping
      });
    });

    // ─── Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`📡 Socket disconnected for user: ${userId}`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });
};