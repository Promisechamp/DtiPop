import api from './apiClient';

// ============================================================
// PURCHASES
// ============================================================
export const purchasesAPI = {
  create: (data) => api.post("/pop/purchases", data),
  getAll: (params = {}) => api.get("/pop/purchases", { params }),
  getById: (id) => api.get(`/pop/purchases/${id}`),
  update: (id, data) => api.put(`/pop/purchases/${id}`, data),
  delete: (id) => api.delete(`/pop/purchases/${id}`),
  archive: (id) => api.patch(`/pop/purchases/${id}/archive`),
  getArchived: (params = {}) => api.get("/pop/purchases/archived", { params }),
  restore: (id) => api.put(`/pop/purchases/${id}/restore`),
  findUserByEmail: (email) =>
    api.get("/pop/purchases/find-user", { params: { email } }),
  transfer: (
    id,
    recipientEmail = null,
    type = "direct_gift",
    amount,
    currency,
    notes
  ) =>
    api.post(`/pop/purchases/${id}/transfer`, {
      recipientEmail: recipientEmail || undefined,
      type,
      amount,
      currency,
      notes,
    }),
};

// ============================================================
// WARRANTIES
// ============================================================
export const warrantiesAPI = {
  getAll: (params = {}) => api.get("/pop/warranties", { params }),
  getById: (warrantyId) => api.get(`/pop/warranties/${warrantyId}`),
  create: (data) => api.post("/pop/warranties", data),
  update: (warrantyId, data) =>
    api.put(`/pop/warranties/${warrantyId}`, data),
  delete: (warrantyId) => api.delete(`/pop/warranties/${warrantyId}`),
};

// ============================================================
// COMPLAINTS
// ============================================================
export const complaintsAPI = {
  create: (data) => api.post("/pop/complaints", data),
  getByPurchase: (purchaseId) =>
    api.get(`/pop/complaints/purchase/${purchaseId}`),
  update: (id, data) => api.put(`/pop/complaints/${id}`, data),
  delete: (id) => api.delete(`/pop/complaints/${id}`),
};

// ============================================================
// CLAIMS
// ============================================================
export const claimsAPI = {
  getAll: (params = {}) => api.get("/pop/claims", { params }),
  getById: (claimId) => api.get(`/pop/claims/${claimId}`),
  create: (data) => api.post("/pop/claims", data),
  update: (claimId, data) => api.put(`/pop/claims/${claimId}`, data),
  delete: (claimId) => api.delete(`/pop/claims/${claimId}`),
  summarize: (complaints) =>
    api.post("/pop/claims/summarize", { complaints }),
  forward: (claimId) => api.post(`/pop/claims/${claimId}/forward`),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardAPI = {
  getStats: () => api.get("/pop/dashboard/stats"),
  getRecentPurchases: (limit = 5) =>
    api.get("/pop/dashboard/recent-purchases", { params: { limit } }),
  getWarrantyOverview: () => api.get("/pop/dashboard/warranty-overview"),
  getOverview: () => api.get("/pop/dashboard"),
  getExpiringWarranties: (days = 30) =>
    api.get("/pop/dashboard/expiring-warranties", { params: { days } }),
  getActivity: (params = {}) => api.get("/pop/dashboard/activity", { params }),
  getDTIDonations: () => api.get("/pop/dashboard/dti-donations"),
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationsAPI = {
  getAll: (params) => api.get("/pop/notifications", { params }),
  getUnreadCount: () => api.get("/pop/notifications/unread-count"),
  markRead: (id) => api.put(`/pop/notifications/${id}/read`),
  markAllRead: () => api.put("/pop/notifications/read-all"),
  deleteAll: () => api.delete("/pop/notifications/delete-all"),
  delete: (id) => api.delete(`/pop/notifications/${id}`),
};

// ============================================================
// FILES
// ============================================================
export const filesAPI = {
  uploadReceipt: (file) => {
    const formData = new FormData();
    formData.append("receipt", file);
    return api.post("/pop/files/receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadProductImage: (file) => {
    const formData = new FormData();
    formData.append("productImage", file);
    return api.post("/pop/files/product-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadDocument: (file, folder = "documents") => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/pop/files/upload?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ============================================================
// PROFILE
// ============================================================
export const profileAPI = {
  getMe: () => api.get("/pop/profile"),
};

// ============================================================
// CATEGORIES
// ============================================================
export const categoriesAPI = {
  getAll: () => api.get("/pop/categories"),
  getById: (categoryId) => api.get(`/pop/categories/${categoryId}`),
};

// ============================================================
// HOUSEHOLDS
// ============================================================
export const householdsAPI = {
  create: (data) => api.post("/pop/households", data),
  getAll: () => api.get("/pop/households"),
  getById: (id) => api.get(`/pop/households/${id}`),
  update: (id, data) => api.put(`/pop/households/${id}`, data),
  delete: (id) => api.delete(`/pop/households/${id}`),

  // Members
  addMember: (householdId, data) =>
    api.post(`/pop/households/${householdId}/members`, data),
  updateMemberRole: (householdId, memberId, data) =>
    api.put(`/pop/households/${householdId}/members/${memberId}`, data),
  removeMember: (householdId, memberId) =>
    api.delete(`/pop/households/${householdId}/members/${memberId}`),
  leave: (householdId) => api.post(`/pop/households/${householdId}/leave`),
};

// ============================================================
// PHASE 1: ASSETS
// ============================================================
export const assetsAPI = {
  create: (data) => api.post("/pop/assets", data),
  getAll: (params = {}) => api.get("/pop/assets", { params }),
  getById: (id) => api.get(`/pop/assets/${id}`),
  update: (id, data) => api.put(`/pop/assets/${id}`, data),
  delete: (id) => api.delete(`/pop/assets/${id}`),
  getByHousehold: (householdId, params = {}) =>
    api.get(`/pop/assets/household/${householdId}`, { params }),
};

// ============================================================
// PHASE 1: DOCUMENTS
// ============================================================
export const documentsAPI = {
  create: (data) => api.post("/pop/documents", data),
  getAll: (params = {}) => api.get("/pop/documents", { params }),
  getById: (id) => api.get(`/pop/documents/${id}`),
  update: (id, data) => api.put(`/pop/documents/${id}`, data),
  delete: (id) => api.delete(`/pop/documents/${id}`),
  getByHousehold: (householdId, params = {}) =>
    api.get(`/pop/documents/household/${householdId}`, { params }),
  getByAsset: (assetId, params = {}) =>
    api.get(`/pop/documents/asset/${assetId}`, { params }),
};

// ============================================================
// PHASE 1: MAINTENANCE
// ============================================================
export const maintenanceAPI = {
  create: (data) => api.post("/pop/maintenance", data),
  getAll: (params = {}) => api.get("/pop/maintenance", { params }),
  getById: (id) => api.get(`/pop/maintenance/${id}`),
  update: (id, data) => api.put(`/pop/maintenance/${id}`, data),
  delete: (id) => api.delete(`/pop/maintenance/${id}`),
  complete: (id, notes) =>
    api.post(`/pop/maintenance/${id}/complete`, { notes }),
  getByHousehold: (householdId, params = {}) =>
    api.get(`/pop/maintenance/household/${householdId}`, { params }),
  getByAsset: (assetId, params = {}) =>
    api.get(`/pop/maintenance/asset/${assetId}`, { params }),
};

// ============================================================
// TASKS
// ============================================================
export const tasksAPI = {
  create: (data) => api.post("/pop/tasks", data),
  getAll: (params = {}) => api.get("/pop/tasks", { params }),
  getById: (id) => api.get(`/pop/tasks/${id}`),
  update: (id, data) => api.put(`/pop/tasks/${id}`, data),
  delete: (id) => api.delete(`/pop/tasks/${id}`),
  complete: (id, notes) => api.post(`/pop/tasks/${id}/complete`, { notes }),
  getMyTasks: (params = {}) => api.get("/pop/tasks/my", { params }),
  getByHousehold: (householdId, params = {}) =>
    api.get(`/pop/tasks/household/${householdId}`, { params }),
};

// ============================================================
// REQUESTS
// ============================================================
export const requestsAPI = {
  create: (data) =>
    api.post('/pop/requests', data),

  getAll: (params = {}) =>
    api.get('/pop/requests', { params }),

  getById: (id) =>
    api.get(`/pop/requests/${id}`),

  getForMe: (params = {}) =>
    api.get('/pop/requests/for-me', { params }),

  getMyRequests: (params = {}) =>
    api.get('/pop/requests/mine', { params }),

  getByHousehold: (householdId, params = {}) =>
    api.get(
      `/pop/requests/household/${householdId}`,
      { params }
    ),

  getOpenByHousehold: (householdId, params = {}) =>
    api.get(
      `/pop/requests/household/${householdId}/open`,
      { params }
    ),

  update: (id, data) =>
    api.patch(`/pop/requests/${id}`, data),

  delete: (id) =>
    api.delete(`/pop/requests/${id}`),

  fulfill: (id) =>
    api.patch(`/pop/requests/${id}/fulfill`),

  cancel: (id) =>
    api.patch(`/pop/requests/${id}/cancel`),

  getProviders: (requestId) =>
    api.get(`/pop/requests/${requestId}/providers`),

  findProviders: (requestId, params = {}) =>
    api.get(
      `/pop/requests/${requestId}/providers/find`,
      { params }
    ),

  connectProvider: (requestId, data) =>
    api.post(
      `/pop/requests/${requestId}/providers`,
      data
    ),

  getProviderProfile: (providerId) =>
    api.get(
      `/pop/requests/providers/${providerId}/profile`
    ),

  respondToProviderRequest: (
    relationshipId,
    action,
    scopes
  ) =>
    api.patch(
      `/pop/requests/request-providers/${relationshipId}/respond`,
      scopes !== undefined
        ? { action, scopes }
        : { action }
    ),

  startProviderRequest: (relationshipId) =>
    api.patch(
      `/pop/requests/request-providers/${relationshipId}/start`
    ),

  completeProviderRequest: (
    relationshipId,
    data = {}
  ) =>
    api.patch(
      `/pop/requests/request-providers/${relationshipId}/complete`,
      data
    ),

  grantAssetHistoryAccess: (relationshipId) =>
    api.post(
      `/pop/requests/request-providers/${relationshipId}/asset-history/grant`
    ),

  revokeAssetHistoryAccess: (relationshipId) =>
    api.post(
      `/pop/requests/request-providers/${relationshipId}/asset-history/revoke`
    ),

  checkAssetHistoryAccess: (relationshipId) =>
    api.get(
      `/pop/requests/request-providers/${relationshipId}/asset-history/access`
    ),
};
  


// ============================================================
// BORROW
// ============================================================
export const borrowAPI = {
  create: (data) => api.post("/pop/borrow", data),
  getAll: (params = {}) => api.get("/pop/borrow", { params }),
  getMyBorrows: (params = {}) =>
    api.get("/pop/borrow/my-borrows", { params }),
  getMyLends: (params = {}) => api.get("/pop/borrow/my-lends", { params }),
  getPublicHistory: (userId, params = {}) =>
    api.get(`/pop/borrow/public/${userId}/history`, { params }),
  getById: (id) => api.get(`/pop/borrow/${id}`),
  selectBorrower: (id) => api.post(`/pop/borrow/${id}/select`),
  acceptSelection: (id) => api.post(`/pop/borrow/${id}/accept`),
  expireSelection: (id) => api.post(`/pop/borrow/${id}/expire-selection`),
  markPickedUp: (id, data = {}) => api.post(`/pop/borrow/${id}/pickup`, data),
  markInUse: (id) => api.post(`/pop/borrow/${id}/in-use`),
  markReturned: (id, data = {}) => api.post(`/pop/borrow/${id}/return`, data),
  markCompleted: (id, data = {}) =>
    api.post(`/pop/borrow/${id}/complete`, data),
  cancel: (id, data = {}) => api.post(`/pop/borrow/${id}/cancel`, data),
};

// ============================================================
// REPUTATION
// ============================================================
export const reputationAPI = {
  getMyReputation: () => api.get("/pop/reputation"),
  get: (userId) => api.get(`/pop/reputation/${userId}`),
  getTopProviders: (params = {}) =>
    api.get("/pop/reputation/top-providers", { params }),
};

// ============================================================
// ASSET SHARING
// ============================================================
export const sharingAPI = {
  upsert: (data) => api.post("/pop/sharing", data),
  getAll: (params = {}) => api.get("/pop/sharing", { params }),
  getAvailable: (params = {}) =>
    api.get("/pop/sharing/available", { params }),
  getByAsset: (assetId) => api.get(`/pop/sharing/asset/${assetId}`),
  update: (id, data) => api.put(`/pop/sharing/${id}`, data),
  toggle: (id) => api.patch(`/pop/sharing/${id}/toggle`),
  delete: (id) => api.delete(`/pop/sharing/${id}`),
};

// ============================================================
// COMMUNITY REVIEWS
// ============================================================
export const communityReviewAPI = {
  submit: (borrowRequestId, data) =>
    api.post(`/pop/community-reviews/${borrowRequestId}`, data),
  getByUser: (userId, params = {}) =>
    api.get(`/pop/community-reviews/user/${userId}`, { params }),
  getMine: (params = {}) =>
    api.get("/pop/community-reviews/my-reviews", { params }),
};




// ============================================================
// REQUESTS CHAT
// ============================================================
// requestsChatAPI
export const ChatAPI = {
  getOrCreateConversation: (requestId, relationshipId) =>
    api.post(
      `/pop/chat/requests/${requestId}/providers/${relationshipId}/conversation`
    ),
				
				getOrCreateDirectConversation: (payload) =>
  api.post(
    '/pop/chat/conversations/direct',
    payload
  ),

  getConversations: (params = {}) =>
    api.get('/pop/chat/conversations', {
      params,
    }),

  getConversation: (conversationId, params = {}) =>
    api.get(
      `/pop/chat/conversations/${conversationId}`,
      { params }
    ),

  sendMessage: (conversationId, payload) =>
    api.post(
      `/pop/chat/conversations/${conversationId}/messages`,
      payload
    ),

  editMessage: (
    conversationId,
    messageId,
    content
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/messages/${messageId}`,
      { content }
    ),

  deleteMessage: (
    conversationId,
    messageId,
    scope = 'me'
  ) =>
    api.delete(
      `/pop/chat/conversations/${conversationId}/messages/${messageId}`,
      {
        params: {
          scope,
        },
      }
    ),

  deleteConversation: (
    conversationId
  ) =>
    api.delete(
      `/pop/chat/conversations/${conversationId}`
    ),

  markRead: (
    conversationId,
    upToMessageId = null
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/read`,
      upToMessageId
        ? {
            up_to_message_id:
              upToMessageId,
          }
        : {}
    ),

  closeConversation: (
    conversationId,
    reason = null
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/close`,
      {
        reason,
      }
    ),
				
		
		reopenConversation: (
    conversationId,
    reason = null
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/reopen`,
      {
        reason,
      }
    ),

  pinConversation: (
    conversationId,
    value = true
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/pin`,
      {
        value,
      }
    ),

  muteConversation: (
    conversationId,
    value = true
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/mute`,
      {
        value,
      }
    ),

  archiveConversation: (
    conversationId,
    value = true
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/archive`,
      {
        value,
      }
    ),

  // ==========================================================
  // PROTECT CHAT
  // ==========================================================

  protectConversation: (
    conversationId,
    value = true
  ) =>
    api.patch(
      `/pop/chat/conversations/${conversationId}/protect`,
      {
        value,
      }
    ),

  // ==========================================================
  // DOWNLOAD TRANSCRIPT
  // ==========================================================

  downloadTranscript: (
    conversationId
  ) =>
    api.get(
      `/pop/chat/conversations/${conversationId}/transcript`,
      {
        responseType: 'blob',
      }
    ),
};

export default api;