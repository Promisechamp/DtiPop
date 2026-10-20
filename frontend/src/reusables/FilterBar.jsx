import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import {
  Search,
  SlidersHorizontal,
  RefreshCw,
		Loader,
  ChevronDown,
  X,
  Minus,
  Plus,
  RotateCcw,
  Table,
  Grid2X2,
} from 'lucide-react';

import { useBreakpoint } from './Breakpoint';

const cn = (...classes) => classes.filter(Boolean).join(' ');

/* -------------------------------------------------------------------------- */
/* SHARED STYLES                                                              */
/* -------------------------------------------------------------------------- */

const CONTROL_HEIGHT = 'h-11';

const CONTROL_BASE = [
  'rounded-xl',
  'transition-all duration-200',
  'focus-visible:outline-none',
  'focus-visible:ring-1',
  'focus-visible:ring-primary-500/50',
].join(' ');

/* -------------------------------------------------------------------------- */
/* SEARCH INPUT                                                               */
/* -------------------------------------------------------------------------- */

export function FilterSearchInput({
  value = '',
  onChange,
  placeholder = 'Search...',
  className = '',
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search
        size={17}
        strokeWidth={2}
        className={cn(
          'pointer-events-none absolute left-3.5 top-1/2',
          '-translate-y-1/2 text-ink-500',
          'transition-colors'
        )}
      />

      <input
        //type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          CONTROL_HEIGHT,
          CONTROL_BASE,
          'w-full border border-ink-200',
          'bg-ink-50 pl-10 pr-10',
          'text-sm font-semibold text-ink-900',
          'placeholder:font-medium placeholder:text-ink-400',
          'outline-none border-none',
          className
        )}
      />

      <AnimatePresence>
        {Boolean(value) && (
          <motion.button
            key="clear-search"
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange?.('')}
            className={cn(
              'absolute right-2 top-2',
              '-translate-y-2',
              'flex h-7 w-7 items-center justify-center',
														'bg-ink-400 text-white',
              'rounded-lg text-ink-500',
              'transition-colors',
              'hover:bg-primary-50 hover:text-primary-700',
              'focus-visible:outline-none focus-visible:ring-1',
              'focus-visible:ring-primary-500/30'
            )}
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FILTER CHIP                                                                */
/* -------------------------------------------------------------------------- */

export function FilterChip({
  label,
  onRemove,
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className={cn(
        'group inline-flex max-w-full items-center gap-2',
        'rounded-lg border border-primary-200',
        'bg-primary-50 py-1 pl-2.5 pr-1.5',
        'text-xs font-bold text-primary-800',
        'transition-colors'
      )}
    >
      <span className="max-w-[180px] truncate">
        {label}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center',
          'rounded-md text-primary-700',
          'transition-colors',
          'hover:bg-primary-200 hover:text-primary-900',
          'focus-visible:outline-none focus-visible:ring-1',
          'focus-visible:ring-primary-500/40'
        )}
        aria-label={`Remove ${label} filter`}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </motion.span>
  );
}










/* -------------------------------------------------------------------------- /
/ VIEW TOGGLE                                                                /
/ -------------------------------------------------------------------------- */

export function ViewToggle({
value = 'cards',
onChange,
options = [
{ value: 'table', label: 'Table', icon: Table },
{ value: 'cards', label: 'Cards', icon: Grid2X2 },
],
className = '',
disabled = false,
}) {
return (
<div
role="group"
aria-label="Choose display layout"
className={cn(
        'flex min-h-11 w-full items-center justify-betwee gap-0',
        'shadow-[0_0_5px_#0002] rounded-xl border border-ink-200',
        'bg-white ps-3 pe-1',
        'transition-colors',
        'hover:border-ink-300',
        className
      )}
>

<div className="min-w-0">
        <span className="block text-xs font-bold text-ink-700">
          View Mode
        </span>

        <span className="mt-0.5 block text-[10px] font-medium text-ink-400">
          Table | Card
        </span>
      </div>
						
						<div className='flex ml-auto'>
{options.map(({ value: optionValue, label, icon: Icon }) => {
const isActive = value === optionValue;

    return (
						
						
						<button
        key={optionValue}
        type="button"
        onClick={() => {
          if (!disabled && value !== optionValue) {
            onChange?.(optionValue);
          }
        }}
        disabled={disabled}
        aria-pressed={isActive}
        className={cn(
          'flex ms-1',
          'rounded-lg px-5 py-2 text-xs font-extrabold',
          'transition-all duration-200',
          'focus-visible:outline-none',
          'focus-visible:ring-1 focus-visible:ring-primary-500/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isActive
            ? 'bg-primary-50 border border-primary-200 text-primary-800 hover:bg-primary-100'
            : 'border border-ink-100 text-ink-500 hover:bg-ink-50 hover:text-ink-800'
        )}
      >
        {Icon && <Icon size={14} strokeWidth={2.2} />}
        <span>{label}</span>
      </button>
						
					
    );
  })}
			</div>
</div>

);
}









