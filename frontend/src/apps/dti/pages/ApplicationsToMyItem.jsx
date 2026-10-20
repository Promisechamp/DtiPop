import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Inbox,
  MapPin,
  Repeat,
  MessageCircle,
  Package,
  Flag,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  X,
  Users,
  Calendar,
  User,
  ArrowUpRight,
  Check,
  CircleSlash,
  Ban,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

// ── chatAPI comes from shared, not dtiApi ──
import { itemsAPI, applicationsAPI } from '@/services/api/dtiApi';
import { chatAPI } from '@/services/api/sharedApi';

import Modal from '@/reusables/Modal';
import ActionMenu from '@/reusables/ActionMenu';
import SupportModal from '../components/common/SupportModal';
import ChatModal from '@/pages/chat/ChatModal';
import ApplicantProfileCard from '../components/common/ApplicantProfileCardModal';
import ReinterestHistoryModal from '../components/common/ReinterestHistoryModal';

import Select from '@/reusables/Select';
import FilterBar, {
  ColumnStepper,
  useResponsiveGrid,
} from '@/reusables/FilterBar';

import {
  APPLICATION_STATUSES,
  getApplicationStatusDisplay,
} from '@/utils/constants';

/* -------------------------------------------------------------------------- */
/* LOCATION HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/*
 * `location` is a JSONB column: { city, state, country }.
 * Both helpers are module-scope so ApplicationCardBody (a sibling
 * component) can also use them.
 */

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

/* -------------------------------------------------------------------------- */
/* SKELETON                                                                   */
/* -------------------------------------------------------------------------- */

const ApplicationsSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-12 w-36 animate-pulse rounded-2xl bg-ink-200" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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

        {/* FILTER BAR */}
        <div className="rounded-3xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="h-12 flex-1 animate-pulse rounded-2xl bg-ink-100" />
            <div className="flex gap-2">
              <div className="h-12 w-32 animate-pulse rounded-2xl bg-ink-100" />
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[26px] border border-ink-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-2.5 w-24 animate-pulse rounded-full bg-ink-100" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-ink-100" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-24 animate-pulse rounded-full bg-ink-100" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <div className="flex gap-1">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-ink-100" />
                </div>
                <div className="h-9 w-20 animate-pulse rounded-xl bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* STATUS HELPERS                                                             */
/* -------------------------------------------------------------------------- */

const getStatusIconComponent = (status) => {
  switch (status) {
    case APPLICATION_STATUSES.PENDING:
      return Clock;
    case APPLICATION_STATUSES.ACCEPTED:
      return CheckCircle2;
    case APPLICATION_STATUSES.NOT_SELECTED:
      return MinusCircle;
    case APPLICATION_STATUSES.REJECTED:
      return XCircle;
    case APPLICATION_STATUSES.CANCELLED:
      return CircleSlash;
    default:
      return CircleSlash;
  }
};

