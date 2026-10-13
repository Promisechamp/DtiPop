// backend/controllers/chatController.js
import { supabase, supabaseAdmin } from '../../db/index.js';
import {
  createDTINotification,
  createPOPNotification,
} from '../../shared/controllers/notificationController.js';

// ============================================================
// CONSTANTS
// ============================================================

export const CONTEXT_ITEM = 'item';
export const CONTEXT_REQUEST = 'request';
export const CONTEXT_DIRECT = 'direct';

const ALLOWED_CONTEXTS = new Set([
  CONTEXT_ITEM,
  CONTEXT_REQUEST,
  CONTEXT_DIRECT,
]);

const MAX_MESSAGE_LENGTH = 5000;
const PREVIEW_LENGTH = 200;

const ALLOWED_MESSAGE_TYPES = new Set([
  'text',
  'image',
  'file',
  'voice',
  'system',
]);

const ALLOWED_CLOSE_REASONS = new Set([
  'donor_closed',
  'requester_closed',
  'provider_closed',
  'reported',
]);

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const parsePagination = (page, limit) => {
  const p = Math.max(Number.parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  return { page: p, limit: l, from: (p - 1) * l, to: p * l - 1 };
};

/**
 * Context-aware notification dispatcher.
 *
 * - `item` context → DTI notification channel
 * - `request` / `direct` → POP notification channel
 */
const notify = async (userId, conversation, payload = {}) => {
  if (!userId || !conversation) return;
  try {
    if (conversation.context_type === CONTEXT_ITEM) {
      await createDTINotification(
        userId,
        payload.type || 'chat',
        payload.title || 'Notification',
        payload.message || '',
        {
          chat_id: conversation.id,
          conversation_id: conversation.id,
          sender_id: payload.senderId || null,
          sender_name: payload.senderName || null,
          message_preview: payload.preview || null,
          item_id: conversation.context_id,
        }
      );
    } else {
      await createPOPNotification(
        userId,
        payload.type || 'notification',
        payload.title || 'Notification',
        payload.message || '',
        {
          conversation_id: conversation.id,
          request_id:
            conversation.request_id || conversation.context_id || null,
          provider_relationship_id:
            conversation.provider_relationship_id || null,
          preview: payload.preview || null,
        }
      );
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
};

// ============================================================
// SELECTS
// ============================================================

const CONVERSATION_SELECT = `
  id,
  context_type,
  context_id,
  request_id,
  provider_relationship_id,
  item_id,

  requester_id,
  provider_id,

  last_message,
  last_message_at,
  last_message_sender_id,

  is_deleted,
  is_closed,
  closed_at,
  closed_by,
  closed_reason,

  pinned_by,
  muted_by,
  archived_by,
  protected_by,
  deleted_by,
  history_cleared_before,

  created_at,
  updated_at,

  requester:profiles!conversations_requester_id_fkey (
    id, full_name, avatar_url, location
  ),
  provider:profiles!conversations_provider_id_fkey (
    id, full_name, avatar_url, location
  )
`;

const MESSAGE_SELECT = `
  id,
  conversation_id,
  sender_id,
  content,
  type,
  client_id,
  reply_to_id,
  metadata,
  is_read,
  read_at,
  delivered_at,
  is_deleted,
  deleted_at,
  deleted_for,
  edited_at,
  created_at,
  updated_at,

  sender:profiles!messages_sender_id_fkey (
    id, full_name, avatar_url
  )
`;

// ============================================================
// AUTH / ROLE
// ============================================================

const getConversationRole = (conversation, userId) => {
  if (!conversation || !userId) return null;
  const uid = String(userId);

  if (String(conversation.requester_id) === uid) return 'requester';
  if (String(conversation.provider_id) === uid) return 'provider';
  return null;
};

const isParticipant = (conversation, userId) =>
  getConversationRole(conversation, userId) !== null;

// ============================================================
// LOADERS
// ============================================================

const loadConversationById = async (conversationId) => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle();

  return { conversation: data, error };
};

const buildRequestMap = async (rows) => {
  const ids = [
    ...new Set(
      (rows || [])
        .filter((r) => r.context_type === CONTEXT_REQUEST)
        .map((r) => r.request_id || r.context_id)
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return {};

  const { data } = await supabaseAdmin
    .from('pop_requests')
    .select(
      `id, title, request_type, status, visibility, details, user_id`
    )
    .in('id', ids);

  const map = {};
  for (const row of data || []) map[row.id] = row;
  return map;
};

const buildItemMap = async (rows) => {
  const ids = [
    ...new Set(
      (rows || [])
        .filter((r) => r.context_type === CONTEXT_ITEM)
        .map((r) => r.context_id || r.item_id)
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return {};

  const { data } = await supabaseAdmin
    .from('items')
    .select('id, title, images, status, donor_id')
    .in('id', ids);

  const map = {};
  for (const row of data || []) map[row.id] = row;
  return map;
};

const buildUnreadMap = async (conversationIds, userId) => {
  if (!conversationIds.length) return {};

  const { data } = await supabaseAdmin
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .eq('is_read', false)
    .eq('is_deleted', false);

  const map = {};
  for (const row of data || []) {
    map[row.conversation_id] = (map[row.conversation_id] || 0) + 1;
  }
  return map;
};

// ============================================================
// DECORATORS
// ============================================================

const decorateConversation = (
  conversation,
  userId,
  requestMap = {},
  itemMap = {},
  unreadMap = {}
) => {
  const role = getConversationRole(conversation, userId);
  const other =
    role === 'requester' ? conversation.provider : conversation.requester;

  const arr = (v) => (Array.isArray(v) ? v : []);
  const includes = (v) =>
    arr(v).some((id) => String(id) === String(userId));

  const isItem = conversation.context_type === CONTEXT_ITEM;
  const requestId = conversation.request_id || conversation.context_id;
  const itemId = conversation.item_id || conversation.context_id;

  const base = {
    id: conversation.id,

    contextType: conversation.context_type,
    contextId: conversation.context_id,

    requestId: isItem ? null : requestId,
    providerRelationshipId:
      conversation.provider_relationship_id || null,
    itemId: isItem ? itemId : conversation.item_id || null,

    requester: conversation.requester,
    provider: conversation.provider,
    otherParticipant: other,
    other_user: other, // legacy DTI compatibility
    role,
    is_donor: role === 'requester' && isItem, // legacy DTI compat

    lastMessage: conversation.last_message,
    lastMessageAt: conversation.last_message_at,
    lastMessageSenderId: conversation.last_message_sender_id || null,

    unreadCount: unreadMap?.[conversation.id] || 0,

    isClosed: conversation.is_closed,
    closedAt: conversation.closed_at,
    closedBy: conversation.closed_by,
    closedReason: conversation.closed_reason,

    isPinned: includes(conversation.pinned_by),
    isMuted: includes(conversation.muted_by),
    isArchived: includes(conversation.archived_by),
    isProtected: includes(conversation.protected_by),

    protectedBy: arr(conversation.protected_by),

    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,

    request: requestId ? requestMap?.[requestId] || null : null,
    item: isItem ? itemMap?.[itemId] || null : null,
  };

  // Legacy DTI aliases
  if (isItem) {
    base.donor_id = conversation.requester_id;
    base.applicant_id = conversation.provider_id;
    base.donor = conversation.requester;
    base.applicant = conversation.provider;
    base.is_closed = conversation.is_closed;
  }

  return base;
};

const sanitizeMessage = (message, viewerId) => {
  if (!message) return null;

  const deletedFor = Array.isArray(message.deleted_for)
    ? message.deleted_for
    : [];

  if (
    viewerId &&
    deletedFor.some((id) => String(id) === String(viewerId))
  ) {
    return null;
  }

  if (message.is_deleted) {
    return {
      ...message,
      content: '',
      type: 'system',
      metadata: {
        ...(message.metadata || {}),
        tombstone: true,
      },
    };
  }

  return message;
};






// ============================================================
// UNIFIED: GET OR CREATE CONVERSATION
//
// POST /conversations
// Body: {
//   context_type: 'item' | 'request' | 'direct',
//   context_id?:  <uuid>,             // required for item/request
//   recipient_id?: <uuid>,            // required for direct
//   provider_relationship_id?: <uuid> // optional for request
// }
// ============================================================

export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const body = req.body || {};
    const contextType =
      body.context_type || body.contextType || CONTEXT_ITEM;
    const contextId =
      body.context_id || body.contextId || body.itemId || body.item_id ||
      body.requestId || body.request_id || null;
    const recipientId =
      body.recipient_id || body.recipientId || body.applicantId ||
      body.applicant_id || null;
    const providerRelationshipId =
      body.provider_relationship_id ||
      body.providerRelationshipId ||
      null;

    if (!ALLOWED_CONTEXTS.has(contextType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid context_type.',
      });
    }

    // --------------------------------------------------------
    // DIRECT
    // --------------------------------------------------------
    if (contextType === CONTEXT_DIRECT) {
      return getOrCreateDirectConversationInternal(req, res, {
        userId,
        recipientId,
        requestId: body.request_id || body.requestId || null,
      });
    }

    // --------------------------------------------------------
    // ITEM  (DTI)
    // --------------------------------------------------------
    if (contextType === CONTEXT_ITEM) {
      return getOrCreateItemConversation(req, res, {
        userId,
        itemId: contextId,
        applicantId: recipientId,
      });
    }

    // --------------------------------------------------------
    // REQUEST  (POP)
    // --------------------------------------------------------
    if (contextType === CONTEXT_REQUEST) {
      return getOrCreateRequestConversation(req, res, {
        userId,
        requestId: contextId,
        relationshipId: providerRelationshipId,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Unsupported context.',
    });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get or create conversation.',
    });
  }
};

// ============================================================
// ITEM CONTEXT  (DTI semantics)
//
// donor  = requester_id
// applicant = provider_id
// ============================================================

const getOrCreateItemConversation = async (
  req,
  res,
  { userId, itemId, applicantId }
) => {
  if (!itemId) {
    return res.status(400).json({ success: false, error: 'itemId is required.' });
  }

  const { data: item, error: itemError } = await supabaseAdmin
    .from('items')
    .select('donor_id, title, status')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    return res.status(404).json({ success: false, error: 'Item not found.' });
  }

  const donorId = item.donor_id;
  const isDonor = String(donorId) === String(userId);

  // Resolve applicant
  let resolvedApplicantId = applicantId;

  if (isDonor) {
    if (resolvedApplicantId) {
      // explicit applicant provided
    } else {
      // fall back to accepted or first pending application
      let { data: acceptedApp } = await supabaseAdmin
        .from('applications')
        .select('applicant_id')
        .eq('item_id', itemId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!acceptedApp) {
        const { data: pendingApp } = await supabaseAdmin
          .from('applications')
          .select('applicant_id')
          .eq('item_id', itemId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        acceptedApp = pendingApp;
      }

      resolvedApplicantId = acceptedApp?.applicant_id || null;
    }
  } else {
    // applicant side: verify they have applied
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('applicant_id')
      .eq('item_id', itemId)
      .eq('applicant_id', userId)
      .maybeSingle();

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'No application found for this item.',
      });
    }
    resolvedApplicantId = userId;
  }

  if (!resolvedApplicantId) {
    return res.status(404).json({
      success: false,
      error: 'No applicant found for this item.',
    });
  }

  const requesterId = donorId; // donor
  const providerId = resolvedApplicantId; // applicant

  // authorization
  const uid = String(userId);
  if (uid !== String(requesterId) && uid !== String(providerId)) {
    return res.status(403).json({
      success: false,
      error: 'You are not authorized to access this conversation.',
    });
  }

  // look up existing
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('context_type', CONTEXT_ITEM)
    .eq('context_id', itemId)
    .eq('requester_id', requesterId)
    .eq('provider_id', providerId)
    .maybeSingle();

  if (existing) {
    const [unreadMap, requestMap, itemMap] = await Promise.all([
      buildUnreadMap([existing.id], userId),
      buildRequestMap([existing]),
      buildItemMap([existing]),
    ]);
    return res.json({
      success: true,
      created: false,
      conversation: decorateConversation(
        existing,
        userId,
        requestMap,
        itemMap,
        unreadMap
      ),
    });
  }

  // donor can't originate
  if (isDonor) {
    return res.status(404).json({
      success: false,
      error:
        'No conversation exists yet. The applicant has not started a chat.',
      conversationExists: false,
    });
  }

  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabaseAdmin
    .from('conversations')
    .insert({
      context_type: CONTEXT_ITEM,
      context_id: itemId,
      item_id: itemId,
      request_id: null,
      provider_relationship_id: null,
      requester_id: requesterId,
      provider_id: providerId,
      last_message: null,
      last_message_at: now,
      last_message_sender_id: null,
      is_deleted: false,
      is_closed: false,
      deleted_by: [],
      history_cleared_before: {},
      pinned_by: [],
      muted_by: [],
      archived_by: [],
      protected_by: [],
    })
    .select(CONVERSATION_SELECT)
    .single();

  if (createError) {
    console.error('Create item conversation error:', createError);
    return res.status(500).json({
      success: false,
      error: createError.message,
    });
  }

  // Notify donor
  await notify(donorId, created, {
    type: 'conversation_started',
    title: 'New conversation',
    message: `A new conversation has started for "${item.title}".`,
  });

  const [unreadMap, requestMap, itemMap] = await Promise.all([
    buildUnreadMap([created.id], userId),
    buildRequestMap([created]),
    buildItemMap([created]),
  ]);

  return res.status(201).json({
    success: true,
    created: true,
    conversation: decorateConversation(
      created,
      userId,
      requestMap,
      itemMap,
      unreadMap
    ),
  });
};

