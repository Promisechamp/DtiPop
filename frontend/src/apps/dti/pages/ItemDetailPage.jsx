import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";


import { toast } from 'sonner';
import {
  Gift,
  Package,
  Image as ImageIcon,
  MapPin,
  Globe,
  Calendar,
  Eye,
  Users,
  Star,
  User,
  Truck,
  Wallet,
  MessageSquare,
  Pencil,
  Trash2,
  Heart,
  LogIn,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  Mail,
  Lock,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
  Copy,
  MessageCircle,
  Loader2,
  CircleArrowOutUpRight,
  Info,
} from 'lucide-react';

import { supabase } from '@/services/api/supabase';
import { useAuth } from '@/context/AuthContext';

import {
  itemsAPI,
  favoritesAPI,
  applicationsAPI,
  authAPI,
} from '@/services/api/dtiApi';

import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';

import { getStatusDisplay } from '@/utils/constants';

import ApplicationForm from './ApplicationForm';
import SupportModal from '../components/common/SupportModal';

import logo from '@/assets/popLogo1.png';

/* ============================================================
   LOCATION HELPERS
   `location` is JSONB: { city, state, country }.
============================================================ */

const getLocationCountry = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  return raw.country || '';
};

/* ============================================================
   STATUS HELPERS
============================================================ */

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'active':
      return CheckCircle2;
    case 'accepted':
      return CheckCircle2;
    case 'completed':
      return CheckCircle2;
    case 'pending':
      return Clock;
    case 'rejected':
      return XCircle;
    case 'cancelled':
      return XCircle;
    default:
      return Circle;
  }
};

const getStatusBadgeClasses = (status) => {
  const map = {
    active: 'border-success-200 bg-success-50 text-success-700',
    accepted: 'border-success-200 bg-success-50 text-success-700',
    pending: 'border-warning-200 bg-warning-50 text-warning-700',
    completed: 'border-primary-200 bg-primary-50 text-primary-700',
    rejected: 'border-danger-200 bg-danger-50 text-danger-700',
    cancelled: 'border-danger-200 bg-danger-50 text-danger-700',
  };
  return map[status] || 'border-ink-200 bg-ink-50 text-ink-600';
};

const getConditionDisplay = (condition) => {
  const map = {
    New: { label: 'New', classes: 'border-success-200 bg-success-50 text-success-700' },
    'Like New': { label: 'Like New', classes: 'border-primary-200 bg-primary-50 text-primary-700' },
    Good: { label: 'Good', classes: 'border-primary-200 bg-primary-50 text-primary-700' },
    Fair: { label: 'Fair', classes: 'border-warning-200 bg-warning-50 text-warning-700' },
    Poor: { label: 'Poor', classes: 'border-danger-200 bg-danger-50 text-danger-700' },
  };
  return map[condition] || { label: condition, classes: 'border-ink-200 bg-ink-50 text-ink-600' };
};

/* ============================================================
   FORMAT HELPERS
============================================================ */

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

/* ============================================================
   FAVORITE BUTTON
============================================================ */

const FavoriteButton = ({ itemId, className = '' }) => {
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !itemId) return;

    const checkFavorite = async () => {
      try {
        const response = await favoritesAPI.check(itemId);
        setIsFavorited(response.data.isFavorited || false);
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    checkFavorite();
  }, [itemId, isAuthenticated]);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save gifts');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      if (isFavorited) {
        await favoritesAPI.remove(itemId);
        setIsFavorited(false);
        toast.success('Removed from saved gifts');
      } else {
        await favoritesAPI.add(itemId);
        setIsFavorited(true);
        toast.success('Gift saved');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update saved gifts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`
        inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-extrabold transition
        ${
          isFavorited
            ? 'border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100'
            : 'border-ink-200 bg-white text-ink-700 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-700'
        }
        disabled:cursor-wait disabled:opacity-60
        ${className}
      `}
      aria-label={isFavorited ? 'Remove from saved' : 'Save gift'}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
      )}
      <span>{isFavorited ? 'Saved' : 'Save Gift'}</span>
    </button>
  );
};

