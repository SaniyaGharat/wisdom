import logging
import traceback
from contextlib import asynccontextmanager
from typing import List, Dict, Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.routers import (
    health_router,
    clients_router,
    suppliers_router,
    matching_router,
    matches_router,
    notifications_router,
    dashboard_router,
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Optionally initialize tables on startup if database is accessible
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.warning(f"Database schema auto-creation skipped or failed: {e}")
    yield


app = FastAPI(
    title="AI-Powered Client–Supplier Matchmaking Platform API",
    version=settings.VERSION,
    description=(
        "Enterprise B2B REST API connecting corporate buyers with verified industrial suppliers. "
        "Features hybrid AI semantic matching (SentenceTransformers + cosine similarity), "
        "deterministic multi-criteria scoring (category, location, capacity, budget, delivery), "
        "in-app event notifications, and unified executive analytics dashboards."
    ),
    contact={
        "name": "Matchmaking Platform API Team",
        "url": "https://github.com/SaniyaGharat/wisdom",
        "email": "support@wisdom-matchmaking.internal",
    },
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration - explicitly allow localhost/127.0.0.1 on all common dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Transform Pydantic / FastAPI validation errors into clean, frontend-friendly JSON envelope.
    """
    validation_errors: List[Dict[str, Any]] = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        validation_errors.append({
            "field": field_path or "body",
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        })

    logger.warning(f"Validation error on {request.method} {request.url.path}: {validation_errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": "Request payload or query parameter validation failed",
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "errors": validation_errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Ensure all HTTPExceptions (404, 400, etc.) conform to consistent error schema.
    """
    detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    logger.info(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {detail_msg}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": detail_msg,
            "detail": detail_msg,
            "status_code": exc.status_code,
            "errors": None,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled server exceptions, log full traceback server-side,
    and return a clean JSON error response (preventing stack trace leakage).
    """
    trace = traceback.format_exc()
    logger.error(f"Unhandled 500 error on {request.method} {request.url.path}:\n{trace}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected server error occurred. Please contact support if the issue persists.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "errors": None,
        },
    )


# Register API routes under /api
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(clients_router, prefix=settings.API_V1_STR)
app.include_router(suppliers_router, prefix=settings.API_V1_STR)
app.include_router(matching_router, prefix=settings.API_V1_STR)
app.include_router(matches_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"], summary="Root status", response_description="Service welcome and discovery endpoints")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "version": settings.VERSION,
    }

