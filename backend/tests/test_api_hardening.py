import uuid
import pytest


def test_pagination_envelope_clients(client):
    """Verify pagination envelope on /api/clients."""
    # Seed clients
    for i in range(5):
        client.post(
            "/api/clients",
            json={
                "company_name": f"Pagination Client {i}",
                "product_requirement": f"Component Requirement {i}",
                "category": "Electronics",
                "quantity_required": 1000 * (i + 1),
                "budget": 10000.0 * (i + 1),
                "location": "Austin, TX, USA",
                "delivery_timeline": "within 2 weeks",
            },
        )

    # Page 1: limit 2, offset 0 -> has_more should be True
    res1 = client.get("/api/clients?limit=2&offset=0")
    assert res1.status_code == 200
    data1 = res1.json()
    assert "items" in data1
    assert "total" in data1
    assert "limit" in data1
    assert "offset" in data1
    assert "has_more" in data1
    assert data1["limit"] == 2
    assert data1["offset"] == 0
    assert len(data1["items"]) == 2
    assert data1["total"] >= 5
    assert data1["has_more"] is True

    # High offset -> has_more should be False
    res2 = client.get(f"/api/clients?limit=10&offset={data1['total']}")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["has_more"] is False
    assert len(data2["items"]) == 0


def test_pagination_envelope_suppliers(client):
    """Verify pagination envelope on /api/suppliers."""
    for i in range(4):
        client.post(
            "/api/suppliers",
            json={
                "supplier_name": f"Pagination Supplier {i}",
                "product_offered": f"Turnkey Assembly {i}",
                "category": "Manufacturing",
                "available_quantity": 5000 * (i + 1),
                "pricing_details": 15.0 * (i + 1),
                "location": "Dallas, TX, USA",
                "delivery_capability": "ships in 10 days",
            },
        )

    res = client.get("/api/suppliers?limit=2&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "has_more" in data
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["items"]) == 2
    assert data["has_more"] is True


def test_pagination_envelope_notifications(client):
    """Verify pagination envelope on /api/notifications."""
    res = client.get("/api/notifications?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "has_more" in data
    assert isinstance(data["has_more"], bool)


def test_pagination_envelope_matches(client):
    """Verify pagination envelope on /api/matches."""
    res = client.get("/api/matches?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "has_more" in data
    assert isinstance(data["has_more"], bool)


def test_pagination_max_limit_422(client):
    """Verify that exceeding max pagination limit of 100 returns a 422 validation error."""
    # Test on clients
    res1 = client.get("/api/clients?limit=150")
    assert res1.status_code == 422
    data1 = res1.json()
    assert data1["error"] == "Validation Error"
    assert data1["status_code"] == 422
    assert "errors" in data1
    assert any("limit" in err.get("field", "") for err in data1["errors"])

    # Test on suppliers
    res2 = client.get("/api/suppliers?limit=101")
    assert res2.status_code == 422

    # Test on notifications
    res3 = client.get("/api/notifications?limit=200")
    assert res3.status_code == 422

    # Test on matches
    res4 = client.get("/api/matches?limit=500")
    assert res4.status_code == 422


def test_404_not_found_on_nonexistent_ids(client):
    """Verify clean 404 error envelope on non-existent UUIDs across multiple endpoints."""
    fake_id = uuid.uuid4()

    # 1. Client GET by ID
    res1 = client.get(f"/api/clients/{fake_id}")
    assert res1.status_code == 404
    d1 = res1.json()
    assert d1["status_code"] == 404
    assert f"'{fake_id}'" in d1["detail"] or str(fake_id) in d1["detail"]

    # 2. Supplier GET by ID
    res2 = client.get(f"/api/suppliers/{fake_id}")
    assert res2.status_code == 404
    d2 = res2.json()
    assert d2["status_code"] == 404
    assert str(fake_id) in d2["detail"]

    # 3. Match GET by ID
    res3 = client.get(f"/api/matches/{fake_id}")
    assert res3.status_code == 404
    d3 = res3.json()
    assert d3["status_code"] == 404
    assert str(fake_id) in d3["detail"]

    # 4. Notification GET by ID
    res4 = client.get(f"/api/notifications/{fake_id}")
    assert res4.status_code == 404
    d4 = res4.json()
    assert d4["status_code"] == 404
    assert str(fake_id) in d4["detail"]

    # 5. Matching trigger for non-existent client
    res5 = client.post(f"/api/matching/run/{fake_id}")
    assert res5.status_code == 404
    d5 = res5.json()
    assert d5["status_code"] == 404
    assert str(fake_id) in d5["detail"]

    # 6. Dashboard client view for non-existent client
    res6 = client.get(f"/api/dashboard/clients/{fake_id}")
    assert res6.status_code == 404
    d6 = res6.json()
    assert d6["status_code"] == 404
    assert str(fake_id) in d6["detail"]

    # 7. Dashboard supplier view for non-existent supplier
    res7 = client.get(f"/api/dashboard/suppliers/{fake_id}")
    assert res7.status_code == 404
    d7 = res7.json()
    assert d7["status_code"] == 404
    assert str(fake_id) in d7["detail"]


def test_422_validation_error_envelope(client):
    """Verify structured field-level error messages in 422 responses."""
    invalid_payload = {
        "company_name": "",  # min_length=1 violation
        "product_requirement": "Valid requirement",
        "category": "Electronics",
        "quantity_required": -10,  # gt=0 violation
        "budget": -500.0,  # ge=0 violation
        "location": "Austin, TX",
        "delivery_timeline": "1 week",
    }
    response = client.post("/api/clients", json=invalid_payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    assert data["status_code"] == 422
    assert "errors" in data
    assert len(data["errors"]) >= 2
    fields_with_errors = [e["field"] for e in data["errors"]]
    assert any("quantity_required" in f for f in fields_with_errors)
    assert any("budget" in f for f in fields_with_errors)
