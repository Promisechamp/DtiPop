import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { winnersAPI, chatAPI} from '@/services/api/dtiApi';
import ChatDrawer from '../components/chat/ChatDrawer';

// Inline skeleton — unified design
const WinnerNoticeSkeleton = () => (
  <div className="w-full max-w-md bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6 space-y-4 animate-pulse">
    <div className="w-14 h-14 rounded-full bg-ink-200 mx-auto"></div>
    <div className="h-5 w-2/3 bg-ink-200 rounded mx-auto"></div>
    <div className="h-3 w-full bg-ink-200 rounded"></div>
    <div className="h-3 w-5/6 bg-ink-200 rounded"></div>
    <div className="h-10 w-full bg-ink-200 rounded-lg mt-4"></div>
  </div>
);

const STEPS = [
  {
    icon: 'bi-chat-dots',
    title: 'Message the donor',
    text: 'Reach out in chat to arrange pickup or shipping details.',
  },
  {
    icon: 'bi-geo-alt',
    title: 'Share your details',
    text: "If shipping is involved, share your address so the donor can send the item.",
  },
  {
    icon: 'bi-check-circle',
    title: 'Confirm when received',
    text: 'Once you have the item in hand, mark it as received from your Applications page.',
  },
];

const WinnerNoticeModal = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState(null); // null = loading
  const [activeIndex, setActiveIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  
  // Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

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

  const advanceOrClose = (updatedNotices) => {
    if (updatedNotices.length === 0) {
      setNotices([]);
      return;
    }
    setActiveIndex((i) => Math.min(i, updatedNotices.length - 1));
    setNotices(updatedNotices);
  };

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

  // Handle opening chat with the donor
  const handleChatNow = async () => {
    if (!current || !current.item) {
      toast.error('Unable to start chat - missing item information');
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
      
      if (conversationId) {
        const messagesResponse = await chatAPI.getMessages(conversationId);
        const messages = messagesResponse.data?.messages || [];
        
        const otherUser = data.other_user || {
          id: donorId,
          full_name: current.item?.donor?.full_name || 'Donor',
          avatar_url: current.item?.donor?.avatar_url || null,
        };
        
        const conversation = {
          conversationId: conversationId,
          otherUser: otherUser,
          item: current.item,
          isDonor: data.is_donor || false,
          messages: messages,
          messageCount: messages.length,
          hasMessages: messages.length > 0,
        };
        
        setChatConversation(conversation);
        setIsChatOpen(true);
      } else {
        toast.error('Unable to create conversation');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error(error.response?.data?.error || 'Failed to start chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  // If no notices, render nothing
  if (notices === null) return null;
  if (notices.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
        {!current ? (
          <WinnerNoticeSkeleton />
        ) : (
          <div className="w-full max-w-md bg-white rounded-2xl border border-ink-100/80 shadow-lg overflow-hidden">
            <div className="p-6 text-center border-b border-ink-100">
              {current.item?.images?.[0] ? (
                <img
                  src={current.item.images[0]}
                  alt={current.item.title}
                  className="w-16 h-16 rounded-xl object-cover mx-auto ring-2 ring-ink-100 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-ink-50 flex items-center justify-center mx-auto border border-ink-100">
                  <i className="bi bi-gift text-2xl text-primary-500"></i>
                </div>
              )}
              <h2 className="text-lg font-extrabold text-ink-900 mt-3">
                🎉 You won "{current.item?.title || 'an item'}"!
              </h2>
              <p className="text-sm font-medium text-ink-500 mt-1">
                Here's what to do next to get your item.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 border border-primary-100">
                    <i className={`bi ${step.icon} text-primary-600 text-sm`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-ink-900">{step.title}</p>
                    <p className="text-xs font-medium text-ink-500 mt-0.5">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-ink-100 space-y-2">
              <button
                onClick={handleChatNow}
                disabled={processing || chatLoading}
                className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chatLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Opening chat...
                  </>
                ) : (
                  <>
                    <i className="bi bi-chat-dots"></i>
                    Chat with donor now
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('snooze')}
                  disabled={processing || chatLoading}
                  className="flex-1 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remind me tomorrow
                </button>
                <button
                  onClick={() => handleAction('dismiss')}
                  disabled={processing || chatLoading}
                  className="flex-1 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Don't show again
                </button>
              </div>
              {notices.length > 1 && (
                <p className="text-center text-xs font-medium text-ink-400 pt-1">
                  {activeIndex + 1} of {notices.length} items won
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        initialConversation={chatConversation}
      />
    </>
  );
};

export default WinnerNoticeModal;