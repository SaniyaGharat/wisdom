import uuid
from decimal import Decimal
from app.models.client import Client
from app.models.supplier import Supplier
from app.services.matching_engine import generate_match_summary, compute_match


def test_caveat_clause_picks_delivery_when_weakest():
    """Verify that when delivery is the lowest scoring sub-component, caveat clause highlights delivery."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Apex Logistics",
        product_requirement="Heavy duty industrial pallets",
        category="Packaging",
        quantity_required=1000,
        budget=Decimal("50000.00"),
        location="Bengaluru, Karnataka, India",
        delivery_timeline="within 5 business days",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Global Cargo Wood",
        product_offered="Heavy duty heat-treated industrial pallets",
        category="Packaging",
        available_quantity=5000,
        pricing_details=Decimal("40.00"),
        location="Bengaluru, Karnataka, India",
        delivery_capability="ships in 25-30 days",
    )

    # Sub-scores where delivery is the clear weak point (0.3), others are 1.0 (semantic 0.98)
    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=85.0,
        semantic_score=0.98,
        category_score=1.0,
        location_score=1.0,
        quantity_score=1.0,
        budget_score=1.0,
        delivery_score=0.30,
    )

    assert "Supplier Global Cargo Wood matches 85%" in summary
    assert "benefits from co-location in Bengaluru" in summary
    assert "delivery capability" in summary or "timeline" in summary
    assert "However, their delivery capability (ships in 25-30 days) runs longer" in summary


def test_caveat_clause_picks_budget_when_weakest():
    """Verify that when budget is the lowest scoring sub-component, caveat clause highlights budget."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Budget Conscious Inc",
        product_requirement="Precision CNC Aluminum Billets",
        category="Raw Materials",
        quantity_required=100,
        budget=Decimal("5000.00"),
        location="Pune, Maharashtra, India",
        delivery_timeline="within 2 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="High End Precision Alloys",
        product_offered="Precision CNC Aluminum Billets",
        category="Raw Materials",
        available_quantity=1000,
        pricing_details=Decimal("120.00"),  # 100 * 120 = 12000 > 5000
        location="Pune, Maharashtra, India",
        delivery_capability="ships in 7 days",
    )

    # Budget score 0.20 is weakest
    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=80.0,
        semantic_score=0.98,
        category_score=1.0,
        location_score=1.0,
        quantity_score=1.0,
        budget_score=0.20,
        delivery_score=1.0,
    )

    assert "However, their quoted unit pricing results in a total project cost exceeding your stated budget." in summary
    assert "delivery capability" not in summary


def test_near_perfect_match_omits_caveat():
    """Verify that when all sub-scores are >= 0.75, negative caveat is omitted and positive praise is returned."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Flawless Partner LLC",
        product_requirement="Certified Organic Cotton Fabric",
        category="Textiles",
        quantity_required=500,
        budget=Decimal("10000.00"),
        location="Mumbai, Maharashtra, India",
        delivery_timeline="within 2 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Pure Cotton Mills",
        product_offered="Certified Organic Cotton Fabric",
        category="Textiles",
        available_quantity=2000,
        pricing_details=Decimal("15.00"),
        location="Mumbai, Maharashtra, India",
        delivery_capability="ships in 7 days",
    )

    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=100.0,
        semantic_score=0.98,
        category_score=1.0,
        location_score=1.0,
        quantity_score=1.0,
        budget_score=1.0,
        delivery_score=1.0,
    )

    assert "However" not in summary
    assert "All operational, budgetary, and delivery constraints align exceptionally well with your specifications." in summary


def test_aeroforge_titanium_match_summary_omits_caveat():
    """
    Verify that AeroForge Dynamics <-> Titanium & Alloy Works (semantic 0.8254 + five 1.0 scores)
    reads as fully positive with no caveat under the 0.75 threshold.
    """
    client = Client(
        id=uuid.uuid4(),
        company_name="AeroForge Dynamics",
        product_requirement="Aerospace Grade 6061-T6 Aluminum Billets (extrusion ready)",
        category="Raw Materials",
        quantity_required=12000,
        budget=Decimal("95000.00"),
        location="Hyderabad, Telangana, India",
        delivery_timeline="within 4 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Titanium & Alloy Works",
        product_offered="Certified Aerospace Grade Aluminum 6061-T6 / 7075 Extrusion Billets",
        category="Raw Materials",
        available_quantity=40000,
        pricing_details=Decimal("7.25"),
        location="Hyderabad, Telangana, India",
        delivery_capability="ships in 14-20 days",
    )

    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=97.0,
        semantic_score=0.8254,
        category_score=1.0,
        location_score=1.0,
        quantity_score=1.0,
        budget_score=1.0,
        delivery_score=1.0,
    )

    assert "However" not in summary
    assert "moderate overlap" not in summary
    assert "strong technical alignment" in summary
    assert "All operational, budgetary, and delivery constraints align exceptionally well with your specifications." in summary


def test_caveat_clause_picks_semantic_when_weakest_below_threshold():
    """Verify that when semantic is the lowest scoring sub-component and < 0.75, caveat clause triggers."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Precision Client",
        product_requirement="Ultra-precise titanium screws",
        category="Raw Materials",
        quantity_required=100,
        budget=Decimal("10000.00"),
        location="Pune, Maharashtra, India",
        delivery_timeline="within 2 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Generic Supplier",
        product_offered="Generic steel fasteners",
        category="Raw Materials",
        available_quantity=5000,
        pricing_details=Decimal("10.00"),
        location="Pune, Maharashtra, India",
        delivery_capability="ships in 5 days",
    )

    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=75.0,
        semantic_score=0.65,
        category_score=1.0,
        location_score=1.0,
        quantity_score=1.0,
        budget_score=1.0,
        delivery_score=1.0,
    )

    assert "However, catalog capabilities show only moderate overlap with your exact custom specifications." in summary


def test_sub_scores_above_threshold_omit_caveat_even_if_not_literal_one():
    """Verify that when all sub-scores are >= 0.75 but not 1.0, caveat is omitted and positive closing sentence is used."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Client A",
        product_requirement="Requirement A",
        category="Electronics",
        quantity_required=100,
        budget=Decimal("1000.00"),
        location="Mumbai, Maharashtra, India",
        delivery_timeline="within 2 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Supplier B",
        product_offered="Product B",
        category="Electronics",
        available_quantity=100,
        pricing_details=Decimal("10.00"),
        location="Mumbai, Maharashtra, India",
        delivery_capability="ships in 2 weeks",
    )

    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=85.0,
        semantic_score=0.78,
        category_score=0.85,
        location_score=0.80,
        quantity_score=0.90,
        budget_score=0.88,
        delivery_score=0.82,
    )

    assert "However" not in summary
    assert "All operational, budgetary, and delivery constraints align exceptionally well with your specifications." in summary


def test_compute_match_includes_match_summary():
    """Verify compute_match dictionary includes match_summary."""
    client = Client(
        id=uuid.uuid4(),
        company_name="Client A",
        product_requirement="Multilayer PCBs",
        category="Electronics",
        quantity_required=100,
        budget=Decimal("5000.00"),
        location="Bengaluru, Karnataka, India",
        delivery_timeline="within 2 weeks",
    )

    supplier = Supplier(
        id=uuid.uuid4(),
        supplier_name="Supplier B",
        product_offered="Turnkey PCB Fabrication",
        category="Electronics",
        available_quantity=1000,
        pricing_details=Decimal("20.00"),
        location="Bengaluru, Karnataka, India",
        delivery_capability="ships in 10 days",
    )

    match_data = compute_match(client, supplier)
    assert "match_summary" in match_data
    assert isinstance(match_data["match_summary"], str)
    assert len(match_data["match_summary"]) > 20


def test_supplier_verification_in_api(client):
    """Verify Supplier endpoints accept and return verification_status and certifications."""
    payload = {
        "supplier_name": "Certified Aero Metals",
        "product_offered": "Titanium Ti-6Al-4V Aerospace Billets",
        "category": "Raw Materials",
        "available_quantity": 10000,
        "pricing_details": 95.0,
        "location": "Hyderabad, Telangana, India",
        "delivery_capability": "ships in 14 days",
        "verification_status": "verified",
        "certifications": "AS9100D, ISO 9001",
    }

    res = client.post("/api/suppliers", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["verification_status"] == "verified"
    assert data["certifications"] == "AS9100D, ISO 9001"

    # Fetch supplier by id
    get_res = client.get(f"/api/suppliers/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["verification_status"] == "verified"
    assert get_res.json()["certifications"] == "AS9100D, ISO 9001"