// ============================================================
// REQUEST CONTEXT  (POP semantics)
// ============================================================

const getOrCreateRequestConversation = async (
  req,
  res,
  { userId, requestId, relationshipId }
) => {
  if (!requestId) {
    return res.status(400).json({ success: false, error: 'requestId is required.' });
  }

  // Load request
  const { data: request, error: requestError } = await supabaseAdmin
    .from('pop_requests')
    .select('id, user_id, title, request_type, status, visibility, details, settings')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    return res.status(500).json({ success: false, error: requestError.message });
  }
  if (!request) {
    return res.status(404).json({ success: false, error: 'Request not found.' });
  }

  const requesterId = request.user_id;
  if (!requesterId) {
    return res.status(400).json({
      success: false,
      error: 'Request owner could not be determined.',
    });
  }

  let providerId = null;
  let relationship = null;

  // If we have a relationship, derive provider from it
  if (relationshipId) {
    const { data: rel, error: relError } = await supabaseAdmin
      .from('pop_request_providers')
      .select('id, request_id, provider_id')
      .eq('id', relationshipId)
      .maybeSingle();

    if (relError) {
      return res.status(500).json({ success: false, error: relError.message });
    }
    if (!rel) {
      return res.status(404).json({
        success: false,
        error: 'Provider relationship not found.',
      });
    }
    if (String(rel.request_id) !== String(requestId)) {
      return res.status(400).json({
        success: false,
        error: 'Relationship does not belong to the given request.',
      });
    }
    relationship = rel;
    providerId = rel.provider_id;
  } else {
    // Derive provider as the non-requester participant
    providerId = String(userId) === String(requesterId) ? null : userId;
    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: 'provider_relationship_id is required for the requester.',
      });
    }
  }

  if (!providerId) {
    return res.status(400).json({
      success: false,
      error: 'Provider information is incomplete.',
    });
  }

  const uid = String(userId);
  const isRequester = uid === String(requesterId);
  const isProvider = uid === String(providerId);

  if (!isRequester && !isProvider) {
    return res.status(403).json({
      success: false,
      error: 'You are not a participant in this conversation.',
    });
  }

  // Provider can only initiate if requester opted in
  if (isProvider) {
    const acceptChat = request.settings?.accept_chat;
    const allowed =
      acceptChat === undefined || acceptChat === null
        ? true
        : typeof acceptChat === 'string'
        ? acceptChat.trim().toLowerCase() === 'true'
        : acceptChat === true;

    if (!allowed) {
      return res.status(403).json({
        success: false,
        code: 'CHAT_NOT_ALLOWED',
        error: 'The requester is not currently accepting provider chats.',
      });
    }
  }

  // Look up existing
  let existingQuery = supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('context_type', CONTEXT_REQUEST)
    .eq('context_id', requestId);

  if (relationshipId) {
    existingQuery = existingQuery.eq(
      'provider_relationship_id',
      relationshipId
    );
  } else {
    existingQuery = existingQuery
      .eq('requester_id', requesterId)
      .eq('provider_id', providerId)
      .is('provider_relationship_id', null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    // Restore inbox visibility (without touching history boundary)
    let conversation = existing;
    const deletedBy = Array.isArray(existing.deleted_by)
      ? existing.deleted_by
      : [];

    if (deletedBy.some((id) => String(id) === String(userId))) {
      const { data: restored } = await supabaseAdmin
        .from('conversations')
        .update({
          deleted_by: deletedBy.filter(
            (id) => String(id) !== String(userId)
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(CONVERSATION_SELECT)
        .single();
      if (restored) conversation = restored;
    }

    const [unreadMap, requestMap] = await Promise.all([
      buildUnreadMap([conversation.id], userId),
      buildRequestMap([conversation]),
    ]);

    return res.json({
      success: true,
      created: false,
      conversation: decorateConversation(
        conversation,
        userId,
        requestMap,
        {},
        unreadMap
      ),
    });
  }

  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabaseAdmin
    .from('conversations')
    .insert({
      context_type: CONTEXT_REQUEST,
      context_id: requestId,
      request_id: requestId,
      item_id: null,
      provider_relationship_id: relationshipId || null,
      requester_id: requesterId,
      provider_id: providerId,
      last_message: null,
      last_message_at: now,
      last_message_sender_id: null,
      is_deleted: false,
      is_closed: false,
      deleted_by: [],
      history_cleared_before: {},
      pinned_by: [],
      muted_by: [],
      archived_by: [],
      protected_by: [],
    })
    .select(CONVERSATION_SELECT)
    .single();

  // Handle race
  if (createError?.code === '23505') {
    const { data: retry } = await supabaseAdmin
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('context_type', CONTEXT_REQUEST)
      .eq('context_id', requestId)
      .eq('requester_id', requesterId)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (retry) {
      const [unreadMap, requestMap] = await Promise.all([
        buildUnreadMap([retry.id], userId),
        buildRequestMap([retry]),
      ]);
      return res.json({
        success: true,
        created: false,
        conversation: decorateConversation(
          retry,
          userId,
          requestMap,
          {},
          unreadMap
        ),
      });
    }
  }

  if (createError) {
    console.error('Create request conversation error:', createError);
    return res.status(500).json({
      success: false,
      error: createError.message,
    });
  }

  const recipientId = isRequester ? providerId : requesterId;

  await notify(recipientId, created, {
    type: 'conversation_started',
    title: 'New conversation',
    message: `A new conversation has started for "${request.title}".`,
  });

  const [unreadMap, requestMap] = await Promise.all([
    buildUnreadMap([created.id], userId),
    buildRequestMap([created]),
  ]);

  return res.status(201).json({
    success: true,
    created: true,
    conversation: decorateConversation(
      created,
      userId,
      requestMap,
      {},
      unreadMap
    ),
  });
};

// ============================================================
// DIRECT CONVERSATION  (POP semantics)
// ============================================================

const getOrCreateDirectConversationInternal = async (
  req,
  res,
  { userId, recipientId, requestId }
) => {
  if (!recipientId) {
    return res.status(400).json({
      success: false,
      error: 'recipient_id is required for direct conversations.',
    });
  }
  if (String(userId) === String(recipientId)) {
    return res.status(400).json({
      success: false,
      error: 'You cannot start a conversation with yourself.',
    });
  }

  const { data: recipient } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('id', recipientId)
    .maybeSingle();

  if (!recipient) {
    return res.status(404).json({
      success: false,
      error: 'Recipient not found.',
    });
  }

  // Optional request context
  let requesterId = null;
  if (requestId) {
    const { data: request } = await supabaseAdmin
      .from('pop_requests')
      .select('id, title, user_id, settings')
      .eq('id', requestId)
      .maybeSingle();

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found.',
      });
    }
    requesterId = request.user_id;

    const currentIsRequester = String(userId) === String(requesterId);
    const recipientIsRequester = String(recipientId) === String(requesterId);

    if (!currentIsRequester && !recipientIsRequester) {
      return res.status(403).json({
        success: false,
        error:
          'Only the request owner and their chat partner can start this request-context conversation.',
      });
    }

    if (!currentIsRequester) {
      const acceptChat = request.settings?.accept_chat;
      const allowed =
        acceptChat === undefined || acceptChat === null
          ? true
          : typeof acceptChat === 'string'
          ? acceptChat.trim().toLowerCase() === 'true'
          : acceptChat === true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          code: 'CHAT_NOT_ALLOWED',
          error:
            'The requester is not currently accepting provider chats.',
        });
      }
    }
  }

  // Participants
  let conversationRequesterId;
  let conversationProviderId;

  if (requesterId) {
    conversationRequesterId = requesterId;
    conversationProviderId =
      String(userId) === String(requesterId) ? recipientId : userId;
  } else {
    const sorted = [String(userId), String(recipientId)].sort();
    conversationRequesterId = sorted[0];
    conversationProviderId = sorted[1];
  }

  // Look up existing
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('context_type', CONTEXT_DIRECT)
    .or(
      [
        `and(requester_id.eq.${conversationRequesterId},provider_id.eq.${conversationProviderId})`,
        `and(requester_id.eq.${conversationProviderId},provider_id.eq.${conversationRequesterId})`,
      ].join(',')
    )
    .maybeSingle();

  if (existing) {
    let conversation = existing;
    const deletedBy = Array.isArray(existing.deleted_by)
      ? existing.deleted_by
      : [];

    if (deletedBy.some((id) => String(id) === String(userId))) {
      const { data: restored } = await supabaseAdmin
        .from('conversations')
        .update({
          deleted_by: deletedBy.filter(
            (id) => String(id) !== String(userId)
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(CONVERSATION_SELECT)
        .single();
      if (restored) conversation = restored;
    }

    const unreadMap = await buildUnreadMap([conversation.id], userId);
    return res.json({
      success: true,
      created: false,
      conversation: decorateConversation(
        conversation,
        userId,
        {},
        {},
        unreadMap
      ),
    });
  }

  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabaseAdmin
    .from('conversations')
    .insert({
      context_type: CONTEXT_DIRECT,
      context_id: null,
      request_id: null,
      item_id: null,
      provider_relationship_id: null,
      requester_id: conversationRequesterId,
      provider_id: conversationProviderId,
      last_message: null,
      last_message_at: now,
      last_message_sender_id: null,
      is_deleted: false,
      is_closed: false,
      deleted_by: [],
      history_cleared_before: {},
      pinned_by: [],
      muted_by: [],
      archived_by: [],
      protected_by: [],
    })
    .select(CONVERSATION_SELECT)
    .single();

  if (createError?.code === '23505') {
    const { data: retry } = await supabaseAdmin
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('context_type', CONTEXT_DIRECT)
      .or(
        [
          `and(requester_id.eq.${conversationRequesterId},provider_id.eq.${conversationProviderId})`,
          `and(requester_id.eq.${conversationProviderId},provider_id.eq.${conversationRequesterId})`,
        ].join(',')
      )
      .maybeSingle();

    if (retry) {
      const unreadMap = await buildUnreadMap([retry.id], userId);
      return res.json({
        success: true,
        created: false,
        conversation: decorateConversation(
          retry,
          userId,
          {},
          {},
          unreadMap
        ),
      });
    }
  }

  if (createError) {
    console.error('Create direct conversation error:', createError);
    return res.status(500).json({
      success: false,
      error: createError.message,
    });
  }

  await notify(recipientId, created, {
    type: 'conversation_started',
    title: 'New conversation',
    message: `${recipient.full_name || 'Someone'} started a conversation with you.`,
  });

  const unreadMap = await buildUnreadMap([created.id], userId);
  return res.status(201).json({
    success: true,
    created: true,
    conversation: decorateConversation(
      created,
      userId,
      {},
      {},
      unreadMap
    ),
  });
};

// ============================================================
// LIST MY CONVERSATIONS
// GET /conversations
// ============================================================

export const getMyConversations = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const { page, limit, from, to } = parsePagination(
      req.query.page,
      req.query.limit
    );

    const status = req.query.status;
    const filter = req.query.filter;
    const contextType = req.query.context_type;

    let query = supabaseAdmin
      .from('conversations')
      .select(CONVERSATION_SELECT, { count: 'exact' })
      .or(`requester_id.eq.${userId},provider_id.eq.${userId}`)
      .eq('is_deleted', false)
      .not('deleted_by', 'cs', `{${userId}}`);

    if (contextType && ALLOWED_CONTEXTS.has(contextType)) {
      query = query.eq('context_type', contextType);
    }

    if (status === 'open') query = query.eq('is_closed', false);
    if (status === 'closed') query = query.eq('is_closed', true);

    if (filter === 'pinned') {
      query = query.contains('pinned_by', [userId]);
    } else if (filter === 'muted') {
      query = query.contains('muted_by', [userId]);
    } else if (filter === 'archived') {
      query = query.contains('archived_by', [userId]);
    } else {
      query = query.not('archived_by', 'cs', `{${userId}}`);
    }

    const { data, error, count } = await query
      .order('last_message_at', {
        ascending: false,
        nullsFirst: false,
      })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    const rows = data || [];
    const ids = rows.map((r) => r.id);

    const [unreadMap, requestMap, itemMap] = await Promise.all([
      buildUnreadMap(ids, userId),
      buildRequestMap(rows),
      buildItemMap(rows),
    ]);

    const conversations = rows.map((row) =>
      decorateConversation(row, userId, requestMap, itemMap, unreadMap)
    );

    const totalUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );

    return res.json({
      success: true,
      conversations,
      totalUnread,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('getMyConversations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations.',
    });
  }
};

