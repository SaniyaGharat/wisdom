import sys
import io
import os
import urllib.request
import json
import time

# ── UTF-8 stdout fix for Windows consoles (cp1252 / cp850 / cp437) ──────────
os.environ["PYTHONIOENCODING"] = "utf-8"

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
elif hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
elif hasattr(sys.stderr, "buffer"):
    try:
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass


def safe_print(text=""):
    """Print with fallback: replace unencodable chars instead of crashing."""
    try:
        print(text)
    except UnicodeEncodeError:
        try:
            print(str(text).encode("ascii", errors="replace").decode("ascii"))
        except Exception:
            pass
    except Exception:
        try:
            print(str(text).encode("utf-8", errors="replace").decode("utf-8", errors="replace"))
        except Exception:
            pass


BASE_URL = "http://127.0.0.1:8000/api"


def req(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    headers = {"Content-Type": "application/json"} if data else {}
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request) as res:
        return res.getcode(), json.loads(res.read().decode("utf-8"))


safe_print("=" * 65)
safe_print("  AI-POWERED CLIENT-SUPPLIER MATCHMAKING DEMO SIMULATION")
safe_print("=" * 65)

# 1. System Health
safe_print("\n[Step 1] Verifying System Health...")
code, health = req("/health")
safe_print(f"  HTTP Status: {code}")
safe_print(f"  Backend Status: {health['status']} | DB: {health['database']} | AI Model: {health['embedding_model']}")
assert health["status"] == "ok", "Health check failed"

# 2. Summary Dashboard
safe_print("\n[Step 2] Fetching Intelligence Platform Summary...")
code, summary = req("/dashboard/summary")
safe_print(f"  Total Clients: {summary['total_clients']}")
safe_print(f"  Total Suppliers: {summary['total_suppliers']}")
safe_print(f"  Total AI Matches: {summary['total_matches']}")
safe_print(f"  Average Match Score: {summary['average_match_score']}%")

# 3. Fetch Seeded Client & Matches
safe_print("\n[Step 3] Fetching Seeded Client & Match Breakdown...")
code, clients_env = req("/clients?limit=20")
client = None
matches_env = None
for c in clients_env["items"]:
    code, m_env = req(f"/matches?client_id={c['id']}&limit=3")
    if m_env["total"] > 0:
        client = c
        matches_env = m_env
        break

assert client is not None, "No client with matches found"
client_id = client["id"]
safe_print(f"\n  Found {matches_env['total']} total matches for {client['company_name']}:")
for i, m in enumerate(matches_env["items"], 1):
    safe_print(f"  Match #{i}: Overall Score: {m['match_score']:.1f}% | Status: [{m['status'].upper()}]")
    safe_print(f"    Breakdown => Semantic: {m.get('semantic_score', 0)*100:.1f}% | Category: {m.get('category_score', 0)*100:.0f}% | Budget: {m.get('budget_score', 0)*100:.0f}% | Location: {m.get('location_score', 0)*100:.0f}%")
    reason = m.get("match_reason", "N/A")
    safe_print(f"    AI Reason: \"{reason}\"")

# 4. Realistic Match Decision Simulation
# Assign realistic accepted / rejected / pending statuses across score bands
# to reflect realistic buyer decision calibration (higher score => higher acceptance rate).
safe_print("\n[Step 4] Simulating Realistic Decision Pipeline Across Score Bands...")
code, all_matches_env = req("/matches?limit=100")
all_matches = all_matches_env.get("items", [])

band_buckets = {
    "90-100": [],
    "80-89": [],
    "70-79": [],
    "60-69": [],
    "50-59": [],
    "40-49": [],
}
for m in all_matches:
    s = m["match_score"]
    if s >= 90:
        band_buckets["90-100"].append(m)
    elif s >= 80:
        band_buckets["80-89"].append(m)
    elif s >= 70:
        band_buckets["70-79"].append(m)
    elif s >= 60:
        band_buckets["60-69"].append(m)
    elif s >= 50:
        band_buckets["50-59"].append(m)
    elif s >= 40:
        band_buckets["40-49"].append(m)

# Target counts per band: (target_accepted, target_rejected)
# Remaining matches in each band remain 'pending'
band_targets = {
    "90-100": (1, 0),   # 100% acceptance
    "80-89":  (4, 1),   # 80.0% acceptance
    "70-79":  (1, 1),   # 50.0% acceptance
    "60-69":  (1, 2),   # 33.3% acceptance
    "50-59":  (1, 3),   # 25.0% acceptance
    "40-49":  (0, 8),   # 0.0% acceptance
}

status_counts = {"accepted": 0, "rejected": 0, "pending": 0}
for band_name, (n_acc, n_rej) in band_targets.items():
    matches_in_band = band_buckets[band_name]
    for idx, m in enumerate(matches_in_band):
        if idx < n_acc:
            new_status = "accepted"
        elif idx < n_acc + n_rej:
            new_status = "rejected"
        else:
            new_status = "pending"

        req(f"/matches/{m['id']}/status", method="PATCH", data={"status": new_status})
        status_counts[new_status] += 1

