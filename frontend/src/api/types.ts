// API Type Definitions matching FastAPI OpenAPI Schema

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  type: string;
}

export interface ErrorResponse {
  error: string;
  detail: string;
  status_code: number;
  errors?: ValidationErrorItem[] | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  environment: string;
  database: string;
  embedding_model: string;
}

// Client Types
export interface Client {
  id: string;
  company_name: string;
  product_requirement: string;
  category: string;
  quantity_required: number;
  budget: number | string;
  location: string;
  delivery_timeline: string;
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCreateInput {
  company_name: string;
  product_requirement: string;
  category: string;
  quantity_required: number;
  budget: number;
  location: string;
  delivery_timeline: string;
  additional_notes?: string;
}

export interface ClientUpdateInput {
  company_name?: string;
  product_requirement?: string;
  category?: string;
  quantity_required?: number;
  budget?: number;
  location?: string;
  delivery_timeline?: string;
  additional_notes?: string;
}

// Supplier Types
export interface Supplier {
  id: string;
  supplier_name: string;
  product_offered: string;
  category: string;
  available_quantity: number;
  pricing_details: number | string;
  location: string;
  delivery_capability: string;
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreateInput {
  supplier_name: string;
  product_offered: string;
  category: string;
  available_quantity: number;
  pricing_details: number;
  location: string;
  delivery_capability: string;
  additional_notes?: string;
}

export interface SupplierUpdateInput {
  supplier_name?: string;
  product_offered?: string;
  category?: string;
  available_quantity?: number;
  pricing_details?: number;
  location?: string;
  delivery_capability?: string;
  additional_notes?: string;
}

// Match Types
export type MatchStatus = 'pending' | 'notified' | 'accepted' | 'rejected';

export interface Match {
  id: string;
  client_id: string;
  supplier_id: string;
  match_score: number;
  semantic_score?: number | null;
  category_score?: number | null;
  location_score?: number | null;
  quantity_score?: number | null;
  budget_score?: number | null;
  delivery_score?: number | null;
  match_reason?: string | null;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  client?: Client | null;
  supplier?: Supplier | null;
}

export interface BatchMatchingResponse {
  message: string;
  clients_processed: number;
  suppliers_evaluated: number;
  matches_stored: number;
  new_notifications_created?: number;
  min_score_threshold: number;
}

// Notification Types
export interface Notification {
  id: string;
  recipient_type: 'client' | 'supplier';
  recipient_id: string;
  match_id?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  recipient_type?: string | null;
  recipient_id?: string | null;
  unread_count: number;
}

export interface MarkAllReadResponse {
  recipient_type?: string | null;
  recipient_id?: string | null;
  marked_count: number;
  message: string;
}

// Dashboard Aggregations
export interface DashboardSummaryResponse {
  total_clients: number;
  total_suppliers: number;
  total_matches: number;
  matches_by_status: {
    pending: number;
    notified: number;
    accepted: number;
    rejected: number;
  };
  average_match_score: number;
  matches_above_threshold_count: number;
}

export interface ClientDashboardResponse {
  client: Client;
  matches: Match[];
  total_matches_count: number;
  unread_notifications_count: number;
}

export interface SupplierDashboardResponse {
  supplier: Supplier;
  matches: Match[];
  total_matches_count: number;
  unread_notifications_count: number;
}

export interface CategoryBreakdownItem {
  category: string;
  total_clients: number;
  total_suppliers: number;
  total_matches: number;
  average_match_score: number;
}

export interface ActivityItem {
  id: string;
  type: 'client_created' | 'supplier_created' | 'match_created' | 'notification_sent' | string;
  title: string;
  description: string;
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, any> | null;
}

export interface RecentActivityResponse {
  total_items: number;
  items: ActivityItem[];
}
