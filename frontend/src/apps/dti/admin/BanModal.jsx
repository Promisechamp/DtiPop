// src/admin/BanModal.jsx

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  User,
  UserX,
  UserCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';

import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';

/* ============================================================
   BAN MODAL
============================================================ */

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

  /* Reset form when modal opens or user changes */
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
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    /* If banning, validate reason */
    if (user.ban_status !== 'banned' && !banReason.trim()) {
      toast.error('Please provide a reason for banning');
      return;
    }

    setIsSubmitting(true);

    try {
      const banStatus = user.ban_status === 'banned' ? 'active' : 'banned';

      const banData = {
        ban_status: banStatus,
        reason: banReason,
      };

      /* If banning, include duration */
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
  const isBusy = isSubmitting || loading;

  /* Duration options for Select */
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
        {/* USER INFO */}
        <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || 'User'}
              className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-400">
              <User size={16} />
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink-950">
              {user.full_name || 'Anonymous'}
            </p>

            <p className="truncate text-[11px] font-bold text-ink-400">
              {user.email || 'No email'}
            </p>
          </div>
        </div>

        {/* STATUS BADGE */}
        <div
          className={`flex items-center gap-2 rounded-2xl border p-3 ${
            isBanned
              ? 'border-danger-200 bg-danger-50'
              : 'border-success-200 bg-success-50'
          }`}
        >
          {isBanned ? (
            <UserX size={15} className="shrink-0 text-danger-600" />
          ) : (
            <UserCheck size={15} className="shrink-0 text-success-600" />
          )}

          <span
            className={`text-sm font-extrabold ${
              isBanned ? 'text-danger-900' : 'text-success-700'
            }`}
          >
            {isBanned ? 'Currently Banned' : 'Currently Active'}
          </span>

          {isBanned && user.ban_count > 0 && (
            <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-danger-500">
              Ban #{user.ban_count}
            </span>
          )}
        </div>

        {/* BAN HISTORY WARNING */}
        {!isBanned && user.ban_count > 0 && (
          <div className="flex items-start gap-2 rounded-2xl border border-warning-200 bg-warning-50 p-3">
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-warning-600"
            />

            <p className="text-[11px] font-bold leading-5 text-warning-700">
              This user has been banned{' '}
              <span className="font-extrabold">{user.ban_count}</span>{' '}
              time{user.ban_count > 1 ? 's' : ''} before.
              {user.ban_count >= 3 &&
                ' Multiple violations may result in permanent suspension.'}
            </p>
          </div>
        )}

        {/* CURRENT BAN DETAILS */}
        {isBanned && (
          <div className="space-y-1.5 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
              Current Ban Details
            </p>

            <p className="text-sm font-bold text-ink-700">
              <span className="font-extrabold text-ink-950">Reason:</span>{' '}
              {user.ban_reason || 'No reason provided'}
            </p>

            {user.banned_at && (
              <p className="text-[11px] font-bold text-ink-500">
                <span className="font-extrabold text-ink-700">
                  Banned at:
                </span>{' '}
                {formatDate(user.banned_at)}
              </p>
            )}

            {user.ban_duration && user.ban_duration !== 'permanent' && (
              <p className="text-[11px] font-bold text-ink-500">
                <span className="font-extrabold text-ink-700">Duration:</span>{' '}
                {user.ban_duration}
              </p>
            )}

            {user.banned_until && user.ban_duration !== 'permanent' && (
              <p className="text-[11px] font-extrabold text-primary-600">
                <span className="font-extrabold text-ink-700">
                  Auto-unban:
                </span>{' '}
                {formatDate(user.banned_until)}
              </p>
            )}

            {user.banned_by_name && (
              <p className="text-[11px] font-bold text-ink-500">
                <span className="font-extrabold text-ink-700">
                  Banned by:
                </span>{' '}
                {user.banned_by_name}
              </p>
            )}
          </div>
        )}

        {/* BAN FORM */}
        {!isBanned && (
          <div className="space-y-4">
            <div>
              <label className="label">
                Reason <span className="text-danger-500">*</span>
              </label>

              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning..."
                className="input-field resize-none"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="label">Duration</label>

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
                <label className="label">Number of Days</label>

                <input
                  type="number"
                  value={customDays}
                  onChange={(e) =>
                    setCustomDays(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max="365"
                  className="input-field"
                />

                <p className="mt-1 text-[11px] font-bold text-ink-400">
                  User will be automatically unbanned after {customDays} days
                </p>
              </div>
            )}

            {banDuration !== 'permanent' && banDuration !== 'custom' && (
              <div className="flex items-start gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-3">
                <Info
                  size={14}
                  className="mt-0.5 shrink-0 text-primary-600"
                />

                <p className="text-[11px] font-bold leading-5 text-primary-700">
                  This user will be automatically unbanned after{' '}
                  {banDuration} day{parseInt(banDuration) > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {user.ban_count > 0 && (
              <div className="flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-3">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0 text-danger-600"
                />

                <p className="text-[11px] font-bold leading-5 text-danger-700">
                  This is ban #{user.ban_count + 1} for this user.
                  {user.ban_count >= 2 &&
                    ' Repeat bans may result in permanent suspension.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* UNBAN CONFIRMATION */}
        {isBanned && (
          <div className="flex items-start gap-2 rounded-2xl border border-success-200 bg-success-50 p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-success-600" />

            <p className="text-[11px] font-bold leading-5 text-success-700">
              Are you sure you want to unban this user? They will regain full
              access to the platform.
            </p>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy || (!isBanned && !banReason.trim())}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isBanned
                ? 'bg-success-600 hover:bg-success-700'
                : 'bg-danger-600 hover:bg-danger-700'
            }`}
          >
            {isBusy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {isBanned ? 'Unbanning...' : 'Banning...'}
              </>
            ) : isBanned ? (
              <>
                <UserCheck size={15} />
                Unban User
              </>
            ) : (
              <>
                <UserX size={15} />
                Ban User
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BanModal;