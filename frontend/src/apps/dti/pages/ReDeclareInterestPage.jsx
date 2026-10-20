import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  format,
  startOfDay,
  differenceInCalendarDays,
  addDays,
} from 'date-fns';
import {
  Repeat,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  User,
  Tag,
  Star,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { applicationsAPI, itemsAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';

/* -------------------------------------------------------------------------- */
/* SKELETON                                                                   */
/* -------------------------------------------------------------------------- */

const ReDeclareInterestSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
        </div>

        {/* ITEM CARD */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-ink-100" />

            <div className="flex-1 space-y-3">
              <div className="h-5 w-2/3 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-ink-100" />
                <div className="h-6 w-32 animate-pulse rounded-full bg-ink-100" />
              </div>
            </div>
          </div>
        </div>

        {/* RE-INTEREST INFO */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-ink-200" />

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-20 animate-pulse rounded-2xl bg-ink-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-ink-100" />
          </div>

          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-ink-100" />
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-ink-100" />
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="h-11 w-full animate-pulse rounded-xl bg-ink-100 sm:w-40" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-ink-100 sm:w-48" />
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* ITEM STATUS TONE                                                           */
/* -------------------------------------------------------------------------- */

const getItemStatusClasses = (status) => {
  const key = String(status || '').toLowerCase();

  const map = {
    active: 'border-success-200 bg-success-50 text-success-700',
    pending: 'border-warning-200 bg-warning-50 text-warning-700',
    completed: 'border-primary-200 bg-primary-50 text-primary-700',
    cancelled: 'border-danger-200 bg-danger-50 text-danger-700',
  };

  return map[key] || 'border-ink-200 bg-ink-50 text-ink-600';
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const ReDeclareInterestPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reinterestInfo, setReinterestInfo] = useState(null);

  /* ---------------------------------------------------------------------- */
  /* FETCH                                                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (!applicationId) {
        toast.error('Invalid application');
        navigate('/my-applications');
        return;
      }

      setLoading(true);
      try {
        const appResponse = await applicationsAPI.getById(applicationId);

        /* Try common shapes; log raw payload if none match. */
        const appData =
          appResponse?.data?.application ||
          appResponse?.data?.data?.application ||
          appResponse?.application ||
          appResponse?.data ||
          appResponse;

        if (!appData || !appData.id) {
          console.error(
            'Re-declare: unexpected getById response',
            appResponse
          );
          toast.error('Application not found');
          navigate('/my-applications');
          return;
        }

        if (appData.applicant_id !== user.id) {
          toast.error('You are not authorized to view this application');
          navigate('/my-applications');
          return;
        }

        if (appData.status !== 'pending') {
          toast.error(
            'You can only re-declare interest on pending applications'
          );
          navigate('/my-applications');
          return;
        }

        setApplication(appData);

        /* --------------------------------------------------------------
           ITEM FETCH — non-fatal.
           The re-declare action only needs `applicationId`. If the item
           fetch fails or is missing, degrade gracefully instead of
           blanking the page with "Application not found".
           -------------------------------------------------------------- */
        if (appData.item_id) {
          try {
            const itemResponse = await itemsAPI.getById(appData.item_id);
            const itemData =
              itemResponse?.data?.item ||
              itemResponse?.data?.data?.item ||
              itemResponse?.item ||
              itemResponse?.data ||
              itemResponse;

            if (itemData && itemData.id) {
              setItem(itemData);

              if (itemData.status !== 'active') {
                toast.error('This item is no longer available');
                navigate('/my-applications');
                return;
              }
            } else {
              console.warn(
                'Re-declare: item response malformed',
                itemResponse
              );
            }
          } catch (itemError) {
            console.error('Error fetching item:', itemError);
            toast.error('Failed to load item details');
            /* Do NOT navigate away — the app itself loaded fine. */
          }
        }

        const referenceDate =
          appData.last_reinterest_date || appData.created_at;
        const hasReinteristed = (appData.reinterest_count || 0) > 0;

        setReinterestInfo({
          referenceDate: new Date(referenceDate),
          reinterestCount: appData.reinterest_count || 0,
          hasReinteristed,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load application details');
        navigate('/my-applications');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [applicationId, user, navigate]);

  /* ---------------------------------------------------------------------- */
  /* ELIGIBILITY                                                            */
  /* ---------------------------------------------------------------------- */

  const calculateReinterestStatus = () => {
    if (!reinterestInfo)
      return {
        canReinterest: false,
        daysRemaining: 0,
        nextAvailableDate: null,
        daysSince: 0,
      };

    const now = startOfDay(new Date());
    const referenceDate = startOfDay(reinterestInfo.referenceDate);

    const daysSince = differenceInCalendarDays(now, referenceDate);
    const canReinterest = daysSince >= 7;
    const daysRemaining = canReinterest ? 0 : 7 - daysSince;
    const nextAvailableDate = addDays(referenceDate, 7);

    return {
      canReinterest,
      daysRemaining,
      daysSince,
      nextAvailableDate,
    };
  };

  /* ---------------------------------------------------------------------- */
  /* ACTION                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleReDeclare = async () => {
    const status = calculateReinterestStatus();
    if (!status.canReinterest) {
      toast.error('You are not eligible to re-declare interest yet');
      return;
    }

    setSubmitting(true);
    try {
      await applicationsAPI.redeclareInterest(applicationId);
      toast.success('Interest re-declared successfully! 🎉');
      setShowConfirmModal(false);

      setTimeout(() => {
        navigate('/my-applications');
      }, 1500);
    } catch (error) {
      console.error('Error re-declaring interest:', error);
      const errorData = error.response?.data;
      if (errorData?.daysRemaining) {
        toast.error(
          `You can re-declare interest in ${errorData.daysRemaining} day${
            errorData.daysRemaining > 1 ? 's' : ''
          }`
        );
      } else {
        toast.error(errorData?.error || 'Failed to re-declare interest');
      }
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* HELPERS                                                                */
  /* ---------------------------------------------------------------------- */

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return format(date, 'MMM d, yyyy');
  };

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return <ReDeclareInterestSkeleton />;
  }

  /* ---------------------------------------------------------------------- */
  /* TRULY NOT FOUND — only the application is required                     */
  /* ---------------------------------------------------------------------- */

  if (!application) {
    return (
      <div className="min-h-full bg-transparent">


        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <AlertTriangle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Application not found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                The application you're looking for doesn't exist or you lack
                permission to view it.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/my-applications"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <ArrowLeft size={16} />
                  Back to Applications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* DERIVED                                                                */
  /* ---------------------------------------------------------------------- */

  const status = calculateReinterestStatus();
  const canReinterest = status.canReinterest;
  const daysRemaining = status.daysRemaining;
  const hasReinteristed = reinterestInfo?.hasReinteristed || false;
  const daysSince = status.daysSince;

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Repeat size={14} />
                <span>Re-declare</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Re-Declare Interest
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Show the donor you're still interested.
              </p>
            </div>
          </div>
        </div>

        {/* ITEM CARD */}
        <div className="mb-6 rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          {item ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
                {item.images?.[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-300">
                    <ImageIcon size={28} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/item/${item.id}`}
                  className="text-lg font-black tracking-tight text-ink-950 transition hover:text-primary-600"
                >
                  {item.title}
                </Link>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <User size={12} className="shrink-0 text-ink-400" />
                    Donor: {item.donor?.full_name || 'Anonymous'}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Tag size={12} className="shrink-0 text-ink-400" />
                    {item.category || 'Uncategorized'}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Star size={12} className="shrink-0 text-ink-400" />
                    {item.condition || 'N/A'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getItemStatusClasses(
                      item.status
                    )}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {item.status.charAt(0).toUpperCase() +
                      item.status.slice(1)}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold text-primary-700">
                    <Clock size={11} />
                    Applied {formatDateShort(application.created_at)}
                  </span>

                  {hasReinteristed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[10px] font-extrabold text-warning-700">
                      <Repeat size={11} />
                      {reinterestInfo.reinterestCount}x re-interested
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 rounded-2xl border border-warning-200 bg-warning-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-700">
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-warning-900">
                  Item details unavailable
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-warning-700">
                  We couldn't load the item's details, but you can still
                  re-declare your interest below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RE-INTEREST INFO CARD */}
        <div className="mb-6 rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-ink-950">
            <Info size={16} className="text-primary-600" />
            Re-Interest Details
          </h3>

          {/* STATS */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Current Re-Interests
              </p>

              <p className="mt-1 text-2xl font-black text-ink-950">
                {reinterestInfo?.reinterestCount || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                Days Since{' '}
                {hasReinteristed ? 'Last Re-Interest' : 'Application'}
              </p>

              <p className="mt-1 text-2xl font-black text-ink-950">
                {daysSince || 0} days
              </p>
            </div>
          </div>

          {/* ELIGIBILITY */}
          <div
            className={`mt-4 flex items-start gap-4 rounded-2xl border p-4 ${
              canReinterest
                ? 'border-success-200 bg-success-50'
                : 'border-warning-200 bg-warning-50'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                canReinterest
                  ? 'bg-success-100 text-success-700'
                  : 'bg-warning-100 text-warning-700'
              }`}
            >
              {canReinterest ? (
                <CheckCircle2 size={18} />
              ) : (
                <Clock size={18} />
              )}
            </div>

            <div className="min-w-0">
              <p
                className={`text-sm font-extrabold ${
                  canReinterest ? 'text-success-900' : 'text-warning-900'
                }`}
              >
                {canReinterest
                  ? 'You are eligible to re-declare interest!'
                  : `${daysRemaining} day${
                      daysRemaining > 1 ? 's' : ''
                    } left until you can re-declare`}
              </p>

              <p
                className={`mt-1 text-xs font-medium leading-5 ${
                  canReinterest ? 'text-success-700' : 'text-warning-700'
                }`}
              >
                {canReinterest
                  ? "Re-declaring interest shows the donor you're still interested in this item."
                  : `Your next re-interest is available on ${formatDate(
                      status.nextAvailableDate
                    )}`}
              </p>
            </div>
          </div>

          {/* WHY RE-DECLARE */}
          <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <p className="text-xs font-medium leading-relaxed text-primary-700">
              <span className="font-extrabold">Why re-declare interest?</span>{' '}
              Re-declaring interest helps donors know you're still genuinely
              interested. You can re-declare every <strong>7 days</strong>{' '}
              while the item is active.{' '}
              {hasReinteristed ? (
                <>
                  You've re-declared{' '}
                  <strong>
                    {reinterestInfo.reinterestCount} time
                    {reinterestInfo.reinterestCount > 1 ? 's' : ''}
                  </strong>{' '}
                  already.
                </>
              ) : (
                <>
                  This will be your <strong>first</strong> re-declaration.
                </>
              )}
            </p>
          </div>

          {/* TIMELINE */}
          {hasReinteristed && (
            <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                <Clock size={11} className="text-primary-600" />
                Re-Interest Timeline
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-success-500" />

                  <span className="font-bold text-ink-600">
                    Initial application
                  </span>

                  <span className="ml-auto font-bold text-ink-400">
                    {formatDateShort(application.created_at)}
                  </span>
                </div>

                {[...Array(reinterestInfo.reinterestCount)].map(
                  (_, index) => {
                    const eventDate = addDays(
                      new Date(application.created_at),
                      (index + 1) * 7
                    );

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />

                        <span className="font-bold text-ink-600">
                          Re-interest #{index + 1}
                        </span>

                        <span className="ml-auto font-bold text-ink-400">
                          ~{formatDateShort(eventDate)}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
          <Link
            to="/my-applications"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
          >
            <ArrowLeft size={15} />
            Back to Applications
          </Link>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!canReinterest || submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Repeat size={16} />
                Re-Declare Interest
              </>
            )}
          </button>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Re-Declare Interest"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Repeat size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-primary-900">
                Re-declare your interest?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-primary-700">
                Are you sure you want to re-declare your interest
                {item?.title ? (
                  <>
                    {' '}
                    for <strong>"{item.title}"</strong>
                  </>
                ) : null}
                ?
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4">
            <Info size={14} className="mt-0.5 shrink-0 text-warning-600" />

            <p className="text-xs font-medium leading-5 text-warning-800">
              <strong className="font-extrabold">What happens next?</strong>{' '}
              The donor will be notified of your re-declared interest. This
              helps them know you're still genuinely interested in their item.
            </p>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-500">Application ID</span>

              <span className="truncate font-mono text-[11px] font-extrabold text-ink-700">
                {application.id}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-500">Item</span>

              <span className="truncate font-extrabold text-ink-700">
                {item?.title || 'Item details unavailable'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-500">
                Re-Interest Count
              </span>

              <span className="font-extrabold text-ink-700">
                {reinterestInfo?.reinterestCount || 0} →{' '}
                {(reinterestInfo?.reinterestCount || 0) + 1}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink-500">
                Days Since {hasReinteristed ? 'Last' : 'Application'}
              </span>

              <span className="font-extrabold text-ink-700">
                {daysSince || 0} days
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleReDeclare}
              disabled={submitting || !canReinterest}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm Re-Declare
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReDeclareInterestPage;