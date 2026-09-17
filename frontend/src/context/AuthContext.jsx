import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';

import { supabase } from '@/services/api/supabase';
import { authAPI, usersAPI} from '@/services/api/dtiApi';

const AuthContext = createContext(null);

// ============================================================
// CONFIG
// ============================================================

const AUTH_DEBUG = true;

// ============================================================
// PERFORMANCE LOGGER
// ============================================================

const logAuthPerformance = (label, startTime) => {
  if (!AUTH_DEBUG) return;

  const elapsed = performance.now() - startTime;

  console.log(
    `%c[AUTH] ${label}: ${elapsed.toFixed(0)}ms`,
    'color: #6366f1; font-weight: 600;'
  );
};

// ============================================================
// SETTINGS
// ============================================================

const parseSettingValue = (rawValue) => rawValue;

// ============================================================
// ROLE HELPERS
// ============================================================

const normalizeRole = (role) => {
  if (!role) return null;

  return String(role)
    .trim()
    .toLowerCase();
};

/**
 * Resolve a role from all possible locations.
 *
 * This is intentionally defensive because different API
 * responses may place the role in different objects.
 */
const resolveRole = (...sources) => {
  for (const source of sources) {
    if (!source) continue;

    const possibleRole =
      source?.role ??
      source?.user_role ??
      source?.userRole ??
      source?.profile?.role ??
      source?.profile?.user_role ??
      source?.profile?.userRole;

    if (possibleRole) {
      return normalizeRole(possibleRole);
    }
  }

  return null;
};

/**
 * Determine whether a user has administrative privileges.
 *
 * Both admin and super_admin are considered administrators.
 */
const resolveIsAdmin = (...sources) => {
  const role = resolveRole(...sources);

  for (const source of sources) {
    if (!source) continue;

    if (source?.is_admin === true) {
      return true;
    }

    if (source?.isAdmin === true) {
      return true;
    }

    if (source?.profile?.is_admin === true) {
      return true;
    }
  }

  return (
    role === 'admin' ||
    role === 'super_admin'
  );
};

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

const getCachedUser = () => {
  try {
    const cachedUser = localStorage.getItem('user');

    if (!cachedUser) {
      return null;
    }

    return JSON.parse(cachedUser);
  } catch (error) {
    console.warn(
      '[AUTH] Failed to read cached user:',
      error
    );

    return null;
  }
};

const cacheUser = (userData) => {
  try {
    if (!userData) {
      localStorage.removeItem('user');
      return;
    }

    localStorage.setItem(
      'user',
      JSON.stringify(userData)
    );
  } catch (error) {
    console.error(
      '[AUTH] Failed to cache user:',
      error
    );
  }
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {
  // ==========================================================
  // INITIAL CACHE
  // ==========================================================

  const initialCachedUser = getCachedUser();

  // ==========================================================
  // USER
  // ==========================================================

  const [user, setUser] = useState(
    initialCachedUser
  );

  // ==========================================================
  // PROFILE
  // ==========================================================

  const [profile, setProfile] = useState(
    initialCachedUser
  );

  // ==========================================================
  // SETTINGS
  // ==========================================================

  const [settings, setSettings] = useState(null);

  // ==========================================================
  // LOADING
  // ==========================================================

  /*
   * If a cached user exists, the application can immediately
   * render using the cached authentication state.
   */
  const [loading, setLoading] = useState(
    !initialCachedUser
  );

  // ==========================================================
  // ERROR
  // ==========================================================

  const [error, setError] = useState(null);

  // ==========================================================
  // ADMIN STATE
  // ==========================================================

  const [isAdmin, setIsAdmin] = useState(() => {
    if (!initialCachedUser) {
      return false;
    }

    return resolveIsAdmin(initialCachedUser);
  });

  // ==========================================================
  // ROLE
  // ==========================================================

  const [userRole, setUserRole] = useState(() => {
    if (!initialCachedUser) {
      return 'user';
    }

    return (
      resolveRole(initialCachedUser) ||
      'user'
    );
  });

  // ==========================================================
  // REFS
  // ==========================================================

  const mountedRef = useRef(true);

  const profileRequestRef = useRef(null);

  const initializedRef = useRef(false);

  // ==========================================================
  // GET USER ROLE
  // ==========================================================

  const getUserRole = useCallback(
    (userData) => {
      return (
        resolveRole(userData) ||
        'user'
      );
    },
    []
  );

  // ==========================================================
  // CHECK ADMIN
  // ==========================================================

  const checkIsAdmin = useCallback(
    (userData) => {
      return resolveIsAdmin(userData);
    },
    []
  );

  // ==========================================================
  // FETCH SETTINGS
  // ==========================================================

  const fetchUserSettings = useCallback(
    async (userId) => {
      if (!userId) {
        return {};
      }

      const startTime = performance.now();

      try {
        const {
          data,
          error: settingsError,
        } = await supabase
          .from('user_settings')
          .select('key, value')
          .eq('user_id', userId);

        logAuthPerformance(
          'user_settings query',
          startTime
        );

        if (settingsError) {
          throw settingsError;
        }

        const settingsObj = {};

        (data || []).forEach((row) => {
          settingsObj[row.key] =
            parseSettingValue(row.value);
        });

        return settingsObj;
      } catch (err) {
        logAuthPerformance(
          'user_settings query failed',
          startTime
        );

        console.error(
          '[AUTH] Error fetching settings:',
          err
        );

        return {};
      }
    },
    []
  );

  // ==========================================================
  // LOAD SETTINGS IN BACKGROUND
  // ==========================================================

  const loadSettingsInBackground = useCallback(
    async (userId) => {
      if (
        !userId ||
        !mountedRef.current
      ) {
        return;
      }

      try {
        const settingsData =
          await fetchUserSettings(userId);

        if (!mountedRef.current) {
          return;
        }

        setSettings(
          settingsData || {}
        );
      } catch (err) {
        console.error(
          '[AUTH] Background settings load failed:',
          err
        );

        if (mountedRef.current) {
          setSettings({});
        }
      }
    },
    [fetchUserSettings]
  );

  // ==========================================================
  // UPDATE SETTING
  // ==========================================================

  const updateSetting = useCallback(
    async (key, value) => {
      if (!user) {
        return {
          data: null,
          error: 'No user',
        };
      }

      try {
        const {
          data,
          error: settingError,
        } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              key,
              value,
            },
            {
              onConflict:
                'user_id, key',
            }
          )
          .select()
          .single();

        if (settingError) {
          throw settingError;
        }

        if (mountedRef.current) {
          setSettings((previous) => ({
            ...(previous || {}),
            [key]: value,
          }));
        }

        return {
          data,
          error: null,
        };
      } catch (err) {
        console.error(
          '[AUTH] Error updating setting:',
          err
        );

        return {
          data: null,
          error: err.message,
        };
      }
    },
    [user]
  );

  // ==========================================================
  // MERGE USER DATA
  // ==========================================================

  /**
   * CRITICAL:
   *
   * Never blindly replace the existing authenticated user
   * with a partial API response.
   *
   * Example:
   *
   * Cached:
   * {
   *   id: "...",
   *   role: "super_admin"
   * }
   *
   * API:
   * {
   *   id: "...",
   *   name: "Promise"
   * }
   *
   * Result:
   * {
   *   id: "...",
   *   name: "Promise",
   *   role: "super_admin"
   * }
   */
  const mergeUserData = useCallback(
    (incomingUser, additionalSources = []) => {
      const currentUser = getCachedUser();

      const sources = [
        currentUser,
        user,
        ...additionalSources,
        incomingUser,
      ].filter(Boolean);

      // --------------------------------------------------------
      // Resolve role
      // --------------------------------------------------------

      const resolvedRole =
        sources
          .map((source) =>
            resolveRole(source)
          )
          .find(Boolean) || 'user';

      // --------------------------------------------------------
      // Resolve admin
      // --------------------------------------------------------

      const resolvedAdmin =
        sources.some(
          (source) =>
            source?.is_admin === true ||
            source?.isAdmin === true ||
            source?.profile?.is_admin === true
        ) ||
        resolvedRole === 'admin' ||
        resolvedRole === 'super_admin';

      // --------------------------------------------------------
      // Merge all objects
      // --------------------------------------------------------

      const mergedUser = sources.reduce(
        (result, source) => ({
          ...result,
          ...(source || {}),
        }),
        {}
      );

      // --------------------------------------------------------
      // If a nested profile exists, preserve it too.
      // --------------------------------------------------------

      const nestedProfile =
        sources
          .map(
            (source) =>
              source?.profile
          )
          .find(Boolean);

      if (nestedProfile) {
        mergedUser.profile = {
          ...nestedProfile,
        };
      }

      // --------------------------------------------------------
      // Force canonical role fields
      // --------------------------------------------------------

      mergedUser.role =
        resolvedRole;

      mergedUser.is_admin =
        Boolean(resolvedAdmin);

      return mergedUser;
    },
    [user]
  );

  // ==========================================================
  // STORE USER DATA
  // ==========================================================

  const setUserData = useCallback(
    (
      userData,
      options = {}
    ) => {
      const {
        loadSettings = true,
        clearError = false,
        additionalSources = [],
      } = options;

      // --------------------------------------------------------
      // CLEAR USER
      // --------------------------------------------------------

      if (!userData) {
        setUser(null);
        setProfile(null);
        setSettings(null);
        setIsAdmin(false);
        setUserRole('user');

        cacheUser(null);

        if (clearError) {
          setError(null);
        }

        return;
      }

      if (!mountedRef.current) {
        return;
      }

      // --------------------------------------------------------
      // MERGE USER
      // --------------------------------------------------------

      const mergedUser =
        mergeUserData(
          userData,
          additionalSources
        );

      // --------------------------------------------------------
      // Resolve role
      // --------------------------------------------------------

      const resolvedRole =
        getUserRole(mergedUser);

      // --------------------------------------------------------
      // Resolve admin
      // --------------------------------------------------------

      const resolvedAdmin =
        checkIsAdmin(mergedUser);

      // --------------------------------------------------------
      // Update state
      // --------------------------------------------------------

      setUser(mergedUser);

      /*
       * Profile remains the actual profile returned by the
       * backend when available.
       *
       * If the backend doesn't return a separate profile,
       * use the merged user.
       */
      const resolvedProfile =
        userData?.profile ||
        userData ||
        mergedUser;

      setProfile(
        resolvedProfile
      );

      setIsAdmin(
        resolvedAdmin
      );

      setUserRole(
        resolvedRole
      );

      // --------------------------------------------------------
      // IMPORTANT: update localStorage with the MERGED user.
      // --------------------------------------------------------

      cacheUser(mergedUser);

      // --------------------------------------------------------
      // Load settings
      // --------------------------------------------------------

      if (
        loadSettings &&
        mergedUser.id
      ) {
        loadSettingsInBackground(
          mergedUser.id
        );
      }

      if (clearError) {
        setError(null);
      }
    },
    [
      mergeUserData,
      getUserRole,
      checkIsAdmin,
      loadSettingsInBackground,
    ]
  );

  // ==========================================================
  // FETCH + STORE PROFILE
  // ==========================================================

  const fetchAndStoreProfile =
    useCallback(async () => {
      /*
       * Prevent duplicate requests.
       */
      if (profileRequestRef.current) {
        return profileRequestRef.current;
      }

      const request = (async () => {
        const startTime =
          performance.now();

        try {
          console.log(
            '%c[AUTH] Fetching authenticated profile...',
            'color: #6366f1; font-weight: 600;'
          );

          const response =
            await authAPI.getMe();

          logAuthPerformance(
            'authAPI.getMe()',
            startTime
          );

          // ----------------------------------------------------
          // Possible backend response shapes:
          //
          // {
          //   user: {...},
          //   profile: {...}
          // }
          //
          // or
          //
          // {
          //   user: {
          //      ...,
          //      profile: {...}
          //   }
          // }
          // ----------------------------------------------------

          const responseUser =
            response?.data?.user ||
            null;

          const responseProfile =
            response?.data?.profile ||
            responseUser?.profile ||
            null;

          if (
            !responseUser &&
            !responseProfile
          ) {
            throw new Error(
              'Authenticated user profile was not returned'
            );
          }

          // ----------------------------------------------------
          // Get cached user BEFORE merging.
          // ----------------------------------------------------

          const cachedUser =
            getCachedUser();

          // ----------------------------------------------------
          // Resolve role from EVERY available source.
          // ----------------------------------------------------

          const resolvedRole =
            resolveRole(
              responseUser,
              responseProfile,
              responseUser?.profile,
              cachedUser
            ) || 'user';

          // ----------------------------------------------------
          // Resolve admin.
          // ----------------------------------------------------

          const resolvedAdmin =
            resolveIsAdmin(
              responseUser,
              responseProfile,
              responseUser?.profile,
              cachedUser
            );

          // ----------------------------------------------------
          // Build final user.
          // ----------------------------------------------------

          const finalUser = {
            ...(cachedUser || {}),
            ...(responseProfile || {}),
            ...(responseUser || {}),
          };

          /*
           * If profile is returned separately, preserve it.
           */
          if (responseProfile) {
            finalUser.profile = {
              ...(cachedUser?.profile || {}),
              ...(responseProfile || {}),
            };
          }

          /*
           * CRITICAL:
           *
           * Never let a missing role become "user".
           */
          finalUser.role =
            resolvedRole;

          finalUser.is_admin =
            Boolean(resolvedAdmin);

          // ----------------------------------------------------
          // Debug information
          // ----------------------------------------------------

          if (AUTH_DEBUG) {
            console.log(
              '%c[AUTH] Profile resolved:',
              'color: #16a34a; font-weight: 600;',
              {
                id: finalUser.id,
                email: finalUser.email,
                role: finalUser.role,
                is_admin:
                  finalUser.is_admin,
              }
            );
          }

          // ----------------------------------------------------
          // Store
          // ----------------------------------------------------

          if (mountedRef.current) {
            setUserData(
              finalUser,
              {
                loadSettings: true,
              }
            );

            cacheUser(
              finalUser
            );
          }

          return finalUser;
        } catch (err) {
          logAuthPerformance(
            'authAPI.getMe() failed',
            startTime
          );

          console.error(
            '[AUTH] Failed to fetch user profile:',
            err
          );

          throw err;
        } finally {
          profileRequestRef.current =
            null;
        }
      })();

      profileRequestRef.current =
        request;

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
      const startTime =
        performance.now();

      try {
        const response =
          await authAPI.register({
            email,
            password,
            fullName,
            ...additionalData,
          });

        const {
          user: userData,
          session,
        } = response.data;

        logAuthPerformance(
          'registration API',
          startTime
        );

        if (
          session?.access_token
        ) {
          await supabase.auth.setSession({
            access_token:
              session.access_token,
            refresh_token:
              session.refresh_token,
          });
        }

        if (userData) {
          setUserData(
            userData,
            {
              loadSettings: true,
            }
          );

          /*
           * setUserData already caches the merged
           * user.
           */
        }

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Registration failed';

        setError(
          errorMessage
        );

        return {
          data: null,
          error: errorMessage,
        };
      }
    },
    [setUserData]
  );

  // ==========================================================
  // SIGN IN
  // ==========================================================

  const signIn = useCallback(
    async (
      email,
      password
    ) => {
      const startTime =
        performance.now();

      try {
        const response =
          await authAPI.login({
            email,
            password,
          });

        const {
          user: userData,
          session,
        } = response.data;

        logAuthPerformance(
          'login API',
          startTime
        );

        if (
          !session?.access_token
        ) {
          throw new Error(
            'No access token'
          );
        }

        // ------------------------------------------------------
        // Set Supabase session
        // ------------------------------------------------------

        await supabase.auth.setSession({
          access_token:
            session.access_token,
          refresh_token:
            session.refresh_token,
        });

        // ------------------------------------------------------
        // Cache tokens
        // ------------------------------------------------------

        localStorage.setItem(
          'token',
          session.access_token
        );

        if (
          session.refresh_token
        ) {
          localStorage.setItem(
            'refresh_token',
            session.refresh_token
          );
        }

        // ------------------------------------------------------
        // Store user
        // ------------------------------------------------------

        if (userData) {
          setUserData(
            userData,
            {
              loadSettings: true,
            }
          );
        }

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Login failed';

        setError(
          errorMessage
        );

        return {
          data: null,
          error: errorMessage,
        };
      }
    },
    [setUserData]
  );

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const signOut = useCallback(
    async () => {
      try {
        await supabase.auth.signOut();

        await authAPI
          .logout()
          .catch(() => {});
      } catch (err) {
        console.error(
          '[AUTH] Logout error:',
          err
        );
      } finally {
        localStorage.removeItem(
          'token'
        );

        localStorage.removeItem(
          'refresh_token'
        );

        localStorage.removeItem(
          'user'
        );

        if (mountedRef.current) {
          setUserData(
            null,
            {
              loadSettings: false,
              clearError: true,
            }
          );

          setSettings(null);
          setError(null);
        }
      }
    },
    [setUserData]
  );

  // ==========================================================
  // UPDATE PROFILE
  // ==========================================================

  const updateProfile = useCallback(
    async (data) => {
      try {
        const response =
          await usersAPI.updateProfile(
            data
          );

        /*
         * Depending on your backend, the updated object
         * may be returned as `profile` or `user`.
         */
        const updatedProfile =
          response?.data?.profile ||
          response?.data?.user;

        if (!updatedProfile) {
          throw new Error(
            'Updated profile was not returned'
          );
        }

        /*
         * IMPORTANT:
         *
         * Don't let a profile update remove role.
         */
        setUserData(
          updatedProfile,
          {
            loadSettings: true,
          }
        );

        setError(null);

        return {
          data: response.data,
          error: null,
        };
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Update failed';

        setError(
          errorMessage
        );

        return {
          data: null,
          error: errorMessage,
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
    if (!user?.id) {
      return {
        data: null,
        error: 'No authenticated user',
      };
    }

    try {
      const response =
        await usersAPI.updateLocation(
          locationData
        );

      /*
       * Expected backend response:
       *
       * {
       *   success: true,
       *   location: {...}
       * }
       */

      const updatedLocation =
        response?.data?.location;

      if (!updatedLocation) {
        throw new Error(
          'Updated location was not returned'
        );
      }

      /*
       * Update the authenticated user/profile immediately.
       *
       * We don't want the UI to wait for another
       * /users/me request.
       */
      const updatedProfile = {
        ...(profile || {}),
        location: updatedLocation,
      };

      const updatedUser = {
        ...(user || {}),
        location: updatedLocation,
        profile: user?.profile
          ? {
              ...user.profile,
              location: updatedLocation,
            }
          : undefined,
      };

      /*
       * setUserData performs the existing merge logic,
       * preserves role/admin information, and updates
       * localStorage.
       */
      setUserData(
        updatedUser,
        {
          loadSettings: false,
          additionalSources: [
            updatedProfile,
          ],
        }
      );

      /*
       * Explicitly keep profile state synchronized.
       */
      if (mountedRef.current) {
        setProfile(
          updatedProfile
        );
      }

      setError(null);

      return {
        data: response.data,
        error: null,
      };
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to update location';

      console.error(
        '[AUTH] Location update failed:',
        err
      );

      setError(
        errorMessage
      );

      return {
        data: null,
        error: errorMessage,
      };
    }
  },
  [
    user,
    profile,
    setUserData,
  ]
);

  // ==========================================================
  // ROLE HIERARCHY
  // ==========================================================

  const hasRole = useCallback(
    (requiredRole) => {
      if (!user) {
        return false;
      }

      const levels = {
        user: 0,
        admin: 1,
        super_admin: 2,
      };

      const currentRole =
        normalizeRole(
          userRole
        ) || 'user';

      const required =
        normalizeRole(
          requiredRole
        ) || 'user';

      return (
        (levels[currentRole] ?? 0) >=
        (levels[required] ?? 0)
      );
    },
    [user, userRole]
  );

  // ==========================================================
  // INITIAL AUTHENTICATION
  // ==========================================================

  useEffect(() => {
    mountedRef.current =
      true;

    let timeoutId;

    let initializationCancelled =
      false;

    const initAuth = async () => {
      /*
       * Prevent duplicate initialization.
       */
      if (
        initializedRef.current
      ) {
        return;
      }

      initializedRef.current =
        true;

      const totalStart =
        performance.now();

      try {
        console.log(
          '%c[AUTH] Initialization started',
          'color: #6366f1; font-weight: bold;'
        );

        // ------------------------------------------------------
        // Get Supabase session
        // ------------------------------------------------------

        const sessionStart =
          performance.now();

        const {
          data: {
            session,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        logAuthPerformance(
          'supabase.auth.getSession()',
          sessionStart
        );

        if (sessionError) {
          throw sessionError;
        }

        if (
          initializationCancelled
        ) {
          return;
        }

        // ------------------------------------------------------
        // No session
        // ------------------------------------------------------

        if (!session) {
          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'refresh_token'
          );

          localStorage.removeItem(
            'user'
          );

          setUserData(
            null,
            {
              loadSettings: false,
            }
          );

          logAuthPerformance(
            'TOTAL AUTH INITIALIZATION',
            totalStart
          );

          return;
        }

        // ------------------------------------------------------
        // Cache token
        // ------------------------------------------------------

        localStorage.setItem(
          'token',
          session.access_token
        );

        if (
          session.refresh_token
        ) {
          localStorage.setItem(
            'refresh_token',
            session.refresh_token
          );
        }

        // ------------------------------------------------------
        // IMPORTANT:
        //
        // Fetch fresh profile, but merge it with cached user.
        // ------------------------------------------------------

        try {
          await fetchAndStoreProfile();
        } catch (err) {
          console.error(
            '[AUTH] Failed to restore session:',
            err
          );

          /*
           * Don't immediately destroy a valid cached admin
           * just because the profile request failed.
           *
           * We already have a cached authenticated user.
           */
          const cachedUser =
            getCachedUser();

          if (!cachedUser) {
            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'refresh_token'
            );

            setUserData(
              null,
              {
                loadSettings: false,
              }
            );
          } else {
            console.warn(
              '[AUTH] Keeping cached user because profile refresh failed.'
            );
          }
        }

        logAuthPerformance(
          'TOTAL AUTH INITIALIZATION',
          totalStart
        );
      } catch (err) {
        console.error(
          '[AUTH] Auth initialization error:',
          err
        );

        setError(
          err?.message ||
            'Authentication initialization failed'
        );

        /*
         * Only clear authentication when the Supabase
         * authentication itself failed.
         */
        localStorage.removeItem(
          'token'
        );

        localStorage.removeItem(
          'refresh_token'
        );

        localStorage.removeItem(
          'user'
        );

        setUserData(
          null,
          {
            loadSettings: false,
          }
        );
      } finally {
        if (
          mountedRef.current &&
          !initializationCancelled
        ) {
          setLoading(false);

          console.log(
            '%c[AUTH] Authentication ready',
            'color: #16a34a; font-weight: bold;'
          );
        }

        clearTimeout(
          timeoutId
        );
      }
    };

    initAuth();

    // ----------------------------------------------------------
    // Safety timeout
    // ----------------------------------------------------------

    timeoutId = setTimeout(() => {
      if (
        mountedRef.current
      ) {
        console.warn(
          '[AUTH] Safety timeout: forcing loading=false'
        );

        setLoading(false);
      }
    }, 1000);

    // ==========================================================
    // SUPABASE AUTH STATE CHANGES
    // ==========================================================

    const {
      data: {
        subscription,
      } = {},
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          console.log(
            `%c[AUTH] Event: ${event}`,
            'color: #8b5cf6;'
          );

          // ----------------------------------------------------
          // SIGNED IN
          // ----------------------------------------------------

          if (
            event ===
              'SIGNED_IN' &&
            session
          ) {
            localStorage.setItem(
              'token',
              session.access_token
            );

            if (
              session.refresh_token
            ) {
              localStorage.setItem(
                'refresh_token',
                session.refresh_token
              );
            }

            try {
              /*
               * Always refresh the profile after login.
               *
               * The merge logic protects the role.
               */
              await fetchAndStoreProfile();
            } catch (err) {
              console.error(
                '[AUTH] SIGNED_IN profile refresh failed:',
                err
              );
            }
          }

          // ----------------------------------------------------
          // TOKEN REFRESHED
          // ----------------------------------------------------

          if (
            event ===
              'TOKEN_REFRESHED' &&
            session
          ) {
            localStorage.setItem(
              'token',
              session.access_token
            );

            if (
              session.refresh_token
            ) {
              localStorage.setItem(
                'refresh_token',
                session.refresh_token
              );
            }
          }

          // ----------------------------------------------------
          // SIGNED OUT
          // ----------------------------------------------------

          if (
            event ===
            'SIGNED_OUT'
          ) {
            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'refresh_token'
            );

            localStorage.removeItem(
              'user'
            );

            setUserData(
              null,
              {
                loadSettings: false,
                clearError: true,
              }
            );

            setSettings(null);
          }
        }
      );

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      initializationCancelled =
        true;

      mountedRef.current =
        false;

      clearTimeout(
        timeoutId
      );

      subscription?.unsubscribe?.();
    };
  }, [
    fetchAndStoreProfile,
    setUserData,
  ]);

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value = useMemo(
    () => ({
      // --------------------------------------------------------
      // User
      // --------------------------------------------------------

      user,

      profile,

      settings,

      // --------------------------------------------------------
      // Auth state
      // --------------------------------------------------------

      loading,

      error,

      isAuthenticated:
        Boolean(user),

      // --------------------------------------------------------
      // Roles
      // --------------------------------------------------------

      isAdmin,

      userRole,

      canAccessAdmin:
        Boolean(user) &&
        checkIsAdmin(user),

      // --------------------------------------------------------
      // Methods
      // --------------------------------------------------------

      signUp,

      signIn,

      signOut,

      updateProfile,
      updateLocation,

      updateSetting,

      hasRole,

      refreshUserData:
        fetchAndStoreProfile,
    }),
    [
      user,
      profile,
      settings,
      loading,
      error,
      isAdmin,
      userRole,

      signUp,
      signIn,
      signOut,

      updateProfile,
      updateSetting,

      hasRole,

      fetchAndStoreProfile,

      checkIsAdmin,
    ]
  );

  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// USE AUTH
// ============================================================

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};