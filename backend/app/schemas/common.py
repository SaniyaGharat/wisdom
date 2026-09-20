from typing import Generic, List, TypeVar, Optional, Any
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T] = Field(..., description="List of paginated items for current page")
    total: int = Field(..., ge=0, description="Total number of items matching filters")
    limit: int = Field(..., ge=1, le=100, description="Page size limit")
    offset: int = Field(..., ge=0, description="Pagination offset index")
    has_more: bool = Field(..., description="True if more pages are available after current offset + items")

    @classmethod
    def create(cls, items: List[T], total: int, limit: int, offset: int) -> "PaginatedResponse[T]":
        """Convenience factory calculating has_more automatically."""
        has_more = (offset + len(items)) < total
        return cls(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            has_more=has_more,
        )

    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["ok"], description="Overall service status ('ok' or 'degraded')")
    version: str = Field(..., examples=["4.0.0"], description="API version")
    environment: str = Field(..., examples=["development"], description="Current operating environment")
    database: str = Field(..., examples=["connected"], description="Database connection health ('connected' or error details)")
    embedding_model: str = Field(..., examples=["loaded"], description="AI SentenceTransformer model status ('loaded' or 'error')")


class ValidationErrorItem(BaseModel):
    field: str = Field(..., examples=["quantity_required"], description="Field that failed validation")
    message: str = Field(..., examples=["Input should be greater than 0"], description="Validation error message")
    type: str = Field(..., examples=["greater_than"], description="Validation error code/type")


class ErrorResponse(BaseModel):
    error: str = Field(..., examples=["Validation Error"], description="High-level error classification")
    detail: str = Field(..., examples=["Request payload validation failed"], description="Detailed explanation of error")
    status_code: int = Field(..., examples=[422], description="HTTP status code")
    errors: Optional[List[ValidationErrorItem]] = Field(None, description="Field-level validation details if applicable")

