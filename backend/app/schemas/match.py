import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.client import ClientResponse
from app.schemas.supplier import SupplierResponse


class MatchScoreBreakdown(BaseModel):
    semantic_score: float = Field(..., examples=[0.82], description="Semantic AI embedding similarity (0.0 to 1.0)")
    category_score: float = Field(..., examples=[1.0], description="Exact category alignment (0.0 or 1.0)")
    location_score: float = Field(..., examples=[0.5], description="Location proximity (0.0 to 1.0)")
    quantity_score: float = Field(..., examples=[1.0], description="Capacity / quantity feasibility (0.0 to 1.0)")
    budget_score: float = Field(..., examples=[1.0], description="Budget feasibility (0.0 to 1.0)")
    delivery_score: float = Field(..., examples=[1.0], description="Delivery timeline feasibility (0.0 to 1.0)")


class MatchBase(BaseModel):
    client_id: uuid.UUID = Field(..., examples=["4c01d4a0-5c62-43bb-bf58-48b0a9967733"])
    supplier_id: uuid.UUID = Field(..., examples=["8f12a34b-7c89-49de-81a2-3b4c5d6e7f80"])
    match_score: float = Field(..., ge=0.0, le=100.0, examples=[86.39], description="Overall weighted match score (0 to 100)")
    semantic_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[0.8254])
    category_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[1.0])
    location_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[0.5])
    quantity_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[1.0])
    budget_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[1.0])
    delivery_score: Optional[float] = Field(None, ge=0.0, le=1.0, examples=[1.0])
    match_reason: Optional[str] = Field(
        None,
        examples=["Strong semantic alignment on product requirement (82%). Exact category match ('Raw Materials'). Within budget. Regional location alignment."],
        description="Human-readable justification for the match score",
    )
    match_summary: Optional[str] = Field(
        None,
        examples=["Supplier CircuitCraft Microelectronics matches 86% because they offer Turnkey Multilayer PCB Fabrication with strong technical alignment to your custom specifications, and are co-located in Bengaluru. All operational, budgetary, and timeline constraints align exceptionally well with your specifications."],
        description="Analyst-style 2-sentence narrative summary of the match",
    )
    status: str = Field("notified", examples=["notified"], description="Match status: pending / notified / accepted / rejected")


class MatchStatusUpdate(BaseModel):
    status: Literal["pending", "notified", "accepted", "rejected"] = Field(
        ...,
        examples=["accepted"],
        description="New status for the match record",
    )


class MatchResponse(MatchBase):
    id: uuid.UUID = Field(..., examples=["d86f9c4b-3336-474d-8a75-c296651fa544"])
    created_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])
    updated_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])
    client: Optional[ClientResponse] = None
    supplier: Optional[SupplierResponse] = None

    model_config = ConfigDict(from_attributes=True)


class BatchMatchingResponse(BaseModel):
    message: str = Field(..., examples=["Batch matchmaking completed successfully"])
    clients_processed: int = Field(..., examples=[8])
    suppliers_evaluated: int = Field(..., examples=[8])
    matches_stored: int = Field(..., examples=[45])
    min_score_threshold: float = Field(..., examples=[40.0])
