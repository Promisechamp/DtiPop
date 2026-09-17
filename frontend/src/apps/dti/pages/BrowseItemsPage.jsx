import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  itemsAPI,
} from '@/services/api/dtiApi';

import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  SHIPPING_OPTIONS,
} from '@/utils/constants';

import Select from '@/reusables/Select';
import FeaturedCarousel from './FeaturedCarousel';

/* =========================================================
   HELPERS
========================================================= */

const getItemImage = (item) => {
  if (!item?.images) return null;

  if (Array.isArray(item.images)) {
    return item.images[0] || null;
  }

  if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);

      if (Array.isArray(parsed)) {
        return parsed[0] || null;
      }

      return item.images;
    } catch {
      return item.images;
    }
  }

  return null;
};

const formatLabel = (value) => {
  if (!value) return '';

  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getCategoryLabel = (category) => {
  if (!category) return 'Item';

  const option = ITEM_CATEGORIES?.find(
    (item) => item.value === category
  );

  return option?.label || formatLabel(category);
};

const getConditionLabel = (condition) => {
  if (!condition) return null;

  const option = ITEM_CONDITIONS?.find(
    (item) => item.value === condition
  );

  return option?.label || formatLabel(condition);
};

const getShippingLabel = (region) => {
  if (!region) return null;

  const option = SHIPPING_OPTIONS?.find(
    (item) => item.value === region
  );

  return option?.label || formatLabel(region);
};

/* =========================================================
   SKELETON
========================================================= */

const ItemCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50/50">
      <div className="aspect-square animate-pulse bg-ink-100" />

      <div className="space-y-3 p-3.5 sm:p-4">
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-ink-200" />

        <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-ink-100" />

        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 animate-pulse rounded-md bg-ink-100" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-ink-100" />
        </div>

        <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({ onReset }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 px-6 py-16 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <i className="bi bi-box-seam text-2xl" />
      </div>

      <h3 className="mt-5 text-lg font-black tracking-tight text-ink-950">
        Nothing here yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
        We couldn't find anything matching your current search or
        filters. Try widening your search and see what the community
        has to offer.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
      >
        <i className="bi bi-arrow-counterclockwise" />
        Clear filters
      </button>
    </motion.div>
  );
};

/* =========================================================
   ITEM CARD
========================================================= */

const ItemCard = ({
  item,
  index,
  isFavorite,
  onToggleFavorite,
}) => {
  const image = getItemImage(item);
  const condition = getConditionLabel(item?.condition);
  const shipping = getShippingLabel(
    item?.shipping_regions?.region
  );

  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
        delay: Math.min(index, 8) * 0.035,
      }}
      className="
        group
        overflow-hidden
        rounded-2xl
        border
        border-ink-100
        bg-white
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-ink-200
        hover:shadow-lg
      "
    >
      {/* IMAGE */}

      <div className="relative aspect-square overflow-hidden bg-ink-100">
        {image ? (
          <img
            src={image}
            alt={item?.title || 'Community item'}
            loading="lazy"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              ease-out
              group-hover:scale-[1.045]
            "
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-300 shadow-sm">
              <i className="bi bi-image text-xl" />
            </div>
          </div>
        )}

        {/* CATEGORY */}

        <div className="absolute bottom-3 left-3">
          <span className="inline-flex rounded-lg bg-ink-950/75 px-2.5 py-1.5 text-[10px] font-extrabold text-white backdrop-blur-md">
            {getCategoryLabel(item?.category)}
          </span>
        </div>

        {/* FAVORITE */}

        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          aria-label={
            isFavorite
              ? 'Remove item from saved items'
              : 'Save item for later'
          }
          aria-pressed={isFavorite}
          className="
            absolute
            right-3
            top-3
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            border
            border-white/40
            bg-white/90
            text-ink-500
            shadow-sm
            backdrop-blur-md
            transition-all
            hover:scale-105
            hover:text-ink-900
            focus:outline-none
            focus:ring-4
            focus:ring-primary-500/20
          "
        >
          <i
            className={`bi ${
              isFavorite
                ? 'bi-heart-fill text-primary-600'
                : 'bi-heart'
            }`}
          />
        </button>
      </div>

      {/* CONTENT */}

      <div className="p-3.5 sm:p-4">
        <Link
          to={`/item/${item.id}`}
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <h3 className="line-clamp-2 text-sm font-extrabold leading-5 tracking-[-0.01em] text-ink-950 transition-colors group-hover:text-primary-700 sm:text-[15px]">
            {item?.title}
          </h3>
        </Link>

        {/* DETAILS */}

        {(condition || item?.donor_pays_shipping) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {condition && (
              <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-1 text-[10px] font-bold text-ink-500">
                <i className="bi bi-patch-check text-primary-500" />
                {condition}
              </span>
            )}

            {item?.donor_pays_shipping && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-700">
                <i className="bi bi-gift" />
                Free delivery
              </span>
            )}
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {item?.donor?.full_name ? (
              <p className="truncate text-[10px] font-bold text-ink-400">
                Given by {item.donor.full_name}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-ink-400">
                Community gift
              </p>
            )}

            {shipping && (
              <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-medium text-ink-400">
                <i className="bi bi-globe2" />
                {shipping}
              </p>
            )}
          </div>

          <Link
            to={`/item/${item.id}`}
            aria-label={`See ${item?.title || 'item'}`}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-ink-50
              text-ink-500
              transition-all
              duration-300
              group-hover:bg-primary-600
              group-hover:text-white
              focus:outline-none
              focus:ring-4
              focus:ring-primary-500/20
            "
          >
            <i className="bi bi-arrow-up-right text-xs" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

