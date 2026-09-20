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
