import axios from 'axios';
import { supabase } from './supabase';
import { DTI_BASE, POP_BASE } from '@/utils/routeBases';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/* =========================================================
   APP-AWARE REDIRECTS
   Hard redirects (no router access here) must carry the
   app prefix, and must never fire twice in quick succession.
========================================================= */

// Returns "/app/dti", "/app/pop", or null when outside both apps
// (for example on the public landing page).
const getCurrentAppBase = () => {
  const path = window.location.pathname;

  if (path === POP_BASE || path.startsWith(`${POP_BASE}/`)) return POP_BASE;
  if (path === DTI_BASE || path.startsWith(`${DTI_BASE}/`)) return DTI_BASE;

  return null;
};

const NO_LOGIN_REDIRECT_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/confirm-email',
  '/verify-email',
  '/auth/callback',
  '/maintenance',
];

const redirectOnce = (target) => {
  try {
    const last = Number(sessionStorage.getItem('__apiRedirectAt') || 0);

    // Loop guard: ignore a second redirect within 5 seconds.
    if (Date.now() - last < 5000) {
      console.warn('[API] Redirect suppressed (too soon after the last one):', target);
      return;
    }

    sessionStorage.setItem('__apiRedirectAt', String(Date.now()));
  } catch {
    // Storage may be unavailable.
  }

  window.location.replace(target);
};

/* =========================================================
   MAINTENANCE CHECK
========================================================= */

let maintenanceCache = {
  enabled: false,
  lastChecked: null,
  checking: false,
};

const MAINTENANCE_CACHE_DURATION = 60000;

const checkMaintenanceStatus = async () => {
  if (
    maintenanceCache.lastChecked &&
    Date.now() - maintenanceCache.lastChecked < MAINTENANCE_CACHE_DURATION
  ) {
    return maintenanceCache.enabled;
  }

  if (maintenanceCache.checking) {
    return maintenanceCache.enabled;
  }

  maintenanceCache.checking = true;

  try {
    const response = await api.get('/system-settings/maintenance/status', {
      skipAuth: true,
      // This probe must never trigger token refresh, logout or redirects.
      skipAuthRedirect: true,
    });

    maintenanceCache.enabled = response.data.maintenance_mode || false;
    maintenanceCache.lastChecked = Date.now();

    return maintenanceCache.enabled;
  } catch (error) {
    // Unknown status: do not block requests, and retry after the cache window.
    maintenanceCache.lastChecked = Date.now();

    console.error('Failed to check maintenance status:', error);

    return false;
  } finally {
    maintenanceCache.checking = false;
  }
};

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  async (config) => {
    const publicEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/health',
      '/maintenance/status',
      '/users/forgot-password',
      '/users/reset-password',
    ];

    const isPublic = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (config.skipAuth || isPublic) {
      return config;
    }

    const isMaintenanceEndpoint = config.url?.includes('/maintenance/status');

    if (!isPublic && !isMaintenanceEndpoint) {
      const isAdminRoute = config.url?.includes('/system-settings');

      if (!isAdminRoute) {
        const isMaintenance = await checkMaintenanceStatus();

        if (isMaintenance) {
          const error = new Error('Maintenance mode is enabled');
          error.response = {
            status: 503,
            data: {
              maintenance_mode: true,
              message: 'Service is currently under maintenance',
            },
          };
          return Promise.reject(error);
        }
      }
    }

    let token = localStorage.getItem('token');

    if (!token) {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting Supabase session:', error);
          return config;
        }

        if (session?.access_token) {
          token = session.access_token;
          localStorage.setItem('token', token);
          localStorage.setItem('refresh_token', session.refresh_token);
        }
      } catch (err) {
        console.error('Supabase session error:', err);
        return config;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // Background probes (maintenance check) never refresh, log out or redirect.
    if (originalRequest.skipAuthRedirect) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 503 &&
      error.response?.data?.maintenance_mode
    ) {
      const base = getCurrentAppBase();

      if (base) {
        const path = window.location.pathname.slice(base.length) || '/';

        if (
          !path.startsWith('/maintenance') &&
          !path.startsWith('/admin')
        ) {
          redirectOnce(`${base}/maintenance`);
        }
      }

      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
          const { data, error: refreshError } =
            await supabase.auth.refreshSession();

          if (!refreshError && data.session) {
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('refresh_token', data.session.refresh_token);

            originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // Only redirect from inside an app, to that app's own login page.
      // The public landing page is left alone.
      const base = getCurrentAppBase();

      if (base) {
        const path = window.location.pathname.slice(base.length) || '/';

        const onExcludedPage = NO_LOGIN_REDIRECT_PATHS.some(
          (excluded) => path === excluded || path.startsWith(`${excluded}/`)
        );

        if (!onExcludedPage) {
          redirectOnce(`${base}/login`);
        }
      }
    }

    if (error.response?.status === 403) {
      console.error('Forbidden: You do not have permission to perform this action');
    }

    if (error.response?.status === 429) {
      console.error('Too many requests. Please try again later.');
    }

    if (error.response?.status >= 500) {
      console.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;