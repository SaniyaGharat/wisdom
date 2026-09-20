import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.client import ClientResponse
from app.schemas.supplier import SupplierResponse
from app.schemas.match import MatchResponse


class DashboardSummaryResponse(BaseModel):
    total_clients: int
    total_suppliers: int
    total_matches: int
    matches_by_status: Dict[str, int]
    average_match_score: float
    matches_above_threshold_count: int


class ClientDashboardResponse(BaseModel):
    client: ClientResponse
    matches: List[MatchResponse]
    total_matches_count: int
    unread_notifications_count: int


class SupplierDashboardResponse(BaseModel):
    supplier: SupplierResponse
    matches: List[MatchResponse]
    total_matches_count: int
    unread_notifications_count: int


class CategoryBreakdownItem(BaseModel):
    category: str
    total_clients: int
    total_suppliers: int
    total_matches: int
    average_match_score: float


class ActivityItemResponse(BaseModel):
    id: str
    type: str  # "client_created" | "supplier_created" | "match_created" | "notification_sent"
    title: str
    description: str
    entity_id: uuid.UUID
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class RecentActivityResponse(BaseModel):
    total_items: int
    items: List[ActivityItemResponse]
