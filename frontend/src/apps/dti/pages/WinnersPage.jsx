import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { winnersAPI } from '@/services/api/dtiApi';
import { getCategoryByValue } from '@/utils/constants';
import { renderIcon } from '@/utils/constantHelpers';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/reusables/Modal';
import ApplicantProfileCard from './ApplicantProfileCard';

// ── Skeleton ──────────────────────────────────────────────
const WinnersSkeleton = () => (
  <div className="mt-10 min-h-screen bg-ink-50/30">
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      <div className="animate-pulse">
        <div className="h-5 w-32 rounded bg-ink-200" />
        <div className="mt-5 h-14 w-80 max-w-full rounded bg-ink-200" />
        <div className="mt-4 h-5 w-[28rem] max-w-full rounded bg-ink-200" />
        <div className="mt-10 h-[22rem] rounded-2xl bg-ink-200" />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white">
              <div className="h-52 bg-ink-200" />
              <div className="space-y-4 p-6">
                <div className="h-5 w-3/4 rounded bg-ink-200" />
                <div className="h-4 w-1/2 rounded bg-ink-200" />
                <div className="h-10 rounded bg-ink-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────
const WinnersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('week');
  const [profileModal, setProfileModal] = useState({ open: false, userId: null });

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      if (range === 'week') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        response = await winnersAPI.getByDateRange(
          startOfWeek.toISOString().split('T')[0],
          endOfWeek.toISOString().split('T')[0]
        );
      } else {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        response = await winnersAPI.getByDateRange(startDate, endDate);
      }
      setWinners(response.data?.winners || []);
    } catch (error) {
      console.error('Failed to fetch winners:', error);
      toast.error('Could not load winners');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchWinners(); }, [fetchWinners]);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUserClick = (userId) => {
    if (!userId) return;
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      navigate(`/admin/users-profile/${userId}`);
    } else {
      setProfileModal({ open: true, userId });
    }
  };

  const getStory = (winner) => {
    if (!winner.story) return null;
    return winner.story.length > 180 ? `${winner.story.substring(0, 180)}...` : winner.story;
  };

  if (loading) return <WinnersSkeleton />;

  const featuredWinner = winners[0];
  const featuredCategory = featuredWinner ? getCategoryByValue(featuredWinner.item?.category) : null;

  return (
    <div className="overflow-hidden bg-ink-50/30 text-ink-900">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary-300/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-8 lg:px-10 lg:pb-16 lg:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-200 backdrop-blur">
                <i className="bi bi-trophy-fill" />
                Community spotlight
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                The <span className="text-primary-200"> Winners' Circle.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-primary-100 sm:text-lg">
                Celebrating the people turning generosity into real-world impact. Every winner represents an item that found a new home.
              </p>
            </motion.div>
            {/* Period switcher */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex rounded-2xl border border-white/20 bg-white/10 p-1.5 backdrop-blur"
            >
              <button
                onClick={() => setRange('week')}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  range === 'week'
                    ? 'bg-white text-primary-700 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                This week
              </button>
              <button
                onClick={() => setRange('month')}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  range === 'month'
                    ? 'bg-white text-primary-700 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                This month
              </button>
            </motion.div>
          </div>
        </div>
        {/* Bottom stats strip */}
        <div className="relative border-t border-white/20">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/20 px-5 sm:px-8 md:grid-cols-3 lg:px-10">
            <div className="py-5 pr-5">
              <p className="text-2xl font-black text-white">{winners.length}</p>
              <p className="mt-1 text-xs text-primary-200">
                {range === 'week' ? 'Winners this week' : 'Winners this month'}
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-2xl font-black text-white">
                {winners.length > 0 ? '100%' : '—'}
              </p>
              <p className="mt-1 text-xs text-primary-200">Items given a second life</p>
            </div>
            <div className="hidden py-5 pl-5 md:block">
              <p className="text-2xl font-black text-white">
                <i className="bi bi-globe2 text-primary-200" />
              </p>
              <p className="mt-1 text-xs text-primary-200">A community without borders</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        {winners.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl rounded-2xl border border-ink-100/80 bg-white px-6 py-20 text-center shadow-sm"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <i className="bi bi-trophy text-3xl" />
            </div>
            <h2 className="mt-7 text-2xl font-black text-ink-900">No winners yet this {range}.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-500">
              The next great handoff could be yours. Check out the available items and become part of the story.
            </p>
            <Link
              to="/browse"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:shadow-md"
            >
              <i className="bi bi-search" /> Browse items <i className="bi bi-arrow-right" />
            </Link>
          </motion.div>
        ) : (
          <>
            {/* ── Featured Winner ─────────────────────────── */}
            {featuredWinner && (
              <motion.section
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="mb-16"
              >
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Featured handoff</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink-900 sm:text-4xl">This {range}'s story</h2>
                  </div>
                  <div className="hidden items-center gap-2 text-xs font-bold text-ink-400 sm:flex">
                    <i className="bi bi-stars text-primary-500" /> Community spotlight
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm">
                  <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                    {/* Image */}
                    <div className="relative min-h-[320px] overflow-hidden bg-ink-100 lg:min-h-[430px]">
                      {featuredWinner.item?.images?.[0] ? (
                        <img
                          src={featuredWinner.item.images[0]}
                          alt={featuredWinner.item.title || 'Winner item'}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-ink-200">
                          <i className="bi bi-image text-6xl text-ink-400" />
                        </div>
                      )}
                      <div className="absolute left-5 top-5">
                        <span className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 text-xs font-bold text-ink-700 backdrop-blur">
                          <i className="bi bi-trophy-fill text-primary-600" /> Winner
                        </span>
                      </div>
                      <div className="absolute bottom-6 left-6 right-6">
                        {featuredCategory && (
                          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm">
                            {renderIcon(featuredCategory.icon, 'w-4 h-4', featuredCategory.color)}
                            {featuredCategory.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Story */}
                    <div className="flex flex-col justify-between p-7 sm:p-9 lg:p-10">
                      <div>
                        <h3 className="mb-1 text-xl font-black sm:text-3xl">
                          {featuredWinner.item?.title || 'Untitled item'}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">A story worth sharing</p>
                        {getStory(featuredWinner) ? (
                          <p className="mt-5 text-lg leading-8 text-ink-700">"{getStory(featuredWinner)}"</p>
                        ) : (
                          <p className="mt-5 text-base leading-7 text-ink-500">
                            Another useful item has found someone who needs it. That's what this is all about.
                          </p>
                        )}
                      </div>

                      <div className="mt-10">
                        {/* Winner */}
                        <button
                          type="button"
                          onClick={() => handleUserClick(featuredWinner.winner?.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-left transition hover:bg-ink-100"
                        >
                          {featuredWinner.winner?.avatar_url ? (
                            <img
                              src={featuredWinner.winner.avatar_url}
                              alt={featuredWinner.winner.full_name || 'Winner'}
                              className="h-11 w-11 rounded-full object-cover ring-2 ring-primary-200"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-200 text-ink-500">
                              <i className="bi bi-person" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-ink-900">{featuredWinner.winner?.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-primary-600">Winner</p>
                          </div>
                          <i className="bi bi-arrow-up-right ml-auto text-ink-400" />
                        </button>

                        {/* Donor */}
                        {featuredWinner.item?.donor && (
                          <button
                            type="button"
                            onClick={() => handleUserClick(featuredWinner.item.donor.id)}
                            className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-left transition hover:bg-ink-100"
                          >
                            {featuredWinner.item.donor.avatar_url ? (
                              <img
                                src={featuredWinner.item.donor.avatar_url}
                                alt={featuredWinner.item.donor.full_name || 'Donor'}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-200 text-ink-500">
                                <i className="bi bi-person" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-ink-900">{featuredWinner.item.donor.full_name || 'Anonymous'}</p>
                              <p className="text-xs text-ink-500">Donor</p>
                            </div>
                            <i className="bi bi-arrow-up-right ml-auto text-ink-400" />
                          </button>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-5">
                          <span className="text-xs text-ink-500">{formatDate(featuredWinner.created_at)}</span>
                          <Link
                            to={`/item/${featuredWinner.item?.id}`}
                            className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 transition hover:text-primary-700"
                          >
                            View item <i className="bi bi-arrow-right" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── All Winners ─────────────────────────────── */}
            {winners.length > 1 && (
              <section>
                <div className="mb-7 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">The community</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink-900">More winners</h2>
                  </div>
                  <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-400 shadow-sm sm:block">
                    {winners.length - 1} more
                  </span>
                </div>

                <motion.div layout className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {winners.slice(1).map((winner, index) => {
                      const category = getCategoryByValue(winner.item?.category);
                      const donor = winner.item?.donor;
                      const story = getStory(winner);

                      return (
                        <motion.article
                          key={winner.id}
                          layout
                          initial={{ opacity: 0, y: 25 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          className="group overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-md"
                        >
                          {/* Image */}
                          <div className="relative h-56 overflow-hidden bg-ink-100">
                            {winner.item?.images?.[0] ? (
                              <img
                                src={winner.item.images[0]}
                                alt={winner.item.title || 'Winner item'}
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <i className="bi bi-image text-5xl text-ink-300" />
                              </div>
                            )}
                            <div className="absolute left-4 top-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-ink-700 backdrop-blur">
                                <i className="bi bi-trophy-fill text-primary-600" /> Winner
                              </span>
                            </div>
                            <span className="absolute bottom-4 right-4 rounded-full bg-ink-900/30 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                              {formatDate(winner.created_at)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="line-clamp-2 text-lg font-black leading-snug text-ink-900">
                                {winner.item?.title || <span className="italic text-rose-500">[Name error]</span>}
                              </h3>
                              {category && (
                                <div className="shrink-0 rounded-lg bg-ink-50 p-2">
                                  {renderIcon(category.icon, 'w-4 h-4', category.color)}
                                </div>
                              )}
                            </div>

                            {/* Winner */}
                            <button
                              type="button"
                              onClick={() => handleUserClick(winner.winner?.id)}
                              className="mt-5 flex w-full items-center gap-3 text-left"
                            >
                              {winner.winner?.avatar_url ? (
                                <img
                                  src={winner.winner.avatar_url}
                                  alt={winner.winner.full_name || 'Winner'}
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-100"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                                  <i className="bi bi-person" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-ink-900 transition group-hover:text-primary-700">
                                  {winner.winner?.full_name || 'Anonymous'}
                                </p>
                                <p className="text-xs text-primary-600">Winner</p>
                              </div>
                            </button>

                            {/* Donor */}
                            {donor && (
                              <button
                                type="button"
                                onClick={() => handleUserClick(donor.id)}
                                className="mt-3 flex w-full items-center gap-3 border-t border-ink-100 pt-3 text-left"
                              >
                                {donor.avatar_url ? (
                                  <img
                                    src={donor.avatar_url}
                                    alt={donor.full_name || 'Donor'}
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                                    <i className="bi bi-person text-sm" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-ink-700">{donor.full_name || 'Anonymous'}</p>
                                  <p className="text-[10px] text-ink-400">Donor</p>
                                </div>
                              </button>
                            )}

                            {/* Story */}
                            {story && (
                              <div className="mt-4 rounded-xl bg-ink-50/50 p-3.5 border border-ink-100/60">
                                <p className="line-clamp-3 text-xs leading-5 text-ink-500">"{story}"</p>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
                              {category ? (
                                <span className="text-[11px] font-medium text-ink-400">{category.label}</span>
                              ) : (
                                <span />
                              )}
                              <Link
                                to={`/item/${winner.item?.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 transition hover:text-primary-700"
                              >
                                View item <i className="bi bi-arrow-right" />
                              </Link>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </section>
            )}

            {/* ── Bottom CTA ──────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-20 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 shadow-sm"
            >
              <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
                <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                    <i className="bi bi-gift-fill text-xl" />
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                    Your item could be next.
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-primary-100 sm:text-base">
                    Have something useful that you no longer need? Give it a second life and become part of the next Winners' Circle.
                  </p>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <Link
                      to="/create"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50 hover:shadow-md"
                    >
                      Give an item <i className="bi bi-arrow-up-right" />
                    </Link>
                    <Link
                      to="/browse"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-transparent px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
                    >
                      Find something <i className="bi bi-search" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </main>

      {/* ── Profile Modal ────────────────────────────────── */}
      <Modal
        isOpen={profileModal.open}
        onClose={() => setProfileModal({ open: false, userId: null })}
        title="User Profile"
        size="md"
      >
        {profileModal.userId && <ApplicantProfileCard userId={profileModal.userId} />}
      </Modal>
    </div>
  );
};

export default WinnersPage;