const getApplicationStatusStyle = (status) => {
  const key = String(status || '').toLowerCase();

  const map = {
    [String(APPLICATION_STATUSES.PENDING).toLowerCase()]: {
      wrapper: 'border-warning-200 bg-warning-50 text-warning-700',
      dot: 'bg-warning-500',
    },
    [String(APPLICATION_STATUSES.ACCEPTED).toLowerCase()]: {
      wrapper: 'border-success-200 bg-success-50 text-success-700',
      dot: 'bg-success-500',
    },
    [String(APPLICATION_STATUSES.REJECTED).toLowerCase()]: {
      wrapper: 'border-danger-200 bg-danger-50 text-danger-700',
      dot: 'bg-danger-500',
    },
    [String(APPLICATION_STATUSES.NOT_SELECTED).toLowerCase()]: {
      wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
      dot: 'bg-ink-400',
    },
    [String(APPLICATION_STATUSES.CANCELLED).toLowerCase()]: {
      wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
      dot: 'bg-ink-400',
    },
  };

  const fallback = {
    wrapper: 'border-ink-200 bg-ink-50 text-ink-600',
    dot: 'bg-ink-400',
  };

  return map[key] || fallback;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const ApplicationsToMyItem = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemIdFromUrl = searchParams.get('itemId');
  const { to } = makePaths(DTI_BASE);
  const [applications, setApplications] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedAppData, setSelectedAppData] = useState(null);

  // Re-interest history modal — only the target application ID lives here.
  // Fetch / loading / error all happen inside ReinterestHistoryModal.
  const [reinterestAppId, setReinterestAppId] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [openingChatFor, setOpeningChatFor] = useState(null);
  const [conversationData, setConversationData] = useState({});

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportApp, setSupportApp] = useState(null);

  const [showMarkGivenModal, setShowMarkGivenModal] = useState(false);
  const [markGivenApp, setMarkGivenApp] = useState(null);
  const [markGivenLoading, setMarkGivenLoading] = useState(null);
  const [givenApps, setGivenApps] = useState(new Set());

  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [countryFilter, setCountryFilter] = useState(
    searchParams.get('country') || ''
  );
  const [showOnlyWithMessage, setShowOnlyWithMessage] = useState(
    searchParams.get('hasMessage') === 'true'
  );
  const [showOnlyReinterest, setShowOnlyReinterest] = useState(
    searchParams.get('hasReinterest') === 'true'
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || ''
  );

  const { gridCols, setGridCols, gridStyle } = useResponsiveGrid({
    min: 1,
    max: 4,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  /* ---------------------------------------------------------------------- */
  /* Filter options                                                         */
  /* ---------------------------------------------------------------------- */

  const sortOptions = useMemo(
    () => [
      { value: 'newest', label: 'Newest First', icon: ArrowDown },
      { value: 'oldest', label: 'Oldest First', icon: ArrowUp },
      { value: 'reinterest', label: 'Most Re-Interest', icon: Repeat },
      { value: 'latest_reinterest', label: 'Latest Re-Interest', icon: Clock },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses', icon: SlidersHorizontal },
      ...Object.values(APPLICATION_STATUSES).map((statusValue) => {
        const display = getApplicationStatusDisplay(statusValue);
        return {
          value: statusValue,
          label: display.label || statusValue,
          icon: getStatusIconComponent(statusValue),
        };
      }),
    ],
    []
  );

  /* ---------------------------------------------------------------------- */
  /* URL sync                                                               */
  /* ---------------------------------------------------------------------- */

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
  }, [
    sortBy,
    countryFilter,
    showOnlyWithMessage,
    showOnlyReinterest,
    searchQuery,
    statusFilter,
    itemIdFromUrl,
    setSearchParams,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Fetch                                                                  */
  /* ---------------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
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
        toast.error(
          'You do not have permission to view applications for this item'
        );
        setLoading(false);
        return;
      }
      setItem(itemData);

      try {
        const appsResponse = await applicationsAPI.getByItem(itemIdFromUrl);
        const itemApps =
          appsResponse.data?.applications || appsResponse.data || [];
        const appsArray = Array.isArray(itemApps) ? itemApps : [];
        const appsWithItem = appsArray.map((app) => ({
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
  }, [user, itemIdFromUrl]);

  const fetchConversationData = async (apps) => {
    const convData = {};
    for (const app of apps) {
      try {
        const response = await chatAPI.getOrCreateConversationWithApplicant(
          itemIdFromUrl,
          app.applicant_id
        );
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
        console.error(
          `Error fetching conversation for applicant ${app.applicant_id}:`,
          error
        );
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
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    countryFilter,
    statusFilter,
    showOnlyWithMessage,
    showOnlyReinterest,
    searchQuery,
    sortBy,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */

  const getAvailableCountries = () => {
    const countries = new Set();
    applications.forEach((app) => {
      const country =
        app.applicant?.country || app.applicant?.location?.country || '';
      if (country) {
        countries.add(country);
      }
    });
    return Array.from(countries).sort();
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
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (countryFilter) count += 1;
    if (statusFilter) count += 1;
    if (showOnlyWithMessage) count += 1;
    if (showOnlyReinterest) count += 1;
    if (sortBy && sortBy !== 'newest') count += 1;
    return count;
  }, [
    countryFilter,
    statusFilter,
    showOnlyWithMessage,
    showOnlyReinterest,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(countryFilter) ||
    Boolean(statusFilter) ||
    Boolean(searchQuery) ||
    showOnlyWithMessage ||
    showOnlyReinterest ||
    sortBy !== 'newest';

  /* ---------------------------------------------------------------------- */
  /* Filter / sort                                                          */
  /* ---------------------------------------------------------------------- */

  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((app) => {
        const fullName = app.applicant?.full_name?.toLowerCase() || '';
        const email = app.applicant?.email?.toLowerCase() || '';
        const message = app.message?.toLowerCase() || '';
        const country = (
          app.applicant?.country ||
          app.applicant?.location?.country ||
          ''
        ).toLowerCase();
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
      const countries = countryFilter
        .split(',')
        .map((c) => c.trim().toLowerCase());
      filtered = filtered.filter((app) => {
        const appCountry = (
          app.applicant?.country ||
          app.applicant?.location?.country ||
          ''
        ).toLowerCase();
        return countries.some((c) => appCountry.includes(c));
      });
    }

    if (statusFilter) {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (showOnlyWithMessage) {
      filtered = filtered.filter((app) => {
        const hasMessage = app.message && app.message.trim().length > 0;
        const convInfo = conversationData[app.applicant_id];
        return hasMessage || convInfo?.hasMessages;
      });
    }

    if (showOnlyReinterest) {
      filtered = filtered.filter((app) => app.reinterest_count > 0);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        break;
      case 'oldest':
        filtered.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        break;
      case 'reinterest':
        filtered.sort((a, b) => b.reinterest_count - a.reinterest_count);
        break;
      case 'latest_reinterest':
        filtered.sort(
          (a, b) =>
            new Date(b.last_reinterest_date) -
            new Date(a.last_reinterest_date)
        );
        break;
      default:
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }
    return filtered;
  }, [
    applications,
    countryFilter,
    showOnlyWithMessage,
    showOnlyReinterest,
    sortBy,
    searchQuery,
    statusFilter,
    conversationData,
  ]);

  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  /* ---------------------------------------------------------------------- */
  /* Stats                                                                  */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter(
        (a) => a.status === APPLICATION_STATUSES.PENDING
      ).length,
      accepted: applications.filter(
        (a) => a.status === APPLICATION_STATUSES.ACCEPTED
      ).length,
      rejected: applications.filter(
        (a) => a.status === APPLICATION_STATUSES.REJECTED
      ).length,
      notSelected: applications.filter(
        (a) => a.status === APPLICATION_STATUSES.NOT_SELECTED
      ).length,
    }),
    [applications]
  );

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  const openApplicantProfile = (applicantId) => {
    if (applicantId) {
      setSelectedApplicantId(applicantId);
      setShowProfileModal(true);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* OPEN CHAT                                                              */
  /* ---------------------------------------------------------------------- */

  const handleOpenChat = async (app) => {
    const applicantId = app.applicant_id;
    const convInfo = conversationData[applicantId];

    if (openingChatFor === applicantId) {
      return;
    }

    const toastId = toast.loading('Opening chat…');

    setOpeningChatFor(applicantId);
    setChatLoading(true);

    try {
      if (!convInfo || !convInfo.conversationId) {
        const response = await chatAPI.getOrCreateConversationWithApplicant(
          itemIdFromUrl,
          applicantId
        );
        const data = response.data;
        const conversationId = data.conversation?.id;

        if (!conversationId) {
          throw new Error('Unable to create conversation');
        }

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

        toast.success('Chat ready', { id: toastId, duration: 1200 });
      } else {
        setChatConversation({
          conversationId: convInfo.conversationId,
          otherUser: convInfo.otherUser || app.applicant,
          item,
          isDonor: convInfo.isDonor || false,
        });
        setIsChatOpen(true);

        toast.success('Chat ready', { id: toastId, duration: 1200 });
      }
    } catch (error) {
      console.error('Error opening chat:', error);

      toast.error('Failed to open chat', {
        id: toastId,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Please try again.',
      });
    } finally {
      setChatLoading(false);
      setOpeningChatFor(null);
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
      toast.success(
        '🎉 Item marked as given! Waiting for winner to confirm receipt.'
      );
      setGivenApps((prev) => new Set(prev).add(app.id));
      setItem((prev) => (prev ? { ...prev, status: 'pending' } : null));
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
      toast.error(
        err.response?.data?.error || `Failed to ${confirmAction} application`
      );
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
    setCurrentPage(1);
  };

  const availableCountries = getAvailableCountries();

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) return <ApplicationsSkeleton />;

  /* ---------------------------------------------------------------------- */
  /* No item / item not found                                               */
  /* ---------------------------------------------------------------------- */

  if (!itemIdFromUrl) {
    return (
      <div className="min-h-full bg-transparent">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <AlertTriangle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                No item selected
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Please provide an item ID in the URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-full bg-transparent">


        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Package size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Item not found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                The item doesn't exist or you lack permission.
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Active filter chips                                                    */
  /* ---------------------------------------------------------------------- */

  const activeFilterChips = [
    statusFilter && {
      key: 'status',
      label: getApplicationStatusDisplay(statusFilter).label || statusFilter,
      onRemove: () => setStatusFilter(''),
    },
    countryFilter && {
      key: 'country',
      label: `Country: ${countryFilter}`,
      onRemove: () => setCountryFilter(''),
    },
    showOnlyWithMessage && {
      key: 'hasMessage',
      label: 'Has Message',
      onRemove: () => setShowOnlyWithMessage(false),
    },
    showOnlyReinterest && {
      key: 'hasReinterest',
      label: 'Has Re-Interest',
      onRemove: () => setShowOnlyReinterest(false),
    },
    searchQuery && {
      key: 'search',
      label: `Search: ${searchQuery}`,
      onRemove: () => setSearchQuery(''),
    },
    sortBy !== 'newest' && {
      key: 'sort',
      label: sortOptions.find((o) => o.value === sortBy)?.label || sortBy,
      onRemove: () => setSortBy('newest'),
    },
  ].filter(Boolean);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Users size={14} />
                <span>Applications received</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Applications
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Review and respond to applicants for{' '}
                <span className="font-extrabold text-ink-700">
                  {item.title}
                </span>
                .
              </p>
            </div>

            <Link
              to={to(`/item/${item.id}`)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
            >
              <Package size={17} strokeWidth={2.5} />
              <span>View Item</span>
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Applications"
            value={stats.total}
            icon={FileText}
            tone="ink"
          />
          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            tone="danger"
          />
          <StatCard
            label="Not Selected"
            value={stats.notSelected}
            icon={MinusCircle}
            tone="ink"
          />
        </div>

        {/* SEARCH + FILTER BAR */}
        <FilterBar
          className="mb-6"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by applicant name, email, message, or country..."
          filtersOpen={filtersExpanded}
          onToggleFilters={() => setFiltersExpanded((v) => !v)}
          activeFilterCount={activeFilterCount}
          onRefresh={fetchData}
          refreshing={loading}
          activeFilters={activeFilterChips}
          onClearAll={clearAllFilters}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              placeholder="Sort By"
              showIcon
            />

            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by Status"
              showIcon
            />

            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-ink-700">
                Country Filter
              </label>

              <input
                type="text"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                placeholder="e.g. Nigeria, USA"
                list="country-list"
                className="input-field text-sm font-medium"
              />

              <datalist id="country-list">
                {availableCountries.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>

            <ColumnStepper
              label="Grid columns"
              value={gridCols}
              onChange={setGridCols}
              min={1}
              max={4}
            />
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOnlyWithMessage(!showOnlyWithMessage)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition ${
                showOnlyWithMessage
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-ink-200 bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              <MessageCircle size={12} />
              Has Message
            </button>

            <button
              type="button"
              onClick={() => setShowOnlyReinterest(!showOnlyReinterest)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition ${
                showOnlyReinterest
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-ink-200 bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              <Repeat size={12} />
              Has Re-Interest
            </button>
          </div>
        </FilterBar>

        {/* RESULT SUMMARY */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink-500">
            {filteredApplications.length === 1
              ? '1 application'
              : `${filteredApplications.length} applications`}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-extrabold text-primary-600 hover:text-primary-700"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* EMPTY */}
        {filteredApplications.length === 0 ? (
          <EmptyState filtered={hasActiveFilters} onReset={clearAllFilters} />
        ) : (
          <>
            {/* GRID */}
            <motion.div
              className="grid gap-4"
              animate={gridStyle}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {paginatedApplications.map((app) => {
                const isExpanded = expandedApp === app.id;
                const isPending = app.status === APPLICATION_STATUSES.PENDING;
                const isAccepted =
                  app.status === APPLICATION_STATUSES.ACCEPTED;
                const isGiven =
                  givenApps.has(app.id) ||
                  item?.donor_confirmed_at !== null;

                const convInfo = conversationData[app.applicant_id];
                const hasConversation = convInfo?.conversationId;
                const messageCount = convInfo?.messageCount || 0;
                const hasMessages =
                  convInfo?.hasMessages || messageCount > 0;

                const canChat = isPending || isAccepted;

                const isOpeningChat = openingChatFor === app.applicant_id;

                const menuItems = [
                  {
                    key: 'profile',
                    icon: User,
                    label: 'View Profile',
                    onClick: () => openApplicantProfile(app.applicant?.id),
                  },
                  {
                    key: 'history',
                    icon: Clock,
                    label: 'Re-Interest History',
                    onClick: () => setReinterestAppId(app.id),
                  },
                  { key: 'divider-1', divider: true },
                  {
                    key: 'report',
                    icon: Flag,
                    label: 'Report Issue',
                    onClick: () => openSupportModal(app),
                  },
                ];

                return (
                  <motion.article
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="group relative flex flex-col justify-between rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                  >
                    <ApplicationCardBody
                      app={app}
                      item={item}
                      isExpanded={isExpanded}
                      onToggle={() =>
                        setExpandedApp(isExpanded ? null : app.id)
                      }
                      onOpenChat={() => handleOpenChat(app)}
                      onOpenProfile={() =>
                        openApplicantProfile(app.applicant?.id)
                      }
                      onAccept={() =>
                        openConfirmModal(app.id, 'accept', app)
                      }
                      onReject={() =>
                        openConfirmModal(app.id, 'reject', app)
                      }
                      onMarkGiven={() => openMarkGivenModal(app)}
                      onViewHistory={() => setReinterestAppId(app.id)}
                      onReport={() => openSupportModal(app)}
                      isOpeningChat={isOpeningChat}
                      isPending={isPending}
                      isAccepted={isAccepted}
                      isGiven={isGiven}
                      actionLoading={actionLoading === app.id}
                      markGivenLoading={markGivenLoading === app.id}
                      canChat={canChat}
                      hasConversation={hasConversation}
                      hasMessages={hasMessages}
                      messageCount={messageCount}
                      menuItems={menuItems}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                    />
                  </motion.article>
                );
              })}
            </motion.div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-ink-500">
                  Showing{' '}
                  <span className="font-extrabold text-ink-700">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  –
                  <span className="font-extrabold text-ink-700">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-extrabold text-ink-700">
                    {totalItems}
                  </span>{' '}
                  applications
                </p>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
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
        title={
          confirmAction === 'accept'
            ? 'Accept Application'
            : 'Reject Application'
        }
        size="sm"
      >
        {selectedAppData && (
          <div className="space-y-6">
            <div
              className={`flex items-start gap-4 rounded-2xl border p-4 ${
                confirmAction === 'accept'
                  ? 'border-success-200 bg-success-50'
                  : 'border-danger-100 bg-danger-50'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmAction === 'accept'
                    ? 'bg-success-100 text-success-700'
                    : 'bg-danger-100 text-danger-600'
                }`}
              >
                {confirmAction === 'accept' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </div>

              <div className="min-w-0">
                <p
                  className={`text-sm font-extrabold ${
                    confirmAction === 'accept'
                      ? 'text-success-900'
                      : 'text-danger-900'
                  }`}
                >
                  {confirmAction === 'accept'
                    ? `Accept ${selectedAppData.applicant?.full_name}'s application?`
                    : `Reject ${selectedAppData.applicant?.full_name}'s application?`}
                </p>

                {confirmAction === 'accept' && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs font-medium leading-5 text-warning-700">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    This will close all other pending applications for this
                    item.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedApplication(null);
                  setConfirmAction(null);
                  setSelectedAppData(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading === selectedApplication}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmAction === 'accept'
                    ? 'bg-success-600 hover:bg-success-700'
                    : 'bg-danger-600 hover:bg-danger-700'
                }`}
              >
                {actionLoading === selectedApplication ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : confirmAction === 'accept' ? (
                  <>
                    <Check size={16} />
                    Accept
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MARK AS GIVEN MODAL */}
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
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-success-200 bg-success-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
                <Package size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-success-900">
                  Mark this item as given to{' '}
                  {markGivenApp.applicant?.full_name}?
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-success-700">
                  The winner will also need to confirm receipt.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowMarkGivenModal(false);
                  setMarkGivenApp(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleMarkAsGiven(markGivenApp)}
                disabled={markGivenLoading === markGivenApp.id}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success-600 px-4 text-sm font-extrabold text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {markGivenLoading === markGivenApp.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Yes, Mark as Given
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RE-INTEREST HISTORY MODAL */}
      <ReinterestHistoryModal
        isOpen={Boolean(reinterestAppId)}
        onClose={() => setReinterestAppId(null)}
        applicationId={reinterestAppId}
        onViewApplicant={(applicantId) => {
          setReinterestAppId(null);
          openApplicantProfile(applicantId);
        }}
      />

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
          <div className="py-8 text-center text-sm font-bold text-ink-400">
            No applicant selected
          </div>
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

      {/* CHAT MODAL */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversation(null);
        }}
        conversationId={
          chatConversation?.id ||
          chatConversation?.conversation_id ||
          chatConversation?.conversationId ||
          null
        }
        currentUserId={user?.id}
        currentUserName={user?.full_name || user?.fullName}
        otherParticipant={
          chatConversation?.otherParticipant ||
          chatConversation?.other_participant ||
          chatConversation?.other_user ||
          chatConversation?.otherUser ||
          null
        }
      />
						
						
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* APPLICATION CARD BODY                                                      */
/* -------------------------------------------------------------------------- */

function ApplicationCardBody({
  app,
  item,
  isExpanded,
  onToggle,
  onOpenChat,
  onOpenProfile,
  onAccept,
  onReject,
  onMarkGiven,
  onViewHistory,
  onReport,
  isOpeningChat,
  isPending,
  isAccepted,
  isGiven,
  actionLoading,
  markGivenLoading,
  canChat,
  hasConversation,
  hasMessages,
  messageCount,
  menuItems,
  formatDate,
  formatDateTime,
}) {
  const status = getApplicationStatusStyle(app.status);
  const display = getApplicationStatusDisplay(app.status);
  const StatusIcon = getStatusIconComponent(app.status);

  const applicant = app.applicant || {};

  /* location is JSONB { city, state, country } */
  const location =
    formatLocation(applicant.location) || 'Location not specified';

  return (
    <>
      <div className="p-4">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-100 bg-ink-50">
              {applicant.avatar_url ? (
                <img
                  src={applicant.avatar_url}
                  alt={applicant.full_name || 'Applicant'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink-300">
                  <Users size={18} />
                </span>
              )}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-ink-950 transition group-hover:text-primary-600">
                {applicant.full_name || 'Unknown User'}
              </span>
              <span className="mt-1 block truncate text-[11px] font-bold text-ink-400">
                Applied {formatDate(app.created_at)}
              </span>
            </span>
          </button>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${status.wrapper}`}
          >
            <StatusIcon size={11} />
            {display.label}
          </span>
        </div>

        {/* MESSAGE */}
        {app.message && (
          <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-ink-500">
            <span className="font-extrabold text-ink-700">Note:</span>{' '}
            {app.message}
          </p>
        )}

        {/* LOCATION + REINTEREST */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-ink-500">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{location}</span>
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {hasConversation && hasMessages && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-600">
                <MessageCircle size={10} />
                {messageCount}
              </span>
            )}

            {app.reinterest_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[10px] font-extrabold text-primary-700">
                <Repeat size={11} />
                {app.reinterest_count}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-3 py-3">
        <div className="flex items-center gap-1">
          {canChat && (
            <button
              type="button"
              onClick={onOpenChat}
              disabled={isOpeningChat || markGivenLoading}
              className={`
                flex h-9 items-center justify-center gap-1.5 rounded-xl
                text-ink-400 transition
                hover:bg-primary-50 hover:text-primary-600
                disabled:cursor-wait disabled:opacity-70
                ${
                  isOpeningChat
                    ? 'bg-primary-50 px-3 text-primary-600'
                    : 'w-9'
                }
              `}
              title={isOpeningChat ? 'Opening chat…' : 'Open chat'}
              aria-label={isOpeningChat ? 'Opening chat' : 'Open chat'}
              aria-busy={isOpeningChat}
            >
              {isOpeningChat ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[11px] font-extrabold">
                    Opening…
                  </span>
                </>
              ) : (
                <MessageCircle size={15} />
              )}
            </button>
          )}

          {isAccepted && !isGiven && (
            <button
              type="button"
              onClick={onMarkGiven}
              disabled={markGivenLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-success-600 transition hover:bg-success-50 disabled:cursor-wait disabled:opacity-60"
              title="Mark as given"
              aria-label="Mark as given"
            >
              {markGivenLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Package size={15} />
              )}
            </button>
          )}

          <ActionMenu items={menuItems} placement="top" align="right" />
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
          aria-label="Toggle details"
        >
          <span>{isExpanded ? 'Hide' : 'Details'}</span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* EXPANDED DETAILS */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-ink-100 bg-ink-50/40"
          >
            <div className="space-y-3 p-4">
              {/* MESSAGE */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Message from applicant
                </span>
                <p className="mt-1 rounded-2xl border border-ink-100 bg-white p-3 text-xs font-medium leading-relaxed text-ink-700">
                  {app.message || 'No message provided.'}
                </p>
              </div>

              {/* APPLICANT / ITEM CARDS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Applicant
                  </span>

                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="mt-1.5 flex w-full items-center gap-2 text-left"
                  >
                    {applicant.avatar_url ? (
                      <img
                        src={applicant.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-black text-ink-600">
                        {applicant.full_name?.charAt(0) || 'U'}
                      </span>
                    )}

                    <span className="truncate text-xs font-extrabold text-ink-800 transition hover:text-primary-600">
                      {applicant.full_name || 'Unknown User'}
                    </span>
                  </button>
                </div>

                <div className="rounded-2xl border border-ink-100 bg-white p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                    Application
                  </span>
                  <div className="mt-1.5 text-[11px] font-medium text-ink-500">
                    <span className="font-extrabold text-ink-800">
                      Applied:
                    </span>{' '}
                    {formatDate(app.created_at)}
                    {app.shipping_estimate && (
                      <>
                        <br />
                        <span className="font-extrabold text-ink-800">
                          Est. shipping:
                        </span>{' '}
                        ${app.shipping_estimate}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RE-INTEREST INFO */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary-900">
                    <Repeat size={13} />
                    Re-Interest History
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-primary-700">
                    {app.reinterest_count} time
                    {app.reinterest_count > 1 ? 's' : ''} re-declared
                  </p>

                  {app.reinterest_count > 0 && (
                    <p className="mt-0.5 text-[10px] font-bold text-primary-600">
                      Last: {formatDateTime(app.last_reinterest_date)}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onViewHistory}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-primary-700"
                >
                  <Clock size={11} />
                  View
                </button>
              </div>

              {/* STATUS CTAs */}
              {isPending && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={actionLoading}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-success-600 text-xs font-extrabold text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={14} />
                        Accept
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    disabled={actionLoading}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-danger-600 text-xs font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <X size={14} />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              )}

              {isAccepted && (
                <div className="space-y-2">
                  {!isGiven && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-success-200 bg-success-50 p-3 text-xs font-semibold text-success-800">
                      <div className="flex items-center gap-2">
                        <Package
                          size={14}
                          className="shrink-0 text-success-600"
                        />
                        <span>Ready to mark this item as given?</span>
                      </div>

                      <button
                        type="button"
                        onClick={onMarkGiven}
                        disabled={markGivenLoading}
                        className="shrink-0 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-success-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {markGivenLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          'Mark Given'
                        )}
                      </button>
                    </div>
                  )}

                  {isGiven && (
                    <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-3 text-xs font-semibold text-primary-800">
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-primary-600"
                      />
                      <span>
                        You marked this item as given. Waiting for winner to
                        confirm receipt.
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onReport}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
                  >
                    <Flag size={13} />
                    Report Issue
                  </button>
                </div>
              )}

              {(app.status === APPLICATION_STATUSES.REJECTED ||
                app.status === APPLICATION_STATUSES.CANCELLED ||
                app.status === APPLICATION_STATUSES.NOT_SELECTED) && (
                <div
                  className={`flex items-center gap-2 rounded-2xl border p-3 text-xs font-bold ${
                    app.status === APPLICATION_STATUSES.REJECTED
                      ? 'border-danger-200 bg-danger-50 text-danger-700'
                      : 'border-ink-200 bg-ink-50 text-ink-600'
                  }`}
                >
                  {app.status === APPLICATION_STATUSES.REJECTED ? (
                    <XCircle size={13} className="shrink-0" />
                  ) : app.status === APPLICATION_STATUSES.NOT_SELECTED ? (
                    <MinusCircle size={13} className="shrink-0" />
                  ) : (
                    <Ban size={13} className="shrink-0" />
                  )}

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
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT CARD                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, icon: Icon, tone = 'ink' }) {
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ filtered, onReset }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          {filtered ? <Search size={27} /> : <Inbox size={27} />}
        </div>

        <h2 className="mt-5 text-lg font-black text-ink-950">
          {filtered ? 'No matching applications' : 'No applications yet'}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {filtered
            ? 'Try adjusting your search or filters to find the application you are looking for.'
            : "No one has applied for this item yet. Check back later!"}
        </p>

        {filtered && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <RefreshCw size={15} />
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                 */
/* -------------------------------------------------------------------------- */

function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
          currentPage === 1
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50 hover:text-primary-600'
        }`}
      >
        <ChevronLeft size={14} />
      </button>

      {getPageNumbers().map((page, index) =>
        page === '...' ? (
          <span
            key={`dots-${index}`}
            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-ink-300"
          >
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold transition ${
              currentPage === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-ink-500 hover:bg-ink-50 hover:text-primary-600'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-ink-200'
            : 'text-ink-500 hover:bg-primary-50 hover:text-primary-600'
        }`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default ApplicationsToMyItem;