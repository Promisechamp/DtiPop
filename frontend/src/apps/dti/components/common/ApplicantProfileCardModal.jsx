import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  User,
  MapPin,
  CheckCircle2,
  Quote,
  Mail,
  FileText,
  Calendar,
  Ban,
  AlertTriangle,
} from 'lucide-react';

import { usersAPI } from '@/services/api/dtiApi';

/* ============================================================
   LOCATION HELPERS
   `location` is a JSONB column: { city, state, country }.
============================================================ */

const emptyLocation = { city: '', state: '', country: '' };

const normalizeLocation = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...emptyLocation };
  return {
    city: raw.city || '',
    state: raw.state || '',
    country: raw.country || '',
  };
};

const formatLocation = (raw) => {
  const loc = normalizeLocation(raw);
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  return parts.join(', ');
};

/* ============================================================
   SKELETON
============================================================ */

const ApplicantProfileSkeleton = () => (
  <div className="space-y-4">
    {/* HEADER */}
    <div className="flex items-center gap-4 border-b border-ink-100 pb-4">
      <div className="h-16 w-16 animate-pulse rounded-full bg-ink-100" />

      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />

        <div className="flex items-center gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
        </div>
      </div>
    </div>

    {/* STATS */}
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3"
        >
          <div className="mx-auto h-6 w-10 animate-pulse rounded bg-ink-100" />
          <div className="mx-auto mt-1.5 h-2.5 w-16 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>

    {/* SECTIONS */}
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3"
      >
        <div className="mb-2 h-3 w-16 animate-pulse rounded bg-ink-100" />

        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100" />
        </div>
      </div>
    ))}

    {/* FOOTER */}
    <div className="flex items-center justify-between border-t border-ink-100 pt-3">
      <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-ink-100" />
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const ApplicantProfileCard = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await usersAPI.getProfile(userId);
        const profileData =
          response.data?.profile || response.data || response;
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching applicant profile:', err);
        setError('Failed to load profile');
        toast.error('Failed to load applicant profile');
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchProfile();
  }, [userId]);

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  if (loading) {
    return <ApplicantProfileSkeleton />;
  }

  /* --------------------------------------------------------
     ERROR
  -------------------------------------------------------- */

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-600">
          <AlertTriangle size={24} />
        </div>

        <p className="mt-4 text-sm font-black text-ink-950">
          Unable to load profile
        </p>

        {error && (
          <p className="mt-1 text-xs font-bold text-danger-500">{error}</p>
        )}
      </div>
    );
  }

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

  const locationDisplay = formatLocation(profile.location);
  const isBanned = profile.ban_status === 'banned';

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* PROFILE HEADER */}
      <div className="flex items-center gap-4 border-b border-ink-100 pb-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'User'}
            className="h-16 w-16 rounded-full border-2 border-ink-100 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-50 text-ink-400">
            <User size={26} />
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-black tracking-tight text-ink-950">
            {profile.full_name || 'Unknown User'}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-ink-500">
              <MapPin size={12} className="shrink-0 text-ink-400" />
              {locationDisplay || 'Location not specified'}
            </span>

            {profile.email_verified && (
              <span className="flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-extrabold text-success-700">
                <CheckCircle2 size={10} />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-primary-100 bg-primary-50 p-3 text-center">
          <p className="text-xl font-black text-primary-700">
            {profile.rating || 0}
          </p>

          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-700/70">
            Rating
          </p>
        </div>

        <div className="rounded-2xl border border-primary-100 bg-primary-50 p-3 text-center">
          <p className="text-xl font-black text-primary-700">
            {profile.items_given || profile.items_given_count || 0}
          </p>

          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-700/70">
            Given
          </p>
        </div>

        <div className="rounded-2xl border border-primary-100 bg-primary-50 p-3 text-center">
          <p className="text-xl font-black text-primary-700">
            {profile.items_received || profile.items_received_count || 0}
          </p>

          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-700/70">
            Received
          </p>
        </div>
      </div>

      {/* ABOUT */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          <Quote size={11} className="text-primary-600" />
          About
        </p>

        <p className="text-xs font-medium leading-relaxed text-ink-600">
          {profile.bio || 'No bio provided'}
        </p>
      </div>

      {/* CONTACT */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          Contact
        </p>

        <div className="space-y-1.5 text-xs font-medium text-ink-600">
          <p className="flex items-center gap-2">
            <Mail size={12} className="shrink-0 text-ink-400" />
            Contact support to get applicant email
          </p>

          {locationDisplay && (
            <p className="flex items-center gap-2">
              <MapPin size={12} className="shrink-0 text-ink-400" />
              {locationDisplay}
            </p>
          )}
        </div>
      </div>

      {/* ACTIVITY */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
          Activity
        </p>

        <div className="space-y-1.5 text-xs font-medium text-ink-600">
          <p className="flex items-center gap-2">
            <FileText size={12} className="shrink-0 text-ink-400" />
            {profile.applications_count || 0} applications submitted
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-ink-100 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-400">
          <Calendar size={11} />
          Joined {formatDate(profile.created_at)}
        </span>

        {isBanned ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-danger-200 bg-danger-50 px-2.5 py-1 text-[10px] font-extrabold text-danger-700">
            <Ban size={11} />
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-[10px] font-extrabold text-success-700">
            <CheckCircle2 size={11} />
            Active
          </span>
        )}
      </div>
    </div>
  );
};

export default ApplicantProfileCard;