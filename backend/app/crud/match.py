import uuid
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from app.models.match import Match


def get_match(db: Session, match_id: uuid.UUID) -> Optional[Match]:
    """Retrieve a single match with eagerly loaded client and supplier relationships."""
    return db.execute(
        select(Match)
        .options(joinedload(Match.client), joinedload(Match.supplier))
        .where(Match.id == match_id)
    ).scalar_one_or_none()


def get_matches(
    db: Session,
    *,
    limit: int = 20,
    offset: int = 0,
    client_id: Optional[uuid.UUID] = None,
    supplier_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
) -> Tuple[List[Match], int]:
    """
    Retrieve matches with optional filtering by client_id, supplier_id, status,
    and min_score, sorted descending by match_score.
    Returns (items, total_count).
    """
    query = select(Match).options(joinedload(Match.client), joinedload(Match.supplier))
    count_query = select(func.count()).select_from(Match)

    if client_id:
        query = query.where(Match.client_id == client_id)
        count_query = count_query.where(Match.client_id == client_id)

    if supplier_id:
        query = query.where(Match.supplier_id == supplier_id)
        count_query = count_query.where(Match.supplier_id == supplier_id)

    if status:
        query = query.where(Match.status == status)
        count_query = count_query.where(Match.status == status)

    if min_score is not None:
        query = query.where(Match.match_score >= min_score)
        count_query = count_query.where(Match.match_score >= min_score)

    total = db.scalar(count_query) or 0
    items = db.scalars(
        query.order_by(Match.match_score.desc(), Match.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).unique().all()

    return list(items), total


def upsert_match(
    db: Session,
    *,
    client_id: uuid.UUID,
    supplier_id: uuid.UUID,
    match_data: Dict[str, Any],
) -> Tuple[Match, bool]:
    """
    Insert or update a match record for a given client and supplier pair.
    Returns (Match, is_created: bool).
    """
    existing = db.execute(
        select(Match).where(
            Match.client_id == client_id,
            Match.supplier_id == supplier_id,
        )
    ).scalar_one_or_none()

    if existing:
        for field, value in match_data.items():
            if field == "status":
                continue
            if hasattr(existing, field):
                setattr(existing, field, value)
        db_obj = existing
        is_created = False
    else:
        db_obj = Match(
            client_id=client_id,
            supplier_id=supplier_id,
            **match_data,
        )
        db.add(db_obj)
        is_created = True

    db.commit()
    db.refresh(db_obj)
    return db_obj, is_created


def update_match_status(
    db: Session,
    *,
    match_id: uuid.UUID,
    new_status: str,
) -> Optional[Match]:
    """Update status of a specific match."""
    db_obj = get_match(db, match_id)
    if db_obj:
        db_obj.status = new_status
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    return db_obj
