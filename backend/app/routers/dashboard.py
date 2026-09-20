import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import dashboard as crud_dashboard
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    ClientDashboardResponse,
    SupplierDashboardResponse,
    CategoryBreakdownItem,
    RecentActivityResponse,
    ActivityItemResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard Aggregations"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get high-level matchmaking platform summary metrics",
    description="Returns aggregate platform-wide statistics, total registered clients and suppliers, match volume, accepted rate, and average score.",
    response_description="Platform overview KPIs and match status counts",
)
def get_summary(db: Session = Depends(get_db)):
    """
    Returns platform-wide totals, match status distribution, and average match scores.
    """
    return crud_dashboard.get_summary_metrics(db=db)


@router.get(
    "/clients/{client_id}",
    response_model=ClientDashboardResponse,
    summary="Get client-scoped dashboard view",
    description="Returns client requirements, top ranked supplier matches, match count by status, and unread notification alerts.",
    response_description="Client profile and dedicated matching pipeline view",
)
def get_client_dashboard(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Returns specific client's requirement, ranked list of matches, and unread notification count.
    """
    data = crud_dashboard.get_client_dashboard(db=db, client_id=client_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id '{client_id}' not found",
        )
    return ClientDashboardResponse(**data)


@router.get(
    "/suppliers/{supplier_id}",
    response_model=SupplierDashboardResponse,
    summary="Get supplier-scoped dashboard view",
    description="Returns supplier capabilities, incoming client match leads ranked by score, status breakdown, and unread alerts.",
    response_description="Supplier profile and incoming business opportunity leads",
)
def get_supplier_dashboard(
    supplier_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Returns specific supplier's offering, ranked matching client leads, and unread notification count.
    """
    data = crud_dashboard.get_supplier_dashboard(db=db, supplier_id=supplier_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with id '{supplier_id}' not found",
        )
    return SupplierDashboardResponse(**data)


@router.get(
    "/category-breakdown",
    response_model=List[CategoryBreakdownItem],
    summary="Get metrics and averages grouped by category",
    description="Provides market segment analytics by industry category: client demand, supplier supply, match volume, and average score.",
    response_description="Array of category distribution metrics",
)
def get_category_breakdown(db: Session = Depends(get_db)):
    """
    Returns match volume and average score per category for admin charts.
    """
    return crud_dashboard.get_category_breakdown(db=db)


@router.get(
    "/recent-activity",
    response_model=RecentActivityResponse,
    summary="Get unified platform activity feed",
    description="Unified chronologically sorted event stream capturing new client/supplier registrations, AI matching runs, and notifications.",
    response_description="Paginated list of recent platform activity items",
)
def get_recent_activity(
    limit: int = Query(20, ge=1, le=100, description="Number of recent activity items (max 100)"),
    db: Session = Depends(get_db),
):
    """
    Unified timestamp-sorted activity feed combining client/supplier registrations,
    matches, and notifications.
    """
    items = crud_dashboard.get_recent_activity(db=db, limit=limit)
    return RecentActivityResponse(
        total_items=len(items),
        items=[ActivityItemResponse(**item) for item in items],
    )

