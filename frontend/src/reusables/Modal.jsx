import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { X } from "lucide-react";

/* =========================================================
   DESIGN SYSTEM
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
      "fixed inset-x-0 bottom-0 flex items-end justify-center sm:p-6",
    panel: "rounded-t-[28px] rounded-b-none sm:rounded-[28px]",
    initial: { y: "105%", scale: 0.985, opacity: 0 },
    animate: { y: 0, scale: 1, opacity: 1 },
    exit: { y: "105%", scale: 0.985, opacity: 0 },
    enterTransition: {
      type: "spring",
      stiffness: 380,
      damping: 30,
      mass: 0.9,
    },
    exitTransition: {
      duration: 0.32,
      ease: [0.32, 0.72, 0, 1],
    },
  },

  top: {
    container:
      "fixed inset-x-0 top-0 flex items-start justify-center sm:p-6",
    panel: "rounded-b-[28px] rounded-t-none sm:rounded-[28px]",
    initial: { y: "-105%", scale: 0.985, opacity: 0 },
    animate: { y: 0, scale: 1, opacity: 1 },
    exit: { y: "-105%", scale: 0.985, opacity: 0 },
    enterTransition: {
      type: "spring",
      stiffness: 380,
      damping: 30,
      mass: 0.9,
    },
    exitTransition: {
      duration: 0.32,
      ease: [0.32, 0.72, 0, 1],
    },
  },

  left: {
    container:
      "fixed inset-y-0 left-0 flex items-center justify-start p-4 sm:p-6",
    panel: "h-full max-h-[min(100%,720px)] rounded-[28px]",
    initial: { x: "-105%", scale: 0.985, opacity: 0 },
    animate: { x: 0, scale: 1, opacity: 1 },
    exit: { x: "-105%", scale: 0.985, opacity: 0 },
    enterTransition: {
      type: "spring",
      stiffness: 360,
      damping: 30,
      mass: 0.9,
    },
    exitTransition: {
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1],
    },
  },

  right: {
    container:
      "fixed inset-y-0 right-0 flex items-center justify-end p-4 sm:p-6",
    panel: "h-full max-h-[min(100%,720px)] rounded-[28px]",
    initial: { x: "105%", scale: 0.985, opacity: 0 },
    animate: { x: 0, scale: 1, opacity: 1 },
    exit: { x: "105%", scale: 0.985, opacity: 0 },
    enterTransition: {
      type: "spring",
      stiffness: 360,
      damping: 30,
      mass: 0.9,
    },
    exitTransition: {
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1],
    },
  },

  center: {
    container: "fixed inset-0 flex items-center justify-center p-4",
    panel: "rounded-[28px]",
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.94, opacity: 0 },
    enterTransition: {
      type: "spring",
      stiffness: 420,
      damping: 30,
      mass: 0.85,
    },
    exitTransition: {
      duration: 0.22,
      ease: [0.32, 0.72, 0, 1],
    },
  },
};

/* =========================================================
   BACKDROP
========================================================= */

const BACKDROP_TRANSITION = {
  enter: {
    duration: 0.22,
    ease: "easeOut",
  },
  exit: {
    duration: 0.3,
    ease: [0.32, 0.72, 0, 1],
  },
};

/* =========================================================
   FOCUSABLE ELEMENTS
========================================================= */

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
}) => {
  const prefersReducedMotion = useReducedMotion();
  const dragControls = useDragControls();

  const panelRef = useRef(null);

  /*
   * Stores the element that had focus before opening.
   */
  const previousActiveElement = useRef(null);

  /*
   * Stores the exact scroll position before locking.
   */
  const scrollPositionRef = useRef(0);

  /*
   * Prevents duplicate open/close lifecycle handling.
   */
  const wasOpenRef = useRef(false);

  /*
   * Prevents focus restoration from happening more than once.
   */
  const isClosingRef = useRef(false);

  const titleId = useId();
  const descriptionId = useId();
  const dialogId = useId();

  const config =
    POSITIONS[position] || POSITIONS.bottom;

  /* =======================================================
     STABLE CLOSE HANDLER
  ======================================================= */

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  /* =======================================================
     BODY SCROLL LOCK
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;

    wasOpenRef.current = true;
    isClosingRef.current = false;

    const body = document.body;
    const html = document.documentElement;

    /*
     * Capture the exact position BEFORE changing anything.
     */
    const scrollY = window.scrollY;

    scrollPositionRef.current = scrollY;

    previousActiveElement.current =
      document.activeElement;

    /*
     * Save existing inline styles so this component
     * does not interfere with another scroll-lock system.
     */
    const previousBodyOverflow =
      body.style.overflow;

    const previousBodyPaddingRight =
      body.style.paddingRight;

    const previousHtmlOverscrollBehavior =
      html.style.overscrollBehavior;

    /*
     * Calculate scrollbar width.
     */
    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    /*
     * Lock background scrolling.
     *
     * IMPORTANT:
     * We intentionally DO NOT use:
     *
     * body.style.position = "fixed"
     *
     * because that is what commonly causes the page
     * to jump when the modal closes.
     */
    body.style.overflow = "hidden";

    /*
     * Preserve page width when the scrollbar disappears.
     */
    if (scrollbarWidth > 0) {
      body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    /*
     * Prevent overscroll chaining.
     */
    html.style.overscrollBehavior = "none";

    /* =====================================================
       KEYBOARD HANDLING
    ===================================================== */

    const handleKeyDown = (event) => {
      if (
        closeOnEscape &&
        event.key === "Escape"
      ) {
        event.preventDefault();
        handleClose();
        return;
      }

      /*
       * Focus trap.
       */
      if (
        event.key !== "Tab" ||
        !panelRef.current
      ) {
        return;
      }

      const focusable =
        panelRef.current.querySelectorAll(
          FOCUSABLE_SELECTOR
        );

      if (!focusable.length) return;

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus({
            preventScroll: true,
          });
        }
      } else {
        if (
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus({
            preventScroll: true,
          });
        }
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    /* =====================================================
       INITIAL FOCUS
    ===================================================== */

    const focusTimer =
      window.setTimeout(() => {
        if (!panelRef.current) return;

        if (initialFocusRef?.current) {
          initialFocusRef.current.focus({
            preventScroll: true,
          });
          return;
        }

        const active =
          document.activeElement;

        const focusIsInside =
          active &&
          panelRef.current.contains(active);

        const activeIsFormControl =
          active instanceof HTMLElement &&
          active.matches(
            "input, textarea, select, [contenteditable='true']"
          );

        /*
         * Never use normal .focus() here because
         * it can scroll the document.
         */
        if (
          !focusIsInside &&
          !activeIsFormControl
        ) {
          panelRef.current.focus({
            preventScroll: true,
          });
        }
      }, 60);

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      window.clearTimeout(focusTimer);

      /*
       * Restore exactly what was there before.
       */
      body.style.overflow =
        previousBodyOverflow;

      body.style.paddingRight =
        previousBodyPaddingRight;

      html.style.overscrollBehavior =
        previousHtmlOverscrollBehavior;

      /*
       * Restore scroll position on the next frame.
       *
       * This is important because restoring it synchronously
       * while the modal is being removed can race with browser
       * layout/reflow.
       */
      const savedScrollY =
        scrollPositionRef.current;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            Math.abs(
              window.scrollY - savedScrollY
            ) > 1
          ) {
            window.scrollTo({
              top: savedScrollY,
              left: 0,
              behavior: "instant",
            });
          }
        });
      });

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    closeOnEscape,
    handleClose,
    initialFocusRef,
  ]);

  /* =======================================================
     FOCUS RESTORATION
  ======================================================= */

  const restoreFocus = useCallback(() => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;

    const previous =
      previousActiveElement.current;

    if (
      previous &&
      typeof previous.focus === "function" &&
      document.contains(previous)
    ) {
      requestAnimationFrame(() => {
        try {
          previous.focus({
            preventScroll: true,
          });
        } catch {
          previous.focus();
        }
      });
    }

    wasOpenRef.current = false;
  }, []);

  /* =======================================================
     REDUCED MOTION
  ======================================================= */

  const animation = useMemo(() => {
    if (!prefersReducedMotion) {
      return {
        initial: config.initial,
        animate: config.animate,
        exit: config.exit,
        enterTransition:
          config.enterTransition,
        exitTransition:
          config.exitTransition,
      };
    }

    return {
      initial: {
        opacity: 0,
      },
      animate: {
        opacity: 1,
      },
      exit: {
        opacity: 0,
      },
      enterTransition: {
        duration: 0.15,
      },
      exitTransition: {
        duration: 0.12,
      },
    };
  }, [
    config,
    prefersReducedMotion,
  ]);

  /* =======================================================
     DRAG
  ======================================================= */

  const enableDrag =
    position === "bottom" &&
    closeOnDrag &&
    !prefersReducedMotion;

  const handleDragEnd = useCallback(
    (_, info) => {
      if (!enableDrag) return;

      const distance = info.offset.y;
      const velocity = info.velocity.y;

      if (
        distance > 120 ||
        velocity > 600
      ) {
        handleClose();
      }
    },
    [
      enableDrag,
      handleClose,
    ]
  );

  /* =======================================================
     ARIA
  ======================================================= */

  const ariaLabelledBy = title
    ? titleId
    : undefined;

  const ariaDescribedBy = description
    ? descriptionId
    : undefined;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
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
          aria-hidden={false}
        >
          {/* =================================================
              BACKDROP
          ================================================= */}

          <motion.div
            className="
              fixed inset-0
              bg-slate-950/45
              backdrop-blur-[3px]
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={
              BACKDROP_TRANSITION.enter
            }
            onClick={
              closeOnOutsideClick
                ? handleClose
                : undefined
            }
            aria-hidden="true"
          />

          {/* =================================================
              POSITION CONTAINER
          ================================================= */}

          <div
            className={`${config.container} z-10 w-full`}
          >
            {/* =================================================
                PANEL
            ================================================= */}

            <motion.div
              ref={panelRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={
                ariaLabelledBy
              }
              aria-describedby={
                ariaDescribedBy
              }
              tabIndex={-1}
              className={`
                relative flex w-full flex-col
                overflow-hidden outline-none

                bg-white text-slate-900
                border border-slate-200/80
                shadow-[0_24px_80px_rgba(15,23,42,0.18)]

                ${SIZES[size]}
                ${config.panel}

                max-h-[calc(100dvh-1rem)]
                sm:max-h-[calc(100vh-3rem)]

                min-h-0

                ${className}
              `}
              initial={animation.initial}
              animate={animation.animate}
              exit={animation.exit}
              transition={
                isOpen
                  ? animation.enterTransition
                  : animation.exitTransition
              }
              onClick={(event) =>
                event.stopPropagation()
              }
              drag={
                enableDrag
                  ? "y"
                  : false
              }
              dragControls={
                dragControls
              }
              dragListener={false}
              dragConstraints={
                enableDrag
                  ? {
                      top: 0,
                      bottom: 0,
                    }
                  : undefined
              }
              dragElastic={
                enableDrag
                  ? {
                      top: 0,
                      bottom: 0.35,
                    }
                  : undefined
              }
              onDragEnd={handleDragEnd}
            >
              {/* =================================================
                  MOBILE HANDLE
              ================================================= */}

              {position === "bottom" &&
                showHandle && (
                  <div
                    className="
                      flex shrink-0
                      justify-center
                      px-4 pb-1 pt-3
                      sm:hidden
                      touch-none
                    "
                    onPointerDown={
                      (event) => {
                        if (enableDrag) {
                          dragControls.start(
                            event
                          );
                        }
                      }
                    }
                  >
                    <div
                      className="
                        h-1.5 w-10
                        rounded-full
                        bg-slate-300
                        transition-colors
                      "
                      aria-hidden="true"
                    />
                  </div>
                )}

              {/* =================================================
                  HEADER
              ================================================= */}

              {(title ||
                subtitle ||
                showCloseButton) && (
                <div
                  className="
                    flex shrink-0 items-start gap-4
                    border-b border-slate-100
                    bg-white
                    px-5 py-4
                    sm:px-6 sm:py-5
                  "
                >
                  <div className="min-w-0 flex-1">
                    {subtitle && (
                      <p
                        className="
                          mb-1 font-mono
                          text-[10px] font-medium
                          uppercase
                          tracking-[0.14em]
                          text-slate-400
                        "
                      >
                        {subtitle}
                      </p>
                    )}

                    {title && (
                      <h2
                        id={titleId}
                        className="
                          truncate
                          text-[18px]
                          font-semibold
                          leading-6
                          tracking-tight
                          text-slate-950
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
                          max-w-xl
                          text-sm
                          leading-5
                          text-slate-500
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
                        prefersReducedMotion
                          ? undefined
                          : {
                              scale: 1.05,
                            }
                      }
                      whileTap={
                        prefersReducedMotion
                          ? undefined
                          : {
                              scale: 0.92,
                            }
                      }
                      className="
                        flex h-9 w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        text-slate-500
                        transition-colors
                        hover:bg-slate-200
                        hover:text-slate-900
                        focus:outline-none
                        focus:ring-2
                        focus:ring-slate-400/30
                      "
                    >
                      <X
                        size={18}
                        strokeWidth={2}
                      />
                    </motion.button>
                  )}
                </div>
              )}

              {/* =================================================
                  CONTENT
              ================================================= */}

              <div
                className="
                  min-h-0 flex-1
                  overflow-y-auto
                  overscroll-contain
                  px-5 py-5
                  sm:px-6 sm:py-6
                  touch-pan-y
                  [scrollbar-width:none]
                  [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden
                  pb-[max(1.25rem,env(safe-area-inset-bottom))]
                "
              >
                {children}
              </div>

              {/* =================================================
                  FOOTER
              ================================================= */}

              {footer && (
                <div
                  className="
                    shrink-0
                    border-t border-slate-100
                    bg-white
                    px-5 py-4
                    sm:px-6
                    pb-[max(1rem,env(safe-area-inset-bottom))]
                  "
                >
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;