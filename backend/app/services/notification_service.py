"""
Notification Service for Client-Supplier Matchmaking Platform.

ARCHITECTURE & EXTENSION POINT:
In Phase 3, notifications are stored in-app (PostgreSQL/database-backed).
This module uses a Provider abstraction (BaseNotificationProvider) so that external
channels (e.g. SendGrid for email, Twilio for SMS, Slack/Discord webhooks) can be added
by registering new provider implementations without rewriting the dispatch logic.
"""

from abc import ABC, abstractmethod
from typing import Tuple, List, Optional
import uuid
from sqlalchemy.orm import Session

from app.models.match import Match
from app.models.notification import Notification
from app.crud.notification import create_notification


class BaseNotificationProvider(ABC):
    """Abstract base class for notification delivery channels."""

    @abstractmethod
    def send(
        self,
        db: Session,
        *,
        recipient_type: str,
        recipient_id: uuid.UUID,
        message: str,
        match_id: Optional[uuid.UUID] = None,
    ) -> Optional[Notification]:
        """Dispatch a single notification."""
        pass


class DatabaseNotificationProvider(BaseNotificationProvider):
    """Database-backed in-app notification provider."""

    def send(
        self,
        db: Session,
        *,
        recipient_type: str,
        recipient_id: uuid.UUID,
        message: str,
        match_id: Optional[uuid.UUID] = None,
    ) -> Notification:
        return create_notification(
            db=db,
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            match_id=match_id,
            message=message,
        )


# Active notification providers registry
_providers: List[BaseNotificationProvider] = [DatabaseNotificationProvider()]


def register_provider(provider: BaseNotificationProvider) -> None:
    """Register an additional notification channel (e.g. EmailProvider, SMSProvider)."""
    _providers.append(provider)


def notify_match(db: Session, match: Match) -> Tuple[Notification, Notification]:
    """
    Generate and dispatch notifications to both Client and Supplier when a new match
    exceeds the threshold.

    - Creates 1 notification for the Client.
    - Creates 1 notification for the Supplier.
    - Updates match status to 'notified' if currently 'pending'.
    """
    client = match.client
    supplier = match.supplier

    score_pct = int(round(match.match_score or 0.0))

    # Client Notification Message
    client_message = (
        f"New supplier match found: {supplier.supplier_name} ({score_pct}% match) "
        f"for your '{client.product_requirement}' requirement."
    )

    # Supplier Notification Message
    supplier_message = (
        f"New client match found: {client.company_name} ({score_pct}% match) "
        f"looking for '{client.product_requirement}'."
    )

    client_notif = None
    supplier_notif = None

    for provider in _providers:
        c_n = provider.send(
            db,
            recipient_type="client",
            recipient_id=client.id,
            match_id=match.id,
            message=client_message,
        )
        s_n = provider.send(
            db,
            recipient_type="supplier",
            recipient_id=supplier.id,
            match_id=match.id,
            message=supplier_message,
        )
        if isinstance(provider, DatabaseNotificationProvider):
            client_notif = c_n
            supplier_notif = s_n

    # Update match status to 'notified' if still pending
    if match.status == "pending":
        match.status = "notified"
        db.add(match)
        db.commit()
        db.refresh(match)

    return client_notif, supplier_notif