/* -------------------------------------------------------------------------- */
/* COLUMN STEPPER                                                             */
/* -------------------------------------------------------------------------- */

export function ColumnStepper({
  label = 'Columns',
  value,
  onChange,
  min = 1,
  max = 4,
  step = 1,
  disabled = false,
  className = '',
}) {
  const clamp = (next) =>
    Math.min(max, Math.max(min, next));

  const decrement = () => {
    if (disabled) return;

    const next = clamp(value - step);

    if (next === value) return;

    onChange?.(next);
  };

  const increment = () => {
    if (disabled) return;

    const next = clamp(value + step);

    if (next === value) return;

    onChange?.(next);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  const buttonClass = (inactive) =>
    cn(
      'flex h-8 w-8 items-center justify-center rounded-lg',
      'transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-1',
      'focus-visible:ring-primary-500/30',
      inactive
        ? 'cursor-not-allowed text-ink-300'
        : 'text-ink-600 hover:bg-primary-50 hover:text-primary-700 active:scale-95'
    );

  return (
    <div
      className={cn(
        'flex min-h-11 items-center justify-between gap-4',
        'shadow-[0_0_5px_#0002] rounded-xl border border-ink-200',
        'bg-white ps-3 pe-1',
        'transition-colors',
        'hover:border-ink-300',
        className
      )}
    >
      <div className="min-w-0">
        <span className="block text-xs font-bold text-ink-700">
          {label}
        </span>

        <span className="mt-0.5 block text-[10px] font-medium text-ink-400">
          Layout density
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-ink-200 bg-ink-50 p-0.5">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || atMin}
          className={buttonClass(disabled || atMin)}
          aria-label="Decrease columns"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>

        <motion.span
          key={value}
          initial={{ opacity: 0.5, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-6 text-center text-sm font-extrabold tabular-nums text-ink-900"
          aria-live="polite"
        >
          {value}
        </motion.span>

        <button
          type="button"
          onClick={increment}
          disabled={disabled || atMax}
          className={buttonClass(disabled || atMax)}
          aria-label="Increase columns"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RESPONSIVE GRID                                                             */
/* -------------------------------------------------------------------------- */

const DEFAULT_BREAKPOINT_COLS = {
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  '2xl': 4,
};

/**
 * Automatically follows the current breakpoint until the user
 * manually changes the column count.
 *
 * Calling reset() restores automatic responsive behavior.
 */
export function useResponsiveGrid({
  breakpointMap = DEFAULT_BREAKPOINT_COLS,
  min = 1,
  max = 4,
  initialCols,
} = {}) {
  const breakpoint = useBreakpoint();

  const responsiveCols = useMemo(
    () =>
      breakpointMap[breakpoint] ??
      breakpointMap.xl ??
      max,
    [breakpoint, breakpointMap, max]
  );

  const [gridCols, setGridColsState] = useState(
    () => Math.min(max, Math.max(min, initialCols ?? responsiveCols))
  );

  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (!isCustom) {
      setGridColsState(responsiveCols);
    }
  }, [responsiveCols, isCustom]);

  const setGridCols = useCallback(
    (next) => {
      setIsCustom(true);

      setGridColsState((prev) => {
        const requested =
          typeof next === 'function'
            ? next(prev)
            : next;

        const numeric = Number(requested);

        if (!Number.isFinite(numeric)) {
          return prev;
        }

        return Math.min(
          max,
          Math.max(min, numeric)
        );
      });
    },
    [min, max]
  );

  const reset = useCallback(() => {
    setIsCustom(false);
  }, []);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
    }),
    [gridCols]
  );

  return {
    gridCols,
    setGridCols,
    isCustom,
    reset,
    gridStyle,
    breakpoint,
  };
}

/* -------------------------------------------------------------------------- */
/* FILTER BAR                                                                 */
/* -------------------------------------------------------------------------- */

