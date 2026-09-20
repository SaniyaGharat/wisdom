import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import notification as crud_notification
from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse,
    MarkAllReadResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=PaginatedResponse[NotificationResponse],
    summary="List notifications with filters and pagination",
)
def list_notifications(
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    recipient_type: Optional[str] = Query(None, description="Filter by recipient type ('client' or 'supplier')"),
    recipient_id: Optional[uuid.UUID] = Query(None, description="Filter by recipient UUID"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    db: Session = Depends(get_db),
):
    """
    List in-app notifications sorted by creation date descending.
    Note: recipient_id is passed as a query param for now, and will be bound
    to the authenticated session once auth is introduced in a later phase.
    """
    items, total = crud_notification.get_notifications(
        db=db,
        limit=limit,
        offset=offset,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        is_read=is_read,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get count of unread notifications for badge icon",
)
def get_unread_count(
    recipient_type: Optional[str] = Query(None, description="Recipient type ('client' or 'supplier')"),
    recipient_id: Optional[uuid.UUID] = Query(None, description="Recipient UUID"),
    db: Session = Depends(get_db),
):
    """
    Returns the total unread notification count, ideal for badge / notification bell icons.
    """
    count = crud_notification.get_unread_count(
        db=db,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
    )
    return UnreadCountResponse(
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        unread_count=count,
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get single notification details",
)
def get_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get single notification by ID."""
    notif = crud_notification.get_notification(db=db, notification_id=notification_id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with id '{notification_id}' not found",
        )
    return notif


@router.patch(
    "/mark-all-read",
    response_model=MarkAllReadResponse,
    summary="Mark all unread notifications as read",
)
def mark_all_read(
    recipient_type: Optional[str] = Query(None, description="Recipient type ('client' or 'supplier')"),
    recipient_id: Optional[uuid.UUID] = Query(None, description="Recipient UUID"),
    db: Session = Depends(get_db),
):
    """
    Bulk update all unread notifications to read status.
    """
    count = crud_notification.mark_all_as_read(
        db=db,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
    )
    return MarkAllReadResponse(
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        marked_count=count,
        message=f"Successfully marked {count} notifications as read",
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark single notification as read",
)
def mark_single_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Mark a specific notification as read."""
    notif = crud_notification.mark_as_read(db=db, notification_id=notification_id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with id '{notification_id}' not found",
        )
    return notif
