import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    supplier_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Supplier company or individual name",
        examples=["CircuitCraft Microelectronics"],
    )
    product_offered: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Description of the product/service offered",
        examples=["Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly"],
    )
    category: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Industry or product category",
        examples=["Electronics"],
    )
    available_quantity: int = Field(
        ...,
        gt=0,
        description="Available supply quantity, must be greater than 0",
        examples=[20000],
    )
    pricing_details: Decimal = Field(
        ...,
        ge=0,
        description="Price per unit, must be non-negative",
        examples=[Decimal("7.80")],
    )
    location: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Supplier operating location/warehouse",
        examples=["Dallas, TX, USA"],
    )
    delivery_capability: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Delivery timeframe capability (e.g. 'ships in 10-14 days')",
        examples=["ships in 10-14 days"],
    )
    additional_notes: Optional[str] = Field(
        None,
        description="Optional extra specifications or supplier notes",
        examples=["Equipped with automated optical inspection (AOI) and X-ray testing."],
    )
    verification_status: str = Field(
        default="unverified",
        description="Verification level: unverified, verified, or premium",
        examples=["verified"],
    )
    certifications: Optional[str] = Field(
        None,
        description="Recognized supplier certifications (e.g. 'ISO 9001, AS9100D')",
        examples=["ISO 9001, AS9100D"],
    )


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = Field(None, min_length=1, max_length=255, examples=["CircuitCraft Microelectronics Corp"])
    product_offered: Optional[str] = Field(None, min_length=1, max_length=500, examples=["High-density SMT & Rigid-Flex PCB Assembly"])
    category: Optional[str] = Field(None, min_length=1, max_length=100, examples=["Electronics"])
    available_quantity: Optional[int] = Field(None, gt=0, examples=[25000])
    pricing_details: Optional[Decimal] = Field(None, ge=0, examples=[Decimal("7.50")])
    location: Optional[str] = Field(None, min_length=1, max_length=255, examples=["Dallas, TX, USA"])
    delivery_capability: Optional[str] = Field(None, min_length=1, max_length=255, examples=["ships in 7-10 days"])
    additional_notes: Optional[str] = Field(None, examples=["Expanded high-speed assembly line capacity"])
    verification_status: Optional[str] = Field(None, examples=["verified"])
    certifications: Optional[str] = Field(None, examples=["ISO 9001, AS9100D"])


class SupplierResponse(SupplierBase):
    id: uuid.UUID = Field(..., examples=["8f12a34b-7c89-49de-81a2-3b4c5d6e7f80"])
    created_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])
    updated_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])

    model_config = ConfigDict(from_attributes=True)
