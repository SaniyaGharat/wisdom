import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


class NotificationBase(BaseModel):
    recipient_type: Literal["client", "supplier"] = Field(..., description="Recipient type: client or supplier")
    recipient_id: uuid.UUID = Field(..., description="Client or Supplier UUID")
    match_id: Optional[uuid.UUID] = Field(None, description="Associated match UUID if applicable")
    message: str = Field(..., min_length=1, description="Notification message text")
    is_read: bool = Field(False, description="Whether notification has been read")


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    recipient_type: Optional[str] = None
    recipient_id: Optional[uuid.UUID] = None
    unread_count: int


class MarkAllReadResponse(BaseModel):
    recipient_type: Optional[str] = None
    recipient_id: Optional[uuid.UUID] = None
    marked_count: int
    message: str