// ============================================================
// GET ONE CONVERSATION + MESSAGES
// GET /conversations/:id
// ============================================================

export const getConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const { page, limit, from, to } = parsePagination(
      req.query.page,
      req.query.limit
    );

    const beforeId = req.query.before || null;
    const afterId = req.query.after || null;
    const search =
      typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const { conversation, error: convErr } = await loadConversationById(
      conversationId
    );

    if (convErr) {
      return res.status(500).json({ success: false, error: convErr.message });
    }
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found.',
      });
    }

    // admin check (bypass)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin =
      profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isAdmin && !isParticipant(conversation, userId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation.',
      });
    }

    const [requestMap, itemMap] = await Promise.all([
      buildRequestMap([conversation]),
      buildItemMap([conversation]),
    ]);

    const decorated = decorateConversation(
      conversation,
      userId,
      requestMap,
      itemMap
    );

    // History boundary
    let historyBoundaryCreatedAt = null;
    const rawBoundary = conversation.history_cleared_before;
    const historyClearedBefore =
      rawBoundary && typeof rawBoundary === 'object' && !Array.isArray(rawBoundary)
        ? rawBoundary
        : {};
    const boundaryMessageId = historyClearedBefore[String(userId)] || null;

    if (boundaryMessageId) {
      const { data: boundaryMsg } = await supabaseAdmin
        .from('messages')
        .select('id, created_at')
        .eq('id', boundaryMessageId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (boundaryMsg?.created_at) {
        historyBoundaryCreatedAt = boundaryMsg.created_at;
      }
    }

    // Messages query
    let msgQuery = supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT, { count: 'exact' })
      .eq('conversation_id', conversationId)
      .not('deleted_for', 'cs', `{${userId}}`);

    if (historyBoundaryCreatedAt) {
      msgQuery = msgQuery.gt('created_at', historyBoundaryCreatedAt);
    }

    if (search) {
      msgQuery = msgQuery.ilike('content', `%${search}%`);
    }

    if (beforeId) {
      const { data: b } = await supabaseAdmin
        .from('messages')
        .select('id, created_at')
        .eq('id', beforeId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (b?.created_at) msgQuery = msgQuery.lt('created_at', b.created_at);
    }

    if (afterId) {
      const { data: a } = await supabaseAdmin
        .from('messages')
        .select('id, created_at')
        .eq('id', afterId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (a?.created_at) msgQuery = msgQuery.gt('created_at', a.created_at);
    }

    msgQuery = msgQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: rawMessages, error: msgErr, count } = await msgQuery;
    if (msgErr) {
      return res.status(500).json({ success: false, error: msgErr.message });
    }

    const ordered = Array.isArray(rawMessages)
      ? [...rawMessages].reverse()
      : [];

    const sanitized = ordered
      .map((m) => sanitizeMessage(m, userId))
      .filter(Boolean);

    // Resolve replies
    const replyIds = [
      ...new Set(sanitized.map((m) => m.reply_to_id).filter(Boolean)),
    ];

    let replyMap = {};
    if (replyIds.length) {
      const { data: replyMessages } = await supabaseAdmin
        .from('messages')
        .select(MESSAGE_SELECT)
        .in('id', replyIds)
        .eq('conversation_id', conversationId);

      for (const rm of replyMessages || []) {
        const s = sanitizeMessage(rm, userId);
        if (s) replyMap[String(s.id)] = s;
      }
    }

    const messages = sanitized.map((m) => ({
      ...m,
      reply_to: m.reply_to_id
        ? replyMap[String(m.reply_to_id)] || null
        : null,
    }));

    const total = Number(count) || 0;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    const deletedBy = Array.isArray(conversation.deleted_by)
      ? conversation.deleted_by
      : [];
    const isDeletedForMe = deletedBy.some(
      (id) => String(id) === String(userId)
    );

    return res.json({
      success: true,
      conversation: {
        ...decorated,
        isDeleted: false,
        is_deleted: false,
        deletedBy,
        deleted_by: deletedBy,
        historyCleared: Boolean(boundaryMessageId),
        historyClearedBefore: boundaryMessageId,
        historyBoundaryCreatedAt,
        deletedForMe: isDeletedForMe,
      },
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('getConversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load conversation.',
    });
  }
};

// ============================================================
// SEND MESSAGE
// POST /conversations/:id/messages
// ============================================================

export const sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    const {
      content,
      client_id = null,
      type = 'text',
      reply_to_id = null,
      metadata = {},
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const safeType = ALLOWED_MESSAGE_TYPES.has(type) ? type : 'text';

    if (safeType === 'text') {
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required.',
        });
      }
    } else if (safeType === 'image' || safeType === 'file') {
      if (!metadata?.url) {
        return res.status(400).json({
          success: false,
          error: 'Attachment url is required.',
        });
      }
    }

    const trimmed =
      typeof content === 'string'
        ? content.trim().slice(0, MAX_MESSAGE_LENGTH)
        : '';

    const { conversation, error } = await loadConversationById(
      conversationId
    );
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const role = getConversationRole(conversation, userId);
    if (!role) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant.',
      });
    }

    if (conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'Conversation is closed.',
      });
    }

    // Idempotency
    if (client_id) {
      const { data: dup } = await supabaseAdmin
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .eq('sender_id', userId)
        .eq('client_id', client_id)
        .maybeSingle();

      if (dup) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: sanitizeMessage(dup, userId),
        });
      }
    }

    const now = new Date().toISOString();

    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: trimmed,
        type: safeType,
        client_id,
        reply_to_id,
        metadata: metadata || {},
        is_read: false,
        is_deleted: false,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (insertError) {
      return res.status(500).json({ success: false, error: insertError.message });
    }

    const preview =
      safeType === 'image'
        ? '📷 Photo'
        : safeType === 'file'
        ? `📎 ${metadata?.name || 'File'}`
        : trimmed.slice(0, PREVIEW_LENGTH);

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message: preview,
        last_message_at: now,
        last_message_sender_id: userId,
        deleted_by: [],
        updated_at: now,
      })
      .eq('id', conversationId);

    const recipientId =
      role === 'requester' ? conversation.provider_id : conversation.requester_id;

    const senderName =
      role === 'requester'
        ? conversation.requester?.full_name
        : conversation.provider?.full_name;

    await notify(recipientId, conversation, {
      type: 'new_message',
      title: 'New message',
      preview: preview.slice(0, 100),
      senderId: userId,
      senderName,
      message: senderName
        ? `${senderName}: ${preview.slice(0, 100)}`
        : preview.slice(0, 100),
    });

    return res.status(201).json({
      success: true,
      message: sanitizeMessage(message, userId),
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message.',
    });
  }
};


