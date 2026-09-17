import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import { supportAPI } from '@/services/api/dtiApi';
import { useAuth } from '@/context/AuthContext';

// ============================================
// SUPPORT REASONS - Different for each role
// ============================================

const DONOR_SUPPORT_REASONS = [
  { value: 'winner_unresponsive', label: 'Winner is unresponsive' },
  { value: 'winner_no_show', label: "Winner didn't show up for pickup" },
  { value: 'winner_dispute', label: 'Dispute with winner over item condition' },
  { value: 'shipping_issue', label: 'Issue with shipping/delivery' },
  { value: 'item_damaged', label: 'Item was damaged during shipping' },
  { value: 'other', label: 'Other' },
];

const WINNER_SUPPORT_REASONS = [
  { value: 'donor_unresponsive', label: 'Donor is unresponsive' },
  { value: 'donor_no_show', label: "Donor didn't show up for pickup" },
  { value: 'donor_dispute', label: 'Dispute with donor over item condition' },
  { value: 'shipping_issue', label: 'Issue with shipping/delivery' },
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'other', label: 'Other' },
];

const APPLICANT_SUPPORT_REASONS = [
  { value: 'donor_unresponsive', label: 'Donor is unresponsive' },
  { value: 'donor_no_show', label: "Donor didn't show up for pickup" },
  { value: 'donor_dispute', label: 'Dispute with donor over item condition' },
  { value: 'application_question', label: 'Question about my application' },
  { value: 'other', label: 'Other' },
];

const USER_SUPPORT_REASONS = [
  { value: 'general_question', label: 'General Question' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'ban_appeal', label: 'Ban Appeal' },
  { value: 'other', label: 'Other' },
];

// ============================================
// ROLE OPTIONS
// ============================================

const ROLE_OPTIONS = [
  { value: 'donor', label: 'Donor', icon: 'bi-box-seam', color: 'sky' },
  { value: 'winner', label: 'Winner', icon: 'bi-trophy', color: 'amber' },
  { value: 'applicant', label: 'Applicant', icon: 'bi-file-text', color: 'orange' },
  { value: 'unknown', label: 'Just a User', icon: 'bi-person', color: 'ink' },
];

// ============================================
// SUPPORT MODAL COMPONENT
// ============================================

