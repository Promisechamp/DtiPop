import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { itemsAPI } from '@/services/api/dtiApi';
import { toast } from 'sonner';
import {
  getStatusDisplay,
  getCategoryByValue,
  getConditionByValue,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

const ChatDetailsSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
    <div className="flex items-start gap-6">
      <div className="w-32 h-32 rounded-xl bg-ink-200 flex-shrink-0"></div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="h-6 w-2/3 bg-ink-200 rounded"></div>
        <div className="flex items-center gap-3 mt-3">
          <div className="h-6 w-16 bg-ink-200 rounded-full"></div>
          <div className="h-6 w-20 bg-ink-200 rounded-full"></div>
          <div className="h-6 w-16 bg-ink-200 rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <div className="h-3 w-24 bg-ink-200 rounded mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-ink-200 rounded"></div>
        <div className="h-3 w-full bg-ink-200 rounded"></div>
        <div className="h-3 w-2/3 bg-ink-200 rounded"></div>
      </div>
    </div>
    <div>
      <div className="h-3 w-32 bg-ink-200 rounded mb-3"></div>
      <div className="bg-ink-50/50 rounded-xl p-4 flex items-center gap-4 border border-ink-100/60">
        <div className="w-14 h-14 rounded-full bg-ink-200 flex-shrink-0"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-ink-200 rounded"></div>
          <div className="h-3 w-24 bg-ink-200 rounded"></div>
          <div className="h-3 w-16 bg-ink-200 rounded"></div>
        </div>
      </div>
    </div>
    <div>
      <div className="h-3 w-20 bg-ink-200 rounded mb-3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-ink-100/80 p-4 text-center shadow-sm">
            <div className="h-7 w-12 bg-ink-200 rounded mx-auto"></div>
            <div className="h-3 w-20 bg-ink-200 rounded mx-auto mt-2"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ChatDetailsModal = ({ isOpen, onClose, conversation }) => {
  const navigate = useNavigate();
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applicantCount, setApplicantCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !conversation) return;
    const itemId = conversation.item?.id || conversation.item_id;
    if (!itemId) { toast.error('Cannot find item data'); return; }
    const fetchItemDetails = async () => {
      setLoading(true);
      try {
        const response = await itemsAPI.getById(itemId);
        setItemDetails(response.data?.item);
        const [appRes, convRes] = await Promise.all([
          itemsAPI.getApplicantsCount(itemId),
          itemsAPI.getConversationsCount(itemId)
        ]);
        setApplicantCount(appRes.data?.count || 0);
        setConversationCount(convRes.data?.count || 0);
      } catch (error) {
        toast.error('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };
    fetchItemDetails();
  }, [isOpen, conversation]);

  if (!conversation) return null;

  const item = itemDetails || conversation.item || {};
  let otherUser = conversation.otherUser || conversation.other_user || {};
  if (!otherUser.id) {
    const donor = conversation.donor || {};
    const applicant = conversation.applicant || {};
    otherUser = conversation.isDonor ? applicant : donor;
    if (!otherUser.id) otherUser = donor.id ? donor : applicant;
  }

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  const handleViewItem = () => {
    if (item?.id) {
      onClose();
      navigate(`/item/${item.id}`);
    }
  };

  // Prepare status, category, condition displays
  const statusDisplay = getStatusDisplay(item?.status);
  const category = getCategoryByValue(item?.category);
  const condition = getConditionByValue(item?.condition);

  // Status badge colors unified
  const statusColorMap = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    gray: 'bg-ink-50 text-ink-600 border-ink-200',
  };
  const statusClasses = statusColorMap[statusDisplay?.color] || statusColorMap.gray;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-auto w-[90%] max-w-[90vw] h-[90%] max-h-[90vh] bg-white rounded-2xl border border-ink-100/80 shadow-lg overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 flex-shrink-0 bg-white">
                <h2 className="text-lg font-extrabold text-ink-900">Item Details</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-ink-50 transition text-ink-400 hover:text-ink-600"
                >
                  <i className="bi bi-x-lg text-lg"></i>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <ChatDetailsSkeleton />
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Item Image & Title */}
                    <div className="flex items-start gap-6">
                      {item?.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-32 h-32 rounded-xl object-cover ring-1 ring-ink-100 shadow-sm"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-ink-100 flex items-center justify-center ring-1 ring-ink-200">
                          <i className="bi bi-image text-4xl text-ink-300"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-extrabold text-ink-900">
                          {item?.title || 'Unknown Item'}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusClasses}`}>
                            <i className={`bi ${statusDisplay?.icon || 'bi-circle'} text-[10px]`}></i>
                            {statusDisplay?.label || item?.status || 'Unknown'}
                          </span>

                          {/* Category */}
                          {category && (
                            <span className="inline-flex items-center gap-1.5 bg-ink-100 text-ink-700 px-2.5 py-1 rounded-full text-xs font-bold border border-ink-200">
                              {renderIcon(category.icon, 'w-3.5 h-3.5', category.color)}
                              {category.label}
                            </span>
                          )}

                          {/* Condition */}
                          {condition && (
                            <span className="inline-flex items-center gap-1.5 bg-ink-100 text-ink-700 px-2.5 py-1 rounded-full text-xs font-bold border border-ink-200">
                              {renderIcon(condition.icon, 'w-3.5 h-3.5', condition.color)}
                              {condition.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {item?.description && (
                      <div>
                        <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">
                          Description
                        </h4>
                        <p className="text-sm text-ink-700 leading-relaxed">{item.description}</p>
                      </div>
                    )}

                    {/* Other User Information */}
                    <div>
                      <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                        {conversation.isDonor ? 'Applicant Information' : 'Donor Information'}
                      </h4>
                      <div className="bg-ink-50/50 rounded-xl p-4 flex items-center gap-4 border border-ink-100/60 shadow-sm">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-ink-200 flex items-center justify-center text-ink-500 font-bold text-xl">
                            {otherUser?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-ink-900">
                            {otherUser?.full_name || 'Unknown User'}
                          </p>
                          {otherUser?.location && (
                            <p className="text-sm text-ink-500 flex items-center gap-1">
                              <i className="bi bi-geo-alt text-xs"></i>
                              {otherUser.location}
                            </p>
                          )}
                          <p className="text-xs font-medium text-ink-400 mt-1">
                            {conversation.isDonor ? 'Applicant' : 'Donor'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div>
                      <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                        Statistics
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-4 text-center">
                          <p className="text-2xl font-extrabold text-primary-600">{applicantCount}</p>
                          <p className="text-xs font-bold text-ink-500 mt-1">Total Applicants</p>
                        </div>
                        <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-4 text-center">
                          <p className="text-2xl font-extrabold text-primary-600">{conversationCount}</p>
                          <p className="text-xs font-bold text-ink-500 mt-1">Conversations Started</p>
                        </div>
                        <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-4 text-center">
                          <p className="text-2xl font-extrabold text-ink-600">{formatDate(item?.created_at)}</p>
                          <p className="text-xs font-bold text-ink-500 mt-1">Posted On</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 flex-shrink-0 bg-white">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl text-sm font-bold transition"
                >
                  Close
                </button>
                <button
                  onClick={handleViewItem}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
                >
                  <i className="bi bi-box"></i>
                  View Full Item
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatDetailsModal;