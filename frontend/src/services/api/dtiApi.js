// src/services/api.js
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
  checking: false
};

const MAINTENANCE_CACHE_DURATION = 60000;

const checkMaintenanceStatus = async () => {
  if (maintenanceCache.lastChecked && 
      (Date.now() - maintenanceCache.lastChecked) < MAINTENANCE_CACHE_DURATION) {
    return maintenanceCache.enabled;
  }

  if (maintenanceCache.checking) {
    return maintenanceCache.enabled;
  }

  maintenanceCache.checking = true;
  try {
    const response = await api.get('/admin/maintenance/status', {
      skipAuth: true
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
      '/users/reset-password'
    ];
    const isPublic = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
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
              message: 'Service is currently under maintenance'
            }
          };
          return Promise.reject(error);
        }
      }
    }

    let token = localStorage.getItem('token');
    
    if (!token) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
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
      if (!window.location.pathname.includes('/maintenance') && 
          !window.location.pathname.includes('/admin')) {
        window.location.href = '/maintenance';
      }
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
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
      
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register') &&
          !window.location.pathname.includes('/maintenance')) {
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
// AUTH API
// ============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  checkConfirmation: (email) => api.get('/auth/check-confirmation', { params: { email } }),
  checkUserExists: (email) => api.get('/auth/check-user-exists', { params: { email } }),
  googleSignIn: (token) => api.post('/auth/google', { token }),
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
};

// ============================================
// ITEMS API
// ============================================

export const itemsAPI = {
  /**
   * Get all marketplace items
   *
   * Supported params:
   * - category
   * - condition
   * - status
   * - search
   * - region
   * - donor_pays_shipping
   * - limit
   * - offset
   */
  getAll: (params = {}) =>
    api.get('/items', {
      params: {
        status: 'active',
        limit: 20,
        offset: 0,
        ...params,
      },
    }),

  getById: (id) =>
    api.get(`/items/${id}`),

  getByDonor: (donorId) =>
    api.get(`/items/donor/${donorId}`),

  create: (data) =>
    api.post('/items', data),

  update: (id, data) =>
    api.put(`/items/${id}`, data),

  delete: (id) =>
    api.delete(`/items/${id}`),

  getApplicantsCount: (itemId) =>
    api.get(`/items/${itemId}/applicants/count`),

  getConversationsCount: (itemId) =>
    api.get(`/items/${itemId}/conversations/count`),

  getApplicants: (itemId, params = {}) =>
    api.get(`/items/${itemId}/applicants`, {
      params,
    }),

  getItemConversations: (itemId, params = {}) =>
    api.get(`/items/${itemId}/conversations`, {
      params,
    }),

  confirmReceived: (itemId) =>
    api.post(`/items/${itemId}/confirm-received`),

  confirmReceivedByWinner: (itemId) =>
    api.post(`/items/${itemId}/confirm-received-by-winner`),
};


// ============================================
// APPLICATIONS API
// ============================================
export const applicationsAPI = {
  create: (data) => api.post('/applications', data),
  getMy: () => api.get('/applications/my'),
  getByItem: (itemId) => api.get(`/applications/item/${itemId}`),
  updateStatus: (applicationId, status) => api.put(`/applications/${applicationId}/status`, { status }),
  cancel: (applicationId) => api.delete(`/applications/${applicationId}`),
  getById: (id) => api.get(`/applications/${id}`),
  redeclareInterest: (applicationId) => api.post(`/applications/${applicationId}/redeclare-interest`),
  getReinterestHistory: (applicationId) => api.get(`/applications/${applicationId}/reinterest-history`),
};

// ============================================
// WINNERS API
// ============================================

export const winnersAPI = {
  getAll: (params) => api.get('/winners', { params }),
  getWeek: () => api.get('/winners/week'),
  getByUser: (userId) => api.get(`/winners/user/${userId}`),
  getByDateRange: (startDate, endDate) => api.get('/winners/date-range', { params: { startDate, endDate } }),
  getMyPendingNotices: () => api.get('/winners/my-pending-notices'),
  updateNotice: (winnerId, action) => api.patch(`/winners/${winnerId}/notice`, { action }),
};

