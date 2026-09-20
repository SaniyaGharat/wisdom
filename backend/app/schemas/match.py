import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.client import ClientResponse
from app.schemas.supplier import SupplierResponse


class MatchScoreBreakdown(BaseModel):
    semantic_score: float = Field(..., description="Semantic AI embedding similarity (0.0 to 1.0)")
    category_score: float = Field(..., description="Exact category alignment (0.0 or 1.0)")
    location_score: float = Field(..., description="Location proximity (0.0 to 1.0)")
    quantity_score: float = Field(..., description="Capacity / quantity feasibility (0.0 to 1.0)")
    budget_score: float = Field(..., description="Budget feasibility (0.0 to 1.0)")
    delivery_score: float = Field(..., description="Delivery timeline feasibility (0.0 to 1.0)")


class MatchBase(BaseModel):
    client_id: uuid.UUID
    supplier_id: uuid.UUID
    match_score: float = Field(..., ge=0.0, le=100.0, description="Overall weighted match score (0 to 100)")
    semantic_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    category_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    location_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    quantity_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    budget_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    delivery_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    match_reason: Optional[str] = Field(None, description="Human-readable justification for the match score")
    status: str = Field("pending", description="Match status: pending / notified / accepted / rejected")


class MatchStatusUpdate(BaseModel):
    status: Literal["pending", "notified", "accepted", "rejected"] = Field(
        ...,
        description="New status for the match record",
    )


class MatchResponse(MatchBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientResponse] = None
    supplier: Optional[SupplierResponse] = None

    model_config = ConfigDict(from_attributes=True)


class BatchMatchingResponse(BaseModel):
    message: str
    clients_processed: int
    suppliers_evaluated: int
    matches_stored: int
    min_score_threshold: float
