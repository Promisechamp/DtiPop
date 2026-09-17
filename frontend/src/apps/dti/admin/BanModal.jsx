import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';

const BanModal = ({
  isOpen,
  onClose,
  user,
  onBan,
  onUnban,
  loading = false,
  title = 'Ban User',
  size = 'md',
}) => {
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [customDays, setCustomDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setBanReason(user.ban_reason || '');
      setBanDuration('permanent');
      setCustomDays(7);
    }
  }, [isOpen, user]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    // If banning, validate reason
    if (user.ban_status !== 'banned' && !banReason.trim()) {
      toast.error('Please provide a reason for banning');
      return;
    }

    setIsSubmitting(true);
    try {
      const banStatus = user.ban_status === 'banned' ? 'active' : 'banned';
      
      let banData = {
        ban_status: banStatus,
        reason: banReason,
      };

      // If banning, include duration
      if (banStatus === 'banned') {
        let durationValue = banDuration;
        if (banDuration === 'custom') {
          durationValue = customDays.toString();
        }
        banData.duration = durationValue;
      }

      if (banStatus === 'banned') {
        await onBan?.(user.id, banData);
      } else {
        await onUnban?.(user.id, banData);
      }

      onClose();
    } catch (error) {
      console.error('Ban action error:', error);
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBanReason('');
    setBanDuration('permanent');
    setCustomDays(7);
    onClose();
  };

  if (!user) return null;

  const isBanned = user.ban_status === 'banned';

  // Duration options for Select
  const durationOptions = [
    { value: 'permanent', label: 'Permanent' },
    { value: '1', label: '1 Day' },
    { value: '3', label: '3 Days' },
    { value: '7', label: '7 Days' },
    { value: '14', label: '14 Days' },
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBanned ? 'Unban User' : title}
      size={size}
    >
      <div className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-ink-50/50 rounded-xl border border-ink-100/60 shadow-sm">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.full_name || 'User'} 
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-ink-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center shrink-0 border border-ink-200">
              <i className="bi bi-person text-ink-500"></i>
            </div>
          )}
          <div>
            <p className="text-sm font-extrabold text-ink-900">
              {user.full_name || 'Anonymous'}
            </p>
            <p className="text-xs font-medium text-ink-500">{user.email || 'No email'}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${
          isBanned ? 'bg-rose-50 border-rose-200/60' : 'bg-emerald-50 border-emerald-200/60'
        }`}>
          <i className={`bi ${isBanned ? 'bi-person-x text-rose-500' : 'bi-person-check text-emerald-500'}`}></i>
          <span className={`text-sm font-extrabold ${isBanned ? 'text-rose-700' : 'text-emerald-700'}`}>
            {isBanned ? 'Currently Banned' : 'Currently Active'}
          </span>
          {isBanned && user.ban_count > 0 && (
            <span className="text-xs font-bold text-rose-400 ml-auto">
              Ban #{user.ban_count}
            </span>
          )}
        </div>

        {/* Ban History Warning */}
        {!isBanned && user.ban_count > 0 && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 shadow-sm">
            <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
              <i className="bi bi-exclamation-triangle"></i>
              This user has been banned {user.ban_count} time{user.ban_count > 1 ? 's' : ''} before.
              {user.ban_count >= 3 && ' Multiple violations may result in permanent suspension.'}
            </p>
          </div>
        )}

        {/* Current Ban Details (if banned) */}
        {isBanned && (
          <div className="bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 space-y-1 shadow-sm">
            <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider">Current Ban Details</p>
            <p className="text-sm font-bold text-ink-700">
              <span className="font-extrabold">Reason:</span> {user.ban_reason || 'No reason provided'}
            </p>
            {user.banned_at && (
              <p className="text-xs font-medium text-ink-500">
                <span className="font-extrabold">Banned at:</span> {formatDate(user.banned_at)}
              </p>
            )}
            {user.ban_duration && user.ban_duration !== 'permanent' && (
              <p className="text-xs font-medium text-ink-500">
                <span className="font-extrabold">Duration:</span> {user.ban_duration}
              </p>
            )}
            {user.banned_until && user.ban_duration !== 'permanent' && (
              <p className="text-xs font-bold text-sky-600">
                <span className="font-extrabold">Auto-unban:</span> {formatDate(user.banned_until)}
              </p>
            )}
            {user.banned_by_name && (
              <p className="text-xs font-medium text-ink-500">
                <span className="font-extrabold">Banned by:</span> {user.banned_by_name}
              </p>
            )}
          </div>
        )}

        {/* Ban Form (if not banned) */}
        {!isBanned && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">
                Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning..."
                className="w-full px-3 py-2 border border-ink-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="text-sm font-extrabold text-ink-700 block mb-1">
                Duration
              </label>
              <Select
                value={banDuration}
                onChange={(value) => setBanDuration(value)}
                options={durationOptions}
                placeholder="Select duration"
                showIcon={false}
                className="w-full"
              />
            </div>

            {banDuration === 'custom' && (
              <div>
                <label className="text-sm font-extrabold text-ink-700 block mb-1">
                  Number of Days
                </label>
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-ink-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white transition shadow-sm"
                />
                <p className="text-xs font-medium text-ink-400 mt-1">
                  User will be automatically unbanned after {customDays} days
                </p>
              </div>
            )}

            {banDuration !== 'permanent' && banDuration !== 'custom' && (
              <div className="bg-sky-50 border border-sky-200/60 rounded-xl p-3 shadow-sm">
                <p className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
                  <i className="bi bi-info-circle"></i>
                  This user will be automatically unbanned after {banDuration} day{parseInt(banDuration) > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {user.ban_count > 0 && (
              <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 shadow-sm">
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <i className="bi bi-exclamation-triangle"></i>
                  This is ban #{user.ban_count + 1} for this user. 
                  {user.ban_count >= 2 && ' Repeat bans may result in permanent suspension.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Unban Confirmation */}
        {isBanned && (
          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3 shadow-sm">
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
              <i className="bi bi-info-circle"></i>
              Are you sure you want to unban this user? They will regain full access to the platform.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isSubmitting || loading}
            className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loading || (!isBanned && !banReason.trim())}
            className={`flex-1 px-4 py-2 rounded-xl font-extrabold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isBanned
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md text-white'
                : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white'
            }`}
          >
            {isSubmitting || loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
            ) : (
              <>
                <i className={`bi ${isBanned ? 'bi-person-check' : 'bi-person-x'}`}></i>
                {isBanned ? 'Unban User' : 'Ban User'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BanModal;