// ============================================
// USERS/PROFILES API
// ============================================
export const usersAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateLocation: (location) => api.patch('/users/profile/location', location),
  getStats: (userId) => api.get(`/users/${userId}/stats`),
  uploadAvatar: (data) => api.post('/users/avatar', data),
  forgotPassword: (email) => api.post('/users/forgot-password', { email }),
  resetPassword: (password, token) => api.post('/users/reset-password', { password, token }),
  changePassword: (currentPassword, newPassword) =>  api.put('/users/profile/password', { currentPassword, newPassword }),
};




// ============================================
// NOTIFICATIONS API
// ============================================
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};


// ============================================
// CHAT API
// ============================================
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getOrCreateConversationWithApplicant: (itemId, applicantId) => api.get(`/chat/conversations/item/${itemId}/applicant/${applicantId}`),
  getOrCreateConversation: (itemId) => api.get(`/chat/conversations/item/${itemId}`),
  getMessages: (conversationId, params) => api.get(`/chat/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, content) => api.post(`/chat/conversations/${conversationId}/messages`, { content }),
  markAsRead: (conversationId) => api.put(`/chat/conversations/${conversationId}/read`),
  saveFileMessage: (data) => api.post('/chat/save-file-message', data),
  getUnreadCount: () => api.get('/chat/unread-count'),
  deleteConversation: (conversationId) => api.delete(`/chat/conversations/${conversationId}`),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
  closeChat: (conversationId) => api.post(`/chat/conversations/${conversationId}/close`),
  reopenChat: (conversationId) => api.post(`/chat/conversations/${conversationId}/reopen`),
  reportChat: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/report`, data),
  checkChatAvailability: (itemId) => api.get(`/chat/item/${itemId}/available`),

  // ─── Admin – Chat Reports ──────────────────────────────────
  adminGetReports: (params) => api.get('/chat/admin/reports', { params }),
  adminUpdateStatus: (id, status) => api.put(`/chat/admin/reports/${id}/status`, { status }),
  adminDelete: (id) => api.delete(`/chat/admin/reports/${id}`),
};

// ============================================
// Community item discussion API
// ============================================
export const itemDiscussionsAPI = {
  getByItem: (itemId) => api.get(`/discussions/item/${itemId}`),
  create: (itemId, data) => api.post(`/discussions/item/${itemId}`, data),
  update: (id, content) => api.put(`/discussions/${id}`, { content }),
  remove: (id) => api.delete(`/discussions/${id}`),
  report: (id, reason, description) => api.post(`/discussions/${id}/report`, { reason, description }),

  // Admin endpoints – now under /admin/discussion-reports
  adminGetReports: (params) => api.get('/admin/discussion-reports', { params }),
  adminUpdateReportStatus: (id, status) => api.put(`/admin/discussion-reports/${id}/status`, { status }),
  adminDeleteReport: (id) => api.delete(`/admin/discussion-reports/${id}`),
};


// ============================================
// SHIPPING API
// ============================================
export const shippingAPI = {
  getEstimate: (params) => api.get('/shipping/estimate', { params }),
  getCheapest: (params) => api.get('/shipping/cheapest', { params }),
  getRates: (params) => api.get('/shipping/rates', { params }),
  getTracking: (trackingNumber) => api.get(`/shipping/tracking/${trackingNumber}`),
};


// ============================================
// SUPPORT TICKETING
// ============================================
export const supportAPI = {
  createTicket: (data) => api.post('/support/tickets', data),
  getMyTickets: () => api.get('/support/tickets'),
  getTicket: (ticketId) => api.get(`/support/tickets/${ticketId}`),
  replyToTicket: (ticketId, message) => api.post(`/support/tickets/${ticketId}/replies`, { message }),
  updateTicketStatus: (ticketId, status) => api.put(`/support/admin/tickets/${ticketId}/status`, { status }),
  adminGetAllTickets: (params) => api.get('/support/admin/tickets', { params }),
  deleteTicket: (ticketId) => api.delete(`/support/admin/tickets/${ticketId}`),
};


