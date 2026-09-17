import React, { useEffect, useState, useCallback, useMemo} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ratingsAPI } from '@/services/api/dtiApi';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import Modal from '@/reusables/Modal';

// ============================================================
// Skeleton
// ============================================================
const RatingsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2">
    <PageNavigationSkeleton />

    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="animate-pulse">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-ink-200" />
            <div className="h-3 w-40 rounded bg-ink-200" />
          </div>
          <div className="h-9 w-48 rounded bg-ink-200" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-ink-200" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-ink-200 animate-pulse" />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm">
            <div className="animate-pulse">
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-20 rounded bg-ink-200" />
                <div className="h-9 w-9 rounded-xl bg-ink-200" />
              </div>
              <div className="mt-2 h-8 w-12 rounded bg-ink-200" />
            </div>
          </div>
        ))}
      </div>

      {/* RATINGS LIST */}
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-ink-100/80 bg-white shadow-sm overflow-hidden">
            <div className="p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-ink-200" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-ink-200" />
                  <div className="h-3 w-24 rounded bg-ink-200 mt-1" />
                </div>
                <div className="h-6 w-16 rounded-full bg-ink-200" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-ink-200" />
                <div className="h-3 w-56 rounded bg-ink-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const RatingPage = () => {
  const { user, isAuthenticated } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedRating, setSelectedRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // ---------- Group ratings by application ----------
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

  // ---------- Fetch ratings ----------
  const fetchRatings = useCallback(async (isRefresh = false) => {
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
  }, [user, isAuthenticated]);

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

  // Stats
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
      if (group.theirRating?.status === 'published' && !group.theirRating?.reply_text) {
        needsReply += 1;
      }
    });

    return { total, pending, published, needsReply };
  }, [groups]);

  // ---------- Helper functions ----------
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
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  const renderAvatar = (profile, size = 'normal') => {
    const sizeClass = size === 'small'
      ? 'w-8 h-8 text-xs'
      : 'w-10 h-10 text-sm';

    if (getAvatar(profile)) {
      return (
        <img
          src={getAvatar(profile)}
          alt={getUserName(profile)}
          className={`${sizeClass} rounded-full object-cover border border-ink-100 shadow-sm`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-ink-50 text-ink-600 flex items-center justify-center font-bold border border-ink-200`}
      >
        {getInitials(profile)}
      </div>
    );
  };

  const renderStars = (rating, interactive = false, value = 0, setValue) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
          const active = interactive
            ? star <= value
            : star <= Number(rating || 0);

          return (
            <button
              key={star}
              type={interactive ? 'button' : undefined}
              onClick={interactive ? () => setValue?.(star) : undefined}
              disabled={!interactive}
              className={`transition ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            >
              <i
                className={`bi ${active ? 'bi-star-fill text-amber-400' : 'bi-star text-ink-300'}`}
                style={{ fontSize: interactive ? '27px' : '16px' }}
              />
            </button>
          );
        })}
      </div>
    );
  };

  // ---------- Render one group card ----------
  const renderGroupCard = (group) => {
    const { item, otherUser, myRating, theirRating } = group;

    const isMyRatingPending = myRating?.status === 'pending' && !myRating?.rating;
    const isTheirRatingPublished = theirRating?.status === 'published';

    return (
      <div key={group.application_id} className="rounded-2xl border border-ink-100/80 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 bg-ink-50/50 border-b border-ink-100 flex items-center gap-3">
          <i className="bi bi-box-seam text-ink-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">Donation</p>
            <p className="font-extrabold text-sm text-ink-800 truncate">
              {item?.title || 'Completed donation'}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* My rating – ALWAYS shown with the OTHER person's info */}
          <div className={theirRating ? 'border-b border-ink-100 pb-4' : ''}>
            <div className="flex items-center gap-3 mb-2">
              {renderAvatar(otherUser, 'small')}
              <div>
                <p className="font-extrabold text-sm text-ink-900">
                  You → {getUserName(otherUser)}
                </p>
                <p className="text-xs text-ink-500">Your review</p>
              </div>
              {isMyRatingPending ? (
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/60">
                  <i className="bi bi-clock" /> Pending
                </span>
              ) : myRating?.rating ? (
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                  <i className="bi bi-check-circle-fill" /> Published
                </span>
              ) : null}
            </div>

            {isMyRatingPending ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">You haven't rated yet.</p>
                <button
                  onClick={() => openRating(myRating)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white text-sm font-bold transition"
                >
                  Rate {getUserName(otherUser)}
                </button>
              </div>
            ) : myRating?.rating ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {renderStars(myRating.rating)}
                </div>
                {myRating.review && (
                  <p className="text-sm text-ink-700">{myRating.review}</p>
                )}
                <p className="text-xs text-ink-400 mt-1">
                  {new Date(myRating.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => openRating(myRating)}
                  className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
                >
                  <i className="bi bi-pencil-square mr-1" /> Edit
                </button>
              </div>
            ) : null}
          </div>

          {/* Their rating – ONLY if published */}
          {isTheirRatingPublished && (
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-2">
                {renderAvatar(theirRating.rater || otherUser, 'small')}
                <div>
                  <p className="font-extrabold text-sm text-ink-900">
                    {getUserName(theirRating.rater || otherUser)} → You
                  </p>
                  <p className="text-xs text-ink-500">Review received</p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                  <i className="bi bi-check-circle-fill" /> Published
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  {renderStars(theirRating.rating)}
                </div>
                {theirRating.review && (
                  <p className="text-sm text-ink-700">{theirRating.review}</p>
                )}
                <p className="text-xs text-ink-400 mt-1">
                  {new Date(theirRating.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => openRating(theirRating)}
                  className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 transition"
                >
                  <i className="bi bi-chat-dots mr-1" />
                  {theirRating.reply_text ? 'Edit reply' : 'Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2">
        <PageNavigation />
        <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
              <i className="bi bi-star text-2xl" />
            </div>
            <h3 className="text-lg font-extrabold text-ink-800">Sign in to View Ratings</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              See what others say about you and share your experience.
            </p>
            <Link
              to="/login"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <i className="bi bi-box-arrow-in-right" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <RatingsSkeleton />;

  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      <PageNavigation />

      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                Your community feedback
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
              Ratings & Reviews
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {groups.length} {groups.length === 1 ? 'rating' : 'ratings'} received
            </p>
          </div>

          <button
            onClick={() => fetchRatings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-100/80 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 hover:shadow-md disabled:opacity-50"
          >
            <i className={`bi bi-arrow-repeat ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Ratings" value={stats.total} icon="bi-star" color="text-primary-600" bg="bg-primary-50" />
          <StatCard label="Pending" value={stats.pending} icon="bi-clock" color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Published" value={stats.published} icon="bi-check-circle-fill" color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Needs Reply" value={stats.needsReply} icon="bi-chat-dots" color="text-blue-600" bg="bg-blue-50" />
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 shadow-sm">
            <i className="bi bi-exclamation-triangle text-rose-500 text-lg mt-0.5" />
            <div>
              <p className="font-bold text-rose-800">Something went wrong</p>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
              <button
                onClick={() => fetchRatings()}
                className="mt-3 text-sm font-extrabold text-rose-800 underline hover:no-underline transition"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && groups.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-star text-2xl" />
              </div>
              <h3 className="text-lg font-extrabold text-ink-800">No ratings yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
                Ratings will appear here after you complete a donation.
              </p>
            </div>
          </div>
        )}

        {/* RATINGS LIST */}
        {groups.length > 0 && (
          <div className="space-y-4">
            {groups.map(renderGroupCard)}
          </div>
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

// ============================================================
// Stat Card
// ============================================================
function StatCard({ label, value, icon, color = 'text-ink-700', bg = 'bg-ink-50' }) {
  return (
    <div className="group rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
          <i className={`bi ${icon} ${color} text-sm`} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.03em] ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ============================================================
// RATING MODAL (Unified Design)
// ============================================================
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
      title={isPending ? 'Leave a review' : isBeingReviewed ? 'Reply to review' : 'Edit your review'}
      size="md"
    >
      <div className="space-y-6">
        {(isPending || isOwnReview) && (
          <>
            <div className="flex items-center gap-3">
              {renderAvatar(rating.rated_user)}
              <div>
                <p className="font-extrabold text-ink-900">
                  {getUserName(rating.rated_user)}
                </p>
                <p className="text-xs text-ink-500">How was your experience?</p>
              </div>
            </div>

            <div className="flex flex-col items-center py-2">
              {renderStars(score, true, score, setScore)}
              <p className="text-sm text-ink-500 mt-3 font-medium">
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
              <label className="block text-sm font-bold text-ink-700 mb-1.5">
                Your review
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Tell others about your experience..."
                className="w-full resize-none rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
              />
              <div className="text-right text-xs text-ink-400 mt-1 font-medium">
                {review.length}/1000
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/60 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <button
              onClick={submitRating}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-send" />
                  {isOwnReview ? 'Update Review' : 'Publish Review'}
                </>
              )}
            </button>
          </>
        )}

        {isBeingReviewed && !isPending && (
          <>
            <div className="rounded-2xl bg-ink-50/50 border border-ink-100/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {renderAvatar(rating.rater, 'small')}
                <div className="flex-1">
                  <p className="font-extrabold text-sm text-ink-900">
                    {getUserName(rating.rater)}
                  </p>
                  <div className="mt-1">{renderStars(rating.rating)}</div>
                  {rating.review && (
                    <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                      {rating.review}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1.5">
                Your reply
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Say something nice..."
                className="w-full resize-none rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
              />
              <div className="text-right text-xs text-ink-400 mt-1 font-medium">
                {reply.length}/500
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/60 p-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <button
              onClick={submitReply}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-chat-dots" />
                  {rating.reply_text ? 'Update Reply' : 'Post Reply'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RatingPage;