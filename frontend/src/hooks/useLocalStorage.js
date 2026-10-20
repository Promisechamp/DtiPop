import { useCallback, useState } from "react";

const VERSION = "v1"; // bump to invalidate all stored prefs

/**
 * Namespaced, versioned localStorage state. SSR-safe, fails silently.
 *
 * @param namespace  per-page bucket, e.g. "admin.users"
 * @param key        the actual pref key, e.g. "viewMode"
 * @param initialValue
 *
 * @returns [value, setValue]
 *   setValue(nextValue | (prev) => nextValue)
 */
export function useLocalStorage(namespace, key, initialValue) {
  const storageKey = `pref:${VERSION}:${namespace}:${key}`;

  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (updater) => {
      setValue((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          if (next === initialValue) {
            window.localStorage.removeItem(storageKey);
          } else {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          }
        } catch {
          /* quota exceeded / disabled — no-op */
        }
        return next;
      });
    },
    [storageKey, initialValue]
  );

  return [value, set];
}