import { supabaseAdmin } from '../../db/index.js';
import {
  createPOPNotification,
} from '../../shared/controllers/notificationController.js';

// ============================================================
// CONSTANTS
// ============================================================

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
  'reported',
]);
const CONTEXT_TYPE = 'request'; // this controller is request-chat only

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const parsePagination = (page, limit) => {
  const p = Math.max(Number.parseInt(page, 10) || 1, 1);
  const l = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    100
  );

  return {
    page: p,
    limit: l,
    from: (p - 1) * l,
    to: p * l - 1,
  };
};

/**
 * POP notification helper.
 *
 * This controller is POP-specific, so the shared
 * createPOPNotification wrapper automatically supplies:
 *
 * source = "pop"
 *
 * No source value is passed here.
 */
const notify = async (userId, payload = {}) => {
  if (!userId) return;

  try {
    await createPOPNotification(
      userId,
      payload.type,
      payload.title || 'Notification',
      payload.message || '',
      {
        conversation_id: payload.conversationId || null,
        request_id: payload.requestId || null,
        provider_relationship_id:
          payload.providerRelationshipId || null,
        preview: payload.preview || null,
      }
    );
  } catch (error) {
    console.error('Notification error:', error);
  }
};

// ============================================================
// SCHEMA SELECTS
// ============================================================