// POST /conversations/:id/messages with metadata.url
export const saveFileMessage = async (req, res) => {
  const {
    conversationId,
    content,
    fileUrl,
    fileName,
    fileType,
    fileSize,
    publicId,
  } = req.body || {};

  if (!conversationId || !fileUrl) {
    return res.status(400).json({
      success: false,
      error:
        'Missing required fields: conversationId and fileUrl are required',
    });
  }

  // Rewrite the request so sendMessage can handle it
  req.params = { ...(req.params || {}), id: conversationId };
  req.body = {
    content: content || fileName || 'File',
    type:
      typeof fileType === 'string' && fileType.startsWith('image/')
        ? 'image'
        : 'file',
    metadata: {
      url: fileUrl,
      name: fileName || 'file',
      mimeType: fileType || 'application/octet-stream',
      size: fileSize || 0,
      publicId: publicId || null,
    },
  };

  return sendMessage(req, res);
};

// ============================================================
// EDIT MESSAGE (sender only)
// PATCH /conversations/:id/messages/:messageId
// ============================================================

export const editMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id: conversationId, messageId } = req.params;
    const { content } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, is_deleted')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }
    if (String(existing.sender_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own messages.',
      });
    }
    if (existing.is_deleted) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit a deleted message.',
      });
    }

    const now = new Date().toISOString();
    const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ content: trimmed, edited_at: now, updated_at: now })
      .eq('id', messageId)
      .select(MESSAGE_SELECT)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // refresh preview if it was the last message
    const { data: lastMsg } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMsg?.id === messageId) {
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message: trimmed.slice(0, PREVIEW_LENGTH),
          updated_at: now,
        })
        .eq('id', conversationId);
    }

    return res.json({
      success: true,
      message: sanitizeMessage(updated, userId),
    });
  } catch (error) {
    console.error('editMessage error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to edit message.',
    });
  }
};

