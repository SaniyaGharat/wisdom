import uuid


def test_create_supplier_success(client):
    payload = {
        "supplier_name": "Apex Microdevices",
        "product_offered": "Custom Multi-layer PCB Assembly",
        "category": "Electronics",
        "available_quantity": 25000,
        "pricing_details": 12.50,
        "location": "Dallas, TX",
        "delivery_capability": "ships in 5-7 business days",
        "additional_notes": "ISO 9001 certified.",
    }
    response = client.post("/api/suppliers", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["supplier_name"] == payload["supplier_name"]
    assert data["product_offered"] == payload["product_offered"]
    assert data["category"] == payload["category"]
    assert data["available_quantity"] == payload["available_quantity"]
    assert float(data["pricing_details"]) == payload["pricing_details"]
    assert data["location"] == payload["location"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_supplier_validation_errors(client):
    # Available quantity <= 0
    payload_invalid_qty = {
        "supplier_name": "Apex Microdevices",
        "product_offered": "PCBs",
        "category": "Electronics",
        "available_quantity": -5,
        "pricing_details": 10.0,
        "location": "Dallas, TX",
        "delivery_capability": "ships in 5 days",
    }
    response = client.post("/api/suppliers", json=payload_invalid_qty)
    assert response.status_code == 422

    # Negative price
    payload_invalid_price = {
        "supplier_name": "Apex Microdevices",
        "product_offered": "PCBs",
        "category": "Electronics",
        "available_quantity": 100,
        "pricing_details": -2.50,
        "location": "Dallas, TX",
        "delivery_capability": "ships in 5 days",
    }
    response = client.post("/api/suppliers", json=payload_invalid_price)
    assert response.status_code == 422

    # Missing required field
    payload_missing = {
        "supplier_name": "Incomplete Supplier",
    }
    response = client.post("/api/suppliers", json=payload_missing)
    assert response.status_code == 422


def test_get_supplier_by_id(client):
    create_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Quantum Tech",
            "product_offered": "Sensors",
            "category": "Electronics",
            "available_quantity": 5000,
            "pricing_details": 4.25,
            "location": "San Jose, CA",
            "delivery_capability": "ships in 3 days",
        },
    )
    supplier_id = create_res.json()["id"]

    get_res = client.get(f"/api/suppliers/{supplier_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == supplier_id
    assert get_res.json()["supplier_name"] == "Quantum Tech"


def test_get_supplier_not_found(client):
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/suppliers/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_supplier(client):
    create_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Nordic Textiles",
            "product_offered": "Organic Cotton Yarn",
            "category": "Textiles",
            "available_quantity": 12000,
            "pricing_details": 8.00,
            "location": "Portland, OR",
            "delivery_capability": "ships in 10 days",
        },
    )
    supplier_id = create_res.json()["id"]

    update_payload = {
        "available_quantity": 15000,
        "pricing_details": 7.50,
        "delivery_capability": "ships in 7 days",
    }
    update_res = client.put(f"/api/suppliers/{supplier_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["available_quantity"] == 15000
    assert float(updated_data["pricing_details"]) == 7.50
    assert updated_data["delivery_capability"] == "ships in 7 days"
    assert updated_data["supplier_name"] == "Nordic Textiles"


def test_update_supplier_not_found(client):
    random_id = str(uuid.uuid4())
    update_res = client.put(f"/api/suppliers/{random_id}", json={"supplier_name": "New Name"})
    assert update_res.status_code == 404


def test_delete_supplier(client):
    create_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "EcoPack Containers",
            "product_offered": "Molded Pulp Trays",
            "category": "Packaging",
            "available_quantity": 30000,
            "pricing_details": 0.45,
            "location": "Chicago, IL",
            "delivery_capability": "ships in 4 days",
        },
    )
    supplier_id = create_res.json()["id"]

    del_res = client.delete(f"/api/suppliers/{supplier_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/api/suppliers/{supplier_id}")
    assert get_res.status_code == 404


def test_delete_supplier_not_found(client):
    random_id = str(uuid.uuid4())
    del_res = client.delete(f"/api/suppliers/{random_id}")
    assert del_res.status_code == 404


def test_list_suppliers_pagination_and_filtering(client):
    categories_and_locs = [
        ("Electronics", "Austin, TX"),
        ("Electronics", "Dallas, TX"),
        ("Raw Materials", "Seattle, WA"),
        ("Packaging", "Chicago, IL"),
    ]
    for i, (cat, loc) in enumerate(categories_and_locs):
        client.post(
            "/api/suppliers",
            json={
                "supplier_name": f"Supplier {i+1}",
                "product_offered": f"Supplied Goods {i+1}",
                "category": cat,
                "available_quantity": 500 * (i + 1),
                "pricing_details": 2.50 * (i + 1),
                "location": loc,
                "delivery_capability": "ships in 5 days",
            },
        )

    # Test pagination
    list_res = client.get("/api/suppliers?limit=2&offset=0")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["items"]) == 2
    assert data["total"] >= 4

    # Test category filter
    cat_res = client.get("/api/suppliers?category=Electronics")
    assert cat_res.status_code == 200
    cat_data = cat_res.json()
    assert all(item["category"] == "Electronics" for item in cat_data["items"])
    assert cat_data["total"] >= 2

    # Test location filter
    loc_res = client.get("/api/suppliers?location=TX")
    assert loc_res.status_code == 200
    loc_data = loc_res.json()
    assert all("TX" in item["location"] for item in loc_data["items"])
