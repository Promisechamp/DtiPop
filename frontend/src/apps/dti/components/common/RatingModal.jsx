import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import Modal from '@/reusables/Modal';
import { ratingsAPI } from '@/services/api/dtiApi';
import { useAuth } from '@/context/AuthContext';

// ============================================================
// STAR PICKER (Unified)
// ============================================================

const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);

  const active = hover || value;

  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-4xl transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <i
            className={`bi ${
              star <= active ? 'bi-star-fill' : 'bi-star'
            } text-amber-400`}
          />
        </button>
      ))}
    </div>
  );
};

// ============================================================
// MAIN MODAL
// ============================================================

const RatingModal = () => {
  const { user } = useAuth();

  const [pending, setPending] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isOpen, setIsOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const [loading, setLoading] = useState(false);
  const [reminding, setReminding] = useState(false);

  // ----------------------------------------------------------
  // FETCH PENDING
  // ----------------------------------------------------------

  const fetchPending = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await ratingsAPI.getPending();

      const list = Array.isArray(response.data?.pending)
        ? response.data.pending
        : [];

      setPending(list);

      if (list.length > 0) {
        setCurrentIndex((previous) => Math.min(previous, list.length - 1));
        setIsOpen(true);
      } else {
        setCurrentIndex(0);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch pending ratings:', error);
    }
  }, [user?.id]);

  // ----------------------------------------------------------
  // INITIAL + POLLING
  // ----------------------------------------------------------

  useEffect(() => {
    fetchPending();

    const interval = setInterval(fetchPending, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPending();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchPending]);

  // ----------------------------------------------------------
  // RESET FORM WHEN CURRENT CHANGES
  // ----------------------------------------------------------

  useEffect(() => {
    const current = pending[currentIndex];

    if (!current) {
      setRating(0);
      setReview('');
      return;
    }

    setRating(Number(current.rating) || 0);
    setReview(current.review || '');
  }, [currentIndex, pending]);

  const current = pending[currentIndex] || null;

  // ----------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------

  const handleSubmit = async () => {
    if (!current) return;

    if (!rating) {
      toast.warning('Please select a rating.');
      return;
    }

    setLoading(true);

    try {
      await ratingsAPI.update(current.id, {
        rating: rating,
        review: review.trim(),
      });

      toast.success('Thank you! Your rating has been submitted.');

      const remaining = pending.filter((_, index) => index !== currentIndex);
      setPending(remaining);
      setRating(0);
      setReview('');

      if (remaining.length === 0) {
        setIsOpen(false);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
      }

      window.dispatchEvent(new Event('rating:updated'));
    } catch (error) {
      console.error('Submit rating failed:', error);
      toast.error(error?.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // REMIND
  // ----------------------------------------------------------

  const handleRemind = async () => {
    if (!current) return;

    setReminding(true);

    try {
      await ratingsAPI.remind(current.id, { days: 1 });

      toast.info("We'll remind you tomorrow.");

      const remaining = pending.filter((_, index) => index !== currentIndex);
      setPending(remaining);

      if (remaining.length === 0) {
        setIsOpen(false);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Remind later failed:', error);
      toast.error(error?.response?.data?.error || 'Failed to schedule reminder.');
    } finally {
      setReminding(false);
    }
  };

  // ----------------------------------------------------------
  // NO CURRENT RATING
  // ----------------------------------------------------------

  if (!current) {
    return null;
  }

  const otherUser = current.rated_user;
  const itemTitle = current.item?.title || 'your item';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Rate Your Experience"
      showCloseButton={false}
      closeOnOutsideClick={false}
      closeOnEscape={false}
      size="md"
    >
      {/* Progress */}
      {pending.length > 1 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs font-bold text-ink-400 mb-2">
            <span>Rating {currentIndex + 1} of {pending.length}</span>
            <span>{pending.length - 1} remaining</span>
          </div>

          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-brand-600 rounded-full transition-all"
              style={{
                width: `${((currentIndex + 1) / pending.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* User */}
      <div className="text-center">
        <img
          src={otherUser?.avatar_url || '/default-avatar.png'}
          alt={otherUser?.full_name || 'User'}
          className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-white shadow-sm"
        />

        <h3 className="mt-3 font-extrabold text-ink-900">
          {otherUser?.full_name || 'Your transaction partner'}
        </h3>

        <p className="text-sm text-ink-500 mt-1">
          How was your experience with them?
        </p>
      </div>

      {/* Item */}
      <div className="mt-5 flex items-center gap-3 bg-ink-50/50 rounded-xl border border-ink-100/60 p-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-ink-100">
          <i className="bi bi-box-seam text-primary-600" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
            Transaction
          </p>

          <p className="text-sm font-extrabold text-ink-700 truncate">
            {itemTitle}
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-6">
        <p className="text-sm font-bold text-ink-700 text-center mb-3">
          How would you rate this experience?
        </p>

        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Review */}
      <div className="mt-6">
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Tell them about your experience... (optional)"
          className="w-full border border-ink-200 rounded-xl p-3 text-sm text-ink-900 placeholder:text-ink-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition bg-white"
        />

        <div className="text-right text-xs font-medium text-ink-400 mt-1">
          {review.length}/5000
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 space-y-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !rating}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>

        <button
          onClick={handleRemind}
          disabled={loading || reminding}
          className="w-full py-2.5 text-sm font-bold text-ink-500 hover:text-ink-700 disabled:opacity-50 transition"
        >
          {reminding ? 'Setting reminder...' : 'Remind Me Later'}
        </button>
      </div>
    </Modal>
  );
};

export default RatingModal;