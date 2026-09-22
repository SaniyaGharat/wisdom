import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, func, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Match(Base):
    """
    Match model representing scored alignment between a Client requirement
    and a Supplier offering.
    """
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("client_id", "supplier_id", name="uq_client_supplier_match"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Composite score scaled 0 - 100
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)

    # Individual component score breakdown (0.0 - 1.0)
    semantic_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    category_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quantity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    budget_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delivery_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Human-readable justification explaining the match scoring
    match_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Narrative 2-sentence analyst briefing
    match_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status workflow: pending / notified / accepted / rejected
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        index=True,
    )

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

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="matches")  # noqa: F821
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="matches")  # noqa: F821
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="match",
        cascade="all, delete-orphan",
    )  # noqa: F821

    def __repr__(self) -> str:
        return f"<Match id={self.id} client={self.client_id} supplier={self.supplier_id} score={self.match_score} status={self.status}>"
