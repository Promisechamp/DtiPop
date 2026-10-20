// src/admin/AdminModeration.jsx

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, Flag, MessageSquare } from 'lucide-react';

import AdminSupport from './AdminSupport';
import ItemDiscussionReports from './ItemDiscussionReports';
import ChatReports from './ChatReports';

const TABS = {
  TICKETS: 'tickets',
  COMMUNITY: 'community',
  CHAT: 'chat',
};

const tabItems = [
  {
    id: TABS.TICKETS,
    label: 'Tickets',
    icon: Ticket,
    hint: 'Support tickets from users: chat, status, and follow-up.',
    Component: AdminSupport,
  },
  {
    id: TABS.COMMUNITY,
    label: 'Community',
    icon: Flag,
    hint: 'Flags on item discussion messages: review, resolve, or dismiss.',
    Component: ItemDiscussionReports,
  },
  {
    id: TABS.CHAT,
    label: 'Chat',
    icon: MessageSquare,
    hint: 'Reports from direct conversations between users.',
    Component: ChatReports,
  },
];

const AdminModeration = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  /* Derive activeTab directly from URL param; fallback to default if invalid */
  const activeTab = useMemo(() => {
    const queryTab = searchParams.get('tab');
    return Object.values(TABS).includes(queryTab) ? queryTab : TABS.TICKETS;
  }, [searchParams]);

  const activeItem = useMemo(
    () => tabItems.find((t) => t.id === activeTab) || tabItems[0],
    [activeTab]
  );

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* HEADER */}
        <header className="mb-7">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              <Flag size={14} />
              <span>Moderation</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              Support &amp; Reports
            </h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
              <span>3 channels</span>
              <span className="text-ink-300">·</span>
              <span>Review tickets, community flags, and chat reports</span>
            </p>
          </div>
        </header>

        {/* TAB BAR */}
        <div className="mb-6 w-full border-b border-ink-100">
          <div className="relative flex w-full">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-extrabold transition-colors sm:justify-start sm:px-4 ${
                    isActive
                      ? 'text-ink-950'
                      : 'text-ink-400 hover:text-ink-700'
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      isActive ? 'text-primary-600' : 'text-ink-300'
                    }
                  />
                  <span>{tab.label}</span>

                  {isActive && (
                    <motion.span
                      layoutId="moderation-tab-underline"
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary-600"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 36,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SECTION HINT */}
        <p className="mb-6 text-xs font-bold text-ink-500">{activeItem.hint}</p>

        {/* TAB CONTENT */}
        <activeItem.Component embedded />
      </div>
    </div>
  );
};

export default AdminModeration;