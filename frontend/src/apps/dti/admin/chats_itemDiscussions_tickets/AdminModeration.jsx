import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, Flag, MessageSquare } from 'lucide-react';
import AdminSupport from './AdminSupport';
import ItemDiscussionReports from './ItemDiscussionReports';
import ChatReports from './ChatReports';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

const TABS = {
  TICKETS: 'tickets',
  COMMUNITY: 'community',
  CHAT: 'chat',
};

const tabItems = [
  { id: TABS.TICKETS, label: 'Tickets', icon: Ticket, hint: 'Support tickets from users: chat, status, and follow-up.', Component: AdminSupport },
  { id: TABS.COMMUNITY, label: 'Community', icon: Flag, hint: 'Flags on item discussion messages: review, resolve, or dismiss.', Component: ItemDiscussionReports },
  { id: TABS.CHAT, label: 'Chat', icon: MessageSquare, hint: 'Reports from direct conversations between users.', Component: ChatReports },
];

const AdminModeration = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive activeTab directly from URL param; fallback to default if invalid or missing
  const activeTab = useMemo(() => {
    const queryTab = searchParams.get('tab');
    return Object.values(TABS).includes(queryTab) ? queryTab : TABS.TICKETS;
  }, [searchParams]);

  const activeItem = useMemo(() => tabItems.find(t => t.id === activeTab), [activeTab]);

  const handleTabChange = (tabId) => {
    // Use replace: true to avoid cluttering browser history with tab changes
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-50/30 px-2">
      <PageNavigation />

      {/* Quiet page context */}
      <div className="mt-2 mb-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-600">
            Moderation
          </span>
        </div>
        <h1 className="text-xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-2xl">
          Support & reports
        </h1>
      </div>

      {/* Subtle full-width tab bar */}
      <div className="w-full border-b border-ink-100">
        <div className="relative flex w-full">
          {tabItems.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-bold transition-colors sm:justify-start sm:px-4 ${
                  isActive ? 'text-primary-700' : 'text-ink-400 hover:text-ink-700'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-primary-600' : 'text-ink-300'} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="moderation-tab-underline"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-500"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint for the active section */}
      <p className="mt-3 text-sm text-ink-500">{activeItem.hint}</p>

      {/* Tab content */}
      <div className="mt-10">
        <activeItem.Component embedded />
      </div>
    </div>
  );
};

export default AdminModeration;