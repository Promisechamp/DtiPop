import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function coerce(raw, def) {
  if (typeof def === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : def;
  }
  if (typeof def === "boolean") return raw === "true";
  return raw;
}

function useDebouncedCallback(fn, ms) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), ms);
    },
    [ms]
  );
}

/**
 * Filter/sort/page state stored in the URL query string.
 *
 * @param defaults  { [key: string]: string | number | boolean }
 * @param options.debounce   keys whose URL writes are debounced (e.g. ["search"])
 * @param options.replace    use history.replace instead of push (default true)
 *
 * @returns [state, setState]
 *   setState(patch | (prev) => patch)
 */
export function useUrlState(defaults, { debounce = [], replace = true } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setStateRaw] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const out = {};
    for (const [key, def] of Object.entries(defaults)) {
      const raw = params.get(key);
      out[key] = raw !== null ? coerce(raw, def) : def;
    }
    return out;
  });

  const publish = useCallback(
    (next) => {
      const params = new URLSearchParams(location.search);
      for (const [key, value] of Object.entries(next)) {
        if (value === defaults[key] || value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, { replace });
    },
    [location.pathname, location.search, navigate, defaults, replace]
  );

  const debouncedPublish = useDebouncedCallback(publish, 400);

  const setState = useCallback(
    (patch) => {
      setStateRaw((prev) => {
        const updates = typeof patch === "function" ? patch(prev) : patch;
        const next = { ...prev, ...updates };

        const debouncedKeys = new Set(debounce);
        const immediate = {};
        const delayed = {};

        for (const [k, v] of Object.entries(updates)) {
          if (debouncedKeys.has(k)) delayed[k] = v;
          else immediate[k] = v;
        }

        if (Object.keys(immediate).length) publish(immediate);
        if (Object.keys(delayed).length) debouncedPublish(delayed);

        return next;
      });
    },
    [debounce, publish, debouncedPublish]
  );

  // Sync from URL on back/forward
  useEffect(() => {
    setStateRaw((prev) => {
      const params = new URLSearchParams(location.search);
      let changed = false;
      const next = { ...prev };

      for (const [key, def] of Object.entries(defaults)) {
        const raw = params.get(key);
        const value = raw !== null ? coerce(raw, def) : def;
        if (prev[key] !== value) {
          next[key] = value;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [location.search, defaults]);

  return [state, setState];
}