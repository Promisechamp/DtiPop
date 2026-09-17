import React from 'react';
import Modal from '@/reusables/Modal';

const ChatModals = ({
  showCloseChatModal, showReportModal, showReinterestModal, selectedConversation,
  reportReason, reportDescription, setReportReason, setReportDescription,
  onCloseModal, onCloseChat, onReport, onReinterest, isClosingChat = false,
}) => (
  <>
    {/* Close Chat Modal */}
    <Modal isOpen={showCloseChatModal} onClose={onCloseModal} title="Close chat" size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200/60 flex items-center justify-center flex-shrink-0">
          <i className="bi bi-exclamation-triangle text-rose-600"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-ink-700">Close this chat?</p>
          <p className="text-xs font-medium text-ink-400 mt-1">The chat will be closed for both participants. You can reopen it anytime.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCloseModal}
          disabled={isClosingChat}
          className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl transition text-sm font-bold disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onCloseChat}
          disabled={isClosingChat}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white rounded-xl transition text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isClosingChat ? (
            <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Closing...</>
          ) : 'Close chat'}
        </button>
      </div>
    </Modal>

    {/* Report Chat Modal */}
    <Modal isOpen={showReportModal} onClose={onCloseModal} title="Report chat" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Reason</label>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition bg-white"
          >
            <option value="">Select a reason…</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="inappropriate">Inappropriate content</option>
            <option value="scam">Scam / fraud</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Add details…"
            rows="3"
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none bg-white"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={onCloseModal}
          className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl transition text-sm font-bold"
        >
          Cancel
        </button>
        <button
          onClick={onReport}
          disabled={!reportReason.trim()}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md disabled:opacity-40 text-white rounded-xl transition text-sm font-bold"
        >
          Submit report
        </button>
      </div>
    </Modal>

    {/* Re-declare Interest Modal */}
    <Modal isOpen={showReinterestModal} onClose={onCloseModal} title="Re-declare interest" size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200/60 flex items-center justify-center flex-shrink-0">
          <i className="bi bi-arrow-repeat text-primary-600"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-ink-700">
            Re-declare interest in "<span className="font-extrabold text-ink-900">{selectedConversation?.item?.title || 'this item'}</span>"?
          </p>
          <p className="text-xs font-medium text-ink-400 mt-1">The donor will be notified of your renewed interest.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCloseModal}
          className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl transition text-sm font-bold"
        >
          Cancel
        </button>
        <button
          onClick={onReinterest}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl transition text-sm font-bold"
        >
          Confirm
        </button>
      </div>
    </Modal>
  </>
);

export default ChatModals;