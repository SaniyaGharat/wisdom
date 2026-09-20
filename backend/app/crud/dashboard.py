import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.match import Match
from app.models.notification import Notification


def get_summary_metrics(db: Session) -> Dict[str, Any]:
    """
    Compute high-level platform summary metrics via efficient SQL aggregations.
    """
    total_clients = db.scalar(select(func.count(Client.id))) or 0
    total_suppliers = db.scalar(select(func.count(Supplier.id))) or 0
    total_matches = db.scalar(select(func.count(Match.id))) or 0

    # Group by status
    status_rows = db.execute(
        select(Match.status, func.count(Match.id)).group_by(Match.status)
    ).all()
    status_map = {"pending": 0, "notified": 0, "accepted": 0, "rejected": 0}
    for status_val, count in status_rows:
        status_map[status_val] = count

    # Average score
    avg_score = db.scalar(select(func.avg(Match.match_score))) or 0.0

    # Above threshold count
    above_threshold = db.scalar(
        select(func.count(Match.id)).where(
            Match.match_score >= settings.MATCH_MIN_SCORE_THRESHOLD
        )
    ) or 0

    return {
        "total_clients": total_clients,
        "total_suppliers": total_suppliers,
        "total_matches": total_matches,
        "matches_by_status": status_map,
        "average_match_score": round(float(avg_score), 2),
        "matches_above_threshold_count": above_threshold,
    }


def get_client_dashboard(db: Session, client_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Fetch comprehensive client-scoped dashboard view:
    - Client profile
    - Ranked matching suppliers
    - Total matches count
    - Unread notification count
    """
    client = db.execute(select(Client).where(Client.id == client_id)).scalar_one_or_none()
    if not client:
        return None

    matches = db.scalars(
        select(Match)
        .options(joinedload(Match.supplier), joinedload(Match.client))
        .where(Match.client_id == client_id)
        .order_by(Match.match_score.desc())
    ).unique().all()

    unread_count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.recipient_type == "client",
            Notification.recipient_id == client_id,
            Notification.is_read == False,  # noqa: E712
        )
    ) or 0

    return {
        "client": client,
        "matches": list(matches),
        "total_matches_count": len(matches),
        "unread_notifications_count": unread_count,
    }


def get_supplier_dashboard(db: Session, supplier_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Fetch comprehensive supplier-scoped dashboard view:
    - Supplier profile
    - Ranked matching client requirements
    - Total matches count
    - Unread notification count
    """
    supplier = db.execute(select(Supplier).where(Supplier.id == supplier_id)).scalar_one_or_none()
    if not supplier:
        return None

    matches = db.scalars(
        select(Match)
        .options(joinedload(Match.client), joinedload(Match.supplier))
        .where(Match.supplier_id == supplier_id)
        .order_by(Match.match_score.desc())
    ).unique().all()

    unread_count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.recipient_type == "supplier",
            Notification.recipient_id == supplier_id,
            Notification.is_read == False,  # noqa: E712
        )
    ) or 0

    return {
        "supplier": supplier,
        "matches": list(matches),
        "total_matches_count": len(matches),
        "unread_notifications_count": unread_count,
    }


def get_category_breakdown(db: Session) -> List[Dict[str, Any]]:
    """
    Aggregate counts and average match scores grouped by distinct industry category.
    """
    # Collect all unique categories from Clients and Suppliers
    client_cats = db.scalars(select(distinct(Client.category))).all()
    supplier_cats = db.scalars(select(distinct(Supplier.category))).all()
    all_categories = sorted(list(set(c for c in client_cats + supplier_cats if c)))

    results = []
    for cat in all_categories:
        c_count = db.scalar(
            select(func.count(Client.id)).where(Client.category.ilike(cat))
        ) or 0
        s_count = db.scalar(
            select(func.count(Supplier.id)).where(Supplier.category.ilike(cat))
        ) or 0

        # Matches associated with clients in this category
        match_stats = db.execute(
            select(
                func.count(Match.id),
                func.avg(Match.match_score),
            )
            .join(Client, Match.client_id == Client.id)
            .where(Client.category.ilike(cat))
        ).one()

        m_count = match_stats[0] or 0
        avg_score = match_stats[1] or 0.0

        results.append({
            "category": cat,
            "total_clients": c_count,
            "total_suppliers": s_count,
            "total_matches": m_count,
            "average_match_score": round(float(avg_score), 2),
        })

    return results


def get_recent_activity(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Retrieve unified timestamp-sorted feed of recent platform activity:
    - Client requirements registered
    - Supplier offerings registered
    - New matches generated
    - Notifications dispatched
    """
    activities = []

    # Recent clients
    clients = db.scalars(
        select(Client).order_by(Client.created_at.desc()).limit(limit)
    ).all()
    for c in clients:
        activities.append({
            "id": f"client_{c.id}",
            "type": "client_created",
            "title": f"New Client: {c.company_name}",
            "description": f"Posted requirement for '{c.product_requirement}' in {c.category}",
            "entity_id": c.id,
            "timestamp": c.created_at,
            "metadata": {"category": c.category, "budget": float(c.budget)},
        })

    # Recent suppliers
    suppliers = db.scalars(
        select(Supplier).order_by(Supplier.created_at.desc()).limit(limit)
    ).all()
    for s in suppliers:
        activities.append({
            "id": f"supplier_{s.id}",
            "type": "supplier_created",
            "title": f"New Supplier: {s.supplier_name}",
            "description": f"Offered '{s.product_offered}' in {s.category}",
            "entity_id": s.id,
            "timestamp": s.created_at,
            "metadata": {"category": s.category, "pricing_details": float(s.pricing_details)},
        })

    # Recent matches
    matches = db.scalars(
        select(Match)
        .options(joinedload(Match.client), joinedload(Match.supplier))
        .order_by(Match.created_at.desc())
        .limit(limit)
    ).unique().all()
    for m in matches:
        client_name = m.client.company_name if m.client else "Client"
        supplier_name = m.supplier.supplier_name if m.supplier else "Supplier"
        activities.append({
            "id": f"match_{m.id}",
            "type": "match_created",
            "title": f"New Match: {m.match_score}% Score",
            "description": f"Matched {client_name} with {supplier_name}",
            "entity_id": m.id,
            "timestamp": m.created_at,
            "metadata": {"match_score": m.match_score, "status": m.status},
        })

    # Recent notifications
    notifications = db.scalars(
        select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    ).all()
    for n in notifications:
        activities.append({
            "id": f"notification_{n.id}",
            "type": "notification_sent",
            "title": f"Notification to {n.recipient_type.capitalize()}",
            "description": n.message,
            "entity_id": n.id,
            "timestamp": n.created_at,
            "metadata": {"recipient_type": n.recipient_type, "recipient_id": str(n.recipient_id), "is_read": n.is_read},
        })

    # Sort all activities by timestamp descending
    activities.sort(key=lambda a: a["timestamp"], reverse=True)
    return activities[:limit]
