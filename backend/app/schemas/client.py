import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ClientBase(BaseModel):
    company_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Client company name",
        examples=["Apex IoT Innovations"],
    )
    product_requirement: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Product or service requirement description",
        examples=["Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components"],
    )
    category: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Industry or product category",
        examples=["Electronics"],
    )
    quantity_required: int = Field(
        ...,
        gt=0,
        description="Required quantity, must be greater than 0",
        examples=[5000],
    )
    budget: Decimal = Field(
        ...,
        ge=0,
        description="Total budget in currency units, must be non-negative",
        examples=[Decimal("45000.00")],
    )
    location: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Location/region of the client",
        examples=["Austin, TX, USA"],
    )
    delivery_timeline: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Required delivery timeline (e.g. 'within 3 weeks')",
        examples=["within 3 weeks"],
    )
    additional_notes: Optional[str] = Field(
        None,
        description="Optional extra specifications or notes",
        examples=["Requires lead-free RoHS compliance and ISO 9001 certified manufacturing."],
    )


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255, examples=["Apex IoT Innovations Inc."])
    product_requirement: Optional[str] = Field(None, min_length=1, max_length=500, examples=["High-frequency 6-layer PCBs with ENIG surface finish"])
    category: Optional[str] = Field(None, min_length=1, max_length=100, examples=["Electronics"])
    quantity_required: Optional[int] = Field(None, gt=0, examples=[6000])
    budget: Optional[Decimal] = Field(None, ge=0, examples=[Decimal("52000.00")])
    location: Optional[str] = Field(None, min_length=1, max_length=255, examples=["Austin, TX, USA"])
    delivery_timeline: Optional[str] = Field(None, min_length=1, max_length=255, examples=["within 2 weeks"])
    additional_notes: Optional[str] = Field(None, examples=["Updated for accelerated prototyping batch"])


class ClientResponse(ClientBase):
    id: uuid.UUID = Field(..., examples=["4c01d4a0-5c62-43bb-bf58-48b0a9967733"])
    created_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])
    updated_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])

    model_config = ConfigDict(from_attributes=True)
