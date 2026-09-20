import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    recipient_type: str,
    recipient_id: uuid.UUID,
    message: str,
    match_id: Optional[uuid.UUID] = None,
) -> Notification:
    """Create and persist a new notification record."""
    db_obj = Notification(
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        match_id=match_id,
        message=message,
        is_read=False,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_notification(db: Session, notification_id: uuid.UUID) -> Optional[Notification]:
    """Retrieve a single notification by UUID."""
    return db.execute(
        select(Notification).where(Notification.id == notification_id)
    ).scalar_one_or_none()


def get_notifications(
    db: Session,
    *,
    limit: int = 20,
    offset: int = 0,
    recipient_type: Optional[str] = None,
    recipient_id: Optional[uuid.UUID] = None,
    is_read: Optional[bool] = None,
) -> Tuple[List[Notification], int]:
    """
    Retrieve notifications with optional filters, sorted by created_at descending.
    Returns (items, total_count).
    """
    query = select(Notification)
    count_query = select(func.count()).select_from(Notification)

    if recipient_type:
        query = query.where(Notification.recipient_type == recipient_type)
        count_query = count_query.where(Notification.recipient_type == recipient_type)

    if recipient_id:
        query = query.where(Notification.recipient_id == recipient_id)
        count_query = count_query.where(Notification.recipient_id == recipient_id)

    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
        count_query = count_query.where(Notification.is_read == is_read)

    total = db.scalar(count_query) or 0
    items = db.scalars(
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return list(items), total


def mark_as_read(db: Session, notification_id: uuid.UUID) -> Optional[Notification]:
    """Mark a specific notification as read."""
    db_obj = get_notification(db, notification_id)
    if db_obj:
        db_obj.is_read = True
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    return db_obj


def mark_all_as_read(
    db: Session,
    *,
    recipient_type: Optional[str] = None,
    recipient_id: Optional[uuid.UUID] = None,
) -> int:
    """Bulk mark notifications as read. Returns count of modified records."""
    stmt = update(Notification).where(Notification.is_read == False)  # noqa: E712

    if recipient_type:
        stmt = stmt.where(Notification.recipient_type == recipient_type)
    if recipient_id:
        stmt = stmt.where(Notification.recipient_id == recipient_id)

    stmt = stmt.values(is_read=True)
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def get_unread_count(
    db: Session,
    *,
    recipient_type: Optional[str] = None,
    recipient_id: Optional[uuid.UUID] = None,
) -> int:
    """Get count of unread notifications matching optional filters."""
    query = select(func.count()).select_from(Notification).where(Notification.is_read == False)  # noqa: E712
    if recipient_type:
        query = query.where(Notification.recipient_type == recipient_type)
    if recipient_id:
        query = query.where(Notification.recipient_id == recipient_id)
    return db.scalar(query) or 0