// ============================================================
// DELETE MESSAGE
// DELETE /conversations/:id/messages/:messageId?scope=me|all
// ============================================================

export const deleteMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id: conversationId, messageId } = req.params;
    const requestedScope = req.query?.scope || req.body?.scope || 'me';
    const normalizedScope = String(requestedScope).toLowerCase();
    const scope =
      normalizedScope === 'all' || normalizedScope === 'everyone'
        ? 'all'
        : 'me';

    if (!conversationId || !messageId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and Message ID are required',
      });
    }

    const { conversation, error: convErr } = await loadConversationById(
      conversationId
    );
    if (convErr) {
      return res.status(500).json({ success: false, error: 'Failed to load conversation' });
    }
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant of this conversation',
      });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ success: false, error: 'Failed to load message' });
    }
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const otherUserId =
      String(conversation.requester_id) === String(userId)
        ? conversation.provider_id
        : conversation.requester_id;

    // ----------------- DELETE FOR ME -----------------
    if (scope === 'me') {
      const current = Array.isArray(existing.deleted_for)
        ? existing.deleted_for
        : [];
      const set = new Set(current.map(String));
      set.add(String(userId));

      const { error: updateError } = await supabaseAdmin
        .from('messages')
        .update({
          deleted_for: Array.from(set),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('conversation_id', conversationId);

      if (updateError) {
        return res.status(500).json({ success: false, error: 'Failed to delete message' });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('chat:message:deleted', {
          conversationId,
          conversation_id: conversationId,
          messageId,
          message_id: messageId,
          scope: 'me',
        });
      }

      return res.json({
        success: true,
        scope: 'me',
        messageId,
        message_id: messageId,
        conversationId,
        conversation_id: conversationId,
      });
    }

    // ----------------- DELETE FOR EVERYONE -----------------
    if (String(existing.sender_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the sender can delete this message for everyone',
      });
    }

    if (existing.is_deleted) {
      return res.json({
        success: true,
        scope: 'all',
        message: sanitizeMessage(existing, userId),
        messageId,
        message_id: messageId,
        conversationId,
        conversation_id: conversationId,
        deletedAt: existing.deleted_at || null,
        deleted_at: existing.deleted_at || null,
      });
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: now,
        content: '',
        metadata: {},
        updated_at: now,
      })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .select(MESSAGE_SELECT)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: 'Failed to delete message for everyone' });
    }

    const tombstone = sanitizeMessage(updated, userId);

    // refresh preview
    const { data: latestMessage } = await supabaseAdmin
      .from('messages')
      .select('id, content, is_deleted, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message: latestMessage
          ? String(latestMessage.content || '').slice(0, PREVIEW_LENGTH)
          : '',
        last_message_at: latestMessage?.created_at || null,
        last_message_sender_id: latestMessage?.sender_id || null,
        updated_at: now,
      })
      .eq('id', conversationId);

    const io = req.app.get('io');
    const payload = {
      conversationId,
      conversation_id: conversationId,
      messageId,
      message_id: messageId,
      scope: 'all',
      message: tombstone,
      deletedAt: now,
      deleted_at: now,
    };
    if (io) {
      io.to(`user:${userId}`).emit('chat:message:deleted', payload);
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('chat:message:deleted', payload);
      }
    }

    return res.json({
      success: true,
      scope: 'all',
      message: tombstone,
      messageId,
      message_id: messageId,
      conversationId,
      conversation_id: conversationId,
      deletedAt: now,
      deleted_at: now,
    });
  } catch (error) {
    console.error('deleteMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
};

// ============================================================
// DELETE CONVERSATION FOR ME
// DELETE /conversations/:id
// ============================================================

export const deleteConversationForMe = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation.',
      });
    }

    const { data: latestMessage } = await supabaseAdmin
      .from('messages')
      .select('id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const deletedBy = new Set(
      Array.isArray(conversation.deleted_by)
        ? conversation.deleted_by.map(String)
        : []
    );
    deletedBy.add(String(userId));

    let historyClearedBefore = {};
    if (
      conversation.history_cleared_before &&
      typeof conversation.history_cleared_before === 'object' &&
      !Array.isArray(conversation.history_cleared_before)
    ) {
      historyClearedBefore = { ...conversation.history_cleared_before };
    }

    if (latestMessage?.id) {
      historyClearedBefore[String(userId)] = latestMessage.id;
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        deleted_by: Array.from(deletedBy),
        history_cleared_before: historyClearedBefore,
        updated_at: now,
      })
      .eq('id', conversationId)
      .select('id, deleted_by, history_cleared_before, updated_at')
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      conversationId,
      scope: 'me',
      historyClearedBefore:
        updated?.history_cleared_before || historyClearedBefore,
      deletedBy: updated?.deleted_by || Array.from(deletedBy),
    });
  } catch (error) {
    console.error('deleteConversationForMe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete conversation.',
    });
  }
};

