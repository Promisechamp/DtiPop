import axios from "axios";
import { supabase } from "./supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const popApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

popApi.interceptors.request.use(
  async (config) => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("PoP: Failed to get Supabase session:", error);
        return config;
      }

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error("PoP: Supabase session error:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

popApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn("PoP: Authentication required or session expired.");
    }

    if (status === 403) {
      console.warn("PoP: You do not have permission for this action.");
    }

    if (status === 404) {
      console.warn("PoP: Requested resource was not found.");
    }

    if (status === 429) {
      console.warn("PoP: Too many requests.");
    }

    if (status >= 500) {
      console.error("PoP: Server error:", error.response?.data);
    }

    return Promise.reject(error);
  }
);

// ============================================================
// PURCHASES
// ============================================================
export const purchasesAPI = {
  create: (data) => popApi.post("/pop/purchases", data),
  getAll: (params = {}) => popApi.get("/pop/purchases", { params }),
  getById: (id) => popApi.get(`/pop/purchases/${id}`),
  update: (id, data) => popApi.put(`/pop/purchases/${id}`, data),
  delete: (id) => popApi.delete(`/pop/purchases/${id}`),
  archive: (id) => popApi.patch(`/pop/purchases/${id}/archive`),
  getArchived: (params = {}) => popApi.get("/pop/purchases/archived", { params }),
  restore: (id) => popApi.put(`/pop/purchases/${id}/restore`),
  findUserByEmail: (email) => popApi.get("/pop/purchases/find-user", { params: { email } }),
  transfer: (id, recipientEmail = null, type = "direct_gift", amount, currency, notes) => 
    popApi.post(`/pop/purchases/${id}/transfer`, { 
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
  getAll: (params = {}) => popApi.get("/pop/warranties", { params }),
  getById: (warrantyId) => popApi.get(`/pop/warranties/${warrantyId}`),
  create: (data) => popApi.post("/pop/warranties", data),
  update: (warrantyId, data) => popApi.put(`/pop/warranties/${warrantyId}`, data),
  delete: (warrantyId) => popApi.delete(`/pop/warranties/${warrantyId}`),
};

// ============================================================
// COMPLAINTS
// ============================================================
export const complaintsAPI = {
  create: (data) => popApi.post("/pop/complaints", data),
  getByPurchase: (purchaseId) => popApi.get(`/pop/complaints/purchase/${purchaseId}`),
  update: (id, data) => popApi.put(`/pop/complaints/${id}`, data),
  delete: (id) => popApi.delete(`/pop/complaints/${id}`),
};

// ============================================================
// CLAIMS
// ============================================================
export const claimsAPI = {
  getAll: (params = {}) => popApi.get("/pop/claims", { params }),
  getById: (claimId) => popApi.get(`/pop/claims/${claimId}`),
  create: (data) => popApi.post("/pop/claims", data),
  update: (claimId, data) => popApi.put(`/pop/claims/${claimId}`, data),
  delete: (claimId) => popApi.delete(`/pop/claims/${claimId}`),
  summarize: (complaints) => popApi.post("/pop/claims/summarize", { complaints }),
  forward: (claimId) => popApi.post(`/pop/claims/${claimId}/forward`),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardAPI = {
  getStats: () => popApi.get("/pop/dashboard/stats"),
  getRecentPurchases: (limit = 5) => popApi.get("/pop/dashboard/recent-purchases", { params: { limit } }),
  getWarrantyOverview: () => popApi.get("/pop/dashboard/warranty-overview"),
  getOverview: () => popApi.get("/pop/dashboard"),
  getExpiringWarranties: (days = 30) => popApi.get("/pop/dashboard/expiring-warranties", { params: { days } }),
  getActivity: (params = {}) => popApi.get("/pop/dashboard/activity", { params }),
  getDTIDonations: () => popApi.get("/pop/dashboard/dti-donations"),
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationsAPI = {
  getAll: (params) => popApi.get("/pop/notifications", { params }),
  getUnreadCount: () => popApi.get("/pop/notifications/unread-count"),
  markRead: (id) => popApi.put(`/pop/notifications/${id}/read`),
  markAllRead: () => popApi.put("/pop/notifications/read-all"),
  deleteAll: () => popApi.delete("/pop/notifications/delete-all"),
  delete: (id) => popApi.delete(`/pop/notifications/${id}`),
};

// ============================================================
// FILES
// ============================================================
export const filesAPI = {
  uploadReceipt: (file) => {
    const formData = new FormData();
    formData.append("receipt", file);
    return popApi.post("/pop/files/receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadProductImage: (file) => {
    const formData = new FormData();
    formData.append("productImage", file);
    return popApi.post("/pop/files/product-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadDocument: (file, folder = "documents") => {
    const formData = new FormData();
    formData.append("file", file);
    return popApi.post(`/pop/files/upload?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ============================================================
// PROFILE
// ============================================================
export const profileAPI = {
  getMe: () => popApi.get("/pop/profile"),
};

// ============================================================
// CATEGORIES
// ============================================================
export const categoriesAPI = {
  getAll: () => popApi.get("/pop/categories"),
  getById: (categoryId) => popApi.get(`/pop/categories/${categoryId}`),
};

// ============================================================
//  HOUSEHOLDS
// ============================================================
export const householdsAPI = {
  create: (data) => popApi.post("/pop/households", data),
  getAll: () => popApi.get("/pop/households"),
  getById: (id) => popApi.get(`/pop/households/${id}`),
  update: (id, data) => popApi.put(`/pop/households/${id}`, data),
  delete: (id) => popApi.delete(`/pop/households/${id}`),
  
  // Members
  addMember: (householdId, data) => popApi.post(`/pop/households/${householdId}/members`, data),
  updateMemberRole: (householdId, memberId, data) => 
    popApi.put(`/pop/households/${householdId}/members/${memberId}`, data),
  removeMember: (householdId, memberId) => 
    popApi.delete(`/pop/households/${householdId}/members/${memberId}`),
  leave: (householdId) => popApi.post(`/pop/households/${householdId}/leave`),
};

// ============================================================
// PHASE 1: ASSETS
// ============================================================
export const assetsAPI = {
  create: (data) => popApi.post("/pop/assets", data),
  getAll: (params = {}) => popApi.get("/pop/assets", { params }),
  getById: (id) => popApi.get(`/pop/assets/${id}`),
  update: (id, data) => popApi.put(`/pop/assets/${id}`, data),
  delete: (id) => popApi.delete(`/pop/assets/${id}`),
  getByHousehold: (householdId, params = {}) => 
    popApi.get(`/pop/assets/household/${householdId}`, { params }),
};

// ============================================================
// PHASE 1: DOCUMENTS
// ============================================================
export const documentsAPI = {
  create: (data) => popApi.post("/pop/documents", data),
  getAll: (params = {}) => popApi.get("/pop/documents", { params }),
  getById: (id) => popApi.get(`/pop/documents/${id}`),
  update: (id, data) => popApi.put(`/pop/documents/${id}`, data),
  delete: (id) => popApi.delete(`/pop/documents/${id}`),
  getByHousehold: (householdId, params = {}) => 
    popApi.get(`/pop/documents/household/${householdId}`, { params }),
  getByAsset: (assetId, params = {}) => 
    popApi.get(`/pop/documents/asset/${assetId}`, { params }),
};

// ============================================================
// PHASE 1: MAINTENANCE
// ============================================================
export const maintenanceAPI = {
  create: (data) => popApi.post("/pop/maintenance", data),
  getAll: (params = {}) => popApi.get("/pop/maintenance", { params }),
  getById: (id) => popApi.get(`/pop/maintenance/${id}`),
  update: (id, data) => popApi.put(`/pop/maintenance/${id}`, data),
  delete: (id) => popApi.delete(`/pop/maintenance/${id}`),
  complete: (id, notes) => popApi.post(`/pop/maintenance/${id}/complete`, { notes }),
  getByHousehold: (householdId, params = {}) => 
    popApi.get(`/pop/maintenance/household/${householdId}`, { params }),
  getByAsset: (assetId, params = {}) => 
    popApi.get(`/pop/maintenance/asset/${assetId}`, { params }),
};

// ============================================================
// TASKS
// ============================================================
export const tasksAPI = {
  create: (data) => popApi.post("/pop/tasks", data),
  getAll: (params = {}) => popApi.get("/pop/tasks", { params }),
  getById: (id) => popApi.get(`/pop/tasks/${id}`),
  update: (id, data) => popApi.put(`/pop/tasks/${id}`, data),
  delete: (id) => popApi.delete(`/pop/tasks/${id}`),
  complete: (id, notes) => popApi.post(`/pop/tasks/${id}/complete`, { notes }),
  getMyTasks: (params = {}) => popApi.get("/pop/tasks/my", { params }),
  getByHousehold: (householdId, params = {}) => 
    popApi.get(`/pop/tasks/household/${householdId}`, { params }),
};


// ============================================================
// REQUESTS
// ============================================================
export const requestsAPI = {
  create: (data) => popApi.post("/pop/requests", data),
  getAll: (params = {}) => popApi.get("/pop/requests", { params }),
  getById: (id) => popApi.get(`/pop/requests/${id}`),
  update: (id, data) => popApi.put(`/pop/requests/${id}`, data),
  delete: (id) => popApi.delete(`/pop/requests/${id}`),
  fulfill: (id, notes) => popApi.post(`/pop/requests/${id}/fulfill`, { notes }),
  getMyRequests: (params = {}) => popApi.get("/pop/requests/my", { params }),
  getByHousehold: (householdId, params = {}) =>
    popApi.get(`/pop/requests/household/${householdId}`, { params }),
  getOpenByHousehold: (householdId, params = {}) =>
    popApi.get(`/pop/requests/household/${householdId}/open`, { params }),
};


// ============================================================
// BORROW
// ============================================================

export const borrowAPI = {
  create: (data) => popApi.post('/pop/borrow', data),
  getAll: (params = {}) => popApi.get('/pop/borrow', { params }),
  getMyBorrows: (params = {}) => popApi.get('/pop/borrow/my-borrows', { params }),
  getMyLends: (params = {}) => popApi.get('/pop/borrow/my-lends', { params }),
		getPublicHistory: (userId, params = {}) => popApi.get(`/pop/borrow/public/${userId}/history`, { params, }),
  getById: (id) => popApi.get(`/pop/borrow/${id}`),
  selectBorrower: (id) => popApi.post(`/pop/borrow/${id}/select`),
  acceptSelection: (id) => popApi.post(`/pop/borrow/${id}/accept`),
  expireSelection: (id) => popApi.post(`/pop/borrow/${id}/expire-selection`),
  markPickedUp: (id, data = {}) => popApi.post(`/pop/borrow/${id}/pickup`, data),
  markInUse: (id) => popApi.post(`/pop/borrow/${id}/in-use`),
  markReturned: (id, data = {}) => popApi.post(`/pop/borrow/${id}/return`, data),
  markCompleted: (id, data = {}) => popApi.post(`/pop/borrow/${id}/complete`, data),
  cancel: (id, data = {}) => popApi.post(`/pop/borrow/${id}/cancel`, data),
};

// ============================================================
// SERVICES
// ============================================================
export const servicesAPI = {
  create: (data) => popApi.post("/pop/services", data),
  getAll: (params = {}) => popApi.get("/pop/services", { params }),
  getById: (id) => popApi.get(`/pop/services/${id}`),
  update: (id, data) => popApi.put(`/pop/services/${id}`, data),
  delete: (id) => popApi.delete(`/pop/services/${id}`),
  toggle: (id) => popApi.patch(`/pop/services/${id}/toggle`),
};

// ============================================================
// REPUTATION
// ============================================================
export const reputationAPI = {
  getMyReputation: () => popApi.get('/pop/reputation'),
  get: (userId) => popApi.get(`/pop/reputation/${userId}`),
  getTopProviders: (params = {}) => popApi.get( '/pop/reputation/top-providers', { params } ),
};

// ============================================================
// ASSET SHARING
// ============================================================
export const sharingAPI = {
  upsert: (data) => popApi.post("/pop/sharing", data),
  getAll: (params = {}) => popApi.get("/pop/sharing", { params }),
  getAvailable: (params = {}) => popApi.get("/pop/sharing/available", { params }),
  getByAsset: (assetId) => popApi.get(`/pop/sharing/asset/${assetId}`),
  update: (id, data) => popApi.put(`/pop/sharing/${id}`, data),
  toggle: (id) => popApi.patch(`/pop/sharing/${id}/toggle`),
  delete: (id) => popApi.delete(`/pop/sharing/${id}`),
};


export const communityReviewAPI = {
  submit: (borrowRequestId, data) => popApi.post(`/pop/community-reviews/${borrowRequestId}`, data ),
  getByUser: (userId, params = {}) => popApi.get(`/pop/community-reviews/user/${userId}`, { params } ),
  getMine: (params = {}) => popApi.get( '/pop/community-reviews/my-reviews', { params } ),
};

export default popApi;