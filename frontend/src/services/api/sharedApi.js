import api from './apiClient';

export const chatAPI = {
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

  getConversations: (params = {}) =>
    api.get('/chat/conversations', { params }),

  getConversation: (conversationId, params = {}) =>
    api.get(`/chat/conversations/${conversationId}`, { params }),

  getMessages: (conversationId, params = {}) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),

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

  deleteMessage: (a, b, scope) => {
    if (b === undefined) {
      return api.delete(`/chat/messages/${a}`);
    }
    return api.delete(`/chat/conversations/${a}/messages/${b}`, {
      params: { scope: scope || 'me' },
    });
  },

  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversations/${conversationId}`),

  markRead: (conversationId, upToMessageId = null) =>
    api.patch(
      `/chat/conversations/${conversationId}/read`,
      upToMessageId ? { up_to_message_id: upToMessageId } : {}
    ),

  markAsRead: (conversationId) =>
    api.put(`/chat/conversations/${conversationId}/read`),

  closeConversation: (conversationId, reason = null) =>
    api.patch(`/chat/conversations/${conversationId}/close`, { reason }),

  closeChat: (conversationId) =>
    api.post(`/chat/conversations/${conversationId}/close`),

  reopenConversation: (conversationId, reason = null) =>
    api.patch(`/chat/conversations/${conversationId}/reopen`, { reason }),

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

  getUnreadCount: () => api.get('/chat/unread-count'),

  checkChatAvailability: (itemId) =>
    api.get(`/chat/item/${itemId}/available`),

  downloadTranscript: (conversationId) =>
    api.get(`/chat/conversations/${conversationId}/transcript`, {
      responseType: 'blob',
    }),

  adminGetReports: (params) => api.get('/chat/admin/reports', { params }),

  adminUpdateStatus: (id, status) =>
    api.put(`/chat/admin/reports/${id}/status`, { status }),

  adminDelete: (id) => api.delete(`/chat/admin/reports/${id}`),
};






export const userSettingsAPI = {
  getAll: () => api.get('/users/settings'),
  update: (settings) => api.put('/users/settings', { settings }),
  get: (key) => api.get(`/users/settings/${key}`),
  reset: (key) => api.delete(`/users/settings/${key}`),
};

export const systemSettingsAPI = {
  getMaintenanceStatus: () =>
    api.get('/system-settings/maintenance/status'),

  toggleMaintenance: (data) =>
    api.post('/system-settings/maintenance/toggle', data),

  update: (settings) =>
    api.put('/system-settings/settings', settings),

  getHealth: () =>
    api.get('/system-settings/health'),

  /* Reuses the maintenance/status endpoint — no new route needed. */
  getShowDevTools: async () => {
    const res = await api.get('/system-settings/maintenance/status');
    return {
      ...res,
      data: { value: Boolean(res.data?.show_dev_tools ?? false) },
    };
  },

  setShowDevTools: (enabled) =>
    api.put('/system-settings/settings', {
      show_dev_tools: Boolean(enabled),
    }),
};