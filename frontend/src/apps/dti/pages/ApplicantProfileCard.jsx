import React, { useState, useEffect } from 'react';
import { usersAPI } from '@/services/api/dtiApi';
import { toast } from 'sonner';

// ============================================
// Skeleton (Unified design)
// ============================================
const ApplicantProfileSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Profile Header Skeleton */}
      <div className="flex items-center gap-4 pb-4 border-b border-ink-100">
        <div className="w-16 h-16 rounded-full bg-ink-200 animate-pulse"></div>
        <div className="flex-1">
          <div className="h-5 bg-ink-200 rounded w-32 animate-pulse"></div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-4 bg-ink-200 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-ink-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60">
            <div className="h-7 bg-ink-200 rounded w-8 mx-auto animate-pulse"></div>
            <div className="h-3 bg-ink-200 rounded w-16 mx-auto mt-1 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Bio Skeleton */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60">
        <div className="h-4 bg-ink-200 rounded w-16 animate-pulse mb-2"></div>
        <div className="space-y-1">
          <div className="h-3 bg-ink-200 rounded w-full animate-pulse"></div>
          <div className="h-3 bg-ink-200 rounded w-3/4 animate-pulse"></div>
        </div>
      </div>

      {/* Contact Info Skeleton */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60">
        <div className="h-4 bg-ink-200 rounded w-16 animate-pulse mb-2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-ink-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-3 bg-ink-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>

      {/* Activity Skeleton */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60">
        <div className="h-4 bg-ink-200 rounded w-16 animate-pulse mb-2"></div>
        <div className="h-3 bg-ink-200 rounded w-32 animate-pulse"></div>
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="h-3 bg-ink-200 rounded w-24 animate-pulse"></div>
        <div className="h-5 bg-ink-200 rounded w-16 animate-pulse"></div>
      </div>
    </div>
  );
};

// ============================================
// Main ApplicantProfileCard Component
// ============================================
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
        const profileData = response.data?.profile || response.data || response;
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching applicant profile:', err);
        setError('Failed to load profile');
        toast.error('Failed to load applicant profile');
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 800);
      }
    };

    fetchProfile();
  }, [userId]);

  // Show skeleton while loading
  if (loading) {
    return <ApplicantProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="text-center py-8 text-ink-500">
        <i className="bi bi-person text-4xl text-ink-300"></i>
        <p className="mt-2">Unable to load profile</p>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-ink-100">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'User'}
            className="w-16 h-16 rounded-full object-cover border-2 border-ink-200 shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
            <i className="bi bi-person text-2xl text-ink-400"></i>
          </div>
        )}
        <div>
          <h3 className="text-lg font-extrabold text-ink-900">
            {profile.full_name || 'Unknown User'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-ink-500 flex items-center gap-1">
              <i className="bi bi-geo-alt"></i>
              {profile.location || 'Location not specified'}
              {profile.country && `, ${profile.country}`}
            </span>
            {profile.email_verified && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-bold">
                <i className="bi bi-check-circle-fill"></i>
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary-50 p-3 rounded-xl text-center border border-primary-200/60 shadow-sm">
          <p className="text-xl font-extrabold text-ink-900">{profile.rating || 0}</p>
          <p className="text-xs font-medium text-ink-500">Rating</p>
        </div>
        <div className="bg-primary-50 p-3 rounded-xl text-center border border-primary-200/60 shadow-sm">
          <p className="text-xl font-extrabold text-ink-900">{profile.items_given || profile.items_given_count || 0}</p>
          <p className="text-xs font-medium text-ink-500">Items Given</p>
        </div>
        <div className="bg-primary-50 p-3 rounded-xl text-center border border-primary-200/60 shadow-sm">
          <p className="text-xl font-extrabold text-ink-900">{profile.items_received || profile.items_received_count || 0}</p>
          <p className="text-xs font-medium text-ink-500">Items Received</p>
        </div>
      </div>

      {/* Bio / About */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60 shadow-sm">
        <p className="text-sm font-bold text-ink-700 mb-1">
          <i className="bi bi-person-lines-fill mr-1 text-primary-600"></i>
          About
        </p>
        <p className="text-sm text-ink-600">
          {profile.bio || 'No bio provided'}
        </p>
      </div>

      {/* Contact Info */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60 shadow-sm">
        <p className="text-sm font-bold text-ink-700 mb-1">
          Contact
        </p>
        <div className="space-y-1 text-sm text-ink-600">
          <p className="flex items-center gap-2">
            <i className="bi bi-envelope text-ink-400"></i>
            Contact support to get applicant email
          </p>

          {profile.location && (
            <p className="flex items-center gap-2">
              <i className="bi bi-geo-alt text-ink-400"></i>
              {profile.location}{profile.country ? `, ${profile.country}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Applications Count */}
      <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60 shadow-sm">
        <p className="text-sm font-bold text-ink-700 mb-1">
          Activity
        </p>
        <div className="space-y-1 text-sm text-ink-600">
          <p className="flex items-center gap-2">
            <i className="bi bi-file-earmark-text text-ink-400"></i>
            {profile.applications_count || 0} applications submitted
          </p>
        </div>
      </div>

      {/* Status & Joined Date */}
      <div className="flex items-center justify-between text-xs text-ink-500 border-t border-ink-100 pt-3">
        <span className="flex items-center gap-1">
          <i className="bi bi-calendar3"></i>
          Joined {formatDate(profile.created_at)}
        </span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${
          profile.ban_status === 'banned'
            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
        }`}>
          {profile.ban_status === 'banned' ? 'Banned' : 'Active'}
        </span>
      </div>
    </div>
  );
};

export default ApplicantProfileCard;