/* ============================================================
   SKELETON
============================================================ */

const ItemDetailSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        <div className="grid gap-7 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          {/* LEFT — GALLERY */}
          <div className="space-y-3">
            <div className="aspect-[4/3] animate-pulse rounded-[26px] bg-ink-100" />

            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-16 animate-pulse rounded-xl bg-ink-100"
                />
              ))}
            </div>
          </div>

          {/* RIGHT — INFO */}
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="h-8 w-4/5 animate-pulse rounded-xl bg-ink-200" />

              <div className="flex gap-2">
                <div className="h-7 w-20 animate-pulse rounded-full bg-ink-100" />
                <div className="h-7 w-24 animate-pulse rounded-full bg-ink-100" />
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <div className="flex gap-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-ink-200" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-ink-200" />
                  <div className="h-3 w-28 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-ink-200" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-full animate-pulse rounded bg-ink-100"
                />
              ))}
            </div>

            <div className="h-12 animate-pulse rounded-xl bg-ink-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   MAIN
============================================================ */

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
		const { to } = makePaths(DTI_BASE);
  const { user, isAuthenticated } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [canApply, setCanApply] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [applications, setApplications] = useState([]);
  const [showApplications, setShowApplications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAllCountriesModal, setShowAllCountriesModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportItem, setSupportItem] = useState(null);
  const [isFromPop, setIsFromPop] = useState(false);

  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  /* ============================================================
     REGION HELPERS
  ============================================================ */

  const getRegionInfo = () => {
    if (!item?.shipping_regions) return null;

    let regionText = '';
    let excludeList = [];

    if (typeof item.shipping_regions === 'string') {
      regionText = item.shipping_regions;
    } else if (item.shipping_regions.region) {
      regionText = item.shipping_regions.region;
      excludeList = item.shipping_regions.exclude || [];
    } else {
      return null;
    }

    const countries = regionText
      .split(',')
      .map((country) => country.trim())
      .filter(Boolean);

    return {
      fullText: regionText,
      countries,
      excludeList,
      displayText:
        countries.join(', ') +
        (excludeList.length ? ` (excl. ${excludeList.join(', ')})` : ''),
    };
  };

  const renderRegionDisplay = () => {
    const regionInfo = getRegionInfo();

    if (!regionInfo) {
      return (
        <span className="truncate text-xs font-bold text-ink-500">
          Anywhere
        </span>
      );
    }

    const { displayText, countries } = regionInfo;

    if (displayText.length <= 30) {
      return (
        <span className="truncate text-xs font-bold text-ink-500">
          {displayText}
        </span>
      );
    }

    let cutIndex = 30;
    while (
      cutIndex > 0 &&
      displayText[cutIndex] !== ',' &&
      displayText[cutIndex] !== ' '
    ) {
      cutIndex--;
    }
    if (cutIndex === 0) cutIndex = 30;

    const truncatedText = displayText.substring(0, cutIndex) + '...';

    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs font-bold text-ink-500">
          {truncatedText}
        </span>

        <button
          type="button"
          onClick={() => setShowAllCountriesModal(true)}
          className="inline-flex h-6 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-ink-100 px-2 text-[10px] font-extrabold text-ink-700 transition hover:bg-ink-200"
          title={`Show all ${countries.length} regions`}
        >
          +{countries.length}
        </button>
      </div>
    );
  };

  /* ============================================================
     FETCH ITEM
  ============================================================ */

  const fetchItem = useCallback(async () => {
    if (fetchInProgress.current) return;

    fetchInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await itemsAPI.getById(id);
      if (!isMounted.current) return;

      const fetchedItem = response.data.item;

      setItem(fetchedItem);
      setSelectedImage(0);
      setIsFromPop(
        fetchedItem.source_type === 'pop_purchase' &&
          !!fetchedItem.source_purchase_id
      );

      /* Verification */
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', user.id)
          .single();

        if (isMounted.current) {
          setIsVerified(profileData?.email_verified || false);
        }
      }

      /* Owner */
      if (user && fetchedItem.donor_id === user.id) {
        setIsOwner(true);
        try {
          const appsResponse = await applicationsAPI.getByItem(id);
          if (isMounted.current) {
            setApplications(appsResponse.data.applications || []);
          }
        } catch (applicationError) {
          console.error('Failed to fetch applications:', applicationError);
        }
      } else {
        setIsOwner(false);
      }

      /* Eligibility */
      const isFeatured = fetchedItem.featured?.is_featured === true;
      const isEligible = isFeatured
        ? fetchedItem.featured?.can_apply === true
        : true;
      setCanApply(isEligible);

      /* Existing application */
      if (user && fetchedItem.donor_id !== user.id) {
        try {
          const myAppsResponse = await applicationsAPI.getMy();
          if (isMounted.current) {
            const existing = myAppsResponse.data.applications?.find(
              (application) =>
                application.item_id === id &&
                application.status === 'pending'
            );
            setHasApplied(!!existing);
          }
        } catch (applicationError) {
          console.error(
            'Failed to check application status:',
            applicationError
          );
        }
      }
    } catch (fetchError) {
      console.error('Failed to fetch item:', fetchError);
      if (isMounted.current) {
        setError(fetchError.response?.data?.error || 'Failed to load gift');
      }
    } finally {
      if (isMounted.current) setLoading(false);
      fetchInProgress.current = false;
    }
  }, [id, user]);

  useEffect(() => {
    isMounted.current = true;
    fetchItem();
    return () => {
      isMounted.current = false;
      fetchInProgress.current = false;
    };
  }, [id, fetchItem]);

  /* ============================================================
     OPEN APPLICATION FROM QUERY
  ============================================================ */

  useEffect(() => {
    if (!item || !isAuthenticated) return;

    const searchParams = new URLSearchParams(location.search);
    const showModal = searchParams.get('show-apply-modal') === 'true';

    if (showModal && item.status === 'active' && !isOwner) {
      if (!isVerified) {
        setShowVerificationModal(true);
      } else {
        setShowApplicationModal(true);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [
    location.search,
    location.pathname,
    isAuthenticated,
    item,
    isOwner,
    isVerified,
    navigate,
  ]);

  /* ============================================================
     APPLICATION
  ============================================================ */

  const handleApplyClick = () => {
    if (hasApplied) return;

    if (!canApply) {
      toast.error('You are not eligible to apply for this gift at this time.');
      return;
    }

    if (!isVerified) {
      setShowVerificationModal(true);
    } else {
      setShowApplicationModal(true);
    }
  };

  const handleResendVerification = async () => {
    if (resendingVerification) return;

    setResendingVerification(true);
    try {
      await authAPI.resendVerification(user?.email);
      toast.success('Verification email resent! Please check your inbox.');
      setShowVerificationModal(false);
    } catch {
      toast.error('Failed to resend verification email. Please try again.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleApply = async (formData) => {
    setIsApplying(true);
    try {
      await applicationsAPI.create({
        itemId: id,
        message: formData.message,
        shipping_estimate: formData.shipping_estimate || null,
      });

      toast.success('Your request to receive this gift has been submitted! 🎁');
      setShowApplicationModal(false);
      setHasApplied(true);
      fetchItem();
    } catch (applicationError) {
      toast.error(
        applicationError.response?.data?.error ||
          'Failed to submit your request'
      );
    } finally {
      setIsApplying(false);
    }
  };

  /* ============================================================
     DELETE
  ============================================================ */

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await itemsAPI.delete(id);
      toast.success('Gift removed successfully');
      navigate(to('/my-items'));
    } catch (deleteError) {
      toast.error(
        deleteError.response?.data?.error || 'Failed to remove gift'
      );
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ============================================================
     APPLICATION STATUS
  ============================================================ */

  const handleApplicationStatus = async (applicationId, status) => {
    try {
      await applicationsAPI.updateStatus(applicationId, status);
      toast.success(`Request ${status} successfully`);
      fetchItem();
    } catch (statusError) {
      toast.error(
        statusError.response?.data?.error || `Failed to ${status} request`
      );
    }
  };

  /* ============================================================
     SUPPORT / ACTION HELPERS
  ============================================================ */

  const handleReportIssue = (gift) => {
    setSupportItem(gift);
    setShowSupportModal(true);
  };

  const handleCopyItemId = (itemId) => {
    if (!itemId) {
      toast.error('No gift ID to copy');
      return;
    }

    navigator.clipboard
      .writeText(itemId)
      .then(() => toast.success('Gift ID copied to clipboard!'))
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = itemId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Gift ID copied to clipboard!');
      });
  };

  const handleJoinDiscussion = () => {
    navigate(to(`/discussions/item/${id}`));
  };

  /* ============================================================
     LOADING / ERROR
  ============================================================ */

  if (loading) return <ItemDetailSkeleton />;

  if (error || !item) {
    return (
      <div className="min-h-full bg-transparent">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <AlertTriangle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Gift not found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                {error ||
                  "The gift you're looking for doesn't exist or has been removed."}
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to={to("/browse")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <Package size={16} />
                  Explore Gifts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     DERIVED
  ============================================================ */

  const images = item.images || [];
  const mainImage = images.length > 0 ? images[selectedImage] : '';
  const statusDisplay = getStatusDisplay(item.status);
  const StatusIcon = getStatusIconComponent(item.status);
  const statusClasses = getStatusBadgeClasses(item.status);
  const conditionDisplay = getConditionDisplay(item.condition);

  const menuItems = [
    {
      key: 'report',
      icon: Flag,
      label: 'Report an Issue',
      onClick: () => handleReportIssue(item),
    },
    {
      key: 'copy',
      icon: Copy,
      label: 'Copy Gift ID',
      onClick: () => handleCopyItemId(item.id),
    },
    {
      key: 'discuss',
      icon: MessageCircle,
      label: 'Join Discussion',
      onClick: handleJoinDiscussion,
    },
  ];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">


      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="grid gap-7 pb-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          {/* ================================================
              LEFT — GALLERY
          ================================================ */}

          <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] border border-ink-100 bg-ink-50 shadow-sm">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-300">
                  <ImageIcon size={32} />
                  <span className="mt-2 text-xs font-bold">
                    No image available
                  </span>
                </div>
              )}

              {/* Status */}
              <div className="absolute right-4 top-4 z-10">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold backdrop-blur-md ${statusClasses}`}
                >
                  <StatusIcon size={11} />
                  {statusDisplay?.label || item.status}
                </span>
              </div>

              {/* Gift marker */}
              <div className="absolute bottom-4 left-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold text-ink-700 shadow-sm backdrop-blur-md">
                  <Gift size={12} className="text-primary-600" />
                  Community Gift
                </div>
              </div>

              {/* POP */}
              {isFromPop && (
                <div className="absolute bottom-4 right-4">
                  <a
                    href={
                      item.donor_id === user?.id
                        ? `/app/pop/purchases/${item.source_purchase_id}`
                        : '/app/pop'
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-ink-700 shadow-sm backdrop-blur-md transition hover:text-primary-600"
                    title="Donated from POP purchase"
                  >
                    <img
                      src={logo}
                      alt="POP"
                      className="logo h-3.5 w-3.5 rounded object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                    <span>Donated via POP</span>
                    <CircleArrowOutUpRight size={11} className="opacity-60" />
                  </a>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === index
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-ink-200 opacity-75 hover:border-primary-300 hover:opacity-100'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${item.title} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Giving message */}
            <div className="hidden items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 sm:flex">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Heart size={14} />
              </div>

              <p className="text-xs font-medium leading-relaxed text-primary-800">
                Someone is choosing to give this item away. If it is useful to
                you, you can request to receive it.
              </p>
            </div>
          </div>

          {/* ================================================
              RIGHT — INFORMATION
          ================================================ */}

          <div className="flex min-w-0 flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  <Gift size={14} strokeWidth={2.5} />
                  <span>Available gift</span>
                </div>

                <h1 className="text-2xl font-black leading-tight tracking-tight text-ink-950 sm:text-3xl">
                  {item.title}
                </h1>
              </div>

              <ActionMenu items={menuItems} placement="right" align="top" />
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${conditionDisplay.classes}`}
              >
                {conditionDisplay.label}
              </span>

              <span className="inline-flex items-center rounded-full border border-ink-200 bg-ink-100 px-3 py-1.5 text-[10px] font-extrabold text-ink-700">
                {item.category}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${
                  item.donor_pays_shipping
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-warning-200 bg-warning-50 text-warning-700'
                }`}
              >
                {item.donor_pays_shipping ? (
                  <>
                    <Truck size={11} />
                    Donor covers shipping
                  </>
                ) : (
                  <>
                    <Wallet size={11} />
                    Recipient covers shipping
                  </>
                )}
              </span>
            </div>

            {/* Metadata */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-b border-ink-100 pb-5 text-xs sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin size={12} className="shrink-0 text-ink-400" />
                <span className="truncate font-bold text-ink-500">
                  {getLocationCountry(item.donor?.location) ||
                    'Location unspecified'}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <Globe size={12} className="shrink-0 text-ink-400" />
                {renderRegionDisplay()}
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0 text-ink-400" />
                <span className="font-bold text-ink-500">
                  {formatDate(item.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Eye size={12} className="shrink-0 text-ink-400" />
                <span className="font-bold text-ink-500">
                  {item.views_count || 0} views
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users size={12} className="shrink-0 text-ink-400" />
                <span className="font-bold text-ink-500">
                  {item.applications_count || 0} requests
                </span>
              </div>
            </div>

            {/* Donor card */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              {item.donor?.avatar_url ? (
                <img
                  src={item.donor.avatar_url}
                  alt={item.donor.full_name || 'Donor'}
                  className="h-12 w-12 shrink-0 rounded-full border border-ink-100 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-100 text-ink-500">
                  <User size={18} />
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink-950">
                  Given by {item.donor?.full_name || 'Anonymous'}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <Star
                      size={11}
                      className="text-warning-500"
                      fill="currentColor"
                    />
                    {item.donor?.rating || '0.0'}
                  </span>

                  <span className="text-ink-300">•</span>

                  <span>{item.donor?.items_given || 0} gifts given</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare size={14} className="text-primary-600" />
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                  About this gift
                </h3>
              </div>

              <p
                className={`text-sm font-medium leading-7 text-ink-600 ${
                  !showFullDescription ? 'line-clamp-4' : ''
                }`}
              >
                {item.description ||
                  'The donor did not provide a description for this gift.'}
              </p>

              {item.description && item.description.length > 180 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className="mt-2 text-xs font-extrabold text-primary-600 transition hover:text-primary-700"
                >
                  {showFullDescription ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {/* Specifications */}
            {(item.weight_kg ||
              item.length_cm ||
              item.width_cm ||
              item.height_cm) && (
              <div className="mt-6 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                  Gift details
                </h4>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {item.weight_kg && (
                    <div>
                      <p className="text-[11px] font-bold text-ink-400">
                        Weight
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-ink-800">
                        {item.weight_kg} kg
                      </p>
                    </div>
                  )}

                  {item.length_cm && (
                    <div>
                      <p className="text-[11px] font-bold text-ink-400">
                        Length
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-ink-800">
                        {item.length_cm} cm
                      </p>
                    </div>
                  )}

                  {item.width_cm && (
                    <div>
                      <p className="text-[11px] font-bold text-ink-400">
                        Width
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-ink-800">
                        {item.width_cm} cm
                      </p>
                    </div>
                  )}

                  {item.height_cm && (
                    <div>
                      <p className="text-[11px] font-bold text-ink-400">
                        Height
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-ink-800">
                        {item.height_cm} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed / Winner */}
            {item.status === 'completed' && item.winner && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
                  <Gift size={16} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-warning-900">
                    Gift Received
                  </p>

                  <p className="mt-0.5 text-xs font-medium leading-5 text-warning-700">
                    This gift was given to{' '}
                    {item.winner.full_name || 'the recipient'} on{' '}
                    {formatDate(item.winner_announced_at)}.
                  </p>
                </div>
              </div>
            )}

            {/* ================================================
                ACTION AREA
            ================================================ */}

            <div className="mt-7 border-t border-ink-100 pt-5">
              {/* Owner active */}
              {isOwner && item.status === 'active' && (
                <div className="flex gap-2">
                  <Link
                    to={to(`/edit-item/${item.id}`)}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                  >
                    <Pencil size={14} />
                    Edit Gift
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleting}
                    title="Remove gift"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 text-sm font-extrabold text-danger-700 transition hover:bg-danger-100 disabled:cursor-wait disabled:opacity-60"
                    aria-label="Remove gift"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Recipient */}
              {isAuthenticated && !isOwner && item.status === 'active' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <FavoriteButton itemId={id} />

                    <button
                      type="button"
                      onClick={handleApplyClick}
                      disabled={hasApplied || !canApply}
                      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-sm font-extrabold transition disabled:cursor-not-allowed ${
                        hasApplied || !canApply
                          ? 'border border-ink-200 bg-ink-100 text-ink-400'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {hasApplied ? (
                        <>
                          <CheckCircle2 size={15} />
                          Request Submitted
                        </>
                      ) : !canApply ? (
                        <>
                          <Lock size={15} />
                          Can't request gift
                        </>
                      ) : (
                        <>
                          <Gift size={15} />
                          Request This Gift
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-[11px] font-bold text-ink-400">
                    Requesting doesn't guarantee that you'll be selected.
                  </p>
                </div>
              )}

              {/* Logged out */}
              {!isAuthenticated && item.status === 'active' && (
                <div className="space-y-3">
                  <Link
                    to={to("/login")}
                    state={{ from: location.pathname }}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-extrabold text-white transition hover:bg-primary-700"
                  >
                    <LogIn size={16} />
                    Sign in to Request This Gift
                  </Link>

                  <p className="text-center text-[11px] font-bold text-ink-400">
                    Sign in to let the donor know why this gift would be
                    meaningful to you.
                  </p>
                </div>
              )}

              {/* Owner pending */}
              {isOwner && item.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => setShowApplications((v) => !v)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <Users size={15} />
                  {showApplications
                    ? 'Hide Requests'
                    : `View Requests (${applications.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================================================
            APPLICATIONS
        ================================================ */}

        {isOwner && showApplications && item.status === 'pending' && (
          <div className="border-t border-ink-100 pb-4 pt-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-black tracking-tight text-ink-950">
                  People requesting this gift
                </h3>

                <p className="mt-1 text-xs font-medium leading-5 text-ink-500">
                  Review their messages and choose who you'd like to give the
                  item to.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-ink-200 bg-ink-100 px-2.5 py-1 text-[10px] font-extrabold text-ink-600">
                {applications.length}
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="rounded-[26px] border border-ink-100 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
                  <Users size={20} />
                </div>

                <p className="text-sm font-black text-ink-950">
                  No requests yet
                </p>

                <p className="mt-1 text-xs font-medium text-ink-500">
                  People who want to receive this gift will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {applications.map((application) => {
                  const appStatusDisplay = getStatusDisplay(
                    application.status
                  );
                  const AppStatusIcon = getStatusIconComponent(
                    application.status
                  );
                  const appStatusClasses = getStatusBadgeClasses(
                    application.status
                  );

                  return (
                    <div
                      key={application.id}
                      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-ink-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {application.applicant?.avatar_url ? (
                            <img
                              src={application.applicant.avatar_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                              <User size={15} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-ink-950">
                              {application.applicant?.full_name ||
                                'Anonymous'}
                            </p>

                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink-500">
                              <MapPin size={11} />
                              {getLocationCountry(
                                application.applicant?.location
                              ) || 'Location unspecified'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${appStatusClasses}`}
                        >
                          <AppStatusIcon size={11} />
                          {appStatusDisplay?.label || application.status}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-xs font-medium leading-relaxed text-ink-600">
                        {application.message}
                      </div>

                      {application.status === 'pending' && (
                        <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleApplicationStatus(
                                application.id,
                                'accepted'
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-success-600 px-4 text-xs font-extrabold text-white transition hover:bg-success-700"
                          >
                            <Check size={13} />
                            Choose Recipient
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleApplicationStatus(
                                application.id,
                                'rejected'
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-4 text-xs font-extrabold text-danger-700 transition hover:bg-danger-100"
                          >
                            <X size={13} />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================
          APPLICATION MODAL
      ================================================ */}

      <Modal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        title="Request This Gift"
        size="lg"
        position="bottom"
      >
        <ApplicationForm
          itemId={id}
          onSuccess={() => {
            setShowApplicationModal(false);
            setHasApplied(true);
            fetchItem();
          }}
          onCancel={() => setShowApplicationModal(false)}
        />
      </Modal>

      {/* ================================================
          DELETE MODAL
      ================================================ */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Gift"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Remove this gift?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                Removing <strong>"{item?.title}"</strong> is permanent and
                cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              Keep Gift
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Remove Gift
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================
          VERIFICATION MODAL
      ================================================ */}

      <Modal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        title="Email Verification Required"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-warning-200 bg-warning-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
              <ShieldAlert size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-warning-900">
                Verification required
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-warning-700">
                Please verify your email address before requesting a gift.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3">
            <Mail size={14} className="mt-0.5 shrink-0 text-ink-500" />

            <p className="text-xs font-medium leading-5 text-ink-600">
              Verification email sent to{' '}
              <strong className="break-all font-extrabold text-ink-800">
                {user?.email}
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              disabled={resendingVerification}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendingVerification ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Resend Email
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================================================
          COUNTRIES MODAL
      ================================================ */}

      {(() => {
        const regionInfo = getRegionInfo();
        if (!regionInfo || regionInfo.countries.length === 0) return null;

        const { countries, excludeList } = regionInfo;

        return (
          <Modal
            isOpen={showAllCountriesModal}
            onClose={() => setShowAllCountriesModal(false)}
            title="Gift Availability"
            size="md"
          >
            <div className="space-y-5">
              <p className="text-sm font-medium leading-6 text-ink-500">
                This gift is available for recipients in the following
                regions.
              </p>

              <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {countries.map((country, index) => {
                  const isExcluded = excludeList.includes(country);

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${
                        isExcluded
                          ? 'border-danger-200 bg-danger-50 text-danger-700'
                          : 'border-ink-100 bg-ink-50 text-ink-700'
                      }`}
                    >
                      {isExcluded ? (
                        <XCircle size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}

                      <span className={isExcluded ? 'line-through' : ''}>
                        {country}
                        {isExcluded && (
                          <span className="ml-1 text-[10px] font-extrabold text-danger-500">
                            (excluded)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                  Excluding
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {excludeList.length > 0 ? (
                    excludeList.map((country, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-danger-200 bg-danger-50 px-3 py-1 text-[10px] font-extrabold text-danger-700"
                      >
                        {country}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-medium text-ink-400">
                      No exclusions selected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ================================================
          SUPPORT
      ================================================ */}

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => {
          setShowSupportModal(false);
          setSupportItem(null);
        }}
        itemId={supportItem?.id}
        reporterType="unknown"
        onSuccess={() =>
          toast.success(
            'Issue reported successfully. Our team will follow up shortly.'
          )
        }
      />
    </div>
  );
};

export default ItemDetailPage;