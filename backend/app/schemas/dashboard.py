import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.client import ClientResponse
from app.schemas.supplier import SupplierResponse
from app.schemas.match import MatchResponse


class DashboardSummaryResponse(BaseModel):
    total_clients: int = Field(..., examples=[8], description="Total number of registered clients")
    total_suppliers: int = Field(..., examples=[8], description="Total number of registered suppliers")
    total_matches: int = Field(..., examples=[45], description="Total generated matches")
    matches_by_status: Dict[str, int] = Field(
        ...,
        examples=[{"pending": 0, "notified": 42, "accepted": 3, "rejected": 0}],
        description="Match count broken down by workflow status",
    )
    average_match_score: float = Field(..., examples=[57.0], description="Overall average match score (0-100)")
    matches_above_threshold_count: int = Field(..., examples=[45], description="Matches meeting minimum threshold")


class ClientDashboardResponse(BaseModel):
    client: ClientResponse
    matches: List[MatchResponse]
    total_matches_count: int = Field(..., examples=[3])
    unread_notifications_count: int = Field(..., examples=[3])


class SupplierDashboardResponse(BaseModel):
    supplier: SupplierResponse
    matches: List[MatchResponse]
    total_matches_count: int = Field(..., examples=[5])
    unread_notifications_count: int = Field(..., examples=[5])


class CategoryBreakdownItem(BaseModel):
    category: str = Field(..., examples=["Electronics"], description="Industry or material category")
    total_clients: int = Field(..., examples=[2])
    total_suppliers: int = Field(..., examples=[2])
    total_matches: int = Field(..., examples=[12])
    average_match_score: float = Field(..., examples=[78.5])


class ActivityItemResponse(BaseModel):
    id: str = Field(..., examples=["match_d86f9c4b-3336-474d-8a75-c296651fa544"])
    type: str = Field(..., examples=["match_created"], description="Event type ('client_created', 'supplier_created', 'match_created', 'notification_sent')")
    title: str = Field(..., examples=["New Match: 91% Score"])
    description: str = Field(..., examples=["Matched PurePack Organics with BioShield Packaging Group"])
    entity_id: uuid.UUID = Field(..., examples=["d86f9c4b-3336-474d-8a75-c296651fa544"])
    timestamp: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])
    metadata: Optional[Dict[str, Any]] = Field(None, examples=[{"match_score": 91.05, "status": "notified"}])


class RecentActivityResponse(BaseModel):
    total_items: int = Field(..., examples=[15], description="Total activities in feed")
    items: List[ActivityItemResponse]


class ScoreTrendItem(BaseModel):
    date: str = Field(..., examples=["2026-09-15"], description="Date in YYYY-MM-DD format")
    average_score: float = Field(..., examples=[62.4], description="Average match score for this date")
    match_count: int = Field(..., examples=[8], description="Total matches recorded on this date")


class ScoreBandEffectiveness(BaseModel):
    band: str = Field(..., examples=["90-100"], description="Score band label")
    min_score: float = Field(..., examples=[90.0], description="Minimum score in this band")
    max_score: float = Field(..., examples=[100.0], description="Maximum score in this band")
    total_matches: int = Field(..., examples=[10], description="Total matches falling into this band")
    accepted_count: int = Field(..., examples=[8], description="Accepted matches count")
    rejected_count: int = Field(..., examples=[1], description="Rejected/declined matches count")
    pending_count: int = Field(..., examples=[1], description="Pending or notified matches count")
    acceptance_rate: Optional[float] = Field(
        None,
        examples=[0.8889],
        description="accepted / (accepted + rejected), or null if no decided matches",
    )
