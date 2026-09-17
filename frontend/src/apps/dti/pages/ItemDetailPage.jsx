import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import {
  useParams,
  useNavigate,
  useLocation,
  Link,
} from 'react-router-dom';

import { toast } from 'sonner';

import { supabase } from '@/services/api/supabase';
import { useAuth } from '@/context/AuthContext';

import {
  itemsAPI,
  favoritesAPI,
  applicationsAPI,
  authAPI,
} from '@/services/api/dtiApi';

import Modal from '@/reusables/Modal';

import {
  CircleArrowOutUpRight,
} from 'lucide-react';

import {
  PageNavigation,
} from '@/reusables/PageNavigation';

import {
  getStatusDisplay,
} from '@/utils/constants';

import ApplicationForm from './ApplicationForm';
import SupportModal from '../components/common/SupportModal';

import logo from '@/assets/popLogo1.png';


// ============================================================
// CLICK OUTSIDE
// ============================================================

const useClickOutside = (onOutside) => {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        onOutside();
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [onOutside]);

  return ref;
};


// ============================================================
// ACTION MENU
// ============================================================

const ActionMenu = ({
  item,
  onReportIssue,
  onCopyItemId,
  onJoinDiscussion,
}) => {
  const [open, setOpen] = useState(false);

  const menuRef = useClickOutside(() => {
    setOpen(false);
  });

  return (
    <div
      ref={menuRef}
      className="relative z-30"
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="
          w-10 h-10
          rounded-card
          bg-ink-100
          border border-ink-200
          shadow-xs
          flex items-center justify-center
          text-ink-500
          hover:text-primary-600
          hover:border-primary-300
          hover:bg-primary-50
          transition-all
        "
        aria-label="Item actions"
        aria-expanded={open}
      >
        <i className="bi bi-three-dots text-base" />
      </button>

      {open && (
        <div
          className="
            absolute
            top-12
            right-0
            w-56
            bg-ink-100
            border border-ink-200
            rounded-card
            p-1.5
            shadow-large
            backdrop-blur-md
          "
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onReportIssue(item);
            }}
            className="
              w-full
              px-4 py-2.5
              text-left
              text-xs font-bold
              text-ink-700
              hover:bg-ink-200
              rounded-xl
              transition
              flex items-center gap-2.5
            "
          >
            <i className="bi bi-flag text-warning-500 text-sm" />
            <span>Report an Issue</span>
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onCopyItemId(item.id);
            }}
            className="
              w-full
              px-4 py-2.5
              text-left
              text-xs font-bold
              text-ink-700
              hover:bg-ink-200
              rounded-xl
              transition
              flex items-center gap-2.5
            "
          >
            <i className="bi bi-clipboard text-primary-500 text-sm" />
            <span>Copy Gift ID</span>
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onJoinDiscussion();
            }}
            className="
              w-full
              px-4 py-2.5
              text-left
              text-xs font-bold
              text-ink-700
              hover:bg-ink-200
              rounded-xl
              transition
              flex items-center gap-2.5
            "
          >
            <i className="bi bi-chat-dots text-primary-500 text-sm" />
            <span>Join Discussion</span>
          </button>
        </div>
      )}
    </div>
  );
};


// ============================================================
// FAVORITE BUTTON
// ============================================================

