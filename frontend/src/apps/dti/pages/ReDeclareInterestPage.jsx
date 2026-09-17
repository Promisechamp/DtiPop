import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { applicationsAPI, itemsAPI } from '@/services/api/dtiApi';
import LoadingSpinner from '@/reusables/LoadingSpinner';

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
        const appData = appResponse.data?.application || appResponse.data;
        
        if (!appData) {
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
          toast.error('You can only re-declare interest on pending applications');
          navigate('/my-applications');
          return;
        }

        setApplication(appData);

        if (appData.item_id) {
          try {
            const itemResponse = await itemsAPI.getById(appData.item_id);
            const itemData = itemResponse.data?.item || itemResponse.data;
            setItem(itemData);

            if (itemData.status !== 'active') {
              toast.error('This item is no longer available');
              navigate('/my-applications');
              return;
            }
          } catch (itemError) {
            console.error('Error fetching item:', itemError);
            toast.error('Failed to load item details');
          }
        }

        const referenceDate = appData.last_reinterest_date || appData.created_at;
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

  const calculateReinterestStatus = () => {
    if (!reinterestInfo) return { canReinterest: false, daysRemaining: 0, nextAvailableDate: null };
    
    const now = startOfDay(new Date());
    const referenceDate = startOfDay(reinterestInfo.referenceDate);
    
    const daysSince = differenceInCalendarDays(now, referenceDate);
    const canReinterest = daysSince >= 7;
    const daysRemaining = canReinterest ? 0 : (7 - daysSince);
    const nextAvailableDate = addDays(referenceDate, 7);

    return {
      canReinterest,
      daysRemaining,
      daysSince,
      nextAvailableDate
    };
  };

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
        toast.error(`You can re-declare interest in ${errorData.daysRemaining} day${errorData.daysRemaining > 1 ? 's' : ''}`);
      } else {
        toast.error(errorData?.error || 'Failed to re-declare interest');
      }
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(date, 'MMMM d, yyyy \'at\' h:mm a');
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return format(date, 'MMM d, yyyy');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!application || !item) {
    return (
      <div className="min-h-screen bg-ink-50/30 mt-10">
        <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
          <PageNavigation />
          <div className="mt-10 bg-white rounded-2xl border border-ink-100/80 shadow-sm p-12 text-center">
            <i className="bi bi-exclamation-triangle text-6xl text-ink-300"></i>
            <h3 className="text-xl font-extrabold text-ink-700 mt-4">Application Not Found</h3>
            <p className="text-ink-400">
              The application you're looking for doesn't exist.
            </p>
            <Link to="/my-applications" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition">
              <i className="bi bi-arrow-left"></i>
              Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = calculateReinterestStatus();
  const canReinterest = status.canReinterest;
  const daysRemaining = status.daysRemaining;
  const hasReinteristed = reinterestInfo?.hasReinteristed || false;
  const daysSince = status.daysSince;

  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
        <PageNavigation />

        <div className="mt-10">
          {/* Header (Unified) */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Re-declare
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Re-Declare Interest
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Show the donor you're still interested
              </p>
            </div>
          </div>

          {/* Item Card */}
          <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden mt-6">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-ink-100 overflow-hidden flex-shrink-0">
                  {item.images?.[0] ? (
                    <img 
                      src={item.images[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="bi bi-image text-3xl text-ink-400"></i>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <Link 
                    to={`/item/${item.id}`} 
                    className="text-xl font-extrabold text-ink-900 hover:text-primary-600 transition"
                  >
                    {item.title}
                  </Link>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-sm font-medium text-ink-600">
                      <i className="bi bi-person mr-1"></i>
                      Donor: {item.donor?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-sm font-medium text-ink-600">
                      <i className="bi bi-tag mr-1"></i>
                      {item.category || 'Uncategorized'}
                    </span>
                    <span className="text-sm font-medium text-ink-600">
                      <i className="bi bi-star mr-1"></i>
                      {item.condition || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-ink-50 text-ink-600 border border-ink-200'
                    }`}>
                      <i className="bi bi-circle-fill text-[6px] mr-1 align-middle"></i>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
                      <i className="bi bi-clock mr-1"></i>
                      Applied {formatDateShort(application.created_at)}
                    </span>
                    {hasReinteristed && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <i className="bi bi-arrow-repeat mr-1"></i>
                        {reinterestInfo.reinterestCount}x re-interested
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Re-Interest Info Card */}
          <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden mt-6">
            <div className="p-6">
              <h3 className="text-lg font-extrabold text-ink-900 mb-4">
                <i className="bi bi-info-circle mr-2 text-primary-600"></i>
                Re-Interest Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-ink-50/50 p-4 rounded-xl border border-ink-100/60">
                  <p className="text-sm font-bold text-ink-500">Current Re-Interests</p>
                  <p className="text-2xl font-extrabold text-ink-900">
                    {reinterestInfo?.reinterestCount || 0}
                  </p>
                </div>
                <div className="bg-ink-50/50 p-4 rounded-xl border border-ink-100/60">
                  <p className="text-sm font-bold text-ink-500">
                    Days Since {hasReinteristed ? 'Last Re-Interest' : 'Application'}
                  </p>
                  <p className="text-2xl font-extrabold text-ink-900">
                    {daysSince || 0} days
                  </p>
                </div>
              </div>

              {/* Eligibility Status */}
              <div className={`mt-4 p-4 rounded-xl border ${
                canReinterest 
                  ? 'bg-emerald-50 border-emerald-200/60' 
                  : 'bg-amber-50 border-amber-200/60'
              }`}>
                <div className="flex items-start gap-3">
                  <i className={`bi ${
                    canReinterest 
                      ? 'bi-check-circle-fill text-emerald-600' 
                      : 'bi-clock-history text-amber-600'
                  } text-xl mt-0.5`}></i>
                  <div>
                    <p className={`font-extrabold ${
                      canReinterest 
                        ? 'text-emerald-700' 
                        : 'text-amber-700'
                    }`}>
                      {canReinterest 
                        ? 'You are eligible to re-declare interest!' 
                        : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left until you can re-declare`
                      }
                    </p>
                    <p className="text-sm font-medium text-ink-600 mt-1">
                      {canReinterest 
                        ? 'Re-declaring interest shows the donor you\'re still interested in this item.'
                        : `Your next re-interest is available on ${formatDate(status.nextAvailableDate)}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Information */}
              <div className="mt-4 bg-primary-50 p-4 rounded-xl border border-primary-200/60">
                <p className="text-sm font-bold text-primary-700">
                  <i className="bi bi-info-circle mr-1"></i>
                  <strong>Why re-declare interest?</strong> Re-declaring interest helps donors know you're still genuinely interested. 
                  You can re-declare every <strong>7 days</strong> while the item is active. 
                  {hasReinteristed ? (
                    <> You've re-declared <strong>{reinterestInfo.reinterestCount} time{reinterestInfo.reinterestCount > 1 ? 's' : ''}</strong> already.</>
                  ) : (
                    <> This will be your <strong>first</strong> re-declaration.</>
                  )}
                </p>
              </div>

              {/* Re-Interest Timeline */}
              {hasReinteristed && (
                <div className="mt-4 bg-ink-50/50 p-4 rounded-xl border border-ink-100/60">
                  <p className="text-sm font-extrabold text-ink-700 mb-2">
                    <i className="bi bi-clock-history mr-1"></i>
                    Re-Interest Timeline
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-medium text-ink-600">Initial application</span>
                      <span className="text-xs font-medium text-ink-400 ml-auto">
                        {formatDateShort(application.created_at)}
                      </span>
                    </div>
                    {[...Array(reinterestInfo.reinterestCount)].map((_, index) => {
                      const eventDate = addDays(new Date(application.created_at), (index + 1) * 7);
                      return (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                          <span className="font-medium text-ink-600">Re-interest #{index + 1}</span>
                          <span className="text-xs font-medium text-ink-400 ml-auto">
                            ~{formatDateShort(eventDate)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!canReinterest || submitting}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                canReinterest && !submitting
                  ? 'bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white'
                  : 'bg-ink-100 text-ink-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Re-Declare Interest
                </>
              )}
            </button>
            <Link
              to="/my-applications"
              className="px-4 py-3 text-xs font-bold bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl transition flex items-center justify-center gap-2"
            >
              <i className="bi bi-arrow-left"></i>
              Back to Applications
            </Link>
          </div>
        </div>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Re-Declare Interest"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <i className="bi bi-arrow-repeat text-primary-600 text-2xl"></i>
              </div>
              <div>
                <p className="text-sm font-bold text-ink-600">
                  Are you sure you want to re-declare your interest for "<span className="font-extrabold text-ink-900">{item?.title}</span>"?
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/60">
              <p className="text-sm font-bold text-amber-700 flex items-start gap-2">
                <i className="bi bi-info-circle text-lg mt-0.5"></i>
                <span>
                  <strong>What happens next?</strong><br />
                  The donor will be notified of your re-declared interest. 
                  This helps them know you're still genuinely interested in their item.
                </span>
              </p>
            </div>

            <div className="bg-ink-50/50 p-3 rounded-xl border border-ink-100/60">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-ink-500">Application ID</span>
                <span className="font-mono text-xs font-bold text-ink-700">{application.id}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="font-bold text-ink-500">Item</span>
                <span className="font-bold text-ink-700">{item?.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="font-bold text-ink-500">Re-Interest Count</span>
                <span className="font-bold text-ink-700">{reinterestInfo?.reinterestCount || 0} → {(reinterestInfo?.reinterestCount || 0) + 1}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="font-bold text-ink-500">Days Since {hasReinteristed ? 'Last' : 'Application'}</span>
                <span className="font-bold text-ink-700">{daysSince || 0} days</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReDeclare}
                disabled={submitting || !canReinterest}
                className={`flex-1 px-4 py-2 rounded-xl font-extrabold transition flex items-center justify-center gap-2 ${
                  canReinterest && !submitting
                    ? 'bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white'
                    : 'bg-ink-100 text-ink-400 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i>
                    Confirm Re-Declare
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ReDeclareInterestPage;