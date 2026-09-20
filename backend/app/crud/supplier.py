import uuid
from typing import List, Optional, Tuple, Union, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate


def get_supplier(db: Session, supplier_id: uuid.UUID) -> Optional[Supplier]:
    """Retrieve a single supplier by UUID."""
    return db.execute(select(Supplier).where(Supplier.id == supplier_id)).scalar_one_or_none()


def get_suppliers(
    db: Session,
    *,
    limit: int = 20,
    offset: int = 0,
    category: Optional[str] = None,
    location: Optional[str] = None,
) -> Tuple[List[Supplier], int]:
    """
    Retrieve suppliers with optional category and location filtering and pagination.
    Returns (items, total_count).
    """
    query = select(Supplier)
    count_query = select(func.count()).select_from(Supplier)

    if category:
        query = query.where(Supplier.category.ilike(f"%{category.strip()}%"))
        count_query = count_query.where(Supplier.category.ilike(f"%{category.strip()}%"))

    if location:
        query = query.where(Supplier.location.ilike(f"%{location.strip()}%"))
        count_query = count_query.where(Supplier.location.ilike(f"%{location.strip()}%"))

    total = db.scalar(count_query) or 0
    items = db.scalars(
        query.order_by(Supplier.created_at.desc()).offset(offset).limit(limit)
    ).all()

    return list(items), total


def create_supplier(db: Session, *, obj_in: SupplierCreate) -> Supplier:
    """Create a new supplier."""
    db_obj = Supplier(
        supplier_name=obj_in.supplier_name,
        product_offered=obj_in.product_offered,
        category=obj_in.category,
        available_quantity=obj_in.available_quantity,
        pricing_details=obj_in.pricing_details,
        location=obj_in.location,
        delivery_capability=obj_in.delivery_capability,
        additional_notes=obj_in.additional_notes,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_supplier(
    db: Session,
    *,
    db_obj: Supplier,
    obj_in: Union[SupplierUpdate, Dict[str, Any]],
) -> Supplier:
    """Update existing supplier attributes."""
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


def delete_supplier(db: Session, *, supplier_id: uuid.UUID) -> Optional[Supplier]:
    """Delete a supplier by ID."""
    db_obj = get_supplier(db, supplier_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj
