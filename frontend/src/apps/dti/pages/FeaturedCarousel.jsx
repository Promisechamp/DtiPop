import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';

import { Link } from 'react-router-dom';

import { SHIPPING_OPTIONS } from '@/utils/constants';

/* =========================================================
   CONFIG
========================================================= */

const AUTOPLAY_MS = 6000;
const RESUME_DELAY_MS = 1400;
const SWIPE_THRESHOLD = 60;

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

const formatLabel = (value, fallback = null) => {
  if (!value) return fallback;

  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getShippingLabel = (region) => {
  if (!region) return null;

  const option = SHIPPING_OPTIONS.find(
    (item) => item.value === region
  );

  return option?.label || formatLabel(region);
};

const pad = (number) =>
  String(number).padStart(2, '0');

/* =========================================================
   SKELETON
========================================================= */

const FeaturedSkeleton = () => {
  return (
    <section
      aria-label="Loading featured item"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="aspect-[4/5] w-full animate-pulse bg-ink-100 sm:aspect-[16/7]" />

        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
          <div className="h-2.5 w-24 rounded bg-ink-100" />

          <div className="mt-4 h-10 w-full max-w-2xl rounded bg-ink-100 sm:h-12" />

          <div className="mt-3 h-3 w-full max-w-xl rounded bg-ink-100" />

          <div className="mt-7 flex items-center justify-between gap-5">
            <div className="h-9 w-32 rounded bg-ink-100" />
            <div className="h-10 w-28 rounded-full bg-ink-100" />
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   EDITORIAL PROGRESS
========================================================= */

const StoryProgress = ({
  count,
  activeIndex,
  duration,
  isPaused,
  onSelect,
}) => {
  if (count <= 1) return null;

  return (
    <div
      className="
        flex gap-1.5
        px-4 pt-3
        sm:px-6 sm:pt-4
        lg:px-8 lg:pt-5
      "
      aria-label="Featured item navigation"
    >
      {Array.from({ length: count }).map((_, index) => {
        const active = index === activeIndex;
        const completed = index < activeIndex;

        return (
          <button
            key={index}
            type="button"
            aria-label={`Go to featured item ${index + 1}`}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(index)}
            className="
              group
              relative
              h-5
              flex-1
              py-2
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary-500
              focus-visible:ring-offset-2
            "
          >
            <span
              className="
                absolute inset-x-0 top-2
                h-[2px]
                overflow-hidden
                rounded-full
                bg-ink-900/10
              "
            >
              {completed && (
                <span className="absolute inset-0 bg-ink-950" />
              )}

              {active && (
                <motion.span
                  key={`${activeIndex}-${isPaused}`}
                  className="absolute inset-y-0 left-0 bg-ink-950"
                  initial={{ width: '0%' }}
                  animate={{
                    width: isPaused ? undefined : '100%',
                  }}
                  transition={
                    isPaused
                      ? { duration: 0 }
                      : {
                          duration: duration / 1000,
                          ease: 'linear',
                        }
                  }
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* =========================================================
   FEATURED CAROUSEL
========================================================= */

const FeaturedCarousel = ({
  items = [],
  loading = false,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageError, setImageError] = useState(false);

  const autoplayRef = useRef(null);
  const resumeRef = useRef(null);

  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const featuredItems = useMemo(
    () => items.filter(Boolean),
    [items]
  );

  const hasMultipleItems =
    featuredItems.length > 1;

  const item = featuredItems[activeIndex];

  const image = getItemImage(item);
  const category = formatLabel(
    item?.category,
    'Item'
  );
  const condition = formatLabel(
    item?.condition
  );
  const shipping = getShippingLabel(
    item?.shipping_region
  );

  /* -------------------------------------------------------
     KEEP INDEX VALID
  ------------------------------------------------------- */

  useEffect(() => {
    if (!featuredItems.length) {
      setActiveIndex(0);
      return;
    }

    if (
      activeIndex >= featuredItems.length
    ) {
      setActiveIndex(0);
    }
  }, [
    activeIndex,
    featuredItems.length,
  ]);

  /* -------------------------------------------------------
     RESET IMAGE STATE
  ------------------------------------------------------- */

  useEffect(() => {
    setImageError(false);
  }, [image]);

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  const goNext = useCallback(() => {
    if (!hasMultipleItems) return;

    setActiveIndex((current) =>
      (current + 1) % featuredItems.length
    );
  }, [
    featuredItems.length,
    hasMultipleItems,
  ]);

  const goPrevious = useCallback(() => {
    if (!hasMultipleItems) return;

    setActiveIndex((current) =>
      (current - 1 + featuredItems.length) %
      featuredItems.length
    );
  }, [
    featuredItems.length,
    hasMultipleItems,
  ]);

  const goTo = useCallback(
    (index) => {
      if (
        index < 0 ||
        index >= featuredItems.length
      ) {
        return;
      }

      setActiveIndex(index);
    },
    [featuredItems.length]
  );

  /* -------------------------------------------------------
     AUTOPLAY
  ------------------------------------------------------- */

  const stopAutoPlay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();

    if (
      !hasMultipleItems ||
      isPaused ||
      prefersReducedMotion
    ) {
      return;
    }

    autoplayRef.current = setInterval(() => {
      setActiveIndex((current) =>
        (current + 1) % featuredItems.length
      );
    }, AUTOPLAY_MS);
  }, [
    featuredItems.length,
    hasMultipleItems,
    isPaused,
    prefersReducedMotion,
    stopAutoPlay,
  ]);

  const pauseAutoPlay = useCallback(() => {
    setIsPaused(true);
    stopAutoPlay();

    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
      resumeRef.current = null;
    }
  }, [stopAutoPlay]);

  const resumeAutoPlay = useCallback(() => {
    if (
      prefersReducedMotion ||
      !hasMultipleItems
    ) {
      return;
    }

    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
    }

    resumeRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeRef.current = null;
    }, RESUME_DELAY_MS);
  }, [
    hasMultipleItems,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    if (
      !hasMultipleItems ||
      isPaused ||
      prefersReducedMotion
    ) {
      stopAutoPlay();
      return undefined;
    }

    startAutoPlay();

    return () => stopAutoPlay();
  }, [
    hasMultipleItems,
    isPaused,
    prefersReducedMotion,
    startAutoPlay,
    stopAutoPlay,
  ]);

  useEffect(() => {
    return () => {
      stopAutoPlay();

      if (resumeRef.current) {
        clearTimeout(resumeRef.current);
      }
    };
  }, [stopAutoPlay]);

  /* -------------------------------------------------------
     KEYBOARD
  ------------------------------------------------------- */

  useEffect(() => {
    if (!hasMultipleItems) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();

        pauseAutoPlay();
        goNext();
        resumeAutoPlay();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();

        pauseAutoPlay();
        goPrevious();
        resumeAutoPlay();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
  }, [
    goNext,
    goPrevious,
    hasMultipleItems,
    pauseAutoPlay,
    resumeAutoPlay,
  ]);

  /* -------------------------------------------------------
     LOADING / EMPTY
  ------------------------------------------------------- */

  if (loading) {
    return <FeaturedSkeleton />;
  }

  if (!featuredItems.length || !item) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured items"
      className="bg-white"
    >
      <div
        className="relative overflow-hidden"
        onMouseEnter={pauseAutoPlay}
        onMouseLeave={resumeAutoPlay}
      >
        {/* -------------------------------------------------
            PROGRESS
        ------------------------------------------------- */}

        <StoryProgress
          count={featuredItems.length}
          activeIndex={activeIndex}
          duration={AUTOPLAY_MS}
          isPaused={isPaused}
          onSelect={(index) => {
            pauseAutoPlay();
            goTo(index);
            resumeAutoPlay();
          }}
        />

        {/* -------------------------------------------------
            SLIDE
        ------------------------------------------------- */}

        <AnimatePresence
          mode="wait"
          initial={false}
        >
          <motion.article
            key={item.id}
            aria-label={
              item.title || 'Featured item'
            }
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    x: 20,
                  }
            }
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    x: -20,
                  }
            }
            transition={{
              duration: prefersReducedMotion
                ? 0.15
                : 0.42,
              ease: [0.22, 1, 0.36, 1],
            }}
            drag={
              hasMultipleItems &&
              !prefersReducedMotion
                ? 'x'
                : false
            }
            dragConstraints={{
              left: 0,
              right: 0,
            }}
            dragElastic={0.1}
            onDragStart={pauseAutoPlay}
            onDragEnd={(_, info) => {
              if (
                info.offset.x <
                -SWIPE_THRESHOLD
              ) {
                goNext();
              } else if (
                info.offset.x >
                SWIPE_THRESHOLD
              ) {
                goPrevious();
              }

              resumeAutoPlay();
            }}
          >
            {/* =================================================
                IMAGE
            ================================================= */}

            <div
              className="
                relative
                mx-auto
                w-full
                max-w-[1440px]
                overflow-hidden
                bg-ink-100
                aspect-[4/5]
                sm:aspect-[16/7]
              "
            >
              {!imageError && image ? (
                <motion.img
                  key={image}
                  src={image}
                  alt={
                    item.title ||
                    'Featured item'
                  }
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                  "
                  initial={
                    prefersReducedMotion
                      ? { scale: 1 }
                      : { scale: 1.045 }
                  }
                  animate={{
                    scale: 1,
                  }}
                  transition={{
                    duration: 1.35,
                    ease: [
                      0.16,
                      1,
                      0.3,
                      1,
                    ],
                  }}
                  onError={() =>
                    setImageError(true)
                  }
                />
              ) : (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-ink-100
                  "
                >
                  <div
                    className="
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-ink-300
                    "
                  >
                    <i className="bi bi-image text-2xl" />
                  </div>
                </div>
              )}

              {/* -------------------------------------------------
                  EDITORIAL INDEX
              ------------------------------------------------- */}

              {hasMultipleItems && (
                <div
                  className="
                    pointer-events-none
                    absolute
                    left-5
                    top-5
                    text-white
                    sm:left-6
                    sm:top-6
                  "
                >
                  <div className="flex items-baseline">
                    <span
                      className="
                        text-2xl
                        font-black
                        leading-none
                        tracking-[-0.04em]
                        [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]
                        sm:text-3xl
                      "
                    >
                      {pad(activeIndex + 1)}
                    </span>

                    <span
                      className="
                        ml-1
                        text-xs
                        font-bold
                        opacity-70
                        [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]
                      "
                    >
                      /{pad(featuredItems.length)}
                    </span>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------
                  CATEGORY BLOCK
              ------------------------------------------------- */}

              <div
                className="
                  absolute
                  bottom-0
                  right-0
                "
              >
                <span
                  className="
                    inline-block
                    bg-white
                    px-4
                    py-2.5
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.18em]
                    text-ink-500
                    sm:px-5
                    sm:py-3
																				rounded-tl-md
																				
                  "
                >
                  {category}
                </span>
              </div>
            </div>

            {/* =================================================
                CONTENT
            ================================================= */}

            <div
              className="
                mx-auto
                max-w-6xl
                px-5
                pb-8
                pt-7
                sm:px-8
                sm:pb-10
                sm:pt-8
              "
            >
              <div
                className="
                  grid
                  gap-7
                  lg:grid-cols-[minmax(0,1fr)_auto]
                  lg:items-end
                  lg:gap-16
                "
              >
                {/* -------------------------------------------------
                    MAIN
                ------------------------------------------------- */}

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="
                        h-px
                        w-8
                        bg-ink-500
                      "
                    />

                    <p
                      className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.24em]
                        text-ink-400
                      "
                    >
                      Featured today
                    </p>
                  </div>

                  <h2
                    className="
                      mt-3
                      max-w-4xl
                      font-serif
                      text-[2.3rem]
                      font-bold
                      leading-[0.98]
                      tracking-[-0.035em]
                      text-ink-950
                      sm:text-[2.8rem]
                      lg:text-[3.55rem]
                      xl:text-[4rem]
                    "
                  >
                    {item.title}
                  </h2>

                  {item.description && (
                    <p
                      className="
                        mt-4
                        max-w-2xl
                        line-clamp-2
                        text-[15px]
                        leading-6
                        text-ink-500
                        sm:text-base
                      "
                    >
                      {item.description}
                    </p>
                  )}

                  {/* -------------------------------------------------
                      METADATA
                  ------------------------------------------------- */}

                  {(condition ||
                    shipping ||
                    item.donor_pays_shipping) && (
                    <div
                      className="
                        mt-6
                        flex
                        flex-wrap
                        items-center
                        gap-x-5
                        gap-y-2.5
                        border-y
                        border-ink-100
                        py-3.5
                      "
                    >
                      {condition && (
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            text-xs
                            font-bold
                            text-ink-600
                          "
                        >
                          <i className="bi bi-patch-check text-ink-950" />
                          {condition}
                        </span>
                      )}

                      {shipping && (
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            text-xs
                            font-bold
                            text-ink-600
                          "
                        >
                          <i className="bi bi-truck text-ink-950" />
                          {shipping}
                        </span>
                      )}

                      {item.donor_pays_shipping && (
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            text-xs
                            font-black
                            text-primary-600
                          "
                        >
                          <i className="bi bi-gift" />
                          Free shipping
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* -------------------------------------------------
                    SIDE ACTION
                ------------------------------------------------- */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-5
                    lg:min-w-[190px]
                    lg:flex-col
                    lg:items-end
                    lg:justify-end
                  "
                >
                  {item.donor ? (
                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2.5
                      "
                    >
                      {item.donor.avatar_url ? (
                        <img
                          src={
                            item.donor.avatar_url
                          }
                          alt=""
                          className="
                            h-8
                            w-8
                            shrink-0
                            rounded-full
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-ink-100
                            text-ink-400
                          "
                        >
                          <i className="bi bi-person text-xs" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p
                          className="
                            max-w-[150px]
                            truncate
                            text-xs
                            font-bold
                            text-ink-700
                          "
                        >
                          {item.donor.full_name ||
                            'Anonymous donor'}
                        </p>

                        {item.donor.rating != null && (
                          <p
                            className="
                              mt-0.5
                              text-[11px]
                              text-ink-400
                            "
                          >
                            <i className="bi bi-star-fill mr-1 text-amber-400" />
                            {Number(
                              item.donor.rating
                            ).toFixed(1)}
                            <span className="ml-1">
                              rating
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span />
                  )}

                  <Link
                    to={`/item/${item.id}`}
                    aria-label={`View ${item.title || 'featured item'}`}
                    className="
                      group
                      inline-flex
                      shrink-0
                      items-center
                      gap-3
                      border-b-2
                      border-primary-100
                      pb-1.5
                      text-sm
                      font-black
                      text-primary-500
                      transition-all
                      duration-300
                      hover:gap-4
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-primary-500
                      focus-visible:ring-offset-4
                      active:scale-[0.98]
                    "
                  >
                    <span>View item </span>

                    <span
                      className="
                        flex
                        h-6
                        w-6
                        items-center
                        justify-center
                        rounded-full
                        bg-primary-500
                        text-white
                        transition-transform
                        duration-300
                        group-hover:translate-x-0.5
                      "
                    >
                      <i className="bi bi-arrow-up-right text-[9px]" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeaturedCarousel;