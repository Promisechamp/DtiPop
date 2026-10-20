import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  Check,
  LoaderCircle,
  MoreVertical,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------

const cn = (...classes) => classes.filter(Boolean).join(" ");

const VIEWPORT_PADDING = 12;
const MENU_GAP = 10;
const POSITION_EPSILON = 1;

const VALID_PLACEMENTS = [
  "auto",
  "top",
  "bottom",
  "left",
  "right",
  "center",
];

const VALID_ALIGNMENTS = [
  "start",
  "center",
  "end",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const getViewportSize = () => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
});

const getViewportOffset = () => ({
  left: window.visualViewport?.offsetLeft ?? 0,
  top: window.visualViewport?.offsetTop ?? 0,
});

// ---------------------------------------------------------
// Alignment normalization
// ---------------------------------------------------------

const normalizeAlign = (align) => {
  if (VALID_ALIGNMENTS.includes(align)) {
    return align;
  }

  return "bottom-right";
};

const getOppositePlacement = (placement) => {
  const opposites = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };

  return opposites[placement] ?? placement;
};

const getPlacementOrder = (preferredPlacement) => {
  if (
    preferredPlacement &&
    preferredPlacement !== "auto" &&
    preferredPlacement !== "center"
  ) {
    return [
      preferredPlacement,
      getOppositePlacement(preferredPlacement),
      "bottom",
      "top",
      "right",
      "left",
    ].filter((placement, index, list) => {
      return (
        VALID_PLACEMENTS.includes(placement) &&
        placement !== "auto" &&
        list.indexOf(placement) === index
      );
    });
  }

  return ["bottom", "top", "right", "left"];
};

const getAvailableSpace = (placement, rect, viewport) => {
  switch (placement) {
    case "top":
      return rect.top - viewport.top - VIEWPORT_PADDING;

    case "bottom":
      return (
        viewport.top +
        viewport.height -
        rect.bottom -
        VIEWPORT_PADDING
      );

    case "left":
      return rect.left - viewport.left - VIEWPORT_PADDING;

    case "right":
      return (
        viewport.left +
        viewport.width -
        rect.right -
        VIEWPORT_PADDING
      );

    default:
      return 0;
  }
};

const getMotionOffset = (placement) => {
  switch (placement) {
    case "top":
      return { x: 0, y: 7 };

    case "left":
      return { x: 7, y: 0 };

    case "right":
      return { x: -7, y: 0 };

    case "center":
      return { x: 0, y: 5 };

    case "bottom":
    default:
      return { x: 0, y: -7 };
  }
};

// ---------------------------------------------------------
// Corner alignment helpers
// ---------------------------------------------------------

const CORNER_ALIGNMENTS = {
  "top-left": {
    vertical: "top",
    horizontal: "left",
  },

  "top-right": {
    vertical: "top",
    horizontal: "right",
  },

  "bottom-left": {
    vertical: "bottom",
    horizontal: "left",
  },

  "bottom-right": {
    vertical: "bottom",
    horizontal: "right",
  },
};

const getCornerAlignment = (align) =>
  CORNER_ALIGNMENTS[align] ?? null;

// ---------------------------------------------------------
// Positioning
// ---------------------------------------------------------

function calculateMenuPosition({
  triggerRect,
  menuRect,
  preferredPlacement,
  align,
}) {
  const viewportSize = getViewportSize();
  const viewportOffset = getViewportOffset();

  const viewport = {
    left: viewportOffset.left,
    top: viewportOffset.top,
    width: viewportSize.width,
    height: viewportSize.height,
  };

  const availableWidth = Math.max(
    120,
    viewport.width - VIEWPORT_PADDING * 2
  );

  const availableHeight = Math.max(
    120,
    viewport.height - VIEWPORT_PADDING * 2
  );

  const menuWidth = Math.min(
    menuRect.width || 208,
    availableWidth
  );

  const menuHeight = Math.min(
    menuRect.height || 240,
    availableHeight
  );

  const cornerAlignment = getCornerAlignment(align);

  // -------------------------------------------------------
  // Center placement
  // -------------------------------------------------------

  if (preferredPlacement === "center") {
    return {
      placement: "center",

      top: clamp(
        triggerRect.top +
          triggerRect.height / 2 -
          menuHeight / 2,
        viewport.top + VIEWPORT_PADDING,
        viewport.top +
          viewport.height -
          menuHeight -
          VIEWPORT_PADDING
      ),

      left: clamp(
        triggerRect.left +
          triggerRect.width / 2 -
          menuWidth / 2,
        viewport.left + VIEWPORT_PADDING,
        viewport.left +
          viewport.width -
          menuWidth -
          VIEWPORT_PADDING
      ),

      maxHeight: availableHeight,
      maxWidth: availableWidth,
      menuWidth,
    };
  }

  // -------------------------------------------------------
  // Placement selection
  // -------------------------------------------------------

  const placements = getPlacementOrder(preferredPlacement);

  const spaceCandidates = placements.map((placement, index) => ({
    placement,
    index,
    space: getAvailableSpace(
      placement,
      triggerRect,
      viewport
    ),
  }));

  const firstCandidate = spaceCandidates[0];

  const bestCandidate = spaceCandidates.reduce(
    (best, current) => {
      if (current.space > best.space) {
        return current;
      }

      return best;
    },
    firstCandidate
  );

  const placement =
    firstCandidate.space >= menuHeight + MENU_GAP &&
    ["top", "bottom"].includes(firstCandidate.placement)
      ? firstCandidate.placement
      : firstCandidate.space >= menuWidth + MENU_GAP &&
          ["left", "right"].includes(firstCandidate.placement)
        ? firstCandidate.placement
        : bestCandidate.space >=
              (["top", "bottom"].includes(
                bestCandidate.placement
              )
                ? menuHeight
                : menuWidth) + MENU_GAP
          ? bestCandidate.placement
          : bestCandidate.placement;

  // -------------------------------------------------------
  // Base position
  // -------------------------------------------------------

  let top = triggerRect.bottom + MENU_GAP;
  let left = triggerRect.left;

  switch (placement) {
    case "top":
      top = triggerRect.top - menuHeight - MENU_GAP;
      break;

    case "left":
      top =
        triggerRect.top +
        triggerRect.height / 2 -
        menuHeight / 2;

      left = triggerRect.left - menuWidth - MENU_GAP;
      break;

    case "right":
      top =
        triggerRect.top +
        triggerRect.height / 2 -
        menuHeight / 2;

      left = triggerRect.right + MENU_GAP;
      break;

    case "bottom":
    default:
      top = triggerRect.bottom + MENU_GAP;
      break;
  }

  // -------------------------------------------------------
  // Alignment
  // -------------------------------------------------------

  if (cornerAlignment) {
    // Align the corresponding menu corner with the
    // corresponding trigger corner.
    //
    // These are exact corner alignments before viewport
    // clamping is applied.

    top =
      cornerAlignment.vertical === "top"
        ? triggerRect.top
        : triggerRect.bottom - menuHeight;

    left =
      cornerAlignment.horizontal === "left"
        ? triggerRect.left
        : triggerRect.right - menuWidth;
  } else {
    // Horizontal alignment for top/bottom placement.
    if (placement === "top" || placement === "bottom") {
      switch (align) {
        case "start":
        case "left":
          left = triggerRect.left;
          break;

        case "center":
          left =
            triggerRect.left +
            triggerRect.width / 2 -
            menuWidth / 2;
          break;

        case "end":
        case "right":
        default:
          left = triggerRect.right - menuWidth;
          break;
      }
    }

    // Vertical alignment for left/right placement.
    if (placement === "left" || placement === "right") {
      switch (align) {
        case "start":
          top = triggerRect.top;
          break;

        case "end":
          top = triggerRect.bottom - menuHeight;
          break;

        case "center":
        case "left":
        case "right":
        default:
          top =
            triggerRect.top +
            triggerRect.height / 2 -
            menuHeight / 2;
          break;
      }
    }
  }

  // -------------------------------------------------------
  // Viewport clamping
  // -------------------------------------------------------

  top = clamp(
    top,
    viewport.top + VIEWPORT_PADDING,
    viewport.top +
      viewport.height -
      menuHeight -
      VIEWPORT_PADDING
  );

  left = clamp(
    left,
    viewport.left + VIEWPORT_PADDING,
    viewport.left +
      viewport.width -
      menuWidth -
      VIEWPORT_PADDING
  );

  return {
    placement,
    top,
    left,
    maxHeight: availableHeight,
    maxWidth: availableWidth,
    menuWidth,
  };
}

// ---------------------------------------------------------
// ActionMenu
// ---------------------------------------------------------

export default function ActionMenu({
  items = [],

  // auto | top | bottom | left | right | center
  placement = "auto",

  // start | center | end | left | right
  // top-left | top-right | bottom-left | bottom-right
  align = "bottom-right",

  triggerIcon: TriggerIcon = MoreVertical,
  triggerSize = 18,

  buttonClassName = "",
  menuClassName = "",

  ariaLabel = "Open actions",

  triggerLabel,
  direction,
  disabled = false,

  menuWidth = 208,
  closeOnSelect = true,

  onOpenChange,
}) {
  const generatedId = useId();

  const menuId = `action-menu-${generatedId.replace(/:/g, "")}`;

  const shouldReduceMotion = useReducedMotion();

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const firstOpenRef = useRef(false);
  const animationFrameRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [positionReady, setPositionReady] = useState(false);

  const normalizedAlign = normalizeAlign(align);

  const requestedPlacement = direction ?? placement;

  const safePlacement = VALID_PLACEMENTS.includes(
    requestedPlacement
  )
    ? requestedPlacement
    : "auto";

  const normalizedItems = useMemo(
    () => items.filter(Boolean),
    [items]
  );

  const navigableItems = useMemo(
    () =>
      normalizedItems.filter(
        (item) =>
          !item.divider &&
          !item.disabled &&
          !item.loading
      ),
    [normalizedItems]
  );

  const setMenuOpen = useCallback(
    (nextOpen) => {
      setOpen(nextOpen);

      onOpenChange?.(nextOpen);

      if (!nextOpen) {
        setPositionReady(false);
        setPosition(null);
      }
    },
    [onOpenChange]
  );

  // -------------------------------------------------------
  // Position updates
  // -------------------------------------------------------

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;

    if (!trigger || !menu) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const nextPosition = calculateMenuPosition({
      triggerRect,
      menuRect,
      preferredPlacement: safePlacement,
      align: normalizedAlign,
    });

    setPosition((current) => {
      if (
        current &&
        current.placement === nextPosition.placement &&
        Math.abs(current.top - nextPosition.top) <
          POSITION_EPSILON &&
        Math.abs(current.left - nextPosition.left) <
          POSITION_EPSILON &&
        current.maxHeight === nextPosition.maxHeight &&
        current.maxWidth === nextPosition.maxWidth &&
        current.menuWidth === nextPosition.menuWidth
      ) {
        return current;
      }

      return nextPosition;
    });

    setPositionReady(true);
  }, [safePlacement, normalizedAlign]);

  const schedulePositionUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();

    const trigger = triggerRef.current;
    const menu = menuRef.current;

    if (!trigger || !menu) {
      return undefined;
    }

    window.addEventListener(
      "scroll",
      schedulePositionUpdate,
      true
    );

    window.addEventListener(
      "resize",
      schedulePositionUpdate
    );

    window.visualViewport?.addEventListener(
      "resize",
      schedulePositionUpdate
    );

    window.visualViewport?.addEventListener(
      "scroll",
      schedulePositionUpdate
    );

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedulePositionUpdate)
        : null;

    resizeObserver?.observe(trigger);
    resizeObserver?.observe(menu);

    let previousRect = null;
    let trackingFrame = null;
    let cancelled = false;

    const trackTrigger = () => {
      if (cancelled || !triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();

      const nextRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      const moved =
        !previousRect ||
        Math.abs(previousRect.top - nextRect.top) > 0.5 ||
        Math.abs(previousRect.left - nextRect.left) > 0.5 ||
        Math.abs(previousRect.width - nextRect.width) > 0.5 ||
        Math.abs(previousRect.height - nextRect.height) > 0.5;

      if (moved) {
        previousRect = nextRect;
        schedulePositionUpdate();
      }

      trackingFrame = requestAnimationFrame(trackTrigger);
    };

    trackingFrame = requestAnimationFrame(trackTrigger);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "scroll",
        schedulePositionUpdate,
        true
      );

      window.removeEventListener(
        "resize",
        schedulePositionUpdate
      );

      window.visualViewport?.removeEventListener(
        "resize",
        schedulePositionUpdate
      );

      window.visualViewport?.removeEventListener(
        "scroll",
        schedulePositionUpdate
      );

      resizeObserver?.disconnect();

      if (trackingFrame !== null) {
        cancelAnimationFrame(trackingFrame);
      }

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    open,
    schedulePositionUpdate,
    updatePosition,
  ]);

  // -------------------------------------------------------
  // Close on outside click and Escape
  // -------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });

        return;
      }

      if (
        !["ArrowDown", "ArrowUp", "Home", "End"].includes(
          event.key
        )
      ) {
        return;
      }

      const menu = menuRef.current;

      if (!menu) {
        return;
      }

      const elements = Array.from(
        menu.querySelectorAll(
          '[role="menuitem"]:not([aria-disabled="true"])'
        )
      ).filter(
        (element) =>
          !element.hasAttribute("data-menu-divider")
      );

      if (!elements.length) {
        return;
      }

      const activeIndex = elements.indexOf(
        document.activeElement
      );

      let nextIndex = activeIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = elements.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex =
          activeIndex < 0
            ? 0
            : (activeIndex + 1) % elements.length;
      } else if (event.key === "ArrowUp") {
        nextIndex =
          activeIndex < 0
            ? elements.length - 1
            : (activeIndex - 1 + elements.length) %
              elements.length;
      }

      event.preventDefault();

      elements[nextIndex]?.focus();
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, setMenuOpen]);

  // -------------------------------------------------------
  // Focus management
  // -------------------------------------------------------

  useEffect(() => {
    if (!open) {
      firstOpenRef.current = false;
      return undefined;
    }

    if (firstOpenRef.current) {
      return undefined;
    }

    firstOpenRef.current = true;

    const focusFirstItem = () => {
      const menu = menuRef.current;

      if (!menu) {
        return;
      }

      const firstItem = menu.querySelector(
        '[role="menuitem"]:not([aria-disabled="true"])'
      );

      firstItem?.focus({ preventScroll: true });
    };

    const frame = requestAnimationFrame(focusFirstItem);

    return () => cancelAnimationFrame(frame);
  }, [open]);

  // -------------------------------------------------------
  // Action handling
  // -------------------------------------------------------

  const handleItemSelect = useCallback(
    (item, event) => {
      if (
        item.disabled ||
        item.loading ||
        item.divider
      ) {
        event?.preventDefault();
        return;
      }

      if (closeOnSelect) {
        setMenuOpen(false);
      }

      item.onClick?.(event);
    },
    [closeOnSelect, setMenuOpen]
  );

  // -------------------------------------------------------
  // Animation variants
  // -------------------------------------------------------

  const motionOffset = getMotionOffset(
    position?.placement ?? safePlacement
  );

  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.97,
      x: shouldReduceMotion ? 0 : motionOffset.x,
      y: shouldReduceMotion ? 0 : motionOffset.y,
    },

    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,

      transition: {
        duration: shouldReduceMotion ? 0 : 0.16,
        ease: [0.22, 1, 0.36, 1],
      },
    },

    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.98,

      transition: {
        duration: shouldReduceMotion ? 0 : 0.11,
        ease: "easeOut",
      },
    },
  };

  // -------------------------------------------------------
  // Menu item rendering
  // -------------------------------------------------------

  const renderMenuItem = (item, index) => {
    if (item.divider) {
      return (
        <div
          key={item.id ?? `divider-${index}`}
          data-menu-divider=""
          role="separator"
          className={cn(
            "my-1.5 border-t border-ink-200/80",
            item.className
          )}
        />
      );
    }

    const Icon = item.icon;

    const isDanger = Boolean(item.danger);

    const isDisabled = Boolean(
      item.disabled || item.loading
    );

    const isLink = Boolean(item.to && !isDisabled);

    const itemClassName = cn(
      "group relative flex w-full items-center gap-3",
      "rounded-xl px-3 py-2.5 text-left",
      "text-[13px] font-medium leading-5",
      "outline-none select-none",
      "transition-[background-color,color,transform]",
      "duration-150 ease-out",

      isDanger
        ? [
            "text-red-600",
            "hover:bg-red-50",
            "focus-visible:bg-red-50",
            "active:scale-[0.99]",
          ]
        : [
            "text-ink-800",
            "hover:bg-ink-100/80",
            "focus-visible:bg-ink-100",
            "focus-visible:text-ink-950",
            "active:scale-[0.99]",
          ],

      isDisabled && [
        "cursor-not-allowed opacity-45",
        "hover:bg-transparent active:scale-100",
      ],

      item.className
    );

    const iconClassName = cn(
      "flex h-8 w-8 shrink-0 items-center justify-center",
      "rounded-lg transition-colors duration-150",

      isDanger
        ? "bg-red-50 text-red-500 group-hover:bg-red-100"
        : "bg-ink-100 text-ink-600 group-hover:bg-white group-hover:text-primary-700",

      isDisabled && "bg-transparent"
    );

    const content = (
      <>
        {Icon && (
          <span className={iconClassName}>
            {item.loading ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Icon
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            )}
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">
            {item.label}
          </span>

          {item.description && (
            <span
              className={cn(
                "mt-0.5 line-clamp-2 text-[11px]",
                "font-normal leading-4",
                isDanger
                  ? "text-red-500/80"
                  : "text-ink-500"
              )}
            >
              {item.description}
            </span>
          )}
        </span>

        {item.checked && (
          <Check
            size={15}
            className="shrink-0 text-primary-600"
            aria-hidden="true"
          />
        )}

        {item.external && (
          <ChevronRight
            size={14}
            className="shrink-0 text-ink-400"
            aria-hidden="true"
          />
        )}
      </>
    );

    const commonProps = {
      key: item.id ?? item.key ?? `${item.label}-${index}`,

      className: itemClassName,

      role: "menuitem",

      tabIndex: isDisabled ? -1 : 0,

      "aria-disabled": isDisabled ? "true" : undefined,

      onClick: (event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }

        handleItemSelect(item, event);
      },

      onKeyDown: (event) => {
        if (
          isDisabled &&
          ["Enter", " "].includes(event.key)
        ) {
          event.preventDefault();
        }

        item.onKeyDown?.(event);
      },
    };

    if (isLink) {
      return (
        <Link
          {...commonProps}
          to={item.to}
          target={item.target}
          rel={
            item.target === "_blank"
              ? "noopener noreferrer"
              : undefined
          }
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        {...commonProps}
        type="button"
        disabled={isDisabled}
      >
        {content}
      </button>
    );
  };

  // -------------------------------------------------------
  // Trigger
  // -------------------------------------------------------

  const triggerClasses = cn(
    "relative inline-flex shrink-0 items-center justify-center",
    "rounded-xl border",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-200 ease-out",
    "focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-primary-500/40",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",

    open
      ? [
          "border-primary-200",
          "bg-primary-50",
          "text-primary-700",
          "shadow-sm shadow-primary-900/5",
        ]
      : [
          "border-ink-200/80",
          "bg-white",
          "text-ink-600",
          "hover:border-ink-300",
          "hover:bg-ink-50",
          "hover:text-ink-950",
          "hover:shadow-sm",
        ],

    "active:scale-[0.96]",

    buttonClassName
  );

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={triggerClasses}
      style={{
        minWidth: 38,
        minHeight: 38,
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      title={ariaLabel}
      onClick={() => {
        if (disabled) {
          return;
        }

        setMenuOpen(!open);
      }}
    >
      <TriggerIcon
        size={triggerSize}
        strokeWidth={1.9}
        className={cn(
          "transition-transform duration-200",
          open && "rotate-90"
        )}
        aria-hidden="true"
      />

      {triggerLabel && (
        <span className="ml-2 text-sm font-medium">
          {triggerLabel}
        </span>
      )}

      <span className="sr-only">
        {open ? "Close actions menu" : ariaLabel}
      </span>
    </button>
  );

  // -------------------------------------------------------
  // Menu
  // -------------------------------------------------------

  const menu = (
    <AnimatePresence
      onExitComplete={() => {
        setPosition(null);
        setPositionReady(false);
      }}
    >
      {open && (
        <motion.div
          key="action-menu"
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Available actions"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={menuVariants}
          style={{
            position: "fixed",

            top: position?.top ?? -10000,
            left: position?.left ?? -10000,

            width: position?.menuWidth ?? menuWidth,

            maxWidth:
              position?.maxWidth ?? "calc(100vw - 24px)",

            maxHeight:
              position?.maxHeight ?? "calc(100vh - 24px)",

            visibility: positionReady ? "visible" : "hidden",

            zIndex: 9999,

            transformOrigin: "center center",
          }}
          className={cn(
            "overflow-y-auto overscroll-contain",
            "rounded-2xl border border-ink-200/80",
            "bg-white p-1.5",
            "shadow-[0_18px_50px_-16px_rgba(15,23,42,0.24)]",
            "ring-1 ring-black/[0.025]",
            "backdrop-blur-xl",
            "[scrollbar-width:thin]",
            menuClassName
          )}
        >
          {normalizedItems.length > 0 ? (
            normalizedItems.map(renderMenuItem)
          ) : (
            <div className="px-3 py-5 text-center">
              <p className="text-xs font-medium text-ink-500">
                No actions available
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {trigger}

      {typeof document !== "undefined" &&
        createPortal(menu, document.body)}
    </>
  );
}

/*
=========================================================
ACTION MENU — USAGE REFERENCE
=========================================================

1. BASIC USAGE
---------------------------------------------------------

<ActionMenu items={menuItems} />


2. AUTOMATIC POSITIONING
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  placement="auto"
  align="bottom-right"
/>


3. OPENING DIRECTIONS
---------------------------------------------------------

Open above:
<ActionMenu
  items={menuItems}
  placement="top"
/>

Open below:
<ActionMenu
  items={menuItems}
  placement="bottom"
/>

Open to the left:
<ActionMenu
  items={menuItems}
  placement="left"
/>

Open to the right:
<ActionMenu
  items={menuItems}
  placement="right"
/>

Center around the trigger:
<ActionMenu
  items={menuItems}
  placement="center"
/>


4. FOUR CORNER ALIGNMENTS
---------------------------------------------------------

Top-left:
<ActionMenu
  items={menuItems}
  placement="bottom"
  align="top-left"
/>

Top-right:
<ActionMenu
  items={menuItems}
  placement="bottom"
  align="top-right"
/>

Bottom-left:
<ActionMenu
  items={menuItems}
  placement="top"
  align="bottom-left"
/>

Bottom-right:
<ActionMenu
  items={menuItems}
  placement="top"
  align="bottom-right"
/>


5. LEGACY ALIGNMENT VALUES
---------------------------------------------------------

Align to the beginning:
<ActionMenu
  items={menuItems}
  placement="bottom"
  align="start"
/>

Center alignment:
<ActionMenu
  items={menuItems}
  placement="bottom"
  align="center"
/>

Align to the end:
<ActionMenu
  items={menuItems}
  placement="bottom"
  align="end"
/>

Legacy left alignment:
<ActionMenu
  items={menuItems}
  align="left"
/>

Legacy right alignment:
<ActionMenu
  items={menuItems}
  align="right"
/>


6. DIRECTION ALIAS
---------------------------------------------------------

The direction prop takes precedence over placement.

<ActionMenu
  items={menuItems}
  direction="auto"
  align="bottom-right"
/>


7. CUSTOM TRIGGER ICON AND SIZE
---------------------------------------------------------

import { Ellipsis } from "lucide-react";

<ActionMenu
  items={menuItems}
  triggerIcon={Ellipsis}
  triggerSize={20}
  ariaLabel="Application actions"
/>


8. CUSTOM STYLING
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  buttonClassName="rounded-full border-primary-200"
  menuClassName="rounded-3xl"
  menuWidth={240}
/>


9. TRIGGER LABEL
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  triggerLabel="Actions"
  ariaLabel="Open application actions"
/>


10. DISABLED TRIGGER
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  disabled
  ariaLabel="Actions unavailable"
/>


11. MENU ITEMS WITH ICONS, DESCRIPTIONS, AND LINKS
---------------------------------------------------------

import {
  Eye,
  Copy,
  Settings,
  ExternalLink,
} from "lucide-react";

const menuItems = [
  {
    label: "View details",
    description: "View the full application",
    icon: Eye,
    to: "/applications/123",
  },
  {
    label: "Copy reference",
    description: "Copy the application reference",
    icon: Copy,
    onClick: () => handleCopyReference(),
  },
  {
    divider: true,
  },
  {
    label: "Open external page",
    icon: ExternalLink,
    to: "https://example.com",
    target: "_blank",
  },
  {
    label: "Settings",
    icon: Settings,
    onClick: () => handleSettings(),
  },
];

<ActionMenu
  items={menuItems}
  placement="auto"
  align="bottom-right"
/>


12. DANGER ACTION
---------------------------------------------------------

import { Trash2 } from "lucide-react";

{
  label: "Delete item",
  icon: Trash2,
  danger: true,
  onClick: () => handleDelete(),
}


13. DISABLED OR LOADING ACTION
---------------------------------------------------------

{
  label: "Save changes",
  icon: Save,
  disabled: isSaving,
  loading: isSaving,
  onClick: () => handleSave(),
}


14. CHECKED ACTION
---------------------------------------------------------

{
  label: "Default option",
  icon: Check,
  checked: true,
  onClick: () => handleSelectDefault(),
}


15. OPEN/CLOSE CALLBACK
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  onOpenChange={(isOpen) => {
    console.log("Action menu open:", isOpen);
  }}
/>


16. KEEP MENU OPEN AFTER SELECTION
---------------------------------------------------------

<ActionMenu
  items={menuItems}
  closeOnSelect={false}
/>


17. REALISTIC APPLICATION CARD EXAMPLE
---------------------------------------------------------

import {
  Eye,
  Copy,
  MessageCircle,
  XCircle,
} from "lucide-react";

const menuItems = [
  {
    label: "View application",
    description: "See application details",
    icon: Eye,
    onClick: () => handleViewApplication(application),
  },
  {
    label: "Copy application ID",
    icon: Copy,
    onClick: () => handleCopyId(application.id),
  },
  {
    label: "Report an issue",
    icon: MessageCircle,
    onClick: () => setSupportModalOpen(true),
  },
  {
    divider: true,
  },
  {
    label: "Cancel application",
    description: "Cancel this application",
    icon: XCircle,
    danger: true,
    disabled: actionLoading,
    onClick: () => handleCancel(application),
  },
];

<ActionMenu
  items={menuItems}
  placement="auto"
  align="bottom-right"
  ariaLabel={`Actions for application ${application.id}`}
/>


=========================================================
IMPORTANT
=========================================================

- Keep page-specific menuItems in the page component.
- ActionMenu.jsx handles reusable presentation and behavior.
- Use placement="auto" for automatic direction selection.
- Use corner alignments to align specific menu corners.
- Use danger: true for destructive actions.
- Use disabled or loading for unavailable actions.
- Validate permissions on the backend as well.
- External URLs should be trusted and validated.
- Menu positioning uses a React Portal and fixed viewport
  coordinates rather than the containing card.

=========================================================
*/