const CONVERSATION_SELECT = `
  id,
  request_id,
  provider_relationship_id,
  item_id,
  context_type,
  context_id,

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

  requester:requester_id (
    id,
    full_name,
    avatar_url
  ),

  provider:provider_id (
    id,
    full_name,
    avatar_url
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
// ROLE
// ============================================================

const getConversationRole = (conversation, userId) => {
  if (!conversation || !userId) return null;

  if (
    String(conversation.requester_id) ===
    String(userId)
  ) {
    return 'requester';
  }

  if (
    String(conversation.provider_id) ===
    String(userId)
  ) {
    return 'provider';
  }

  return null;
};

// ============================================================
// REQUEST CHAT SETTING
// ============================================================

const getAcceptChat = (request) =>
  request?.details?.accept_chat === true;

// ============================================================
// LOADERS
// ============================================================

const loadConversationById = async (conversationId) => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .eq('context_type', CONTEXT_TYPE)
    .maybeSingle();

  return {
    conversation: data,
    error,
  };
};

const loadProviderRelationship = async (relationshipId) => {
  const { data, error } = await supabaseAdmin
    .from('pop_request_providers')
    .select(`
      id,
      request_id,
      provider_id,
      service_id,
      scope,
      status,
      selected_at,
      accepted_at,
      started_at,
      completed_at,
      declined_at,
      cancelled_at,
      completion_notes,
      created_at,
      updated_at,

      request:pop_requests (
        id,
        user_id,
        title,
        description,
        request_type,
        status,
        visibility,
        provider_access,
        details
      )
    `)
    .eq('id', relationshipId)
    .maybeSingle();

  return {
    relationship: data,
    error,
  };
};

const buildRequestMap = async (rows) => {
  const ids = [
    ...new Set(
      (rows || [])
        .map((r) => r.request_id)
        .filter(Boolean)
    ),
  ];

  if (!ids.length) return {};

  const { data } = await supabaseAdmin
    .from('pop_requests')
    .select(`
      id,
      title,
      description,
      request_type,
      status,
      visibility,
      provider_access,
      details,
      user_id
    `)
    .in('id', ids);

  const map = {};

  for (const row of data || []) {
    map[row.id] = row;
  }

  return map;
};






const buildUnreadMap = async (
  conversationIds,
  userId
) => {
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
    map[row.conversation_id] =
      (map[row.conversation_id] || 0) + 1;
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
  unreadMap = {}
) => {
  const role = getConversationRole(
    conversation,
    userId
  );

  const other =
    role === 'requester'
      ? conversation.provider
      : conversation.requester;

  const pinnedBy =
    Array.isArray(conversation.pinned_by)
      ? conversation.pinned_by
      : [];

  const mutedBy =
    Array.isArray(conversation.muted_by)
      ? conversation.muted_by
      : [];

  const archivedBy =
    Array.isArray(conversation.archived_by)
      ? conversation.archived_by
      : [];

  const protectedBy =
    Array.isArray(conversation.protected_by)
      ? conversation.protected_by
      : [];

  return {
    id: conversation.id,

    contextType:
      conversation.context_type,

    contextId:
      conversation.context_id,

    requestId:
      conversation.request_id,

    providerRelationshipId:
      conversation.provider_relationship_id,

    requester:
      conversation.requester,

    provider:
      conversation.provider,

    otherParticipant:
      other,

    role,

    lastMessage:
      conversation.last_message,

    lastMessageAt:
      conversation.last_message_at,

    lastMessageSenderId:
      conversation.last_message_sender_id ||
      null,

    unreadCount:
      unreadMap?.[conversation.id] || 0,

    isClosed:
      conversation.is_closed,

    closedAt:
      conversation.closed_at,

    closedBy:
      conversation.closed_by,

    closedReason:
      conversation.closed_reason,

    isPinned:
      pinnedBy.some(
        (id) =>
          String(id) ===
          String(userId)
      ),

    isMuted:
      mutedBy.some(
        (id) =>
          String(id) ===
          String(userId)
      ),

    isArchived:
      archivedBy.some(
        (id) =>
          String(id) ===
          String(userId)
      ),

    isProtected:
      protectedBy.some(
        (id) =>
          String(id) ===
          String(userId)
      ),

    protectedBy,

    createdAt:
      conversation.created_at,

    updatedAt:
      conversation.updated_at,

    request:
      conversation.request_id
        ? requestMap?.[
            conversation.request_id
          ] || null
        : null,
  };
};



const sanitizeMessage = (
  message,
  viewerId
) => {
  if (!message) return null;

  const deletedFor =
    message.deleted_for || [];

  if (
    viewerId &&
    deletedFor.includes(viewerId)
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
// GET OR CREATE CONVERSATION
// POST /requests/:requestId/providers/:relationshipId/conversation
// ============================================================

export const getOrCreateRequestProviderConversation =
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const {
        requestId,
        relationshipId,
      } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (
        !requestId ||
        !relationshipId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Request and relationship are required.',
        });
      }

      const {
        relationship,
        error: relationshipError,
      } =
        await loadProviderRelationship(
          relationshipId
        );

      if (relationshipError) {
        return res.status(500).json({
          success: false,
          message:
            relationshipError.message,
        });
      }

      if (!relationship) {
        return res.status(404).json({
          success: false,
          message:
            'Provider relationship not found.',
        });
      }

      if (
        String(relationship.request_id) !==
        String(requestId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Relationship does not belong to the given request.',
        });
      }

      const requesterId =
        relationship.request?.user_id ||
        null;

      const providerId =
        relationship.provider_id || null;

      if (
        !requesterId ||
        !providerId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Request or provider information is incomplete.',
        });
      }

      const isRequester =
        String(userId) ===
        String(requesterId);

      const isProvider =
        String(userId) ===
        String(providerId);

      if (
        !isRequester &&
        !isProvider
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant in this conversation.',
        });
      }

      // Provider can only initiate if the requester opted in
      if (
        isProvider &&
        !getAcceptChat(
          relationship.request
        )
      ) {
        return res.status(403).json({
          success: false,
          code: 'CHAT_NOT_ALLOWED',
          message:
            'The requester is not currently accepting provider chats.',
        });
      }

      // ============================================================
      // EXISTING CONVERSATION
      // ============================================================

      const {
        data: existing,
        error: existingError,
      } = await supabaseAdmin
        .from('conversations')
        .select(
          CONVERSATION_SELECT
        )
        .eq(
          'context_type',
          CONTEXT_TYPE
        )
        .eq(
          'context_id',
          requestId
        )
        .eq(
          'provider_relationship_id',
          relationshipId
        )
        .maybeSingle();

      if (existingError) {
        return res.status(500).json({
          success: false,
          message:
            existingError.message,
        });
      }

      if (existing) {
        /*
         * IMPORTANT:
         *
         * The conversation ID is intentionally reused.
         *
         * If this user previously chose:
         *
         *   Delete conversation for me
         *
         * they will be present inside `deleted_by`.
         *
         * Starting the conversation again should make the
         * conversation visible in their conversation list,
         * but MUST NOT erase their history boundary.
         *
         * Example:
         *
         * deleted_by:
         *   [userA]
         *
         * history_cleared_before:
         *   {
         *     "userA": "old-message-uuid"
         *   }
         *
         * After starting again:
         *
         * deleted_by:
         *   []
         *
         * history_cleared_before:
         *   {
         *     "userA": "old-message-uuid"
         *   }
         *
         * Therefore:
         * - same conversation.id
         * - userA can see the conversation again
         * - userA still cannot see messages before the boundary
         * - provider/userB still sees the old history
         */

        const existingDeletedBy =
          Array.isArray(existing.deleted_by)
            ? existing.deleted_by
            : [];

        const cleanedDeletedBy =
          existingDeletedBy.filter(
            (id) =>
              String(id) !==
              String(userId)
          );

        let existingHistoryClearedBefore =
          {};

        if (
          existing.history_cleared_before &&
          typeof existing.history_cleared_before ===
            'object' &&
          !Array.isArray(
            existing.history_cleared_before
          )
        ) {
          existingHistoryClearedBefore = {
            ...existing.history_cleared_before,
          };
        }

        /*
         * Only update the database when this user is actually
         * marked as deleted.
         *
         * Do NOT touch history_cleared_before.
         */
        const wasDeletedForMe =
          existingDeletedBy.some(
            (id) =>
              String(id) ===
              String(userId)
          );

        let conversation =
          existing;

        if (wasDeletedForMe) {
          const {
            data: restored,
            error: restoreError,
          } = await supabaseAdmin
            .from('conversations')
            .update({
              deleted_by:
                cleanedDeletedBy,

              /*
               * Explicitly preserve the existing history
               * boundaries.
               */
              history_cleared_before:
                existingHistoryClearedBefore,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              existing.id
            )
            .select(
              CONVERSATION_SELECT
            )
            .single();

          if (restoreError) {
            console.error(
              'restore conversation for me error:',
              restoreError
            );

            return res.status(500).json({
              success: false,
              message:
                restoreError.message,
            });
          }

          conversation =
            restored;
        }

        const [
          unreadMap,
          requestMap,
        ] = await Promise.all([
          buildUnreadMap(
            [conversation.id],
            userId
          ),
          buildRequestMap([
            conversation,
          ]),
        ]);

        return res.json({
          success: true,
          created: false,
          conversation:
            decorateConversation(
              conversation,
              userId,
              requestMap,
              unreadMap
            ),
        });
      }

      // ============================================================
      // CREATE NEW CONVERSATION
      // ============================================================

      const now =
        new Date().toISOString();

      const {
        data: created,
        error: createError,
      } = await supabaseAdmin
        .from('conversations')
        .insert({
          context_type:
            CONTEXT_TYPE,

          context_id:
            requestId,

          request_id:
            requestId,

          provider_relationship_id:
            relationshipId,

          requester_id:
            requesterId,

          provider_id:
            providerId,

          item_id: null,

          last_message: null,

          last_message_at:
            now,

          is_deleted: false,

          is_closed: false,

          /*
           * New conversation starts with no history
           * boundary for either participant.
           */
          history_cleared_before: {},

          deleted_by: [],
        })
        .select(
          CONVERSATION_SELECT
        )
        .single();

      // Race condition:
      // another request created it first
      if (
        createError &&
        createError.code ===
          '23505'
      ) {
        const {
          data: retry,
          error: retryError,
        } = await supabaseAdmin
          .from('conversations')
          .select(
            CONVERSATION_SELECT
          )
          .eq(
            'context_type',
            CONTEXT_TYPE
          )
          .eq(
            'context_id',
            requestId
          )
          .eq(
            'provider_relationship_id',
            relationshipId
          )
          .single();

        if (retryError) {
          return res.status(500).json({
            success: false,
            message:
              retryError.message,
          });
        }

        if (!retry) {
          return res.status(500).json({
            success: false,
            message:
              'Conversation already exists but could not be loaded.',
          });
        }

        /*
         * The race-condition winner may also be a conversation
         * that this user previously deleted for themselves.
         *
         * Apply the same restoration logic here.
         */

        const retryDeletedBy =
          Array.isArray(
            retry.deleted_by
          )
            ? retry.deleted_by
            : [];

        const retryCleanedDeletedBy =
          retryDeletedBy.filter(
            (id) =>
              String(id) !==
              String(userId)
          );

        const retryWasDeletedForMe =
          retryDeletedBy.some(
            (id) =>
              String(id) ===
              String(userId)
          );

        let retryConversation =
          retry;

        if (retryWasDeletedForMe) {
          let retryHistoryClearedBefore =
            {};

          if (
            retry.history_cleared_before &&
            typeof retry.history_cleared_before ===
              'object' &&
            !Array.isArray(
              retry.history_cleared_before
            )
          ) {
            retryHistoryClearedBefore = {
              ...retry.history_cleared_before,
            };
          }

          const {
            data: restoredRetry,
            error: restoreRetryError,
          } = await supabaseAdmin
            .from('conversations')
            .update({
              deleted_by:
                retryCleanedDeletedBy,

              /*
               * Preserve every user's history boundary.
               */
              history_cleared_before:
                retryHistoryClearedBefore,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              retry.id
            )
            .select(
              CONVERSATION_SELECT
            )
            .single();

          if (restoreRetryError) {
            console.error(
              'restore retry conversation error:',
              restoreRetryError
            );

            return res.status(500).json({
              success: false,
              message:
                restoreRetryError.message,
            });
          }

          retryConversation =
            restoredRetry;
        }

        const [
          unreadMap,
          requestMap,
        ] = await Promise.all([
          buildUnreadMap(
            [retryConversation.id],
            userId
          ),
          buildRequestMap([
            retryConversation,
          ]),
        ]);

        return res.json({
          success: true,
          created: false,
          conversation:
            decorateConversation(
              retryConversation,
              userId,
              requestMap,
              unreadMap
            ),
        });
      }

      if (createError) {
        console.error(
          'createConversation error:',
          createError
        );

        return res.status(500).json({
          success: false,
          message:
            createError.message,
        });
      }

      // ============================================================
      // NOTIFY THE OTHER SIDE
      // ============================================================

      const recipientId =
        isRequester
          ? providerId
          : requesterId;

      const starterName = isRequester
        ? relationship.request
            ?.requester?.full_name
        : null;

      await notify(
        recipientId,
        {
          type:
            'conversation_started',

          conversationId:
            created.id,

          requestId,

          providerRelationshipId:
            relationshipId,

          title:
            'New conversation',

          message: starterName
            ? `${starterName} started a conversation about "${relationship.request?.title}".`
            : `A new conversation has started for "${relationship.request?.title}".`,
        }
      );

      const [
        unreadMap,
        requestMap,
      ] = await Promise.all([
        buildUnreadMap(
          [created.id],
          userId
        ),
        buildRequestMap([
          created,
        ]),
      ]);

      return res.status(201).json({
        success: true,
        created: true,
        conversation:
          decorateConversation(
            created,
            userId,
            requestMap,
            unreadMap
          ),
      });
    } catch (error) {
      console.error(
        'getOrCreateRequestProviderConversation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to create conversation.',
        error: error.message,
      });
    }
  };
		
		
		
		
		

// ============================================================
// LIST MY CONVERSATIONS
// GET /conversations?filter=pinned|muted|archived&status=open|closed
// ============================================================

export const getMyConversations =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      const {
        page,
        limit,
        from,
        to,
      } = parsePagination(
        req.query.page,
        req.query.limit
      );

      const status =
        req.query.status;

      const includeItemChats =
        req.query.includeItemChats ===
        'true';

      const filter =
        req.query.filter;

      let query = supabaseAdmin
        .from('conversations')
        .select(
          CONVERSATION_SELECT,
          { count: 'exact' }
        )
        .or(
          `requester_id.eq.${userId},provider_id.eq.${userId}`
        )
        .eq(
          'is_deleted',
          false
        )
        .not(
          'deleted_by',
          'cs',
          `{${userId}}`
        );

      // By default this controller is request-chat only
      if (!includeItemChats) {
        query = query.eq(
          'context_type',
          CONTEXT_TYPE
        );
      }

      if (status === 'open') {
        query = query.eq(
          'is_closed',
          false
        );
      }

      if (status === 'closed') {
        query = query.eq(
          'is_closed',
          true
        );
      }

      if (filter === 'pinned') {
        query = query.contains(
          'pinned_by',
          [userId]
        );
      } else if (
        filter === 'muted'
      ) {
        query = query.contains(
          'muted_by',
          [userId]
        );
      } else if (
        filter === 'archived'
      ) {
        query = query.contains(
          'archived_by',
          [userId]
        );
      } else {
        // default: hide archived
        query = query.not(
          'archived_by',
          'cs',
          `{${userId}}`
        );
      }

      const {
        data,
        error,
        count,
      } = await query
        .order(
          'last_message_at',
          {
            ascending: false,
            nullsFirst: false,
          }
        )
        .range(from, to);

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      const rows = data || [];

      const ids = rows.map(
        (row) => row.id
      );

      const [
        unreadMap,
        requestMap,
      ] = await Promise.all([
        buildUnreadMap(
          ids,
          userId
        ),
        buildRequestMap(rows),
      ]);

      const conversations =
        rows.map((row) =>
          decorateConversation(
            row,
            userId,
            requestMap,
            unreadMap
          )
        );

      const totalUnread =
        conversations.reduce(
          (sum, c) =>
            sum +
            (c.unreadCount || 0),
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
          totalPages:
            Math.ceil(
              (count || 0) /
                limit
            ),
        },
      });
    } catch (error) {
      console.error(
        'getMyConversations error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch conversations.',
        error: error.message,
      });
    }
  };

// ============================================================
// GET ONE CONVERSATION + MESSAGES
// GET /conversations/:id?before=<id>&after=<id>&q=<search>
// ============================================================

// ============================================================
// GET CONVERSATION
// GET /conversations/:id
//
// HISTORY-CLEAR SEMANTICS:
//
// A user can clear their own conversation history without
// deleting the conversation or deleting messages.
//
// conversations.history_cleared_before stores:
//
// {
//   "<user-id>": "<message-uuid>"
// }
//
// The stored UUID identifies the last message belonging to
// the user's old history.
//
// Because UUIDs are NOT chronological, we resolve that UUID
// to created_at and then return only messages:
//
//     created_at > boundaryCreatedAt
//
// The other participant has no boundary stored for them, so
// they continue seeing the complete conversation.
//
// IMPORTANT:
//
// deleted_by is ONLY used for conversation-list visibility.
//
// It must NOT prevent the user from opening the conversation
// directly again.
// ============================================================
export const getConversation =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is required.',
        });
      }

      // ========================================================
      // PAGINATION
      // ========================================================

      const {
        page,
        limit,
        from,
        to,
      } = parsePagination(
        req.query.page,
        req.query.limit
      );

      const beforeId =
        req.query.before || null;

      const afterId =
        req.query.after || null;

      const search =
        typeof req.query.q === 'string'
          ? req.query.q.trim()
          : '';

      // ========================================================
      // LOAD CONVERSATION
      // ========================================================

      const {
        conversation,
        error: conversationError,
      } =
        await loadConversationById(
          conversationId
        );

      if (conversationError) {
        console.error(
          'getConversation conversation error:',
          conversationError
        );

        return res.status(500).json({
          success: false,
          message:
            conversationError.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      // ========================================================
      // VERIFY PARTICIPANT
      // ========================================================

      const role =
        getConversationRole(
          conversation,
          userId
        );

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant in this conversation.',
        });
      }

      // ========================================================
      // DECORATE CONVERSATION
      // ========================================================

      const decorated =
        decorateConversation(
          conversation,
          userId
        );

      // ========================================================
      // HISTORY CLEAR BOUNDARY
      // ========================================================

      let historyBoundaryCreatedAt =
        null;

      const rawHistoryClearedBefore =
        conversation?.history_cleared_before;

      const historyClearedBefore =
        rawHistoryClearedBefore &&
        typeof rawHistoryClearedBefore ===
          'object' &&
        !Array.isArray(
          rawHistoryClearedBefore
        )
          ? rawHistoryClearedBefore
          : {};

      const boundaryMessageId =
        historyClearedBefore?.[
          String(userId)
        ] || null;

      if (boundaryMessageId) {
        const {
          data: boundaryMessage,
          error:
            boundaryMessageError,
        } = await supabaseAdmin
          .from('messages')
          .select(
            'id, created_at'
          )
          .eq(
            'id',
            boundaryMessageId
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .maybeSingle();

        if (boundaryMessageError) {
          console.error(
            'getConversation history boundary error:',
            boundaryMessageError
          );

          return res.status(500).json({
            success: false,
            message:
              boundaryMessageError.message,
          });
        }

        if (
          boundaryMessage?.created_at
        ) {
          historyBoundaryCreatedAt =
            boundaryMessage.created_at;
        }
      }

      // ========================================================
      // MESSAGE QUERY
      // ========================================================

      let msgQuery =
        supabaseAdmin
          .from('messages')
          .select(
            MESSAGE_SELECT,
            {
              count: 'exact',
            }
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .not(
            'deleted_for',
            'cs',
            `{${userId}}`
          );

      // ========================================================
      // APPLY HISTORY BOUNDARY
      // ========================================================

      if (
        historyBoundaryCreatedAt
      ) {
        msgQuery =
          msgQuery.gt(
            'created_at',
            historyBoundaryCreatedAt
          );
      }

      // ========================================================
      // SEARCH
      // ========================================================

      if (search) {
        msgQuery =
          msgQuery.ilike(
            'content',
            `%${search}%`
          );
      }

      // ========================================================
      // BEFORE CURSOR
      // ========================================================

      if (beforeId) {
        const {
          data: beforeMessage,
          error:
            beforeMessageError,
        } =
          await supabaseAdmin
            .from('messages')
            .select(
              'id, created_at'
            )
            .eq(
              'id',
              beforeId
            )
            .eq(
              'conversation_id',
              conversationId
            )
            .maybeSingle();

        if (beforeMessageError) {
          console.error(
            'getConversation before cursor error:',
            beforeMessageError
          );

          return res.status(500).json({
            success: false,
            message:
              beforeMessageError.message,
          });
        }

        if (
          beforeMessage?.created_at
        ) {
          msgQuery =
            msgQuery.lt(
              'created_at',
              beforeMessage.created_at
            );
        }
      }

      // ========================================================
      // AFTER CURSOR
      // ========================================================

      if (afterId) {
        const {
          data: afterMessage,
          error:
            afterMessageError,
        } =
          await supabaseAdmin
            .from('messages')
            .select(
              'id, created_at'
            )
            .eq(
              'id',
              afterId
            )
            .eq(
              'conversation_id',
              conversationId
            )
            .maybeSingle();

        if (afterMessageError) {
          console.error(
            'getConversation after cursor error:',
            afterMessageError
          );

          return res.status(500).json({
            success: false,
            message:
              afterMessageError.message,
          });
        }

        if (
          afterMessage?.created_at
        ) {
          msgQuery =
            msgQuery.gt(
              'created_at',
              afterMessage.created_at
            );
        }
      }

      // ========================================================
      // ORDER + PAGINATION
      // ========================================================

      msgQuery =
        msgQuery
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .range(
            from,
            to
          );

      const {
        data: rawMessages,
        error: messagesError,
        count,
      } = await msgQuery;

      if (messagesError) {
        console.error(
          'getConversation messages error:',
          messagesError
        );

        return res.status(500).json({
          success: false,
          message:
            messagesError.message,
        });
      }

      // ========================================================
      // NORMALIZE MESSAGE ORDER
      // ========================================================

      const orderedMessages =
        Array.isArray(
          rawMessages
        )
          ? [...rawMessages].reverse()
          : [];

      // ========================================================
      // SANITIZE MESSAGES
      // ========================================================

      const sanitizedMessages =
        orderedMessages
          .map(
            (message) =>
              sanitizeMessage(
                message,
                userId
              )
          )
          .filter(Boolean);

      // ========================================================
      // LOAD REPLY / QUOTED MESSAGES
      //
      // Each message stores the original message UUID in:
      //
      //     reply_to_id
      //
      // We resolve those IDs and attach the original message
      // as:
      //
      //     reply_to
      //
      // This is what MessageBubble can use to render the
      // quoted original message.
      // ========================================================

      const replyIds = [
        ...new Set(
          sanitizedMessages
            .map(
              (message) =>
                message.reply_to_id
            )
            .filter(Boolean)
        ),
      ];

      let replyMap = {};

      if (replyIds.length) {
        const {
          data: replyMessages,
          error:
            replyMessagesError,
        } = await supabaseAdmin
          .from('messages')
          .select(
            MESSAGE_SELECT
          )
          .in(
            'id',
            replyIds
          )
          .eq(
            'conversation_id',
            conversationId
          );

        if (replyMessagesError) {
          console.error(
            'getConversation reply messages error:',
            replyMessagesError
          );

          return res.status(500).json({
            success: false,
            message:
              replyMessagesError.message,
          });
        }

        for (
          const replyMessage
          of replyMessages || []
        ) {
          const sanitizedReply =
            sanitizeMessage(
              replyMessage,
              userId
            );

          if (!sanitizedReply) {
            continue;
          }

          replyMap[
            String(
              sanitizedReply.id
            )
          ] = sanitizedReply;
        }
      }

      // ========================================================
      // ATTACH ORIGINAL MESSAGE TO EACH REPLY
      // ========================================================

      const messages =
        sanitizedMessages.map(
          (message) => ({
            ...message,

            reply_to:
              message.reply_to_id
                ? replyMap[
                    String(
                      message.reply_to_id
                    )
                  ] || null
                : null,
          })
        );

      // ========================================================
      // PAGINATION
      // ========================================================

      const total =
        Number(count) || 0;

      const totalPages =
        limit > 0
          ? Math.ceil(
              total / limit
            )
          : 0;

      // ========================================================
      // DELETE-FOR-ME STATE
      // ========================================================

      const deletedBy =
        Array.isArray(
          conversation.deleted_by
        )
          ? conversation.deleted_by
          : [];

      const isDeletedForMe =
        deletedBy.some(
          (id) =>
            String(id) ===
            String(userId)
        );

      // ========================================================
      // RESPONSE
      // ========================================================

      return res.json({
        success: true,

        conversation: {
          ...decorated,

          // Preserve frontend compatibility.
          isDeleted: false,
          is_deleted: false,

          deletedBy,
          deleted_by: deletedBy,

          historyCleared:
            Boolean(
              boundaryMessageId
            ),

          historyClearedBefore:
            boundaryMessageId,

          historyBoundaryCreatedAt:
            historyBoundaryCreatedAt,

          deletedForMe:
            isDeletedForMe,
        },

        messages,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasMore:
            page <
            totalPages,
        },

        // Top-level compatibility fields.
        isDeleted: false,
        is_deleted: false,

        historyCleared:
          Boolean(
            boundaryMessageId
          ),

        historyClearedBefore:
          boundaryMessageId,

        historyBoundaryCreatedAt:
          historyBoundaryCreatedAt,
      });
    } catch (error) {
      console.error(
        'getConversation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to load conversation.',
        error:
          error.message,
      });
    }
  };


		
		
		
		
// ============================================================
// SEND MESSAGE
// POST /conversations/:id/messages
// Body: { content, client_id?, type?, reply_to_id?, metadata? }
// ============================================================

export const sendMessage =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

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
          message:
            'Authentication required.',
        });
      }

      const safeType =
        ALLOWED_MESSAGE_TYPES.has(
          type
        )
          ? type
          : 'text';

      if (
        safeType === 'text'
      ) {
        if (
          !content ||
          typeof content !==
            'string' ||
          !content.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Message content is required.',
          });
        }
      } else if (
        safeType === 'image' ||
        safeType === 'file'
      ) {
        if (!metadata?.url) {
          return res.status(400).json({
            success: false,
            message:
              'Attachment url is required.',
          });
        }
      }

      const trimmed =
        typeof content ===
        'string'
          ? content
              .trim()
              .slice(
                0,
                MAX_MESSAGE_LENGTH
              )
          : '';

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      const role =
        getConversationRole(
          conversation,
          userId
        );

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      if (
        conversation.is_closed
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is closed.',
        });
      }

      // Idempotency by client_id
      if (client_id) {
        const {
          data: dup,
        } = await supabaseAdmin
          .from('messages')
          .select(
            MESSAGE_SELECT
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .eq(
            'sender_id',
            userId
          )
          .eq(
            'client_id',
            client_id
          )
          .maybeSingle();

        if (dup) {
          return res.status(200).json({
            success: true,
            duplicate: true,
            message:
              sanitizeMessage(
                dup,
                userId
              ),
          });
        }
      }

      const now =
        new Date().toISOString();

      const {
        data: message,
        error: insertError,
      } =
        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id:
              conversationId,

            sender_id:
              userId,

            content: trimmed,

            type: safeType,

            client_id,

            reply_to_id,

            metadata:
              metadata || {},

            is_read: false,

            is_deleted: false,
          })
          .select(
            MESSAGE_SELECT
          )
          .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          message:
            insertError.message,
        });
      }

      const preview =
        safeType === 'image'
          ? '📷 Photo'
          : safeType === 'file'
          ? `📎 ${
              metadata?.name ||
              'File'
            }`
          : trimmed.slice(
              0,
              PREVIEW_LENGTH
            );

      // Update conversation + resurrect if it was
      // "deleted for me" by either party
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message:
            preview,

          last_message_at:
            now,

          last_message_sender_id:
            userId,

          deleted_by: [],

          updated_at: now,
        })
        .eq(
          'id',
          conversationId
        );

      // Notify the other side
      const recipientId =
        role === 'requester'
          ? conversation.provider_id
          : conversation.requester_id;

      const senderName =
        role === 'requester'
          ? conversation.requester
              ?.full_name
          : conversation.provider
              ?.full_name;

      await notify(
        recipientId,
        {
          type: 'new_message',

          conversationId,

          requestId:
            conversation.request_id,

          providerRelationshipId:
            conversation.provider_relationship_id,

          preview:
            preview.slice(
              0,
              100
            ),

          message: senderName
            ? `${senderName}: ${preview.slice(0, 100)}`
            : preview.slice(
                0,
                100
              ),
        }
      );

      return res.status(201).json({
        success: true,
        message:
          sanitizeMessage(
            message,
            userId
          ),
      });
    } catch (error) {
      console.error(
        'sendMessage error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to send message.',
        error: error.message,
      });
    }
  };
		
		
		
		
		
		

// ============================================================
// EDIT MESSAGE (sender only)
// PATCH /conversations/:id/messages/:messageId
// ============================================================

export const editMessage =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const {
        id: conversationId,
        messageId,
      } = req.params;

      const {
        content,
      } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (
        !content ||
        typeof content !==
          'string' ||
        !content.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Message content is required.',
        });
      }

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      if (
        !getConversationRole(
          conversation,
          userId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      const {
        data: existing,
      } =
        await supabaseAdmin
          .from('messages')
          .select(
            'id, sender_id, is_deleted'
          )
          .eq(
            'id',
            messageId
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .maybeSingle();

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            'Message not found.',
        });
      }

      if (
        String(
          existing.sender_id
        ) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You can only edit your own messages.',
        });
      }

      if (existing.is_deleted) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot edit a deleted message.',
        });
      }

      const now =
        new Date().toISOString();

      const trimmed =
        content
          .trim()
          .slice(
            0,
            MAX_MESSAGE_LENGTH
          );

      const {
        data: updated,
        error: updateError,
      } =
        await supabaseAdmin
          .from('messages')
          .update({
            content: trimmed,
            edited_at: now,
            updated_at: now,
          })
          .eq(
            'id',
            messageId
          )
          .select(
            MESSAGE_SELECT
          )
          .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      // Refresh conversation preview if this was the last message
      const {
        data: lastMsg,
      } =
        await supabaseAdmin
          .from('messages')
          .select('id')
          .eq(
            'conversation_id',
            conversationId
          )
          .eq(
            'is_deleted',
            false
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (
        lastMsg?.id === messageId
      ) {
        await supabaseAdmin
          .from('conversations')
          .update({
            last_message:
              trimmed.slice(
                0,
                PREVIEW_LENGTH
              ),
            updated_at: now,
          })
          .eq(
            'id',
            conversationId
          );
      }

      return res.json({
        success: true,
        message:
          sanitizeMessage(
            updated,
            userId
          ),
      });
    } catch (error) {
      console.error(
        'editMessage error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to edit message.',
        error: error.message,
      });
    }
  };

// ============================================================
// DELETE MESSAGE
// DELETE /conversations/:id/messages/:messageId?scope=me|all|everyone
// ============================================================

export const deleteMessage = async (req, res) => {
  try {
    // ==========================================================
    // AUTH
    // ==========================================================

    const userId = await getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // ==========================================================
    // PARAMS
    // ==========================================================
    //
    // Route:
    //
    // /conversations/:id/messages/:messageId
    //
    // Therefore:
    //
    // req.params.id = conversation ID
    // req.params.messageId = message ID
    // ==========================================================

    const {
      id: conversationId,
      messageId,
    } = req.params;

    const requestedScope =
      req.query?.scope ||
      req.body?.scope ||
      'me';

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required',
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
      });
    }

    // ==========================================================
    // NORMALIZE SCOPE
    // ==========================================================

    const normalizedScope =
      String(requestedScope).toLowerCase();

    const scope =
      normalizedScope === 'all' ||
      normalizedScope === 'everyone'
        ? 'all'
        : 'me';

    // ==========================================================
    // LOAD CONVERSATION
    // ==========================================================
    //
    // IMPORTANT:
    //
    // loadConversationById() returns:
    //
    // {
    //   conversation: {...},
    //   error: null
    // }
    //
    // So we must unwrap .conversation.
    // ==========================================================

    const conversationResult =
      await loadConversationById(
        conversationId
      );

    const conversation =
      conversationResult?.conversation;

    const conversationError =
      conversationResult?.error;

    if (conversationError) {
      console.error(
        '❌ Delete conversation lookup error:',
        conversationError
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to load conversation',
      });
    }

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // ==========================================================
    // VERIFY PARTICIPANT
    // ==========================================================

    const isParticipant =
      String(
        conversation.requester_id
      ) === String(userId) ||
      String(
        conversation.provider_id
      ) === String(userId);

    if (!isParticipant) {
      console.warn(
        '⚠️ Unauthorized delete attempt:',
        {
          userId,
          conversationId,
          requesterId:
            conversation.requester_id,
          providerId:
            conversation.provider_id,
        }
      );

      return res.status(403).json({
        success: false,
        error:
          'You are not a participant of this conversation',
      });
    }

    // ==========================================================
    // LOAD MESSAGE
    // ==========================================================

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', messageId)
      .eq(
        'conversation_id',
        conversationId
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        '❌ Delete message lookup error:',
        existingError
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to load message',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // ==========================================================
    // DETERMINE OTHER PARTICIPANT
    // ==========================================================

    const otherUserId =
      String(
        conversation.requester_id
      ) === String(userId)
        ? conversation.provider_id
        : conversation.requester_id;

    // ==========================================================
    // DELETE FOR ME
    // ==========================================================

    if (scope === 'me') {
      const currentDeletedFor =
        Array.isArray(
          existing.deleted_for
        )
          ? existing.deleted_for
          : [];

      const deletedFor =
        new Set(
          currentDeletedFor.map(
            (id) => String(id)
          )
        );

      deletedFor.add(
        String(userId)
      );

      const {
        error: updateError,
      } = await supabaseAdmin
        .from('messages')
        .update({
          deleted_for:
            Array.from(deletedFor),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          messageId
        )
        .eq(
          'conversation_id',
          conversationId
        );

      if (updateError) {
        console.error(
          '❌ Delete-for-me update error:',
          updateError
        );

        return res.status(500).json({
          success: false,
          error:
            'Failed to delete message',
        });
      }

      // ========================================================
      // REALTIME — DELETE FOR ME
      // ========================================================
      //
      // Only this user's devices receive this event.
      //
      // The other participant keeps the message.
      // ========================================================

      const io =
        req.app.get('io');

      if (io) {
        const deletePayload = {
          conversationId,
          conversation_id:
            conversationId,

          messageId,
          message_id:
            messageId,

          scope: 'me',
        };

        io.to(
          `user:${userId}`
        ).emit(
          'chat:message:deleted',
          deletePayload
        );

        console.log(
          `🗑️ Delete-for-me realtime event emitted for message ${messageId}`
        );
      } else {
        console.warn(
          '⚠️ Socket.IO instance not available on req.app'
        );
      }

      // ========================================================
      // RESPONSE
      // ========================================================

      return res.json({
        success: true,

        scope: 'me',

        messageId,
        message_id:
          messageId,

        conversationId,
        conversation_id:
          conversationId,
      });
    }

    // ==========================================================
    // DELETE FOR EVERYONE
    // ==========================================================
    //
    // Only the original sender can do this.
    // ==========================================================

    if (
      String(
        existing.sender_id
      ) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Only the sender can delete this message for everyone',
      });
    }

    // ==========================================================
    // ALREADY DELETED
    // ==========================================================

    if (existing.is_deleted) {
      const alreadyDeleted =
        sanitizeMessage(
          existing,
          userId
        );

      return res.json({
        success: true,

        scope: 'all',

        message:
          alreadyDeleted,

        messageId,
        message_id:
          messageId,

        conversationId,
        conversation_id:
          conversationId,

        deletedAt:
          existing.deleted_at ||
          null,

        deleted_at:
          existing.deleted_at ||
          null,
      });
    }

    // ==========================================================
    // CREATE TOMBSTONE
    // ==========================================================

    const now =
      new Date().toISOString();

    const {
      data: updated,
      error: updateError,
    } = await supabaseAdmin
      .from('messages')
      .update({
        is_deleted: true,

        deleted_at: now,

        content: '',

        metadata: {},

        updated_at: now,
      })
      .eq(
        'id',
        messageId
      )
      .eq(
        'conversation_id',
        conversationId
      )
      .select(
        MESSAGE_SELECT
      )
      .single();

    if (updateError) {
      console.error(
        '❌ Delete-for-everyone update error:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error:
          'Failed to delete message for everyone',
      });
    }

    // ==========================================================
    // SANITIZE TOMBSTONE
    // ==========================================================

    const tombstone =
      sanitizeMessage(
        updated,
        userId
      );

    // ==========================================================
    // UPDATE CONVERSATION PREVIEW
    // ==========================================================

    try {
      const {
        data: latestMessage,
        error:
          latestMessageError,
      } = await supabaseAdmin
        .from('messages')
        .select(`
          id,
          content,
          is_deleted,
          sender_id,
          created_at
        `)
        .eq(
          'conversation_id',
          conversationId
        )
        .eq(
          'is_deleted',
          false
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (latestMessageError) {
        console.error(
          '⚠️ Failed to find latest conversation message:',
          latestMessageError
        );
      } else {
        const preview =
          latestMessage
            ? String(
                latestMessage.content ||
                  ''
              ).slice(
                0,
                PREVIEW_LENGTH
              )
            : '';

        await supabaseAdmin
          .from('conversations')
          .update({
            last_message:
              preview,

            last_message_at:
              latestMessage?.created_at ||
              null,

            last_message_sender_id:
              latestMessage?.sender_id ||
              null,

            updated_at:
              now,
          })
          .eq(
            'id',
            conversationId
          );
      }
    } catch (
      conversationPreviewError
    ) {
      console.error(
        '⚠️ Conversation preview update error:',
        conversationPreviewError
      );
    }

    // ==========================================================
    // REALTIME DELETE EVENT
    // ==========================================================

    const io =
      req.app.get('io');

    const deletePayload = {
      conversationId,
      conversation_id:
        conversationId,

      messageId,
      message_id:
        messageId,

      scope: 'all',

      message:
        tombstone,

      deletedAt: now,
      deleted_at: now,
    };

    if (io) {
      // --------------------------------------------------------
      // SENDER
      // --------------------------------------------------------

      io.to(
        `user:${userId}`
      ).emit(
        'chat:message:deleted',
        deletePayload
      );

      // --------------------------------------------------------
      // OTHER PARTICIPANT
      // --------------------------------------------------------

      if (otherUserId) {
        io.to(
          `user:${otherUserId}`
        ).emit(
          'chat:message:deleted',
          deletePayload
        );
      }

      console.log(
        `🗑️ Delete-for-everyone realtime event emitted for message ${messageId}`
      );
    } else {
      console.warn(
        '⚠️ Socket.IO instance not available on req.app'
      );
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.json({
      success: true,

      scope: 'all',

      message:
        tombstone,

      messageId,
      message_id:
        messageId,

      conversationId,
      conversation_id:
        conversationId,

      deletedAt: now,
      deleted_at: now,
    });
  } catch (error) {
    console.error(
      '❌ Delete message error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Failed to delete message',
    });
  }
};
		
		
		
		
		
// ============================================================
// DELETE CONVERSATION FOR ME
// DELETE /conversations/:id
// ============================================================

// ============================================================
// DELETE CONVERSATION FOR ME
// DELETE /conversations/:id
//
// IMPORTANT:
// This does NOT delete the conversation or messages.
//
// It does two things for the current user:
//
// 1. Records the latest message ID in
//    conversations.history_cleared_before.
//
// 2. Adds the user to conversations.deleted_by so the
//    conversation disappears from their conversation list.
//
// The actual messages remain available to the other participant.
//
// Later, when the user starts chatting again, the same
// conversation.id is reused and new messages become their
// new visible history.
// ============================================================

export const deleteConversationForMe =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is required.',
        });
      }

      // ----------------------------------------------------------
      // Load conversation
      // ----------------------------------------------------------

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      // ----------------------------------------------------------
      // Verify participant
      // ----------------------------------------------------------

      if (
        !getConversationRole(
          conversation,
          userId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant in this conversation.',
        });
      }

      // ----------------------------------------------------------
      // Find the latest message
      //
      // DO NOT compare UUIDs.
      //
      // UUIDs are not chronological, so we order by
      // created_at and store the ID of the latest message.
      // ----------------------------------------------------------

      const {
        data: latestMessage,
        error: latestMessageError,
      } =
        await supabaseAdmin
          .from('messages')
          .select(
            'id, created_at'
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (latestMessageError) {
        return res.status(500).json({
          success: false,
          message:
            latestMessageError.message,
        });
      }

      // ----------------------------------------------------------
      // Preserve existing deleted_by values
      // ----------------------------------------------------------

      const deletedBy =
        new Set(
          Array.isArray(
            conversation.deleted_by
          )
            ? conversation.deleted_by.map(
                String
              )
            : []
        );

      deletedBy.add(
        String(userId)
      );

      // ----------------------------------------------------------
      // Preserve existing history boundaries
      // ----------------------------------------------------------

      let historyClearedBefore = {};

      if (
        conversation.history_cleared_before &&
        typeof conversation.history_cleared_before ===
          'object' &&
        !Array.isArray(
          conversation.history_cleared_before
        )
      ) {
        historyClearedBefore = {
          ...conversation.history_cleared_before,
        };
      }

      // ----------------------------------------------------------
      // Store the latest message ID for THIS user.
      //
      // Example:
      //
      // {
      //   "user-a-uuid": "message-123-uuid"
      // }
      //
      // The other participant's boundary is untouched.
      // ----------------------------------------------------------

      if (latestMessage?.id) {
        historyClearedBefore[
          String(userId)
        ] = latestMessage.id;
      }

      const now =
        new Date().toISOString();

      // ----------------------------------------------------------
      // Update conversation
      // ----------------------------------------------------------

      const {
        data: updated,
        error: updateError,
      } =
        await supabaseAdmin
          .from('conversations')
          .update({
            deleted_by:
              Array.from(
                deletedBy
              ),

            history_cleared_before:
              historyClearedBefore,

            updated_at:
              now,
          })
          .eq(
            'id',
            conversationId
          )
          .select(`
            id,
            deleted_by,
            history_cleared_before,
            updated_at
          `)
          .single();

      if (updateError) {
        console.error(
          'deleteConversationForMe update error:',
          updateError
        );

        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      // ----------------------------------------------------------
      // IMPORTANT:
      //
      // We intentionally DO NOT:
      //
      // - delete messages
      // - set conversations.is_deleted = true
      // - change conversation.id
      // - clear history for the other participant
      // - modify the other participant's boundary
      //
      // The conversation remains the same conversation.
      // ----------------------------------------------------------

      return res.json({
        success: true,

        conversationId,

        scope: 'me',

        historyClearedBefore:
          updated
            ?.history_cleared_before ||
          historyClearedBefore,

        deletedBy:
          updated?.deleted_by ||
          Array.from(
            deletedBy
          ),
      });
    } catch (error) {
      console.error(
        'deleteConversationForMe error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete conversation.',
        error: error.message,
      });
    }
  };










// ============================================================
// PIN / MUTE / ARCHIVE
// ============================================================

const toggleUserFlag = async (
  conversationId,
  userId,
  column,
  value
) => {
  const {
    conversation,
    error,
  } =
    await loadConversationById(
      conversationId
    );

  if (error) return { error };

  if (!conversation) {
    return {
      error: {
        message:
          'Conversation not found.',
      },
    };
  }

  if (
    !getConversationRole(
      conversation,
      userId
    )
  ) {
    return {
      error: {
        message:
          'You are not a participant.',
      },
    };
  }

  const list = new Set(
    conversation[column] || []
  );

  if (value) {
    list.add(userId);
  } else {
    list.delete(userId);
  }

  const {
    error: updateError,
  } =
    await supabaseAdmin
      .from('conversations')
      .update({
        [column]:
          Array.from(list),
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        conversationId
      );

  return {
    error: updateError,
  };
};

export const pinConversation =
  async (req, res) => {
    const { error } =
      await toggleUserFlag(
        req.params.id,
        getUserId(req),
        'pinned_by',
        req.body?.value !== false
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
    });
  };

export const muteConversation =
  async (req, res) => {
    const { error } =
      await toggleUserFlag(
        req.params.id,
        getUserId(req),
        'muted_by',
        req.body?.value !== false
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
    });
  };

export const archiveConversation =
  async (req, res) => {
    const { error } =
      await toggleUserFlag(
        req.params.id,
        getUserId(req),
        'archived_by',
        req.body?.value !== false
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
    });
  };
		
		
		
		// ============================================================
// PROTECT / UNPROTECT CONVERSATION
// PATCH /conversations/:id/protect
// Body: { value: true|false }
// ============================================================

export const protectConversation =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      const value =
        req.body?.value !== false;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is required.',
        });
      }

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message:
            error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      if (
        !getConversationRole(
          conversation,
          userId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      const protectedBy =
        new Set(
          Array.isArray(
            conversation.protected_by
          )
            ? conversation.protected_by
            : []
        );

      if (value) {
        protectedBy.add(
          String(userId)
        );
      } else {
        protectedBy.delete(
          String(userId)
        );
      }

      const {
        data: updated,
        error: updateError,
      } =
        await supabaseAdmin
          .from('conversations')
          .update({
            protected_by:
              Array.from(
                protectedBy
              ),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            conversationId
          )
          .select(
            CONVERSATION_SELECT
          )
          .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      const [
        unreadMap,
        requestMap,
      ] = await Promise.all([
        buildUnreadMap(
          [conversationId],
          userId
        ),
        buildRequestMap([
          updated,
        ]),
      ]);

      return res.json({
        success: true,

        protected: value,

        conversation:
          decorateConversation(
            updated,
            userId,
            requestMap,
            unreadMap
          ),
      });
    } catch (error) {
      console.error(
        'protectConversation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to update chat protection.',
        error: error.message,
      });
    }
  };

// ============================================================
// MARK READ
// PATCH /conversations/:id/read
// Body (optional): { up_to_message_id }
// ============================================================

export const markConversationRead =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      const {
        up_to_message_id,
      } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      if (
        !getConversationRole(
          conversation,
          userId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      const now =
        new Date().toISOString();

      let query =
        supabaseAdmin
          .from('messages')
          .update({
            is_read: true,
            read_at: now,
            delivered_at: now,
          })
          .eq(
            'conversation_id',
            conversationId
          )
          .neq(
            'sender_id',
            userId
          )
          .eq(
            'is_read',
            false
          )
          .eq(
            'is_deleted',
            false
          );

      if (up_to_message_id) {
        const {
          data: cursor,
        } =
          await supabaseAdmin
            .from('messages')
            .select(
              'created_at'
            )
            .eq(
              'id',
              up_to_message_id
            )
            .maybeSingle();

        if (
          cursor?.created_at
        ) {
          query = query.lte(
            'created_at',
            cursor.created_at
          );
        }
      }

      const {
        error: updateError,
      } = await query;

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      return res.json({
        success: true,
        message:
          'Conversation marked as read.',
      });
    } catch (error) {
      console.error(
        'markConversationRead error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to mark conversation as read.',
        error: error.message,
      });
    }
  };

// ============================================================
// CLOSE CONVERSATION
// PATCH /conversations/:id/close
// ============================================================

export const closeConversation =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      const {
        reason = null,
      } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is required.',
        });
      }

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      const role =
        getConversationRole(
          conversation,
          userId
        );

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      /*
       * Already closed.
       *
       * Do not allow the other participant to alter
       * the existing close state.
       */
      if (conversation.is_closed) {
        const closedBy =
          conversation.closed_by
            ? String(
                conversation.closed_by
              )
            : null;

        const closedByMe =
          closedBy ===
          String(userId);

        return res.json({
          success: true,
          alreadyClosed: true,
          closedByMe,
          message:
            closedByMe
              ? 'You already closed this conversation.'
              : 'This conversation was closed by the other participant.',
          conversation,
        });
      }

      const normalizedReason =
        typeof reason === 'string' &&
        ALLOWED_CLOSE_REASONS.has(
          reason
        )
          ? reason
          : null;

      const now =
        new Date().toISOString();

      const {
        data: updated,
        error: updateError,
      } =
        await supabaseAdmin
          .from('conversations')
          .update({
            is_closed: true,

            closed_at: now,

            /*
             * This is important.
             * It identifies who has permission
             * to reopen this conversation.
             */
            closed_by: userId,

            closed_reason:
              normalizedReason,

            updated_at: now,
          })
          .eq(
            'id',
            conversationId
          )
          .eq(
            'is_closed',
            false
          )
          .select(
            CONVERSATION_SELECT
          )
          .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      if (!updated) {
        return res.status(409).json({
          success: false,
          message:
            'Conversation was already closed.',
        });
      }

      const otherUserId =
        String(
          conversation.requester_id
        ) === String(userId)
          ? conversation.provider_id
          : conversation.requester_id;

      if (otherUserId) {
        await notify(
          otherUserId,
          {
            type:
              'conversation_closed',

            conversationId,

            requestId:
              conversation.request_id,

            title:
              'Conversation closed',

            message:
              'The conversation was closed.',
          }
        );
      }

      return res.json({
        success: true,
        conversation:
          updated,
      });
    } catch (error) {
      console.error(
        'closeConversation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to close conversation.',
        error: error.message,
      });
    }
  };


export const reopenConversation =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is required.',
        });
      }

      const {
        conversation,
        error,
      } =
        await loadConversationById(
          conversationId
        );

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      const role =
        getConversationRole(
          conversation,
          userId
        );

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      /*
       * ==========================================================
       * DELETE-FOR-ME CHECK
       * ==========================================================
       *
       * A user who deleted the conversation for themselves
       * must start the chat again through the normal
       * get-or-create endpoint.
       */
      const deletedBy =
        Array.isArray(
          conversation.deleted_by
        )
          ? conversation.deleted_by
          : [];

      const isDeletedForUser =
        deletedBy.some(
          (id) =>
            String(id) ===
            String(userId)
        );

      if (isDeletedForUser) {
        return res.status(403).json({
          success: false,
          message:
            'This conversation has been deleted for you.',
        });
      }

      /*
       * ==========================================================
       * MUST ACTUALLY BE CLOSED
       * ==========================================================
       */
      if (!conversation.is_closed) {
        return res.status(400).json({
          success: false,
          message:
            'Conversation is already open.',
          conversation,
        });
      }

      /*
       * ==========================================================
       * ONLY THE USER WHO CLOSED IT CAN REOPEN IT
       * ==========================================================
       *
       * closeConversation() stores:
       *
       *     closed_by: userId
       *
       * Therefore B cannot reopen a conversation that A closed.
       */
      const closedBy =
        conversation.closed_by
          ? String(
              conversation.closed_by
            )
          : null;

      if (
        !closedBy ||
        closedBy !==
          String(userId)
      ) {
        return res.status(403).json({
          success: false,
          code:
            'REOPEN_NOT_ALLOWED',
          message:
            'Only the participant who closed this conversation can reopen it.',
          closedBy:
            conversation.closed_by ||
            null,
        });
      }

      /*
       * ==========================================================
       * REOPEN
       * ==========================================================
       */
      const now =
        new Date().toISOString();

      const {
        data: updated,
        error: updateError,
      } =
        await supabaseAdmin
          .from('conversations')
          .update({
            is_closed: false,

            closed_at: null,

            closed_by: null,

            closed_reason: null,

            updated_at: now,
          })
          .eq(
            'id',
            conversationId
          )
          .eq(
            'is_closed',
            true
          )
          .eq(
            'closed_by',
            userId
          )
          .select(
            CONVERSATION_SELECT
          )
          .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          message:
            updateError.message,
        });
      }

      if (!updated) {
        return res.status(409).json({
          success: false,
          message:
            'Conversation could not be reopened.',
        });
      }

      /*
       * Notify the other participant.
       */
      const otherUserId =
        String(
          conversation.requester_id
        ) === String(userId)
          ? conversation.provider_id
          : conversation.requester_id;

      if (otherUserId) {
        await notify(
          otherUserId,
          {
            type:
              'conversation_reopened',

            conversationId,

            requestId:
              conversation.request_id,

            title:
              'Conversation reopened',

            message:
              'The conversation was reopened.',
          }
        );
      }

      return res.json({
        success: true,
        conversation:
          updated,
      });
    } catch (error) {
      console.error(
        'reopenConversation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to reopen conversation.',
        error: error.message,
      });
    }
  };




		
		// ============================================================
// DOWNLOAD TRANSCRIPT
// GET /conversations/:id/transcript
// ============================================================

export const downloadConversationTranscript =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const conversationId =
        req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      const {
        conversation,
        error:
          conversationError,
      } =
        await loadConversationById(
          conversationId
        );

      if (conversationError) {
        return res.status(500).json({
          success: false,
          message:
            conversationError.message,
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message:
            'Conversation not found.',
        });
      }

      const role =
        getConversationRole(
          conversation,
          userId
        );

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            'You are not a participant.',
        });
      }

      const {
        data: messages,
        error: messagesError,
      } =
        await supabaseAdmin
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            type,
            metadata,
            is_deleted,
            deleted_for,
            created_at,
            edited_at,

            sender:profiles!messages_sender_id_fkey (
              id,
              full_name
            )
          `)
          .eq(
            'conversation_id',
            conversationId
          )
          .not(
            'deleted_for',
            'cs',
            `{${userId}}`
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

      if (messagesError) {
        return res.status(500).json({
          success: false,
          message:
            messagesError.message,
        });
      }

      const visibleMessages =
        (messages || [])
          .map((message) =>
            sanitizeMessage(
              message,
              userId
            )
          )
          .filter(Boolean);

      const requesterName =
        conversation.requester
          ?.full_name ||
        'Requester';

      const providerName =
        conversation.provider
          ?.full_name ||
        'Provider';

      const participantNames = [
        requesterName,
        providerName,
      ];

      const lines = [];

      lines.push(
        'POP CHAT TRANSCRIPT'
      );

      lines.push(
        '===================='
      );

      lines.push('');

      lines.push(
        `Conversation ID: ${conversation.id}`
      );

      if (conversation.request_id) {
        lines.push(
          `Request ID: ${conversation.request_id}`
        );
      }

      lines.push(
        `Participants: ${participantNames.join(
          ' and '
        )}`
      );

      lines.push(
        `Created: ${conversation.created_at || ''}`
      );

      lines.push('');

      lines.push(
        '--------------------'
      );

      lines.push('');

      for (const message of visibleMessages) {
        const sender =
          message.sender
            ?.full_name ||
          (
            String(
              message.sender_id
            ) ===
            String(
              conversation.requester_id
            )
              ? requesterName
              : providerName
          );

        const timestamp =
          message.created_at
            ? new Date(
                message.created_at
              ).toLocaleString()
            : '';

        let content = '';

        if (message.is_deleted) {
          content =
            '[Message deleted]';
        } else if (
          message.type ===
          'image'
        ) {
          content =
            `[Image]${
              message.metadata
                ?.name
                ? ` ${message.metadata.name}`
                : ''
            }`;
        } else if (
          message.type ===
          'file'
        ) {
          content =
            `[File]${
              message.metadata
                ?.name
                ? ` ${message.metadata.name}`
                : ''
            }`;
        } else if (
          message.type ===
          'voice'
        ) {
          content =
            '[Voice message]';
        } else {
          content =
            message.content ||
            '';
        }

        lines.push(
          `[${timestamp}] ${sender}:`
        );

        lines.push(
          content
        );

        if (message.edited_at) {
          lines.push(
            '(edited)'
          );
        }

        lines.push('');
      }

      lines.push(
        '--------------------'
      );

      lines.push('');

      lines.push(
        `End of transcript — ${new Date().toLocaleString()}`
      );

      const transcript =
        lines.join('\n');

      const filename =
        `pop-chat-${conversationId}-transcript.txt`;

      res.setHeader(
        'Content-Type',
        'text/plain; charset=utf-8'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      return res.status(200).send(
        transcript
      );
    } catch (error) {
      console.error(
        'downloadConversationTranscript error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to download transcript.',
        error: error.message,
      });
    }
  };