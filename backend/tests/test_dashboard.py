import uuid


def test_dashboard_summary_and_aggregations(client):
    # 1. Create client and supplier
    c_res = client.post(
        "/api/clients",
        json={
            "company_name": "EcoThread Apparel Co.",
            "product_requirement": "100% Organic Cotton Fabric Rolls",
            "category": "Textiles",
            "quantity_required": 10000,
            "budget": 35000.00,
            "location": "Portland, OR",
            "delivery_timeline": "within 2 weeks",
        },
    )
    assert c_res.status_code == 201
    client_id = c_res.json()["id"]

    s_res = client.post(
        "/api/suppliers",
        json={
            "supplier_name": "Verde Mills & Weaving",
            "product_offered": "GOTS Certified Organic Cotton Fabrics",
            "category": "Textiles",
            "available_quantity": 30000,
            "pricing_details": 3.20,
            "location": "Greensboro, NC",
            "delivery_capability": "ships in 7-10 days",
        },
    )
    assert s_res.status_code == 201
    supplier_id = s_res.json()["id"]

    # Trigger matching
    match_run = client.post(f"/api/matching/run/{client_id}")
    assert match_run.status_code == 200

    # 2. Test GET /api/dashboard/summary
    summary_res = client.get("/api/dashboard/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_clients"] >= 1
    assert summary["total_suppliers"] >= 1
    assert summary["total_matches"] >= 1
    assert "matches_by_status" in summary
    assert "notified" in summary["matches_by_status"] or "pending" in summary["matches_by_status"]
    assert summary["average_match_score"] > 0.0
    assert summary["matches_above_threshold_count"] >= 1

    # 3. Test GET /api/dashboard/clients/{client_id}
    client_dash = client.get(f"/api/dashboard/clients/{client_id}")
    assert client_dash.status_code == 200
    c_dash_data = client_dash.json()
    assert c_dash_data["client"]["id"] == client_id
    assert c_dash_data["total_matches_count"] >= 1
    assert len(c_dash_data["matches"]) >= 1
    assert c_dash_data["unread_notifications_count"] >= 1

    # 4. Test GET /api/dashboard/suppliers/{supplier_id}
    supplier_dash = client.get(f"/api/dashboard/suppliers/{supplier_id}")
    assert supplier_dash.status_code == 200
    s_dash_data = supplier_dash.json()
    assert s_dash_data["supplier"]["id"] == supplier_id
    assert s_dash_data["total_matches_count"] >= 1
    assert s_dash_data["unread_notifications_count"] >= 1

    # 5. Test 404 for non-existent client/supplier dashboards
    random_id = str(uuid.uuid4())
    assert client.get(f"/api/dashboard/clients/{random_id}").status_code == 404
    assert client.get(f"/api/dashboard/suppliers/{random_id}").status_code == 404

    # 6. Test GET /api/dashboard/category-breakdown
    cat_res = client.get("/api/dashboard/category-breakdown")
    assert cat_res.status_code == 200
    cats = cat_res.json()
    assert isinstance(cats, list)
    textile_cat = next((c for c in cats if c["category"] == "Textiles"), None)
    assert textile_cat is not None
    assert textile_cat["total_clients"] >= 1
    assert textile_cat["total_suppliers"] >= 1
    assert textile_cat["total_matches"] >= 1
    assert textile_cat["average_match_score"] > 50.0

    # 7. Test GET /api/dashboard/recent-activity
    act_res = client.get("/api/dashboard/recent-activity?limit=10")
    assert act_res.status_code == 200
    activity = act_res.json()
    assert activity["total_items"] >= 1
    types = [item["type"] for item in activity["items"]]
    assert any(t in types for t in ["client_created", "supplier_created", "match_created", "notification_sent"])
