import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import client as crud_client
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a client requirement",
    description="Submit a new B2B product procurement requirement with quantity, budget, category, location, and timeline constraints.",
    response_description="The newly created client requirement record.",
)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
):
    """Create a new client requirement."""
    return crud_client.create_client(db=db, obj_in=client_in)


@router.get(
    "",
    response_model=PaginatedResponse[ClientResponse],
    summary="List clients with filters and pagination",
    description="Retrieve a paginated list of client procurement requirements. Supports case-insensitive category and location search filters.",
    response_description="Paginated envelope with items, total count, limit, offset, and has_more flag.",
)
def list_clients(
    limit: int = Query(20, ge=1, le=100, description="Page size limit (maximum 100)"),
    offset: int = Query(0, ge=0, description="Pagination offset index"),
    category: Optional[str] = Query(None, description="Filter by category (case-insensitive substring)"),
    location: Optional[str] = Query(None, description="Filter by location (case-insensitive substring)"),
    db: Session = Depends(get_db),
):
    """List all clients with pagination and filters."""
    items, total = crud_client.get_clients(
        db=db,
        limit=limit,
        offset=offset,
        category=category,
        location=location,
    )
    return PaginatedResponse[ClientResponse].create(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Get a single client requirement",
    description="Retrieve full specification details of a specific client requirement by UUID.",
    response_description="Client requirement record.",
)
def get_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get details of a specific client by ID."""
    client = crud_client.get_client(db=db, client_id=client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id '{client_id}' not found",
        )
    return client


@router.put(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Update a client requirement",
    description="Update fields on an existing client requirement. Non-provided fields remain unchanged.",
    response_description="The updated client requirement record.",
)
def update_client(
    client_id: uuid.UUID,
    client_in: ClientUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing client's details."""
    client = crud_client.get_client(db=db, client_id=client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id '{client_id}' not found",
        )
    return crud_client.update_client(db=db, db_obj=client, obj_in=client_in)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a client requirement",
    description="Delete an existing client requirement and cascade-delete any associated match records.",
    response_description="No content upon successful deletion.",
)
def delete_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Delete a client requirement by ID."""
    client = crud_client.get_client(db=db, client_id=client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id '{client_id}' not found",
        )
    crud_client.delete_client(db=db, client_id=client_id)
    return None
