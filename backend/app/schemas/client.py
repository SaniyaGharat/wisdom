import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ClientBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255, description="Client company name")
    product_requirement: str = Field(..., min_length=1, max_length=500, description="Product or service requirement description")
    category: str = Field(..., min_length=1, max_length=100, description="Industry or product category")
    quantity_required: int = Field(..., gt=0, description="Required quantity, must be greater than 0")
    budget: Decimal = Field(..., ge=0, description="Total budget in currency units, must be non-negative")
    location: str = Field(..., min_length=1, max_length=255, description="Location/region of the client")
    delivery_timeline: str = Field(..., min_length=1, max_length=255, description="Required delivery timeline (e.g. 'within 2 weeks')")
    additional_notes: Optional[str] = Field(None, description="Optional extra specifications or notes")


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    product_requirement: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity_required: Optional[int] = Field(None, gt=0)
    budget: Optional[Decimal] = Field(None, ge=0)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    delivery_timeline: Optional[str] = Field(None, min_length=1, max_length=255)
    additional_notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
