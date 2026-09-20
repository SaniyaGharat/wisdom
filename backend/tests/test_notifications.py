import uuid
from decimal import Decimal
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.match import Match
from app.models.notification import Notification
from app.services.notification_service import notify_match
from app.services.matching_engine import run_matching_for_client


def test_notify_match_creates_two_notifications(db_session):
    client = Client(
        id=uuid.uuid4(),
        company_name="AeroDynamics",
        product_requirement="Turbine Blades",
        category="Industrial",
        quantity_required=100,
        budget=Decimal("50000.00"),
        location="Seattle, WA",
        delivery_timeline="within 4 weeks",
    )
    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Precision Alloys",
        product_offered="Titanium Turbine Blades",
        category="Industrial",
        available_quantity=500,
        pricing_details=Decimal("450.00"),
        location="Seattle, WA",
        delivery_capability="ships in 14 days",
    )
    db_session.add_all([client, supplier])
    db_session.commit()

    match = Match(
        id=uuid.uuid4(),
        client_id=client.id,
        supplier_id=supplier.id,
        match_score=88.5,
        status="pending",
    )
    db_session.add(match)
    db_session.commit()

    c_notif, s_notif = notify_match(db=db_session, match=match)

    assert c_notif is not None
    assert s_notif is not None

    assert c_notif.recipient_type == "client"
    assert c_notif.recipient_id == client.id
    assert "Precision Alloys" in c_notif.message
    assert "88%" in c_notif.message or "89%" in c_notif.message
    assert c_notif.is_read is False

    assert s_notif.recipient_type == "supplier"
    assert s_notif.recipient_id == supplier.id
    assert "AeroDynamics" in s_notif.message
    assert s_notif.is_read is False

    # Check match status updated to 'notified'
    assert match.status == "notified"


def test_matching_does_not_duplicate_notifications_on_rerun(db_session):
    client = Client(
        id=uuid.uuid4(),
        company_name="RoboTech",
        product_requirement="Lithium Ion Battery Packs",
        category="Electronics",
        quantity_required=1000,
        budget=Decimal("30000.00"),
        location="Austin, TX",
        delivery_timeline="within 2 weeks",
    )
    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="VoltMax Power",
        product_offered="Custom Lithium Ion Battery Packs 24V",
        category="Electronics",
        available_quantity=5000,
        pricing_details=Decimal("25.00"),
        location="Austin, TX",
        delivery_capability="ships in 5 days",
    )
    db_session.add_all([client, supplier])
    db_session.commit()

    # Run 1: Should create 1 match and 2 notifications
    run_matching_for_client(db=db_session, client_id=client.id, min_score=40.0)
    notif_count_1 = db_session.query(Notification).count()
    assert notif_count_1 == 2

    # Run 2: Re-running matching updates existing match, does not create duplicate notifications
    run_matching_for_client(db=db_session, client_id=client.id, min_score=40.0)
    notif_count_2 = db_session.query(Notification).count()
    assert notif_count_2 == 2


def test_notification_api_endpoints(client):
    # 1. Create client & supplier and run match to generate notifications
    c_res = client.post(
        "/api/clients",
        json={
            "company_name": "Test Client",
            "product_requirement": "Custom Packaging Boxes",
            "category": "Packaging",
            "quantity_required": 1000,
            "budget": 5000.0,
            "location": "Denver, CO",
            "delivery_timeline": "10 days",
        },
    )
    client_id = c_res.json()["id"]

    s_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Test Supplier",
            "product_offered": "Corrugated Packaging Boxes",
            "category": "Packaging",
            "available_quantity": 5000,
            "pricing_details": 3.50,
            "location": "Denver, CO",
            "delivery_capability": "5 days",
        },
    )

    client.post(f"/api/matching/run/{client_id}")

    # 2. Check unread count
    unread_res = client.get(f"/api/notifications/unread-count?recipient_type=client&recipient_id={client_id}")
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1

    # 3. List notifications
    list_res = client.get(f"/api/notifications?recipient_id={client_id}")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) >= 1
    notif_id = items[0]["id"]
    assert items[0]["is_read"] is False

    # 4. Mark single read
    read_res = client.patch(f"/api/notifications/{notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # 5. Bulk mark all read
    bulk_res = client.patch(f"/api/notifications/mark-all-read?recipient_id={client_id}")
    assert bulk_res.status_code == 200
    assert "marked_count" in bulk_res.json()
