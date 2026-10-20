import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";

import { supabase } from "@/services/api/supabase";

import { authAPI, usersAPI } from "@/services/api/dtiApi";
import { userSettingsAPI } from "@/services/api/sharedApi";

const AuthContext = createContext(null);

// ============================================================
// PERFORMANCE
// ============================================================

const logAuthPerformance = (label, startTime) => {
  try {
    const elapsed = performance.now() - startTime;

    if (import.meta.env.DEV) {
      console.debug(
        `[AUTH PERFORMANCE] ${label}: ${elapsed.toFixed(0)}ms`
      );
    }
  } catch {
    // Performance logging must never affect authentication.
  }
};

// ============================================================
// SETTINGS
// ============================================================

const DEFAULT_USER_SETTINGS = {
  theme: "default",
  email_notifications: true,
  in_app_notifications: true,
  language: "en",
};

const parseSettingValue = (value) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
};

const getApiErrorMessage = (
  error,
  fallback = "Settings request failed."
) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    (typeof error === "string" ? error : null) ||
    fallback
  );
};

// ============================================================
// ROLE HELPERS
// ============================================================

const normalizeRole = (role) => {
  if (typeof role !== "string" || !role.trim()) {
    return null;
  }

  const normalized = role.trim().toLowerCase();

  if (
    normalized === "authenticated" ||
    normalized === "anon"
  ) {
    return null;
  }

  return normalized;
};

const resolveRole = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    const candidates = [
      source.role,
      source.user_role,
      source.userRole,
      source.profile?.role,
      source.profile?.user_role,
      source.profile?.userRole,
    ];

    for (const candidate of candidates) {
      const role = normalizeRole(candidate);

      if (role) return role;
    }
  }

  return null;
};

const isExplicitAdmin = (source) => {
  if (!source || typeof source !== "object") {
    return false;
  }

  return (
    source.is_admin === true ||
    source.isAdmin === true ||
    source.profile?.is_admin === true ||
    source.profile?.isAdmin === true
  );
};

const resolveIsAdmin = (...sources) => {
  if (sources.some(isExplicitAdmin)) {
    return true;
  }

  const role = resolveRole(...sources);

  return role === "admin" || role === "super_admin";
};

// ============================================================
// LOCAL STORAGE
// ============================================================

const getCachedUser = () => {
  try {
    const value = localStorage.getItem("user");

    if (!value) return null;

    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const cacheUser = (userData) => {
  try {
    if (!userData) {
      localStorage.removeItem("user");
      return;
    }

    localStorage.setItem("user", JSON.stringify(userData));
  } catch {
    // Storage may be unavailable.
  }
};

const clearAuthStorage = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  } catch {
    // Ignore storage failures.
  }
};

// ============================================================
// TIMEOUT HELPER
// ============================================================

