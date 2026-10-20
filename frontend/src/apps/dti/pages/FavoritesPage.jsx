import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Heart,
  Search,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  LogIn,
  Loader2,
  X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { favoritesAPI } from '@/services/api/dtiApi';

import Modal from '@/reusables/Modal';


/* ============================================================
   SKELETON
============================================================ */

const FavoritesSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-48 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
          <div className="h-12 w-32 animate-pulse rounded-2xl bg-ink-200" />
        </div>

        {/* SEARCH */}
        <div className="h-12 w-full animate-pulse rounded-2xl bg-ink-100" />

        {/* CARDS */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
            >
              <div className="h-40 w-full animate-pulse bg-ink-100" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   MAIN
============================================================ */

const FavoritesPage = () => {
  const { isAuthenticated } = useAuth();
  const { to } = makePaths(DTI_BASE);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  /* --------------------------------------------------------
     FETCH
  -------------------------------------------------------- */

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await favoritesAPI.getAll();
      const list = response.data?.favorites || response.data || [];
      setFavorites(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      setError(err.response?.data?.error || 'Failed to load favorites');
      setFavorites([]);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  /* --------------------------------------------------------
     FILTER (search only)
  -------------------------------------------------------- */

  const filteredFavorites = useMemo(() => {
    if (!searchTerm.trim()) return favorites;

    const term = searchTerm.trim().toLowerCase();

    return favorites.filter(
      (item) =>
        item.title?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
    );
  }, [favorites, searchTerm]);

  const hasActiveSearch = Boolean(searchTerm.trim());

  /* --------------------------------------------------------
     HANDLERS
  -------------------------------------------------------- */

  const handleRemoveItem = (itemId) => {
    setFavorites((prev) => prev.filter((item) => item.item_id !== itemId));
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await favoritesAPI.clearAll();
      setFavorites([]);
      toast.success('All favorites cleared');
      setShowClearAllModal(false);
    } catch (err) {
      toast.error('Failed to clear favorites');
      fetchFavorites();
    } finally {
      setClearing(false);
    }
  };

  /* --------------------------------------------------------
     UNAUTHENTICATED
  -------------------------------------------------------- */

  if (!isAuthenticated) {
    return (
      <div className="min-h-full bg-transparent">


        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Heart size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Sign in to view favorites
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Save items you love and come back to them anytime.
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

  /* --------------------------------------------------------
     LOADING
  -------------------------------------------------------- */

  if (loading) return <FavoritesSkeleton />;

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Heart size={14} />
                <span>Your saved items</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                My Favorites
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                {favorites.length === 0
                  ? 'Save items you love and come back to them anytime.'
                  : `${favorites.length} ${
                      favorites.length === 1 ? 'item' : 'items'
                    } saved`}
              </p>
            </div>

            {favorites.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-danger-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-danger-700 active:scale-[0.98]"
              >
                <Trash2 size={17} strokeWidth={2.5} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* SEARCH */}
        {favorites.length > 0 && (
          <div className="relative mb-6">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your saved items..."
              className="h-12 w-full rounded-2xl border border-ink-200 bg-white pl-11 pr-11 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-danger-900">
                Couldn't load favorites
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchFavorites}
                className="mt-3 text-xs font-extrabold text-danger-800 underline transition hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* GRID / EMPTY */}
        {!error && favorites.length === 0 ? (
          <EmptyState variant="empty" />
        ) : !error && filteredFavorites.length === 0 ? (
          <EmptyState
            variant="filtered"
            onReset={() => setSearchTerm('')}
          />
        ) : !error ? (
          <motion.div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.03 } },
            }}
          >
            {filteredFavorites.map((item) => (
              <motion.div
                key={item.id || item.item_id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <FavoriteCard item={item} onRemove={handleRemoveItem} />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </div>

      {/* CLEAR ALL MODAL */}
      <Modal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        title="Clear All Favorites"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Remove all favorites?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                Are you sure you want to remove all{' '}
                <strong>{favorites.length}</strong>{' '}
                {favorites.length === 1 ? 'item' : 'items'} from your
                favorites? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowClearAllModal(false)}
              disabled={clearing}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep Favorites
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Yes, Clear All
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ============================================================
   FAVORITE CARD
============================================================ */

const FavoriteCard = ({ item, onRemove }) => {
  const [removing, setRemoving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { to } = makePaths(DTI_BASE);
		
  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (removing) return;

    setRemoving(true);
    try {
      await favoritesAPI.remove(item.item_id);
      toast.success('Removed from favorites');
      onRemove?.(item.item_id);
    } catch (err) {
      toast.error('Failed to remove from favorites');
    } finally {
      setRemoving(false);
    }
  };

  const imageUrl = item.images?.[0] || null;
  const itemDetailId = item.item_id || item.id;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      {/* Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        aria-label="Remove from favorites"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-100 bg-white/95 text-danger-500 shadow-sm backdrop-blur-sm transition hover:border-danger-200 hover:bg-danger-50 disabled:cursor-wait disabled:opacity-60"
      >
        {removing ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Heart size={15} fill="currentColor" />
        )}
      </button>

      <Link to={to(`/item/${itemDetailId}`)} className="block">
        {/* IMAGE */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-50">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={item.title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">
              <ImageIcon size={26} />
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            {item.condition && (
              <span className="truncate text-[10px] font-extrabold uppercase tracking-wide text-ink-500">
                {item.condition}
              </span>
            )}

            {item.condition && item.category && (
              <span className="text-ink-300">·</span>
            )}

            {item.category && (
              <span className="truncate text-[10px] font-extrabold uppercase tracking-wide text-ink-400">
                {item.category}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-black leading-snug text-ink-950 transition group-hover:text-primary-600 sm:text-base">
            {item.title || 'Untitled item'}
          </h3>
        </div>
      </Link>
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ variant = 'empty', onReset }) {
  const isFiltered = variant === 'filtered';
		const { to } = makePaths(DTI_BASE);

  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
          <Heart size={26} />
        </div>

        <h2 className="mt-5 text-lg font-black text-ink-950">
          {isFiltered ? 'No matching favorites' : 'No favorites yet'}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
          {isFiltered
            ? 'Try a different search term to find what you saved.'
            : 'Start browsing items and tap the heart icon to save them here.'}
        </p>

        <div className="mt-6 flex justify-center">
          {isFiltered ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <X size={15} />
              Clear search
            </button>
          ) : (
            <Link
              to={to("/browse")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
            >
              <Search size={16} />
              Browse items
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default FavoritesPage;