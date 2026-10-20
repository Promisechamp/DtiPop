import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Gift,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

import { winnersAPI } from '@/services/api/dtiApi';
import { chatAPI } from '@/services/api/sharedApi';
import { useAuth } from '@/context/AuthContext';
import ChatModal from '@/pages/chat/ChatModal';

/* ==========================================================================
   SKELETON
========================================================================== */

const WinnerNoticeSkeleton = () => (
  <div className="w-full max-w-md space-y-4 rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
    <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-ink-100" />
    <div className="mx-auto h-5 w-2/3 animate-pulse rounded bg-ink-100" />
    <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
    <div className="h-3 w-5/6 animate-pulse rounded bg-ink-100" />
    <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-ink-100" />
  </div>
);

/* ==========================================================================
   STEPS
========================================================================== */

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Message the donor',
    text: 'Reach out in chat to arrange pickup or shipping details.',
  },
  {
    icon: MapPin,
    title: 'Share your details',
    text: 'If shipping is involved, share your address so the donor can send the item.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm when received',
    text: 'Once you have the item in hand, mark it as received from your Applications page.',
  },
];

/* ==========================================================================
   MAIN COMPONENT
========================================================================== */

const WinnerNoticeModal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notices, setNotices] = useState(null); // null = loading
  const [activeIndex, setActiveIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  /* Chat state */
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  /* --------------------------------------------------------
     FETCH NOTICES
  -------------------------------------------------------- */

  const fetchNotices = useCallback(async () => {
    try {
      const res = await winnersAPI.getMyPendingNotices();
      setNotices(res.data?.notices || []);
    } catch (error) {
      console.error('Error fetching winner notices:', error);
      setNotices([]);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const current = notices?.[activeIndex];

  /* --------------------------------------------------------
     ADVANCE / CLOSE
  -------------------------------------------------------- */

  const advanceOrClose = (updatedNotices) => {
    if (updatedNotices.length === 0) {
      setNotices([]);
      return;
    }

    setActiveIndex((i) => Math.min(i, updatedNotices.length - 1));
    setNotices(updatedNotices);
  };

  /* --------------------------------------------------------
     ACTION
  -------------------------------------------------------- */

  const handleAction = async (action) => {
    if (!current) return;

    setProcessing(true);

    try {
      await winnersAPI.updateNotice(current.id, action);

      const remaining = notices.filter((n) => n.id !== current.id);
      advanceOrClose(remaining);

      if (action === 'snooze') {
        toast.info("We'll remind you again tomorrow");
      }
    } catch (error) {
      console.error('Error updating winner notice:', error);
      toast.error('Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  /* --------------------------------------------------------
     OPEN CHAT
  -------------------------------------------------------- */

  const handleChatNow = async () => {
    if (!current || !current.item) {
      toast.error('Unable to start chat — missing item information');
      return;
    }

    const itemId = current.item_id || current.item?.id;
    const donorId = current.item?.donor?.id || current.item?.donor_id;
    const applicantId = current.winner_id;

    if (!itemId || !donorId || !applicantId) {
      toast.error('Missing required information. Please try again later.');
      return;
    }

    setChatLoading(true);

    try {
      const response = await chatAPI.getOrCreateConversationWithApplicant(
        itemId,
        applicantId
      );

      const data = response.data;
      const conversationId = data.conversation?.id;

      if (!conversationId) {
        toast.error('Unable to create conversation');
        return;
      }

      const messagesResponse = await chatAPI.getMessages(conversationId);
      const messages = messagesResponse.data?.messages || [];

      const otherUser = data.other_user || {
        id: donorId,
        full_name: current.item?.donor?.full_name || 'Donor',
        avatar_url: current.item?.donor?.avatar_url || null,
      };

      setChatConversation({
        conversationId,
        otherUser,
        item: current.item,
        isDonor: data.is_donor || false,
        messages,
        messageCount: messages.length,
        hasMessages: messages.length > 0,
      });

      setIsChatOpen(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error(
        error.response?.data?.error ||
          'Failed to start chat. Please try again.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  /* --------------------------------------------------------
     RENDER GUARDS
  -------------------------------------------------------- */

  if (notices === null) return null;
  if (notices.length === 0) return null;

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <>
      <div className="fixed inset-0 z-[50] flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
        {!current ? (
          <WinnerNoticeSkeleton />
        ) : (
          <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-lg">
            {/* ================================================
                HEADER
            ================================================ */}

            <div className="border-b border-ink-100 p-6 text-center">
              {current.item?.images?.[0] ? (
                <img
                  src={current.item.images[0]}
                  alt={current.item.title || 'Won item'}
                  className="mx-auto h-16 w-16 rounded-2xl object-cover ring-1 ring-ink-100"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600">
                  <Gift size={26} />
                </div>
              )}

              <h2 className="mt-4 text-lg font-black tracking-tight text-ink-950">
                You won "{current.item?.title || 'an item'}"!
              </h2>

              <p className="mt-1.5 text-sm font-medium leading-6 text-ink-500">
                Here's what to do next to receive your item.
              </p>
            </div>

            {/* ================================================
                STEPS
            ================================================ */}

            <div className="space-y-4 p-6">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;

                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600">
                      <StepIcon size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-ink-950">
                        {step.title}
                      </p>

                      <p className="mt-0.5 text-xs font-medium leading-5 text-ink-500">
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ================================================
                ACTIONS
            ================================================ */}

            <div className="space-y-2 border-t border-ink-100 p-4">
              <button
                type="button"
                onClick={handleChatNow}
                disabled={processing || chatLoading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Opening chat...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    Chat with donor now
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAction('snooze')}
                  disabled={processing || chatLoading}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-xs font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remind me tomorrow
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('dismiss')}
                  disabled={processing || chatLoading}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-xs font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Don't show again
                </button>
              </div>

              {notices.length > 1 && (
                <p className="pt-1 text-center text-[11px] font-bold text-ink-400">
                  {activeIndex + 1} of {notices.length} items won
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================
          CHAT MODAL
      ================================================ */}

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        conversationId={
          chatConversation?.id ||
          chatConversation?.conversation_id ||
          chatConversation?.conversationId ||
          null
        }
        currentUserId={user?.id}
        currentUserName={user?.full_name || user?.fullName}
        otherParticipant={
          chatConversation?.otherParticipant ||
          chatConversation?.other_participant ||
          chatConversation?.other_user ||
          chatConversation?.otherUser ||
          null
        }
        showDtiOptions={true}
      />
    </>
  );
};

export default WinnerNoticeModal;