import uuid
from typing import List, Optional, Tuple, Union, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


def get_client(db: Session, client_id: uuid.UUID) -> Optional[Client]:
    """Retrieve a single client by UUID."""
    return db.execute(select(Client).where(Client.id == client_id)).scalar_one_or_none()


def get_clients(
    db: Session,
    *,
    limit: int = 20,
    offset: int = 0,
    category: Optional[str] = None,
    location: Optional[str] = None,
) -> Tuple[List[Client], int]:
    """
    Retrieve clients with optional category and location filtering and pagination.
    Returns (items, total_count).
    """
    query = select(Client)
    count_query = select(func.count()).select_from(Client)

    if category:
        query = query.where(Client.category.ilike(f"%{category.strip()}%"))
        count_query = count_query.where(Client.category.ilike(f"%{category.strip()}%"))

    if location:
        query = query.where(Client.location.ilike(f"%{location.strip()}%"))
        count_query = count_query.where(Client.location.ilike(f"%{location.strip()}%"))

    total = db.scalar(count_query) or 0
    items = db.scalars(
        query.order_by(Client.created_at.desc()).offset(offset).limit(limit)
    ).all()

    return list(items), total


def create_client(db: Session, *, obj_in: ClientCreate) -> Client:
    """Create a new client."""
    db_obj = Client(
        company_name=obj_in.company_name,
        product_requirement=obj_in.product_requirement,
        category=obj_in.category,
        quantity_required=obj_in.quantity_required,
        budget=obj_in.budget,
        location=obj_in.location,
        delivery_timeline=obj_in.delivery_timeline,
        additional_notes=obj_in.additional_notes,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_client(
    db: Session,
    *,
    db_obj: Client,
    obj_in: Union[ClientUpdate, Dict[str, Any]],
) -> Client:
    """Update existing client attributes."""
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if hasattr(db_obj, field):
            setattr(db_obj, field, value)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_client(db: Session, *, client_id: uuid.UUID) -> Optional[Client]:
    """Delete a client by ID."""
    db_obj = get_client(db, client_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj
