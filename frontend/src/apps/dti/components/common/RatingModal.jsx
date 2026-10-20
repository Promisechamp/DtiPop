import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Star, Package, Loader2 } from 'lucide-react';

import Modal from '@/reusables/Modal';
import { ratingsAPI } from '@/services/api/dtiApi';
import { useAuth } from '@/context/AuthContext';

/* ============================================================
   STAR PICKER
============================================================ */

const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);

  const active = hover || value;

  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= active;

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            className="flex h-11 w-11 items-center justify-center rounded-2xl transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            <Star
              size={32}
              fill={isActive ? 'currentColor' : 'none'}
              className={
                isActive ? 'text-warning-500' : 'text-ink-300'
              }
              strokeWidth={isActive ? 1.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
};

/* ============================================================
   MAIN MODAL
============================================================ */

const RatingModal = () => {
  const { user } = useAuth();

  const [pending, setPending] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isOpen, setIsOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const [loading, setLoading] = useState(false);
  const [reminding, setReminding] = useState(false);

  /* --------------------------------------------------------
     FETCH PENDING
  -------------------------------------------------------- */

  const fetchPending = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await ratingsAPI.getPending();

      const list = Array.isArray(response.data?.pending)
        ? response.data.pending
        : [];

      setPending(list);

      if (list.length > 0) {
        setCurrentIndex((previous) =>
          Math.min(previous, list.length - 1)
        );
        setIsOpen(true);
      } else {
        setCurrentIndex(0);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch pending ratings:', error);
    }
  }, [user?.id]);

  /* --------------------------------------------------------
     INITIAL + POLLING
  -------------------------------------------------------- */

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

  /* --------------------------------------------------------
     RESET FORM WHEN CURRENT CHANGES
  -------------------------------------------------------- */

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

  /* --------------------------------------------------------
     SUBMIT
  -------------------------------------------------------- */

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

      const remaining = pending.filter(
        (_, index) => index !== currentIndex
      );

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
      toast.error(
        error?.response?.data?.error || 'Failed to submit rating.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------
     REMIND
  -------------------------------------------------------- */

  const handleRemind = async () => {
    if (!current) return;

    setReminding(true);

    try {
      await ratingsAPI.remind(current.id, { days: 1 });

      toast.info("We'll remind you tomorrow.");

      const remaining = pending.filter(
        (_, index) => index !== currentIndex
      );

      setPending(remaining);

      if (remaining.length === 0) {
        setIsOpen(false);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Remind later failed:', error);
      toast.error(
        error?.response?.data?.error ||
          'Failed to schedule reminder.'
      );
    } finally {
      setReminding(false);
    }
  };

  /* --------------------------------------------------------
     NO CURRENT RATING
  -------------------------------------------------------- */

  if (!current) {
    return null;
  }

  const otherUser = current.rated_user;
  const itemTitle = current.item?.title || 'your item';

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

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
      <div className="space-y-6">
        {/* PROGRESS */}
        {pending.length > 1 && (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-ink-400">
              <span>
                Rating {currentIndex + 1} of {pending.length}
              </span>
              <span>{pending.length - 1} remaining</span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{
                  width: `${((currentIndex + 1) / pending.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* USER */}
        <div className="text-center">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name || 'User'}
              className="mx-auto h-16 w-16 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-ink-100 text-ink-400 shadow-sm">
              <Star size={22} />
            </div>
          )}

          <h3 className="mt-3 text-base font-black text-ink-950">
            {otherUser?.full_name || 'Your transaction partner'}
          </h3>

          <p className="mt-1 text-sm font-medium text-ink-500">
            How was your experience with them?
          </p>
        </div>

        {/* ITEM */}
        <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-100 bg-white text-primary-600 shadow-sm">
            <Package size={16} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
              Transaction
            </p>

            <p className="truncate text-sm font-extrabold text-ink-800">
              {itemTitle}
            </p>
          </div>
        </div>

        {/* RATING */}
        <div>
          <p className="mb-3 text-center text-sm font-extrabold text-ink-700">
            How would you rate this experience?
          </p>

          <StarPicker value={rating} onChange={setRating} />
        </div>

        {/* REVIEW */}
        <div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Tell them about your experience... (optional)"
            className="input-field resize-none text-sm font-medium"
          />

          <div className="mt-1 text-right text-xs font-bold text-ink-400">
            {review.length}/5000
          </div>
        </div>

        {/* BUTTONS */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !rating}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rating'
            )}
          </button>

          <button
            type="button"
            onClick={handleRemind}
            disabled={loading || reminding}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-ink-500 transition hover:bg-ink-50 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reminding ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Setting reminder...
              </>
            ) : (
              'Remind Me Later'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RatingModal;