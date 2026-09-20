import { apiRequest } from './client';
import type {
  PaginatedResponse,
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  Supplier,
  SupplierCreateInput,
  SupplierUpdateInput,
  Match,
  MatchStatus,
  BatchMatchingResponse,
  Notification,
  UnreadCountResponse,
  MarkAllReadResponse,
  DashboardSummaryResponse,
  ClientDashboardResponse,
  SupplierDashboardResponse,
  CategoryBreakdownItem,
  RecentActivityResponse,
  HealthResponse,
} from './types';

export const Api = {
  // Health
  getHealth: () => apiRequest<HealthResponse>('/api/health'),

  // Clients
  clients: {
    list: (params?: {
      limit?: number;
      offset?: number;
      category?: string;
      search?: string;
    }) =>
      apiRequest<PaginatedResponse<Client>>('/api/clients', {
        method: 'GET',
        params,
      }),

    get: (id: string) =>
      apiRequest<Client>(`/api/clients/${id}`, { method: 'GET' }),

    create: (data: ClientCreateInput) =>
      apiRequest<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: ClientUpdateInput) =>
      apiRequest<Client>(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/api/clients/${id}`, { method: 'DELETE' }),
  },

  // Suppliers
  suppliers: {
    list: (params?: {
      limit?: number;
      offset?: number;
      category?: string;
      search?: string;
    }) =>
      apiRequest<PaginatedResponse<Supplier>>('/api/suppliers', {
        method: 'GET',
        params,
      }),

    get: (id: string) =>
      apiRequest<Supplier>(`/api/suppliers/${id}`, { method: 'GET' }),

    create: (data: SupplierCreateInput) =>
      apiRequest<Supplier>('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: SupplierUpdateInput) =>
      apiRequest<Supplier>(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/api/suppliers/${id}`, { method: 'DELETE' }),
  },

  // Matching Engine
  matching: {
    runForClient: (clientId: string, minScore?: number) =>
      apiRequest<Match[]>(`/api/matching/run/${clientId}`, {
        method: 'POST',
        params: { min_score: minScore },
      }),

    runAll: (minScore?: number) =>
      apiRequest<BatchMatchingResponse>('/api/matching/run-all', {
        method: 'POST',
        params: { min_score: minScore },
      }),
  },

  // Matches
  matches: {
    list: (params?: {
      limit?: number;
      offset?: number;
      client_id?: string;
      supplier_id?: string;
      status?: string;
      min_score?: number;
    }) =>
      apiRequest<PaginatedResponse<Match>>('/api/matches', {
        method: 'GET',
        params,
      }),

    get: (id: string) =>
      apiRequest<Match>(`/api/matches/${id}`, { method: 'GET' }),

    updateStatus: (id: string, status: MatchStatus) =>
      apiRequest<Match>(`/api/matches/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // Notifications
  notifications: {
    list: (params?: {
      limit?: number;
      offset?: number;
      recipient_type?: 'client' | 'supplier';
      recipient_id?: string;
      is_read?: boolean;
    }) =>
      apiRequest<PaginatedResponse<Notification>>('/api/notifications', {
        method: 'GET',
        params,
      }),

    get: (id: string) =>
      apiRequest<Notification>(`/api/notifications/${id}`, { method: 'GET' }),

    getUnreadCount: (params?: {
      recipient_type?: 'client' | 'supplier';
      recipient_id?: string;
    }) =>
      apiRequest<UnreadCountResponse>('/api/notifications/unread-count', {
        method: 'GET',
        params,
      }),

    markSingleRead: (id: string) =>
      apiRequest<Notification>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    markAllRead: (params?: {
      recipient_type?: 'client' | 'supplier';
      recipient_id?: string;
    }) =>
      apiRequest<MarkAllReadResponse>('/api/notifications/mark-all-read', {
        method: 'PATCH',
        params,
      }),
  },

  // Dashboard Aggregations
  dashboard: {
    getSummary: () =>
      apiRequest<DashboardSummaryResponse>('/api/dashboard/summary', {
        method: 'GET',
      }),

    getClientDashboard: (clientId: string) =>
      apiRequest<ClientDashboardResponse>(`/api/dashboard/clients/${clientId}`, {
        method: 'GET',
      }),

    getSupplierDashboard: (supplierId: string) =>
      apiRequest<SupplierDashboardResponse>(
        `/api/dashboard/suppliers/${supplierId}`,
        { method: 'GET' }
      ),

    getCategoryBreakdown: () =>
      apiRequest<CategoryBreakdownItem[]>('/api/dashboard/category-breakdown', {
        method: 'GET',
      }),

    getRecentActivity: (limit: number = 20) =>
      apiRequest<RecentActivityResponse>('/api/dashboard/recent-activity', {
        method: 'GET',
        params: { limit },
      }),
  },
};
