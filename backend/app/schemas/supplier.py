import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    supplier_name: str = Field(..., min_length=1, max_length=255, description="Supplier company or individual name")
    product_offered: str = Field(..., min_length=1, max_length=500, description="Description of the product/service offered")
    category: str = Field(..., min_length=1, max_length=100, description="Industry or product category")
    available_quantity: int = Field(..., gt=0, description="Available supply quantity, must be greater than 0")
    pricing_details: Decimal = Field(..., ge=0, description="Price per unit, must be non-negative")
    location: str = Field(..., min_length=1, max_length=255, description="Supplier operating location/warehouse")
    delivery_capability: str = Field(..., min_length=1, max_length=255, description="Delivery timeframe capability (e.g. 'ships in 5 days')")
    additional_notes: Optional[str] = Field(None, description="Optional extra specifications or supplier notes")


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = Field(None, min_length=1, max_length=255)
    product_offered: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    available_quantity: Optional[int] = Field(None, gt=0)
    pricing_details: Optional[Decimal] = Field(None, ge=0)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    delivery_capability: Optional[str] = Field(None, min_length=1, max_length=255)
    additional_notes: Optional[str] = None


class SupplierResponse(SupplierBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
