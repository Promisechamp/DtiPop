import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  User,
  UserX,
  UserMinus,
  Camera,
  Mail,
  MailWarning,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Pencil,
  ShieldCheck,
  Lock,
  Key,
  Gift,
  Package,
  FileText,
  Trophy,
  Heart,
  Settings,
  Zap,
  Quote,
  Contact,
  Image as ImageIcon,
  Send,
  Search,
  LogIn,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { DTI_BASE, makePaths } from "@/utils/routeBases";

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
  APPLICATION_STATUSES,
  getCategoryByValue,
  getApplicationStatusDisplay,
} from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';

/* ============================================================
   SHARED STYLES
============================================================ */

const inputClass =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200';

/* ============================================================
   LOCATION HELPERS
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
   STATUS HELPERS (lucide component versions)
============================================================ */

const getStatusIconComponent = (profileUser) => {
  if (profileUser?.ban_status === 'banned') return UserX;
  if (profileUser?.ban_status === 'deleted') return UserMinus;
  if (profileUser?.email_verified) return CheckCircle2;
  return Clock;
};

/* ============================================================
   SKELETON
============================================================ */

const ProfileSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HERO */}
        <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
          <div className="h-28 border-b border-ink-100 bg-ink-50 sm:h-36" />

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

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 p-5">
              <div className="h-9 w-40 animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-ink-100 py-3"
                >
                  <div className="h-3 w-20 animate-pulse rounded bg-ink-200" />
                  <div className="h-3 w-28 animate-pulse rounded bg-ink-200" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
              <div className="border-b border-ink-100 p-5">
                <div className="h-9 w-32 animate-pulse rounded-xl bg-ink-200" />
              </div>

              <div className="p-5">
                <div className="h-24 animate-pulse rounded-xl bg-ink-100" />
              </div>
            </div>

            <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
              <div className="border-b border-ink-100 p-5">
                <div className="h-9 w-40 animate-pulse rounded-xl bg-ink-200" />
              </div>

              <div className="grid grid-cols-2 gap-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-ink-100"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLLECTIONS */}
        {Array.from({ length: 3 }).map((_, section) => (
          <div
            key={section}
            className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
          >
            <div className="border-b border-ink-100 p-5">
              <div className="h-9 w-48 animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div className="divide-y divide-ink-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
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
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const ProfilePage = () => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);
  const { to } = makePaths(DTI_BASE);
  const userId = paramUserId;
  const isOwnProfile = !userId || userId === user?.id;

  /* Profile state */
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Form state */
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState({ ...emptyLocation });
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  /* User data */
  const [allApplications, setAllApplications] = useState([]);
  const [allFavorites, setAllFavorites] = useState([]);

  /* Modals */
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  /* Password */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  /* Cloudinary */
  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_PROFILE ||
    'donttrashit_profiles';

  /* ==========================================================
     FETCH APPLICATIONS
  ========================================================== */

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

  /* ==========================================================
     FETCH FAVORITES
  ========================================================== */

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

  /* ==========================================================
     FETCH PROFILE
  ========================================================== */

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      /* Own profile */
      if (isOwnProfile && user) {
        setProfile(user);

        setFullName(user?.full_name || '');
        setBio(user?.bio || '');
        setLocation(normalizeLocation(user?.location));
        setPhone(user?.phone || '');
        setAvatarUrl(user?.avatar_url || '');

        if (!user.items_given && !user.applications) {
          try {
            const response = await usersAPI.getProfile(user.id);

            const extraData =
              response.data?.profile || response.data || response;

            setProfile((prev) => ({
              ...prev,
              ...extraData,
            }));
          } catch (err) {
            console.warn('Could not fetch extended profile data', err);
          }
        }

        setLoading(false);
        return;
      }

      /* Public profile without ID */
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
          response.data?.profile || response.data || response;

        setProfile(profileData);

        setFullName(profileData?.full_name || '');
        setBio(profileData?.bio || '');
        setLocation(normalizeLocation(profileData?.location));
        setPhone(profileData?.phone || '');
        setAvatarUrl(profileData?.avatar_url || '');
      } catch (err) {
        console.error('Error fetching profile:', err);

        setError('Failed to load profile');

        if (err.response?.status === 404) {
          toast.error('User not found');
          navigate(to('/browse'));
        } else {
          toast.error('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user, isOwnProfile, navigate, isAuthenticated]);

  /* ==========================================================
     STATS
  ========================================================== */

  const stats = useMemo(() => {
    const itemsGivenCount =
      profile?.items_given_count || profile?.items_given?.length || 0;

    const itemsReceivedCount =
      profile?.items_received_count || profile?.items_received?.length || 0;

    const applicationsCount =
      profile?.applications_count || profile?.applications?.length || 0;

    const winsCount = profile?.wins_count || profile?.wins?.length || 0;

    const pendingApplications = allApplications.filter(
      (application) => application.status === APPLICATION_STATUSES.PENDING
    ).length;

    return {
      itemsGiven: itemsGivenCount,
      itemsReceived: itemsReceivedCount,
      applications: applicationsCount,
      wins: winsCount,
      pendingApplications,
      favorites: allFavorites.length,
    };
  }, [profile, allApplications, allFavorites]);

  /* ==========================================================
     AVATAR UPLOAD
  ========================================================== */

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
      toast.error('Only JPG, PNG, GIF, and WEBP images are allowed');
      return;
    }

    setUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'donttrashit/profiles');

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
        );

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);

            setUploadProgress(progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);

              resolve(data);
            } catch (parseError) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);

              reject(
                new Error(errorData.error?.message || 'Upload failed')
              );
            } catch (parseError) {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.send(formData);
      });

      const data = await uploadPromise;

      const newAvatarUrl = data.secure_url;

      setUploadProgress(100);

      const { error } = await usersAPI.updateProfile({
        avatar_url: newAvatarUrl,
      });

      if (error) {
        throw new Error(error || 'Failed to update profile picture');
      }

      setAvatarUrl(newAvatarUrl);

      setProfile((prev) => ({
        ...prev,
        avatar_url: newAvatarUrl,
      }));

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);

      toast.error(error.message || 'Failed to upload profile picture');

      setUploadProgress(0);
    } finally {
      setTimeout(() => {
        setUploadingAvatar(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  /* ==========================================================
     PROFILE UPDATE
  ========================================================== */

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    setUpdating(true);
    setMessage('');

    try {
      const updateData = {
        full_name: fullName,
        bio,
        phone,
        location: {
          city: location.city || null,
          state: location.state || null,
          country: location.country || null,
        },
      };

      const { error } = await usersAPI.updateProfile(updateData);

      if (error) {
        setMessage({ type: 'error', text: error });
        toast.error(error);
      } else {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        });

        toast.success('Profile updated successfully!');

        setShowEditProfileModal(false);

        setProfile((prev) => ({
          ...prev,
          ...updateData,
        }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);

      setMessage({ type: 'error', text: 'Failed to update profile' });

      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  /* ==========================================================
     PASSWORD CHANGE
  ========================================================== */

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    try {
      await usersAPI.changePassword(currentPassword, newPassword);

      toast.success('Password changed successfully!');

      setShowPasswordModal(false);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);

      toast.error(
        error.response?.data?.error || 'Failed to change password'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /* ==========================================================
     VERIFICATION
  ========================================================== */

  const handleResendVerification = async () => {
    setResending(true);

    try {
      await authAPI.resendVerification(profile?.email);

      toast.success('Verification email resent! Please check your inbox.');
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          'Failed to resend verification email'
      );
    } finally {
      setResending(false);
    }
  };

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /* ==========================================================
     ROLE
  ========================================================== */

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: 'border-danger-200 bg-danger-50 text-danger-700',
      admin: 'border-primary-200 bg-primary-50 text-primary-700',
      user: 'border-ink-200 bg-ink-50 text-ink-600',
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

  /* ==========================================================
     STATUS
  ========================================================== */

  const getStatusBadge = (profileUser) => {
    if (profileUser?.ban_status === 'banned') {
      return 'border-danger-200 bg-danger-50 text-danger-700';
    }

    if (profileUser?.ban_status === 'deleted') {
      return 'border-ink-200 bg-ink-50 text-ink-400';
    }

    if (profileUser?.email_verified) {
      return 'border-primary-200 bg-primary-50 text-primary-700';
    }

    return 'border-warning-200 bg-warning-50 text-warning-700';
  };

  const getStatusLabel = (profileUser) => {
    if (profileUser?.ban_status === 'banned') return 'Banned';
    if (profileUser?.ban_status === 'deleted') return 'Deleted';
    if (profileUser?.email_verified) return 'Active';
    return 'Unverified';
  };

  /* ==========================================================
     UNAUTHENTICATED
  ========================================================== */

  if (!isAuthenticated) {
    return (
      <div className="min-h-full bg-transparent">


        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <User size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Sign in to view profile
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Manage your profile, track your applications, and keep up
                with your community activity.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to={to("/login")}
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

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return <ProfileSkeleton />;
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error || !profile) {
    return (
      <div className="min-h-full bg-transparent">


        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <AlertTriangle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Profile not found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {error ||
                  "The user profile you're looking for doesn't exist."}
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(to('/browse'))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <Search size={16} />
                  Browse items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     PROFILE DATA
  ========================================================== */

  const isVerified = profile?.email_verified === true;

  const itemsGiven = Array.isArray(profile.items_given)
    ? profile.items_given
    : [];

  const itemsReceived = Array.isArray(profile.items_received)
    ? profile.items_received
    : [];

  const applications = Array.isArray(profile.applications)
    ? profile.applications
    : [];

  const wins = Array.isArray(profile.wins) ? profile.wins : [];

  const StatusIcon = getStatusIconComponent(profile);

  const locationDisplay = formatLocation(profile.location);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
          <div className="h-28 border-b border-ink-100 bg-ink-100 sm:h-36" />

          <div className="px-5 pb-5 sm:px-7 sm:pb-7">
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
                          uploadingAvatar ? uploadProgress : 100
                        } 100`}
                        className="transition-all duration-300"
                      />
                    </svg>

                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile.full_name || 'Profile'}
                        className="absolute inset-[5px] h-[calc(100%-10px)] w-[calc(100%-10px)] rounded-full border-4 border-white object-cover shadow-lg"
                      />
                    ) : (
                      <div className="absolute inset-[5px] flex items-center justify-center rounded-full border-4 border-white bg-primary-50 shadow-lg">
                        <User size={44} className="text-primary-400" />
                      </div>
                    )}

                    {uploadingAvatar && (
                      <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-ink-950/55">
                        <span className="text-sm font-black text-white">
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                  </div>

                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-white bg-primary-600 text-white shadow-md transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Change profile picture"
                    >
                      {uploadingAvatar ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Camera size={14} />
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
                  <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                    {profile.full_name || 'Anonymous'}
                  </h1>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getRoleBadge(
                      profile.role
                    )}`}
                  >
                    {getRoleLabel(profile.role)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getStatusBadge(
                      profile
                    )}`}
                  >
                    <StatusIcon size={11} />
                    {getStatusLabel(profile)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-ink-400" />
                    {profile.email}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-ink-400" />
                    Joined {formatDate(profile.created_at)}
                  </span>

                  {locationDisplay && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-ink-400" />
                      {locationDisplay}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isOwnProfile && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-extrabold text-primary-700 transition hover:bg-primary-100"
                  >
                    <Pencil size={13} />
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                  >
                    <ShieldCheck size={13} />
                    Security
                  </button>
                </div>
              )}
            </div>

            {/* Verification banner */}
            {isOwnProfile && !isVerified && (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
                    <MailWarning size={15} />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-warning-900">
                      Verify your email address
                    </p>

                    <p className="mt-0.5 text-xs font-medium text-warning-700">
                      Verify your email to unlock all account features.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-warning-200 bg-white px-4 py-2 text-xs font-extrabold text-warning-700 shadow-sm transition hover:bg-warning-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {resending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
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
            icon={Gift}
            tone="primary"
          />

          <StatCard
            label="Items Received"
            value={stats.itemsReceived}
            icon={Package}
            tone="success"
          />

          <StatCard
            label="Applications"
            value={stats.applications}
            icon={FileText}
            tone="ink"
            subtext={
              stats.pendingApplications > 0
                ? `${stats.pendingApplications} pending`
                : 'All caught up'
            }
          />

          <StatCard
            label="Wins"
            value={stats.wins}
            icon={Trophy}
            tone="warning"
          />
        </section>

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Details */}
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            <SectionHeader
              icon={Contact}
              title="Profile Details"
              description="Account information"
            />

            <div className="grid grid-cols-1 gap-x-8 p-5 sm:grid-cols-2">
              <DetailRow
                label="Full Name"
                value={profile.full_name}
                icon={User}
              />

              <DetailRow
                label="Email"
                value={profile.email}
                icon={Mail}
              />

              <DetailRow
                label="Phone"
                value={profile.phone}
                icon={Phone}
              />

              <DetailRow
                label="Location"
                value={locationDisplay || profile.lication?.country || '—'}
                icon={MapPin}
              />

              <DetailRow
                label="Member Since"
                value={formatDate(profile.created_at)}
                icon={Calendar}
              />

              <DetailRow
                label="Role"
                value={getRoleLabel(profile.role)}
                icon={ShieldCheck}
                badge={getRoleBadge(profile.role)}
              />

              <DetailRow
                label="Account Status"
                value={getStatusLabel(profile)}
                icon={StatusIcon}
                badge={getStatusBadge(profile)}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
              <SectionHeader
                icon={Quote}
                title="About"
                description="A little about this member"
              />

              <div className="p-5">
                <div className="relative rounded-xl bg-ink-50/70 p-4">
                  <div className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-primary-500" />

                  <p className="pl-3 text-sm font-medium leading-7 text-ink-600">
                    {profile.bio ||
                      'This member has not added a bio yet.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            {isOwnProfile && (
              <div className="rounded-[26px] border border-ink-100 bg-white shadow-sm">
                <SectionHeader
                  icon={Zap}
                  title="Quick Access"
                  description="Jump to your account"
                />

                <div className="grid grid-cols-2 gap-2.5 p-5">
                  <QuickLink
                    to={to ("/my-listed-items")}
                    icon={Package}
                    label="My Items"
                    count={stats.itemsGiven}
                  />

                  <QuickLink
                    to={ to("/my-applications")}
                    icon={FileText}
                    label="Applications"
                    count={stats.applications}
                  />

                  <QuickLink
                    to={to("/favorites")}
                    icon={Heart}
                    label="Favorites"
                    count={stats.favorites}
                  />

                  <QuickLink
                    to={to("/settings")}
                    icon={Settings}
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
            icon={Gift}
            title="Items Given"
            description="Items you've shared with the community"
            count={itemsGiven.length}
            action={
              isOwnProfile && (
                <Link
                  to={to("/my-listed-items")}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  View all
                  <ArrowRight size={12} />
                </Link>
              )
            }
          >
            {itemsGiven.slice(0, 5).map((item) => (
              <ItemRow key={item.id} item={item} formatDate={formatDate} />
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
            icon={Package}
            title="Items Received"
            description="Items received from other members"
            count={itemsReceived.length}
          >
            {itemsReceived.slice(0, 5).map((item) => (
              <ItemRow key={item.id} item={item} formatDate={formatDate} />
            ))}
          </CollectionSection>
        )}

        {/* ====================================================
            APPLICATIONS
        ==================================================== */}

        {applications.length > 0 && (
          <CollectionSection
            icon={FileText}
            title="Applications"
            description="Applications submitted for available items"
            count={applications.length}
          >
            {applications.slice(0, 5).map((app) => {
              const badge = getApplicationStatusDisplay(app.status);

              const colorMap = {
                green: 'border-primary-200 bg-primary-50 text-primary-700',
                yellow: 'border-warning-200 bg-warning-50 text-warning-700',
                red: 'border-danger-200 bg-danger-50 text-danger-700',
                gray: 'border-ink-200 bg-ink-50 text-ink-600',
              };

              return (
                <div
                  key={app.id}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <FileText size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-ink-950">
                      {app.item?.title || 'Unknown Item'}
                    </p>

                    <p className="mt-0.5 text-[11px] font-bold text-ink-400">
                      Applied {formatDate(app.created_at)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                      colorMap[badge?.color] || colorMap.gray
                    }`}
                  >
                    {badge?.label || app.status}
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
            icon={Trophy}
            title="Wins"
            description="Successful applications and received items"
            count={wins.length}
            accent="warning"
          >
            {wins.slice(0, 5).map((win) => (
              <div
                key={win.id}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-warning-50/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
                  <Trophy size={15} fill="currentColor" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink-950">
                    {win.item?.title || 'Unknown Item'}
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-ink-400">
                    Won {formatDate(win.created_at)}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[10px] font-extrabold text-warning-700">
                  <CheckCircle2 size={11} />
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
            onClose={() => setShowEditProfileModal(false)}
            title="Edit Profile"
            size="lg"
          >
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              {message && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3.5 text-sm font-medium ${
                    message.type === 'success'
                      ? 'border-success-200 bg-success-50 text-success-700'
                      : 'border-danger-200 bg-danger-50 text-danger-700'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 size={15} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={15} className="shrink-0" />
                  )}

                  <span>{message.text}</span>
                </div>
              )}

              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  required
                />
              </FormField>

              <FormField label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
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
                        ? 'font-bold text-danger-500'
                        : 'font-bold text-primary-600'
                    }
                  >
                    {bio.length < 100
                      ? `${100 - bio.length} more characters required`
                      : 'Minimum length reached'}
                  </span>

                  <span
                    className={
                      bio.length > 180
                        ? 'font-bold text-warning-500'
                        : 'font-bold text-ink-400'
                    }
                  >
                    {bio.length}/200
                  </span>
                </div>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="City">
                  <input
                    type="text"
                    value={location.city}
                    onChange={(e) =>
                      setLocation((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    placeholder="City"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="State">
                  <input
                    type="text"
                    value={location.state}
                    onChange={(e) =>
                      setLocation((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    placeholder="State"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Country">
                  <input
                    type="text"
                    value={location.country}
                    onChange={(e) =>
                      setLocation((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
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
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className={inputClass}
                />
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
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
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <Lock size={15} />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-primary-900">
                      Keep your account secure
                    </p>

                    <p className="mt-0.5 text-xs font-medium leading-5 text-primary-700">
                      Choose a password that you don't use elsewhere.
                    </p>
                  </div>
                </div>
              </div>

              <FormField label="Current Password" required>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={inputClass}
                  required
                />
              </FormField>

              <FormField label="New Password" required>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={inputClass}
                  minLength={6}
                  required
                />
              </FormField>

              <FormField label="Confirm New Password" required>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key size={16} />
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

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon size={15} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-ink-950">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

/* ============================================================
   COLLECTION SECTION
============================================================ */

function CollectionSection({
  icon: Icon,
  title,
  description,
  count,
  action,
  children,
  accent = 'primary',
}) {
  const accentClasses = {
    primary: 'bg-primary-50 text-primary-600',
    warning: 'bg-warning-50 text-warning-600',
  };

  return (
    <section className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              accentClasses[accent] || accentClasses.primary
            }`}
          >
            <Icon size={15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-black text-ink-950">
                {title}
              </h3>

              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-extrabold text-ink-600">
                {count}
              </span>
            </div>

            {description && (
              <p className="mt-0.5 truncate text-[11px] font-bold text-ink-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="divide-y divide-ink-100">{children}</div>
    </section>
  );
}

/* ============================================================
   ITEM ROW
============================================================ */

function ItemRow({ item, formatDate }) {
  const category = getCategoryByValue(item.category);

  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50/60">
      {/* Image */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
        {item.images?.[0] ? (
          <img
            src={item.images[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <ImageIcon size={16} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-ink-950">
          {item.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {category &&
            renderIcon(category.icon, 'h-3 w-3', category.color)}

          <span className="text-[11px] font-bold text-ink-400">
            {item.category || 'Uncategorized'}
          </span>

          <span className="text-ink-300">•</span>

          <span className="text-[11px] font-bold text-ink-400">
            {formatDate(item.created_at)}
          </span>
        </div>
      </div>

      {/* Action */}
      <Link
        to={to(`/item/${item.id}`)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-400 opacity-0 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 group-hover:opacity-100"
        title="View item"
      >
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

/* ============================================================
   COLLECTION FOOTER
============================================================ */

function CollectionFooter({ to, text }) {
  return (
    <div className="border-t border-ink-100 px-5 py-3 text-center">
      <Link
        to={to(to)}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700"
      >
        {text}
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({ label, value, icon: Icon, tone = 'ink', subtext }) {
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

      {subtext && (
        <p className="mt-0.5 text-[10px] font-bold text-ink-400">{subtext}</p>
      )}
    </div>
  );
}

/* ============================================================
   DETAIL ROW
============================================================ */

function DetailRow({ label, value, badge, icon: Icon }) {
  return (
    <div className="flex items-center gap-4 border-b border-ink-100 py-3 last:border-0">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon size={13} className="shrink-0 text-ink-300" />}

        <span className="text-xs font-bold text-ink-500">{label}</span>
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

/* ============================================================
   QUICK LINK
============================================================ */

function QuickLink({ to, icon: Icon, label, count }) {
  return (
    <Link
      to={(to)}
      className="group flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
          <Icon size={14} />
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
        <ChevronRight
          size={12}
          className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500"
        />
      )}
    </Link>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function FormField({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-ink-700">
        {label}

        {required && (
          <span className="ml-1 text-danger-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

export default ProfilePage;