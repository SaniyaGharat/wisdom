export const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] || "http://localhost:8000").replace(/\/$/, "");

export type ApiErrorPayload = {
  error?: string;
  detail?: string;
  status_code?: number;
  errors?: Array<{ field: string; message: string; type: string }>;
};

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.detail || payload.error || "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.fields = Object.fromEntries((payload.errors || []).map((item) => [item.field.split(".").pop() || item.field, item.message]));
  }
}

export type ListEnvelope<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type DashboardSummary = {
  total_clients?: number;
  total_suppliers?: number;
  total_matches?: number;
  average_match_score?: number;
  avg_match_score?: number;
  matches_by_status?: Record<string, number>;
  [key: string]: unknown;
};

export type Notification = {
  id: string | number;
  title?: string;
  message?: string;
  is_read?: boolean;
  read?: boolean;
  created_at?: string;
};

export type Match = {
  id: string | number;
  match_score?: number;
  overall_score?: number;
  score?: number;
  status?: string;
  match_reason?: string;
  reason?: string;
  supplier_name?: string;
  client_name?: string;
  company_name?: string;
  category?: string;
  location?: string;
  semantic_score?: number;
  category_score?: number;
  location_score?: number;
  quantity_score?: number;
  budget_score?: number;
  delivery_score?: number;
  supplier?: Record<string, unknown>;
  client?: Record<string, unknown>;
  [key: string]: unknown;
};

export type EntityDashboard = {
  client?: Record<string, unknown>;
  supplier?: Record<string, unknown>;
  requirement?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  matches?: Match[] | ListEnvelope<Match>;
  [key: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError({ detail: "We couldn’t reach the matching service. Please check that it’s running." }, 0);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try { payload = await response.json(); } catch { payload = { detail: response.statusText }; }
    throw new ApiError(payload, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type CategoryBreakdownItem = {
  category: string;
  total_clients?: number;
  total_suppliers?: number;
  total_matches?: number;
  average_match_score?: number;
  [key: string]: unknown;
};

export const api = {
  getSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  getHealth: () => request<{ status: string }>("/api/health"),
  getClientDashboard: (id: string) => request<EntityDashboard>(`/api/dashboard/clients/${id}`),
  getSupplierDashboard: (id: string) => request<EntityDashboard>(`/api/dashboard/suppliers/${id}`),
  getClient: (id: string) => request<Record<string, unknown>>(`/api/clients/${id}`),
  getSupplier: (id: string) => request<Record<string, unknown>>(`/api/suppliers/${id}`),
  createClient: (data: Record<string, unknown>) => request<Record<string, unknown>>("/api/clients", { method: "POST", body: JSON.stringify(data) }),
  updateClient: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createSupplier: (data: Record<string, unknown>) => request<Record<string, unknown>>("/api/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  runMatching: (id: string) => request<unknown>(`/api/matching/run/${id}`, { method: "POST" }),
  runAllMatching: () => request<unknown>("/api/matching/run-all", { method: "POST" }),
  updateMatchStatus: (id: string | number, status: string) => request<Match>(`/api/matches/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getNotifications: () => request<ListEnvelope<Notification>>("/api/notifications"),
  getUnreadCount: () => request<{ unread_count?: number; count?: number }>("/api/notifications/unread-count"),
  markNotificationRead: (id: string | number) => request<unknown>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  getCategoryBreakdown: () => request<CategoryBreakdownItem[] | ListEnvelope<CategoryBreakdownItem> | Record<string, number>>("/api/dashboard/category-breakdown"),
  getRecentActivity: () => request<ListEnvelope<Record<string, unknown>>>("/api/dashboard/recent-activity"),
  getMatches: (params: URLSearchParams) => request<ListEnvelope<Match>>(`/api/matches?${params.toString()}`),
};

export function entityId(value: Record<string, unknown>): string | undefined {
  const id = value["id"] ?? value["client_id"] ?? value["supplier_id"];
  return id === undefined || id === null ? undefined : String(id);
}