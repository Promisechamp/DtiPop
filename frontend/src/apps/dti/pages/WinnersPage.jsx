// pages/WinnersPage.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  HeartHandshake,
  Image as ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { winnersAPI } from "@/services/api/dtiApi";
import { getCategoryByValue } from "@/utils/constants";
import { renderIcon } from "@/utils/constantHelpers";
import { useAuth } from "@/context/AuthContext";

import Modal from "@/reusables/Modal";


import ApplicantProfileCard from "../components/common/ApplicantProfileCardModal";

/* ================================================================
   HELPERS
================================================================ */

const cn = (...classes) => classes.filter(Boolean).join(" ");

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateRange = (range) => {
  const today = new Date();

  let startDate;
  let endDate;

  if (range === "week") {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    startDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    endDate = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
  }

  return {
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  };
};

const getItemImage = (item) => {
  if (!item) return "";

  const images = item.images;

  if (Array.isArray(images) && images.length > 0) {
    const firstImage = images[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    return (
      firstImage?.url ||
      firstImage?.image_url ||
      firstImage?.src ||
      firstImage?.publicUrl ||
      ""
    );
  }

  if (typeof images === "string") {
    return images;
  }

  if (images && typeof images === "object") {
    return (
      images.url ||
      images.image_url ||
      images.src ||
      ""
    );
  }

  return (
    item.image_url ||
    item.image ||
    item.thumbnail_url ||
    item.thumbnail ||
    ""
  );
};

const getPersonName = (person) => {
  if (!person) return "Community member";

  return (
    person.full_name ||
    person.fullName ||
    person.name ||
    person.username ||
    "Community member"
  );
};

const getPersonAvatar = (person) => {
  if (!person) return "";

  return (
    person.avatar_url ||
    person.avatar ||
    person.profile_image ||
    person.profile_picture ||
    person.photo_url ||
    ""
  );
};

const getPersonId = (person) => {
  if (!person) return null;

  return (
    person.id ||
    person.user_id ||
    person.userId ||
    null
  );
};

const getInitials = (name) => {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getCategory = (item) => {
  const rawCategory = item?.category;

  if (!rawCategory) {
    return {
      name: "Community gift",
      icon: null,
    };
  }

  if (typeof rawCategory === "object") {
    return {
      name:
        rawCategory.name ||
        rawCategory.label ||
        rawCategory.value ||
        "Community gift",
      icon: rawCategory.icon || null,
    };
  }

  const category = getCategoryByValue(rawCategory);

  return {
    name:
      category?.label ||
      category?.name ||
      category?.title ||
      String(rawCategory).replace(/[_-]/g, " "),
    icon: category?.icon || null,
  };
};

const getDonor = (winner) => {
  return (
    winner?.item?.donor ||
    winner?.donor ||
    winner?.item?.giver ||
    winner?.giver ||
    null
  );
};

const getWinnerStory = (winner) => {
  return (
    winner?.story ||
    winner?.thank_you_message ||
    winner?.message ||
    winner?.description ||
    ""
  );
};

/* ================================================================
   AVATAR
================================================================ */

function WinnerAvatar({
  person,
  size = "md",
  onClick,
  className,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const name = getPersonName(person);
  const avatar = getPersonAvatar(person);

  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const avatarContent = (
    <>
      {avatar && !imageFailed ? (
        <img
          src={avatar}
          alt={name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-primary-100 font-extrabold text-primary-700"
          aria-hidden="true"
        >
          {getInitials(name)}
        </span>
      )}
    </>
  );

  const sharedClassName = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary-50 shadow-soft",
    sizes[size] || sizes.md,
    className
  );

  if (onClick && getPersonId(person)) {
    return (
      <button
        type="button"
        onClick={() => onClick(getPersonId(person))}
        aria-label={`View ${name}'s profile`}
        title={`View ${name}'s profile`}
        className={cn(
          sharedClassName,
          "cursor-pointer transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        )}
      >
        {avatarContent}
      </button>
    );
  }

  return (
    <span
      className={sharedClassName}
      title={name}
      aria-label={name}
    >
      {avatarContent}
    </span>
  );
}

/* ================================================================
   ITEM IMAGE
================================================================ */

function WinnerItemImage({
  item,
  className,
  imageClassName,
  showPlaceholder = true,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const image = getItemImage(item);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  if (!image || imageFailed) {
    if (!showPlaceholder) return null;

    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden bg-primary-50 text-primary-600",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-soft">
            <Gift size={30} strokeWidth={1.6} />
          </span>

          <span className="text-xs font-bold uppercase tracking-[0.16em]">
            A gift with a story
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <img
        src={image}
        alt={item?.title || "Gift item"}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={cn(
          "h-full w-full object-cover",
          imageClassName
        )}
      />
    </div>
  );
}

/* ================================================================
   SMALL LABEL
================================================================ */

function Eyebrow({
  children,
  icon: Icon,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-primary-600",
        className
      )}
    >
      {Icon && <Icon size={14} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/* ================================================================
   WEEK / MONTH SELECTOR
================================================================ */

function RangeSelector({
  value,
  onChange,
  disabled = false,
}) {
  const options = [
    {
      label: "This week",
      value: "week",
    },
    {
      label: "This month",
      value: "month",
    },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 p-1"
      role="group"
      aria-label="Filter winners by date"
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-4 py-2.5 text-xs font-extrabold transition duration-200 sm:px-5 sm:text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              active
                ? "bg-primary-600 text-white shadow-primary"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================
   PERSON ROW
================================================================ */

function WinnerPersonRow({
  person,
  label,
  onUserClick,
  compact = false,
}) {
  if (!person) return null;

  const name = getPersonName(person);
  const personId = getPersonId(person);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <WinnerAvatar
        person={person}
        size={compact ? "sm" : "md"}
        onClick={onUserClick}
      />

      <div className="min-w-0">
        {label && (
          <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-600">
            {label}
          </p>
        )}

        {personId ? (
          <button
            type="button"
            onClick={() => onUserClick?.(personId)}
            className="block max-w-full truncate text-left text-sm font-extrabold text-ink-900 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {name}
          </button>
        ) : (
          <p className="truncate text-sm font-extrabold text-ink-900">
            {name}
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   FEATURED WINNER
================================================================ */

function FeaturedWinner({
  winner,
  onUserClick,
}) {
  if (!winner) return null;

  const item = winner.item || {};
  const recipient = winner.winner || winner.recipient || null;
  const donor = getDonor(winner);
  const category = getCategory(item);
  const story = getWinnerStory(winner);

  const itemId = item.id;

  const categoryIcon = category.icon
    ? renderIcon(category.icon)
    : <Package size={15} />;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white shadow-card"
    >
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        {/* Featured image */}
        <div className="relative min-h-[300px] overflow-hidden bg-primary-50 sm:min-h-[420px] lg:min-h-[540px]">
          <WinnerItemImage
            item={item}
            className="absolute inset-0 h-full w-full"
            imageClassName="transition duration-700 hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/5" />

          <div className="absolute left-5 top-5 flex flex-wrap gap-2 sm:left-7 sm:top-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg">
              <Check size={14} strokeWidth={3} />
              Successfully rehomed
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
              <Sparkles size={14} />
              Featured story
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white/80">
              A gift, a fresh start
            </p>

            <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {item.title || "A wonderful gift finds a new home"}
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
              {categoryIcon}
              <span className="capitalize">{category.name}</span>
            </div>
          </div>
        </div>

        {/* Featured story */}
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
          <Eyebrow icon={HeartHandshake}>
            Good things happen here
          </Eyebrow>

          <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-3xl">
            One community.
            <br />
            A thousand ways to care.
          </h3>

          <p className="mt-4 max-w-lg text-sm leading-7 text-ink-600 sm:text-base">
            A gift that was waiting for the right person has found its
            new home. That is the beauty of sharing: something you no
            longer need can mean everything to somebody else.
          </p>

          <div className="mt-7 space-y-4 rounded-2xl border border-ink-200 bg-ink-50 p-4 sm:p-5">
            {recipient && (
              <WinnerPersonRow
                person={recipient}
                label="Meet the recipient"
                onUserClick={onUserClick}
              />
            )}

            {donor && (
              <>
                <div className="h-px bg-ink-200" />

                <WinnerPersonRow
                  person={donor}
                  label="Shared with love by"
                  onUserClick={onUserClick}
                />
              </>
            )}
          </div>

          {story && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-primary-600">
                <Heart size={15} fill="currentColor" />
                <span className="text-xs font-extrabold uppercase tracking-[0.15em]">
                  A little gratitude
                </span>
              </div>

              <p className="line-clamp-4 text-sm italic leading-7 text-ink-600">
                “{story}”
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {itemId ? (
              <Link
                to={`/item/${itemId}`}
                className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
              >
                View gift story
                <ArrowUpRight size={17} />
              </Link>
            ) : (
              <Link
                to="/browse"
                className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
              >
                Explore gifts
                <ArrowUpRight size={17} />
              </Link>
            )}

            <span className="inline-flex items-center gap-2 text-xs font-bold text-ink-600">
              <Heart size={14} className="text-primary-600" />
              Made possible by community
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ================================================================
   GIFT CARD
================================================================ */

function WinnerCard({
  winner,
  index,
  onUserClick,
}) {
  const item = winner?.item || {};
  const recipient = winner?.winner || winner?.recipient || null;
  const donor = getDonor(winner);
  const category = getCategory(item);

  const itemId = item.id;
  const story = getWinnerStory(winner);

  const categoryIcon = category.icon
    ? renderIcon(category.icon)
    : <Package size={14} />;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.035, 0.2),
      }}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      {/* Card image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-50">
        <WinnerItemImage
          item={item}
          className="absolute inset-0 h-full w-full"
          imageClassName="transition duration-500 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-700 shadow-soft backdrop-blur-sm">
            <Check size={12} strokeWidth={3} />
            Rehomed
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            {categoryIcon}
            <span className="truncate capitalize">
              {category.name}
            </span>
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {recipient && (
          <div className="flex min-w-0 items-center gap-2.5">
            <WinnerAvatar
              person={recipient}
              size="sm"
              onClick={onUserClick}
            />

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-600">
                Found a new home with
              </p>

              <p className="mt-0.5 truncate text-sm font-extrabold text-ink-900">
                {getPersonName(recipient)}
              </p>
            </div>
          </div>
        )}

        <h3 className="mt-4 line-clamp-2 text-lg font-extrabold leading-snug text-ink-900 transition group-hover:text-primary-600">
          {item.title || "A gift shared with love"}
        </h3>

        {story && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-600">
            {story}
          </p>
        )}

        {donor && (
          <div className="mt-4 flex min-w-0 items-center gap-2 border-t border-ink-200 pt-4">
            <WinnerAvatar
              person={donor}
              size="sm"
              onClick={onUserClick}
            />

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-600">
                Generously shared by
              </p>

              <p className="truncate text-xs font-extrabold text-ink-900">
                {getPersonName(donor)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-5">
          {itemId ? (
            <Link
              to={`/item/${itemId}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-extrabold text-ink-900 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              View gift
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <Link
              to="/browse"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-extrabold text-ink-900 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              Explore gifts
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ================================================================
   SHOW ALL WINNERS CARD
================================================================ */

function ShowAllWinnersCard({
  count,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full min-h-[390px] w-full flex-col items-center justify-center",
        "rounded-3xl border-2 border-dashed border-primary-200 bg-primary-50 p-6 text-center",
        "transition duration-300 hover:border-primary-400 hover:shadow-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      )}
    >
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary-600 shadow-soft transition duration-300 group-hover:scale-110">
        <Users size={28} strokeWidth={1.8} />
      </span>

      <span className="text-xl font-extrabold text-ink-900">
        There's more!
      </span>

      <span className="mt-2 max-w-[230px] text-sm leading-6 text-ink-600">
        More gifts, more smiles, and more stories from people in our
        community.
      </span>

      <span className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-primary transition group-hover:gap-3">
        Show all winners
        <ArrowRight size={17} />
      </span>

      <span className="mt-3 text-xs font-bold text-ink-600">
        {count} community stories
      </span>
    </button>
  );
}

/* ================================================================
   WINNERS CAROUSEL
================================================================ */

function WinnersCarousel({
  winners,
  onUserClick,
}) {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef(null);

  const scroll = useCallback((direction) => {
    const container = scrollRef.current;

    if (!container) return;

    const firstCard = container.querySelector(
      "[data-winner-carousel-card]"
    );

    const cardWidth = firstCard
      ? firstCard.getBoundingClientRect().width
      : container.clientWidth * 0.8;

    const styles = window.getComputedStyle(container);
    const gap = parseFloat(styles.columnGap || styles.gap || "20") || 20;

    container.scrollBy({
      left:
        direction === "right"
          ? cardWidth + gap
          : -(cardWidth + gap),
      behavior: "smooth",
    });
  }, []);

  const collapseGallery = () => {
    setShowAll(false);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    });
  };

  if (!winners?.length) return null;

  return (
    <section className="w-full">
      {/* Section heading */}
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div className="min-w-0">
          <Eyebrow icon={Sparkles}>
            Community stories
          </Eyebrow>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
            More gifts, more smiles.
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600 sm:text-base">
            Every gift has a story. Discover the people making a
            difference by sharing what they have.
          </p>
        </div>

        {/* Desktop controls */}
        {!showAll && winners.length > 1 && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Previous winners"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-soft transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronLeft size={21} />
            </button>

            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Next winners"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-soft transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronRight size={21} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showAll ? (
          <motion.div
            key="expanded-gallery"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {winners.map((winner, index) => (
                <div
                  key={
                    winner.id ||
                    winner.item?.id ||
                    `expanded-winner-${index}`
                  }
                  className="min-w-0"
                >
                  <WinnerCard
                    winner={winner}
                    index={index}
                    onUserClick={onUserClick}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={collapseGallery}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3 text-sm font-extrabold text-ink-700 shadow-soft transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <ChevronDown
                  size={18}
                  className="rotate-180"
                />
                Show less
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="horizontal-gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={scrollRef}
              className={cn(
                "flex items-stretch gap-4 overflow-x-auto pb-5 sm:gap-5",
                "snap-x snap-mandatory overscroll-x-contain",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              )}
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              {winners.map((winner, index) => (
                <div
                  key={
                    winner.id ||
                    winner.item?.id ||
                    `carousel-winner-${index}`
                  }
                  data-winner-carousel-card
                  className={cn(
                    "w-[82%] shrink-0 snap-start",
                    "sm:w-[46%]",
                    "lg:w-[31%]",
                    "xl:w-[23%]"
                  )}
                >
                  <WinnerCard
                    winner={winner}
                    index={index}
                    onUserClick={onUserClick}
                  />
                </div>
              ))}

              {/* Appears after the fifth card when there are more than five */}
              {winners.length > 5 && (
                <div className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23%]">
                  <ShowAllWinnersCard
                    count={winners.length}
                    onClick={() => setShowAll(true)}
                  />
                </div>
              )}
            </div>

            {/* Mobile swipe hint */}
            {winners.length > 1 && (
              <div className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-ink-600 sm:hidden">
                <ArrowLeft size={15} />
                Swipe to discover more
                <ArrowRight size={15} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================================================================
   LOADING SKELETON
================================================================ */

function WinnerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-ink-100" />

      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-ink-100" />

          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-32 animate-pulse rounded bg-ink-100" />
          </div>
        </div>

        <div className="h-5 w-4/5 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />

        <div className="h-11 animate-pulse rounded-full bg-ink-100" />
      </div>
    </div>
  );
}

function WinnersLoading() {
  return (
    <div className="space-y-10">
      {/* Featured skeleton */}
      <div className="grid overflow-hidden rounded-[2rem] border border-ink-200 bg-white lg:grid-cols-2">
        <div className="min-h-[320px] animate-pulse bg-ink-100 sm:min-h-[430px]" />

        <div className="space-y-5 p-6 sm:p-10">
          <div className="h-4 w-36 animate-pulse rounded bg-ink-100" />
          <div className="h-8 w-4/5 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-ink-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-ink-100" />
          <div className="h-12 w-40 animate-pulse rounded-full bg-ink-100" />
        </div>
      </div>

      {/* Gallery skeleton */}
      <div>
        <div className="mb-6 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
          <div className="h-8 w-64 animate-pulse rounded bg-ink-100" />
        </div>

        <div className="flex gap-5 overflow-hidden">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="w-[82%] shrink-0 sm:w-[46%] lg:w-[31%] xl:w-[23%]"
            >
              <WinnerCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   EMPTY STATE
================================================================ */

function WinnersEmptyState({ range, onRefresh }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-ink-200 bg-white px-6 py-14 text-center shadow-card sm:px-12 sm:py-20"
    >
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Gift size={34} strokeWidth={1.6} />
      </span>

      <Eyebrow className="mt-6 justify-center">
        Good things are coming
      </Eyebrow>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        Every great story starts somewhere.
      </h2>

      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink-600 sm:text-base">
        There are no winners to feature for{" "}
        {range === "week" ? "this week" : "this month"} just yet.
        Check back soon to see the wonderful things happening in our
        community.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold"
        >
          <RefreshCw size={16} />
          Refresh stories
        </button>

        <Link
          to="/browse"
          className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
        >
          Explore available gifts
          <ArrowRight size={17} />
        </Link>
      </div>
    </motion.div>
  );
}

/* ================================================================
   ERROR STATE
================================================================ */

function WinnersErrorState({ onRetry }) {
  return (
    <div className="rounded-[2rem] border border-ink-200 bg-white px-6 py-14 text-center shadow-card sm:px-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <RefreshCw size={28} />
      </span>

      <h2 className="mt-5 text-2xl font-extrabold text-ink-900">
        We couldn't load the stories.
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-600">
        Something interrupted our connection. Please try again in a
        moment.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="btn-primary mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

/* ================================================================
   COMMUNITY MESSAGE
================================================================ */

function CommunityMessage() {
  const messages = [
    {
      icon: Gift,
      title: "Give what you can",
      description:
        "Something you no longer need could mean everything to someone else.",
    },
    {
      icon: HeartHandshake,
      title: "Receive with gratitude",
      description:
        "Find useful items shared by people who care about their community.",
    },
    {
      icon: Users,
      title: "Make a difference",
      description:
        "Every successful handoff is another reason to believe in people.",
    },
  ];

  return (
    <section className="border-y border-ink-200 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <Eyebrow icon={Heart}>
          What makes this special
        </Eyebrow>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Little things can mean a lot.
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base">
          A stronger community starts when we share what we have,
          appreciate what we receive, and make room for someone else.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {messages.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-3xl border border-ink-200 bg-white p-6 transition hover:shadow-soft sm:p-7"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Icon size={23} strokeWidth={1.8} />
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-ink-900">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-ink-600">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================
   BOTTOM CALL TO ACTION
================================================================ */

function WinnersCTA() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-primary-200 bg-primary-50 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[24px] border-primary-100/70 opacity-[0.5]" />

      <div className="pointer-events-none absolute -bottom-16 right-1/4 h-36 w-36 rounded-full bg-primary-100/60" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
        <div className="max-w-2xl">
          <Eyebrow icon={Heart}>
            Your turn to make a difference
          </Eyebrow>

          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Your next gift could be someone's big moment.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-600 sm:text-base">
            Have something useful to share? Or looking for something
            that could make life a little easier? Your next meaningful
            connection could start right here.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/create"
              className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
            >
              <Gift size={17} />
              Give an item
              <ArrowRight size={17} />
            </Link>

            <Link
              to="/browse"
              className="btn-secondary border-2 border-dotted border-ink-200 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
            >
              Find a gift
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-primary-200 bg-white shadow-card">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <HeartHandshake size={66} strokeWidth={1.3} />
            </div>

            <span className="absolute right-1 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-primary">
              <Sparkles size={20} />
            </span>

            <span className="absolute bottom-2 left-0 flex h-10 w-10 items-center justify-center rounded-full border border-primary-200 bg-white text-primary-600 shadow-soft">
              <Heart size={18} fill="currentColor" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   MAIN PAGE
================================================================ */

export default function WinnersPage() {
  const navigate = useNavigate();

  const auth = useAuth();

  const user = auth?.user || auth?.profile || null;

  const [range, setRange] = useState("week");
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [profileModal, setProfileModal] = useState({
    open: false,
    userId: null,
  });

  /* --------------------------------------------------------------
     FETCH WINNERS
  -------------------------------------------------------------- */

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const { startDate, endDate } = getDateRange(range);

      const response = await winnersAPI.getByDateRange(
        startDate,
        endDate
      );

      const result = response?.data?.winners;

      setWinners(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to fetch winners:", err);

      setWinners([]);
      setError(true);

      toast.error("Unable to load community stories.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  /* --------------------------------------------------------------
     USER PROFILE HANDLER
  -------------------------------------------------------------- */

  const handleUserClick = useCallback(
    (userId) => {
      if (!userId) return;

      const role =
        user?.role ||
        user?.user_metadata?.role ||
        user?.app_metadata?.role ||
        "";

      if (role === "admin" || role === "super_admin") {
        navigate(`/admin/users-profile/${userId}`);
        return;
      }

      setProfileModal({
        open: true,
        userId,
      });
    },
    [navigate, user]
  );

  const closeProfileModal = useCallback(() => {
    setProfileModal({
      open: false,
      userId: null,
    });
  }, []);

  /* --------------------------------------------------------------
     DERIVED DATA
  -------------------------------------------------------------- */

  const featuredWinner = useMemo(
    () => winners[0] || null,
    [winners]
  );

  const otherWinners = useMemo(
    () => winners.slice(1),
    [winners]
  );

  const rangeLabel = range === "week" ? "this week" : "this month";

  /* --------------------------------------------------------------
     RENDER
  -------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-transparent text-ink-900">

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-10">
        {/* ======================================================
            PUBLIC BILLBOARD HERO
        ====================================================== */}

        <section className="relative mb-10 overflow-hidden bg-transparent py-9  sm:mb-14 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-primary-50 opacity-[0.5]" />

          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-primary-50/70" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div className="max-w-3xl">

              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-7xl">
                Good things
                <br />

                <span className="text-primary-600">
                  find new homes.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base sm:leading-8 lg:text-lg">
                Every item shared is a chance to make someone's day.
                Meet the people receiving thoughtful gifts and the
                generous community members making it all happen.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/create"
                  className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
                >
                  <Gift size={17} />
                  Share a gift
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/browse"
                  className="btn-secondary border-2 border-dotted border-ink-200 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold"
                >
                  Browse available items
                  <ArrowUpRight size={17} />
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-bold text-ink-600 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <Heart size={15} className="text-primary-600" />
                  Given with love
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-ink-300 sm:block" />

                <span className="inline-flex items-center gap-2">
                  <HeartHandshake
                    size={16}
                    className="text-primary-600"
                  />
                  Received with gratitude
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-ink-300 sm:block" />

                <span className="inline-flex items-center gap-2">
                  <Users size={15} className="text-primary-600" />
                  Shared with community
                </span>
              </div>
            </div>

            {/* Hero decorative artwork */}
            <div className="relative mx-auto hidden h-64 w-64 items-center justify-center lg:flex xl:h-72 xl:w-72">
              <div className="absolute inset-0 rounded-full border border-primary-200" />

              <div className="absolute inset-5 rounded-full border border-dashed border-primary-300" />

              <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-primary-50 text-primary-600 xl:h-48 xl:w-48">
                <Gift
                  size={94}
                  strokeWidth={1.25}
                />
              </div>

              <motion.span
                animate={{ y: [0, -7, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-1 top-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-white text-primary-600 shadow-card"
              >
                <Heart size={25} fill="currentColor" />
              </motion.span>

              <motion.span
                animate={{ y: [0, 7, 0] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-7 left-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-white text-primary-600 shadow-card"
              >
                <Sparkles size={25} />
              </motion.span>

              <span className="absolute bottom-2 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-primary">
                <Check size={22} strokeWidth={3} />
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================
            FEATURED WINNER SECTION
        ====================================================== */}

        <section className="mb-12 sm:mb-16">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow icon={Award}>
                The latest good news
              </Eyebrow>

              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
                A moment worth celebrating.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600 sm:text-base">
                Real gifts. Real people. A little reminder of what
                happens when we help each other.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-ink-600">
                <CalendarDays size={15} />
                Showing {rangeLabel}
              </span>

              <RangeSelector
                value={range}
                onChange={setRange}
                disabled={loading}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WinnersLoading />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WinnersErrorState onRetry={fetchWinners} />
              </motion.div>
            ) : winners.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WinnersEmptyState
                  range={range}
                  onRefresh={fetchWinners}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`winner-content-${range}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="space-y-12 sm:space-y-16"
              >
                {/* Featured winner */}
                <FeaturedWinner
                  winner={featuredWinner}
                  onUserClick={handleUserClick}
                />

                {/* Horizontal winners carousel */}
                {otherWinners.length > 0 && (
                  <WinnersCarousel
                    winners={otherWinners}
                    onUserClick={handleUserClick}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ======================================================
            COMMUNITY MESSAGE
        ====================================================== */}

        <div className="mb-12 sm:mb-16">
          <CommunityMessage />
        </div>

        {/* ======================================================
            PARTICIPATION CTA
        ====================================================== */}

        <WinnersCTA />
      </main>

      {/* ========================================================
          PUBLIC USER PROFILE MODAL
      ======================================================== */}

      <Modal
        isOpen={profileModal.open}
        onClose={closeProfileModal}
      >
        {profileModal.userId && (
          <ApplicantProfileCard
            userId={profileModal.userId}
          />
        )}
      </Modal>
    </div>
  );
}