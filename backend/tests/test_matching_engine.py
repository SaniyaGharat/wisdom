import uuid
from decimal import Decimal
from app.models.client import Client
from app.models.supplier import Supplier
from app.services.matching_engine import (
    score_semantic,
    score_category,
    score_location,
    score_quantity,
    score_budget,
    score_delivery,
    compute_match,
    run_matching_for_client,
    parse_timeline_to_days,
)


def test_semantic_similarity_differentiation():
    """
    Verify that semantically aligned product requirements and offerings
    score significantly higher than unrelated domains.
    """
    client_pcb = Client(
        id=uuid.uuid4(),
        company_name="IoT Systems",
        product_requirement="Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components",
        category="Electronics",
        quantity_required=1000,
        budget=Decimal("10000.00"),
        location="Austin, TX",
        delivery_timeline="within 2 weeks",
    )

    supplier_pcb = Supplier(
        id=uuid.uuid4(),
        supplier_name="Fast PCB Fab",
        product_offered="Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly",
        category="Electronics",
        available_quantity=5000,
        pricing_details=Decimal("8.50"),
        location="Dallas, TX",
        delivery_capability="ships in 10 days",
    )

    supplier_textile = Supplier(
        id=uuid.uuid4(),
        supplier_name="Green Textiles",
        product_offered="Organic Ring-Spun Cotton Yarn and Woven Fabrics",
        category="Textiles",
        available_quantity=20000,
        pricing_details=Decimal("3.00"),
        location="Greensboro, NC",
        delivery_capability="ships in 7 days",
    )

    pcb_sim = score_semantic(client_pcb, supplier_pcb)
    textile_sim = score_semantic(client_pcb, supplier_textile)

    assert pcb_sim > textile_sim
    assert pcb_sim >= 0.60
    assert textile_sim < 0.45


def test_category_scoring():
    client = Client(
        id=uuid.uuid4(),
        company_name="Test Client",
        product_requirement="Items",
        category="Electronics",
        quantity_required=10,
        budget=Decimal("100"),
        location="Austin, TX",
        delivery_timeline="1 week",
    )

    same_cat = Supplier(
        id=uuid.uuid4(),
        supplier_name="Supplier 1",
        product_offered="Items",
        category="electronics",
        available_quantity=10,
        pricing_details=Decimal("5"),
        location="Austin, TX",
        delivery_capability="1 week",
    )

    diff_cat = Supplier(
        id=uuid.uuid4(),
        supplier_name="Supplier 2",
        product_offered="Items",
        category="Packaging",
        available_quantity=10,
        pricing_details=Decimal("5"),
        location="Austin, TX",
        delivery_capability="1 week",
    )

    assert score_category(client, same_cat) == 1.0
    assert score_category(client, diff_cat) == 0.0


def test_location_scoring():
    client = Client(
        id=uuid.uuid4(),
        company_name="Test",
        product_requirement="Items",
        category="General",
        quantity_required=10,
        budget=Decimal("100"),
        location="Austin, TX",
        delivery_timeline="1 week",
    )

    same_city = Supplier(
        id=uuid.uuid4(),
        supplier_name="Local Sup",
        product_offered="Items",
        category="General",
        available_quantity=10,
        pricing_details=Decimal("5"),
        location="Austin, TX, USA",
        delivery_capability="1 week",
    )

    same_state = Supplier(
        id=uuid.uuid4(),
        supplier_name="Regional Sup",
        product_offered="Items",
        category="General",
        available_quantity=10,
        pricing_details=Decimal("5"),
        location="Dallas, TX",
        delivery_capability="1 week",
    )

    diff_region = Supplier(
        id=uuid.uuid4(),
        supplier_name="Far Sup",
        product_offered="Items",
        category="General",
        available_quantity=10,
        pricing_details=Decimal("5"),
        location="London, UK",
        delivery_capability="1 week",
    )

    assert score_location(client, same_city) == 1.0
    assert score_location(client, same_state) == 0.5
    assert score_location(client, diff_region) == 0.0


def test_quantity_scoring():
    client = Client(
        id=uuid.uuid4(),
        company_name="Test",
        product_requirement="Items",
        category="General",
        quantity_required=1000,
        budget=Decimal("1000"),
        location="Austin, TX",
        delivery_timeline="1 week",
    )

    full_supply = Supplier(
        id=uuid.uuid4(),
        supplier_name="Full Sup",
        product_offered="Items",
        category="General",
        available_quantity=2000,
        pricing_details=Decimal("1"),
        location="Austin, TX",
        delivery_capability="1 week",
    )

    half_supply = Supplier(
        id=uuid.uuid4(),
        supplier_name="Half Sup",
        product_offered="Items",
        category="General",
        available_quantity=500,
        pricing_details=Decimal("1"),
        location="Austin, TX",
        delivery_capability="1 week",
    )

    assert score_quantity(client, full_supply) == 1.0
    assert score_quantity(client, half_supply) == 0.50


