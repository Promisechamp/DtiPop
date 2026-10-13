import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  chatAPI,
} from '@/services/api/sharedApi';

/* ============================================================
   HELPERS
============================================================ */

const extractConversation = (response) => {
  const body = response?.data ?? response;

  return (
    body?.conversation ||
    body?.data?.conversation ||
    body?.data ||
    null
  );
};

const getConversationId = (conversation) =>
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;


/*
 * Extract a recipient's profile/user ID.
 */
const getParticipantId = (participant) => {
  if (
    participant === null ||
    participant === undefined
  ) {
    return null;
  }

  if (
    typeof participant === 'string' ||
    typeof participant === 'number'
  ) {
    return participant;
  }

  return (
    participant.user_id ??
    participant.userId ??
    participant.id ??
    participant.profile_id ??
    participant.profileId ??
    participant.requester_id ??
    participant.requesterId ??
    null
  );
};


/*
 * Check whether this conversation has been deleted
 * from the current user's side.
 */
const isDeletedForUser = (
  conversation,
  currentUserId
) => {
  if (!conversation) {
    return false;
  }

  const explicitDeleted =
    conversation.isDeleted === true ||
    conversation.is_deleted === true;

  const deletedBy =
    conversation.deletedBy ??
    conversation.deleted_by ??
    [];

  if (!Array.isArray(deletedBy)) {
    return explicitDeleted;
  }

  if (!currentUserId) {
    return explicitDeleted;
  }

  const deletedForCurrentUser =
    deletedBy.some((entry) => {
      const deletedUserId =
        typeof entry === 'object' && entry !== null
          ? (
              entry.user_id ??
              entry.userId ??
              entry.id
            )
          : entry;

      return (
        deletedUserId !== null &&
        deletedUserId !== undefined &&
        String(deletedUserId) ===
          String(currentUserId)
      );
    });

  return (
    deletedForCurrentUser ||
    (
      explicitDeleted &&
      deletedBy.length === 0
    )
  );
};


/*
 * Normalize conversation fields so the rest of the
 * chat UI can safely use camelCase.
 */
const normalizeConversation = (
  conversation
) => {
  if (!conversation) {
    return null;
  }

  return {
    ...conversation,

    id:
      conversation.id ||
      conversation.conversation_id ||
      conversation.conversationId ||
      null,

    contextType:
      conversation.contextType ??
      conversation.context_type ??
      null,

    contextId:
      conversation.contextId ??
      conversation.context_id ??
      null,

    requestId:
      conversation.requestId ??
      conversation.request_id ??
      null,

    providerRelationshipId:
      conversation.providerRelationshipId ??
      conversation.provider_relationship_id ??
      null,

    otherParticipant:
      conversation.otherParticipant ??
      conversation.other_participant ??
      null,

    isClosed:
      conversation.isClosed ??
      conversation.is_closed ??
      false,

    closedAt:
      conversation.closedAt ??
      conversation.closed_at ??
      null,

    closedBy:
      conversation.closedBy ??
      conversation.closed_by ??
      null,

    closedReason:
      conversation.closedReason ??
      conversation.closed_reason ??
      null,

    lastMessage:
      conversation.lastMessage ??
      conversation.last_message ??
      null,

    lastMessageAt:
      conversation.lastMessageAt ??
      conversation.last_message_at ??
      null,

    lastMessageSenderId:
      conversation.lastMessageSenderId ??
      conversation.last_message_sender_id ??
      null,

    updatedAt:
      conversation.updatedAt ??
      conversation.updated_at ??
      null,

    isProtected:
      conversation.isProtected ??
      conversation.is_protected ??
      false,

    protectedBy:
      conversation.protectedBy ??
      conversation.protected_by ??
      [],

    deletedBy:
      conversation.deletedBy ??
      conversation.deleted_by ??
      [],

    isDeleted:
      conversation.isDeleted ??
      conversation.is_deleted ??
      false,
  };
};


/*
 * Extract a useful API error message.
 */
const getErrorMessage = (
  err,
  fallback
) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;


/* ============================================================
   HOOK
============================================================ */

export default function useChat({
  requestId,
  relationshipId,
  conversationId: directConversationId = null,
  currentUserId = null,
  otherParticipant = null,
  enabled = true,
}) {
  const [
    conversation,
    setConversation,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  /*
   * Identifies the latest conversation initialization request.
   *
   * Older requests must not overwrite newer conversation state.
   */
  const loadSequence = useRef(0);

  /*
   * Prevents state updates after unmount.
   */
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
    };
  }, []);

  /*
   * A supplied conversation ID takes priority.
   */
  const conversationId =
    directConversationId ||
    getConversationId(conversation);


  // ==========================================================
  // LOAD CONVERSATION
  // ==========================================================

  const load = useCallback(
    async () => {
      /*
       * Invalidate any previous load before starting a new one.
       */
      const sequence =
        ++loadSequence.current;

      const isCurrentRequest = () =>
        mountedRef.current &&
        sequence === loadSequence.current;

      if (!enabled) {
        if (isCurrentRequest()) {
          setLoading(false);
        }

        return;
      }

      /*
       * --------------------------------------------------------
       * PATH 1: OPEN A CONVERSATION BY ID
       * --------------------------------------------------------
       */

      if (directConversationId) {
        setLoading(true);
        setError('');
        setConversation(null);

        try {
          const response =
            await chatAPI.getConversation(
              directConversationId
            );

          if (!isCurrentRequest()) {
            return;
          }

          const loadedConversation =
            normalizeConversation(
              extractConversation(response)
            );

          if (!loadedConversation) {
            throw new Error(
              'Conversation was not found.'
            );
          }

          setConversation(
            loadedConversation
          );
        } catch (err) {
          if (!isCurrentRequest()) {
            return;
          }

          console.error(
            'useChat direct conversation load error:',
            err
          );

          setConversation(null);

          setError(
            getErrorMessage(
              err,
              'Could not open this conversation.'
            )
          );
        } finally {
          if (isCurrentRequest()) {
            setLoading(false);
          }
        }

        return;
      }


      /*
       * --------------------------------------------------------
       * PATH 2: DIRECT CHAT WITH A USER
       *
       * Does not require a provider relationship.
       * --------------------------------------------------------
       */

      if (
        otherParticipant &&
        !relationshipId
      ) {
        const recipientId =
          getParticipantId(
            otherParticipant
          );

        if (
          recipientId === null ||
          recipientId === undefined ||
          String(recipientId).trim() === ''
        ) {
          if (isCurrentRequest()) {
            setConversation(null);
            setError(
              'Cannot start this chat because the recipient user ID is missing.'
            );
            setLoading(false);
          }

          return;
        }

        /*
         * Prevent self-chat.
         */
        if (
          currentUserId !== null &&
          currentUserId !== undefined &&
          String(recipientId) ===
            String(currentUserId)
        ) {
          if (isCurrentRequest()) {
            setConversation(null);
            setError(
              'You cannot start a conversation with yourself.'
            );
            setLoading(false);
          }

          return;
        }

        setLoading(true);
        setError('');
        setConversation(null);

        try {
          const response =
            await chatAPI
              .getOrCreateDirectConversation({
                recipient_id: recipientId,
                request_id: requestId || null,
              });

          if (!isCurrentRequest()) {
            return;
          }

          const loadedConversation =
            normalizeConversation(
              extractConversation(response)
            );

          if (!loadedConversation) {
            throw new Error(
              'The direct conversation could not be opened.'
            );
          }

          setConversation(
            loadedConversation
          );
        } catch (err) {
          if (!isCurrentRequest()) {
            return;
          }

          console.error(
            'useChat direct user conversation error:',
            err
          );

          setConversation(null);

          setError(
            getErrorMessage(
              err,
              'Could not open the conversation.'
            )
          );
        } finally {
          if (isCurrentRequest()) {
            setLoading(false);
          }
        }

        return;
      }


      /*
       * --------------------------------------------------------
       * PATH 3: EXISTING REQUEST / PROVIDER CHAT
       *
       * Preserves the existing relationship-based flow.
       * --------------------------------------------------------
       */

      if (
        !requestId ||
        !relationshipId
      ) {
        if (isCurrentRequest()) {
          setConversation(null);
          setError('');
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setError('');
      setConversation(null);

      try {
        const response =
          await chatAPI.getOrCreateRequestConversation(
            requestId,
            relationshipId
          );

        if (!isCurrentRequest()) {
          return;
        }

        const loadedConversation =
          normalizeConversation(
            extractConversation(response)
          );

        if (!loadedConversation) {
          throw new Error(
            'Conversation was not found.'
          );
        }

        setConversation(
          loadedConversation
        );
      } catch (err) {
        if (!isCurrentRequest()) {
          return;
        }

        console.error(
          'useChat request conversation load error:',
          err
        );

        setConversation(null);

        setError(
          getErrorMessage(
            err,
            'Could not open this conversation.'
          )
        );
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    },
    [
      enabled,
      directConversationId,
      requestId,
      relationshipId,
      currentUserId,
      otherParticipant,
    ]
  );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!enabled) {
      /*
       * Invalidate in-flight requests when disabled.
       */
      loadSequence.current += 1;

      setLoading(false);
      setConversation(null);
      setError('');

      return;
    }

    /*
     * A supplied conversation ID always takes priority.
     */
    if (directConversationId) {
      load();
      return;
    }

    /*
     * Direct-user chat does not require a relationship ID.
     */
    if (
      otherParticipant &&
      !relationshipId
    ) {
      load();
      return;
    }

    /*
     * Existing provider chat requires both request and
     * relationship IDs.
     */
    if (
      relationshipId &&
      requestId
    ) {
      load();
      return;
    }

    /*
     * No valid chat target was supplied.
     */
    loadSequence.current += 1;

    setConversation(null);
    setError('');
    setLoading(false);
  }, [
    enabled,
    directConversationId,
    requestId,
    relationshipId,
    otherParticipant,
    load,
  ]);


  // ==========================================================
  // CONVERSATION METADATA UPDATES
  // ==========================================================

  useEffect(() => {
    if (
      !enabled ||
      !conversationId
    ) {
      return undefined;
    }

    const handleConversationUpdate = (
      event
    ) => {
      const payload =
        event?.detail;

      if (!payload) {
        return;
      }

      const updatedConversation =
        payload?.conversation ||
        payload?.data?.conversation ||
        payload?.data ||
        null;

      const updatedConversationId =
        payload?.conversationId ||
        payload?.conversation_id ||
        getConversationId(
          updatedConversation
        );

      if (
        !updatedConversationId ||
        String(updatedConversationId) !==
          String(conversationId)
      ) {
        return;
      }

      if (!updatedConversation) {
        return;
      }

      const normalized =
        normalizeConversation(
          updatedConversation
        );

      setConversation(
        (previous) => {
          if (!previous) {
            return normalized;
          }

          return {
            ...previous,
            ...normalized,

            lastMessage:
              normalized.lastMessage ??
              previous.lastMessage,

            lastMessageAt:
              normalized.lastMessageAt ??
              previous.lastMessageAt,

            lastMessageSenderId:
              normalized.lastMessageSenderId ??
              previous.lastMessageSenderId,

            isClosed:
              normalized.isClosed ??
              previous.isClosed,

            closedAt:
              normalized.closedAt ??
              previous.closedAt,

            closedBy:
              normalized.closedBy ??
              previous.closedBy,

            closedReason:
              normalized.closedReason ??
              previous.closedReason,

            updatedAt:
              normalized.updatedAt ??
              previous.updatedAt,

            isProtected:
              typeof normalized.isProtected ===
              'boolean'
                ? normalized.isProtected
                : previous.isProtected,

            protectedBy:
              normalized.protectedBy ??
              previous.protectedBy,

            isDeleted:
              normalized.isDeleted ??
              previous.isDeleted,

            deletedBy:
              normalized.deletedBy ??
              previous.deletedBy,
          };
        }
      );
    };

    window.addEventListener(
      'chat:conversation:update',
      handleConversationUpdate
    );

    return () => {
      window.removeEventListener(
        'chat:conversation:update',
        handleConversationUpdate
      );
    };
  }, [
    enabled,
    conversationId,
  ]);


  // ==========================================================
  // MARK READ
  // ==========================================================

  const markRead = useCallback(
    async (
      upToMessageId = null
    ) => {
      if (
        !conversation?.id ||
        isDeletedForUser(
          conversation,
          currentUserId
        )
      ) {
        return;
      }

      try {
        await chatAPI.markRead(
          conversation.id,
          upToMessageId
        );
      } catch (err) {
        console.error(
          'markRead failed:',
          err
        );
      }
    },
    [
      conversation,
      currentUserId,
    ]
  );


  // ==========================================================
  // CLOSE
  // ==========================================================

  const close = useCallback(
    async (
      reason = null
    ) => {
      if (
        !conversation?.id ||
        isDeletedForUser(
          conversation,
          currentUserId
        )
      ) {
        return null;
      }

      const response =
        await chatAPI.closeConversation(
          conversation.id,
          reason
        );

      const updated =
        normalizeConversation(
          extractConversation(response)
        );

      if (updated) {
        setConversation(updated);
      }

      return updated;
    },
    [
      conversation,
      currentUserId,
    ]
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh = useCallback(
    () => {
      if (!enabled) {
        return Promise.resolve();
      }

      return load();
    },
    [
      enabled,
      load,
    ]
  );


  // ==========================================================
  // CLOSED STATE
  // ==========================================================

  const isClosed =
    !!conversation &&
    (
      conversation.isClosed === true ||
      conversation.status === 'closed' ||
      conversation.status === 'cancelled'
    );


  // ==========================================================
  // DELETED STATE
  // ==========================================================

  const isDeleted =
    isDeletedForUser(
      conversation,
      currentUserId
    );


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    conversation,
    conversationId,

    isClosed,
    isDeleted,

    loading,
    error,

    markRead,
    close,
    refresh,
  };
}