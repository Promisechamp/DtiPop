import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Inbox,
  Check,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { renderIcon } from "@/utils/constantHelpers";
import Modal from "@/reusables/Modal";

const Select = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select...",
  label,
  error,
  required,
  className = "",
  multiple = false,
  searchable = false,
  disabled = false,
  showIcon = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const portalId = useRef(
    `select-portal-${Math.random().toString(36).slice(2, 9)}`
  ).current;

  // ─── Mobile detection ───
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Desktop position tracking ───
  const updateCoords = useCallback(() => {
    if (triggerRef.current && !isMobile) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isMobile]);

  useEffect(() => {
    if (isOpen && !isMobile) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, { capture: true });
    }

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !e.target.closest(`[data-select-portal="${portalId}"]`)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, { capture: true });
    };
  }, [isOpen, isMobile, updateCoords, portalId]);

  // Auto-focus search when opening
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen, searchable]);

  // ─── Filtering ───
  const filteredOptions = options.filter((option) => {
    if (!option) return false;
    const label = option.label || "";
    const description = option.description || "";
    const search = searchTerm.toLowerCase();
    return (
      label.toLowerCase().includes(search) ||
      description.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [filteredOptions.length, highlightedIndex]);

  const handleSelect = (option) => {
    if (!option) return;

    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const index = newValue.findIndex((v) => v === option.value);
      if (index > -1) newValue.splice(index, 1);
      else newValue.push(option.value);
      onChange(newValue);
    } else {
      onChange(option.value);
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
    }
  };

  const removeChip = (e, val) => {
    e.stopPropagation();
    if (!Array.isArray(value)) return;
    onChange(value.filter((v) => v !== val));
  };

  const clearSingle = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const selectedOptions = Array.isArray(value)
    ? options.filter((opt) => opt && value.includes(opt.value))
    : [];

  const selectedSingle = options.find((opt) => opt && opt.value === value);

  const hasValidOptions =
    Array.isArray(options) &&
    options.length > 0 &&
    options.some((opt) => opt && opt.label);

  // ─── Keyboard navigation ───
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case "Home":
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case "End":
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(filteredOptions.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
          triggerRef.current?.focus();
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  // ─── Shared option row ───
  const OptionRow = ({ option, index }) => {
    const isSelected = multiple
      ? Array.isArray(value) && value.includes(option.value)
      : value === option.value;
    const isHighlighted = index === highlightedIndex;

    return (
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        data-index={index}
        onClick={() => handleSelect(option)}
        onMouseEnter={() => setHighlightedIndex(index)}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 outline-none
          ${
            isSelected
              ? "bg-primary-50/70 ring-1 ring-inset ring-primary-200/80"
              : isHighlighted
              ? "bg-ink-50"
              : "hover:bg-ink-50/80 active:bg-ink-100"
          }`}
      >
        {showIcon && option.icon && (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors
              ${
                isSelected
                  ? "bg-white shadow-sm ring-1 ring-primary-100"
                  : "bg-ink-100 group-hover:bg-white group-hover:shadow-sm"
              }`}
          >
            {renderIcon(
              option.icon,
              "w-4 h-4",
              isSelected ? "text-primary-600" : option.color || "text-ink-500"
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span
            className={`block truncate text-sm ${
              isSelected
                ? "font-semibold text-primary-700"
                : "font-medium text-ink-800"
            }`}
          >
            {option.label || "Unnamed"}
          </span>
          {option.description && (
            <span
              className={`block truncate text-xs mt-0.5 ${
                isSelected ? "text-primary-500/90" : "text-ink-400"
              }`}
            >
              {option.description}
            </span>
          )}
        </div>

        {isSelected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  // ─── Options list ───
  const renderOptions = () => (
    <>
      {searchable && (
        <div className="sticky top-0 z-10 border-b border-ink-100 bg-white/90 backdrop-blur-md p-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-ink-200 bg-ink-50/60 py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-500/15"
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
              aria-autocomplete="list"
            />
          </div>
        </div>
      )}

      <div
        ref={listRef}
        role="listbox"
        aria-multiselectable={multiple}
        className="overflow-y-auto flex-1 p-1.5 scrollbar-thin"
      >
        {filteredOptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100/80">
              <Inbox className="h-5 w-5 text-ink-400" />
            </div>
            <p className="text-sm font-medium text-ink-500">No options found</p>
            {searchTerm && (
              <p className="text-xs text-ink-400">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredOptions.map((option, idx) => (
              <OptionRow key={option.value ?? idx} option={option} index={idx} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  // ─── Multi-select chips ───
  const renderChips = () => {
    if (selectedOptions.length === 0) {
      return <span className="truncate text-sm text-ink-400">{placeholder}</span>;
    }

    const visible = selectedOptions.slice(0, 2);
    const remaining = selectedOptions.length - 2;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((opt) => (
          <span
            key={opt.value}
            className="group/chip inline-flex items-center gap-1 rounded-lg bg-primary-50 py-1 pl-2 pr-1 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-100"
          >
            {showIcon && opt.icon && (
              <span className="shrink-0">
                {renderIcon(opt.icon, "w-3.5 h-3.5", "text-primary-600")}
              </span>
            )}
            <span className="max-w-[90px] truncate">{opt.label}</span>
            <button
              type="button"
              onClick={(e) => removeChip(e, opt.value)}
              className="flex h-4 w-4 items-center justify-center rounded-md text-primary-500 transition-colors hover:bg-primary-100 hover:text-primary-700"
              aria-label={`Remove ${opt.label}`}
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center rounded-lg bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-600">
            +{remaining} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}

      {/* ─── Trigger ─── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? portalId : undefined}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`group flex w-full min-h-[46px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left transition-all duration-150 outline-none
          ${
            disabled
              ? "cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400"
              : isOpen
              ? "cursor-pointer border-primary-400 bg-white ring-4 ring-primary-500/10"
              : "cursor-pointer border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/30"
          }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {multiple ? (
            renderChips()
          ) : selectedSingle ? (
            <>
              {showIcon && selectedSingle.icon && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100">
                  {renderIcon(
                    selectedSingle.icon,
                    "w-4 h-4",
                    selectedSingle.color || "text-ink-600"
                  )}
                </div>
              )}
              <span
                className={`truncate text-sm font-medium ${
                  disabled ? "text-ink-400" : "text-ink-900"
                }`}
              >
                {selectedSingle.label}
              </span>
            </>
          ) : (
            <span className="truncate text-sm text-ink-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!multiple && selectedSingle && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clearSingle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  clearSingle(e);
                }
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          )}

          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-all duration-200
              ${
                isOpen
                  ? "bg-primary-50 text-primary-600 rotate-180"
                  : "group-hover:bg-ink-100 group-hover:text-ink-600"
              }`}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
          </span>
        </div>
      </button>

      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* ─── MOBILE: bottom sheet ─── */}
      {isMobile && (
        <Modal
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            setSearchTerm("");
            setHighlightedIndex(-1);
          }}
          position="bottom"
          size="full"
          closeOnOutsideClick
          showCloseButton={false}
          className="!mb-5 !rounded-3xl !max-w-[90vw] !max-h-[85vh] !overflow-hidden !border-ink-200 !shadow-2xl"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-bold text-ink-800">
                {label || placeholder}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm("");
                  setHighlightedIndex(-1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
            {renderOptions()}
          </div>
        </Modal>
      )}

      {/* ─── DESKTOP: portal ─── */}
      {!isMobile &&
        isOpen &&
        !disabled &&
        hasValidOptions &&
        createPortal(
          <div
            data-select-portal={portalId}
            id={portalId}
            className="fixed z-[100] flex max-h-72 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-ink-900/5 animate-in fade-in-0 zoom-in-95"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              minWidth: "220px",
            }}
          >
            {renderOptions()}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;