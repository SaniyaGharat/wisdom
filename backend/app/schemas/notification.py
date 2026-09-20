import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


class NotificationBase(BaseModel):
    recipient_type: Literal["client", "supplier"] = Field(
        ...,
        examples=["client"],
        description="Recipient type: client or supplier",
    )
    recipient_id: uuid.UUID = Field(
        ...,
        examples=["4c01d4a0-5c62-43bb-bf58-48b0a9967733"],
        description="Client or Supplier UUID",
    )
    match_id: Optional[uuid.UUID] = Field(
        None,
        examples=["d86f9c4b-3336-474d-8a75-c296651fa544"],
        description="Associated match UUID if applicable",
    )
    message: str = Field(
        ...,
        min_length=1,
        examples=["New supplier match found: BioShield Packaging Group (91% match) for your Compostable Mailers requirement."],
        description="Notification message text",
    )
    is_read: bool = Field(False, examples=[False], description="Whether notification has been read")


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: uuid.UUID = Field(..., examples=["9e23b45a-8d12-4f34-a1b2-c3d4e5f6a7b8"])
    created_at: datetime = Field(..., examples=["2026-09-20T10:00:00Z"])

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    recipient_type: Optional[str] = Field(None, examples=["client"])
    recipient_id: Optional[uuid.UUID] = Field(None, examples=["4c01d4a0-5c62-43bb-bf58-48b0a9967733"])
    unread_count: int = Field(..., examples=[3], description="Total unread notifications count")


class MarkAllReadResponse(BaseModel):
    recipient_type: Optional[str] = Field(None, examples=["client"])
    recipient_id: Optional[uuid.UUID] = Field(None, examples=["4c01d4a0-5c62-43bb-bf58-48b0a9967733"])
    marked_count: int = Field(..., examples=[3], description="Number of notifications updated to read")
    message: str = Field(..., examples=["Successfully marked 3 notifications as read"])