// ============================================================
// PIN / MUTE / ARCHIVE
// ============================================================

const toggleUserFlag = async (conversationId, userId, column, value) => {
  const { conversation, error } = await loadConversationById(conversationId);
  if (error) return { error };
  if (!conversation) return { error: { message: 'Conversation not found.' } };
  if (!isParticipant(conversation, userId)) {
    return { error: { message: 'You are not a participant.' } };
  }

  const list = new Set(conversation[column] || []);
  if (value) list.add(userId);
  else list.delete(userId);

  const { error: updateError } = await supabaseAdmin
    .from('conversations')
    .update({
      [column]: Array.from(list),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return { error: updateError };
};

export const pinConversation = async (req, res) => {
  const { error } = await toggleUserFlag(
    req.params.id,
    getUserId(req),
    'pinned_by',
    req.body?.value !== false
  );
  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true });
};

export const muteConversation = async (req, res) => {
  const { error } = await toggleUserFlag(
    req.params.id,
    getUserId(req),
    'muted_by',
    req.body?.value !== false
  );
  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true });
};

export const archiveConversation = async (req, res) => {
  const { error } = await toggleUserFlag(
    req.params.id,
    getUserId(req),
    'archived_by',
    req.body?.value !== false
  );
  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true });
};

// ============================================================
// PROTECT / UNPROTECT
// PATCH /conversations/:id/protect
// ============================================================

export const protectConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;
    const value = req.body?.value !== false;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    const protectedBy = new Set(conversation.protected_by || []);
    if (value) protectedBy.add(String(userId));
    else protectedBy.delete(String(userId));

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        protected_by: Array.from(protectedBy),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select(CONVERSATION_SELECT)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    const [unreadMap, requestMap, itemMap] = await Promise.all([
      buildUnreadMap([conversationId], userId),
      buildRequestMap([updated]),
      buildItemMap([updated]),
    ]);

    return res.json({
      success: true,
      protected: value,
      conversation: decorateConversation(
        updated,
        userId,
        requestMap,
        itemMap,
        unreadMap
      ),
    });
  } catch (error) {
    console.error('protectConversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update chat protection.',
    });
  }
};

// ============================================================
// MARK READ
// PATCH /conversations/:id/read
// ============================================================

export const markConversationRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;
    const { up_to_message_id } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('messages')
      .update({ is_read: true, read_at: now, delivered_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)
      .eq('is_deleted', false);

    if (up_to_message_id) {
      const { data: cursor } = await supabaseAdmin
        .from('messages')
        .select('created_at')
        .eq('id', up_to_message_id)
        .maybeSingle();
      if (cursor?.created_at) {
        query = query.lte('created_at', cursor.created_at);
      }
    }

    const { error: updateError } = await query;
    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({ success: true, message: 'Conversation marked as read.' });
  } catch (error) {
    console.error('markConversationRead error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark conversation as read.',
    });
  }
};

// ============================================================
// CLOSE CONVERSATION
// PATCH /conversations/:id/close
// ============================================================

export const closeConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;
    const { reason = null } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const role = getConversationRole(conversation, userId);
    if (!role) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    if (conversation.is_closed) {
      const closedBy = conversation.closed_by
        ? String(conversation.closed_by)
        : null;
      const closedByMe = closedBy === String(userId);
      return res.json({
        success: true,
        alreadyClosed: true,
        closedByMe,
        message: closedByMe
          ? 'You already closed this conversation.'
          : 'This conversation was closed by the other participant.',
        conversation,
      });
    }

    const normalizedReason =
      typeof reason === 'string' && ALLOWED_CLOSE_REASONS.has(reason)
        ? reason
        : null;

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        is_closed: true,
        closed_at: now,
        closed_by: userId,
        closed_reason: normalizedReason,
        updated_at: now,
      })
      .eq('id', conversationId)
      .eq('is_closed', false)
      .select(CONVERSATION_SELECT)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Conversation was already closed.',
      });
    }

    const otherUserId =
      String(conversation.requester_id) === String(userId)
        ? conversation.provider_id
        : conversation.requester_id;

    if (otherUserId) {
      await notify(otherUserId, conversation, {
        type: 'conversation_closed',
        title: 'Conversation closed',
        message: 'The conversation was closed.',
      });
    }

    return res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('closeConversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to close conversation.',
    });
  }
};

// ============================================================
// REOPEN CONVERSATION
// PATCH /conversations/:id/reopen
// ============================================================

export const reopenConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    const deletedBy = Array.isArray(conversation.deleted_by)
      ? conversation.deleted_by
      : [];
    if (deletedBy.some((id) => String(id) === String(userId))) {
      return res.status(403).json({
        success: false,
        error: 'This conversation has been deleted for you.',
      });
    }

    if (!conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'Conversation is already open.',
        conversation,
      });
    }

    // Reported chats can never be reopened by participants
    if (conversation.closed_reason === 'reported') {
      return res.status(403).json({
        success: false,
        error: 'This chat was reported and cannot be reopened.',
      });
    }

    const closedBy = conversation.closed_by
      ? String(conversation.closed_by)
      : null;

    if (!closedBy || closedBy !== String(userId)) {
      return res.status(403).json({
        success: false,
        code: 'REOPEN_NOT_ALLOWED',
        error: 'Only the participant who closed this conversation can reopen it.',
        closedBy: conversation.closed_by || null,
      });
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        is_closed: false,
        closed_at: null,
        closed_by: null,
        closed_reason: null,
        updated_at: now,
      })
      .eq('id', conversationId)
      .eq('is_closed', true)
      .eq('closed_by', userId)
      .select(CONVERSATION_SELECT)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Conversation could not be reopened.',
      });
    }

    const otherUserId =
      String(conversation.requester_id) === String(userId)
        ? conversation.provider_id
        : conversation.requester_id;

    if (otherUserId) {
      await notify(otherUserId, conversation, {
        type: 'conversation_reopened',
        title: 'Conversation reopened',
        message: 'The conversation was reopened.',
      });
    }

    return res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('reopenConversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reopen conversation.',
    });
  }
};

// ============================================================
// REPORT CHAT
// POST /conversations/:id/report
// ============================================================

