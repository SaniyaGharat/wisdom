import uuid


def test_create_client_success(client):
    payload = {
        "company_name": "Nova Tech",
        "product_requirement": "Custom Aluminum Enclosures",
        "category": "Packaging",
        "quantity_required": 1500,
        "budget": 25000.50,
        "location": "Austin, TX",
        "delivery_timeline": "within 3 weeks",
        "additional_notes": "Anodized black finish required.",
    }
    response = client.post("/api/clients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == payload["company_name"]
    assert data["product_requirement"] == payload["product_requirement"]
    assert data["category"] == payload["category"]
    assert data["quantity_required"] == payload["quantity_required"]
    assert float(data["budget"]) == payload["budget"]
    assert data["location"] == payload["location"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_client_validation_errors(client):
    # Quantity required <= 0
    payload_invalid_qty = {
        "company_name": "Nova Tech",
        "product_requirement": "Custom Enclosures",
        "category": "Packaging",
        "quantity_required": 0,
        "budget": 1000.0,
        "location": "Austin, TX",
        "delivery_timeline": "within 2 weeks",
    }
    response = client.post("/api/clients", json=payload_invalid_qty)
    assert response.status_code == 422

    # Negative budget
    payload_invalid_budget = {
        "company_name": "Nova Tech",
        "product_requirement": "Custom Enclosures",
        "category": "Packaging",
        "quantity_required": 100,
        "budget": -50.0,
        "location": "Austin, TX",
        "delivery_timeline": "within 2 weeks",
    }
    response = client.post("/api/clients", json=payload_invalid_budget)
    assert response.status_code == 422

    # Missing required field
    payload_missing_fields = {
        "company_name": "Nova Tech",
    }
    response = client.post("/api/clients", json=payload_missing_fields)
    assert response.status_code == 422


def test_get_client_by_id(client):
    # Create client
    create_res = client.post(
        "/api/clients",
        json={
            "company_name": "Alpha Corp",
            "product_requirement": "Microcontrollers",
            "category": "Electronics",
            "quantity_required": 500,
            "budget": 5000.0,
            "location": "San Francisco, CA",
            "delivery_timeline": "10 days",
        },
    )
    client_id = create_res.json()["id"]

    # Get by ID
    get_res = client.get(f"/api/clients/{client_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == client_id
    assert get_res.json()["company_name"] == "Alpha Corp"


def test_get_client_not_found(client):
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/clients/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_client(client):
    create_res = client.post(
        "/api/clients",
        json={
            "company_name": "Beta Labs",
            "product_requirement": "Sensors",
            "category": "Electronics",
            "quantity_required": 300,
            "budget": 4500.0,
            "location": "Boston, MA",
            "delivery_timeline": "2 weeks",
        },
    )
    client_id = create_res.json()["id"]

    update_payload = {
        "quantity_required": 600,
        "budget": 8500.0,
        "additional_notes": "Updated rush order",
    }
    update_res = client.put(f"/api/clients/{client_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["quantity_required"] == 600
    assert float(updated_data["budget"]) == 8500.0
    assert updated_data["additional_notes"] == "Updated rush order"
    assert updated_data["company_name"] == "Beta Labs"


def test_update_client_not_found(client):
    random_id = str(uuid.uuid4())
    update_res = client.put(f"/api/clients/{random_id}", json={"company_name": "New Name"})
    assert update_res.status_code == 404


def test_delete_client(client):
    create_res = client.post(
        "/api/clients",
        json={
            "company_name": "Gamma Industries",
            "product_requirement": "Cotton Rolls",
            "category": "Textiles",
            "quantity_required": 2000,
            "budget": 12000.0,
            "location": "Seattle, WA",
            "delivery_timeline": "4 weeks",
        },
    )
    client_id = create_res.json()["id"]

    # Delete
    del_res = client.delete(f"/api/clients/{client_id}")
    assert del_res.status_code == 204

    # Confirm deletion
    get_res = client.get(f"/api/clients/{client_id}")
    assert get_res.status_code == 404


def test_delete_client_not_found(client):
    random_id = str(uuid.uuid4())
    del_res = client.delete(f"/api/clients/{random_id}")
    assert del_res.status_code == 404


def test_list_clients_pagination_and_filtering(client):
    # Insert multiple clients across different categories and locations
    categories_and_locs = [
        ("Electronics", "Austin, TX"),
        ("Electronics", "San Jose, CA"),
        ("Textiles", "Austin, TX"),
        ("Packaging", "Denver, CO"),
    ]
    for i, (cat, loc) in enumerate(categories_and_locs):
        client.post(
            "/api/clients",
            json={
                "company_name": f"Client {i+1}",
                "product_requirement": f"Item {i+1}",
                "category": cat,
                "quantity_required": 100 * (i + 1),
                "budget": 1000.0 * (i + 1),
                "location": loc,
                "delivery_timeline": "1 week",
            },
        )

    # Test pagination
    list_res = client.get("/api/clients?limit=2&offset=0")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["items"]) == 2
    assert data["total"] >= 4

    # Test category filter
    cat_res = client.get("/api/clients?category=Electronics")
    assert cat_res.status_code == 200
    cat_data = cat_res.json()
    assert all(item["category"] == "Electronics" for item in cat_data["items"])
    assert cat_data["total"] >= 2

    # Test location filter
    loc_res = client.get("/api/clients?location=Austin")
    assert loc_res.status_code == 200
    loc_data = loc_res.json()
    assert all("Austin" in item["location"] for item in loc_data["items"])