const FavoriteButton = ({
  itemId,
  className = '',
}) => {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    isFavorited,
    setIsFavorited,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !itemId) return;

    const checkFavorite = async () => {
      try {
        const response = await favoritesAPI.check(itemId);

        setIsFavorited(
          response.data.isFavorited || false
        );
      } catch (error) {
        console.error(
          'Failed to check favorite status:',
          error
        );
      }
    };

    checkFavorite();
  }, [
    itemId,
    isAuthenticated,
  ]);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      toast.error(
        'Please sign in to save gifts'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      if (isFavorited) {
        await favoritesAPI.remove(itemId);

        setIsFavorited(false);

        toast.success(
          'Removed from saved gifts'
        );
      } else {
        await favoritesAPI.add(itemId);

        setIsFavorited(true);

        toast.success(
          'Gift saved'
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        'Failed to update saved gifts'
      );
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
        text-xs
        flex items-center justify-center gap-2
        px-4 py-3
        rounded-card
        font-bold
        transition-all
        shadow-xs
        ${
          isFavorited
            ? `
              bg-danger-50
              text-danger-600
              border border-danger-200
              hover:bg-danger-100
            `
            : `
              bg-ink-100
              text-ink-700
              border border-ink-200
              hover:border-danger-200
              hover:text-danger-600
              hover:bg-danger-50
            `
        }
        ${className}
      `}
    >
      {loading ? (
        <span
          className="
            animate-spin
            rounded-full
            h-4 w-4
            border-2
            border-danger-500
            border-t-transparent
          "
        />
      ) : (
        <i
          className={`
            bi
            ${
              isFavorited
                ? 'bi-heart-fill'
                : 'bi-heart'
            }
            text-sm
          `}
        />
      )}

      <span>
        {isFavorited
          ? 'Saved'
          : 'Save Gift'}
      </span>
    </button>
  );
};


// ============================================================
// SKELETON
// ============================================================

const ItemDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="
        mx-auto
        max-w-7xl
        px-4 sm:px-6 lg:px-10
        py-6
      ">
        <div className="
          h-6
          bg-ink-200
          rounded-lg
          w-32
          mb-6
          animate-pulse
        " />

        <div className="
          grid
          lg:grid-cols-[1.05fr_.95fr]
          gap-8
        ">
          <div>
            <div className="
              bg-ink-200
              rounded-card
              aspect-[4/3]
              animate-pulse
            " />

            <div className="flex gap-2 mt-3">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="
                    w-16 h-16
                    bg-ink-200
                    rounded-xl
                    animate-pulse
                  "
                />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <div className="
                h-9
                bg-ink-200
                rounded-xl
                w-4/5
                animate-pulse
              " />

              <div className="
                flex gap-2
              ">
                <div className="
                  h-7 w-20
                  bg-ink-200
                  rounded-full
                  animate-pulse
                " />

                <div className="
                  h-7 w-24
                  bg-ink-200
                  rounded-full
                  animate-pulse
                " />
              </div>
            </div>

            <div className="
              bg-ink-100
              border border-ink-200
              rounded-card
              p-4
              animate-pulse
            ">
              <div className="flex gap-3">
                <div className="
                  w-12 h-12
                  rounded-full
                  bg-ink-200
                " />

                <div className="space-y-2 flex-1">
                  <div className="
                    h-4
                    bg-ink-200
                    rounded
                    w-40
                  " />

                  <div className="
                    h-3
                    bg-ink-200
                    rounded
                    w-28
                  " />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="
                h-4
                bg-ink-200
                rounded
                w-28
              " />

              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="
                    h-3
                    bg-ink-200
                    rounded
                    w-full
                  "
                />
              ))}
            </div>

            <div className="
              h-12
              bg-ink-200
              rounded-card
              animate-pulse
            " />
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================
// MAIN
// ============================================================

const ItemDetailPage = () => {
  const {
    id,
  } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    isAuthenticated,
  } = useAuth();

  const [
    item,
    setItem,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    showApplicationModal,
    setShowApplicationModal,
  ] = useState(false);

  const [
    showFullDescription,
    setShowFullDescription,
  ] = useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(0);

  const [
    isApplying,
    setIsApplying,
  ] = useState(false);

  const [
    hasApplied,
    setHasApplied,
  ] = useState(false);
		
  const [
    canApply,
    setCanApply,
  ] = useState(false);

  const [
    isOwner,
    setIsOwner,
  ] = useState(false);

  const [
    isVerified,
    setIsVerified,
  ] = useState(false);

  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    showApplications,
    setShowApplications,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    showAllCountriesModal,
    setShowAllCountriesModal,
  ] = useState(false);

  const [
    showVerificationModal,
    setShowVerificationModal,
  ] = useState(false);

  const [
    resendingVerification,
    setResendingVerification,
  ] = useState(false);

  const [
    showSupportModal,
    setShowSupportModal,
  ] = useState(false);

  const [
    supportItem,
    setSupportItem,
  ] = useState(null);

  const [
    isFromPop,
    setIsFromPop,
  ] = useState(false);

  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);


  // ==========================================================
  // HELPERS
  // ==========================================================

  const getConditionDisplay = (condition) => {
    const conditionMap = {
      New: {
        label: 'New',
        color: `
          bg-success-50
          text-success-700
          border-success-200
        `,
      },

      'Like New': {
        label: 'Like New',
        color: `
          bg-primary-50
          text-primary-700
          border-primary-200
        `,
      },

      Good: {
        label: 'Good',
        color: `
          bg-brand-50
          text-brand-700
          border-brand-200
        `,
      },

      Fair: {
        label: 'Fair',
        color: `
          bg-warning-50
          text-warning-700
          border-warning-200
        `,
      },

      Poor: {
        label: 'Poor',
        color: `
          bg-danger-50
          text-danger-700
          border-danger-200
        `,
      },
    };

    return (
      conditionMap[condition] || {
        label: condition,
        color: `
          bg-ink-100
          text-ink-700
          border-ink-200
        `,
      }
    );
  };


  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };


  const getRegionInfo = () => {
    if (!item?.shipping_regions) {
      return null;
    }

    let regionText = '';
    let excludeList = [];

    if (
      typeof item.shipping_regions === 'string'
    ) {
      regionText =
        item.shipping_regions;
    } else if (
      item.shipping_regions.region
    ) {
      regionText =
        item.shipping_regions.region;

      excludeList =
        item.shipping_regions.exclude ||
        [];
    } else {
      return null;
    }

    const countries =
      regionText
        .split(',')
        .map((country) => country.trim())
        .filter(Boolean);

    return {
      fullText: regionText,
      countries,
      excludeList,
      displayText:
        countries.join(', ') +
        (
          excludeList.length
            ? ` (excl. ${excludeList.join(', ')})`
            : ''
        ),
    };
  };


  const renderRegionDisplay = () => {
    const regionInfo =
      getRegionInfo();

    if (!regionInfo) {
      return (
        <span className="text-ink-600 font-medium">
          Anywhere
        </span>
      );
    }

    const {
      displayText,
      countries,
    } = regionInfo;

    if (displayText.length <= 30) {
      return (
        <span className="text-ink-600 font-medium">
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

    if (cutIndex === 0) {
      cutIndex = 30;
    }

    const truncatedText =
      displayText.substring(0, cutIndex) +
      '...';

    return (
      <div className="
        flex
        items-center
        gap-2
        min-w-0
      ">
        <span className="
          text-ink-600
          font-medium
          truncate
        ">
          {truncatedText}
        </span>

        <button
          type="button"
          onClick={() =>
            setShowAllCountriesModal(true)
          }
          className="
            inline-flex
            items-center
            justify-center
            min-w-[28px]
            h-6
            bg-ink-100
            hover:bg-ink-200
            rounded-full
            text-xs
            font-bold
            text-ink-700
            transition-colors
            px-2
            flex-shrink-0
          "
          title={`Show all ${countries.length} regions`}
        >
          +{countries.length}
        </button>
      </div>
    );
  };


  // ==========================================================
  // COUNTRIES MODAL
  // ==========================================================

  const renderCountriesModal = () => {
    const regionInfo =
      getRegionInfo();

    if (
      !regionInfo ||
      regionInfo.countries.length === 0
    ) {
      return null;
    }

    const {
      countries,
      excludeList,
    } = regionInfo;

    return (
      <Modal
        isOpen={showAllCountriesModal}
        onClose={() =>
          setShowAllCountriesModal(false)
        }
        title="Gift Availability"
        size="md"
      >
        <div className="py-2">

          <p className="
            text-sm
            text-ink-500
            mb-4
          ">
            This gift is available for recipients
            in the following regions.
          </p>

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-2
            max-h-60
            overflow-y-auto
          ">
            {countries.map(
              (country, index) => {
                const isExcluded =
                  excludeList.includes(
                    country
                  );

                return (
                  <div
                    key={index}
                    className={`
                      flex
                      items-center
                      gap-2
                      px-3 py-2.5
                      rounded-xl
                      text-xs
                      font-medium
                      ${
                        isExcluded
                          ? `
                            bg-danger-50
                            text-danger-700
                            border border-danger-200
                          `
                          : `
                            bg-ink-100
                            text-ink-700
                            border border-ink-200
                          `
                      }
                    `}
                  >
                    <i
                      className={`
                        bi
                        ${
                          isExcluded
                            ? 'bi-x-circle'
                            : 'bi-check-circle'
                        }
                        text-sm
                      `}
                    />

                    <span
                      className={
                        isExcluded
                          ? 'line-through'
                          : ''
                      }
                    >
                      {country}

                      {isExcluded && (
                        <span className="
                          text-[10px]
                          text-danger-500
                          ml-1
                          font-bold
                        ">
                          (excluded)
                        </span>
                      )}
                    </span>
                  </div>
                );
              }
            )}
          </div>

          <div className="
            mt-4
            rounded-card
            border border-ink-200
            bg-ink-100
            p-4
          ">
            <p className="
              mb-2
              text-xs
              font-bold
              text-ink-700
              uppercase
              tracking-wide
            ">
              Excluding
            </p>

            <div className="
              flex
              flex-wrap
              gap-1.5
            ">
              {excludeList.length > 0 ? (
                excludeList.map(
                  (country, index) => (
                    <span
                      key={index}
                      className="
                        rounded-full
                        bg-danger-100
                        px-3 py-1
                        text-xs
                        font-bold
                        text-danger-700
                      "
                    >
                      {country}
                    </span>
                  )
                )
              ) : (
                <span className="
                  text-xs
                  text-ink-400
                  font-medium
                ">
                  No exclusions selected
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  };


  // ==========================================================
  // FETCH ITEM
  // ==========================================================

  const fetchItem = useCallback(
    async () => {
      if (fetchInProgress.current) {
        return;
      }

      fetchInProgress.current = true;

      setLoading(true);
      setError(null);

      try {
        const response =
          await itemsAPI.getById(id);

        if (!isMounted.current) {
          return;
        }

        const fetchedItem =
          response.data.item;

        setItem(fetchedItem);
        setSelectedImage(0);

        setIsFromPop(
          fetchedItem.source_type ===
            'pop_purchase' &&
          !!fetchedItem.source_purchase_id
        );


        // ------------------------------------------
        // Verification
        // ------------------------------------------

        if (user) {
          const {
            data: profileData,
          } = await supabase
            .from('profiles')
            .select('email_verified')
            .eq('id', user.id)
            .single();

          if (isMounted.current) {
            setIsVerified(
              profileData?.email_verified ||
              false
            );
          }
        }


        // ------------------------------------------
        // Owner
        // ------------------------------------------

        if (
          user &&
          fetchedItem.donor_id === user.id
        ) {
          setIsOwner(true);

          try {
            const appsResponse =
              await applicationsAPI.getByItem(id);

            if (isMounted.current) {
              setApplications(
                appsResponse.data
                  .applications || []
              );
            }
          } catch (applicationError) {
            console.error(
              'Failed to fetch applications:',
              applicationError
            );
          }
        } else {
          setIsOwner(false);
        }


        // ------------------------------------------
        // can apply to featured items
        // ------------------------------------------
        const isFeatured = fetchedItem.featured?.is_featured === true;
        const isEligible = isFeatured ? (fetchedItem.featured?.can_apply === true) : true;
        setCanApply(isEligible);
        // ------------------------------------------
console.log(fetchedItem)

        // ------------------------------------------
        // Existing application
        // ------------------------------------------

        if (
          user &&
          fetchedItem.donor_id !== user.id
        ) {
          try {
            const myAppsResponse =
              await applicationsAPI.getMy();

            if (isMounted.current) {
              const existing =
                myAppsResponse.data
                  .applications
                  ?.find(
                    (application) =>
                      application.item_id === id &&
                      application.status === 'pending'
                  );

              setHasApplied(
                !!existing
              );
            }
          } catch (applicationError) {
            console.error(
              'Failed to check application status:',
              applicationError
            );
          }
        }
      } catch (fetchError) {
        console.error(
          'Failed to fetch item:',
          fetchError
        );

        if (isMounted.current) {
          setError(
            fetchError.response?.data?.error ||
            'Failed to load gift'
          );
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }

        fetchInProgress.current =
          false;
      }
    },
    [id, user]
  );


  useEffect(() => {
    isMounted.current = true;

    fetchItem();

    return () => {
      isMounted.current = false;
      fetchInProgress.current = false;
    };
  }, [
    id,
    fetchItem,
  ]);


  // ==========================================================
  // OPEN APPLICATION FROM QUERY
  // ==========================================================

  useEffect(() => {
    if (
      !item ||
      !isAuthenticated
    ) {
      return;
    }

    const searchParams =
      new URLSearchParams(
        location.search
      );

    const showModal =
      searchParams.get(
        'show-apply-modal'
      ) === 'true';

    if (
      showModal &&
      item.status === 'active' &&
      !isOwner
    ) {
      if (!isVerified) {
        setShowVerificationModal(true);
      } else {
        setShowApplicationModal(true);
      }

      navigate(
        location.pathname,
        { replace: true }
      );
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


  // ==========================================================
  // APPLICATION
  // ==========================================================

  const handleApplyClick = () => {
    if (hasApplied) {
      return;
    }

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
    if (resendingVerification) {
      return;
    }

    setResendingVerification(true);

    try {
      await authAPI.resendVerification(
        user?.email
      );

      toast.success(
        'Verification email resent! Please check your inbox.'
      );

      setShowVerificationModal(false);
    } catch {
      toast.error(
        'Failed to resend verification email. Please try again.'
      );
    } finally {
      setResendingVerification(false);
    }
  };


  const handleApply = async (
    formData
  ) => {
    setIsApplying(true);

    try {
      await applicationsAPI.create({
        itemId: id,
        message: formData.message,
        shipping_estimate:
          formData.shipping_estimate ||
          null,
      });

      toast.success(
        'Your request to receive this gift has been submitted! 🎁'
      );

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


  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await itemsAPI.delete(id);

      toast.success(
        'Gift removed successfully'
      );

      navigate('/my-items');
    } catch (deleteError) {
      toast.error(
        deleteError.response?.data?.error ||
        'Failed to remove gift'
      );
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };


  // ==========================================================
  // APPLICATION STATUS
  // ==========================================================

  const handleApplicationStatus = async (
    applicationId,
    status
  ) => {
    try {
      await applicationsAPI.updateStatus(
        applicationId,
        status
      );

      toast.success(
        `Request ${status} successfully`
      );

      fetchItem();
    } catch (statusError) {
      toast.error(
        statusError.response?.data?.error ||
        `Failed to ${status} request`
      );
    }
  };


  // ==========================================================
  // SUPPORT
  // ==========================================================

  const handleReportIssue = (
    gift
  ) => {
    setSupportItem(gift);
    setShowSupportModal(true);
  };


  const handleCopyItemId = (
    itemId
  ) => {
    if (!itemId) {
      toast.error(
        'No gift ID to copy'
      );
      return;
    }

    navigator.clipboard
      .writeText(itemId)
      .then(() => {
        toast.success(
          'Gift ID copied to clipboard!'
        );
      })
      .catch(() => {
        const textArea =
          document.createElement(
            'textarea'
          );

        textArea.value = itemId;

        document.body.appendChild(
          textArea
        );

        textArea.select();

        document.execCommand(
          'copy'
        );

        document.body.removeChild(
          textArea
        );

        toast.success(
          'Gift ID copied to clipboard!'
        );
      });
  };


  const handleJoinDiscussion = () => {
    navigate(
      `/discussions/item/${id}`
    );
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return <ItemDetailSkeleton />;
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !item) {
    return (
      <div className="
        min-h-[60vh]
        flex
        flex-col
        items-center
        justify-center
        px-4
        bg-ink-50
      ">
        <div className="
          w-16 h-16
          rounded-hero
          bg-ink-100
          flex
          items-center
          justify-center
          text-ink-400
          mb-4
          shadow-xs
          border border-ink-200
        ">
          <i className="
            bi
            bi-gift
            text-2xl
          " />
        </div>

        <h2 className="
          text-xl
          font-extrabold
          text-ink-900
          mt-2
        ">
          Gift Not Found
        </h2>

        <p className="
          text-ink-500
          text-sm
          mt-1
          text-center
          max-w-md
        ">
          {error ||
            "The gift you're looking for doesn't exist or has been removed."}
        </p>

        <Link
          to="/browse"
          className="
            mt-6
            px-6 py-3
            bg-primary-600
            hover:bg-primary-700
            text-white
            rounded-card
            text-sm
            font-bold
            shadow-xs
            transition-all
          "
        >
          Explore Gifts
        </Link>
      </div>
    );
  }


  // ==========================================================
  // DISPLAY DATA
  // ==========================================================

  const images =
    item.images || [];

  const mainImage =
    images.length > 0
      ? images[selectedImage]
      : '';

  const statusDisplay =
    getStatusDisplay(
      item.status
    );

  const conditionDisplay =
    getConditionDisplay(
      item.condition
    );


  const getStatusBadgeClasses = (
    status
  ) => {
    const statusMap = {
      active: `
        bg-success-50
        text-success-700
        border-success-200
      `,

      pending: `
        bg-warning-50
        text-warning-700
        border-warning-200
      `,

      completed: `
        bg-primary-50
        text-primary-700
        border-primary-200
      `,

      cancelled: `
        bg-danger-50
        text-danger-700
        border-danger-200
      `,
    };

    return (
      statusMap[status] ||
      `
        bg-ink-100
        text-ink-700
        border-ink-200
      `
    );
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="
      min-h-screen
      bg-ink-50
      pb-12
    ">

      <div className="
        mx-auto
        max-w-7xl
        px-4
        sm:px-6
        lg:px-10
      ">

        <PageNavigation />


        {/* ==================================================
            MAIN DETAIL
        ================================================== */}

        <div className="
          grid
          lg:grid-cols-[1.05fr_.95fr]
          gap-7
          lg:gap-10
          pb-8
        ">


          {/* ==================================================
              LEFT — GALLERY
          ================================================== */}

          <div className="
            space-y-3
            lg:sticky
            lg:top-24
            lg:self-start
          ">

            <div className="
              relative
              overflow-hidden
              rounded-hero
              border border-ink-200
              bg-ink-100
              aspect-[4/3]
              shadow-xs
            ">

              {mainImage ? (
                <img
                  src={mainImage}
                  alt={item.title}
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />
              ) : (
                <div className="
                  absolute
                  inset-0
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-ink-400
                ">
                  <i className="
                    bi
                    bi-image
                    text-4xl
                    mb-2
                  " />

                  <span className="
                    text-xs
                    font-medium
                  ">
                    No image available
                  </span>
                </div>
              )}


              {/* Status */}

              <div className="
                absolute
                top-4
                right-4
                z-10
              ">
                <span className={`
                  inline-flex
                  items-center
                  gap-1.5
                  px-3
                  py-1.5
                  rounded-full
                  text-xs
                  font-bold
                  border
                  shadow-xs
                  backdrop-blur-md
                  ${getStatusBadgeClasses(
                    item.status
                  )}
                `}>
                  <i
                    className={`
                      bi
                      ${
                        statusDisplay?.icon ||
                        'bi-circle'
                      }
                    `}
                  />

                  {statusDisplay?.label ||
                    item.status}
                </span>
              </div>


              {/* Gift marker */}

              <div className="
                absolute
                left-4
                bottom-4
              ">
                <div className="
                  inline-flex
                  items-center
                  gap-2
                  px-3
                  py-1.5
                  rounded-full
                  bg-ink-50/90
                  border border-ink-200
                  backdrop-blur-md
                  text-xs
                  font-bold
                  text-ink-700
                  shadow-xs
                ">
                  <i className="
                    bi
                    bi-gift
                    text-primary-600
                  " />

                  Community Gift
                </div>
              </div>


              {/* POP */}

              {isFromPop && (
                <div className="
                  absolute
                  bottom-4
                  right-4
                ">
                  <a
                    href={
                      item.donor_id === user?.id
                        ? `/app/pop/purchases/${item.source_purchase_id}`
                        : '/app/pop'
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-ink-50/95
                      backdrop-blur-md
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-ink-700
                      shadow-xs
                      border border-ink-200
                      hover:text-primary-600
                      transition-colors
                    "
                    title="Donated from POP purchase"
                  >
                    <img
                      src={logo}
                      alt="POP"
                      className="
                        h-3.5
                        w-3.5
                        rounded
                        object-contain
                      "
                      onError={(event) => {
                        event.currentTarget.style.display =
                          'none';
                      }}
                    />

                    <span>
                      Donated via POP
                    </span>

                    <CircleArrowOutUpRight
                      className="
                        w-3
                        h-3
                        opacity-60
                      "
                    />
                  </a>
																		
                </div>
              )}
            </div>


            {/* ==================================================
                THUMBNAILS
            ================================================== */}

            {images.length > 1 && (
              <div className="
                flex
                gap-2
                overflow-x-auto
                pb-1
                scrollbar-hide
              ">
                {images.map(
                  (image, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() =>
                        setSelectedImage(index)
                      }
                      className={`
                        w-16
                        h-16
                        flex-shrink-0
                        rounded-xl
                        overflow-hidden
                        border-2
                        transition-all
                        ${
                          selectedImage === index
                            ? `
                              border-primary-600
                              ring-2
                              ring-primary-500/20
                            `
                            : `
                              border-ink-200
                              hover:border-primary-300
                              opacity-75
                              hover:opacity-100
                            `
                        }
                      `}
                    >
                      <img
                        src={image}
                        alt={`${item.title} ${index + 1}`}
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                      />
                    </button>
                  )
                )}
              </div>
            )}


            {/* Small giving message */}

            <div className="
              hidden
              sm:flex
              items-center
              gap-3
              px-4
              py-3
              rounded-card
              bg-primary-50
              border border-primary-100
            ">
              <div className="
                w-8
                h-8
                rounded-xl
                bg-primary-100
                text-primary-600
                flex
                items-center
                justify-center
                flex-shrink-0
              ">
                <i className="
                  bi
                  bi-heart
                " />
              </div>

              <p className="
                text-xs
                text-primary-800
                font-medium
                leading-relaxed
              ">
                Someone is choosing to give
                this item away. If it is useful
                to you, you can request to
                receive it.
              </p>
            </div>
          </div>


          {/* ==================================================
              RIGHT — INFORMATION
          ================================================== */}

          <div className="
            min-w-0
            flex
            flex-col
          ">

            {/* Header */}

            <div className="
              flex
              items-start
              justify-between
              gap-4
            ">
              <div className="min-w-0">

                <div className="
                  flex
                  items-center
                  gap-2
                  mb-2
                ">
                  <span className="
                    inline-flex
                    items-center
                    gap-1.5
                    text-[11px]
                    font-extrabold
                    uppercase
                    tracking-wider
                    text-primary-600
                  ">
                    <i className="
                      bi
                      bi-gift-fill
                    " />

                    Available Gift
                  </span>
                </div>

                <h1 className="
                  text-2xl
                  sm:text-3xl
                  lg:text-[2.15rem]
                  font-extrabold
                  tracking-tight
                  text-ink-900
                  leading-[1.1]
                ">
                  {item.title}
                </h1>
              </div>

              <ActionMenu
                item={item}
                onReportIssue={
                  handleReportIssue
                }
                onCopyItemId={
                  handleCopyItemId
                }
                onJoinDiscussion={
                  handleJoinDiscussion
                }
              />
            </div>


            {/* Tags */}

            <div className="
              flex
              flex-wrap
              gap-2
              mt-4
            ">
              <span className={`
                px-3
                py-1.5
                rounded-full
                text-xs
                font-bold
                border
                ${conditionDisplay.color}
              `}>
                {conditionDisplay.label}
              </span>

              <span className="
                bg-ink-100
                text-ink-700
                px-3
                py-1.5
                rounded-full
                text-xs
                font-bold
                border border-ink-200
              ">
                {item.category}
              </span>

              <span className={`
                px-3
                py-1.5
                rounded-full
                text-xs
                font-bold
                border
                ${
                  item.donor_pays_shipping
                    ? `
                      bg-primary-50
                      text-primary-700
                      border-primary-200
                    `
                    : `
                      bg-warning-50
                      text-warning-700
                      border-warning-200
                    `
                }
              `}>
                {item.donor_pays_shipping ? (
                  <>
                    <i className="
                      bi
                      bi-truck
                      mr-1.5
                    " />

                    Donor covers shipping
                  </>
                ) : (
                  <>
                    <i className="
                      bi
                      bi-wallet
                      mr-1.5
                    " />

                    Recipient covers shipping
                  </>
                )}
              </span>
            </div>


            {/* Metadata */}

            <div className="
              grid
              grid-cols-2
              sm:grid-cols-3
              gap-y-3
              gap-x-4
              mt-5
              pb-5
              border-b border-ink-200
              text-xs
            ">

              <div className="
                flex
                items-center
                gap-2
                min-w-0
              ">
                <i className="
                  bi
                  bi-geo-alt
                  text-ink-400
                " />

                <span className="
                  text-ink-500
                  font-medium
                  truncate
                ">
                  {item.donor?.location ||
                    'Location unspecified'}
                </span>
              </div>


              <div className="
                flex
                items-center
                gap-2
                min-w-0
              ">
                <i className="
                  bi
                  bi-globe
                  text-ink-400
                " />

                {renderRegionDisplay()}
              </div>


              <div className="
                flex
                items-center
                gap-2
              ">
                <i className="
                  bi
                  bi-calendar3
                  text-ink-400
                " />

                <span className="
                  text-ink-500
                  font-medium
                ">
                  {formatDate(
                    item.created_at
                  )}
                </span>
              </div>


              <div className="
                flex
                items-center
                gap-2
              ">
                <i className="
                  bi
                  bi-eye
                  text-ink-400
                " />

                <span className="
                  text-ink-500
                  font-medium
                ">
                  {item.views_count || 0}
                  {' '}
                  views
                </span>
              </div>


              <div className="
                flex
                items-center
                gap-2
              ">
                <i className="
                  bi
                  bi-people
                  text-ink-400
                " />

                <span className="
                  text-ink-500
                  font-medium
                ">
                  {item.applications_count || 0}
                  {' '}
                  requests
                </span>
              </div>
            </div>


            {/* ==================================================
                DONOR CARD
            ================================================== */}

            <div className="
              mt-5
              bg-ink-100
              border border-ink-200
              rounded-card
              p-4
              shadow-xs
            ">
              <div className="
                flex
                items-center
                gap-3
              ">

                {item.donor?.avatar_url ? (
                  <img
                    src={item.donor.avatar_url}
                    alt={
                      item.donor.full_name ||
                      'Donor'
                    }
                    className="
                      w-12
                      h-12
                      rounded-full
                      object-cover
                      border border-ink-200
                    "
                  />
                ) : (
                  <div className="
                    w-12
                    h-12
                    rounded-full
                    bg-ink-200
                    flex
                    items-center
                    justify-center
                    text-ink-500
                  ">
                    <i className="
                      bi
                      bi-person
                      text-lg
                    " />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="
                    text-sm
                    font-extrabold
                    text-ink-900
                  ">
                    Given by{' '}
                    {item.donor?.full_name ||
                      'Anonymous'}
                  </p>

                  <div className="
                    flex
                    flex-wrap
                    items-center
                    gap-1.5
                    mt-1
                    text-xs
                    text-ink-500
                  ">
                    <span className="
                      inline-flex
                      items-center
                      gap-1
                    ">
                      <i className="
                        bi
                        bi-star-fill
                        text-warning-400
                      " />

                      {item.donor?.rating ||
                        '0.0'}
                    </span>

                    <span>•</span>

                    <span>
                      {item.donor?.items_given ||
                        0}{' '}
                      gifts given
                    </span>
                  </div>
                </div>
              </div>
            </div>


            {/* ==================================================
                DESCRIPTION
            ================================================== */}

            <div className="
              mt-6
            ">
              <div className="
                flex
                items-center
                gap-2
                mb-2
              ">
                <i className="
                  bi
                  bi-chat-square-text
                  text-primary-600
                " />

                <h3 className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-wider
                  text-ink-400
                ">
                  About this gift
                </h3>
              </div>

              <p className={`
                text-sm
                text-ink-600
                leading-7
                ${
                  !showFullDescription
                    ? 'line-clamp-4'
                    : ''
                }
              `}>
                {item.description ||
                  'The donor did not provide a description for this gift.'}
              </p>

              {item.description &&
                item.description.length >
                  180 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowFullDescription(
                        (value) => !value
                      )
                    }
                    className="
                      text-primary-600
                      hover:text-primary-700
                      font-bold
                      text-xs
                      mt-2
                    "
                  >
                    {showFullDescription
                      ? 'Show less'
                      : 'Read more'}
                  </button>
                )}
            </div>


            {/* ==================================================
                SPECIFICATIONS
            ================================================== */}

            {(
              item.weight_kg ||
              item.length_cm ||
              item.width_cm ||
              item.height_cm
            ) && (
              <div className="
                mt-6
                bg-ink-100
                border border-ink-200
                rounded-card
                p-4
              ">
                <h4 className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-wider
                  text-ink-400
                  mb-3
                ">
                  Gift details
                </h4>

                <div className="
                  grid
                  grid-cols-2
                  sm:grid-cols-4
                  gap-4
                ">
                  {item.weight_kg && (
                    <div>
                      <p className="
                        text-[11px]
                        text-ink-400
                        font-medium
                      ">
                        Weight
                      </p>

                      <p className="
                        font-bold
                        text-ink-700
                        text-sm
                        mt-0.5
                      ">
                        {item.weight_kg}
                        {' '}
                        kg
                      </p>
                    </div>
                  )}

                  {item.length_cm && (
                    <div>
                      <p className="
                        text-[11px]
                        text-ink-400
                        font-medium
                      ">
                        Length
                      </p>

                      <p className="
                        font-bold
                        text-ink-700
                        text-sm
                        mt-0.5
                      ">
                        {item.length_cm}
                        {' '}
                        cm
                      </p>
                    </div>
                  )}

                  {item.width_cm && (
                    <div>
                      <p className="
                        text-[11px]
                        text-ink-400
                        font-medium
                      ">
                        Width
                      </p>

                      <p className="
                        font-bold
                        text-ink-700
                        text-sm
                        mt-0.5
                      ">
                        {item.width_cm}
                        {' '}
                        cm
                      </p>
                    </div>
                  )}

                  {item.height_cm && (
                    <div>
                      <p className="
                        text-[11px]
                        text-ink-400
                        font-medium
                      ">
                        Height
                      </p>

                      <p className="
                        font-bold
                        text-ink-700
                        text-sm
                        mt-0.5
                      ">
                        {item.height_cm}
                        {' '}
                        cm
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* ==================================================
                COMPLETED / WINNER
            ================================================== */}

            {item.status === 'completed' &&
              item.winner && (
                <div className="
                  mt-6
                  bg-warning-50
                  border border-warning-200
                  rounded-card
                  p-4
                ">
                  <div className="
                    flex
                    items-center
                    gap-3
                  ">
                    <div className="
                      w-10
                      h-10
                      rounded-xl
                      bg-warning-100
                      flex
                      items-center
                      justify-center
                      flex-shrink-0
                      text-warning-600
                    ">
                      <i className="
                        bi
                        bi-gift-fill
                      " />
                    </div>

                    <div>
                      <p className="
                        text-sm
                        font-extrabold
                        text-warning-900
                      ">
                        Gift Received
                      </p>

                      <p className="
                        text-xs
                        text-warning-700
                        mt-0.5
                      ">
                        This gift was given to{' '}
                        {item.winner.full_name ||
                          'the recipient'}{' '}
                        on{' '}
                        {formatDate(
                          item.winner_announced_at
                        )}
                        .
                      </p>
                    </div>
                  </div>
                </div>
              )}


            {/* ==================================================
                ACTION AREA
            ================================================== */}

            <div className="
              mt-7
              pt-5
              border-t border-ink-200
            ">

              {/* Owner */}

              {isOwner &&
                item.status === 'active' && (
                  <div className="
                    flex
                    gap-2
                  ">
                    <Link
                      to={`/edit-item/${item.id}`}
                      className="
                        flex-1
                        bg-ink-100
                        hover:bg-ink-200
                        text-ink-700
                        py-3
                        rounded-card
                        font-bold
                        text-sm
                        flex
                        items-center
                        justify-center
                        gap-2
                        transition
                        border border-ink-200
                        shadow-xs
                      "
                    >
                      <i className="
                        bi
                        bi-pencil
                      " />

                      Edit Gift
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        setShowDeleteModal(true)
                      }
                      disabled={deleting}
                      title="Remove gift"
                      className="
                        bg-danger-50
                        hover:bg-danger-100
                        text-danger-600
                        border border-danger-200
                        px-4
                        py-3
                        rounded-card
                        font-bold
                        text-sm
                        flex
                        items-center
                        justify-center
                        transition
                        shadow-xs
                      "
                    >
                      <i className="
                        bi
                        bi-trash
                        text-base
                      " />
                    </button>
                  </div>
                )}


              {/* Recipient */}

              {isAuthenticated &&
                !isOwner &&
                item.status === 'active' && (
                  <div className="
                    space-y-3
                  ">

                    <div className="
                      flex
                      gap-2
                    ">
                      <FavoriteButton
                        itemId={id}
                      />

                      <button
                        type="button"
                        onClick={handleApplyClick}
                        disabled={hasApplied || !canApply}
                        className={`
                          flex-1
                          py-3
                          px-6
                          rounded-card
                          font-bold
                          text-sm
                          flex
                          items-center
                          justify-center
                          gap-2
                          transition-all
                          shadow-xs
                          ${
                            (hasApplied || !canApply)
                              ? `
                                bg-ink-100
                                text-ink-400
                                cursor-not-allowed
                                border border-ink-200
                              `
                              : `
                                bg-primary-600
                                hover:bg-primary-700
                                text-white
                                shadow-medium
                              `
                          }
                        `}
                      >
                        {hasApplied ? (
                          <>
                            <i className="
                              bi
                              bi-check-circle
                              text-base "
                            />

                            Request Submitted
                          </>
                        ) : !canApply ? (
                          <>
                            <i className="bi bi-lock text-base" />
                             Can’t request gift
                          </>
                        ) : (
                          <>
                            <i className=" bi bi-gif text-base "/>
                            Request This Gift
                          </>
                        )}
                      </button>
                    </div>

                    <p className="
                      text-center
                      text-[11px]
                      text-ink-400
                      font-medium
                    ">
                      Requesting doesn't guarantee
                      that you'll be selected.
                    </p>
                  </div>
                )}


              {/* Logged out */}

              {!isAuthenticated &&
                item.status === 'active' && (
                  <div className="
                    space-y-3
                  ">
                    <Link
                      to="/login"
                      state={{
                        from:
                          location.pathname,
                      }}
                      className="
                        w-full
                        bg-primary-600
                        hover:bg-primary-700
                        text-white
                        py-3.5
                        px-6
                        rounded-card
                        font-bold
                        text-sm
                        flex
                        items-center
                        justify-center
                        gap-2
                        shadow-medium
                        transition-all
                      "
                    >
                      <i className="
                        bi
                        bi-box-arrow-in-right
                      " />

                      Sign in to Request This Gift
                    </Link>

                    <p className="
                      text-center
                      text-[11px]
                      text-ink-400
                    ">
                      Sign in to let the donor know
                      why this gift would be meaningful
                      to you.
                    </p>
                  </div>
                )}


              {/* Owner pending */}

              {isOwner &&
                item.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowApplications(
                        (value) => !value
                      )
                    }
                    className="
                      w-full
                      bg-primary-600
                      hover:bg-primary-700
                      text-white
                      py-3
                      rounded-card
                      font-bold
                      text-sm
                      flex
                      items-center
                      justify-center
                      gap-2
                      shadow-medium
                      transition-all
                    "
                  >
                    <i className="
                      bi
                      bi-people
                    " />

                    {showApplications
                      ? 'Hide Requests'
                      : `View Requests (${applications.length})`}
                  </button>
                )}
            </div>
          </div>
        </div>


        {/* ====================================================
            APPLICATIONS
        ==================================================== */}

        {isOwner &&
          showApplications &&
          item.status === 'pending' && (
            <div className="
              border-t border-ink-200
              pt-8
              pb-4
            ">
              <div className="
                flex
                items-center
                justify-between
                mb-5
              ">
                <div>
                  <h3 className="
                    text-base
                    font-extrabold
                    text-ink-900
                  ">
                    People requesting this gift
                  </h3>

                  <p className="
                    text-xs
                    text-ink-500
                    mt-1
                  ">
                    Review their messages and
                    choose who you'd like to give
                    the item to.
                  </p>
                </div>

                <span className="
                  text-xs
                  px-2.5
                  py-1
                  bg-ink-100
                  text-ink-700
                  rounded-full
                  font-bold
                  border border-ink-200
                ">
                  {applications.length}
                </span>
              </div>


              {applications.length === 0 ? (
                <div className="
                  bg-ink-100
                  rounded-card
                  border border-ink-200
                  p-10
                  text-center
                ">
                  <div className="
                    w-12
                    h-12
                    rounded-card
                    bg-ink-200
                    text-ink-400
                    mx-auto
                    flex
                    items-center
                    justify-center
                    mb-3
                  ">
                    <i className="
                      bi
                      bi-people
                      text-xl
                    " />
                  </div>

                  <p className="
                    text-sm
                    font-bold
                    text-ink-700
                  ">
                    No requests yet
                  </p>

                  <p className="
                    text-xs
                    text-ink-500
                    mt-1
                  ">
                    People who want to receive
                    this gift will appear here.
                  </p>
                </div>
              ) : (
                <div className="
                  grid
                  md:grid-cols-2
                  gap-3
                ">
                  {applications.map(
                    (application) => {
                      const appStatusDisplay =
                        getStatusDisplay(
                          application.status
                        );

                      return (
                        <div
                          key={application.id}
                          className="
                            bg-ink-100
                            rounded-card
                            p-4
                            shadow-xs
                            border border-ink-200
                            transition
                            hover:border-primary-200
                          "
                        >

                          <div className="
                            flex
                            items-start
                            justify-between
                            gap-4
                          ">
                            <div className="
                              flex
                              items-center
                              gap-3
                              min-w-0
                            ">

                              {application
                                .applicant
                                ?.avatar_url ? (
                                <img
                                  src={
                                    application
                                      .applicant
                                      .avatar_url
                                  }
                                  alt=""
                                  className="
                                    w-10
                                    h-10
                                    rounded-full
                                    object-cover
                                    border border-ink-200
                                    flex-shrink-0
                                  "
                                />
                              ) : (
                                <div className="
                                  w-10
                                  h-10
                                  rounded-full
                                  bg-ink-200
                                  flex
                                  items-center
                                  justify-center
                                  text-ink-500
                                  flex-shrink-0
                                ">
                                  <i className="
                                    bi
                                    bi-person
                                  " />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="
                                  text-sm
                                  font-bold
                                  text-ink-900
                                  truncate
                                ">
                                  {application
                                    .applicant
                                    ?.full_name ||
                                    'Anonymous'}
                                </p>

                                <p className="
                                  text-xs
                                  text-ink-500
                                  flex
                                  items-center
                                  gap-1
                                  mt-0.5
                                ">
                                  <i className="
                                    bi
                                    bi-geo-alt
                                  " />

                                  {application
                                    .applicant
                                    ?.location ||
                                    'Location unspecified'}
                                </p>
                              </div>
                            </div>


                            <span className={`
                              flex-shrink-0
                              px-2.5
                              py-1
                              rounded-full
                              text-xs
                              font-bold
                              border
                              ${getStatusBadgeClasses(
                                application.status
                              )}
                            `}>
                              <i
                                className={`
                                  bi
                                  ${
                                    appStatusDisplay?.icon ||
                                    'bi-circle'
                                  }
                                  mr-1
                                `}
                              />

                              {appStatusDisplay?.label ||
                                application.status}
                            </span>
                          </div>


                          <div className="
                            text-xs
                            text-ink-600
                            mt-3
                            bg-ink-50
                            p-3
                            rounded-xl
                            border border-ink-200
                            leading-relaxed
                          ">
                            {application.message}
                          </div>


                          {application.status ===
                            'pending' && (
                            <div className="
                              flex
                              gap-2
                              mt-3
                              pt-3
                              border-t border-ink-200
                            ">
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplicationStatus(
                                    application.id,
                                    'accepted'
                                  )
                                }
                                className="
                                  bg-success-600
                                  hover:bg-success-700
                                  text-white
                                  px-4
                                  py-2
                                  rounded-xl
                                  text-xs
                                  font-bold
                                  transition
                                  shadow-xs
                                  flex
                                  items-center
                                  gap-1
                                "
                              >
                                <i className="
                                  bi
                                  bi-check-lg "
                                />

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
                                className="
                                  bg-danger-50
                                  hover:bg-danger-100
                                  text-danger-600
                                  border border-danger-200
                                  px-4
                                  py-2
                                  rounded-xl
                                  text-xs
                                  font-bold
                                  transition
                                  flex
                                  items-center
                                  gap-1
                                "
                              >
                                <i className="
                                  bi
                                  bi-x-lg"
                                />

                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
      </div>


      {/* ======================================================
          APPLICATION MODAL
      ====================================================== */}

      <Modal
        isOpen={
          showApplicationModal
        }
        onClose={() =>
          setShowApplicationModal(
            false
          )
        }
        title="Request This Gift" 
        size="lg"
      >
        <ApplicationForm
          itemId={id}
          onSuccess={() => {
            setShowApplicationModal(
              false
            );

            setHasApplied(true);

            fetchItem();
          }}
          onCancel={() =>
            setShowApplicationModal(
              false
            )
          }
        />
      </Modal>


      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      <Modal
        isOpen={
          showDeleteModal
        }
        onClose={() =>
          setShowDeleteModal(false)
        }
        title="Remove Gift"
        size="sm"
      >
        <div className="
          flex
          items-start
          gap-4
          mb-5
        ">
          <div className="
            w-12
            h-12
            rounded-card
            bg-danger-50
            border border-danger-200
            flex
            items-center
            justify-center
            flex-shrink-0
            text-danger-600
          ">
            <i className="
              bi
              bi-exclamation-triangle
              text-xl
            " />
          </div>

          <div>
            <p className="
              text-sm
              font-bold
              text-ink-900
            ">
              Remove "
              <span className="
                text-primary-600
              ">
                {item?.title}
              </span>
              "?
            </p>

            <p className="
              text-xs
              text-ink-500
              mt-1
            ">
              This action is permanent and
              cannot be undone.
            </p>
          </div>
        </div>

        <div className="
          flex
          gap-3
        ">
          <button
            type="button"
            onClick={() =>
              setShowDeleteModal(false)
            }
            className="
              flex-1
              px-4
              py-2.5
              bg-ink-100
              hover:bg-ink-200
              text-ink-700
              rounded-xl
              text-xs
              font-bold
              transition
              border border-ink-200
            "
          >
            Keep Gift
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="
              flex-1
              px-4
              py-2.5
              bg-danger-600
              hover:bg-danger-700
              text-white
              rounded-xl
              text-xs
              font-bold
              transition
              shadow-xs
              flex
              items-center
              justify-center
              gap-2
            "
          >
            {deleting ? (
              <span className="
                animate-spin
                rounded-full
                h-4
                w-4
                border-2
                border-white
                border-t-transparent
              " />
            ) : (
              'Remove Gift'
            )}
          </button>
        </div>
      </Modal>


      {/* ======================================================
          VERIFICATION MODAL
      ====================================================== */}

      {showVerificationModal && (
        <div className="
          fixed
          inset-0
          z-50
          overflow-y-auto
        ">
          <div className="
            flex
            items-center
            justify-center
            min-h-screen
            px-4
            py-8
          ">

            <div
              className="
                fixed
                inset-0
                bg-ink-900/60
                backdrop-blur-sm
              "
              onClick={() =>
                setShowVerificationModal(
                  false
                )
              }
            />

            <div className="
              relative
              bg-ink-100
              rounded-hero
              shadow-large
              border border-ink-200
              max-w-md
              w-full
              p-6
              sm:p-7
            ">

              <div className="
                flex
                items-start
                gap-4
              ">

                <div className="
                  w-11
                  h-11
                  rounded-card
                  bg-warning-50
                  border border-warning-200
                  flex
                  items-center
                  justify-center
                  shrink-0
                  text-warning-600
                ">
                  <i className="
                    bi
                    bi-shield-exclamation
                    text-xl
                  " />
                </div>

                <div className="flex-1">

                  <h3 className="
                    text-base
                    font-extrabold
                    text-ink-900
                  ">
                    Email Verification Required
                  </h3>

                  <p className="
                    text-xs
                    text-ink-500
                    mt-1
                    leading-relaxed
                  ">
                    Please verify your email
                    address before requesting
                    a gift.
                  </p>

                  <div className="
                    mt-3
                    bg-warning-50
                    rounded-card
                    p-3
                    text-xs
                    text-warning-900
                    border border-warning-200
                    font-medium
                  ">
                    <i className="
                      bi
                      bi-envelope
                      mr-1.5
                    " />

                    Verification email sent to{' '}
                    <strong className="underline">
                      {user?.email}
                    </strong>
                    .
                  </div>

                  <div className="
                    flex
                    gap-2.5
                    mt-5
                  ">
                    <button
                      type="button"
                      onClick={
                        handleResendVerification
                      }
                      disabled={
                        resendingVerification
                      }
                      className="
                        flex-1
                        px-4
                        py-2.5
                        bg-primary-600
                        hover:bg-primary-700
                        text-white
                        text-xs
                        font-bold
                        rounded-xl
                        transition
                        shadow-xs
                        disabled:opacity-70
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      {resendingVerification ? (
                        <>
                          <span className="
                            animate-spin
                            rounded-full
                            h-3.5
                            w-3.5
                            border-2
                            border-white
                            border-t-transparent
                          " />

                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="
                            bi
                            bi-envelope
                          " />

                          Resend Email
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowVerificationModal(
                          false
                        )
                      }
                      className="
                        px-4
                        py-2.5
                        bg-ink-200
                        hover:bg-ink-300
                        text-ink-700
                        text-xs
                        font-bold
                        rounded-xl
                        transition
                        border border-ink-300
                      "
                    >
                      Close
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowVerificationModal(
                      false
                    )
                  }
                  className="
                    text-ink-400
                    hover:text-ink-600
                    transition
                  "
                >
                  <i className="
                    bi
                    bi-x-lg
                  " />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          COUNTRY MODAL
      ====================================================== */}

      {renderCountriesModal()}


      {/* ======================================================
          SUPPORT
      ====================================================== */}

      <SupportModal
        isOpen={
          showSupportModal
        }
        onClose={() => {
          setShowSupportModal(false);
          setSupportItem(null);
        }}
        itemId={
          supportItem?.id
        }
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