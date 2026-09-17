import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { itemsAPI, applicationsAPI, chatAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';
import Select from '@/reusables/Select';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { APPLICATION_STATUSES, getApplicationStatusDisplay } from '@/utils/constants';
import SupportModal from '../components/common/SupportModal';
import ChatDrawer from '../components/chat/ChatDrawer';
import ApplicantProfileCard from './ApplicantProfileCard';


// ============================================================
// Skeleton (Unified design)
// ============================================================
const ApplicationSkeleton = () => (
  <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-ink-200"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-ink-200 rounded w-1/3"></div>
          <div className="h-3 bg-ink-200 rounded w-1/4"></div>
        </div>
      </div>
      <div className="w-16 h-6 bg-ink-200 rounded-full"></div>
    </div>
    <div className="mt-3 space-y-2">
      <div className="h-3 bg-ink-200 rounded w-2/3"></div>
      <div className="h-3 bg-ink-200 rounded w-1/2"></div>
    </div>
  </div>
);

const ApplicationsSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30">
    <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8 mt-10">
      <PageNavigation />
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-ink-200 rounded-xl animate-pulse"></div>
          <div>
            <div className="h-8 w-48 bg-ink-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-ink-200 rounded mt-1 animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <ApplicationSkeleton key={i} />)}
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const ApplicationsToMyItem = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');

  const [applications, setApplications] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedAppData, setSelectedAppData] = useState(null);

  // Re-interest modal states
  const [showReinterestModal, setShowReinterestModal] = useState(false);
  const [selectedReinterestApp, setSelectedReinterestApp] = useState(null);
  const [reinterestHistory, setReinterestHistory] = useState(null);
  const [loadingReinterest, setLoadingReinterest] = useState(false);

  // Applicant profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  // Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationData, setConversationData] = useState({});

  // Support modal states
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportApp, setSupportApp] = useState(null);

  // Mark as given states
  const [showMarkGivenModal, setShowMarkGivenModal] = useState(false);
  const [markGivenApp, setMarkGivenApp] = useState(null);
  const [markGivenLoading, setMarkGivenLoading] = useState(null);
  const [givenApps, setGivenApps] = useState(new Set());

  // Filter states
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || '');
  const [showOnlyWithMessage, setShowOnlyWithMessage] = useState(searchParams.get('hasMessage') === 'true');
  const [showOnlyReinterest, setShowOnlyReinterest] = useState(searchParams.get('hasReinterest') === 'true');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Collapsible filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Sort options
  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: 'bi-sort-down' },
    { value: 'oldest', label: 'Oldest First', icon: 'bi-sort-up' },
    { value: 'reinterest', label: 'Most Re-Interest', icon: 'bi-arrow-repeat' },
    { value: 'latest_reinterest', label: 'Latest Re-Interest', icon: 'bi-clock-history' },
  ];

  // Status filter options – updated: removed SELECTED, added NOT_SELECTED
  const statusOptions = [
    { value: '', label: 'All Statuses', icon: 'bi-funnel' },
    { value: APPLICATION_STATUSES.PENDING, label: 'Pending', icon: 'bi-clock', color: 'yellow' },
    { value: APPLICATION_STATUSES.ACCEPTED, label: 'Accepted', icon: 'bi-check-circle', color: 'green' },
    { value: APPLICATION_STATUSES.NOT_SELECTED, label: 'Not Selected', icon: 'bi-dash-circle', color: 'gray' },
    { value: APPLICATION_STATUSES.REJECTED, label: 'Rejected', icon: 'bi-x-circle', color: 'red' },
    { value: APPLICATION_STATUSES.CANCELLED, label: 'Cancelled', icon: 'bi-slash-circle', color: 'gray' },
  ];

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (itemIdFromUrl) params.set('itemId', itemIdFromUrl);
    if (sortBy && sortBy !== 'newest') params.set('sort', sortBy);
    if (countryFilter) params.set('country', countryFilter);
    if (showOnlyWithMessage) params.set('hasMessage', 'true');
    if (showOnlyReinterest) params.set('hasReinterest', 'true');
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [sortBy, countryFilter, showOnlyWithMessage, showOnlyReinterest, searchQuery, statusFilter, itemIdFromUrl]);

  // Fetch item and its applications
  const fetchData = async () => {
    if (!user || !itemIdFromUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const itemResponse = await itemsAPI.getById(itemIdFromUrl);
      const itemData = itemResponse.data?.item;
      if (!itemData) {
        toast.error('Item not found');
        setLoading(false);
        return;
      }
      if (itemData.donor_id !== user.id) {
        toast.error('You do not have permission to view applications for this item');
        setLoading(false);
        return;
      }
      setItem(itemData);

      try {
        const appsResponse = await applicationsAPI.getByItem(itemIdFromUrl);
        const itemApps = appsResponse.data?.applications || appsResponse.data || [];
        const appsArray = Array.isArray(itemApps) ? itemApps : [];
        const appsWithItem = appsArray.map(app => ({
          ...app,
          item_title: itemData.title,
          item_id: itemData.id,
          item_status: itemData.status,
          last_reinterest_date: app.last_reinterest_date || app.created_at,
          reinterest_count: app.reinterest_count || 0,
          message: app.message || app.application_message || '',
        }));
        setApplications(appsWithItem);
        await fetchConversationData(appsWithItem);
      } catch (err) {
        console.error('Error fetching applications:', err);
        toast.error('Failed to load applications');
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversation data for each applicant
  const fetchConversationData = async (apps) => {
    const convData = {};
    for (const app of apps) {
      try {
        const response = await chatAPI.getOrCreateConversationWithApplicant(itemIdFromUrl, app.applicant_id);
        const data = response.data;
        const conversationId = data.conversation?.id;
        if (conversationId) {
          const messagesResponse = await chatAPI.getMessages(conversationId);
          const messages = messagesResponse.data?.messages || [];
          convData[app.applicant_id] = {
            conversationId,
            messageCount: messages.length,
            isDonor: data.is_donor || false,
            otherUser: data.other_user || app.applicant,
            hasMessages: messages.length > 0,
            messages,
          };
        } else {
          convData[app.applicant_id] = {
            conversationId: null,
            messageCount: 0,
            isDonor: false,
            otherUser: app.applicant,
            hasMessages: false,
            messages: [],
          };
        }
      } catch (error) {
        console.error(`Error fetching conversation for applicant ${app.applicant_id}:`, error);
        convData[app.applicant_id] = {
          conversationId: null,
          messageCount: 0,
          isDonor: false,
          otherUser: app.applicant,
          hasMessages: false,
          messages: [],
        };
      }
    }
    setConversationData(convData);
  };

  useEffect(() => {
    fetchData();
  }, [user, itemIdFromUrl]);

  // Get unique countries from applicants
  const getAvailableCountries = () => {
    const countries = new Set();
    applications.forEach(app => {
      if (app.applicant?.country) {
        countries.add(app.applicant.country);
      }
    });
    return Array.from(countries).sort();
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (countryFilter) count++;
    if (statusFilter) count++;
    if (showOnlyWithMessage) count++;
    if (showOnlyReinterest) count++;
    if (searchQuery) count++;
    if (sortBy && sortBy !== 'newest') count++;
    return count;
  }, [countryFilter, statusFilter, showOnlyWithMessage, showOnlyReinterest, searchQuery, sortBy]);

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = [...applications];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(app => {
        const fullName = app.applicant?.full_name?.toLowerCase() || '';
        const email = app.applicant?.email?.toLowerCase() || '';
        const message = app.message?.toLowerCase() || '';
        const country = app.applicant?.country?.toLowerCase() || '';
        const username = app.applicant?.username?.toLowerCase() || '';
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          message.includes(query) ||
          country.includes(query) ||
          username.includes(query)
        );
      });
    }

    if (countryFilter.trim()) {
      const countries = countryFilter.split(',').map(c => c.trim().toLowerCase());
      filtered = filtered.filter(app => {
        const appCountry = app.applicant?.country?.toLowerCase() || '';
        return countries.some(c => appCountry.includes(c));
      });
    }

    if (statusFilter) {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (showOnlyWithMessage) {
      filtered = filtered.filter(app => {
        const hasMessage = app.message && app.message.trim().length > 0;
        const convInfo = conversationData[app.applicant_id];
        return hasMessage || (convInfo?.hasMessages);
      });
    }

    if (showOnlyReinterest) {
      filtered = filtered.filter(app => app.reinterest_count > 0);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'reinterest':
        filtered.sort((a, b) => b.reinterest_count - a.reinterest_count);
        break;
      case 'latest_reinterest':
        filtered.sort((a, b) => new Date(b.last_reinterest_date) - new Date(a.last_reinterest_date));
        break;
    }
    return filtered;
  }, [applications, countryFilter, showOnlyWithMessage, showOnlyReinterest, sortBy, searchQuery, statusFilter, conversationData]);

  const fetchReinterestHistory = async (appId) => {
    setLoadingReinterest(true);
    try {
      const response = await applicationsAPI.getReinterestHistory(appId);
      setReinterestHistory(response.data?.application || response.data);
      setShowReinterestModal(true);
    } catch (error) {
      console.error('Error fetching re-interest history:', error);
      toast.error(error.response?.data?.error || 'Failed to load re-interest history');
    } finally {
      setLoadingReinterest(false);
    }
  };

  const openApplicantProfile = (applicantId) => {
    if (applicantId) {
      setSelectedApplicantId(applicantId);
      setShowProfileModal(true);
    }
  };

  const handleOpenChat = async (app) => {
    const applicantId = app.applicant_id;
    const convInfo = conversationData[applicantId];
    if (!convInfo || !convInfo.conversationId) {
      setChatLoading(true);
      try {
        const response = await chatAPI.getOrCreateConversationWithApplicant(itemIdFromUrl, applicantId);
        const data = response.data;
        const conversationId = data.conversation?.id;
        if (conversationId) {
          const messagesResponse = await chatAPI.getMessages(conversationId);
          const messages = messagesResponse.data?.messages || [];
          const newConvData = {
            ...conversationData,
            [applicantId]: {
              conversationId,
              messageCount: messages.length,
              isDonor: data.is_donor || false,
              otherUser: data.other_user || app.applicant,
              hasMessages: messages.length > 0,
              messages,
            },
          };
          setConversationData(newConvData);
          setChatConversation({
            conversationId,
            otherUser: data.other_user || app.applicant,
            item,
            isDonor: data.is_donor || false,
          });
          setIsChatOpen(true);
        } else {
          toast.error('Unable to create conversation');
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to start chat');
      } finally {
        setChatLoading(false);
      }
      return;
    }
    setChatLoading(true);
    try {
      setChatConversation({
        conversationId: convInfo.conversationId,
        otherUser: convInfo.otherUser || app.applicant,
        item,
        isDonor: convInfo.isDonor || false,
      });
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Failed to open chat');
    } finally {
      setChatLoading(false);
    }
  };

  const openMarkGivenModal = (app) => {
    setMarkGivenApp(app);
    setShowMarkGivenModal(true);
  };

  const handleMarkAsGiven = async (app) => {
    setMarkGivenLoading(app.id);
    try {
      await itemsAPI.confirmReceived(item.id);
      toast.success('🎉 Item marked as given! Waiting for winner to confirm receipt.');
      setGivenApps(prev => new Set(prev).add(app.id));
      setItem(prev => prev ? { ...prev, status: 'pending' } : null);
      await fetchData();
      setShowMarkGivenModal(false);
      setMarkGivenApp(null);
    } catch (error) {
      console.error('Error marking item as given:', error);
      toast.error(error.response?.data?.error || 'Failed to mark as given');
    } finally {
      setMarkGivenLoading(null);
    }
  };

  const openSupportModal = (app) => {
    setSupportApp(app);
    setShowSupportModal(true);
  };

  const getStatusBadge = (status) => {
    const display = getApplicationStatusDisplay(status);
    const colorMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      yellow: 'bg-amber-50 text-amber-700 border-amber-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
      gray: 'bg-ink-50 text-ink-600 border-ink-200',
    };
    return {
      classes: colorMap[display?.color] || colorMap.gray,
      label: display?.label || status,
      icon: display?.icon || 'bi-circle',
    };
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAction = async () => {
    if (!selectedApplication || !confirmAction) return;
    setActionLoading(selectedApplication);
    try {
      if (confirmAction === 'accept') {
        await applicationsAPI.updateStatus(selectedApplication, 'accepted');
        toast.success('Application accepted! 🎉');
      } else if (confirmAction === 'reject') {
        await applicationsAPI.updateStatus(selectedApplication, 'rejected');
        toast.info('Application rejected');
      }
      await fetchData();
    } catch (err) {
      console.error('Error updating application:', err);
      toast.error(err.response?.data?.error || `Failed to ${confirmAction} application`);
    } finally {
      setActionLoading(null);
      setShowConfirmModal(false);
      setSelectedApplication(null);
      setConfirmAction(null);
      setSelectedAppData(null);
    }
  };

  const openConfirmModal = (applicationId, action, appData) => {
    setSelectedApplication(applicationId);
    setConfirmAction(action);
    setSelectedAppData(appData);
    setShowConfirmModal(true);
  };

  const clearAllFilters = () => {
    setCountryFilter('');
    setShowOnlyWithMessage(false);
    setShowOnlyReinterest(false);
    setSortBy('newest');
    setSearchQuery('');
    setStatusFilter('');
  };

  const availableCountries = getAvailableCountries();

  // Loading skeleton
  if (loading) return <ApplicationsSkeleton />;

  if (!itemIdFromUrl) {
    return (
      <div className="min-h-screen bg-ink-50/30 mt-10">
        <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
          <PageNavigation />
          <div className="mt-10 bg-white rounded-2xl border border-ink-100/80 shadow-sm p-12 text-center">
            <i className="bi bi-exclamation-triangle text-5xl text-ink-300 block mb-3"></i>
            <h3 className="text-lg font-extrabold text-ink-600">No Item Selected</h3>
            <p className="text-ink-400 text-sm mt-1">Please provide an item ID in the URL.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-ink-50/30 mt-10">
        <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
          <PageNavigation />
          <div className="mt-10 bg-white rounded-2xl border border-ink-100/80 shadow-sm p-12 text-center">
            <i className="bi bi-box-seam text-5xl text-ink-300 block mb-3"></i>
            <h3 className="text-lg font-extrabold text-ink-600">Item Not Found</h3>
            <p className="text-ink-400 text-sm mt-1">The item doesn't exist or you lack permission.</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
        <PageNavigation />

        <div className="mt-10">
          {/* Header with Item Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-50 border border-primary-100 p-2.5 rounded-xl">
              <i className="bi bi-people text-primary-600 text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-ink-900">Applications</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-ink-600">
                  <span className="font-semibold text-ink-800">{item.title}</span>
                </p>
                <span className="text-xs text-ink-400">
                  {applications.length} application{applications.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Filters (Unified) */}
          <div className="overflow-visible rounded-2xl border border-ink-100/80 bg-white shadow-sm mb-6">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-ink-50/50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center border border-primary-100">
                  <i className="bi bi-funnel text-primary-600"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-extrabold text-ink-700">Filters & Search</p>
                  <p className="text-xs text-ink-400">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                      : 'No active filters'}
                    {searchQuery && ' · Search active'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-gradient-to-r from-primary-500 to-brand-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <i className={`bi bi-chevron-${filtersExpanded ? 'up' : 'down'} text-ink-400 transition-transform`}></i>
              </div>
            </button>

            <AnimatePresence>
              {filtersExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-visible"
                >
                  <div className="px-5 pb-5 border-t border-ink-100 pt-4 space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"></i>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by applicant name, email, message, or country..."
                        className="w-full pl-10 pr-4 py-2.5 bg-ink-50/60 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      )}
                    </div>

                    {/* Sort + Status + Country */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Select
                        options={sortOptions}
                        value={sortBy}
                        onChange={setSortBy}
                        placeholder="Sort By"
                        showIcon
                        className="w-full"
                      />
                      <Select
                        options={statusOptions}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="Filter by Status"
                        showIcon
                        className="w-full"
                      />
                      <div>
                        <label className="text-xs font-medium text-ink-500 block mb-1">Country Filter</label>
                        <input
                          type="text"
                          value={countryFilter}
                          onChange={(e) => setCountryFilter(e.target.value)}
                          placeholder="e.g. Nigeria, USA"
                          className="w-full px-3 py-2 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900"
                          list="country-list"
                        />
                        <datalist id="country-list">
                          {availableCountries.map(country => (
                            <option key={country} value={country} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowOnlyWithMessage(!showOnlyWithMessage)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                            showOnlyWithMessage
                              ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white shadow-sm'
                              : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                          }`}
                        >
                          <i className="bi bi-chat mr-1"></i>
                          Has Message
                        </button>
                        <button
                          onClick={() => setShowOnlyReinterest(!showOnlyReinterest)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                            showOnlyReinterest
                              ? 'bg-gradient-to-r from-primary-500 to-brand-600 text-white shadow-sm'
                              : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                          }`}
                        >
                          <i className="bi bi-arrow-repeat mr-1"></i>
                          Has Re-Interest
                        </button>
                      </div>
                      {(activeFilterCount > 0 || searchQuery) && (
                        <button
                          onClick={clearAllFilters}
                          className="px-4 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition font-bold flex items-center gap-1.5"
                        >
                          <i className="bi bi-x-circle"></i>
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* No Applications */}
          {applications.length === 0 && (
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-12 text-center">
              <i className="bi bi-inbox text-5xl text-ink-300 block mb-3"></i>
              <h3 className="text-lg font-extrabold text-ink-600">No Applications</h3>
              <p className="text-ink-400 text-sm mt-1">No one has applied for this item yet. Check back later!</p>
            </div>
          )}

          {/* No filtered results */}
          {applications.length > 0 && filteredAndSortedApplications.length === 0 && (
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-12 text-center">
              <i className="bi bi-funnel text-5xl text-ink-300 block mb-3"></i>
              <h3 className="text-lg font-extrabold text-ink-600">No Matching Applications</h3>
              <p className="text-ink-400 text-sm mt-1">Try adjusting your filters.</p>
              <button
                onClick={clearAllFilters}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Applications List */}
          {filteredAndSortedApplications.length > 0 && (
            <div className="space-y-4">
              {filteredAndSortedApplications.map(app => {
                const convInfo = conversationData[app.applicant_id];
                const hasConversation = convInfo?.conversationId;
                const messageCount = convInfo?.messageCount || 0;
                const hasMessages = convInfo?.hasMessages || messageCount > 0;
                const isAccepted = app.status === APPLICATION_STATUSES.ACCEPTED;
                const isPending = app.status === APPLICATION_STATUSES.PENDING;
                const isGiven = givenApps.has(app.id) || item?.donor_confirmed_at !== null;

                const highlightText = (text, query) => {
                  if (!query || !text) return text;
                  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                  const parts = text.split(regex);
                  return parts.map((part, i) =>
                    regex.test(part) ? (
                      <span key={i} className="bg-primary-100 px-0.5 rounded">{part}</span>
                    ) : (
                      part
                    )
                  );
                };

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl border border-ink-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-ink-50/50 transition"
                      onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (app.applicant?.id) openApplicantProfile(app.applicant.id);
                            }}
                            className="flex-shrink-0 hover:ring-2 hover:ring-primary-500 rounded-full transition"
                          >
                            {app.applicant?.avatar_url ? (
                              <img
                                src={app.applicant.avatar_url}
                                alt={app.applicant.full_name}
                                className="w-10 h-10 rounded-full border border-ink-100 shadow-sm object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center border border-ink-200">
                                <i className="bi bi-person text-ink-400"></i>
                              </div>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (app.applicant?.id) openApplicantProfile(app.applicant.id);
                              }}
                              className="text-sm font-extrabold text-ink-900 hover:text-primary-600 transition text-left flex items-center gap-2"
                            >
                              {searchQuery
                                ? highlightText(app.applicant?.full_name || 'Unknown User', searchQuery)
                                : app.applicant?.full_name || 'Unknown User'}
                              <i className="bi bi-arrow-up-right-square text-xs text-ink-400"></i>
                            </button>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-xs text-ink-400 flex items-center gap-1">
                                <i className="bi bi-geo-alt"></i>
                                {searchQuery
                                  ? highlightText(app.applicant?.country || 'Location not specified', searchQuery)
                                  : app.applicant?.country || 'Location not specified'}
                              </span>
                              {app.reinterest_count > 0 && (
                                <span className="text-xs text-primary-600 font-bold">
                                  <i className="bi bi-arrow-repeat mr-1"></i>
                                  {app.reinterest_count}x
                                </span>
                              )}
                              {hasConversation && (
                                <span className="text-xs text-primary-600 font-bold">
                                  <i className="bi bi-chat mr-1"></i>
                                  {hasMessages ? `${messageCount} messages` : 'No messages yet'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs text-ink-400 hidden sm:inline">
                            {formatDateShort(app.created_at)}
                          </span>
                          <i className={`bi bi-chevron-${expandedApp === app.id ? 'up' : 'down'} text-ink-400`}></i>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-ink-400 flex-wrap">
                        <span><i className="bi bi-calendar3 mr-1"></i>Applied {formatDate(app.created_at)}</span>
                        {app.shipping_estimate && (
                          <span><i className="bi bi-wallet mr-1"></i>Est. shipping: ${app.shipping_estimate}</span>
                        )}
                        {app.reinterest_count > 0 && (
                          <span className="text-primary-600"><i className="bi bi-arrow-repeat mr-1"></i>Last re-interest: {formatDate(app.last_reinterest_date)}</span>
                        )}
                      </div>
                      <div className='mt-2'>
                        {(() => {
                            const badge = getStatusBadge(app.status);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${badge.classes}`}>
                                <i className={`bi ${badge.icon} text-[10px]`}></i>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedApp === app.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-ink-100 p-4 bg-ink-50/30 space-y-4">
                            {/* Message */}
                            <div>
                              <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">Message from applicant:</p>
                              <p className="text-sm text-ink-700 bg-white p-3 rounded-xl border border-ink-100/60">
                                {searchQuery && app.message
                                  ? highlightText(app.message, searchQuery)
                                  : app.message || 'No message provided'}
                              </p>
                            </div>

                            {/* Re-Interest Info */}
                            <div className="bg-primary-50 p-3 rounded-xl border border-primary-200/60">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold text-primary-700">
                                    <i className="bi bi-arrow-repeat mr-1"></i> Re-Interest History
                                  </p>
                                  <p className="text-sm text-primary-600">
                                    {app.reinterest_count} time{app.reinterest_count > 1 ? 's' : ''} re-declared
                                  </p>
                                  {app.reinterest_count > 0 && (
                                    <p className="text-xs text-primary-500">Last: {formatDate(app.last_reinterest_date)}</p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchReinterestHistory(app.id);
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                                >
                                  {loadingReinterest ? (
                                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                                  ) : (
                                    <>
                                      <i className="bi bi-clock-history"></i>
                                      View History
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Chat Button */}
                            {['pending', 'accepted'].includes(app.status) && (
                               <button
                                 onClick={() => handleOpenChat(app)}
                                 disabled={chatLoading}
                                 className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                   >
                                 {chatLoading ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  ) : (
                                     <>
                                       <i className="bi bi-chat"></i>
                                      {hasConversation && hasMessages
                                      ? `Open Chat (${messageCount})`
                                      : 'Start Conversation'}
                                   </>
                                  )}
                               </button>
                                  )}

                            {/* Action buttons based on status */}
                            {isPending && (
                              <div className="flex gap-3">
                                <button
                                  onClick={() => openConfirmModal(app.id, 'accept', app)}
                                  disabled={actionLoading === app.id}
                                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md text-white py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold"
                                >
                                  {actionLoading === app.id ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                  ) : (
                                    <>
                                      <i className="bi bi-check-lg"></i> Accept
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => openConfirmModal(app.id, 'reject', app)}
                                  disabled={actionLoading === app.id}
                                  className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold"
                                >
                                  {actionLoading === app.id ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                  ) : (
                                    <>
                                      <i className="bi bi-x-lg"></i> Reject
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {isAccepted && (
                              <div className="space-y-2">
                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-sm flex items-center gap-2">
                                  <i className="bi bi-check-circle-fill"></i>
                                  You accepted this application. Coordinate handoff, then confirm below.
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => openMarkGivenModal(app)}
                                    disabled={markGivenLoading === app.id || isGiven}
                                    className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold ${
                                      isGiven
                                        ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md text-white'
                                    }`}
                                  >
                                    {markGivenLoading === app.id ? (
                                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                    ) : isGiven ? (
                                      <>
                                        <i className="bi bi-check-circle-fill"></i> Marked as Given
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-box-seam"></i> Mark as Given
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openSupportModal(app)}
                                    className="flex-1 bg-ink-100 hover:bg-ink-200 text-ink-700 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold"
                                  >
                                    <i className="bi bi-flag"></i> Report Issue
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Closed / Not Selected / Cancelled / Rejected */}
                            {(app.status === APPLICATION_STATUSES.REJECTED ||
                              app.status === APPLICATION_STATUSES.CANCELLED ||
                              app.status === APPLICATION_STATUSES.NOT_SELECTED) && (
                              <div
                                className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                                  app.status === APPLICATION_STATUSES.REJECTED
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                    : app.status === APPLICATION_STATUSES.NOT_SELECTED
                                    ? 'bg-ink-50 text-ink-600 border border-ink-200/60'
                                    : 'bg-ink-50 text-ink-600 border border-ink-200/60'
                                }`}
                              >
                                <i
                                  className={`bi ${
                                    app.status === APPLICATION_STATUSES.REJECTED
                                      ? 'bi-x-circle-fill'
                                      : app.status === APPLICATION_STATUSES.NOT_SELECTED
                                      ? 'bi-dash-circle'
                                      : 'bi-ban'
                                  }`}
                                ></i>
                                {app.status === APPLICATION_STATUSES.REJECTED
                                  ? 'You rejected this application.'
                                  : app.status === APPLICATION_STATUSES.NOT_SELECTED
                                  ? 'This item was awarded to another applicant.'
                                  : 'The applicant cancelled their application.'}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedApplication(null);
          setConfirmAction(null);
          setSelectedAppData(null);
        }}
        title={confirmAction === 'accept' ? 'Accept Application' : 'Reject Application'}
        size="sm"
      >
        {selectedAppData && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                confirmAction === 'accept' ? 'bg-emerald-100' : 'bg-rose-100'
              }`}>
                <i className={`text-2xl ${
                  confirmAction === 'accept' ? 'bi-check-circle text-emerald-600' : 'bi-x-circle text-rose-600'
                }`}></i>
              </div>
              <div>
                <p className="text-sm text-ink-600">
                  {confirmAction === 'accept' ? (
                    <>Accept <span className="font-extrabold text-ink-900">{selectedAppData.applicant?.full_name}</span>'s application?</>
                  ) : (
                    <>Reject <span className="font-extrabold text-ink-900">{selectedAppData.applicant?.full_name}</span>'s application?</>
                  )}
                </p>
                {confirmAction === 'accept' && (
                  <p className="text-xs text-amber-600 mt-1">
                    <i className="bi bi-exclamation-circle mr-1"></i>
                    This will close all other pending applications for this item.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedApplication(null);
                  setConfirmAction(null);
                  setSelectedAppData(null);
                }}
                className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading === selectedApplication}
                className={`flex-1 px-4 py-2 rounded-xl transition font-bold flex items-center justify-center gap-2 ${
                  confirmAction === 'accept'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md text-white'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:shadow-md text-white'
                }`}
              >
                {actionLoading === selectedApplication ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                ) : (
                  confirmAction === 'accept' ? 'Accept' : 'Reject'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* MARK AS GIVEN CONFIRM MODAL */}
      <Modal
        isOpen={showMarkGivenModal}
        onClose={() => {
          setShowMarkGivenModal(false);
          setMarkGivenApp(null);
        }}
        title="Mark as Given"
        size="sm"
      >
        {markGivenApp && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <i className="bi bi-box-seam text-2xl text-emerald-600"></i>
              </div>
              <div>
                <p className="text-sm text-ink-600">
                  Mark this item as given to <span className="font-extrabold text-ink-900">{markGivenApp.applicant?.full_name}</span>?
                </p>
                <p className="text-xs text-ink-400 mt-1">The winner will also need to confirm receipt.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMarkGivenModal(false);
                  setMarkGivenApp(null);
                }}
                className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAsGiven(markGivenApp)}
                disabled={markGivenLoading === markGivenApp.id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                {markGivenLoading === markGivenApp.id ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i> Yes, Mark as Given
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* RE-INTEREST HISTORY MODAL */}
      <Modal
        isOpen={showReinterestModal}
        onClose={() => {
          setShowReinterestModal(false);
          setSelectedReinterestApp(null);
          setReinterestHistory(null);
        }}
        title="Re-Interest History"
        size="lg"
      >
        {loadingReinterest ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : reinterestHistory ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-ink-50/50 rounded-xl p-4 text-center border border-ink-100/60">
                <div className="flex items-center justify-center gap-2 text-primary-600 mb-1">
                  <i className="bi bi-arrow-repeat text-xl"></i>
                  <span className="text-2xl font-bold">{reinterestHistory.reinterest_count || 0}</span>
                </div>
                <p className="text-xs text-ink-500 font-medium">Total Re-Interests</p>
              </div>
              <div className="bg-ink-50/50 rounded-xl p-4 text-center border border-ink-100/60">
                <div className="flex items-center justify-center gap-2 text-primary-600 mb-1">
                  <i className="bi bi-calendar-check text-xl"></i>
                  <span className="text-2xl font-bold">
                    {reinterestHistory.days_until_next_reinterest === 0
                      ? 'Yes'
                      : reinterestHistory.days_until_next_reinterest}
                  </span>
                </div>
                <p className="text-xs text-ink-500 font-medium">
                  {reinterestHistory.can_redeclare ? 'Ready to Re-Declare' : 'Days Until Next'}
                </p>
              </div>
              <div className="bg-ink-50/50 rounded-xl p-4 text-center border border-ink-100/60">
                <div className="flex items-center justify-center gap-2 text-primary-600 mb-1">
                  <i className="bi bi-clock-history text-xl"></i>
                  <span className="text-2xl font-bold">
                    {formatDate(reinterestHistory.last_reinterest_date || reinterestHistory.initial_application_date)}
                  </span>
                </div>
                <p className="text-xs text-ink-500 font-medium">Last Activity</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-bold text-ink-700 mb-4 flex items-center gap-2">
                <i className="bi bi-list-ul text-primary-600"></i>
                Timeline
              </h4>
              <div className="space-y-0 relative pl-4 border-l-2 border-ink-200">
                {reinterestHistory.timeline?.map((event, index) => (
                  <div key={index} className="relative pl-6 pb-6 last:pb-0">
                    {/* Dot */}
                    <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-primary-500 border-2 border-white shadow-sm"></div>
                    <div>
                      <p className="text-sm text-ink-800">{event.description}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{formatDate(event.date)}</p>
                    </div>
                  </div>
                ))}
                {(!reinterestHistory.timeline || reinterestHistory.timeline.length === 0) && (
                  <div className="text-sm text-ink-400 py-2">No timeline events</div>
                )}
              </div>
            </div>

            {/* Applicant & Item Info */}
            <div className="pt-4 border-t border-ink-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Applicant</p>
                <button
                  onClick={() => {
                    if (reinterestHistory.applicant?.id) {
                      openApplicantProfile(reinterestHistory.applicant.id);
                      setShowReinterestModal(false);
                    }
                  }}
                  className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline transition flex items-center gap-1 mt-1"
                >
                  {reinterestHistory.applicant?.full_name || 'Unknown'}
                  <i className="bi bi-arrow-up-right-square text-xs"></i>
                </button>
                <p className="text-xs text-ink-400 mt-0.5">
                  {reinterestHistory.applicant?.location && `${reinterestHistory.applicant.location}, `}
                  {reinterestHistory.applicant?.country || 'Location not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Item</p>
                <p className="text-sm font-bold text-ink-800 mt-1">{reinterestHistory.item?.title || 'Unknown item'}</p>
                <p className="text-xs text-ink-400">Donor: {reinterestHistory.item?.donor?.full_name || 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-ink-400">
            <i className="bi bi-inbox text-4xl block mb-2"></i>
            <p>No re-interest history available</p>
          </div>
        )}
      </Modal>

      {/* APPLICANT PROFILE MODAL */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedApplicantId(null);
        }}
        title="Applicant Profile"
        size="md"
      >
        {selectedApplicantId ? (
          <ApplicantProfileCard userId={selectedApplicantId} />
        ) : (
          <div className="text-center py-8 text-ink-400">No applicant selected</div>
        )}
      </Modal>

      {/* SUPPORT MODAL */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => {
          setShowSupportModal(false);
          setSupportApp(null);
        }}
        itemId={item?.id}
        applicationId={supportApp?.id}
        applicantId={supportApp?.applicant_id}
        reporterType="donor"
      />

      {/* CHAT DRAWER */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        initialConversation={chatConversation}
      />
    </div>
  );
};

export default ApplicationsToMyItem;