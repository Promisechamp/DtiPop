import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatAPI } from '@/services/api/sharedApi';
import { supabase } from '@/services/api/supabase';

const PAGE_SIZE = 30;

const extract = (response) => {
  const body = response?.data ?? response;
  return {
    conversations: body?.conversations || [],
    totalUnread: body?.totalUnread || 0,
    pagination: body?.pagination || null,
  };
};

export default function useConversations({
  currentUserId,
  filter = null,
  contextType = null,
  includeItemChats = false,
  enabled = true,
} = {}) {
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const channelRef = useRef(null);

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------
  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');

    try {
      const res = await chatAPI.getConversations({
        page: 1,
        limit: PAGE_SIZE,
        filter: filter || undefined,
        context_type: contextType || undefined,
        includeItemChats: includeItemChats ? 'true' : undefined,
      });

      const { conversations: rows, totalUnread: tu, pagination: p } = extract(res);

      setConversations(rows);
      setTotalUnread(tu);
      setPagination(p);
    } catch (err) {
      console.error('[useConversations] load failed:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Could not load conversations.'
      );
    } finally {
      setLoading(false);
    }
  }, [filter, contextType, includeItemChats, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // ----------------------------------------------------------
  // REALTIME
  // ----------------------------------------------------------
  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const channel = supabase
      .channel(`user-conversations:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          if (!msg?.conversation_id) return;

          setConversations((prev) => {
            const idx = prev.findIndex(
              (c) => String(c.id) === String(msg.conversation_id)
            );
            if (idx === -1) return prev;

            const isMine = String(msg.sender_id) === String(currentUserId);
            const updated = { ...prev[idx] };
            updated.lastMessage = msg.content;
            updated.lastMessageAt = msg.created_at;
            updated.lastMessageSenderId = msg.sender_id;
            updated.unreadCount = isMine ? 0 : (updated.unreadCount || 0) + 1;

            const without = prev.filter((_, i) => i !== idx);
            const pinned = without.filter((c) => c.isPinned);
            const rest = without.filter((c) => !c.isPinned);

            return updated.isPinned
              ? [updated, ...pinned, ...rest]
              : [...pinned, updated, ...rest];
          });

          if (String(msg.sender_id) !== String(currentUserId)) {
            setTotalUnread((n) => n + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const conv = payload.new;
          if (!conv?.id) return;

          setConversations((prev) => {
            const idx = prev.findIndex((c) => String(c.id) === String(conv.id));
            if (idx === -1) return prev;

            const merged = {
              ...prev[idx],
              lastMessage: conv.last_message,
              lastMessageAt: conv.last_message_at,
              lastMessageSenderId: conv.last_message_sender_id,
              isClosed: conv.is_closed,
              closedAt: conv.closed_at,
              closedBy: conv.closed_by,
              closedReason: conv.closed_reason,
              isPinned: (conv.pinned_by || []).includes(currentUserId),
              isMuted: (conv.muted_by || []).includes(currentUserId),
              isArchived: (conv.archived_by || []).includes(currentUserId),
            };

            const next = [...prev];
            next[idx] = merged;
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, enabled]);

  // ----------------------------------------------------------
  // MUTATIONS
  // ----------------------------------------------------------
  const patchConversation = useCallback((id, patch) => {
    setConversations((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, ...patch } : c))
    );
  }, []);

  const togglePin = useCallback(
    async (id) => {
      const current = conversations.find((c) => String(c.id) === String(id));
      const next = !current?.isPinned;
      patchConversation(id, { isPinned: next });
      try {
        await chatAPI.pinConversation(id, next);
      } catch (e) {
        patchConversation(id, { isPinned: !next });
        throw e;
      }
    },
    [conversations, patchConversation]
  );

  const toggleMute = useCallback(
    async (id) => {
      const current = conversations.find((c) => String(c.id) === String(id));
      const next = !current?.isMuted;
      patchConversation(id, { isMuted: next });
      try {
        await chatAPI.muteConversation(id, next);
      } catch (e) {
        patchConversation(id, { isMuted: !next });
        throw e;
      }
    },
    [conversations, patchConversation]
  );

  const toggleArchive = useCallback(
    async (id) => {
      const current = conversations.find((c) => String(c.id) === String(id));
      const next = !current?.isArchived;
      patchConversation(id, { isArchived: next });
      try {
        await chatAPI.archiveConversation(id, next);
      } catch (e) {
        patchConversation(id, { isArchived: !next });
        throw e;
      }
    },
    [conversations, patchConversation]
  );

  const removeConversation = useCallback(
    async (id) => {
      const backup = conversations;
      setConversations((prev) => prev.filter((c) => String(c.id) !== String(id)));
      try {
        await chatAPI.deleteConversation(id);
      } catch (e) {
        setConversations(backup);
        throw e;
      }
    },
    [conversations]
  );

  const markLocalRead = useCallback((id) => {
    setConversations((prev) => {
      let removed = 0;
      const next = prev.map((c) => {
        if (String(c.id) === String(id)) {
          removed = c.unreadCount || 0;
          return { ...c, unreadCount: 0 };
        }
        return c;
      });
      if (removed) setTotalUnread((n) => Math.max(0, n - removed));
      return next;
    });
  }, []);

  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const ta = new Date(a.lastMessageAt || 0).getTime();
      const tb = new Date(b.lastMessageAt || 0).getTime();
      return tb - ta;
    });
  }, [conversations]);

  return {
    conversations: sorted,
    rawConversations: conversations,
    pagination,
    totalUnread,
    loading,
    error,
    reload: load,
    patchConversation,
    togglePin,
    toggleMute,
    toggleArchive,
    removeConversation,
    markLocalRead,
  };
}