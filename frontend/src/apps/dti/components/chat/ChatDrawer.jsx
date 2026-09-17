import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import{ useWebSocket } from '@/reusables/Websocket';
import { chatAPI } from '@/services/api/dtiApi';
import { toast } from 'sonner';
import ChatSidebar from './ChatSidebar';
import ChatView from './ChatView';
import ChatModals from './ChatModals';
import ChatDetailsModal from './ChatDetailsModal';
import Modal from '@/reusables/Modal';

const ChatDrawer = ({ isOpen, onClose, initialConversation }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendChatMessage, markChatAsRead, sendTyping } = useWebSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCloseChatModal, setShowCloseChatModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReinterestModal, setShowReinterestModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [conversationStatus, setConversationStatus] = useState(null);
  const [isClosingChat, setIsClosingChat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConversationForDetails, setSelectedConversationForDetails] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_CHAT || 'donttrashit_chat';

  const messagesEndRef = useRef(null);
  const hasFetchedConversationsRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const hasFetchedMessagesRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getOtherUser = (conv, currentUserId) => {
    if (conv.other_user?.id) return conv.other_user;
    const donor = conv.donor || {};
    const applicant = conv.applicant || {};
    if (donor.id === currentUserId) return applicant;
    if (applicant.id === currentUserId) return donor;
    return conv.other_user || donor || applicant;
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await chatAPI.getUnreadCount();
        const count = res.data?.count || 0;
        setHasUnreadMessages(count > 0);
        if (count > 0) {
          setIsSidebarOpen(true);
          if (!hasFetchedConversationsRef.current) fetchConversations();
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [isOpen]);

  const fetchConversations = async () => {
    if (hasFetchedConversationsRef.current) return;
    hasFetchedConversationsRef.current = true;
    setLoadingConversations(true);
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data?.conversations || []);
    } catch (err) {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !isSidebarOpen) return;
    if (!hasFetchedConversationsRef.current) fetchConversations();
  }, [isOpen, isSidebarOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasFetchedConversationsRef.current = false;
      hasFetchedMessagesRef.current = false;
      setSelectedConversation(null);
      setMessages([]);
      setConversationStatus(null);
      setIsSidebarOpen(false);
      setHasUnreadMessages(false);
      setShowDetailsModal(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialConversation && isOpen && !selectedConversation) {
      setSelectedConversation(initialConversation);
      setIsSidebarOpen(false);
      hasFetchedMessagesRef.current = false;
    }
  }, [initialConversation, isOpen, selectedConversation]);

  const sortAscending = (msgs) =>
    [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  useEffect(() => {
    if (!selectedConversation) return;
    if (hasFetchedMessagesRef.current) return;
    hasFetchedMessagesRef.current = true;
    setLoadingMessages(true);
    chatAPI
      .getMessages(selectedConversation.conversationId)
      .then((res) => {
        setMessages(sortAscending(res.data?.messages || []));
        setConversationStatus(res.data?.conversation || null);
        markChatAsRead(selectedConversation.conversationId);
        setHasUnreadMessages(false);
      })
      .catch((err) => toast.error('Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  }, [selectedConversation?.conversationId, markChatAsRead]);

  useEffect(() => {
    if (!selectedConversation) return;
    const handler = (e) => {
      const msg = e.detail;
      if (msg.conversation_id === selectedConversation.conversationId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : sortAscending([...prev, msg])
        );
        markChatAsRead(selectedConversation.conversationId);
        setTimeout(scrollToBottom, 50);
      }
    };
    const typingHandler = (e) => {
      const data = e.detail;
      if (data.conversationId === selectedConversation.conversationId)
        setOtherUserTyping(data.isTyping);
    };
    window.addEventListener('chat:receive', handler);
    window.addEventListener('chat:typing', typingHandler);
    return () => {
      window.removeEventListener('chat:receive', handler);
      window.removeEventListener('chat:typing', typingHandler);
    };
  }, [selectedConversation, markChatAsRead]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  useEffect(() => {
    if (!isInitialLoadRef.current) setTimeout(scrollToBottom, 50);
    else setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'end' }), 0);
    isInitialLoadRef.current = false;
  }, [messages]);

  const handleViewDetails = (conv) => {
    if (!conv?.id) {
      toast.error('Unable to load conversation details');
      return;
    }
    const currentUserId = user?.id;
    const otherUser = getOtherUser(conv, currentUserId);
    setSelectedConversationForDetails({
      ...conv,
      otherUser,
      item: conv.item || {},
      isDonor: conv.donor_id === currentUserId,
    });
    setShowDetailsModal(true);
  };

  const handleFileUpload = async (file) => {
    if (!selectedConversation) return;
    setUploadingFile(true);
    const toastId = toast.loading('Uploading file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'donttrashit/chats');
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Upload failed');
      const data = await res.json();
      const saveRes = await chatAPI.saveFileMessage({
        conversationId: selectedConversation.conversationId,
        content: file.name,
        fileUrl: data.secure_url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        publicId: data.public_id,
      });
      if (saveRes.data?.success) {
        setMessages((prev) => sortAscending([...prev, saveRes.data.message]));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.conversationId
              ? { ...c, last_message: saveRes.data.message, last_message_at: saveRes.data.message.created_at }
              : c
          )
        );
        toast.success('File uploaded', { id: toastId });
        setTimeout(scrollToBottom, 50);
      }
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedConversation) return;
    setSending(true);
    try {
      const result = await sendChatMessage({
        conversationId: selectedConversation.conversationId,
        content: newMessage.trim(),
        recipientId: selectedConversation.otherUser?.id,
        senderName: user?.full_name,
      });
      if (result?.success && result.message) {
        setMessages((prev) => sortAscending([...prev, result.message]));
        setNewMessage('');
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.conversationId
              ? { ...c, last_message: result.message, last_message_at: result.message.created_at }
              : c
          )
        );
        setTimeout(scrollToBottom, 50);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conv) => {
    hasFetchedMessagesRef.current = false;
    setConversationStatus(null);
    const currentUserId = user?.id;
    const otherUser = getOtherUser(conv, currentUserId);
    setSelectedConversation({
      conversationId: conv.id,
      otherUser,
      item: conv.item || {},
      isDonor: conv.donor_id === currentUserId,
      donor_id: conv.donor_id,
      applicant_id: conv.applicant_id,
    });
    isInitialLoadRef.current = true;
    setIsSidebarOpen(false);
  };

  const handleCloseChat = async () => {
    setIsClosingChat(true);
    try {
      await chatAPI.closeChat(selectedConversation.conversationId);
      toast.success('Chat closed');
      setShowCloseChatModal(false);
      setConversationStatus({
        is_closed: true,
        closed_reason: 'donor_closed',
        closed_by: user?.id,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to close chat');
    } finally {
      setIsClosingChat(false);
    }
  };

  const handleReopenChat = async () => {
    try {
      await chatAPI.reopenChat(selectedConversation.conversationId);
      toast.success('Chat reopened');
      setConversationStatus({ is_closed: false });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reopen chat');
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    if (!isSidebarOpen && !hasFetchedConversationsRef.current) fetchConversations();
  };

  const handleMessageViewClick = (e) => {
    if (e.target?.closest?.('[data-sidebar-toggle]')) return;
    if (isSidebarOpen) setIsSidebarOpen(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (selectedConversation)
      sendTyping(
        selectedConversation.conversationId,
        selectedConversation.otherUser?.id,
        e.target.value.length > 0
      );
  };

  const handleViewItem = () => {
    if (selectedConversation?.item?.id) {
      onClose();
      navigate(`/item/${selectedConversation.item.id}`);
    }
  };

  const handleReinterest = () => {
    setShowReinterestModal(false);
    onClose();
    navigate(`/redeclare-interest/${selectedConversation.item.id}`);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await chatAPI.reportChat(selectedConversation.conversationId, {
        reason: reportReason,
        description: reportDescription,
      });
      toast.success('Chat reported and closed');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      setConversationStatus({
        is_closed: true,
        closed_reason: 'reported',
        closed_by: user?.id,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to report chat');
    }
  };

  const resetModals = () => {
    setShowCloseChatModal(false);
    setShowReportModal(false);
    setShowReinterestModal(false);
    setReportReason('');
    setReportDescription('');
  };

  // Delete conversation handlers
  const handleRequestDelete = (conv) => {
    setDeletingConversation(conv);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConversation) return;
    setDeleting(true);
    try {
      await chatAPI.deleteConversation(deletingConversation.id);
      toast.success('Conversation deleted');
      setShowDeleteModal(false);
      setDeletingConversation(null);
      hasFetchedConversationsRef.current = false;
      await fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete conversation');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-full max-w-[95%] sm:max-w-[720px] md:max-w-[860px] lg:max-w-[960px] h-[85vh] max-h-[720px] bg-white rounded-2xl shadow-lg border border-ink-100/80 overflow-hidden flex relative"
            >
              <div
                className={`absolute inset-y-0 left-0 z-40 w-[45%] min-w-[280px] max-w-[380px] bg-white border-r border-ink-100 transition-transform duration-300 ease-in-out ${
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <ChatSidebar
                  conversations={conversations}
                  loading={loadingConversations}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedConversation={selectedConversation}
                  onSelectConversation={handleSelectConversation}
                  onClose={() => setIsSidebarOpen(false)}
                  onViewDetails={handleViewDetails}
                  onRequestDelete={handleRequestDelete}
                  formatTimeShort={(date) => {
                    const now = new Date();
                    const diff = now - new Date(date);
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(mins / 60);
                    const days = Math.floor(hrs / 24);
                    if (mins < 1) return 'now';
                    if (mins < 60) return `${mins}m`;
                    if (hrs < 24) return `${hrs}h`;
                    if (days < 7) return `${days}d`;
                    return new Date(date).toLocaleDateString();
                  }}
                  truncateText={(text, max = 30) =>
                    !text ? '' : text.length > max ? text.substring(0, max) + '…' : text
                  }
                />
              </div>
              <div
                className="relative z-10 flex-1 min-w-0 h-full"
                onClick={handleMessageViewClick}
              >
                {selectedConversation ? (
                  <ChatView
                    selectedConversation={selectedConversation}
                    conversationStatus={conversationStatus}
                    messages={messages}
                    loading={loadingMessages}
                    sending={sending}
                    uploadingFile={uploadingFile}
                    newMessage={newMessage}
                    otherUserTyping={otherUserTyping}
                    user={user}
                    showMenu={showMenu}
                    setShowMenu={setShowMenu}
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onClose={onClose}
                    onViewItem={handleViewItem}
                    onReinterest={() => setShowReinterestModal(true)}
                    onReport={() => setShowReportModal(true)}
                    onCloseChat={() => setShowCloseChatModal(true)}
                    onReopenChat={handleReopenChat}
                    onToggleSidebar={handleToggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                    onFileUpload={handleFileUpload}
                    isConversationClosed={conversationStatus?.is_closed === true}
                    formatTime={(date) =>
                      new Date(date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                    formatDate={(date) => {
                      const today = new Date();
                      const msgDate = new Date(date);
                      if (msgDate.toDateString() === today.toDateString()) return 'Today';
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      if (msgDate.toDateString() === yesterday.toDateString())
                        return 'Yesterday';
                      return msgDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }}
                    messagesEndRef={messagesEndRef}
                  />
                ) : (
                  <div className="flex flex-col h-full bg-white">
                    <div className="flex items-center px-4 py-3 border-b border-ink-100 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSidebar();
                        }}
                        data-sidebar-toggle
                        className="p-2 hover:bg-ink-50 rounded-xl transition text-ink-600 flex items-center gap-2 text-sm font-bold"
                      >
                        <i className="bi bi-list text-xl"></i>
                        <span className="hidden sm:inline">
                          {hasUnreadMessages ? 'Unread Messages' : 'Open Conversations'}
                        </span>
                        {hasUnreadMessages && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </button>
                      <div className="flex-1"></div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                      <div className="w-20 h-20 rounded-full bg-ink-50 border border-ink-100 flex items-center justify-center mb-4">
                        <i className="bi bi-chat-dots text-3xl text-ink-400"></i>
                      </div>
                      <h3 className="text-lg font-extrabold text-ink-700 mb-1">
                        Hello {user?.full_name || 'User'} 👋
                      </h3>
                      <p className="text-sm font-medium text-ink-400 max-w-sm text-center">
                        {hasUnreadMessages
                          ? 'You have unread messages. Open the sidebar to view them.'
                          : 'Start a conversation by selecting the items you applied for from the sidebar, or browse items to apply.'}
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/browse');
                        }}
                        className="mt-6 px-5 py-2.5 border border-ink-200 hover:bg-ink-50 text-ink-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
                      >
                        <i className="bi bi-search"></i>
                        Browse Items
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Modals */}
          <ChatDetailsModal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            conversation={selectedConversationForDetails}
          />
          <ChatModals
            showCloseChatModal={showCloseChatModal}
            showReportModal={showReportModal}
            showReinterestModal={showReinterestModal}
            selectedConversation={selectedConversation}
            reportReason={reportReason}
            reportDescription={reportDescription}
            setReportReason={setReportReason}
            setReportDescription={setReportDescription}
            onCloseModal={resetModals}
            onCloseChat={handleCloseChat}
            onReport={handleReport}
            onReinterest={handleReinterest}
            isClosingChat={isClosingChat}
          />

          {/* Delete conversation modal (unified) */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingConversation(null);
            }}
            title="Delete Conversation"
            size="sm"
          >
            {deletingConversation && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-exclamation-triangle text-rose-600 text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-600">
                      Are you sure you want to delete this conversation?
                    </p>
                    <p className="text-xs font-medium text-ink-400 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingConversation(null);
                    }}
                    className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <i className="bi bi-trash"></i>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </Modal>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatDrawer;