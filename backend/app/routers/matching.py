import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.client import get_client
from app.crud.supplier import get_supplier
from app.schemas.match import MatchResponse, BatchMatchingResponse
from app.services.matching_engine import (
    run_matching_for_client,
    run_matching_for_supplier,
    run_matching_all,
)

router = APIRouter(prefix="/matching", tags=["AI Matching Engine"])


@router.post(
    "/run/{client_id}",
    response_model=List[MatchResponse],
    status_code=status.HTTP_200_OK,
    summary="Trigger AI matching for a specific client or supplier",
    description="Run the hybrid AI matching engine (semantic embeddings + business rules) for a client against all suppliers, or for a supplier against all clients. Upserts matches above threshold and returns them ranked by score.",
    response_description="List of calculated matches ranked by composite match score",
)
def match_client(
    client_id: uuid.UUID,
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Optional minimum match score filter (0-100)"),
    db: Session = Depends(get_db),
):
    """
    Run the hybrid AI matching engine for a single client requirement or supplier against the opposite universe.
    Qualifying matches above threshold are upserted into the database and returned ranked by score.
    """
    # Check if client exists
    c = get_client(db, client_id)
    if c:
        return run_matching_for_client(db=db, client_id=client_id, min_score=min_score)

    # If not a client, check if it's a supplier
    s = get_supplier(db, client_id)
    if s:
        return run_matching_for_supplier(db=db, supplier_id=client_id, min_score=min_score)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Client or supplier with id {client_id} not found",
    )


@router.post(
    "/run-supplier/{supplier_id}",
    response_model=List[MatchResponse],
    status_code=status.HTTP_200_OK,
    summary="Trigger AI matching for a specific supplier",
    description="Run the hybrid AI matching engine for a specific supplier offering against all client requirements.",
    response_description="List of calculated matches ranked by composite match score",
)
def match_supplier(
    supplier_id: uuid.UUID,
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Optional minimum match score filter (0-100)"),
    db: Session = Depends(get_db),
):
    """
    Run the hybrid AI matching engine for a supplier offering against all clients.
    """
    try:
        return run_matching_for_supplier(db=db, supplier_id=supplier_id, min_score=min_score)
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
    description="Execute full batch AI matching across the entire client-supplier universe. In high-scale deployments, this operation should be offloaded to background task queues (e.g. Celery / ARQ).",
    response_description="Summary of batch execution including processed count, match count, notifications created, and execution duration",
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