const SupportModal = ({ 
  isOpen, 
  onClose, 
  itemId: initialItemId, 
  applicationId, 
  applicantId,
  reporterType: initialReporterType,
  onSuccess,
  defaultReason = '',
  defaultDescription = '',
  isBanAppeal = false,
  banData = null,
}) => {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState(defaultReason);
  const [description, setDescription] = useState(defaultDescription);
  const [itemId, setItemId] = useState(initialItemId || '');
  const [loading, setLoading] = useState(false);
  const [reporterType, setReporterType] = useState(initialReporterType || 'unknown');
  const [showRoleSelector, setShowRoleSelector] = useState(initialReporterType === 'unknown');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isBanAppeal) {
        setReason('ban_appeal');
        const banDetails = banData 
          ? `Ban Reason: ${banData.reason || 'Not specified'}\nBanned On: ${banData.bannedAt ? new Date(banData.bannedAt).toLocaleDateString() : 'N/A'}\nDuration: ${banData.duration || 'Permanent'}\n\nPlease review my account ban. I would like to appeal this decision.`
          : 'I would like to appeal my account ban. Please review my case.';
        setDescription(defaultDescription || banDetails);
      } else {
        setReason(defaultReason);
        setDescription(defaultDescription);
      }
      setItemId(initialItemId || '');
      setReporterType(initialReporterType || 'unknown');
      setShowRoleSelector(initialReporterType === 'unknown');
    }
  }, [isOpen, defaultReason, defaultDescription, initialItemId, initialReporterType, isBanAppeal, banData]);

  // Get the appropriate reasons based on reporter type
  const getSupportReasons = () => {
    switch (reporterType) {
      case 'donor':
        return DONOR_SUPPORT_REASONS;
      case 'winner':
        return WINNER_SUPPORT_REASONS;
      case 'applicant':
        return APPLICANT_SUPPORT_REASONS;
      case 'unknown':
        return USER_SUPPORT_REASONS;
      default:
        return USER_SUPPORT_REASONS;
    }
  };

  const supportReasons = getSupportReasons();

  // Get the label for who is reporting
  const getReporterLabel = () => {
    const role = ROLE_OPTIONS.find(r => r.value === reporterType);
    return role?.label || 'User';
  };

  // Get reporter name
  const getReporterName = () => {
    return profile?.full_name || user?.full_name || 'User';
  };

  // Get the selected role's icon
  const getReporterIcon = () => {
    const role = ROLE_OPTIONS.find(r => r.value === reporterType);
    return role?.icon || 'bi-person';
  };

  // Get the selected role's color
  const getReporterColor = () => {
    const role = ROLE_OPTIONS.find(r => r.value === reporterType);
    return role?.color || 'ink';
  };

  const handleRoleSelect = (roleValue) => {
    setReporterType(roleValue);
    setShowRoleSelector(false);
    setReason('');
  };

  const handleChangeRole = () => {
    setShowRoleSelector(true);
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    let finalItemId = itemId || null;
    if (reporterType === 'unknown' && itemId && !itemId.trim()) {
      finalItemId = null;
    }

    setLoading(true);
    try {
      const ticketData = {
        item_id: finalItemId,
        application_id: applicationId || null,
        applicant_id: applicantId || null,
        reason: reason,
        description: description || null,
        reporter_type: reporterType || 'unknown',
        ...(isBanAppeal && banData && {
          metadata: {
            ban_appeal: true,
            ban_reason: banData.reason,
            banned_at: banData.bannedAt,
            ban_duration: banData.duration,
          }
        }),
      };

      await supportAPI.createTicket(ticketData);
      
      toast.success(isBanAppeal ? 'Ban appeal submitted successfully. Our team will review your case.' : 'Issue reported successfully. Our team will follow up shortly.');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast.error(error.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setItemId('');
    onClose();
  };

  // Get the color classes for the role badge
  const getRoleColorClasses = (color) => {
    const colors = {
      sky: 'bg-sky-50 text-sky-700 border-sky-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      ink: 'bg-ink-50 text-ink-700 border-ink-200',
      primary: 'bg-primary-50 text-primary-700 border-primary-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return colors[color] || colors.ink;
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBanAppeal ? 'Submit Ban Appeal' : 'Report an Issue'}
      size="md"
    >
      {/* Ban Appeal Banner */}
      {isBanAppeal && banData && (
        <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <i className="bi bi-shield-exclamation text-rose-500 text-lg mt-0.5"></i>
            <div>
              <h4 className="text-sm font-extrabold text-rose-700">Account Ban Details</h4>
              <div className="mt-1 space-y-1 text-sm text-rose-600">
                <p><span className="font-bold">Reason:</span> {banData.reason || 'Not specified'}</p>
                <p><span className="font-bold">Banned On:</span> {formatDate(banData.bannedAt)}</p>
                <p><span className="font-bold">Duration:</span> {banData.duration || 'Permanent'}</p>
                {banData.bannedBy && (
                  <p><span className="font-bold">Banned By:</span> {banData.bannedBy}</p>
                )}
              </div>
              <p className="mt-2 text-xs text-rose-500 font-bold">
                <i className="bi bi-info-circle mr-1"></i>
                Please explain why you believe this ban should be reviewed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Reporter Type Badge */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-ink-100/80 bg-ink-50/30 shadow-sm">
          <div className="flex items-center gap-2">
            <i className={`bi ${getReporterIcon()} text-${getReporterColor()}-600`}></i>
            <span className="text-xs font-bold text-ink-700">
              Reporting as: <span className="font-extrabold text-ink-900">{getReporterLabel()}</span>
            </span>
          </div>
          {!showRoleSelector && !isBanAppeal && (
            <button
              onClick={handleChangeRole}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 transition flex items-center gap-1"
            >
              <i className="bi bi-pencil"></i>
              Change
            </button>
          )}
          {isBanAppeal && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200/60">
              Ban Appeal
            </span>
          )}
        </div>

        {/* Role Selector - Collapsible */}
        <AnimatePresence>
          {showRoleSelector && !isBanAppeal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1">
                <label className="block text-sm font-bold text-ink-700 mb-2">
                  Select your role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleSelect(role.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition border-2 ${
                        reporterType === role.value
                          ? `border-${role.color}-500 bg-${role.color}-50 text-${role.color}-700 shadow-sm`
                          : 'border-ink-200 hover:border-ink-300 text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      <i className={`bi ${role.icon} text-base`}></i>
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Role Badge (when collapsed) */}
        {!showRoleSelector && reporterType !== 'unknown' && !isBanAppeal && (
          <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm ${getRoleColorClasses(getReporterColor())}`}>
            <i className={`bi ${getReporterIcon()}`}></i>
            <span className="font-extrabold">Reporting as {getReporterLabel()}</span>
            <span className="text-ink-400">•</span>
            <span className="font-medium text-ink-500">{getReporterName()}</span>
          </div>
        )}

        {/* Item ID - Show for all types */}
        {!isBanAppeal && (
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1.5">
              Item ID {reporterType === 'unknown' && <span className="text-ink-400 font-normal">(optional)</span>}
            </label>
            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Enter item ID if applicable..."
              className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition bg-white"
            />
            {reporterType === 'unknown' && (
              <p className="text-xs text-ink-400 mt-1 font-medium">
                <i className="bi bi-info-circle mr-1"></i>
                Provide an item ID if this issue is related to a specific item.
              </p>
            )}
          </div>
        )}

        {/* Hidden item ID field for ban appeals */}
        {isBanAppeal && (
          <input type="hidden" value={itemId} />
        )}

        <div>
          <label className="block text-sm font-bold text-ink-700 mb-1.5">
            Reason <span className="text-rose-500">*</span>
          </label>
          {isBanAppeal ? (
            <div className="px-4 py-2.5 border border-primary-200 bg-primary-50 rounded-xl text-sm text-primary-700 font-extrabold shadow-sm">
              <i className="bi bi-shield-check mr-2"></i>
              Ban Appeal
            </div>
          ) : (
            <Select
              value={reason}
              onChange={setReason}
              options={supportReasons}
              placeholder="Select a reason…"
              className="w-full"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-ink-700 mb-1.5">
            Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={isBanAppeal ? 6 : 3}
            placeholder={isBanAppeal 
              ? "Please provide details about why your account should be reinstated. Include any relevant information that supports your appeal." 
              : "Add any relevant details…"
            }
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition resize-none bg-white"
            required
            minLength={isBanAppeal ? 20 : 10}
          />
          {isBanAppeal && (
            <p className="text-xs text-ink-400 mt-1 font-medium">
              <i className="bi bi-info-circle mr-1"></i>
              Minimum 20 characters. Please be as detailed as possible.
            </p>
          )}
        </div>

        {/* Helpful tips */}
        <div className={`p-3.5 rounded-xl border shadow-sm ${isBanAppeal ? 'bg-rose-50 border-rose-200/60' : 'bg-ink-50/50 border-ink-100/60'}`}>
          <p className={`text-xs flex items-start gap-1.5 font-medium ${isBanAppeal ? 'text-rose-600' : 'text-ink-500'}`}>
            <i className={`bi ${isBanAppeal ? 'bi-info-circle text-rose-500' : 'bi-lightbulb text-amber-500'} mt-0.5`}></i>
            <span>
              {isBanAppeal 
                ? 'Please provide a clear explanation of why you believe the ban should be lifted. Include any evidence or context that supports your appeal. Our team will review your case within 24-48 hours.'
                : reporterType === 'donor' 
                  ? 'Please provide as much detail as possible about the issue with the winner. This helps our team resolve the matter quickly.'
                  : reporterType === 'winner'
                  ? 'Please provide as much detail as possible about the issue with the donor. This helps our team resolve the matter quickly.'
                  : 'Please provide as much detail as possible about the issue. Including the item ID helps us resolve the matter faster.'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-ink-100">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !reason || (isBanAppeal && description.length < 20)}
          className={`flex-1 px-4 py-2.5 rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md ${
            isBanAppeal 
              ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white' 
              : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white'
          }`}
        >
          {loading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          ) : (
            <>
              <i className="bi bi-send"></i>
              {isBanAppeal ? 'Submit Appeal' : 'Submit'}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

export default SupportModal;