safe_print(f"  Decision Simulation Completed: {status_counts['accepted']} accepted, {status_counts['rejected']} rejected, {status_counts['pending']} pending.")

# 5. Live Simulation: Create New Client & Run AI Engine
safe_print("\n[Step 5] Simulating New Client Registration & Instant AI Matching...")
timestamp = int(time.time())
new_client_payload = {
    "company_name": f"AeroVision Robotics #{timestamp % 1000}",
    "category": "Electronics",
    "product_requirement": "Autonomous flight navigation systems, multi-sensor fusion, LiDAR integration and low-latency computer vision edge inference on Jetson Orin microcontrollers.",
    "quantity_required": 500,
    "budget": 85000,
    "location": "Seattle, WA",
    "delivery_timeline": "within 4 months",
    "additional_notes": "Must have AS9100 aerospace certification and fast turnaround prototyping.",
}
code, created_client = req("/clients", method="POST", data=new_client_payload)
safe_print(f"  Created Client: '{created_client['company_name']}' (UUID: {created_client['id']})")

code, match_run = req(f"/matching/run/{created_client['id']}", method="POST")
safe_print(f"  AI Matching Engine: Generated {len(match_run)} high-affinity supplier matches in real time!")
for i, m in enumerate(match_run[:3], 1):
    safe_print(f"    #{i} Supplier: {m['supplier_id']} | Score: {m['match_score']:.1f}% | Semantic: {m['semantic_score']*100:.1f}% | Status: [{m['status']}]")

# 6. Notifications
safe_print("\n[Step 6] Verifying Automated In-App Notifications...")
code, notifications = req(f"/notifications?recipient_id={created_client['id']}")
safe_print(f"  In-App Notifications generated for client: {notifications['total']} alerts")
for i, n in enumerate(notifications["items"][:3], 1):
    safe_print(f"    Alert #{i} (read={n['is_read']}): {n['message']}")

# Mark all as read
code, mark_res = req(f"/notifications/mark-all-read?recipient_type=client&recipient_id={created_client['id']}", method="PATCH")
safe_print(f"  Mark-All-Read API: {mark_res['message']}")

# 7. Category Breakdown
safe_print("\n[Step 7] Checking Intelligence Analytics Category Breakdown...")
code, breakdown = req("/dashboard/category-breakdown")
safe_print(f"  Active Industry Verticals: {len(breakdown)}")
for cat in breakdown:
    safe_print(f"    * {cat['category']:<26} | Clients: {cat['total_clients']} | Suppliers: {cat['total_suppliers']} | Matches: {cat['total_matches']:<3} | Avg Score: {cat['average_match_score']:.1f}%")

# 8. Recent Activity Feed
safe_print("\n[Step 8] Checking Live Real-Time Activity Feed...")
code, activity = req("/dashboard/recent-activity?limit=5")
safe_print(f"  Total Recent Activities: {activity['total_items']}")
for act in activity["items"][:3]:
    safe_print(f"    - [{act['type']}] {act['title']} => {act['description']}")

# 9. Score Effectiveness Calibration
safe_print("\n[Step 9] Verifying Score Effectiveness Calibration Analysis...")
code, effectiveness = req("/dashboard/score-effectiveness")
safe_print(f"  HTTP Status: {code}")
safe_print(f"  {'Band':<10} | {'Total':<6} | {'Accepted':<8} | {'Rejected':<8} | {'Pending':<8} | {'Acceptance Rate'}")
safe_print("  " + "-" * 62)
for b in effectiveness:
    rate_str = f"{b['acceptance_rate']*100:.1f}%" if b['acceptance_rate'] is not None else "N/A"
    safe_print(f"  {b['band']:<10} | {b['total_matches']:<6} | {b['accepted_count']:<8} | {b['rejected_count']:<8} | {b['pending_count']:<8} | {rate_str}")

# 10. CSV Export & Currency Consistency
safe_print("\n[Step 10] Verifying CSV Export & Currency Consistency...")
url = f"{BASE_URL}/matches/export"
req_export = urllib.request.Request(url)
with urllib.request.urlopen(req_export) as res:
    csv_bytes = res.read()
    csv_text = csv_bytes.decode("utf-8")
    csv_lines = [line for line in csv_text.strip().split("\n") if line.strip()]
    has_dollar = "$" in csv_text
    has_rupee = "₹" in csv_text
    safe_print(f"  Exported CSV Rows: {len(csv_lines)} (including header)")
    safe_print(f"  Contains ₹ currency symbol: {has_rupee}")
    safe_print(f"  Contains leftover $ sign: {has_dollar}")
    assert not has_dollar, "Export contains leftover dollar sign!"
    assert has_rupee, "Export missing rupee currency symbol!"

safe_print("\n" + "=" * 65)
safe_print("  >>> ALL DEMO SIMULATION STAGES COMPLETED SUCCESSFULLY (100%) <<<")
safe_print("=" * 65)