// ============================================
// FAVORITES API
// ============================================
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (itemId) => api.post('/favorites', { itemId }),
  remove: (itemId) => api.delete(`/favorites/${itemId}`),
  check: (itemId) => api.get(`/favorites/check/${itemId}`),
  getCount: () => api.get('/favorites/count'),
  clearAll: () => api.delete('/favorites'),
};


// ============================================
// RATINGS API
// ============================================
export const ratingsAPI = {
  getPending: () => api.get('/ratings/pending'),
  getUserRatings: (userId, role = 'rated') => api.get(`/ratings/user/${userId}?role=${role}`),
  getUserRatingSummary: (userId) => api.get(`/ratings/user/${userId}/summary`),
  getMyRatings: (params = {}) => { const { status, limit = 50, offset = 0 } = params; return api.get(`/ratings?status=${status}&limit=${limit}&offset=${offset}`); },
  getItemRatings: (itemId) => api.get(`/ratings/item/${itemId}`),
  getApplicationRating: (applicationId) => api.get(`/ratings/application/${applicationId}`),
  getById: (ratingId) => api.get(`/ratings/${ratingId}`),
  create: (data) => api.post('/ratings', { application_id: data.application_id, rating: data.rating, review: data.review, }),
  update: (ratingId, data) => api.put(`/ratings/${ratingId}`, {  rating: data.rating,  review: data.review, }),
  delete: (ratingId) => api.delete(`/ratings/${ratingId}`),
  remind: (ratingId, days = 1) => api.put(`/ratings/${ratingId}/remind`, { days }),
  reply: (ratingId, replyText) => api.put(`/ratings/${ratingId}/reply`, { reply_text: replyText }),
  removeReply: (ratingId) => api.delete(`/ratings/${ratingId}/reply`),
};


export const userSettingsAPI = {
  getAll: () => api.get('/userSettings/settings'),
  update: (settings) => api.put('/userSettings/settings', { settings }),
  get: (key) => api.get(`/userSettings/settings/${key}`),
  delete: (key) => api.delete(`/userSettings/settings/${key}`),
};


// ============================================
// ADMIN API
// ============================================
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/analytics/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  banUser: (userId, data) => api.post(`/admin/users/${userId}/ban`, data),
  changeUserRole: (userId, data) => api.put(`/admin/users/${userId}`, data),
  // Items
  getItems: (params) => api.get('/admin/items', { params }),
  getItem: (itemId) => api.get(`/admin/items/${itemId}`),
  moderateItem: (itemId, data) => api.put(`/admin/items/${itemId}/moderate`, data),
  deleteItem: (itemId) => api.delete(`/admin/items/${itemId}`),
  // Applications
  getApplications: (params) => api.get('/admin/applications', { params }),
  reviewApplication: (applicationId, data) => api.put(`/admin/applications/${applicationId}/review`, data),
  deleteApplication: (applicationId) => api.delete(`/admin/applications/${applicationId}`),
  // Winner
  getWinners: (params) => api.get('/admin/winners', { params }),
  createWinner: (data) => api.post('/admin/winners', data),
  updateWinner: (winnerId, data) => api.put(`/admin/winners/${winnerId}`, data),
  deleteWinner: (winnerId, restoreItem = false) => api.delete(`/admin/winners/${winnerId}`, { params: { restore_item: restoreItem } }),
  // Reports
  getReports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (reportId, data) => api.put(`/admin/reports/${reportId}/resolve`, data),
  // Maintenance
  getMaintenanceStatus: () => api.get('/admin/maintenance/status'),
  toggleMaintenance: (data) => api.post('/admin/maintenance/toggle', data),
  // Analytics
  getAnalyticsOverview: (range) => api.get(`/admin/analytics/overview?range=${range || '30d'}`),
  getFunnelAnalytics: (range) => api.get(`/admin/analytics/funnel?range=${range || '30d'}`),
  getItemPerformance: (range) => api.get(`/admin/analytics/items?range=${range || '30d'}`),
  getUserInsights: (range) => api.get(`/admin/analytics/users?range=${range || '30d'}`),
  getFulfilmentAnalytics: (range) => api.get(`/admin/analytics/fulfilment?range=${range || '30d'}`),
};



// ============================================
// EXPORT ALL
// ============================================
export default api;




