import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Clock,
  CheckCircle2,
  MessageCircle,
  Package,
  AlertTriangle,
  RefreshCw,
  LogIn,
  Send,
  Pencil,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ratingsAPI } from '@/services/api/dtiApi';

import Modal from '@/reusables/Modal';
import { toast } from 'sonner';

/* ============================================================
   SKELETON
============================================================ */

const RatingsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-12 w-32 animate-pulse rounded-2xl bg-ink-200" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
                <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
              </div>
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="border-b border-ink-100 bg-ink-50/50 px-4 py-3 sm:px-5">
                <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                <div className="mt-1.5 h-4 w-48 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-ink-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-ink-100" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-ink-100" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
                </div>
                <div className="h-3 w-40 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-56 animate-pulse rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const RatingPage = () => {
  const { user, isAuthenticated } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedRating, setSelectedRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  /* ---------- Group ratings by application ---------- */
  const groupByApplication = (ratings, userId) => {
    const groupsMap = {};

    ratings.forEach((r) => {
      const key = r.application_id;
      if (!groupsMap[key]) {
        groupsMap[key] = {
          application_id: key,
          item: r.item,
          myRating: null,
          theirRating: null,
          otherUser: null,
        };
      }

      if (r.rater_id === userId) {
        groupsMap[key].myRating = r;
        groupsMap[key].otherUser = r.rated_user;
      } else if (r.rated_user_id === userId) {
        groupsMap[key].theirRating = r;
        if (!groupsMap[key].otherUser) {
          groupsMap[key].otherUser = r.rater;
        }
      }
    });

    return Object.values(groupsMap).sort((a, b) => {
      const dateA = a.myRating?.created_at || a.theirRating?.created_at || '';
      const dateB = b.myRating?.created_at || b.theirRating?.created_at || '';
      return new Date(dateB) - new Date(dateA);
    });
  };

  /* ---------- Fetch ratings ---------- */
  const fetchRatings = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const givenRes = await ratingsAPI.getUserRatings(user.id, 'rater');
        const receivedRes = await ratingsAPI.getUserRatings(user.id, 'rated');
        const pendingRes = await ratingsAPI.getPending();

        const given = givenRes.data?.ratings ?? [];
        const received = receivedRes.data?.ratings ?? [];
        const pending = pendingRes.data?.pending ?? [];

        const allMap = new Map();
        [...given, ...received, ...pending].forEach((r) => {
          if (!allMap.has(r.id)) allMap.set(r.id, r);
        });
        const all = Array.from(allMap.values());

        const grouped = groupByApplication(all, user.id);
        setGroups(grouped);
      } catch (err) {
        console.error('Fetch ratings error:', err);
        setError(err.message || 'Failed to load ratings.');
        toast.error('Failed to load ratings');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, isAuthenticated]
  );

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const openRating = (rating) => {
    setSelectedRating(rating);
    setShowRatingModal(true);
  };

  const closeRating = () => {
    setShowRatingModal(false);
    setSelectedRating(null);
  };

  const handleRatingSaved = () => {
    closeRating();
    fetchRatings(true);
  };

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const total = groups.length;
    let pending = 0;
    let published = 0;
    let needsReply = 0;

    groups.forEach((group) => {
      if (group.myRating?.status === 'pending' || !group.myRating?.rating) {
        pending += 1;
      } else if (group.myRating?.status === 'published') {
        published += 1;
      }
      if (
        group.theirRating?.status === 'published' &&
        !group.theirRating?.reply_text
      ) {
        needsReply += 1;
      }
    });

    return { total, pending, published, needsReply };
  }, [groups]);

  /* ---------- Helpers ---------- */
  const getUserName = (profile) => {
    if (!profile) return 'User';
    return profile.full_name || profile.username || profile.email || 'User';
  };

  const getAvatar = (profile) => profile?.avatar_url || null;

  const getInitials = (profile) => {
    const name = getUserName(profile);
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  };

  const renderAvatar = (profile, size = 'normal') => {
    const sizeClass = size === 'small' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

    if (getAvatar(profile)) {
      return (
        <img
          src={getAvatar(profile)}
          alt={getUserName(profile)}
          className={`${sizeClass} rounded-full border border-ink-100 object-cover shadow-sm`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full border border-ink-200 bg-ink-50 font-black text-ink-600`}
      >
        {getInitials(profile)}
      </div>
    );
  };

  const renderStars = (rating, interactive = false, value = 0, setValue) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = interactive
            ? star <= value
            : star <= Number(rating || 0);

          return (
            <button
              key={star}
              type={interactive ? 'button' : undefined}
              onClick={interactive ? () => setValue?.(star) : undefined}
              disabled={!interactive}
              className={`transition ${
                interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              }`}
              aria-label={interactive ? `Rate ${star} stars` : undefined}
            >
              <Star
                size={interactive ? 27 : 16}
                className={
                  active ? 'text-warning-500' : 'text-ink-300'
                }
                fill={active ? 'currentColor' : 'none'}
                strokeWidth={active ? 1.5 : 2}
              />
            </button>
          );
        })}
      </div>
    );
  };

  /* ---------- Render one group card ---------- */
  const renderGroupCard = (group) => {
    const { item, otherUser, myRating, theirRating } = group;

    const isMyRatingPending =
      myRating?.status === 'pending' && !myRating?.rating;
    const isTheirRatingPublished = theirRating?.status === 'published';

    return (
      <div
        key={group.application_id}
        className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
      >
        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-3 sm:px-5">
          <Package size={16} className="shrink-0 text-ink-500" />

          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
              Donation
            </p>

            <p className="truncate text-sm font-black text-ink-950">
              {item?.title || 'Completed donation'}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* MY RATING */}
          <div className={theirRating ? 'border-b border-ink-100 pb-4' : ''}>
            <div className="mb-2 flex items-center gap-3">
              {renderAvatar(otherUser, 'small')}

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink-950">
                  You → {getUserName(otherUser)}
                </p>

                <p className="text-xs font-bold text-ink-500">Your review</p>
              </div>

              {isMyRatingPending ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[10px] font-extrabold text-warning-700">
                  <Clock size={11} />
                  Pending
                </span>
              ) : myRating?.rating ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-[10px] font-extrabold text-success-700">
                  <CheckCircle2 size={11} />
                  Published
                </span>
              ) : null}
            </div>

            {isMyRatingPending ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-500">
                  You haven't rated yet.
                </p>

                <button
                  type="button"
                  onClick={() => openRating(myRating)}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <Star size={13} fill="currentColor" />
                  Rate {getUserName(otherUser)}
                </button>
              </div>
            ) : myRating?.rating ? (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {renderStars(myRating.rating)}
                </div>

                {myRating.review && (
                  <p className="text-sm font-medium text-ink-700">
                    {myRating.review}
                  </p>
                )}

                <p className="mt-1 text-xs font-bold text-ink-400">
                  {new Date(myRating.created_at).toLocaleDateString()}
                </p>

                <button
                  type="button"
                  onClick={() => openRating(myRating)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              </div>
            ) : null}
          </div>

          {/* THEIR RATING */}
          {isTheirRatingPublished && (
            <div className="pt-4">
              <div className="mb-2 flex items-center gap-3">
                {renderAvatar(theirRating.rater || otherUser, 'small')}

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink-950">
                    {getUserName(theirRating.rater || otherUser)} → You
                  </p>

                  <p className="text-xs font-bold text-ink-500">
                    Review received
                  </p>
                </div>

                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-[10px] font-extrabold text-success-700">
                  <CheckCircle2 size={11} />
                  Published
                </span>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  {renderStars(theirRating.rating)}
                </div>

                {theirRating.review && (
                  <p className="text-sm font-medium text-ink-700">
                    {theirRating.review}
                  </p>
                )}

                <p className="mt-1 text-xs font-bold text-ink-400">
                  {new Date(theirRating.created_at).toLocaleDateString()}
                </p>

                <button
                  type="button"
                  onClick={() => openRating(theirRating)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  <MessageCircle size={11} />
                  {theirRating.reply_text ? 'Edit reply' : 'Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ---------- UNAUTHENTICATED ---------- */
  if (!isAuthenticated) {
    return (
      <div className="min-h-full bg-transparent">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Star size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Sign in to view ratings
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                See what others say about you and share your experience.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- LOADING ---------- */
  if (loading) {
    return <RatingsSkeleton />;
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Star size={14} />
                <span>Your community feedback</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Ratings & Reviews
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                {groups.length} {groups.length === 1 ? 'rating' : 'ratings'}{' '}
                received
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchRatings(true)}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-3 text-sm font-extrabold text-ink-700 shadow-sm transition hover:bg-ink-50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'animate-spin' : ''}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Ratings"
            value={stats.total}
            icon={Star}
            tone="primary"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            tone="warning"
          />

          <StatCard
            label="Published"
            value={stats.published}
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            label="Needs Reply"
            value={stats.needsReply}
            icon={MessageCircle}
            tone="ink"
          />
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Something went wrong
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => fetchRatings()}
                className="mt-3 text-xs font-extrabold text-danger-800 underline transition hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && groups.length === 0 && (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Star size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                No ratings yet
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Ratings will appear here after you complete a donation.
              </p>
            </div>
          </div>
        )}

        {/* RATINGS LIST */}
        {groups.length > 0 && (
          <div className="space-y-4">{groups.map(renderGroupCard)}</div>
        )}
      </div>

      {/* RATING MODAL */}
      {showRatingModal && selectedRating && (
        <RatingModal
          rating={selectedRating}
          user={user}
          onClose={closeRating}
          onSaved={handleRatingSaved}
          getUserName={getUserName}
          renderAvatar={renderAvatar}
          renderStars={renderStars}
        />
      )}
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({ label, value, icon: Icon, tone = 'ink' }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
  };
  const style = tones[tone] || tones.ink;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold text-ink-500">{label}</p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
        >
          <Icon size={15} className={style.color} />
        </span>
      </div>

      <p className={`mt-2 text-2xl font-black tracking-tight ${style.color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ============================================================
   RATING MODAL
============================================================ */

const RatingModal = ({
  rating,
  user,
  onClose,
  onSaved,
  getUserName,
  renderAvatar,
  renderStars,
}) => {
  const [score, setScore] = useState(rating.rating || 0);
  const [review, setReview] = useState(rating.review || '');
  const [reply, setReply] = useState(rating.reply_text || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnReview = rating.rater_id === user?.id;
  const isBeingReviewed = rating.rated_user_id === user?.id;
  const isPending = rating.status === 'pending' || !rating.rating;

  const submitRating = async () => {
    try {
      setLoading(true);
      setError('');

      if (score < 1 || score > 5) {
        setError('Please select a rating from 1 to 5 stars.');
        return;
      }
      if (!review.trim()) {
        setError('Please write a short review.');
        return;
      }

      await ratingsAPI.update(rating.id, {
        rating: score,
        review: review.trim(),
      });

      toast.success('Rating submitted successfully!');
      onSaved();
    } catch (err) {
      console.error('Submit rating error:', err);
      setError(err.message || 'Failed to save rating.');
      toast.error('Failed to save rating');
    } finally {
      setLoading(false);
    }
  };

  const submitReply = async () => {
    try {
      setLoading(true);
      setError('');

      if (!reply.trim()) {
        setError('Please write a reply.');
        return;
      }

      await ratingsAPI.reply(rating.id, reply.trim());
      toast.success('Reply submitted successfully!');
      onSaved();
    } catch (err) {
      console.error('Submit reply error:', err);
      setError(err.message || 'Failed to save reply.');
      toast.error('Failed to save reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        isPending
          ? 'Leave a review'
          : isBeingReviewed
          ? 'Reply to review'
          : 'Edit your review'
      }
      size="md"
    >
      <div className="space-y-6">
        {(isPending || isOwnReview) && (
          <>
            <div className="flex items-center gap-3">
              {renderAvatar(rating.rated_user)}

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink-950">
                  {getUserName(rating.rated_user)}
                </p>

                <p className="text-xs font-bold text-ink-500">
                  How was your experience?
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center py-2">
              {renderStars(score, true, score, setScore)}

              <p className="mt-3 text-sm font-bold text-ink-500">
                {score === 0
                  ? 'Select a rating'
                  : score === 1
                  ? 'Poor'
                  : score === 2
                  ? 'Could be better'
                  : score === 3
                  ? 'Good'
                  : score === 4
                  ? 'Very good'
                  : 'Excellent'}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Your review
              </label>

              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Tell others about your experience..."
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />

              <div className="mt-1 text-right text-xs font-bold text-ink-400">
                {review.length}/1000
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitRating}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {isOwnReview ? 'Update Review' : 'Publish Review'}
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {isBeingReviewed && !isPending && (
          <>
            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <div className="flex items-start gap-3">
                {renderAvatar(rating.rater, 'small')}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink-950">
                    {getUserName(rating.rater)}
                  </p>

                  <div className="mt-1">{renderStars(rating.rating)}</div>

                  {rating.review && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-ink-700">
                      {rating.review}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                Your reply
              </label>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Say something nice..."
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />

              <div className="mt-1 text-right text-xs font-bold text-ink-400">
                {reply.length}/500
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitReply}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    {rating.reply_text ? 'Update Reply' : 'Post Reply'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RatingPage;