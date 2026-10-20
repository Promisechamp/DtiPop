import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Trophy,
  FileText,
  User,
  ShieldAlert,
  ShieldCheck,
  Info,
  Pencil,
  Lightbulb,
  Send,
  Loader2,
} from 'lucide-react';

import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import { supportAPI } from '@/services/api/dtiApi';
import { useAuth } from '@/context/AuthContext';

/* ============================================================
   SUPPORT REASONS — one set per role
============================================================ */

const DONOR_SUPPORT_REASONS = [
  { value: 'winner_unresponsive', label: 'Winner is unresponsive' },
  { value: 'winner_no_show', label: "Winner didn't show up for pickup" },
  {
    value: 'winner_dispute',
    label: 'Dispute with winner over item condition',
  },
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

/* ============================================================
   ROLE OPTIONS — icons as lucide components
============================================================ */

const ROLE_OPTIONS = [
  { value: 'donor', label: 'Donor', icon: Package, color: 'sky' },
  { value: 'winner', label: 'Winner', icon: Trophy, color: 'amber' },
  { value: 'applicant', label: 'Applicant', icon: FileText, color: 'orange' },
  { value: 'unknown', label: 'Just a User', icon: User, color: 'ink' },
];

/* ============================================================
   ROLE COLOR HELPERS — explicit classes (JIT-safe)
============================================================ */

const getRoleSelectedClasses = (color) => {
  const map = {
    sky: 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm',
    amber: 'border-warning-500 bg-warning-50 text-warning-700 shadow-sm',
    orange: 'border-warning-500 bg-warning-50 text-warning-700 shadow-sm',
    ink: 'border-ink-400 bg-ink-50 text-ink-700 shadow-sm',
  };
  return map[color] || map.ink;
};

const getRoleBadgeClasses = (color) => {
  const map = {
    sky: 'border-primary-200 bg-primary-50 text-primary-700',
    amber: 'border-warning-200 bg-warning-50 text-warning-700',
    orange: 'border-warning-200 bg-warning-50 text-warning-700',
    ink: 'border-ink-200 bg-ink-50 text-ink-700',
  };
  return map[color] || map.ink;
};

const getRoleIconColorClass = (color) => {
  const map = {
    sky: 'text-primary-600',
    amber: 'text-warning-600',
    orange: 'text-warning-600',
    ink: 'text-ink-600',
  };
  return map[color] || map.ink;
};

/* ============================================================
   SUPPORT MODAL
============================================================ */

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
  const [reporterType, setReporterType] = useState(
    initialReporterType || 'unknown'
  );
  const [showRoleSelector, setShowRoleSelector] = useState(
    initialReporterType === 'unknown'
  );

  /* --------------------------------------------------------
     RESET ON OPEN
  -------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    if (isBanAppeal) {
      setReason('ban_appeal');

      const banDetails = banData
        ? `Ban Reason: ${banData.reason || 'Not specified'}\nBanned On: ${
            banData.bannedAt
              ? new Date(banData.bannedAt).toLocaleDateString()
              : 'N/A'
          }\nDuration: ${
            banData.duration || 'Permanent'
          }\n\nPlease review my account ban. I would like to appeal this decision.`
        : 'I would like to appeal my account ban. Please review my case.';

      setDescription(defaultDescription || banDetails);
    } else {
      setReason(defaultReason);
      setDescription(defaultDescription);
    }

    setItemId(initialItemId || '');
    setReporterType(initialReporterType || 'unknown');
    setShowRoleSelector(initialReporterType === 'unknown');
  }, [
    isOpen,
    defaultReason,
    defaultDescription,
    initialItemId,
    initialReporterType,
    isBanAppeal,
    banData,
  ]);

  /* --------------------------------------------------------
     DERIVED
  -------------------------------------------------------- */

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

  const currentRole =
    ROLE_OPTIONS.find((r) => r.value === reporterType) || ROLE_OPTIONS[3];

  const ReporterIcon = currentRole.icon;

  const getReporterLabel = () => currentRole.label;

  const getReporterName = () =>
    profile?.full_name || user?.full_name || 'User';

  /* --------------------------------------------------------
     HANDLERS
  -------------------------------------------------------- */

  const handleRoleSelect = (roleValue) => {
    setReporterType(roleValue);
    setShowRoleSelector(false);
    setReason('');
  };

  const handleChangeRole = () => {
    setShowRoleSelector(true);
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setItemId('');
    onClose();
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
        ...(isBanAppeal &&
          banData && {
            metadata: {
              ban_appeal: true,
              ban_reason: banData.reason,
              banned_at: banData.bannedAt,
              ban_duration: banData.duration,
            },
          }),
      };

      await supportAPI.createTicket(ticketData);

      toast.success(
        isBanAppeal
          ? 'Ban appeal submitted successfully. Our team will review your case.'
          : 'Issue reported successfully. Our team will follow up shortly.'
      );

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast.error(error.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------
     HELPERS
  -------------------------------------------------------- */

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getHelpText = () => {
    if (isBanAppeal) {
      return 'Please provide a clear explanation of why you believe the ban should be lifted. Include any evidence or context that supports your appeal. Our team will review your case within 24-48 hours.';
    }

    if (reporterType === 'donor') {
      return 'Please provide as much detail as possible about the issue with the winner. This helps our team resolve the matter quickly.';
    }

    if (reporterType === 'winner') {
      return 'Please provide as much detail as possible about the issue with the donor. This helps our team resolve the matter quickly.';
    }

    return 'Please provide as much detail as possible about the issue. Including the item ID helps us resolve the matter faster.';
  };

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBanAppeal ? 'Submit Ban Appeal' : 'Report an Issue'}
      size="md"
    >
      <div className="space-y-5">
        {/* BAN APPEAL BANNER */}
        {isBanAppeal && banData && (
          <div className="flex items-start gap-4 rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <ShieldAlert size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Account Ban Details
              </p>

              <div className="mt-2 space-y-1 text-xs font-medium leading-5 text-danger-700">
                <p>
                  <span className="font-extrabold">Reason:</span>{' '}
                  {banData.reason || 'Not specified'}
                </p>
                <p>
                  <span className="font-extrabold">Banned On:</span>{' '}
                  {formatDate(banData.bannedAt)}
                </p>
                <p>
                  <span className="font-extrabold">Duration:</span>{' '}
                  {banData.duration || 'Permanent'}
                </p>
                {banData.bannedBy && (
                  <p>
                    <span className="font-extrabold">Banned By:</span>{' '}
                    {banData.bannedBy}
                  </p>
                )}
              </div>

              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-danger-600">
                <Info size={11} className="mt-0.5 shrink-0" />
                Please explain why you believe this ban should be reviewed.
              </p>
            </div>
          </div>
        )}

        {/* REPORTER BADGE */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ${getRoleIconColorClass(
                currentRole.color
              )}`}
            >
              <ReporterIcon size={14} />
            </span>

            <span className="text-xs font-bold text-ink-600">
              Reporting as:{' '}
              <span className="font-extrabold text-ink-950">
                {getReporterLabel()}
              </span>
            </span>
          </div>

          {!showRoleSelector && !isBanAppeal && (
            <button
              type="button"
              onClick={handleChangeRole}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
            >
              <Pencil size={11} />
              Change
            </button>
          )}

          {isBanAppeal && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger-200 bg-danger-50 px-2 py-0.5 text-[10px] font-extrabold text-danger-700">
              <ShieldAlert size={10} />
              Ban Appeal
            </span>
          )}
        </div>

        {/* ROLE SELECTOR — collapsible */}
        <AnimatePresence initial={false}>
          {showRoleSelector && !isBanAppeal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div>
                <label className="mb-2 block text-sm font-extrabold text-ink-700">
                  Select your role{' '}
                  <span className="text-danger-500">*</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const RoleIcon = role.icon;
                    const isSelected = reporterType === role.value;

                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleRoleSelect(role.value)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition ${
                          isSelected
                            ? getRoleSelectedClasses(role.color)
                            : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50'
                        }`}
                      >
                        <RoleIcon size={14} />
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SELECTED ROLE BADGE */}
        {!showRoleSelector && reporterType !== 'unknown' && !isBanAppeal && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${getRoleBadgeClasses(
              currentRole.color
            )}`}
          >
            <ReporterIcon size={12} />
            <span className="font-extrabold">
              Reporting as {getReporterLabel()}
            </span>
            <span className="text-ink-400">•</span>
            <span className="truncate font-medium text-ink-500">
              {getReporterName()}
            </span>
          </div>
        )}

        {/* ITEM ID */}
        {!isBanAppeal && (
          <div>
            <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
              Item ID{' '}
              {reporterType === 'unknown' && (
                <span className="text-xs font-medium text-ink-400">
                  (optional)
                </span>
              )}
            </label>

            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Enter item ID if applicable..."
              className="input-field text-sm font-medium"
            />

            {reporterType === 'unknown' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold text-ink-400">
                <Info size={11} className="mt-0.5 shrink-0" />
                Provide an item ID if this issue is related to a specific item.
              </p>
            )}
          </div>
        )}

        {isBanAppeal && <input type="hidden" value={itemId} />}

        {/* REASON */}
        <div>
          <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
            Reason <span className="text-danger-500">*</span>
          </label>

          {isBanAppeal ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-extrabold text-primary-700">
              <ShieldCheck size={15} />
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

        {/* DESCRIPTION */}
        <div>
          <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
            Description <span className="text-danger-500">*</span>
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={isBanAppeal ? 6 : 3}
            placeholder={
              isBanAppeal
                ? 'Please provide details about why your account should be reinstated. Include any relevant information that supports your appeal.'
                : 'Add any relevant details…'
            }
            required
            minLength={isBanAppeal ? 20 : 10}
            className="input-field resize-none text-sm font-medium"
          />

          {isBanAppeal && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold text-ink-400">
              <Info size={11} className="mt-0.5 shrink-0" />
              Minimum 20 characters. Please be as detailed as possible.
            </p>
          )}
        </div>

        {/* HELP TEXT */}
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            isBanAppeal
              ? 'border-danger-200 bg-danger-50'
              : 'border-ink-100 bg-ink-50/50'
          }`}
        >
          {isBanAppeal ? (
            <Info size={14} className="mt-0.5 shrink-0 text-danger-500" />
          ) : (
            <Lightbulb
              size={14}
              className="mt-0.5 shrink-0 text-warning-500"
            />
          )}

          <p
            className={`text-xs font-medium leading-5 ${
              isBanAppeal ? 'text-danger-700' : 'text-ink-500'
            }`}
          >
            {getHelpText()}
          </p>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading || !reason || (isBanAppeal && description.length < 20)
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={16} />
                {isBanAppeal ? 'Submit Appeal' : 'Submit'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SupportModal;