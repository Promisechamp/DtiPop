import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Clock3,
  CalendarCheck,
  ListChecks,
  ArrowUpRight,
  Inbox,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  MapPin,
  Package,
  UserRound,
  ChevronRight,
  History,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

import Modal from '@/reusables/Modal';
import { applicationsAPI } from '@/services/api/dtiApi';

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const normalizeLocation = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return { city: '', state: '', country: '' };
  }

  return {
    city: raw.city || '',
    state: raw.state || '',
    country: raw.country || '',
  };
};

const formatLocation = (raw) => {
  const location = normalizeLocation(raw);

  return [
    location.city,
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(', ');
};

const formatDate = (date) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return 'Date unavailable';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getDaysRemaining = (days) => {
  if (days === null || days === undefined || days === '') {
    return 'N/A';
  }

  const value = Number(days);

  if (!Number.isFinite(value)) return 'N/A';

  if (value <= 0) return '0';

  return String(value);
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

const SectionLabel = ({ children, icon: Icon }) => (
  <div className="mb-4 flex items-center gap-2">
    {Icon && (
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
        <Icon size={15} />
      </div>
    )}

    <h3 className="text-sm font-black tracking-tight text-ink-950">
      {children}
    </h3>
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  accent = 'primary',
}) => {
  const accentStyles = {
    primary: {
      icon: 'bg-primary-50 text-primary-600',
      indicator: 'bg-primary-500',
    },
    success: {
      icon: 'bg-emerald-50 text-emerald-600',
      indicator: 'bg-emerald-500',
    },
    neutral: {
      icon: 'bg-ink-100 text-ink-600',
      indicator: 'bg-ink-400',
    },
  };

  const styles = accentStyles[accent] || accentStyles.primary;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          <Icon size={19} strokeWidth={2.2} />
        </div>

        <span className={`mt-1 h-2 w-2 rounded-full ${styles.indicator}`} />
      </div>

      <p className="mt-4 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs font-extrabold text-ink-700">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink-400">
        {description}
      </p>
    </div>
  );
};

