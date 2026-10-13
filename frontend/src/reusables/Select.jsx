import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import { Check, ChevronDown, Search, X } from "lucide-react";

import { renderIcon } from "@/utils/constantHelpers";
import Modal from "@/reusables/Modal";

const cn = (...classes) => classes.filter(Boolean).join(" ");

// --------------------------------------------------
// Option accessors
// --------------------------------------------------

const getRawValue = (option, valueKey) => {
  if (option == null) return "";
  if (typeof option !== "object") return option;

  return (
    option[valueKey] ??
    option.value ??
    option.id ??
    option.label ??
    ""
  );
};

const getLabel = (option, labelKey) => {
  if (option == null) return "";
  if (typeof option !== "object") return String(option);

  return String(
    option[labelKey] ??
      option.label ??
      option.name ??
      option.title ??
      option.value ??
      ""
  );
};

const getDescription = (option, descriptionKey) => {
  if (!option || typeof option !== "object") return "";

  return String(
    option[descriptionKey] ??
      option.description ??
      option.subtitle ??
      ""
  );
};

function Select({
  options = [],
  value,
  defaultValue,
  onChange,

  label,
  description,
  placeholder = "Choose an option",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No matching options",

  error,
  hint,

  disabled = false,
  loading = false,
  required = false,

  multiple = false,
  searchable = true,
  clearable = true,
  closeOnSelect = !multiple,

  labelKey = "label",
  valueKey = "value",
  descriptionKey = "description",

  name,
  id,
  className = "",

  maxHeight = 320,
  maxDisplayed = 2,
  showIcon = true,
  mobileBreakpoint = 768,

  autoFocusSearch = false,
  onSearch,
  onOpen,
  onClose,

  renderOption,
  renderValue,
}) {
  const uid = useId();
  const selectId = id || `select-${uid}`;
  const listId = `${selectId}-listbox`;
  const optionId = (index) => `${selectId}-option-${index}`;

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  // Keep latest callbacks in refs so inline functions from the parent
  // never retrigger effects.
  const onSearchRef = useRef(onSearch);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSearchRef.current = onSearch;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  });

  const controlled = value !== undefined;

  const [internalValue, setInternalValue] = useState(
    defaultValue ?? (multiple ? [] : "")
  );

  const currentValue = controlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // --------------------------------------------------
  // Mobile detection
  // --------------------------------------------------

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < mobileBreakpoint);

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, [mobileBreakpoint]);

  // --------------------------------------------------
  // Normalised items
  // --------------------------------------------------

  const items = useMemo(() => {
    return (Array.isArray(options) ? options : [])
      .filter((option) => option != null)
      .map((original) => {
        const raw = getRawValue(original, valueKey);

        return {
          original,
          raw,
          value: String(raw),
          label: getLabel(original, labelKey),
          description: getDescription(original, descriptionKey),
          icon:
            original && typeof original === "object"
              ? original.icon
              : undefined,
          color:
            original && typeof original === "object"
              ? original.color
              : undefined,
          disabled: Boolean(
            original &&
              typeof original === "object" &&
              original.disabled
          ),
        };
      });
  }, [options, valueKey, labelKey, descriptionKey]);

  const selectedValues = useMemo(() => {
    if (multiple) {
      const values = Array.isArray(currentValue)
        ? currentValue
        : currentValue == null || currentValue === ""
          ? []
          : [currentValue];

      return values.map((v) =>
        typeof v === "object" ? String(getRawValue(v, valueKey)) : String(v)
      );
    }

    if (currentValue == null || currentValue === "") return [];

    if (typeof currentValue === "object") {
      return [String(getRawValue(currentValue, valueKey))];
    }

    return [String(currentValue)];
  }, [currentValue, multiple, valueKey]);

  const selectedSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );

  const selectedItems = useMemo(
    () =>
      selectedValues
        .map((selected) =>
          items.find((item) => item.value === selected)
        )
        .filter(Boolean),
    [selectedValues, items]
  );

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) =>
      `${item.label} ${item.description} ${item.value}`
        .toLowerCase()
        .includes(term)
    );
  }, [items, query]);

  // Emit original value types (numbers stay numbers), not stringified ones.
  const toRaw = useCallback(
    (str) => items.find((item) => item.value === str)?.raw ?? str,
    [items]
  );

  const setValue = useCallback(
    (nextValue, meta = {}) => {
      if (!controlled) setInternalValue(nextValue);

      onChange?.(nextValue, meta);
    },
    [controlled, onChange]
  );

  // --------------------------------------------------
  // Open / close
  // --------------------------------------------------

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    setPosition(null);

    onCloseRef.current?.();

    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const show = useCallback(() => {
    if (disabled || loading) return;

    setOpen(true);
    setQuery("");
    setActiveIndex(-1);

    onOpenRef.current?.();
  }, [disabled, loading]);

  // --------------------------------------------------
  // Desktop positioning
  // --------------------------------------------------

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger || !open || isMobile) return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.min(Math.max(rect.width, 250), vw - 24);
    const left = Math.max(12, Math.min(rect.left, vw - width - 12));

    const below = vh - rect.bottom - 12;
    const above = rect.top - 12;

    const openAbove = below < 220 && above > below;
    const available = Math.max(120, openAbove ? above : below);

    setPosition({
      left,
      width,
      maxHeight: Math.min(maxHeight, available),
      openAbove,
      anchor: openAbove ? rect.top - 6 : rect.bottom + 6,
    });
  }, [open, isMobile, maxHeight]);

  useEffect(() => {
    if (!open || isMobile) return;

    updatePosition();

    const handleOutside = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      close();
    };

    document.addEventListener("pointerdown", handleOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isMobile, updatePosition, close]);

  // If the viewport crosses the breakpoint while open, reset cleanly.
  useEffect(() => {
    if (open) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // --------------------------------------------------
  // Focus handling
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      if (autoFocusSearch && searchable) {
        searchRef.current?.focus();
      } else if (!isMobile) {
        triggerRef.current?.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [open, isMobile, autoFocusSearch, searchable]);

  useEffect(() => {
    if (activeIndex < 0) return;

    optionRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  // --------------------------------------------------
  // Selection
  // --------------------------------------------------

  const selectItem = useCallback(
    (item) => {
      if (!item || item.disabled) return;

      const isSelected = selectedSet.has(item.value);

      if (multiple) {
        const nextStrings = isSelected
          ? selectedValues.filter((v) => v !== item.value)
          : [...selectedValues, item.value];

        setValue(nextStrings.map(toRaw), {
          option: item.original,
          selected: !isSelected,
        });

        if (closeOnSelect) close(true);

        return;
      }

      setValue(item.raw, {
        option: item.original,
        selected: true,
      });

      close(true);
    },
    [
      multiple,
      selectedSet,
      selectedValues,
      setValue,
      toRaw,
      closeOnSelect,
      close,
    ]
  );

  const clear = (event) => {
    event?.stopPropagation();

    setValue(multiple ? [] : "", { cleared: true });
  };

  const removeItem = (event, item) => {
    event.stopPropagation();

    if (disabled) return;

    setValue(
      selectedValues.filter((v) => v !== item.value).map(toRaw),
      { removed: item.original }
    );
  };

  // --------------------------------------------------
  // Keyboard
  // --------------------------------------------------

  const moveActive = useCallback(
    (direction) => {
      const enabled = filteredItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.disabled);

      if (!enabled.length) {
        setActiveIndex(-1);
        return;
      }

      const current = enabled.findIndex(
        ({ index }) => index === activeIndex
      );

      const next =
        current === -1
          ? direction > 0
            ? 0
            : enabled.length - 1
          : (current + direction + enabled.length) % enabled.length;

      setActiveIndex(enabled[next].index);
    },
    [filteredItems, activeIndex]
  );

  const jumpActive = useCallback(
    (toEnd) => {
      const enabled = filteredItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.disabled);

      if (!enabled.length) return;

      setActiveIndex(
        toEnd ? enabled[enabled.length - 1].index : enabled[0].index
      );
    },
    [filteredItems]
  );

  const handleTriggerKeyDown = (event) => {
    if (disabled || loading) return;

    switch (event.key) {
      case "Enter":
      case " ": {
        event.preventDefault();

        if (!open) {
          show();
        } else if (activeIndex >= 0) {
          selectItem(filteredItems[activeIndex]);
        }

        break;
      }

      case "ArrowDown": {
        event.preventDefault();

        if (!open) show();
        else moveActive(1);

        break;
      }

      case "ArrowUp": {
        event.preventDefault();

        if (!open) show();
        else moveActive(-1);

        break;
      }

      case "Home": {
        if (!open) return;

        event.preventDefault();
        jumpActive(false);

        break;
      }

      case "End": {
        if (!open) return;

        event.preventDefault();
        jumpActive(true);

        break;
      }

      case "Escape": {
        if (!open) return;

        event.preventDefault();
        close(true);

        break;
      }

      case "Backspace": {
        if (multiple && !open && selectedValues.length) {
          setValue(selectedValues.slice(0, -1).map(toRaw));
        }

        break;
      }

      default:
        break;
    }
  };

  const handleSearchKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        break;

      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        break;

      case "Home":
      case "End":
        // Let Home/End move the text cursor while typing.
        break;

      case "Enter":
        event.preventDefault();

        if (activeIndex >= 0) {
          selectItem(filteredItems[activeIndex]);
        }

        break;

      case "Escape":
        event.preventDefault();
        close(true);
        break;

      default:
        break;
    }
  };

  // --------------------------------------------------
  // Display value
  // --------------------------------------------------

  const displayValue = renderValue
    ? renderValue(
        multiple
          ? selectedItems.map((item) => item.original)
          : selectedItems[0]?.original
      )
    : multiple
      ? null
      : selectedItems[0]?.label;

  const singleSelected = !multiple ? selectedItems[0] : null;

  // --------------------------------------------------
  // Option row (plain function, not a component, so rows never remount)
  // --------------------------------------------------

  const renderRow = (item, index) => {
    const selected = selectedSet.has(item.value);
    const active = activeIndex === index;
    const hasIcon = showIcon && item.icon;

    return (
      <button
        key={`${item.value}-${index}`}
        id={optionId(index)}
        ref={(element) => {
          optionRefs.current[index] = element;
        }}
        type="button"
        role="option"
        tabIndex={-1}
        aria-selected={selected}
        aria-disabled={item.disabled || undefined}
        disabled={item.disabled}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => selectItem(item)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2.5 text-left",
          isMobile ? "py-3" : "py-2.5",
          "transition-colors duration-100",
          active ? "bg-ink-100" : "bg-transparent",
          selected && "text-primary-700",
          item.disabled && "cursor-not-allowed opacity-40"
        )}
      >
        {multiple ? (
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
              selected
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-ink-300"
            )}
          >
            {selected && <Check size={11} strokeWidth={3} />}
          </span>
        ) : (
          <span className="w-4 shrink-0">
            {selected && (
              <Check
                size={15}
                strokeWidth={2}
                className="text-primary-600"
              />
            )}
          </span>
        )}

        {hasIcon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              selected
                ? "bg-primary-500/10 text-primary-600"
                : "bg-ink-100 text-ink-500"
            )}
          >
            {renderIcon(
              item.icon,
              "h-4 w-4",
              selected ? "text-primary-600" : item.color || "text-ink-500"
            )}
          </span>
        )}

        <span className="min-w-0 flex-1">
          {renderOption ? (
            renderOption({
              option: item.original,
              selected,
              active,
            })
          ) : (
            <>
              <span
                className={cn(
                  "block truncate text-[13px]",
                  selected
                    ? "font-medium text-primary-700"
                    : "font-normal text-ink-900"
                )}
              >
                {item.label}
              </span>

              {item.description && (
                <span className="mt-0.5 block truncate text-[11px] text-ink-600">
                  {item.description}
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  };

  // --------------------------------------------------
  // Shared panel content (desktop popover + mobile sheet)
  // --------------------------------------------------

  const renderPanelBody = () => (
    <>
      {searchable && (
        <div className="shrink-0 border-b border-ink-200/70 p-2">
          <div className="flex items-center gap-2.5 px-2.5">
            <Search size={15} className="shrink-0 text-ink-500" />

            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                const next = event.target.value;

                setQuery(next);
                setActiveIndex(-1);
                onSearchRef.current?.(next);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label="Search options"
              aria-controls={listId}
              aria-activedescendant={
                activeIndex >= 0 ? optionId(activeIndex) : undefined
              }
              className={cn(
                "min-w-0 flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-500",
                // 16px on mobile prevents iOS zoom-on-focus
                isMobile ? "h-11 text-base" : "h-9 text-[13px]"
              )}
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(-1);
                  onSearchRef.current?.("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-ink-500 hover:text-ink-900"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {multiple && selectedValues.length > 0 && (
        <div className="flex shrink-0 items-center justify-between border-b border-ink-200/70 px-3.5 py-2">
          <span className="text-[11px] text-ink-600">
            {selectedValues.length} selected
          </span>

          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
          >
            Clear selection
          </button>
        </div>
      )}

      <div
        id={listId}
        role="listbox"
        aria-label={label || placeholder}
        aria-multiselectable={multiple || undefined}
        className="min-h-0 flex-1 overflow-y-auto p-1.5"
        style={
          isMobile
            ? undefined
            : {
                maxHeight:
                  (position?.maxHeight ?? maxHeight) -
                  (searchable ? 54 : 0),
              }
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-ink-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-primary-600" />
            Loading options
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-4 py-9 text-center">
            <p className="text-[13px] font-medium text-ink-900">
              {emptyMessage}
            </p>

            <p className="mt-1 text-xs text-ink-600">
              {query
                ? "Try a different search term."
                : "There are no options to display."}
            </p>
          </div>
        ) : (
          filteredItems.map(renderRow)
        )}
      </div>
    </>
  );

  // --------------------------------------------------
  // Desktop popover
  // --------------------------------------------------

  const desktopMenu =
    !isMobile && open && position
      ? createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-[1000] flex flex-col overflow-hidden",
              "rounded-xl border border-ink-200",
              "bg-ink-50 text-ink-900",
              "shadow-xl shadow-black/[0.08]",
              "ring-1 ring-black/[0.02]",
              "animate-in fade-in-0 zoom-in-[0.99] duration-100"
            )}
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.openAbove
                ? {
                    bottom: window.innerHeight - position.anchor,
                    transformOrigin: "bottom center",
                  }
                : {
                    top: position.anchor,
                    transformOrigin: "top center",
                  }),
            }}
          >
            {renderPanelBody()}
          </div>,
          document.body
        )
      : null;

  // --------------------------------------------------
  // Mobile bottom sheet
  // --------------------------------------------------

  const mobileSheet = isMobile ? (
    <Modal
      isOpen={open}
      onClose={() => close(true)}
      position="bottom"
      size="full"
      closeOnOutsideClick
      showCloseButton={false}
      className="!mb-0 !max-h-[85vh] !max-w-[calc(100vw-24px)] !overflow-hidden !rounded-2xl !border !border-ink-200 !bg-ink-50 !shadow-actionMenu"
    >
      <div
        ref={menuRef}
        className="flex max-h-[85vh] flex-col bg-ink-50 text-ink-900"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-ink-200/70 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">
              {label || placeholder}
            </p>

            {multiple && (
              <p className="mt-0.5 text-xs text-ink-600">
                {selectedValues.length} selected
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => close(true)}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>

        {renderPanelBody()}

        {multiple && (
          <div className="shrink-0 border-t border-ink-200/70 p-3">
            <button
              type="button"
              onClick={() => close(true)}
              className="h-11 w-full rounded-lg bg-primary-600 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  ) : null;

  // --------------------------------------------------
  // Trigger
  // --------------------------------------------------

  return (
    <div ref={rootRef} className={cn("w-full min-w-0", className)}>
      {label && (
        <div className="mb-1.5">
          <label
            htmlFor={selectId}
            className="text-[13px] font-medium text-ink-900"
          >
            {label}

            {required && (
              <span className="ml-1 text-primary-600" aria-hidden="true">
                *
              </span>
            )}
          </label>

          {description && (
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {description}
            </p>
          )}
        </div>
      )}

      <button
        ref={triggerRef}
        id={selectId}
        name={name}
        type="button"
        disabled={disabled || loading}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && !isMobile && activeIndex >= 0
            ? optionId(activeIndex)
            : undefined
        }
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "group flex min-h-[44px] w-full items-center gap-3",
          "rounded-lg border bg-ink-50 px-3",
          "text-left transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30",
          error
            ? "border-red-500"
            : open
              ? "border-primary-500"
              : "border-ink-200 hover:border-ink-300",
          (disabled || loading) && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 py-2">
          {multiple && selectedItems.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {selectedItems.slice(0, maxDisplayed).map((item) => (
                <span
                  key={item.value}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-500/10 px-2 py-1 text-xs text-primary-700"
                >
                  {showIcon && item.icon && (
                    <span className="shrink-0">
                      {renderIcon(
                        item.icon,
                        "h-3.5 w-3.5",
                        "text-primary-600"
                      )}
                    </span>
                  )}

                  <span className="max-w-[110px] truncate">
                    {item.label}
                  </span>

                  <span
                    role="button"
                    aria-label={`Remove ${item.label}`}
                    onClick={(event) => removeItem(event, item)}
                    className="cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <X size={12} />
                  </span>
                </span>
              ))}

              {selectedItems.length > maxDisplayed && (
                <span className="text-xs text-ink-600">
                  +{selectedItems.length - maxDisplayed} more
                </span>
              )}
            </span>
          ) : displayValue ? (
            <>
              {showIcon && singleSelected?.icon && !renderValue && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600">
                  {renderIcon(
                    singleSelected.icon,
                    "h-4 w-4",
                    singleSelected.color || "text-primary-600"
                  )}
                </span>
              )}

              <span className="block min-w-0 flex-1 truncate text-[13px] text-ink-900">
                {displayValue}
              </span>
            </>
          ) : (
            <span className="block truncate text-[13px] text-ink-500">
              {placeholder}
            </span>
          )}
        </span>

        {clearable && selectedValues.length > 0 && !disabled && (
          <span
            role="button"
            aria-label="Clear selection"
            onClick={clear}
            className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={14} />
          </span>
        )}

        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center",
            "text-ink-500 transition-transform duration-150",
            open && "rotate-180 text-primary-600"
          )}
        >
          <ChevronDown size={16} strokeWidth={1.8} />
        </span>
      </button>

      {(error || hint) && (
        <p
          role={error ? "alert" : undefined}
          className={cn(
            "mt-1.5 text-xs leading-5",
            error ? "text-red-500" : "text-ink-500"
          )}
        >
          {error || hint}
        </p>
      )}

      {desktopMenu}
      {mobileSheet}
    </div>
  );
}

export default Select;
