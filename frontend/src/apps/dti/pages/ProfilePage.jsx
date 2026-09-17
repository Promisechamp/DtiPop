import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  authAPI,
  usersAPI,
  applicationsAPI,
  favoritesAPI,
} from '@/services/api/dtiApi';
import { toast } from 'sonner';
import Modal from '@/reusables/Modal';
import {
  PageNavigation,
  PageNavigationSkeleton,
} from '@/reusables/PageNavigation';
import {
  APPLICATION_STATUSES,
  getCategoryByValue,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

// ============================================================
// Shared styles
// ============================================================

const inputClass =
  'w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-100';

// ============================================================
// Skeleton
// ============================================================

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 px-2 pb-10">
    <PageNavigationSkeleton />

    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
        <div className="h-32 animate-pulse bg-gradient-to-r from-primary-50 via-white to-brand-50" />

        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-full border-8 border-white bg-ink-200 sm:h-32 sm:w-32" />

            <div className="flex-1 space-y-3 pb-1">
              <div className="h-8 w-56 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-4 w-80 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-ink-200" />
            </div>

            <div className="flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-10 w-24 animate-pulse rounded-xl bg-ink-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm"
          >
            <div className="animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-ink-200" />
              <div className="mt-4 h-7 w-12 rounded bg-ink-200" />
              <div className="mt-2 h-3 w-20 rounded bg-ink-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Main info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="border-b border-ink-100 p-5">
            <div className="h-9 w-40 animate-pulse rounded-xl bg-ink-200" />
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-ink-50 py-3"
              >
                <div className="h-3 w-20 animate-pulse rounded bg-ink-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-ink-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="border-b border-ink-100 p-5">
              <div className="h-9 w-32 animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div className="p-5">
              <div className="h-24 animate-pulse rounded-xl bg-ink-100" />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <div className="border-b border-ink-100 p-5">
              <div className="h-9 w-40 animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-xl bg-ink-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collections */}
      {[1, 2, 3].map((section) => (
        <div
          key={section}
          className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm"
        >
          <div className="border-b border-ink-100 p-5">
            <div className="h-9 w-48 animate-pulse rounded-xl bg-ink-200" />
          </div>

          <div className="divide-y divide-ink-50">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-ink-200" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-ink-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-ink-200" />
                </div>

                <div className="h-8 w-8 animate-pulse rounded-xl bg-ink-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================

const ProfilePage = () => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

  const userId = paramUserId;
  const isOwnProfile = !userId || userId === user?.id;

  // ==========================================================
  // Profile state
  // ==========================================================

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================================
  // Form state
  // ==========================================================

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState({});
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  // ==========================================================
  // User data
  // ==========================================================

  const [allApplications, setAllApplications] = useState([]);
  const [allFavorites, setAllFavorites] = useState([]);

  // ==========================================================
  // Modals
  // ==========================================================

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // ==========================================================
  // Password
  // ==========================================================

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ==========================================================
  // Cloudinary
  // ==========================================================

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_PROFILE ||
    'donttrashit_profiles';

  // ==========================================================
  // Fetch applications
  // ==========================================================

  useEffect(() => {
    if (!isOwnProfile || !user) return;

    applicationsAPI
      .getMy()
      .then((res) => {
        setAllApplications(res.data?.applications || []);
      })
      .catch((err) => {
        console.warn('Could not fetch applications', err);
      });
  }, [isOwnProfile, user]);

  // ==========================================================
  // Fetch favorites
  // ==========================================================

  useEffect(() => {
    if (!isOwnProfile || !user) return;

    favoritesAPI
      .getAll()
      .then((res) => {
        setAllFavorites(res.data?.favorites || []);
      })
      .catch((err) => {
        console.warn('Could not fetch favorites', err);
      });
  }, [isOwnProfile, user]);

  // ==========================================================
  // Fetch profile
  // ==========================================================

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      // Own profile
      if (isOwnProfile && user) {
        setProfile(user);

        setFullName(user?.full_name || '');
        setBio(user?.bio || '');
        setLocation(user?.location || {});
        setCountry(user?.country || '');
        setPhone(user?.phone || '');
        setAvatarUrl(user?.avatar_url || '');

        if (!user.items_given && !user.applications) {
          try {
            const response = await usersAPI.getProfile(user.id);

            const extraData =
              response.data?.profile ||
              response.data ||
              response;

            setProfile((prev) => ({
              ...prev,
              ...extraData,
            }));
          } catch (err) {
            console.warn(
              'Could not fetch extended profile data',
              err
            );
          }
        }

        setLoading(false);
        return;
      }

      // Public profile without ID
      if (!userId) {
        setError('No user ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await usersAPI.getProfile(userId);

        const profileData =
          response.data?.profile ||
          response.data ||
          response;

        setProfile(profileData);

        setFullName(profileData?.full_name || '');
        setBio(profileData?.bio || '');
        setLocation(profileData?.location || {});
        setCountry(profileData?.country || '');
        setPhone(profileData?.phone || '');
        setAvatarUrl(profileData?.avatar_url || '');
      } catch (err) {
        console.error('Error fetching profile:', err);

        setError('Failed to load profile');

        if (err.response?.status === 404) {
          toast.error('User not found');
          navigate('/browse');
        } else {
          toast.error('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [
    userId,
    user,
    isOwnProfile,
    navigate,
    isAuthenticated,
  ]);

  // ==========================================================
  // Stats
  // ==========================================================

  const stats = useMemo(() => {
    const itemsGivenCount =
      profile?.items_given_count ||
      profile?.items_given?.length ||
      0;

    const itemsReceivedCount =
      profile?.items_received_count ||
      profile?.items_received?.length ||
      0;

    const applicationsCount =
      profile?.applications_count ||
      profile?.applications?.length ||
      0;

    const winsCount =
      profile?.wins_count ||
      profile?.wins?.length ||
      0;

    const pendingApplications = allApplications.filter(
      (application) =>
        application.status === APPLICATION_STATUSES.PENDING
    ).length;

    return {
      itemsGiven: itemsGivenCount,
      itemsReceived: itemsReceivedCount,
      applications: applicationsCount,
      wins: winsCount,
      pendingApplications,
      favorites: allFavorites.length,
    };
  }, [
    profile,
    allApplications,
    allFavorites,
  ]);

  // ==========================================================
  // Avatar upload
  // ==========================================================

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        'Only JPG, PNG, GIF, and WEBP images are allowed'
      );
      return;
    }

    setUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append(
        'folder',
        'donttrashit/profiles'
      );

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise(
        (resolve, reject) => {
          xhr.open(
            'POST',
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
          );

          xhr.upload.addEventListener(
            'progress',
            (event) => {
              if (event.lengthComputable) {
                const progress = Math.round(
                  (event.loaded / event.total) * 100
                );

                setUploadProgress(progress);
              }
            }
          );

          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(
                  xhr.responseText
                );

                resolve(data);
              } catch (parseError) {
                reject(
                  new Error(
                    'Failed to parse response'
                  )
                );
              }
            } else {
              try {
                const errorData = JSON.parse(
                  xhr.responseText
                );

                reject(
                  new Error(
                    errorData.error?.message ||
                      'Upload failed'
                  )
                );
              } catch (parseError) {
                reject(
                  new Error('Upload failed')
                );
              }
            }
          };

          xhr.onerror = () =>
            reject(new Error('Network error'));

          xhr.send(formData);
        }
      );

      const data = await uploadPromise;

      const newAvatarUrl = data.secure_url;

      setUploadProgress(100);

      const { error } =
        await usersAPI.updateProfile({
          avatar_url: newAvatarUrl,
        });

      if (error) {
        throw new Error(
          error || 'Failed to update profile picture'
        );
      }

      setAvatarUrl(newAvatarUrl);

      setProfile((prev) => ({
        ...prev,
        avatar_url: newAvatarUrl,
      }));

      toast.success(
        'Profile picture updated successfully!'
      );
    } catch (error) {
      console.error(
        'Error uploading avatar:',
        error
      );

      toast.error(
        error.message ||
          'Failed to upload profile picture'
      );

      setUploadProgress(0);
    } finally {
      setTimeout(() => {
        setUploadingAvatar(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // ==========================================================
  // Profile update
  // ==========================================================

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    setUpdating(true);
    setMessage('');

    try {
      const updateData = {
        full_name: fullName,
        bio,
        phone,
      };

      const { error } =
        await usersAPI.updateProfile(updateData);

      if (error) {
        setMessage({
          type: 'error',
          text: error,
        });

        toast.error(error);
      } else {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        });

        toast.success(
          'Profile updated successfully!'
        );

        setShowEditProfileModal(false);

        setProfile((prev) => ({
          ...prev,
          ...updateData,
        }));
      }
    } catch (error) {
      console.error(
        'Error updating profile:',
        error
      );

      setMessage({
        type: 'error',
        text: 'Failed to update profile',
      });

      toast.error(
        'Failed to update profile'
      );
    } finally {
      setUpdating(false);
    }
  };

  // ==========================================================
  // Password change
  // ==========================================================

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        'Password must be at least 6 characters'
      );
      return;
    }

    setChangingPassword(true);

    try {
      await usersAPI.changePassword(
        currentPassword,
        newPassword
      );

      toast.success(
        'Password changed successfully!'
      );

      setShowPasswordModal(false);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(
        'Error changing password:',
        error
      );

      toast.error(
        error.response?.data?.error ||
          'Failed to change password'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================================
  // Verification
  // ==========================================================

  const handleResendVerification = async () => {
    setResending(true);

    try {
      await authAPI.resendVerification(
        profile?.email
      );

      toast.success(
        'Verification email resent! Please check your inbox.'
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          'Failed to resend verification email'
      );
    } finally {
      setResending(false);
    }
  };

  // ==========================================================
  // Format date
  // ==========================================================

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  // ==========================================================
  // Role
  // ==========================================================

  const getRoleBadge = (role) => {
    const badges = {
      super_admin:
        'bg-rose-50 text-rose-700 border-rose-200',

      admin:
        'bg-primary-50 text-primary-700 border-primary-200',

      user:
        'bg-ink-50 text-ink-600 border-ink-200',
    };

    return badges[role] || badges.user;
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      user: 'User',
    };

    return labels[role] || role || 'User';
  };

  // ==========================================================
  // Status
  // ==========================================================

  const getStatusBadge = (profileUser) => {
    if (
      profileUser?.ban_status === 'banned'
    ) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }

    if (
      profileUser?.ban_status === 'deleted'
    ) {
      return 'bg-ink-50 text-ink-400 border-ink-200';
    }

    if (profileUser?.email_verified) {
      return 'bg-primary-50 text-primary-700 border-primary-200';
    }

    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getStatusLabel = (profileUser) => {
    if (
      profileUser?.ban_status === 'banned'
    ) {
      return 'Banned';
    }

    if (
      profileUser?.ban_status === 'deleted'
    ) {
      return 'Deleted';
    }

    if (profileUser?.email_verified) {
      return 'Active';
    }

    return 'Unverified';
  };

  const getStatusIcon = (profileUser) => {
    if (
      profileUser?.ban_status === 'banned'
    ) {
      return 'bi-person-x';
    }

    if (
      profileUser?.ban_status === 'deleted'
    ) {
      return 'bi-person-dash';
    }

    if (profileUser?.email_verified) {
      return 'bi-check-circle';
    }

    return 'bi-clock';
  };

  // ==========================================================
  // Authentication screen
  // ==========================================================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2 pb-10">
        <PageNavigation />

        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-primary-100/40 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-500 shadow-sm">
                <i className="bi bi-person text-2xl" />
              </div>

              <h3 className="text-lg font-extrabold text-ink-800">
                Sign in to View Profile
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-400">
                Manage your profile, track your
                applications, and keep up with your
                community activity.
              </p>

              <Link
                to="/login"
                className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-box-arrow-in-right" />
                Sign In
                <i className="bi bi-arrow-right text-xs transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return <ProfileSkeleton />;
  }

  // ==========================================================
  // Error
  // ==========================================================

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-ink-50/30 px-2 pb-10">
        <PageNavigation />

        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-12 text-center shadow-sm">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-100/40 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-500 shadow-sm">
                <i className="bi bi-exclamation-triangle text-2xl" />
              </div>

              <h3 className="text-lg font-extrabold text-ink-800">
                Profile Not Found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-400">
                {error ||
                  "The user profile you're looking for doesn't exist."}
              </p>

              <button
                onClick={() => navigate('/browse')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <i className="bi bi-search" />
                Browse Items
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Profile data
  // ==========================================================

  const isVerified =
    profile?.email_verified === true;

  const itemsGiven = Array.isArray(
    profile.items_given
  )
    ? profile.items_given
    : [];

  const itemsReceived = Array.isArray(
    profile.items_received
  )
    ? profile.items_received
    : [];

  const applications = Array.isArray(
    profile.applications
  )
    ? profile.applications
    : [];

  const wins = Array.isArray(profile.wins)
    ? profile.wins
    : [];

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="min-h-screen bg-ink-50/30 px-2 pb-10">
      <PageNavigation />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-primary-50 via-white to-brand-50" />

          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-200/20 blur-3xl" />

          <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-brand-200/20 blur-3xl" />

          <div className="relative h-28 sm:h-36">
            <div className="absolute inset-x-0 bottom-0 h-px bg-ink-100/70" />
          </div>

          <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              {/* Avatar */}
              <div className="-mt-14 shrink-0 sm:-mt-16">
                <div className="relative">
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                    <svg
                      className="absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="rgba(79,70,229,0.12)"
                        strokeWidth="3"
                      />

                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${
                          uploadingAvatar
                            ? uploadProgress
                            : 100
                        } 100`}
                        className="transition-all duration-300"
                      />
                    </svg>

                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={
                          profile.full_name ||
                          'Profile'
                        }
                        className="absolute inset-[5px] h-[calc(100%-10px)] w-[calc(100%-10px)] rounded-full border-4 border-white object-cover shadow-lg"
                      />
                    ) : (
                      <div className="absolute inset-[5px] flex items-center justify-center rounded-full border-4 border-white bg-primary-50 shadow-lg">
                        <i className="bi bi-person text-4xl text-primary-400" />
                      </div>
                    )}

                    {uploadingAvatar && (
                      <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-ink-900/55">
                        <span className="text-sm font-extrabold text-white">
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                  </div>

                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={uploadingAvatar}
                      className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-white bg-primary-600 text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Change profile picture"
                    >
                      {uploadingAvatar ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <i className="bi bi-camera-fill text-sm" />
                      )}
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                    {profile.full_name ||
                      'Anonymous'}
                  </h1>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getRoleBadge(
                      profile.role
                    )}`}
                  >
                    {getRoleLabel(
                      profile.role
                    )}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getStatusBadge(
                      profile
                    )}`}
                  >
                    <i
                      className={`bi ${getStatusIcon(
                        profile
                      )}`}
                    />
                    {getStatusLabel(profile)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <i className="bi bi-envelope text-ink-400" />
                    {profile.email}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <i className="bi bi-calendar3 text-ink-400" />
                    Joined{' '}
                    {formatDate(
                      profile.created_at
                    )}
                  </span>

                  {profile.location && (
                    <span className="flex items-center gap-1.5">
                      <i className="bi bi-geo-alt text-ink-400" />
                      {profile.location?.city}, {profile.location?.state}  {profile.location?.country}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isOwnProfile && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setShowEditProfileModal(
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-extrabold text-primary-700 transition-all hover:-translate-y-0.5 hover:bg-primary-100 hover:shadow-sm"
                  >
                    <i className="bi bi-pencil" />
                    Edit Profile
                  </button>

                  <button
                    onClick={() =>
                      setShowPasswordModal(
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-extrabold text-ink-700 transition-all hover:-translate-y-0.5 hover:bg-ink-50 hover:shadow-sm"
                  >
                    <i className="bi bi-shield-lock" />
                    Security
                  </button>
                </div>
              )}
            </div>

            {/* Verification */}
            {isOwnProfile && !isVerified && (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <i className="bi bi-envelope-exclamation" />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-amber-800">
                      Verify your email address
                    </p>

                    <p className="mt-0.5 text-xs text-amber-700/80">
                      Verify your email to unlock
                      all account features.
                    </p>
                  </div>
                </div>

                <button
                  onClick={
                    handleResendVerification
                  }
                  disabled={resending}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-extrabold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                >
                  {resending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  ) : (
                    <i className="bi bi-send" />
                  )}

                  Resend Email
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Items Given"
            value={stats.itemsGiven}
            icon="bi-gift"
            color="text-primary-700"
            bg="bg-primary-50"
            description="Shared with others"
          />

          <StatCard
            label="Items Received"
            value={stats.itemsReceived}
            icon="bi-box-seam"
            color="text-emerald-700"
            bg="bg-emerald-50"
            description="Received from community"
          />

          <StatCard
            label="Applications"
            value={stats.applications}
            icon="bi-file-earmark-text"
            color="text-sky-700"
            bg="bg-sky-50"
            subtext={
              stats.pendingApplications > 0
                ? `${stats.pendingApplications} pending`
                : 'All caught up'
            }
          />

          <StatCard
            label="Wins"
            value={stats.wins}
            icon="bi-trophy"
            color="text-amber-700"
            bg="bg-amber-50"
            description="Successful applications"
          />
        </section>

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Details */}
          <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
            <SectionHeader
              icon="bi-person-vcard"
              title="Profile Details"
              description="Your account information"
            />

            <div className="grid grid-cols-1 gap-x-8 p-5 sm:grid-cols-2">
              <DetailRow
                label="Full Name"
                value={profile.full_name}
                icon="bi-person"
              />

              <DetailRow
                label="Email"
                value={profile.email}
                icon="bi-envelope"
              />

              <DetailRow
                label="Phone"
                value={profile.phone}
                icon="bi-telephone"
              />

              <DetailRow
                label="Location"
               // value={profile.location}
                icon="bi-geo-alt"
              />

              <DetailRow
                label="Country"
                value={profile.country}
                icon="bi-globe2"
              />

              <DetailRow
                label="Member Since"
                value={formatDate(
                  profile.created_at
                )}
                icon="bi-calendar3"
              />

              <DetailRow
                label="Role"
                value={getRoleLabel(
                  profile.role
                )}
                icon="bi-shield-check"
                badge={getRoleBadge(
                  profile.role
                )}
              />

              <DetailRow
                label="Account Status"
                value={getStatusLabel(profile)}
                icon={getStatusIcon(profile)}
                badge={getStatusBadge(profile)}
              />
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
              <SectionHeader
                icon="bi-chat-square-quote"
                title="About"
                description="A little about this member"
              />

              <div className="p-5">
                <div className="relative rounded-xl bg-ink-50/70 p-4">
                  <div className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-primary-500" />

                  <p className="pl-3 text-sm leading-7 text-ink-600">
                    {profile.bio ||
                      'This member has not added a bio yet.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            {isOwnProfile && (
              <div className="rounded-2xl border border-ink-100/80 bg-white shadow-sm">
                <SectionHeader
                  icon="bi-lightning-charge"
                  title="Quick Access"
                  description="Jump to your account"
                />

                <div className="grid grid-cols-2 gap-2.5 p-5">
                  <QuickLink
                    to="/my-listed-items"
                    icon="bi-box-seam"
                    label="My Items"
                    count={stats.itemsGiven}
                  />

                  <QuickLink
                    to="/my-applications"
                    icon="bi-file-earmark-text"
                    label="Applications"
                    count={stats.applications}
                  />

                  <QuickLink
                    to="/favorites"
                    icon="bi-heart"
                    label="Favorites"
                    count={stats.favorites}
                  />

                  <QuickLink
                    to="/settings"
                    icon="bi-gear"
                    label="Settings"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================
            ITEMS GIVEN
        ==================================================== */}

        {itemsGiven.length > 0 && (
          <CollectionSection
            icon="bi-gift"
            title="Items Given"
            description="Items you've shared with the community"
            count={itemsGiven.length}
            action={
              isOwnProfile && (
                <Link
                  to="/my-listed-items"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  View all
                  <i className="bi bi-arrow-right" />
                </Link>
              )
            }
          >
            {itemsGiven.slice(0, 5).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                formatDate={formatDate}
              />
            ))}

            {itemsGiven.length > 5 && (
              <CollectionFooter
                to="/my-listed-items"
                text={`View all ${itemsGiven.length} items`}
              />
            )}
          </CollectionSection>
        )}

        {/* ====================================================
            ITEMS RECEIVED
        ==================================================== */}

        {itemsReceived.length > 0 && (
          <CollectionSection
            icon="bi-box-seam"
            title="Items Received"
            description="Items received from other members"
            count={itemsReceived.length}
          >
            {itemsReceived
              .slice(0, 5)
              .map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  formatDate={formatDate}
                />
              ))}
          </CollectionSection>
        )}

        {/* ====================================================
            APPLICATIONS
        ==================================================== */}

        {applications.length > 0 && (
          <CollectionSection
            icon="bi-file-earmark-text"
            title="Applications"
            description="Applications submitted for available items"
            count={applications.length}
          >
            {applications
              .slice(0, 5)
              .map((app) => {
                const badge =
                  getApplicationStatusDisplay(
                    app.status
                  );

                const colorMap = {
                  green:
                    'bg-primary-50 text-primary-700 border-primary-200',

                  yellow:
                    'bg-amber-50 text-amber-700 border-amber-200',

                  red:
                    'bg-rose-50 text-rose-700 border-rose-200',

                  gray:
                    'bg-ink-50 text-ink-600 border-ink-200',
                };

                return (
                  <div
                    key={app.id}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <i className="bi bi-file-earmark-text" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-900">
                        {app.item?.title ||
                          'Unknown Item'}
                      </p>

                      <p className="mt-0.5 text-xs text-ink-400">
                        Applied{' '}
                        {formatDate(
                          app.created_at
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                        colorMap[badge?.color] ||
                        colorMap.gray
                      }`}
                    >
                      {badge?.label ||
                        app.status}
                    </span>
                  </div>
                );
              })}
          </CollectionSection>
        )}

        {/* ====================================================
            WINS
        ==================================================== */}

        {wins.length > 0 && (
          <CollectionSection
            icon="bi-trophy"
            title="Wins"
            description="Successful applications and received items"
            count={wins.length}
            accent="amber"
          >
            {wins.slice(0, 5).map((win) => (
              <div
                key={win.id}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-amber-50/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <i className="bi bi-trophy-fill" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-ink-900">
                    {win.item?.title ||
                      'Unknown Item'}
                  </p>

                  <p className="mt-0.5 text-xs text-ink-400">
                    Won{' '}
                    {formatDate(
                      win.created_at
                    )}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                  <i className="bi bi-check-circle-fill" />
                  Won
                </span>
              </div>
            ))}
          </CollectionSection>
        )}

        {/* ====================================================
            EDIT PROFILE MODAL
        ==================================================== */}

        {isOwnProfile && (
          <Modal
            isOpen={showEditProfileModal}
            onClose={() =>
              setShowEditProfileModal(false)
            }
            title="Edit Profile"
            size="lg"
          >
            <form
              onSubmit={handleProfileUpdate}
              className="space-y-5"
            >
              {message && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3.5 text-sm ${
                    message.type === 'success'
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  <i
                    className={`bi ${
                      message.type === 'success'
                        ? 'bi-check-circle-fill'
                        : 'bi-exclamation-triangle-fill'
                    }`}
                  />

                  <span>
                    {message.text}
                  </span>
                </div>
              )}

              <FormField
                label="Full Name"
                required
              >
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  className={inputClass}
                  required
                />
              </FormField>

              <FormField label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                  rows={4}
                  minLength={100}
                  maxLength={200}
                  placeholder="Tell us a little about yourself..."
                  className={`${inputClass} resize-none`}
                />

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span
                    className={
                      bio.length < 100
                        ? 'font-semibold text-rose-500'
                        : 'font-semibold text-primary-600'
                    }
                  >
                    {bio.length < 100
                      ? `${
                          100 - bio.length
                        } more characters required`
                      : 'Minimum length reached'}
                  </span>

                  <span
                    className={
                      bio.length > 180
                        ? 'font-semibold text-orange-500'
                        : 'text-ink-400'
                    }
                  >
                    {bio.length}/200
                  </span>
                </div>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Location">
                  <input
                    type="text"
                   // value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="City"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Country">
                  <input
                    type="text"
                    value={country}
                    onChange={(e) =>
                      setCountry(e.target.value)
                    }
                    placeholder="Country"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="+234..."
                  className={inputClass}
                />
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowEditProfileModal(
                      false
                    )
                  }
                  className="rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {updating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ====================================================
            PASSWORD MODAL
        ==================================================== */}

        {isOwnProfile && (
          <Modal
            isOpen={showPasswordModal}
            onClose={() => {
              setShowPasswordModal(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}
            title="Change Password"
            size="sm"
          >
            <form
              onSubmit={handlePasswordChange}
              className="space-y-5"
            >
              <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <i className="bi bi-shield-lock" />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-primary-800">
                      Keep your account secure
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-primary-700/80">
                      Choose a password that
                      you don't use elsewhere.
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                label="Current Password"
                required
              >
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter current password"
                  className={inputClass}
                  required
                />
              </FormField>

              <FormField
                label="New Password"
                required
              >
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  className={inputClass}
                  minLength={6}
                  required
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                required
              >
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  className={inputClass}
                  minLength={6}
                  required
                />
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(
                      false
                    );
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  {changingPassword ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-key" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Section Header
// ============================================================

function SectionHeader({
  icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <i className={`bi ${icon}`} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-ink-800">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 truncate text-[11px] text-ink-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

// ============================================================
// Collection Section
// ============================================================

function CollectionSection({
  icon,
  title,
  description,
  count,
  action,
  children,
  accent = 'primary',
}) {
  const accentClasses = {
    primary:
      'bg-primary-50 text-primary-600',

    amber:
      'bg-amber-50 text-amber-600',
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              accentClasses[accent] ||
              accentClasses.primary
            }`}
          >
            <i className={`bi ${icon}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-extrabold text-ink-800">
                {title}
              </h3>

              <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-500">
                {count}
              </span>
            </div>

            {description && (
              <p className="mt-0.5 truncate text-[11px] text-ink-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="divide-y divide-ink-50">
        {children}
      </div>
    </section>
  );
}

// ============================================================
// Item Row
// ============================================================

function ItemRow({
  item,
  formatDate,
}) {
  const category = getCategoryByValue(
    item.category
  );

  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-all hover:bg-ink-50/60">
      {/* Image */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
        {item.images?.[0] ? (
          <img
            src={item.images[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <i className="bi bi-image text-sm text-ink-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-900">
          {item.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {category &&
            renderIcon(
              category.icon,
              'h-3 w-3',
              category.color
            )}

          <span className="text-xs font-medium text-ink-400">
            {item.category ||
              'Uncategorized'}
          </span>

          <span className="text-ink-300">
            •
          </span>

          <span className="text-xs text-ink-400">
            {formatDate(
              item.created_at
            )}
          </span>
        </div>
      </div>

      {/* Action */}
      <Link
        to={`/item/${item.id}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-400 opacity-0 shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 group-hover:opacity-100"
        title="View item"
      >
        <i className="bi bi-arrow-up-right text-sm" />
      </Link>
    </div>
  );
}

// ============================================================
// Collection Footer
// ============================================================

function CollectionFooter({
  to,
  text,
}) {
  return (
    <div className="border-t border-ink-50 px-5 py-3 text-center">
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700"
      >
        {text}
        <i className="bi bi-arrow-right" />
      </Link>
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  icon,
  color = 'text-ink-700',
  bg = 'bg-ink-50',
  subtext,
  description,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-ink-50/70 transition-transform duration-300 group-hover:scale-150" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}
          >
            <i
              className={`bi ${icon} ${color} text-base`}
            />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-300">
            Total
          </span>
        </div>

        <p
          className={`mt-4 text-2xl font-extrabold tracking-tight ${color}`}
        >
          {typeof value === 'number'
            ? value.toLocaleString()
            : value}
        </p>

        <p className="mt-0.5 text-xs font-extrabold text-ink-600">
          {label}
        </p>

        {subtext ? (
          <p className="mt-1 text-[11px] font-semibold text-ink-400">
            {subtext}
          </p>
        ) : description ? (
          <p className="mt-1 text-[11px] font-medium text-ink-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================
// Detail Row
// ============================================================

function DetailRow({
  label,
  value,
  badge,
  icon,
}) {
  return (
    <div className="flex items-center gap-4 border-b border-ink-50 py-3 last:border-0">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <i
          className={`bi ${icon} text-xs text-ink-300`}
        />

        <span className="text-xs font-bold text-ink-500">
          {label}
        </span>
      </div>

      <div className="max-w-[60%] text-right">
        {badge ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${badge}`}
          >
            {value}
          </span>
        ) : (
          <span className="break-words text-xs font-extrabold text-ink-800">
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Quick Link
// ============================================================

function QuickLink({
  to,
  icon,
  label,
  count,
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
          <i
            className={`bi ${icon} text-sm`}
          />
        </div>

        <span className="truncate text-xs font-extrabold text-ink-700">
          {label}
        </span>
      </div>

      {count !== undefined ? (
        <span className="ml-2 text-xs font-extrabold text-ink-400 group-hover:text-primary-600">
          {count}
        </span>
      ) : (
        <i className="bi bi-chevron-right text-[10px] text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
      )}
    </Link>
  );
}

// ============================================================
// Form Field
// ============================================================

function FormField({
  label,
  required = false,
  children,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-ink-700">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

export default ProfilePage;