from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.schemas.common import HealthResponse
from app.services.matching_engine import get_embedding_model

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API Health Check & Diagnostic Status",
    description="Check API, database connectivity, and embedding model load status for deployment liveness/readiness probes.",
    response_description="System health and dependency diagnostic summary",
)
def health_check(db: Session = Depends(get_db)):
    """
    Check API, Database connectivity, and SentenceTransformer embedding model status.
    Returns status='ok' when all systems are operational, otherwise 'degraded'.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    model_status = "loaded"
    try:
        model = get_embedding_model()
        if model is None:
            model_status = "error: model not loaded"
    except Exception as e:
        model_status = f"error: {str(e)}"

    overall_status = "ok" if (db_status == "connected" and model_status == "loaded") else "degraded"

    return HealthResponse(
        status=overall_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        embedding_model=model_status,
    )