def test_budget_scoring():
    client = Client(
        id=uuid.uuid4(),
        company_name="Test",
        product_requirement="Items",
        category="General",
        quantity_required=100,
        budget=Decimal("1000.00"),
        location="Austin, TX",
        delivery_timeline="1 week",
    )

    under_budget = Supplier(
        id=uuid.uuid4(),
        supplier_name="Under Budget",
        product_offered="Items",
        category="General",
        available_quantity=200,
        pricing_details=Decimal("8.00"),  # total = 800 <= 1000
        location="Austin, TX",
        delivery_capability="1 week",
    )

    over_budget = Supplier(
        id=uuid.uuid4(),
        supplier_name="Over Budget",
        product_offered="Items",
        category="General",
        available_quantity=200,
        pricing_details=Decimal("12.00"),  # total = 1200 (20% over 1000)
        location="Austin, TX",
        delivery_capability="1 week",
    )

    assert score_budget(client, under_budget) == 1.0
    assert 0.79 <= score_budget(client, over_budget) <= 0.81


def test_timeline_parser_and_delivery_scoring():
    assert parse_timeline_to_days("within 2 weeks") == 14
    assert parse_timeline_to_days("ships in 5 days") == 5
    assert parse_timeline_to_days("ships in 10-14 days") == 14
    assert parse_timeline_to_days("within 1 month") == 30

    client = Client(
        id=uuid.uuid4(),
        company_name="Test",
        product_requirement="Items",
        category="General",
        quantity_required=10,
        budget=Decimal("100"),
        location="Austin, TX",
        delivery_timeline="within 2 weeks",  # 14 days
    )

    faster_supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Fast",
        product_offered="Items",
        category="General",
        available_quantity=10,
        pricing_details=Decimal("1"),
        location="Austin, TX",
        delivery_capability="ships in 5 days",  # 5 days <= 14
    )

    slower_supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Slow",
        product_offered="Items",
        category="General",
        available_quantity=10,
        pricing_details=Decimal("1"),
        location="Austin, TX",
        delivery_capability="ships in 40 days",  # 40 days > 14 * 1.5
    )

    assert score_delivery(client, faster_supplier) == 1.0
    assert score_delivery(client, slower_supplier) == 0.0


def test_compute_match_output_structure():
    client = Client(
        id=uuid.uuid4(),
        company_name="Apex IoT Innovations",
        product_requirement="Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components",
        category="Electronics",
        quantity_required=5000,
        budget=Decimal("45000.00"),
        location="Austin, TX",
        delivery_timeline="within 3 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="CircuitCraft Microelectronics",
        product_offered="Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly",
        category="Electronics",
        available_quantity=20000,
        pricing_details=Decimal("7.80"),
        location="Dallas, TX",
        delivery_capability="ships in 10-14 days",
    )

    result = compute_match(client, supplier)
    assert "match_score" in result
    assert 0.0 <= result["match_score"] <= 100.0
    assert result["match_score"] >= 75.0  # High alignment on PCB & Electronics
    assert result["category_score"] == 1.0
    assert result["location_score"] == 0.5
    assert result["quantity_score"] == 1.0
    assert result["budget_score"] == 1.0
    assert result["delivery_score"] == 1.0
    assert len(result["match_reason"]) > 20


def test_run_matching_for_client_db_integration(db_session):
    client = Client(
        id=uuid.uuid4(),
        company_name="Client Alpha",
        product_requirement="Medical Grade Polypropylene Granules",
        category="Raw Materials",
        quantity_required=1000,
        budget=Decimal("5000.00"),
        location="Boston, MA",
        delivery_timeline="within 3 weeks",
    )
    db_session.add(client)

    good_supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Polymer Precision Corp",
        product_offered="Medical-Grade USP Class VI Polypropylene Resin Pellets",
        category="Raw Materials",
        available_quantity=5000,
        pricing_details=Decimal("2.50"),
        location="Philadelphia, PA",
        delivery_capability="ships in 10 days",
    )
    db_session.add(good_supplier)

    unrelated_supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Silk Weavers",
        product_offered="Silk Dresses",
        category="Apparel",
        available_quantity=50,
        pricing_details=Decimal("150.00"),
        location="Milan, Italy",
        delivery_capability="ships in 60 days",
    )
    db_session.add(unrelated_supplier)
    db_session.commit()

    # Run matching with min_score threshold 40
    matches = run_matching_for_client(db=db_session, client_id=client.id, min_score=40.0)

    # Should match good_supplier and exclude unrelated_supplier
    assert len(matches) == 1
    assert matches[0].supplier_id == good_supplier.id
    assert matches[0].match_score >= 70.0
    assert matches[0].semantic_score > 0.60
    assert matches[0].status == "notified"