/* =========================================================
   MAIN PAGE
========================================================= */

const BrowseItemsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  /* -------------------------------------------------------
     URL STATE
  ------------------------------------------------------- */

  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentCondition = searchParams.get('condition') || '';
  const currentRegion = searchParams.get('region') || '';
  const currentShipping = searchParams.get('shipping') || '';
  const currentPage =
    parseInt(searchParams.get('page'), 10) || 0;

  /* -------------------------------------------------------
     LOCAL UI STATE
  ------------------------------------------------------- */

  const [searchInput, setSearchInput] =
    useState(currentSearch);

  const [filtersVisible, setFiltersVisible] = useState(() => {
    return Boolean(
      currentSearch ||
      currentCategory ||
      currentCondition ||
      currentRegion ||
      currentShipping
    );
  });

  /* -------------------------------------------------------
     FEATURED
  ------------------------------------------------------- */

  const [featuredItems, setFeaturedItems] = useState([]);
  const [featuredLoading, setFeaturedLoading] =
    useState(true);

  /* -------------------------------------------------------
     ITEMS
  ------------------------------------------------------- */

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* -------------------------------------------------------
     FAVORITES
  ------------------------------------------------------- */

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('dti_favorites');

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const limit = 20;

  /* =======================================================
     FEATURED FETCH
  ======================================================= */

  const fetchFeatured = useCallback(async () => {
    setFeaturedLoading(true);

    try {
      const response = await itemsAPI.getAll({
        limit: 100,
        offset: 0,
        featured: true,
      });

      const payload = response?.data;

      setFeaturedItems(
        Array.isArray(payload?.items)
          ? payload.items
          : []
      );
    } catch (err) {
      console.error(
        'Failed to fetch featured items:',
        err
      );

      setFeaturedItems([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  /* =======================================================
     ITEMS FETCH
  ======================================================= */

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        limit,
        offset: currentPage * limit,
      };

      if (currentSearch.trim()) {
        params.search = currentSearch.trim();
      }

      if (currentCategory) {
        params.category = currentCategory;
      }

      if (currentCondition) {
        params.condition = currentCondition;
      }

      if (currentRegion) {
        params.region = currentRegion;
      }

      if (currentShipping !== '') {
        params.donor_pays_shipping = currentShipping;
      }

      const response = await itemsAPI.getAll(params);
      const payload = response?.data;

      setItems(
        Array.isArray(payload?.items)
          ? payload.items
          : []
      );

      setTotal(Number(payload?.total) || 0);
    } catch (err) {
      console.error(
        'Failed to fetch items:',
        err
      );

      setError(
        err?.response?.data?.error ||
          'We could not load the community gifts.'
      );

      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentSearch,
    currentCategory,
    currentCondition,
    currentRegion,
    currentShipping,
    currentPage,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* =======================================================
     URL HELPERS
  ======================================================= */

  const updateUrlParams = useCallback(
    (newParams) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newParams).forEach(
        ([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            value !== ''
          ) {
            params.set(key, String(value));
          } else {
            params.delete(key);
          }
        }
      );

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlParams({
          search: searchInput,
          page: 0,
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    searchInput,
    currentSearch,
    updateUrlParams,
  ]);

  /* =======================================================
     FILTERS
  ======================================================= */

  const handleFilterChange = (key, value) => {
    updateUrlParams({
      [key]: value,
      page: 0,
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
    setFiltersVisible(false);
  };

  /* =======================================================
     FAVORITES
  ======================================================= */

  const toggleFavorite = (itemId) => {
    setFavorites((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        'dti_favorites',
        JSON.stringify(favorites)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [favorites]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.ceil(total / limit);

  const hasPrevious = currentPage > 0;

  const hasNext =
    currentPage + 1 < totalPages;

  const handlePageChange = (page) => {
    updateUrlParams({ page });
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /* =======================================================
     FILTER DISPLAY
  ======================================================= */

  const activeFilters = useMemo(() => {
    const filters = [];

    if (currentSearch) {
      filters.push(`"${currentSearch}"`);
    }

    if (currentCategory) {
      filters.push(
        getCategoryLabel(currentCategory)
      );
    }

    if (currentCondition) {
      filters.push(
        getConditionLabel(currentCondition)
      );
    }

    if (currentRegion) {
      filters.push(
        getShippingLabel(currentRegion)
      );
    }

    if (currentShipping) {
      filters.push(
        currentShipping === 'true'
          ? 'Giver handles delivery'
          : 'Recipient handles delivery'
      );
    }

    return filters;
  }, [
    currentSearch,
    currentCategory,
    currentCondition,
    currentRegion,
    currentShipping,
  ]);

  const filterDisplayText = useMemo(() => {
    if (!activeFilters.length) {
      return 'Filter & discover';
    }

    const text = activeFilters.join(' · ');

    return text.length > 34
      ? `${text.slice(0, 34)}…`
      : text;
  }, [activeFilters]);

  /* =======================================================
     OPTIONS
  ======================================================= */

  const categoryOptions = useMemo(
    () => ITEM_CATEGORIES || [],
    []
  );

  const conditionOptions = useMemo(
    () => ITEM_CONDITIONS || [],
    []
  );

  const shippingOptions = useMemo(
    () => [
      {
        value: '',
        label: 'Delivery',
      },
      {
        value: 'true',
        label: 'Giver Pays',
      },
      {
        value: 'false',
        label: 'Recipient Pays',
      },
    ],
    []
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-ink-50/30 pb-20">

      {/* =====================================================
          FEATURED
      ===================================================== */}

      <FeaturedCarousel
        items={featuredItems}
        loading={featuredLoading}
      />

      {/* =====================================================
          INTRO
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.45,
          }}
          className="
            grid
            gap-8
            lg:grid-cols-[1fr_auto]
            lg:items-end
          "
        >
          <div className="max-w-3xl">

            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
                Community marketplace
              </span>
            </div>

            <h1 className="
              max-w-3xl
              text-3xl
              font-black
              leading-[1.02]
              tracking-[-0.045em]
              text-ink-950
              sm:text-4xl
              lg:text-[3.35rem]
            ">
              Give what you no longer need.
              <span className="block text-ink-400">
                Find what someone else can use.
              </span>
            </h1>

            <p className="
              mt-4
              max-w-2xl
              text-sm
              leading-6
              text-ink-500
              sm:text-[15px]
            ">
              Useful things deserve another life. Browse
              items people in the community are freely
              offering, or pass something you no longer
              need on to someone who does.
            </p>
          </div>

          <Link
            to="/create"
            className="
              inline-flex
              h-12
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-primary-600
              px-5
              text-sm
              font-extrabold
              text-white
              shadow-sm
              transition-all
              hover:-translate-y-0.5
              hover:bg-primary-700
              hover:shadow-md
              focus:outline-none
              focus:ring-4
              focus:ring-primary-500/20
            "
          >
            <i className="bi bi-plus-lg" />
            Give an Item
          </Link>
        </motion.div>
      </section>

      {/* =====================================================
          DISCOVERY DIVIDER
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-ink-100" />

          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-300">
            Discover
          </span>

          <div className="h-px flex-1 bg-ink-100" />
        </div>
      </section>

      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 lg:px-8">
        <div className="
          overflow-hidden
          rounded-2xl
          border
          border-ink-100
          bg-white
          shadow-sm
        ">

          {/* FILTER HEADER */}

          <div className="flex items-center justify-between gap-4 p-3 sm:p-4">

            <button
              type="button"
              onClick={() =>
                setFiltersVisible((current) => !current)
              }
              aria-expanded={filtersVisible}
              className="
                flex
                min-w-0
                items-center
                gap-2
                rounded-lg
                text-sm
                font-extrabold
                text-ink-600
                transition-colors
                hover:text-ink-950
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500/30
              "
            >
              <i
                className={`bi bi-chevron-${
                  filtersVisible ? 'up' : 'down'
                } text-xs`}
              />

              <span className="truncate">
                {filtersVisible
                  ? 'Hide filters'
                  : filterDisplayText}
              </span>

              {activeFilters.length > 0 && (
                <span className="
                  flex
                  h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-primary-100
                  px-1.5
                  text-[10px]
                  font-black
                  text-primary-700
                ">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="
                  shrink-0
                  rounded-lg
                  px-2
                  py-1.5
                  text-xs
                  font-bold
                  text-ink-400
                  transition-colors
                  hover:bg-ink-50
                  hover:text-ink-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary-500/30
                "
              >
                Clear
              </button>
            )}
          </div>

          {/* FILTER BODY */}

          <AnimatePresence initial={false}>
            {filtersVisible && (
              <motion.div
                initial={{
                  height: 0,
                  opacity: 0,
                }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                }}
                transition={{
                  duration: 0.25,
                  ease: 'easeInOut',
                }}
                className="overflow-hidden"
              >
                <div className="border-t border-ink-100 p-3 sm:p-4">

                  {/* SEARCH */}

                  <div className="relative">
                    <i className="
                      bi
                      bi-search
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-ink-400
                    " />

                    <input
                      type="search"
                      value={searchInput}
                      onChange={handleSearchChange}
                      placeholder="Search gifts from the community..."
                      aria-label="Search community gifts"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-ink-200
                        bg-ink-50/50
                        pl-11
                        pr-11
                        text-sm
                        font-medium
                        text-ink-900
                        outline-none
                        transition
                        placeholder:text-ink-400
                        focus:border-primary-400
                        focus:bg-white
                        focus:ring-4
                        focus:ring-primary-500/10
                      "
                    />

                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');

                          updateUrlParams({
                            search: '',
                            page: 0,
                          });
                        }}
                        aria-label="Clear search"
                        className="
                          absolute
                          right-3
                          top-1/2
                          flex
                          h-8
                          w-8
                          -translate-y-1/2
                          items-center
                          justify-center
                          rounded-lg
                          text-ink-400
                          transition
                          hover:bg-ink-100
                          hover:text-ink-700
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500/30
                        "
                      >
                        <i className="bi bi-x-lg text-xs" />
                      </button>
                    )}
                  </div>

                  {/* SELECTS */}

                  <div className="
                    mt-3
                    grid
                    grid-cols-2
                    gap-2
                    sm:grid-cols-4
                  ">
                    <Select
                      value={currentCategory}
                      onChange={(value) =>
                        handleFilterChange(
                          'category',
                          value
                        )
                      }
                      options={categoryOptions}
                      placeholder="Category"
                      className="w-full"
                      showIcon
                      showDescription={false}
                    />

                    <Select
                      value={currentCondition}
                      onChange={(value) =>
                        handleFilterChange(
                          'condition',
                          value
                        )
                      }
                      options={conditionOptions}
                      placeholder="Condition"
                      className="w-full"
                      showIcon
                      showDescription={false}
                    />

                    <Select
                      value={currentRegion}
                      onChange={(value) =>
                        handleFilterChange(
                          'region',
                          value
                        )
                      }
                      options={SHIPPING_OPTIONS}
                      placeholder="Region"
                      className="w-full"
                      showIcon
                      showDescription={false}
                    />

                    <Select
                      value={currentShipping}
                      onChange={(value) =>
                        handleFilterChange(
                          'shipping',
                          value
                        )
                      }
                      options={shippingOptions}
                      placeholder="Delivery"
                      className="w-full"
                      showIcon={false}
                      showDescription={false}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* =====================================================
          RESULTS HEADER
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-end
          sm:justify-between
        ">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="
                text-xl
                font-black
                tracking-[-0.025em]
                text-ink-950
              ">
                {currentSearch
                  ? `Gifts matching "${currentSearch}"`
                  : 'Recently offered'}
              </h2>

              {!loading && (
                <span className="
                  rounded-full
                  bg-ink-100
                  px-2
                  py-0.5
                  text-[10px]
                  font-black
                  text-ink-500
                ">
                  {total}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-ink-400">
              Things people are ready to pass on.
            </p>
          </div>

          {/* SORT PLACEHOLDER */}

          <div className="
            inline-flex
            items-center
            gap-2
            self-start
            rounded-lg
            border
            border-ink-100
            bg-white
            px-3
            py-2
            text-xs
            font-bold
            text-ink-500
            sm:self-auto
          ">
            <i className="bi bi-clock-history" />
            Newest first
          </div>
        </div>
      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      <AnimatePresence>
        {error && !loading && (
          <motion.section
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8"
          >
            <div className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-ink-100
              bg-white
              p-4
            ">
              <div className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-ink-50
                text-ink-500
              ">
                <i className="bi bi-exclamation-circle" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink-900">
                  We couldn't load the gifts
                </p>

                <p className="mt-0.5 text-xs text-ink-500">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchItems}
                className="
                  rounded-lg
                  bg-ink-950
                  px-3
                  py-2
                  text-xs
                  font-extrabold
                  text-white
                  transition
                  hover:bg-ink-800
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary-500/20
                "
              >
                Retry
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* =====================================================
          ITEMS
      ===================================================== */}

      <section
        aria-label="Community gifts"
        className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8"
      >
        {loading ? (
          <div className="
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            sm:gap-4
            lg:grid-cols-4
          ">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <ItemCardSkeleton key={index} />
              )
            )}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <motion.div
            layout
            className="
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-3
              sm:gap-4
              lg:grid-cols-4
            "
          >
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {!loading &&
        items.length > 0 &&
        totalPages > 1 && (
          <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="
              flex
              items-center
              justify-between
              border-t
              border-ink-100
              pt-5
            ">
              <button
                type="button"
                disabled={!hasPrevious}
                onClick={() =>
                  handlePageChange(
                    currentPage - 1
                  )
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-ink-200
                  bg-white
                  px-4
                  py-2.5
                  text-xs
                  font-extrabold
                  text-ink-600
                  transition
                  hover:bg-ink-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary-500/20
                "
              >
                <i className="bi bi-arrow-left" />
                Previous
              </button>

              <div className="
                text-center
                text-xs
                font-bold
                text-ink-400
              ">
                <span className="text-ink-700">
                  {currentPage + 1}
                </span>
                {' / '}
                {totalPages}
              </div>

              <button
                type="button"
                disabled={!hasNext}
                onClick={() =>
                  handlePageChange(
                    currentPage + 1
                  )
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-ink-200
                  bg-white
                  px-4
                  py-2.5
                  text-xs
                  font-extrabold
                  text-ink-600
                  transition
                  hover:bg-ink-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary-500/20
                "
              >
                Next
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </section>
        )}

      {/* =====================================================
          BOTTOM PHILOSOPHY
      ===================================================== */}

      {!loading && items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <div className="
            overflow-hidden
            rounded-3xl
            border
            border-ink-100
            bg-white
            px-6
            py-10
            text-center
            sm:px-10
          ">
            <div className="
              mx-auto
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-primary-50
              text-primary-600
            ">
              <i className="bi bi-arrow-repeat text-lg" />
            </div>

            <h2 className="
              mt-4
              text-xl
              font-black
              tracking-[-0.025em]
              text-ink-950
              sm:text-2xl
            ">
              One person's unused can be
              another person's useful.
            </h2>

            <p className="
              mx-auto
              mt-2
              max-w-xl
              text-sm
              leading-6
              text-ink-500
            ">
              Have something sitting around that someone
              else could use? Give it another life.
            </p>

            <Link
              to="/create"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-primary-600
                px-5
                py-3
                text-sm
                font-extrabold
                text-white
                transition
                hover:bg-primary-700
                focus:outline-none
                focus:ring-4
                focus:ring-primary-500/20
              "
            >
              <i className="bi bi-gift" />
              Give Something
            </Link>
          </div>
        </section>
      )}
    </main>
  );
};

export default BrowseItemsPage;