const withTimeout = (promise, ms, label = "request") => {
  let timeoutId;

  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(`${label} timed out after ${ms}ms`)
        );
      }, ms);
    }),
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {
  const initialCachedUser = getCachedUser();

  const [user, setUser] = useState(initialCachedUser);

  const [profile, setProfile] = useState(
    initialCachedUser?.profile || initialCachedUser
  );

  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [isAdmin, setIsAdmin] = useState(() =>
    initialCachedUser
      ? resolveIsAdmin(initialCachedUser)
      : false
  );

  const [userRole, setUserRole] = useState(
    () => resolveRole(initialCachedUser) || "user"
  );

  const [profileReady, setProfileReady] = useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const mountedRef = useRef(false);

  const profileRequestRef = useRef(null);

  const authGenerationRef = useRef(0);

  const lastResolvedUserIdRef = useRef(
    initialCachedUser?.id || null
  );

  const currentUserIdRef = useRef(
    initialCachedUser?.id || null
  );

  // ==========================================================
  // ROLE HELPERS
  // ==========================================================

  const getUserRole = useCallback((userData) => {
    return resolveRole(userData) || "user";
  }, []);

  const checkIsAdmin = useCallback((userData) => {
    return resolveIsAdmin(userData);
  }, []);

  // ==========================================================
  // FETCH USER SETTINGS
  // ==========================================================

  const fetchUserSettings = useCallback(async (userId) => {
    if (!userId) return {};

    const startTime = performance.now();

    try {
      /*
       * Settings are now accessed through the backend.
       *
       * Expected API response:
       * {
       *   settings: {
       *     theme: "dark",
       *     email_notifications: true,
       *     in_app_notifications: true,
       *     language: "en"
       *   }
       * }
       *
       * The controller may return the settings object directly
       * in response.data instead. Both shapes are supported.
       */

      const response = await userSettingsAPI.getAll();

      const responseData = response?.data;

      const settingsObject =
        responseData?.settings ??
        responseData?.data?.settings ??
        responseData?.data ??
        responseData;

      const parsed = parseSettingValue(settingsObject);

      logAuthPerformance("settings API query", startTime);

      return {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
      };
    } catch (err) {
      logAuthPerformance(
        "settings API query failed",
        startTime
      );

      if (import.meta.env.DEV) {
        console.warn(
          "[AUTH] Could not load settings:",
          getApiErrorMessage(err)
        );
      }

      /*
       * Keep the application usable if settings fail to load.
       * This fallback is not persisted to the database.
       */
      return { ...DEFAULT_USER_SETTINGS };
    }
  }, []);


  // ==========================================================
  // UPDATE ONE USER SETTING
  // ==========================================================


  const updateSetting = useCallback(async (key, value) => {
const userId = currentUserIdRef.current;

if (!userId) {
  throw new Error("You must be logged in to update settings.");
}

if (!Object.prototype.hasOwnProperty.call(DEFAULT_USER_SETTINGS, key)) {
  throw new Error(`Invalid setting key: ${key}`);
}

if (value === null || value === undefined) {
  throw new Error(`Invalid value for setting "${key}".`);
}

try {
  const response = await userSettingsAPI.update({
    [key]: value,
  });

  const responseData = response?.data;

  if (responseData?.success === false) {
    throw new Error(
      responseData.error || "Failed to update settings."
    );
  }

  const returnedSettings =
    responseData?.settings ??
    responseData?.data?.settings ??
    responseData?.data;

  if (
    mountedRef.current &&
    currentUserIdRef.current === userId &&
    returnedSettings &&
    typeof returnedSettings === "object" &&
    !Array.isArray(returnedSettings)
  ) {
    setSettings({
      ...DEFAULT_USER_SETTINGS,
      ...returnedSettings,
    });
  } else if (
    mountedRef.current &&
    currentUserIdRef.current === userId
  ) {
    setSettings((previous) => ({
      ...(previous || DEFAULT_USER_SETTINGS),
      [key]: value,
    }));
  }

  return {
    data: returnedSettings ?? { [key]: value },
    error: null,
  };
} catch (error) {
  console.error("[AUTH] Failed to update setting:", error);

  throw new Error(
    error?.response?.data?.error ||
      error?.message ||
      "Failed to update settings."
  );
}

}, []);
		
		
  // ==========================================================
  // LOAD SETTINGS IN BACKGROUND
  // ==========================================================

  const loadSettingsInBackground = useCallback(
    async (userId) => {
      if (!userId || !mountedRef.current) return;

      try {
        const settingsData =
          await fetchUserSettings(userId);

        if (!mountedRef.current) return;

        if (currentUserIdRef.current !== userId) {
          return;
        }

        setSettings(settingsData || {});
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error(
            "[AUTH] Background settings load failed:",
            err
          );
        }

        if (
          mountedRef.current &&
          currentUserIdRef.current === userId
        ) {
          setSettings({ ...DEFAULT_USER_SETTINGS });
        }
      }
    },
    [fetchUserSettings]
  );

  // ==========================================================
  // MERGE USER DATA
  // ==========================================================

  const mergeUserData = useCallback(
    (incomingUser, additionalSources = []) => {
      const cachedUser = getCachedUser();

      const sources = [
        cachedUser,
        ...additionalSources,
        incomingUser,
      ].filter(Boolean);

      const mergedUser = sources.reduce(
        (result, source) => ({
          ...result,
          ...source,
        }),
        {}
      );

      let resolvedRole = null;

      for (let i = sources.length - 1; i >= 0; i -= 1) {
        resolvedRole = resolveRole(sources[i]);

        if (resolvedRole) break;
      }

      resolvedRole = resolvedRole || "user";

      const authoritativeSources = [
        ...additionalSources,
        incomingUser,
      ].filter(Boolean);

      const authoritativeRole = resolveRole(
        ...authoritativeSources
      );

      let resolvedAdmin;

      if (authoritativeRole) {
        resolvedAdmin =
          authoritativeRole === "admin" ||
          authoritativeRole === "super_admin";
      } else if (
        authoritativeSources.some(isExplicitAdmin)
      ) {
        resolvedAdmin =
          authoritativeSources.some(isExplicitAdmin);
      } else {
        resolvedAdmin = resolveIsAdmin(...sources);
      }

      const nestedProfiles = sources
        .map((source) => source.profile)
        .filter(Boolean);

      const mergedProfile = nestedProfiles.reduce(
        (result, source) => ({
          ...result,
          ...source,
        }),
        {}
      );

      const profileSources = [
        ...additionalSources,
        incomingUser,
      ].filter(Boolean);

      for (
        let i = profileSources.length - 1;
        i >= 0;
        i -= 1
      ) {
        const source = profileSources[i];

        if (
          source.role ||
          source.user_role ||
          typeof source.is_admin === "boolean"
        ) {
          Object.assign(mergedProfile, source);
          break;
        }
      }

      mergedUser.profile = mergedProfile;
      mergedUser.role = resolvedRole;
      mergedUser.is_admin = Boolean(resolvedAdmin);

      return mergedUser;
    },
    []
  );

  // ==========================================================
  // SET USER DATA
  // ==========================================================

  const setUserData = useCallback(
    (
      userData,
      {
        loadSettings = true,
        clearError = false,
        additionalSources = [],
      } = {}
    ) => {
      if (!userData) {
        currentUserIdRef.current = null;

        setUser(null);
        setProfile(null);
        setSettings(null);
        setIsAdmin(false);
        setUserRole("user");

        lastResolvedUserIdRef.current = null;

        cacheUser(null);

        if (clearError) {
          setError(null);
        }

        return null;
      }

      if (!mountedRef.current) {
        return null;
      }

      const mergedUser = mergeUserData(
        userData,
        additionalSources
      );

      const resolvedRole = getUserRole(mergedUser);

      const resolvedAdmin = checkIsAdmin(mergedUser);

      const nextUserId = mergedUser.id || null;
      const previousUserId = currentUserIdRef.current;

      /*
       * Clear the previous account's settings immediately.
       * Never display another user's preferences while the
       * new account's settings are loading.
       */
      if (previousUserId !== nextUserId) {
        setSettings(null);
      }

      currentUserIdRef.current = nextUserId;
      lastResolvedUserIdRef.current = nextUserId;

      setUser(mergedUser);

      setProfile(
        mergedUser.profile &&
          Object.keys(mergedUser.profile).length > 0
          ? mergedUser.profile
          : mergedUser
      );

      setIsAdmin(resolvedAdmin);
      setUserRole(resolvedRole);

      cacheUser(mergedUser);

      if (loadSettings && mergedUser.id) {
        loadSettingsInBackground(mergedUser.id);
      }

      if (clearError) {
        setError(null);
      }

      return mergedUser;
    },
    [
      mergeUserData,
      getUserRole,
      checkIsAdmin,
      loadSettingsInBackground,
    ]
  );

  // ==========================================================
  // FETCH + STORE AUTHENTICATED PROFILE
  // ==========================================================

  const fetchAndStoreProfile = useCallback(async () => {
    if (profileRequestRef.current) {
      return profileRequestRef.current;
    }

    if (mountedRef.current) {
      setProfileReady(false);
    }

    const generation = authGenerationRef.current;

    const startTime = performance.now();

    const request = (async () => {
      try {
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "getSession"
        );

        if (sessionResult?.error) {
          throw sessionResult.error;
        }

        const session =
          sessionResult?.data?.session || null;

        const authUser = session?.user || null;

        if (!authUser?.id) {
          if (mountedRef.current) {
            setUserData(null, {
              loadSettings: false,
              clearError: true,
            });
          }

          return null;
        }

        let profileRow = null;

        try {
          const profileResult = await withTimeout(
            supabase
              .from("profiles")
              .select("*")
              .eq("id", authUser.id)
              .maybeSingle(),
            5000,
            "profiles fetch"
          );

          if (profileResult?.error) {
            console.error(
              "[AUTH] Supabase profile fetch failed:",
              profileResult.error
            );
          } else {
            profileRow = profileResult?.data || null;
          }
        } catch (err) {
          console.error(
            "[AUTH] Supabase profile fetch failed:",
            err.message
          );
        }

        let apiUser = null;
        let apiProfile = null;

        try {
          const apiResult = await withTimeout(
            authAPI.getMe(),
            5000,
            "authAPI.getMe"
          );

          apiUser = apiResult?.data?.user || null;

          apiProfile =
            apiResult?.data?.profile ||
            apiUser?.profile ||
            null;
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn(
              "[AUTH] Backend profile fetch failed:",
              err.message
            );
          }
        }

        if (
          !mountedRef.current ||
          generation !== authGenerationRef.current
        ) {
          return null;
        }

        const cachedUser = getCachedUser();

        const identityMatches =
          cachedUser?.id === authUser.id;

        const validCachedUser = identityMatches
          ? cachedUser
          : null;

        const validCachedProfile =
          validCachedUser?.profile || null;

        const authoritativeProfile =
          profileRow || apiProfile || null;

        const resolvedRole =
          resolveRole(
            profileRow,
            apiProfile,
            apiUser,
            validCachedProfile,
            validCachedUser
          ) || "user";

        let resolvedAdmin = false;

        if (profileRow) {
          resolvedAdmin = resolveIsAdmin(profileRow);
        } else if (apiProfile) {
          resolvedAdmin = resolveIsAdmin(apiProfile);
        } else if (apiUser) {
          resolvedAdmin =
            resolveRole(apiUser) === "admin" ||
            resolveRole(apiUser) === "super_admin" ||
            isExplicitAdmin(apiUser);
        } else if (validCachedUser) {
          resolvedAdmin = resolveIsAdmin(validCachedUser);
        }

        const finalUser = {
          ...(validCachedUser || {}),
          ...(authUser || {}),
          ...(apiUser || {}),
          ...(authoritativeProfile || {}),

          id: authUser.id,

          email:
            apiUser?.email ||
            authUser.email ||
            validCachedUser?.email ||
            null,

          role: resolvedRole,

          is_admin: Boolean(resolvedAdmin),
        };

        finalUser.profile = {
          ...(validCachedProfile || {}),
          ...(apiProfile || {}),
          ...(profileRow || {}),
        };

        finalUser.id = authUser.id;

        if (authoritativeProfile?.ban_status) {
          finalUser.ban_status =
            authoritativeProfile.ban_status;
        } else if (apiUser?.ban_status) {
          finalUser.ban_status = apiUser.ban_status;
        }

        if (import.meta.env.DEV) {
          console.debug("[AUTH] Resolved identity:", {
            id: finalUser.id,
            role: finalUser.role,
            is_admin: finalUser.is_admin,
            profileSource: profileRow
              ? "supabase.profiles"
              : apiProfile
                ? "backend.profile"
                : apiUser
                  ? "backend.user"
                  : "cache fallback",
          });
        }

        const storedUser = setUserData(finalUser, {
          loadSettings: true,
          clearError: true,
          additionalSources: [
            ...(apiProfile ? [apiProfile] : []),
            ...(profileRow ? [profileRow] : []),
          ],
        });

        logAuthPerformance(
          "fetchAndStoreProfile",
          startTime
        );

        return storedUser || finalUser;
      } catch (err) {
        console.error(
          "[AUTH] Profile resolution failed:",
          err
        );

        throw err;
      } finally {
        if (profileRequestRef.current === request) {
          profileRequestRef.current = null;
        }

        if (mountedRef.current) {
          setProfileReady(true);
        }
      }
    })();

    profileRequestRef.current = request;

    return request;
  }, [setUserData]);

  // ==========================================================
  // SIGN UP
  // ==========================================================

  const signUp = useCallback(
    async (
      email,
      password,
      fullName,
      additionalData = {}
    ) => {
      setProfileReady(false);

      try {
        const response = await authAPI.register({
          email,
          password,
          fullName,
          ...additionalData,
        });

        const {
          user: userData,
          session,
        } = response.data || {};

        if (
          session?.access_token &&
          session?.refresh_token
        ) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });

          if (sessionError) {
            throw sessionError;
          }
        }

        if (userData && mountedRef.current) {
          setUserData(userData, {
            loadSettings: true,
          });
        }

        try {
          await fetchAndStoreProfile();
        } catch (profileErr) {
          console.error(
            "[AUTH] Profile refresh after signup failed:",
            profileErr
          );
        }

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.message ||
          "Registration failed";

        setError(message);

        return {
          data: null,
          error: message,
        };
      } finally {
        if (mountedRef.current) {
          setProfileReady(true);
        }
      }
    },
    [setUserData, fetchAndStoreProfile]
  );

  // ==========================================================
  // SIGN IN
  // ==========================================================

  const signIn = useCallback(
    async (email, password) => {
      setProfileReady(false);
      setError(null);

      try {
        const response = await withTimeout(
          authAPI.login({
            email,
            password,
          }),
          10000,
          "authAPI.login"
        );

        const {
          user: userData,
          session,
        } = response.data || {};

        if (
          !session?.access_token ||
          !session?.refresh_token
        ) {
          throw new Error(
            "Login succeeded without a complete authentication session."
          );
        }

        const { error: sessionError } =
          await withTimeout(
            supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
            5000,
            "setSession"
          );

        if (sessionError) {
          throw sessionError;
        }

        localStorage.setItem(
          "token",
          session.access_token
        );

        localStorage.setItem(
          "refresh_token",
          session.refresh_token
        );

        const cachedUser = getCachedUser();

        if (
          cachedUser?.id &&
          userData?.id &&
          cachedUser.id !== userData.id
        ) {
          cacheUser(null);
        }

        if (userData && mountedRef.current) {
          setUserData(userData, {
            loadSettings: false,
          });
        }

        try {
          await fetchAndStoreProfile();
        } catch (profileErr) {
          console.error(
            "[AUTH] Profile refresh after login failed:",
            profileErr
          );

          throw new Error(
            "Login succeeded, but your profile could not be verified. Please try again."
          );
        }

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.message ||
          "Login failed";

        setError(message);

        return {
          data: null,
          error: message,
        };
      } finally {
        if (mountedRef.current) {
          setProfileReady(true);
        }
      }
    },
    [setUserData, fetchAndStoreProfile]
  );

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const signOut = useCallback(async () => {
    authGenerationRef.current += 1;

    try {
      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        console.error(
          "[AUTH] Supabase sign-out error:",
          signOutError
        );
      }

      await authAPI.logout().catch(() => {});
    } catch (err) {
      console.error("[AUTH] Logout error:", err);
    } finally {
      clearAuthStorage();

      if (mountedRef.current) {
        setUserData(null, {
          loadSettings: false,
          clearError: true,
        });

        setSettings(null);
        setError(null);
        setProfileReady(true);
        setLoading(false);
      }
    }
  }, [setUserData]);

  // ==========================================================
  // UPDATE PROFILE
  // ==========================================================

  const updateProfile = useCallback(
    async (data) => {
      try {
        const response =
          await usersAPI.updateProfile(data);

        const updatedProfile =
          response?.data?.profile ||
          response?.data?.user;

        if (!updatedProfile) {
          throw new Error(
            "Updated profile was not returned."
          );
        }

        setUserData(updatedProfile, {
          loadSettings: true,
          additionalSources: [updatedProfile],
        });

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.message ||
          "Update failed";

        setError(message);

        return {
          data: null,
          error: message,
        };
      }
    },
    [setUserData]
  );

  // ==========================================================
  // UPDATE LOCATION
  // ==========================================================

  const updateLocation = useCallback(
    async (locationData) => {
      if (!currentUserIdRef.current) {
        return {
          data: null,
          error: "No authenticated user.",
        };
      }

      try {
        const response =
          await usersAPI.updateLocation(locationData);

        const updatedLocation =
          response?.data?.location;

        if (!updatedLocation) {
          throw new Error(
            "Updated location was not returned."
          );
        }

        const updatedProfile = {
          ...(profile || {}),
          location: updatedLocation,
        };

        const updatedUser = {
          ...(user || {}),
          location: updatedLocation,

          profile: {
            ...(user?.profile || {}),
            location: updatedLocation,
          },
        };

        setUserData(updatedUser, {
          loadSettings: false,
          additionalSources: [updatedProfile],
        });

        if (mountedRef.current) {
          setProfile(updatedProfile);
        }

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.message ||
          "Failed to update location";

        console.error(
          "[AUTH] Location update failed:",
          err
        );

        setError(message);

        return {
          data: null,
          error: message,
        };
      }
    },
    [user, profile, setUserData]
  );

  // ==========================================================
  // ROLE HIERARCHY
  // ==========================================================

  const hasRole = useCallback(
    (requiredRole) => {
      if (!user) return false;

      const levels = {
        user: 0,
        admin: 1,
        super_admin: 2,
      };

      const currentRole =
        normalizeRole(userRole) || "user";

      const required =
        normalizeRole(requiredRole) || "user";

      return (
        (levels[currentRole] ?? 0) >=
        (levels[required] ?? 0)
      );
    },
    [user, userRole]
  );

  // ==========================================================
  // INITIAL AUTHENTICATION + SESSION EVENTS
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;
    let initTimeoutId;
    let signedInTimeoutId;

    const initAuth = async () => {
      const startTime = performance.now();

      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          7000,
          "initial getSession"
        );

        if (cancelled) return;

        if (result?.error) {
          throw result.error;
        }

        const session =
          result?.data?.session || null;

        if (!session) {
          clearAuthStorage();

          setUserData(null, {
            loadSettings: false,
            clearError: true,
          });

          setProfileReady(true);

          return;
        }

        localStorage.setItem(
          "token",
          session.access_token
        );

        if (session.refresh_token) {
          localStorage.setItem(
            "refresh_token",
            session.refresh_token
          );
        }

        await fetchAndStoreProfile();

        if (cancelled) return;

        logAuthPerformance(
          "initial authentication",
          startTime
        );
      } catch (err) {
        if (cancelled) return;

        console.error(
          "[AUTH] Initial authentication failed:",
          err
        );

        const sessionResult = await supabase.auth
          .getSession()
          .catch(() => null);

        if (cancelled) return;

        const activeSession =
          sessionResult?.data?.session || null;

        if (!activeSession) {
          clearAuthStorage();

          setUserData(null, {
            loadSettings: false,
            clearError: false,
          });
        }

        setError(
          err?.message ||
            "Authentication initialization failed."
        );

        setProfileReady(true);
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
          setProfileReady(true);
        }
      }
    };

    initTimeoutId = setTimeout(() => {
      if (!cancelled && mountedRef.current) {
        setLoading(false);
      }
    }, 1000);

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current || cancelled) {
          return;
        }

        if (event === "SIGNED_IN" && session) {
          localStorage.setItem(
            "token",
            session.access_token
          );

          if (session.refresh_token) {
            localStorage.setItem(
              "refresh_token",
              session.refresh_token
            );
          }

          signedInTimeoutId = setTimeout(() => {
            if (!mountedRef.current || cancelled) {
              return;
            }

            fetchAndStoreProfile().catch((err) => {
              console.error(
                "[AUTH] SIGNED_IN profile refresh failed:",
                err
              );

              if (mountedRef.current) {
                setProfileReady(true);
              }
            });
          }, 0);
        }

        if (
          event === "TOKEN_REFRESHED" &&
          session
        ) {
          localStorage.setItem(
            "token",
            session.access_token
          );

          if (session.refresh_token) {
            localStorage.setItem(
              "refresh_token",
              session.refresh_token
            );
          }
        }

        if (event === "SIGNED_OUT") {
          authGenerationRef.current += 1;

          clearAuthStorage();

          setUserData(null, {
            loadSettings: false,
            clearError: true,
          });

          setSettings(null);
          setProfileReady(true);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      mountedRef.current = false;

      clearTimeout(initTimeoutId);
      clearTimeout(signedInTimeoutId);

      subscription?.unsubscribe?.();
    };
  }, [fetchAndStoreProfile, setUserData]);

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value = useMemo(
    () => ({
      user,
      profile,
      settings,
      loading,
      error,

      isAuthenticated: Boolean(user?.id),

      isAdmin,
      userRole,
      profileReady,

      canAccessAdmin:
        Boolean(user?.id) &&
        (
          isAdmin ||
          userRole === "admin" ||
          userRole === "super_admin"
        ),

      signUp,
      signIn,
      signOut,

      updateProfile,
      updateLocation,
      updateSetting,

      hasRole,

      refreshUserData: fetchAndStoreProfile,
    }),
    [
      user,
      profile,
      settings,
      loading,
      error,
      isAdmin,
      userRole,
      profileReady,
      signUp,
      signIn,
      signOut,
      updateProfile,
      updateLocation,
      updateSetting,
      hasRole,
      fetchAndStoreProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// USE AUTH
// ============================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider."
    );
  }

  return context;
};