const InfoCard = ({
  icon: Icon,
  label,
  title,
  subtitle,
  onClick,
}) => {
  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-black text-ink-900">
          {title}
        </p>

        {subtitle && (
          <p className="mt-1 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-ink-500">
            {label === 'Applicant' && (
              <MapPin size={12} className="mt-0.5 shrink-0" />
            )}

            <span className="break-words">{subtitle}</span>
          </p>
        )}
      </div>

      {onClick && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-400 transition group-hover:bg-primary-50 group-hover:text-primary-600">
          <ArrowUpRight size={15} />
        </div>
      )}
    </>
  );

  const className =
    'group flex w-full items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left transition duration-200 hover:border-primary-200 hover:shadow-sm sm:p-5';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const ReinterestHistoryModal = ({
  isOpen,
  onClose,
  applicationId,
  onViewApplicant,
}) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isOpen || !applicationId) {
      setHistory(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setHistory(null);

    applicationsAPI
      .getReinterestHistory(applicationId)
      .then((response) => {
        if (cancelled) return;

        const data =
          response?.data?.application ??
          response?.data ??
          null;

        setHistory(data);
      })
      .catch((err) => {
        if (cancelled) return;

        console.error('Error fetching re-interest history:', err);

        setError(
          err?.response?.data?.error ||
            'We could not retrieve the re-interest history. Please try again.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId, retryKey]);

  const handleRetry = () => {
    setRetryKey((current) => current + 1);
  };

  const timeline = Array.isArray(history?.timeline)
    ? history.timeline
    : [];

  const reinterestCount = Number(history?.reinterest_count) || 0;
  const canRedeclare = Boolean(history?.can_redeclare);

  const daysUntilNext = getDaysRemaining(
    history?.days_until_next_reinterest
  );

  const lastActivity =
    history?.last_reinterest_date ||
    history?.initial_application_date;

  const applicantLocation = formatLocation(
    history?.applicant?.location
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Re-Interest History"
      size="lg"
    >
      <div className="overflow-hidden">
        {/* -------------------------------------------------------------- */}
        {/* LOADING                                                        */}
        {/* -------------------------------------------------------------- */}

        {loading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Loader2 size={29} className="animate-spin" />

              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-primary-500" />
            </div>

            <h3 className="mt-5 text-sm font-black text-ink-950">
              Retrieving history
            </h3>

            <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-ink-400">
              Gathering re-interest activity and application details.
            </p>

            <div className="mt-6 h-1 w-36 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary-500" />
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* ERROR                                                          */}
        {/* -------------------------------------------------------------- */}

        {!loading && error && (
          <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
              <AlertTriangle size={27} />
            </div>

            <h3 className="mt-5 text-base font-black text-ink-950">
              History unavailable
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
            >
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* EMPTY STATE                                                    */}
        {/* -------------------------------------------------------------- */}

        {!loading && !error && !history && (
          <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
              <Inbox size={29} />
            </div>

            <h3 className="mt-5 text-base font-black text-ink-950">
              Nothing to show yet
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-400">
              No re-interest history is available for this application.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* HISTORY CONTENT                                                */}
        {/* -------------------------------------------------------------- */}

        {!loading && !error && history && (
          <div className="space-y-6 pb-1">
            {/* HEADER BANNER */}

            <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-white p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary-100/50 blur-2xl" />

              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
                  <History size={23} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-700">
                      Application activity
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                        canRedeclare
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {canRedeclare ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock3 size={12} />
                      )}

                      {canRedeclare
                        ? 'Ready to re-declare'
                        : 'Waiting period'}
                    </span>
                  </div>

                  <h2 className="mt-2 text-xl font-black tracking-tight text-ink-950 sm:text-2xl">
                    Re-interest overview
                  </h2>

                  <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-500 sm:text-sm">
                    Track previous declarations, review important dates, and
                    check when the applicant can declare interest again.
                  </p>
                </div>
              </div>

              <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-primary-100 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-500">
                  <CalendarDays size={14} className="text-primary-600" />
                  <span>
                    Last activity: {formatDate(lastActivity)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-ink-500">
                  <Repeat size={14} className="text-primary-600" />
                  <span>
                    {reinterestCount}{' '}
                    {reinterestCount === 1
                      ? 're-interest'
                      : 're-interests'}
                  </span>
                </div>
              </div>
            </div>

            {/* STATISTICS */}

            <section>
              <SectionLabel icon={Sparkles}>
                At a glance
              </SectionLabel>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={Repeat}
                  label="Total re-interests"
                  value={reinterestCount}
                  description="Recorded declarations"
                  accent="primary"
                />

                <StatCard
                  icon={CalendarCheck}
                  label={
                    canRedeclare
                      ? 'Eligible now'
                      : 'Days remaining'
                  }
                  value={
                    canRedeclare
                      ? 'Ready'
                      : daysUntilNext === 'N/A'
                        ? 'N/A'
                        : daysUntilNext
                  }
                  description={
                    canRedeclare
                      ? 'Eligible to declare interest again'
                      : 'Until the next eligible declaration'
                  }
                  accent={canRedeclare ? 'success' : 'neutral'}
                />

                <StatCard
                  icon={Clock3}
                  label="Last activity"
                  value={formatDate(lastActivity)}
                  description="Most recent recorded date"
                  accent="neutral"
                />
              </div>
            </section>

            {/* TIMELINE */}

            <section className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel icon={ListChecks}>
                  Activity timeline
                </SectionLabel>

                <span className="mb-4 shrink-0 rounded-lg border border-ink-100 bg-white px-2.5 py-1 text-[10px] font-extrabold text-ink-500">
                  {timeline.length}{' '}
                  {timeline.length === 1 ? 'EVENT' : 'EVENTS'}
                </span>
              </div>

              {timeline.length > 0 ? (
                <div className="relative ml-4 border-l-2 border-ink-200 pb-1">
                  {timeline.map((event, index) => {
                    const isLatest = index === 0;

                    return (
                      <div
                        key={`${event.date || 'event'}-${index}`}
                        className="relative pb-6 pl-7 last:pb-1"
                      >
                        <div
                          className={`absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white shadow-sm ${
                            isLatest
                              ? 'bg-primary-600 ring-4 ring-primary-100'
                              : 'bg-ink-300'
                          }`}
                        >
                          {isLatest && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        <div className="rounded-xl border border-ink-100 bg-white p-3.5 transition hover:border-ink-200 sm:p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                isLatest
                                  ? 'text-primary-700'
                                  : 'text-ink-400'
                              }`}
                            >
                              {isLatest ? 'Latest activity' : 'Recorded event'}
                            </span>

                            {isLatest && (
                              <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[9px] font-black text-primary-600">
                                RECENT
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm font-extrabold leading-relaxed text-ink-900">
                            {event.description || 'Application activity'}
                          </p>

                          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink-400">
                            <Clock3 size={12} />
                            <span>{formatDateTime(event.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-200 bg-white px-4 py-9 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
                    <Inbox size={21} />
                  </div>

                  <p className="mt-3 text-sm font-extrabold text-ink-700">
                    No timeline events
                  </p>

                  <p className="mt-1 text-xs text-ink-400">
                    Recorded activity will appear here.
                  </p>
                </div>
              )}
            </section>

            {/* APPLICANT & ITEM */}

            <section>
              <SectionLabel icon={UserRound}>
                Related information
              </SectionLabel>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoCard
                  icon={UserRound}
                  label="Applicant"
                  title={
                    history.applicant?.full_name || 'Unknown applicant'
                  }
                  subtitle={
                    applicantLocation || 'Location not specified'
                  }
                  onClick={
                    history.applicant?.id && onViewApplicant
                      ? () => onViewApplicant(history.applicant.id)
                      : undefined
                  }
                />

                <InfoCard
                  icon={Package}
                  label="Associated item"
                  title={history.item?.title || 'Unknown item'}
                  subtitle={`Donor: ${
                    history.item?.donor?.full_name || 'N/A'
                  }`}
                />
              </div>
            </section>

            {/* FOOTER NOTE */}

            <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
                <ChevronRight size={16} />
              </div>

              <div>
                <p className="text-xs font-extrabold text-ink-700">
                  History at a glance
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                  This overview displays the recorded re-interest count,
                  declaration eligibility, timeline, and related applicant
                  and item information for this application.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReinterestHistoryModal;