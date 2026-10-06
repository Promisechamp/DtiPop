import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { requestsChatAPI } from '@/services/api/popApi';

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
 * Check whether this conversation has been deleted
 * from the current user's side.
 *
 * Supports both backend snake_case and frontend camelCase.
 */
const isDeletedForUser = (
  conversation,
  currentUserId
) => {
  if (!conversation) {
    return false;
  }

  /*
   * Some backend responses may explicitly provide
   * isDeleted / is_deleted.
   */
  const explicitDeleted =
    conversation.isDeleted === true ||
    conversation.is_deleted === true;

  /*
   * Read the deleted_by array.
   */
  const deletedBy =
    conversation.deletedBy ??
    conversation.deleted_by ??
    [];

  /*
   * If deleted_by is an array, the conversation
   * is deleted for this user only when their ID
   * exists inside that array.
   */
  if (Array.isArray(deletedBy)) {
    if (!currentUserId) {
      return explicitDeleted;
    }

    const deletedForCurrentUser =
      deletedBy.some(
        (id) =>
          String(id) ===
          String(currentUserId)
      );

    return (
      deletedForCurrentUser ||
      (
        explicitDeleted &&
        deletedBy.length === 0
      )
    );
  }

  /*
   * If the backend explicitly says deleted and
   * did not provide an array, respect that value.
   */
  return explicitDeleted;
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
      conversation.conversationId,

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


/* ============================================================
   HOOK
============================================================ */

export default function useChat({
  requestId,
  relationshipId,
  conversationId: directConversationId = null,
  currentUserId = null,
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
   * Direct conversationId has priority.
   *
   * NotificationBell -> AppShell -> ChatModal
   * can use this to open a conversation directly.
   *
   * Existing requestId + relationshipId behavior
   * remains unchanged.
   */
  const conversationId =
    directConversationId ||
    getConversationId(conversation);


  // ==========================================================
  // LOAD
  // ==========================================================

  const load = useCallback(
    async () => {

      /*
       * --------------------------------------------------------
       * DIRECT CONVERSATION
       * --------------------------------------------------------
       */

      if (directConversationId) {
        setLoading(true);
        setError('');
        setConversation(null);

        try {
          const response =
            await requestsChatAPI.getConversation(
              directConversationId
            );

          const loadedConversation =
            normalizeConversation(
              extractConversation(
                response
              )
            );

          if (!loadedConversation) {
            throw new Error(
              'Conversation was not found.'
            );
          }

          /*
           * Do not allow an old notification or
           * direct conversation ID to reopen a chat
           * that this user deleted.
           */
          if (
            isDeletedForUser(
              loadedConversation,
              currentUserId
            )
          ) {
            setConversation(
              loadedConversation
            );

            return;
          }

          setConversation(
            loadedConversation
          );
        } catch (err) {
          console.error(
            'useChat direct conversation load error:',
            err
          );

          setConversation(null);

          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              'Could not open this conversation.'
          );
        } finally {
          setLoading(false);
        }

        return;
      }


      /*
       * --------------------------------------------------------
       * EXISTING REQUEST / PROVIDER FLOW
       * --------------------------------------------------------
       */

      if (
        !requestId ||
        !relationshipId
      ) {
        setConversation(null);
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      setConversation(null);

      try {
        const response =
          await requestsChatAPI.getOrCreateConversation(
            requestId,
            relationshipId
          );

        const loadedConversation =
          normalizeConversation(
            extractConversation(
              response
            )
          );

        if (!loadedConversation) {
          throw new Error(
            'Conversation was not found.'
          );
        }

        /*
         * Normally getOrCreate should return the
         * active conversation. Still preserve the
         * deleted state if the backend sends it.
         */
        setConversation(
          loadedConversation
        );
      } catch (err) {
        console.error(
          'useChat request conversation load error:',
          err
        );

        setConversation(null);

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Could not open this conversation.'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      directConversationId,
      requestId,
      relationshipId,
      currentUserId,
    ]
  );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      !directConversationId &&
      (
        !requestId ||
        !relationshipId
      )
    ) {
      setConversation(null);
      setError('');
      return;
    }

    load();
  }, [
    enabled,
    directConversationId,
    requestId,
    relationshipId,
    load,
  ]);


  // ==========================================================
  // SOCKET.IO: CONVERSATION METADATA
  //
  // This replaces the old Supabase realtime listener.
  // ==========================================================

  useEffect(() => {
    if (
      !enabled ||
      !conversationId
    ) {
      return undefined;
    }

    const handleConversationUpdate =
      (event) => {
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
          getConversationId(
            updatedConversation
          );

        if (
          !updatedConversationId ||
          String(
            updatedConversationId
          ) !== String(conversationId)
        ) {
          return;
        }

        if (
          !updatedConversation
        ) {
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

              /*
               * Keep compatibility with components
               * that use camelCase conversation fields.
               */

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

              /*
               * Protect chat.
               */
              isProtected:
                typeof normalized.isProtected ===
                'boolean'
                  ? normalized.isProtected
                  : previous.isProtected,

              protectedBy:
                normalized.protectedBy ??
                previous.protectedBy,

              /*
               * Deleted state.
               */
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

  const markRead =
    useCallback(
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
          await requestsChatAPI.markRead(
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
        conversation?.id,
        conversation,
        currentUserId,
      ]
    );


  // ==========================================================
  // CLOSE
  // ==========================================================

  const close =
    useCallback(
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
          await requestsChatAPI.closeConversation(
            conversation.id,
            reason
          );

        const updated =
          normalizeConversation(
            extractConversation(
              response
            )
          );

        setConversation(
          updated
        );

        return updated;
      },
      [
        conversation?.id,
        conversation,
        currentUserId,
      ]
    );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh =
    useCallback(
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
      conversation.isClosed ||
      conversation.is_closed ||
      conversation.status ===
        'closed' ||
      conversation.status ===
        'cancelled'
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

