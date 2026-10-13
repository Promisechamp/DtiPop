import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { X } from "lucide-react";

/* =========================================================
   MODAL SYSTEM
========================================================= */

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-none",
};

const POSITIONS = {
  bottom: {
    container:
      "fixed inset-x-0 bottom-4 flex items-end justify-center sm:p-6",
    panel: "rounded-[28px]",
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
    enterTransition: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
    exitTransition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
  },

  top: {
    container: "fixed inset-x-0 top-5 flex items-start justify-center sm:p-6",
    panel: "rounded-b-[28px] rounded-t-none sm:rounded-[28px]",
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
    enterTransition: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
    exitTransition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
  },

  left: {
    container:
      "fixed inset-y-0 left-0 flex items-center justify-start p-3 sm:p-6",
    panel: "h-full max-h-[min(100dvh,760px)] rounded-[28px]",
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
    enterTransition: { type: "spring", stiffness: 400, damping: 34, mass: 0.85 },
    exitTransition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
  },

  right: {
    container:
      "fixed inset-y-0 right-0 flex items-center justify-end p-3 sm:p-6",
    panel: "h-full max-h-[min(100dvh,760px)] rounded-[28px]",
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
    enterTransition: { type: "spring", stiffness: 400, damping: 34, mass: 0.85 },
    exitTransition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
  },

  center: {
    container: "fixed inset-0 flex items-center justify-center p-3 sm:p-6",
    panel: "rounded-[28px]",
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.97, opacity: 0 },
    enterTransition: { type: "spring", stiffness: 420, damping: 32, mass: 0.8 },
    exitTransition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
  },
};

const BACKDROP_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1],
};

const FOCUSABLE_SELECTOR = `
  a[href],
  area[href],
  button:not([disabled]),
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  iframe,
  object,
  embed,
  [contenteditable="true"],
  [tabindex]:not([tabindex="-1"])
`;

/* =========================================================
   MODAL
========================================================= */

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer = null,

  size = "md",
  position = "bottom",

  showCloseButton = true,
  showHandle = true,

  closeOnOutsideClick = true,
  closeOnEscape = true,
  closeOnDrag = true,

  initialFocusRef,

  className = "",
  zIndex = 50,

  // 👇 NEW: portal to document.body by default
  portal = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const dragControls = useDragControls();

  const panelRef = useRef(null);
  const previousActiveElement = useRef(null);

  const scrollPositionRef = useRef(0);
  const wasOpenRef = useRef(false);
  const isClosingRef = useRef(false);

  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);

  const titleId = useId();
  const descriptionId = useId();
  const dialogId = useId();

  // 👇 NEW: SSR-safe mount guard
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const config = POSITIONS[position] || POSITIONS.bottom;
  const modalSize = SIZES[size] || SIZES.md;

  /* -------------------------------------------------------
     Keep callbacks current without causing effect churn
  ------------------------------------------------------- */

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initialFocusRefRef.current = initialFocusRef;
  }, [initialFocusRef]);

  const handleClose = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  /* =======================================================
     SCROLL LOCK + KEYBOARD + FOCUS
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return undefined;
    }

    if (wasOpenRef.current) {
      return undefined;
    }

    wasOpenRef.current = true;
    isClosingRef.current = false;

    const body = document.body;
    const html = document.documentElement;

    const scrollY = window.scrollY;

    scrollPositionRef.current = scrollY;

    previousActiveElement.current = document.activeElement;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;

    const scrollbarWidth = window.innerWidth - html.clientWidth;

    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    html.style.overscrollBehavior = "none";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();

        handleClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          element instanceof HTMLElement && element.offsetParent !== null
      );

      if (!focusable.length) {
        event.preventDefault();

        panelRef.current.focus({ preventScroll: true });

        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (
          document.activeElement === first ||
          !panelRef.current.contains(document.activeElement)
        ) {
          event.preventDefault();

          last.focus({ preventScroll: true });
        }
      } else if (document.activeElement === last) {
        event.preventDefault();

        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;

      if (!panel) return;

      const requestedFocus = initialFocusRefRef.current?.current;

      if (requestedFocus && typeof requestedFocus.focus === "function") {
        requestedFocus.focus({ preventScroll: true });

        return;
      }

      const active = document.activeElement;

      const activeIsInside = active && panel.contains(active);

      const activeIsFormControl =
        active instanceof HTMLElement &&
        active.matches("input, textarea, select, [contenteditable='true']");

      if (!activeIsInside && !activeIsFormControl) {
        panel.focus({ preventScroll: true });
      }
    }, 50);

    return () => {
      window.clearTimeout(focusTimer);

      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;

      const savedScrollY = scrollPositionRef.current;

      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - savedScrollY) > 1) {
          window.scrollTo({ top: savedScrollY, left: 0 });
        }
      });

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEscape, handleClose]);

  /* =======================================================
     RESTORE FOCUS
  ======================================================= */

  const restoreFocus = useCallback(() => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    const previous = previousActiveElement.current;

    if (
      previous &&
      typeof previous.focus === "function" &&
      document.contains(previous)
    ) {
      requestAnimationFrame(() => {
        try {
          previous.focus({ preventScroll: true });
        } catch {
          previous.focus();
        }
      });
    }

    wasOpenRef.current = false;
  }, []);

  /* =======================================================
     MOTION
  ======================================================= */

  const animation = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        enterTransition: { duration: 0.12 },
        exitTransition: { duration: 0.1 },
      };
    }

    return {
      initial: config.initial,
      animate: config.animate,
      exit: config.exit,
      enterTransition: config.enterTransition,
      exitTransition: config.exitTransition,
    };
  }, [config, prefersReducedMotion]);

  /* =======================================================
     DRAG
  ======================================================= */

  const enableDrag =
    position === "bottom" && closeOnDrag && !prefersReducedMotion;

  const handleDragEnd = useCallback(
    (_, info) => {
      if (!enableDrag) return;

      const distance = info.offset.y;
      const velocity = info.velocity.y;

      if (distance > 110 || velocity > 650) {
        handleClose();
      }
    },
    [enableDrag, handleClose]
  );

  /* =======================================================
     ACCESSIBILITY
  ======================================================= */

  const ariaLabelledBy = title ? titleId : undefined;
  const ariaDescribedBy = description ? descriptionId : undefined;
  const dialogLabel = title ? undefined : "Dialog";

  /* =======================================================
     RENDER
  ======================================================= */

  const content = (
    <AnimatePresence
      initial={false}
      mode="wait"
      onExitComplete={restoreFocus}
    >
      {isOpen && (
        <motion.div
          key="modal-root"
          className="fixed inset-0"
          style={{ zIndex }}
        >
          {/* BACKDROP */}

          <motion.div
            className="
              fixed inset-0
              bg-ink-950/55
              backdrop-blur-[2px]
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_TRANSITION}
            onClick={closeOnOutsideClick ? handleClose : undefined}
            aria-hidden="true"
          />

          {/* POSITION CONTAINER */}

          <div
            className={`
              ${config.container}
              z-10
              w-full
              min-h-0
              pointer-events-none
            `}
          >
            {/* PANEL */}

            <motion.div
              ref={panelRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              aria-label={dialogLabel}
              tabIndex={-1}
              className={`
                ${modalSize}

                relative
                flex
                w-full
                min-h-0
                flex-col
																mx-4
                overflow-hidden

                pointer-events-auto

                bg-white
                text-ink-900

                border
                border-ink-300

                shadow-[0_0_5px_#0003]

                outline-none

                max-h-[calc(100dvh-2.75rem)]
                sm:max-h-[calc(100dvh-3rem)]

                ${config.panel}
                ${className}
              `}
              initial={animation.initial}
              animate={animation.animate}
              exit={animation.exit}
              transition={
                isOpen ? animation.enterTransition : animation.exitTransition
              }
              onClick={(event) => event.stopPropagation()}
              drag={enableDrag ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={enableDrag ? { top: 0, bottom: 0 } : undefined}
              dragElastic={
                enableDrag ? { top: 0, bottom: 0.32 } : undefined
              }
              onDragEnd={handleDragEnd}
            >
              {/* MOBILE SHEET HANDLE */}

              {position === "bottom" && showHandle && (
                <div
                  className="
                    flex
                    shrink-0
                    justify-center
                    pt-2.5
                    pb-1
                    sm:hidden
                    touch-none
                  "
                  onPointerDown={(event) => {
                    if (enableDrag) {
                      dragControls.start(event);
                    }
                  }}
                >
                  <div
                    className="
                      h-1
                      w-9
                      rounded-full
                      bg-ink-300
                    "
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* HEADER */}

              {(title || subtitle || description || showCloseButton) && (
                <header
                  className="
                    relative
                    flex
                    shrink-0
                    items-start
                    gap-4
                    px-5
                    pb-4
                    pt-4
                    sm:px-6
                    sm:pb-5
                    sm:pt-5
                  "
                >
                  <div
                    className="
                      absolute
                      left-5
                      top-0
                      h-[2px]
                      w-8
                      rounded-full
                      bg-primary-500
                      sm:left-6
                    "
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1 pt-0.5">
                    {subtitle && (
                      <p
                        className="
                          mb-1
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.16em]
                          text-primary-600
                        "
                      >
                        {subtitle}
                      </p>
                    )}

                    {title && (
                      <h2
                        id={titleId}
                        className="
                          text-lg
                          font-extrabold
                          leading-6
                          tracking-tight
                          text-ink-950
                          sm:text-xl
                        "
                      >
                        {title}
                      </h2>
                    )}

                    {description && (
                      <p
                        id={descriptionId}
                        className="
                          mt-1.5
                          max-w-2xl
                          text-sm
                          leading-5
                          text-ink-500
                        "
                      >
                        {description}
                      </p>
                    )}
                  </div>

                  {showCloseButton && (
                    <motion.button
                      type="button"
                      aria-label="Close dialog"
                      onClick={handleClose}
                      whileHover={
                        prefersReducedMotion ? undefined : { scale: 1.04 }
                      }
                      whileTap={
                        prefersReducedMotion ? undefined : { scale: 0.94 }
                      }
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center

                        rounded-md

                        bg-ink-100
                        text-ink-500

                        transition-colors

                        hover:bg-ink-200
                        hover:text-ink-900

                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary-200
                      "
                    >
                      <X size={17} strokeWidth={2.2} />
                    </motion.button>
                  )}
                </header>
              )}

              {/* CONTENT */}

              <main
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                  overscroll-contain
                  bg-white
                  px-5
                  py-4

                  sm:px-6
                  sm:py-5

                  touch-pan-y

                  [scrollbar-width:none]
                  [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden

                  pb-[max(1rem,env(safe-area-inset-bottom))]
                "
              >
                {children}
              </main>

              {/* FOOTER */}

              {footer && (
                <footer
                  className="
                    shrink-0

                    border-t
                    border-ink-100

                    bg-ink-50

                    px-5
                    py-4

                    sm:px-6

                    pb-[max(1rem,env(safe-area-inset-bottom))]
                  "
                >
                  {footer}
                </footer>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* -------------------------------------------------------
     PORTAL
  ------------------------------------------------------- */

  if (!portal) {
    return content;
  }

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
};

export default Modal;