export default function FilterBar({
  /* Search */
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,

  /* Filters */
  filtersOpen = false,
  onToggleFilters,
  activeFilterCount = 0,

  /* Refresh */
  onRefresh,
  refreshing = false,
  showRefresh = true,

  /* Collapsible content */
  children,

  /* Active filters */
  activeFilters = [],
  onClearAll,

  /* Extras */
  className = '',
  rightSlot,
}) {
  const hasActiveFilters = activeFilters.length > 0;

  const hasCollapsible =
    Boolean(children) || hasActiveFilters;

  const hasActiveCount = activeFilterCount > 0;

  const showFilterButton = Boolean(onToggleFilters);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl',
        'border border-ink-200/80',
        'bg-white shadow-xs',
        className
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* MAIN TOOLBAR                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="p-3 sm:p-3.5">
        <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center">
          {showSearch && (
            <FilterSearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full lg:min-w-[200px]"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* Filters toggle */}

            {showFilterButton && (
              <button
                type="button"
                onClick={onToggleFilters}
                aria-expanded={filtersOpen}
                className={cn(
                  CONTROL_HEIGHT,
                  CONTROL_BASE,
                  'inline-flex min-w-0 flex-1 items-center',
                  'justify-center gap-2 px-3.5',
                  'border text-sm font-bold',
                  'sm:flex-none',
                  filtersOpen || hasActiveCount
                    ? [
                        'border-primary-200',
                        'bg-primary-50',
                        'text-primary-800',
                        'hover:bg-primary-100',
                      ].join(' ')
                    : [
                        'border-ink-200',
                        'bg-white',
                        'text-ink-700',
                        'hover:border-primary-200',
                        'hover:bg-primary-50',
                        'hover:text-primary-800',
                      ].join(' ')
                )}
              >
                <SlidersHorizontal
                  size={15}
                  strokeWidth={2.2}
                  className={
                    filtersOpen || hasActiveCount
                      ? 'text-primary-600'
                      : 'text-ink-500'
                  }
                />

                <span>Filters & Layouts</span>

                {hasActiveCount && (
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center',
                      'justify-center rounded-md px-1.5',
                      'bg-primary-600 text-[10px]',
                      'font-extrabold text-white'
                    )}
                  >
                    {activeFilterCount}
                  </span>
                )}

                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  className={cn(
                    'text-current transition-transform duration-200',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </button>
            )}

            {/* Refresh */}

            {showRefresh && (
  <button
    type="button"
    onClick={onRefresh}
    disabled={refreshing || !onRefresh}
    className={cn(
      CONTROL_HEIGHT,
      CONTROL_BASE,
      "inline-flex w-11 shrink-0",
      "items-center justify-center",
      "border border-ink-200 bg-white",
      "text-ink-600",
      "disabled:cursor-not-allowed",
      "disabled:opacity-50"
    )}
    aria-label={refreshing ? "Refreshing" : "Refresh"}
    title="Refresh"
  >
    {refreshing ? (
      <Loader
        size={16}
        strokeWidth={2.1}
        className="animate-spin text-primary-600"
      />
    ) : (
      <RefreshCw size={16} strokeWidth={2.1} />
    )}
  </button>
)}

            {rightSlot}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* ACTIVE FILTER SUMMARY                                          */}
        {/* -------------------------------------------------------------- */}

        {hasActiveFilters && !filtersOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
            <span className="mr-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
              Applied
            </span>

            <AnimatePresence initial={false}>
              {activeFilters.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  onRemove={chip.onRemove}
                />
              ))}
            </AnimatePresence>

            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className={cn(
                  'inline-flex items-center gap-1',
                  'rounded-lg px-2 py-1.5',
                  'text-xs font-bold text-ink-500',
                  'transition-colors',
                  'hover:bg-ink-50 hover:text-primary-700'
                )}
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* EXPANDABLE FILTER PANEL                                            */}
      {/* ------------------------------------------------------------------ */}

      {hasCollapsible && (
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: { duration: 0.25 },
                  opacity: { duration: 0.18, delay: 0.04 },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.2 },
                  opacity: { duration: 0.12 },
                },
              }}
              className="overflow-hidden"
            >
              <div className="border-t border-ink-200/70 bg-ink-50/70 p-3 sm:p-4">
                {/* Panel heading */}

                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center',
                        'justify-center rounded-lg',
                        'bg-primary-100 text-primary-700'
                      )}
                    >
                      <SlidersHorizontal
                        size={15}
                        strokeWidth={2.2}
                      />
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-ink-900">
                        Refine results
                      </h3>

                      <p className="text-[11px] font-medium text-ink-500">
                        Adjust your filters to find what you need.
                      </p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <span className="shrink-0 rounded-lg bg-primary-100 px-2 py-1 text-[10px] font-extrabold text-primary-700">
                      {activeFilters.length} applied
                    </span>
                  )}
                </div>

                {/* Filter controls supplied by parent */}

                {children && (
                  <div className="min-w-0">
                    {children}
                  </div>
                )}

                {/* Active filters */}

                {hasActiveFilters && (
                  <div
                    className={cn(
                      'mt-4 border-t border-ink-200/70 pt-3'
                    )}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Active filters
                      </span>

                      {onClearAll && (
                        <button
                          type="button"
                          onClick={onClearAll}
                          className={cn(
                            'inline-flex items-center gap-1',
                            'rounded-md px-1.5 py-1',
                            'text-xs font-bold text-ink-500',
                            'transition-colors',
                            'hover:bg-primary-50',
                            'hover:text-primary-700'
                          )}
                        >
                          <RotateCcw size={12} />
                          Reset all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <AnimatePresence initial={false}>
                        {activeFilters.map((chip) => (
                          <FilterChip
                            key={chip.key}
                            label={chip.label}
                            onRemove={chip.onRemove}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Panel footer */}

                {onClearAll && !hasActiveFilters && (
                  <div className="mt-4 flex justify-end border-t border-ink-200/70 pt-3">
                    <button
                      type="button"
                      onClick={onClearAll}
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        'rounded-lg px-2.5 py-1.5',
                        'text-xs font-bold text-ink-500',
                        'transition-colors',
                        'hover:bg-primary-50 hover:text-primary-700'
                      )}
                    >
                      <RotateCcw size={12} />
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}