export const reportChat = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;
    const { reason, description } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    if (conversation.is_closed) {
      return res.status(400).json({
        success: false,
        error: 'This chat is already closed',
      });
    }

    const { error: reportError } = await supabaseAdmin
      .from('chat_reports')
      .insert({
        conversation_id: conversationId,
        reported_by: userId,
        reason,
        description: description || null,
        status: 'pending',
      });

    if (reportError) {
      return res.status(500).json({ success: false, error: reportError.message });
    }

    const now = new Date().toISOString();
    const { error: closeError } = await supabaseAdmin
      .from('conversations')
      .update({
        is_closed: true,
        closed_at: now,
        closed_by: userId,
        closed_reason: 'reported',
        updated_at: now,
      })
      .eq('id', conversationId);

    if (closeError) {
      return res.status(500).json({ success: false, error: closeError.message });
    }

    return res.json({
      success: true,
      message: 'Chat reported and closed successfully',
    });
  } catch (error) {
    console.error('reportChat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to report chat',
    });
  }
};

// ============================================================
// ADMIN: CHAT REPORTS
// ============================================================

export const adminGetChatReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('chat_reports')
      .select(
        `*,
         reporter:reported_by(id, full_name, avatar_url, email),
         conversation:conversation_id(id, context_type, requester_id, provider_id, item_id, request_id)`,
        { count: 'exact' }
      );

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('adminGetChatReports error:', error);
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

export const adminUpdateChatReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to update report' });
    }
    return res.json({ success: true, report: data });
  } catch (error) {
    console.error('adminUpdateChatReportStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update report' });
  }
};

export const adminDeleteChatReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('chat_reports')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('adminDeleteChatReport error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
};

// ============================================================
// DOWNLOAD TRANSCRIPT
// GET /conversations/:id/transcript
// ============================================================

export const downloadConversationTranscript = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { conversation, error } = await loadConversationById(conversationId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ success: false, error: 'You are not a participant.' });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('messages')
      .select(`
        id, conversation_id, sender_id, content, type, metadata,
        is_deleted, deleted_for, created_at, edited_at,
        sender:profiles!messages_sender_id_fkey (id, full_name)
      `)
      .eq('conversation_id', conversationId)
      .not('deleted_for', 'cs', `{${userId}}`)
      .order('created_at', { ascending: true });

    if (msgErr) {
      return res.status(500).json({ success: false, error: msgErr.message });
    }

    const visible = (messages || [])
      .map((m) => sanitizeMessage(m, userId))
      .filter(Boolean);

    const requesterName = conversation.requester?.full_name || 'Requester';
    const providerName = conversation.provider?.full_name || 'Provider';

    const lines = [];
    lines.push('CHAT TRANSCRIPT');
    lines.push('====================');
    lines.push('');
    lines.push(`Conversation ID: ${conversation.id}`);
    lines.push(`Context: ${conversation.context_type}`);
    if (conversation.request_id) lines.push(`Request ID: ${conversation.request_id}`);
    if (conversation.item_id) lines.push(`Item ID: ${conversation.item_id}`);
    lines.push(`Participants: ${requesterName} and ${providerName}`);
    lines.push(`Created: ${conversation.created_at || ''}`);
    lines.push('');
    lines.push('--------------------');
    lines.push('');

    for (const message of visible) {
      const sender =
        message.sender?.full_name ||
        (String(message.sender_id) === String(conversation.requester_id)
          ? requesterName
          : providerName);

      const timestamp = message.created_at
        ? new Date(message.created_at).toLocaleString()
        : '';

      let content = '';
      if (message.is_deleted) content = '[Message deleted]';
      else if (message.type === 'image')
        content = `[Image]${message.metadata?.name ? ` ${message.metadata.name}` : ''}`;
      else if (message.type === 'file')
        content = `[File]${message.metadata?.name ? ` ${message.metadata.name}` : ''}`;
      else if (message.type === 'voice') content = '[Voice message]';
      else content = message.content || '';

      lines.push(`[${timestamp}] ${sender}:`);
      lines.push(content);
      if (message.edited_at) lines.push('(edited)');
      lines.push('');
    }

    lines.push('--------------------');
    lines.push('');
    lines.push(`End of transcript — ${new Date().toLocaleString()}`);

    const transcript = lines.join('\n');
    const filename = `chat-${conversationId}-transcript.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(transcript);
  } catch (error) {
    console.error('downloadConversationTranscript error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download transcript.',
    });
  }
};

// ============================================================
// LEGACY / BACK-COMPAT ALIASES
// ============================================================

// DTI-style entrypoint: /items/:itemId/conversation/:applicantId
export const getOrCreateConversationWithApplicant = async (req, res) => {
  const { itemId, applicantId } = req.params;
  req.body = {
    ...(req.body || {}),
    context_type: CONTEXT_ITEM,
    context_id: itemId,
    recipient_id: applicantId,
  };
  return getOrCreateConversation(req, res);
};

// POP-style entrypoint: /requests/:requestId/providers/:relationshipId/conversation
export const getOrCreateRequestProviderConversation = async (req, res) => {
  const { requestId, relationshipId } = req.params;
  req.body = {
    ...(req.body || {}),
    context_type: CONTEXT_REQUEST,
    context_id: requestId,
    provider_relationship_id: relationshipId,
  };
  return getOrCreateConversation(req, res);
};

// POP direct
export const getOrCreateDirectConversation = async (req, res) => {
  req.body = { ...(req.body || {}), context_type: CONTEXT_DIRECT };
  return getOrCreateConversation(req, res);
};

// Simple alias (returns flat array for legacy DTI UI)
export const getConversations = getMyConversations;

// Legacy DTI: /conversations/:id/messages (without changing envelope)
export const getMessages = async (req, res) => {
  const result = await getConversation(req, res);
  return result;
};

// Legacy mark-as-read alias
export const markMessagesAsRead = markConversationRead;

// Legacy close/reopen aliases
export const closeChat = closeConversation;
export const reopenChat = reopenConversation;

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  // Create / fetch
  getOrCreateConversation,
  getOrCreateConversationWithApplicant,
  getOrCreateRequestProviderConversation,
  getOrCreateDirectConversation,

  // Listing / fetching
  getMyConversations,
  getConversations,
  getConversation,
  getMessages,

  // Messages
  sendMessage,
		saveFileMessage,
  editMessage,
  deleteMessage,

  // Conversation lifecycle
  deleteConversationForMe,
  pinConversation,
  muteConversation,
  archiveConversation,
  protectConversation,
  markConversationRead,
  markMessagesAsRead,
  closeConversation,
  closeChat,
  reopenConversation,
  reopenChat,
  reportChat,

  // Transcript
  downloadConversationTranscript,

  // Admin
  adminGetChatReports,
  adminUpdateChatReportStatus,
  adminDeleteChatReport,
};