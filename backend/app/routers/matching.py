import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.match import MatchResponse, BatchMatchingResponse
from app.services.matching_engine import run_matching_for_client, run_matching_all

router = APIRouter(prefix="/matching", tags=["AI Matching Engine"])


@router.post(
    "/run/{client_id}",
    response_model=List[MatchResponse],
    status_code=status.HTTP_200_OK,
    summary="Trigger AI matching for a specific client",
)
def match_client(
    client_id: uuid.UUID,
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Optional minimum match score filter (0-100)"),
    db: Session = Depends(get_db),
):
    """
    Run the hybrid AI matching engine for a single client requirement against all suppliers.
    Qualifying matches above threshold are upserted into the database and returned ranked by score.
    """
    try:
        matches = run_matching_for_client(db=db, client_id=client_id, min_score=min_score)
        return matches
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/run-all",
    response_model=BatchMatchingResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger batch AI matching across all clients and suppliers",
)
def match_all(
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Optional minimum match score filter (0-100)"),
    db: Session = Depends(get_db),
):
    """
    Execute full batch matching across all clients and suppliers.
    Saves and updates qualifying matches in the database.
    """
    result = run_matching_all(db=db, min_score=min_score)
    return BatchMatchingResponse(**result)
