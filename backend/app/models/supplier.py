import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Numeric, Text, DateTime, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_offered: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    available_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    pricing_details: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)  # Price per unit
    location: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    delivery_capability: Mapped[str] = mapped_column(String(255), nullable=False)
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship stub for matches in Phase 2
    matches: Mapped[list["Match"]] = relationship("Match", back_populates="supplier", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Supplier {self.supplier_name} - {self.product_offered}>"
