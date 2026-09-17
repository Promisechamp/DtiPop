import React, { useRef, useEffect, useMemo, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'sonner';

const ChatView = ({
  selectedConversation,
  conversationStatus,
  messages,
  loading,
  uploadingFile,
  newMessage,
  otherUserTyping,
  user,
  showMenu,
  setShowMenu,
  onSend,
  onTyping,
  onClose,
  onReopenChat,
  onViewItem,
  onReinterest,
  onReport,
  onCloseChat,
  onRetryMessage,
  onToggleSidebar,
  isSidebarOpen,
  onFileUpload,
  formatTime,
  formatDate,
  messagesEndRef,
}) => {
  const menuRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);
  const isDonor = selectedConversation?.isDonor || false;
  const isLoadingMessages = loading && messages.length === 0;
  const isClosed = conversationStatus?.is_closed || false;

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages]
  );

  const getClosedMessage = () => {
    if (!conversationStatus) return 'This chat has been closed.';
    if (conversationStatus.closed_reason === 'donor_closed') {
      return 'Donor ended this chat.';
    }
    if (conversationStatus.closed_reason === 'reported') {
      const closerIsDonor = conversationStatus.closed_by === conversationStatus.donor_id;
      return closerIsDonor
        ? 'Donor reported this chat.'
        : 'Applicant reported this chat.';
    }
    return 'This chat has been closed.';
  };

  const canReopen =
    isClosed &&
    conversationStatus?.closed_reason === 'donor_closed' &&
    conversationStatus?.closed_by === user?.id;

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !emojiButtonRef.current?.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close attachment options on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close header menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMenu]);

  // Prevent keyboard from opening when emoji picker is open
  useEffect(() => {
    if (showEmojiPicker) {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
      }
    }
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData) => {
    onTyping({ target: { value: newMessage + emojiData.emoji } });
    setShowEmojiPicker(false);
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      if (input) input.focus();
    }, 100);
  };

  const handleGallerySelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image size must be less than 10MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    onFileUpload(file);
    setShowOptions(false);
    e.target.value = '';
  };

  const handleCameraSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image size must be less than 10MB'); return; }
    onFileUpload(file);
    setShowOptions(false);
    e.target.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10MB'); return; }
    onFileUpload(file);
    setShowOptions(false);
    e.target.value = '';
  };

  const renderMessageContent = (msg) => {
    if (msg.file_url) {
      const isImage = msg.file_type?.startsWith('image/');
      if (isImage) {
        return (
          <div className="space-y-2">
            <img src={msg.file_url} alt={msg.file_name || 'Shared image'} className="max-w-full max-h-64 rounded-xl object-cover cursor-pointer" onClick={() => window.open(msg.file_url, '_blank')} loading="lazy" />
            {msg.content && msg.content !== msg.file_name && <p className="text-sm whitespace-pre-wrap leading-snug">{msg.content}</p>}
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline text-inherit">
            <i className="bi bi-file-earmark text-base"></i>
            <span className="truncate max-w-[150px]">{msg.file_name || 'Download file'}</span>
          </a>
          {msg.content && msg.content !== msg.file_name && <p className="text-sm whitespace-pre-wrap leading-snug">{msg.content}</p>}
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap leading-snug">{msg.content}</p>;
  };

  const renderStatus = (msg, isOwn) => {
    if (!isOwn || !msg._status) return null;
    if (msg._status === 'sending') return <i className="bi bi-clock text-[10px] ml-1 opacity-70"></i>;
    if (msg._status === 'failed') return (
      <button type="button" onClick={() => onRetryMessage?.(msg)} className="text-[10px] ml-1 text-rose-200 hover:text-white underline" title="Failed to send — tap to retry">
        <i className="bi bi-exclamation-circle-fill"></i> retry
      </button>
    );
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100 flex-shrink-0">
        {!isSidebarOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSidebar();
            }}
            data-sidebar-toggle
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-ink-50 transition text-ink-500 flex-shrink-0"
            title="Open conversations"
          >
            <i className="bi bi-chevron-right text-base"></i>
          </button>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedConversation?.item?.images?.[0] ? (
            <img src={selectedConversation.item.images[0]} alt={selectedConversation.item.title} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-ink-100" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center flex-shrink-0">
              <i className="bi bi-image text-ink-300"></i>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-ink-900 truncate">{selectedConversation?.item?.title || 'Chat'}</p>
            <p className="text-xs font-medium text-ink-400 truncate">{selectedConversation?.otherUser?.full_name || 'Unknown User'}</p>
          </div>
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-xl hover:bg-ink-50 transition text-ink-500">
            <i className="bi bi-three-dots-vertical text-base"></i>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-ink-100/80 shadow-sm py-1.5 z-50 overflow-visible">
              <button onClick={() => { setShowMenu(false); onViewItem(); }} className="w-full px-3.5 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2.5">
                <i className="bi bi-box text-ink-400"></i> View item
              </button>
              {!isDonor && !isClosed && (
                <button onClick={() => { setShowMenu(false); onReinterest(); }} className="w-full px-3.5 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2.5">
                  <i className="bi bi-arrow-repeat text-ink-400"></i> Re-declare interest
                </button>
              )}
              {!isClosed && (
                <button onClick={() => { setShowMenu(false); onReport(); }} className="w-full px-3.5 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2.5">
                  <i className="bi bi-flag"></i> Report chat
                </button>
              )}
              {isDonor && !isClosed && (
                <>
                  <hr className="border-ink-100 my-1" />
                  <button onClick={() => { setShowMenu(false); onCloseChat(); }} className="w-full px-3.5 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2.5">
                    <i className="bi bi-x-circle"></i> Close chat
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-ink-50 transition text-ink-500 flex-shrink-0">
          <i className="bi bi-x-lg text-base"></i>
        </button>
      </div>

      {/* Messages */}
      {isLoadingMessages ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
              <div className={`max-w-[65%] rounded-2xl px-4 py-3 ${i % 2 === 0 ? 'bg-primary-100' : 'bg-ink-100'}`}>
                <div className="h-3 w-28 bg-white/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : orderedMessages.length === 0 ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center px-6">
          {selectedConversation?.otherUser?.avatar_url ? (
            <img src={selectedConversation.otherUser.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-ink-100 mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mb-4 ring-4 ring-ink-50">
              <span className="text-ink-500 text-xl font-extrabold">{selectedConversation?.otherUser?.full_name?.charAt(0).toUpperCase() || '?'}</span>
            </div>
          )}
          <h4 className="text-base font-extrabold text-ink-900 mb-1">{selectedConversation?.otherUser?.full_name || 'Donor'}</h4>
          <p className="text-sm font-medium text-ink-400 max-w-[220px]">Say hello to start the conversation</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {orderedMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id;
            const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(orderedMessages[index - 1]?.created_at).toDateString();
            const isFailed = msg._status === 'failed';
            const isSending = msg._status === 'sending';
            return (
              <div key={msg.id || index}>
                {showDate && <div className="text-center text-[11px] font-bold text-ink-400 my-3">{formatDate(msg.created_at)}</div>}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm ${isOwn ? `bg-gradient-to-r from-primary-500 to-brand-600 text-white rounded-br-md ${isFailed ? 'opacity-70' : ''} ${isSending ? 'opacity-80' : ''}` : 'bg-ink-50 text-ink-900 rounded-bl-md border border-ink-100/60'}`}>
                    {renderMessageContent(msg)}
                    <p className={`text-[10px] mt-1 flex items-center ${isOwn ? 'text-primary-100/70' : 'text-ink-400'}`}>
                      {formatTime(msg.created_at)}
                      {renderStatus(msg, isOwn)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-ink-50 rounded-2xl rounded-bl-md px-4 py-2.5 border border-ink-100/60">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input or closed banner */}
      {isClosed ? (
        <div className="p-4 border-t border-ink-100 flex-shrink-0 bg-ink-50/30">
          <div className="flex flex-col items-center justify-center gap-2 text-sm font-bold text-ink-500">
            <div className="flex items-center gap-2"><i className="bi bi-lock-fill"></i><span>{getClosedMessage()}</span></div>
            {canReopen && (
              <button onClick={onReopenChat} className="mt-1 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-full text-xs font-extrabold transition flex items-center gap-1.5">
                <i className="bi bi-arrow-counterclockwise"></i> Reopen chat
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={onSend} className="p-3 border-t border-ink-100 flex-shrink-0 bg-white">
          <div className="relative flex items-end gap-2 bg-ink-50/50 border border-ink-200 rounded-3xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-400 transition shadow-sm">
            <div className="relative" ref={optionsRef}>
              <button type="button" onClick={() => setShowOptions(!showOptions)} className="w-9 h-9 flex-shrink-0 rounded-full hover:bg-ink-200/70 transition text-ink-400 hover:text-ink-600 flex items-center justify-center" disabled={!selectedConversation || uploadingFile}>
                <i className="bi bi-plus-lg text-lg"></i>
              </button>
              {showOptions && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border border-ink-100/80 shadow-sm py-2 z-50 overflow-visible">
                  <button type="button" onClick={() => galleryInputRef.current?.click()} className="w-full px-4 py-2.5 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-3">
                    <i className="bi bi-image text-primary-500 text-base"></i><span>Photo</span>
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-2.5 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-3">
                    <i className="bi bi-file-earmark text-primary-500 text-base"></i><span>File</span>
                  </button>
                  <hr className="border-ink-100 my-1" />
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="w-full px-4 py-2.5 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-3">
                    <i className="bi bi-camera text-primary-500 text-base"></i><span>Take Photo</span>
                  </button>
                </div>
              )}
            </div>
            <input ref={galleryInputRef} type="file" className="hidden" onChange={handleGallerySelect} accept="image/*" />
            <input ref={cameraInputRef} type="file" className="hidden" onChange={handleCameraSelect} accept="image/*" capture="environment" />
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.zip,.rar,.xls,.xlsx,.ppt,.pptx" />
            <input type="text" value={newMessage} onChange={onTyping} placeholder={uploadingFile ? 'Uploading file...' : 'Type a message...'} disabled={!selectedConversation || uploadingFile} className="flex-1 min-w-0 bg-transparent py-2 text-sm text-ink-900 placeholder-ink-400 focus:outline-none disabled:opacity-60" onFocus={() => setShowEmojiPicker(false)} />
            <div className="relative" ref={emojiButtonRef}>
              <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); const input = document.querySelector('input[type="text"]'); if (input) input.blur(); }} className="w-9 h-9 flex-shrink-0 rounded-full hover:bg-ink-200/70 transition text-ink-400 hover:text-ink-600 flex items-center justify-center" disabled={!selectedConversation || uploadingFile}>
                <i className="bi bi-emoji-smile text-lg"></i>
              </button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                  <EmojiPicker onEmojiClick={handleEmojiClick} width={500} height={420} theme="light" emojiStyle="apple" searchDisabled={true} allowExpandReactions={true} previewConfig={{ showPreview: false }} className="m-auto" />
                </div>
              )}
            </div>
            <button type="submit" disabled={!selectedConversation || (!newMessage.trim() && !uploadingFile)} className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
              {uploadingFile ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <i className="bi bi-send-fill text-sm"></i>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatView;