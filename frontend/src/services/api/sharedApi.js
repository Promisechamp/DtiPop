// src/services/api/sharedApi.js
import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================
// MAINTENANCE MODE CHECK
// ============================================

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
    const response = await api.get('/admin/maintenance/status', {
      skipAuth: true,
    });
    maintenanceCache.enabled = response.data.maintenance_mode || false;
    maintenanceCache.lastChecked = Date.now();
    return maintenanceCache.enabled;
  } catch (error) {
    console.error('❌ Failed to check maintenance status:', error);
    return false;
  } finally {
    maintenanceCache.checking = false;
  }
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================

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
      const isAdminRoute = config.url?.includes('/admin');

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
          console.error('❌ Error getting Supabase session:', error);
          return config;
        }

        if (session?.access_token) {
          token = session.access_token;
          localStorage.setItem('token', token);
          localStorage.setItem('refresh_token', session.refresh_token);
        }
      } catch (err) {
        console.error('❌ Supabase session error:', err);
        return config;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 503 && error.response?.data?.maintenance_mode) {
      if (
        !window.location.pathname.includes('/maintenance') &&
        !window.location.pathname.includes('/admin')
      ) {
        window.location.href = '/maintenance';
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
        console.error('❌ Token refresh failed:', refreshError);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        !window.location.pathname.includes('/maintenance')
      ) {
        window.location.href = '/login';
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




// ============================================
// CHAT API (UNIFIED — works for DTI + POP)
// ============================================
export const chatAPI = {
  // ─── Creation ──────────────────────────────────────────────
  getOrCreateConversationWithApplicant: (itemId, applicantId) =>
    api.get(`/chat/conversations/item/${itemId}/applicant/${applicantId}`),

  getOrCreateConversation: (itemId) =>
    api.get(`/chat/conversations/item/${itemId}`),

  getOrCreateRequestConversation: (requestId, relationshipId) =>
    api.post(
      `/chat/requests/${requestId}/providers/${relationshipId}/conversation`
    ),

  getOrCreateDirectConversation: (payload) =>
    api.post('/chat/conversations/direct', payload),

  // ─── Listing / Fetching ────────────────────────────────────
  getConversations: (params = {}) =>
    api.get('/chat/conversations', { params }),

  getConversation: (conversationId, params = {}) =>
    api.get(`/chat/conversations/${conversationId}`, { params }),

  getMessages: (conversationId, params = {}) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),

  // ─── Messages ──────────────────────────────────────────────
  // Accepts string (DTI) or { content, type, metadata, ... } (POP)
  sendMessage: (conversationId, contentOrPayload) =>
    api.post(
      `/chat/conversations/${conversationId}/messages`,
      typeof contentOrPayload === 'string'
        ? { content: contentOrPayload }
        : contentOrPayload
    ),

  saveFileMessage: (data) => api.post('/chat/save-file-message', data),

  editMessage: (conversationId, messageId, contentOrPayload) =>
    api.patch(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
      typeof contentOrPayload === 'string'
        ? { content: contentOrPayload }
        : contentOrPayload
    ),

  // DTI: deleteMessage(messageId)
  // POP: deleteMessage(conversationId, messageId, scope)
  deleteMessage: (a, b, scope) => {
    if (b === undefined) {
      return api.delete(`/chat/messages/${a}`);
    }
    return api.delete(
      `/chat/conversations/${a}/messages/${b}`,
      { params: { scope: scope || 'me' } }
    );
  },

  // ─── Lifecycle ─────────────────────────────────────────────
  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversations/${conversationId}`),

  // POP: PATCH + optional up_to_message_id
  markRead: (conversationId, upToMessageId = null) =>
    api.patch(
      `/chat/conversations/${conversationId}/read`,
      upToMessageId ? { up_to_message_id: upToMessageId } : {}
    ),

  // DTI legacy: PUT
  markAsRead: (conversationId) =>
    api.put(`/chat/conversations/${conversationId}/read`),

  // POP: PATCH
  closeConversation: (conversationId, reason = null) =>
    api.patch(`/chat/conversations/${conversationId}/close`, { reason }),

  // DTI legacy: POST
  closeChat: (conversationId) =>
    api.post(`/chat/conversations/${conversationId}/close`),

  // POP: PATCH
  reopenConversation: (conversationId, reason = null) =>
    api.patch(`/chat/conversations/${conversationId}/reopen`, { reason }),

  // DTI legacy: POST
  reopenChat: (conversationId) =>
    api.post(`/chat/conversations/${conversationId}/reopen`),

  reportChat: (conversationId, data) =>
    api.post(`/chat/conversations/${conversationId}/report`, data || {}),

  pinConversation: (conversationId, value = true) =>
    api.patch(`/chat/conversations/${conversationId}/pin`, { value }),

  muteConversation: (conversationId, value = true) =>
    api.patch(`/chat/conversations/${conversationId}/mute`, { value }),

  archiveConversation: (conversationId, value = true) =>
    api.patch(`/chat/conversations/${conversationId}/archive`, { value }),

  protectConversation: (conversationId, value = true) =>
    api.patch(`/chat/conversations/${conversationId}/protect`, { value }),

  // ─── Utility ───────────────────────────────────────────────
  getUnreadCount: () => api.get('/chat/unread-count'),

  checkChatAvailability: (itemId) =>
    api.get(`/chat/item/${itemId}/available`),

  downloadTranscript: (conversationId) =>
    api.get(`/chat/conversations/${conversationId}/transcript`, {
      responseType: 'blob',
    }),

  // ─── Admin ─────────────────────────────────────────────────
  adminGetReports: (params) => api.get('/chat/admin/reports', { params }),
  adminUpdateStatus: (id, status) =>
    api.put(`/chat/admin/reports/${id}/status`, { status }),
  adminDelete: (id) => api.delete(`/chat/admin/reports/${id}`),
};



// ============================================
// EXPORT ALL
// ============================================
export default api;