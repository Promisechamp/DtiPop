// src/hooks/usePageState.js

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUrlState } from "./useUrlState";

const LS_VERSION = "v1";

/* =========================================================
   localStorage (namespaced JSON blob) — inlined
========================================================= */

function useLocalStorageNS(namespace, defaults) {
  const storageKey = `pref:${LS_VERSION}:${namespace}`;

  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  });

  const set = useCallback(
    (patch) => {
      setState((prev) => {
        const updates = typeof patch === "function" ? patch(prev) : patch;
        const next = { ...prev, ...updates };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* quota / disabled — no-op */
        }
        return next;
      });
    },
    [storageKey]
  );

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (e.key !== storageKey || !e.newValue) return;
      try {
        setState((prev) => ({ ...prev, ...JSON.parse(e.newValue) }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  return [state, set];
}

/* =========================================================
   usePageState
========================================================= */

const DEFAULT_UI = {
  viewMode: "table",
  gridCols: 1,
  filtersExpanded: false,
};

/**
 * One hook to own a page's state:
 *   - URL    → filters / sort / pagination
 *   - local  → UI prefs (viewMode, gridCols, filtersExpanded)
 *   - auto   → resets page → 1 when any filter key changes
 *
 * @param {string}   namespace    localStorage bucket, e.g. "admin.users"
 * @param {object}   urlDefaults  { search:"", role:"", page:1, ... }
 * @param {string[]} filterKeys   keys that reset page to 1 when changed
 * @param {string[]} debounce     url keys whose writes are debounced
 * @param {object}   uiDefaults   override defaults for ui prefs
 */
export function usePageState({
  namespace,
  urlDefaults,
  filterKeys = [],
  debounce = ["search"],
  uiDefaults = {},
}) {
  /* ---- URL state ---- */
  const [filters, setFilters] = useUrlState(urlDefaults, { debounce });

  /* ---- localStorage state (single JSON blob per namespace) ---- */
  const mergedUiDefaults = useMemo(
    () => ({ ...DEFAULT_UI, ...uiDefaults }),
    [uiDefaults]
  );
  const [ui, setUi] = useLocalStorageNS(namespace, mergedUiDefaults);

  /* ---- reset page when filters change ---- */
  const signature = filterKeys.map((k) => filters[k]).join("|");
  useEffect(() => {
    if ("page" in filters && filters.page !== 1) {
      setFilters({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  /* ---- per-key setter factory ---- */
  const slice = useCallback(
    (key) => (updater) =>
      setUi((prev) => ({
        [key]:
          typeof updater === "function" ? updater(prev[key]) : updater,
      })),
    [setUi]
  );

  return {
    filters,
    setFilters,

    ui,
    setUi,

    viewMode: ui.viewMode,
    setViewMode: slice("viewMode"),
    gridCols: ui.gridCols,
    setGridCols: slice("gridCols"),
    filtersExpanded: ui.filtersExpanded,
    setFiltersExpanded: slice("filtersExpanded"),
  };
}