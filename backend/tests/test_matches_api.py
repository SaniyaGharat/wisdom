import uuid


def test_matching_api_endpoints(client):
    # 1. Create test Client & Supplier
    client_res = client.post(
        "/api/clients",
        json={
            "company_name": "Apex IoT Innovations",
            "product_requirement": "Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components",
            "category": "Electronics",
            "quantity_required": 5000,
            "budget": 45000.00,
            "location": "Austin, TX",
            "delivery_timeline": "within 3 weeks",
        },
    )
    assert client_res.status_code == 201
    client_id = client_res.json()["id"]

    supplier_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "CircuitCraft Microelectronics",
            "product_offered": "Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly",
            "category": "Electronics",
            "available_quantity": 20000,
            "pricing_details": 7.80,
            "location": "Dallas, TX",
            "delivery_capability": "ships in 10-14 days",
        },
    )
    assert supplier_res.status_code == 201
    supplier_id = supplier_res.json()["id"]

    # 2. Trigger POST /api/matching/run/{client_id}
    run_res = client.post(f"/api/matching/run/{client_id}")
    assert run_res.status_code == 200
    matches = run_res.json()
    assert len(matches) >= 1
    top_match = matches[0]
    assert top_match["client_id"] == client_id
    assert top_match["supplier_id"] == supplier_id
    assert top_match["match_score"] >= 70.0
    assert top_match["semantic_score"] > 0.60
    assert top_match["category_score"] == 1.0
    assert top_match["location_score"] == 0.5
    assert top_match["quantity_score"] == 1.0
    assert top_match["budget_score"] == 1.0
    assert top_match["delivery_score"] == 1.0
    assert "match_reason" in top_match
    match_id = top_match["id"]

    # 3. GET /api/matches (list all matches with pagination and filtering)
    list_res = client.get("/api/matches?limit=10&offset=0")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(m["id"] == match_id for m in list_data["items"])

    # Test filtering by client_id
    filtered_res = client.get(f"/api/matches?client_id={client_id}")
    assert filtered_res.status_code == 200
    assert all(m["client_id"] == client_id for m in filtered_res.json()["items"])

    # Test filtering by min_score
    min_score_res = client.get("/api/matches?min_score=99.9")
    assert min_score_res.status_code == 200
    # No matches should be >= 99.9

    # 4. GET /api/matches/{id}
    detail_res = client.get(f"/api/matches/{match_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == match_id
    assert detail_data["client"]["company_name"] == "Apex IoT Innovations"
    assert detail_data["supplier"]["supplier_name"] == "CircuitCraft Microelectronics"

    # 5. PATCH /api/matches/{id}/status
    patch_res = client.patch(f"/api/matches/{match_id}/status", json={"status": "accepted"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "accepted"

    # Verify status persisted
    get_updated = client.get(f"/api/matches/{match_id}")
    assert get_updated.json()["status"] == "accepted"


def test_batch_matching_api(client):
    # Trigger batch matching
    batch_res = client.post("/api/matching/run-all?min_score=30.0")
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    assert "clients_processed" in batch_data
    assert "suppliers_evaluated" in batch_data
    assert "matches_stored" in batch_data


def test_rescore_preserves_manually_set_status(client):
    """
    Verify that creating a match, updating its status to 'accepted', and then
    re-running matching for the same client NEVER overwrites status back to 'notified' or 'pending'.
    """
    # 1. Create client and supplier
    c_res = client.post(
        "/api/clients",
        json={
            "company_name": "AeroForge Dynamics",
            "product_requirement": "Aerospace Grade 6061-T6 Aluminum Billets",
            "category": "Raw Materials",
            "quantity_required": 12000,
            "budget": 95000.00,
            "location": "Seattle, WA",
            "delivery_timeline": "within 4 weeks",
        },
    )
    assert c_res.status_code == 201
    client_id = c_res.json()["id"]

    s_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Titanium & Alloy Works",
            "product_offered": "Certified Aerospace Grade Aluminum 6061-T6 Billets",
            "category": "Raw Materials",
            "available_quantity": 40000,
            "pricing_details": 7.25,
            "location": "Spokane, WA",
            "delivery_capability": "ships in 14-20 days",
        },
    )
    assert s_res.status_code == 201

    # 2. Run matching -> match created with status="notified"
    run_res_1 = client.post(f"/api/matching/run/{client_id}")
    assert run_res_1.status_code == 200
    matches_1 = run_res_1.json()
    assert len(matches_1) >= 1
    match_id = matches_1[0]["id"]
    assert matches_1[0]["status"] == "notified"

    # 3. PATCH status to 'accepted'
    patch_res = client.patch(f"/api/matches/{match_id}/status", json={"status": "accepted"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "accepted"

    # 4. Re-run matching for the same client
    run_res_2 = client.post(f"/api/matching/run/{client_id}")
    assert run_res_2.status_code == 200

    # 5. Assert the match's status is STILL 'accepted'
    get_res = client.get(f"/api/matches/{match_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "accepted"


def test_matches_export_csv(client):
    """
    Verify GET /api/matches/export returns CSV content with all 13 columns and proper headers.
    """
    # 1. Create client & supplier and match
    c_res = client.post(
        "/api/clients",
        json={
            "company_name": "CSV Export Client",
            "product_requirement": "Industrial Valves & Actuators",
            "category": "Industrial Valves",
            "quantity_required": 500,
            "budget": 30000.00,
            "location": "Houston, TX",
            "delivery_timeline": "within 2 weeks",
        },
    )
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]

    s_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Gulf Coast Flow Control",
            "product_offered": "Forged Steel Valves & Pneumatic Actuators",
            "category": "Industrial Valves",
            "available_quantity": 2500,
            "pricing_details": 45.00,
            "location": "Houston, TX",
            "delivery_capability": "ships in 5-7 days",
        },
    )
    assert s_res.status_code == 201

    client.post(f"/api/matching/run/{c_id}")

    # 2. Call export endpoint
    export_res = client.get("/api/matches/export")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert "matches_export.csv" in export_res.headers.get("content-disposition", "")

    csv_text = export_res.text
    lines = csv_text.strip().split("\r\n") if "\r\n" in csv_text else csv_text.strip().split("\n")
    assert len(lines) >= 2

    # Check header columns
    header = lines[0].split(",")
    expected_cols = [
        "client_name",
        "supplier_name",
        "category",
        "match_score",
        "semantic_score",
        "category_score",
        "location_score",
        "quantity_score",
        "budget_score",
        "delivery_score",
        "status",
        "match_reason",
        "created_at",
    ]
    assert header == expected_cols

    # Verify content in first data row
    assert "CSV Export Client" in csv_text
    assert "Gulf Coast Flow Control" in csv_text
