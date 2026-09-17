import React, { useState, useRef, useEffect } from 'react';

const ChatSidebar = ({
  conversations,
  loading,
  searchTerm,
  setSearchTerm,
  selectedConversation,
  onSelectConversation,
  onClose,
  onViewDetails,
  onRequestDelete,
  formatTimeShort,
  truncateText,
}) => {
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRefs = useRef(new Map());

  const safeConversations = conversations || [];

  const getFirstName = (fullName) =>
    fullName ? fullName.trim().split(' ')[0] : 'User';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen === null) return;
      const activeMenuEl = menuRefs.current.get(menuOpen);
      if (activeMenuEl && !activeMenuEl.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const filteredConversations = safeConversations.filter((conv) => {
    const name = conv.other_user?.full_name || 'Unknown User';
    const itemTitle = conv.item?.title || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const isItemCompletedOrCancelled = (conv) => {
    const status = conv.item?.status;
    return status === 'completed' || status === 'cancelled';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-ink-100 flex-shrink-0">
        <h2 className="text-[15px] font-extrabold text-ink-900">Messages</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-ink-50 transition text-ink-400 hover:text-ink-600"
        >
          <i className="bi bi-x-lg text-sm"></i>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 bg-white border border-ink-200 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="space-y-1 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-2 py-2.5 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-ink-200 flex-shrink-0"></div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 w-24 bg-ink-200 rounded"></div>
                  <div className="h-2.5 w-36 bg-ink-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <i className="bi bi-inbox text-3xl text-ink-300"></i>
            <p className="mt-3 text-sm font-bold text-ink-500">
              {searchTerm ? 'No matches' : 'No messages yet'}
            </p>
            {!searchTerm && (
              <p className="text-xs font-medium mt-1 text-ink-400">
                Conversations start when you apply to an item
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 pt-1">
            {filteredConversations.map((conv) => {
              const otherUser = conv.other_user || {};
              const isActive = selectedConversation?.conversationId === conv.id;
              const unreadCount = conv.unread_count || 0;
              const isDisabled = isItemCompletedOrCancelled(conv);

              return (
                <div
                  key={conv.id}
                  className={`relative flex items-center gap-3 px-2 py-2.5 rounded-xl transition ${
                    isActive ? 'bg-primary-50' : 'hover:bg-ink-50'
                  }`}
                >
                  {/* Conversation area */}
                  <div
                    className={`flex items-center gap-3 flex-1 min-w-0 ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isDisabled) onSelectConversation(conv);
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      {otherUser.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-ink-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-ink-200 flex items-center justify-center text-ink-600 font-bold text-sm">
                          {otherUser.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}

                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold ring-2 ring-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] truncate ${
                          unreadCount > 0
                            ? 'font-extrabold text-ink-900'
                            : 'font-bold text-ink-800'
                        }`}
                      >
                        {getFirstName(otherUser.full_name)}
                      </p>

                      <p className="text-xs font-medium text-ink-400 truncate">
                        {conv.item?.title || 'Unknown Item'}
                      </p>
                    </div>
                  </div>

                  {/* Three-dot menu */}
                  <div
                    className="relative flex-shrink-0"
                    ref={(el) => {
                      if (el) {
                        menuRefs.current.set(conv.id, el);
                      } else {
                        menuRefs.current.delete(conv.id);
                      }
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === conv.id ? null : conv.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-ink-50 transition text-ink-400 hover:text-ink-600"
                    >
                      <i className="bi bi-three-dots-vertical text-sm"></i>
                    </button>

                    {menuOpen === conv.id && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-ink-100/80 shadow-sm py-1.5 z-[100] overflow-visible">
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            onViewDetails(conv);
                          }}
                          className="w-full px-3.5 py-2 text-left text-sm font-bold text-ink-700 hover:bg-primary-50/60 transition flex items-center gap-2.5"
                        >
                          <i className="bi bi-info-circle text-ink-400"></i>
                          View Details
                        </button>

                        <hr className="border-ink-100 my-1" />

                        <button
                          onClick={() => {
                            if (isItemCompletedOrCancelled(conv)) {
                              setMenuOpen(null);
                              onRequestDelete(conv);
                            }
                          }}
                          disabled={!isItemCompletedOrCancelled(conv)}
                          className={`w-full px-3.5 py-2 text-left text-sm font-bold transition flex items-center gap-2.5 ${
                            isItemCompletedOrCancelled(conv)
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-ink-300 cursor-not-allowed'
                          }`}
                        >
                          <i
                            className={`bi bi-trash ${
                              isItemCompletedOrCancelled(conv)
                                ? 'text-rose-500'
                                : 'text-ink-300'
                            }`}
                          ></i>
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;