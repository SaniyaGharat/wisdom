import csv
import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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
    "/export",
    summary="Export matches to CSV",
    description="Export all matches matching the specified filters as a downloadable CSV file.",
    response_class=Response,
    responses={
        200: {
            "content": {"text/csv": {}},
            "description": "CSV file containing matched pairs with scores and details.",
        }
    },
)
def export_matches_csv(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client UUID"),
    supplier_id: Optional[uuid.UUID] = Query(None, description="Filter by supplier UUID"),
    status: Optional[str] = Query(None, description="Filter by match status"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum match score threshold (0-100)"),
    db: Session = Depends(get_db),
):
    """
    Download all filtered matches in CSV format with complete score breakdowns.
    """
    matches = crud_match.get_all_matches_for_export(
        db=db,
        client_id=client_id,
        supplier_id=supplier_id,
        status=status,
        min_score=min_score,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "client_name",
        "supplier_name",
        "category",
        "match_score",
        "semantic_score",
        "category_score",
        "location_score",
        "quantity_score",
        "budget_score",
        "delivery_score",
        "status",
        "match_reason",
        "created_at",
    ])

    for m in matches:
        client_name = m.client.company_name if m.client else ""
        supplier_name = m.supplier.supplier_name if m.supplier else ""
        category = m.client.category if m.client else (m.supplier.category if m.supplier else "")
        writer.writerow([
            client_name,
            supplier_name,
            category,
            f"{float(m.match_score):.2f}" if m.match_score is not None else "",
            f"{float(m.semantic_score):.4f}" if m.semantic_score is not None else "",
            f"{float(m.category_score):.4f}" if m.category_score is not None else "",
            f"{float(m.location_score):.4f}" if m.location_score is not None else "",
            f"{float(m.quantity_score):.4f}" if m.quantity_score is not None else "",
            f"{float(m.budget_score):.4f}" if m.budget_score is not None else "",
            f"{float(m.delivery_score):.4f}" if m.delivery_score is not None else "",
            m.status or "",
            m.match_reason or "",
            m.created_at.isoformat() if m.created_at else "",
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="matches_export.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
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
