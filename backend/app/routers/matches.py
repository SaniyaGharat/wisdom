import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import match as crud_match
from app.schemas.match import MatchResponse, MatchStatusUpdate
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.get(
    "",
    response_model=PaginatedResponse[MatchResponse],
    summary="List stored matches with filtering, pagination and ranking",
    description="Retrieve all matches stored by the AI matching engine, ordered descending by match_score. Filterable by client_id, supplier_id, status, and minimum score threshold.",
    response_description="Paginated envelope with matching pairs, score breakdowns, and justifications.",
)
def list_matches(
    limit: int = Query(20, ge=1, le=100, description="Results per page (maximum 100)"),
    offset: int = Query(0, ge=0, description="Pagination offset index"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client UUID"),
    supplier_id: Optional[uuid.UUID] = Query(None, description="Filter by supplier UUID"),
    status: Optional[str] = Query(None, description="Filter by match status ('pending', 'notified', 'accepted', 'rejected')"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum match score threshold (0-100)"),
    db: Session = Depends(get_db),
):
    """
    List stored matches ordered by match_score descending with optional filtering.
    """
    items, total = crud_match.get_matches(
        db=db,
        limit=limit,
        offset=offset,
        client_id=client_id,
        supplier_id=supplier_id,
        status=status,
        min_score=min_score,
    )
    return PaginatedResponse[MatchResponse].create(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    summary="Get match details with full score breakdown",
    description="Retrieve full multi-attribute score breakdown (semantic, category, location, quantity, budget, delivery) and plain-English justification for a match.",
    response_description="Detailed match record with populated client and supplier profiles.",
)
def get_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve single match details including full score breakdown and match justification reason.
    """
    match_obj = crud_match.get_match(db=db, match_id=match_id)
    if not match_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with id '{match_id}' not found",
        )
    return match_obj


@router.patch(
    "/{match_id}/status",
    response_model=MatchResponse,
    summary="Update match status",
    description="Update workflow status for a match record (e.g. advance from 'notified' to 'accepted' or 'rejected'). Re-scoring will not overwrite manual status changes.",
    response_description="The updated match record.",
)
def update_match_status(
    match_id: uuid.UUID,
    status_update: MatchStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update workflow status for a stored match.
    """
    match_obj = crud_match.update_match_status(
        db=db,
        match_id=match_id,
        new_status=status_update.status,
    )
    if not match_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match with id '{match_id}' not found",
        )
    return match_obj
