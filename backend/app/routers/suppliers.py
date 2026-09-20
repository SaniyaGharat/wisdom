import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import supplier as crud_supplier
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a supplier profile/offering",
)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
):
    """Create a new supplier offering."""
    return crud_supplier.create_supplier(db=db, obj_in=supplier_in)


@router.get(
    "",
    response_model=PaginatedResponse[SupplierResponse],
    summary="List suppliers with filters and pagination",
)
def list_suppliers(
    limit: int = Query(20, ge=1, le=100, description="Number of results per page"),
    offset: int = Query(0, ge=0, description="Offset index for pagination"),
    category: Optional[str] = Query(None, description="Filter by category (case-insensitive substring)"),
    location: Optional[str] = Query(None, description="Filter by location (case-insensitive substring)"),
    db: Session = Depends(get_db),
):
    """List all suppliers with optional filtering by category/location and pagination."""
    items, total = crud_supplier.get_suppliers(
        db=db,
        limit=limit,
        offset=offset,
        category=category,
        location=location,
    )
    return PaginatedResponse[SupplierResponse](
        total=total,
        limit=limit,
        offset=offset,
        items=items,
    )


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get a single supplier offering",
)
def get_supplier(
    supplier_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get details of a specific supplier by ID."""
    supplier = crud_supplier.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with id '{supplier_id}' not found",
        )
    return supplier


@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Update a supplier offering",
)
def update_supplier(
    supplier_id: uuid.UUID,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing supplier's details."""
    supplier = crud_supplier.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with id '{supplier_id}' not found",
        )
    return crud_supplier.update_supplier(db=db, db_obj=supplier, obj_in=supplier_in)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a supplier offering",
)
def delete_supplier(
    supplier_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Delete a supplier offering by ID."""
    supplier = crud_supplier.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with id '{supplier_id}' not found",
        )
    crud_supplier.delete_supplier(db=db, supplier_id=supplier_id)
    return None
