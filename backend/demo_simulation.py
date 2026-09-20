import urllib.request
import json
import time

BASE_URL = 'http://127.0.0.1:8000/api'

def req(path, method='GET', data=None):
    url = f'{BASE_URL}{path}'
    body = json.dumps(data).encode('utf-8') if data else None
    headers = {'Content-Type': 'application/json'} if data else {}
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request) as res:
        return res.getcode(), json.loads(res.read().decode())

print("=" * 65)
print("  AI-POWERED CLIENT-SUPPLIER MATCHMAKING DEMO SIMULATION")
print("=" * 65)

# 1. System Health
print("\n[Step 1] Verifying System Health...")
code, health = req('/health')
print(f"  HTTP Status: {code}")
print(f"  Backend Status: {health['status']} | DB: {health['database']} | AI Model: {health['embedding_model']}")
assert health['status'] == 'ok', "Health check failed"

# 2. Summary Dashboard
print("\n[Step 2] Fetching Intelligence Platform Summary...")
code, summary = req('/dashboard/summary')
print(f"  Total Clients: {summary['total_clients']}")
print(f"  Total Suppliers: {summary['total_suppliers']}")
print(f"  Total AI Matches: {summary['total_matches']}")
print(f"  Average Match Score: {summary['average_match_score']}%")

# 3. Fetch Seeded Client & Matches
print("\n[Step 3] Fetching Seeded Client & Match Breakdown...")
code, clients_env = req('/clients?limit=20')
client = None
matches_env = None
for c in clients_env['items']:
    code, m_env = req(f"/matches?client_id={c['id']}&limit=3")
    if m_env['total'] > 0:
        client = c
        matches_env = m_env
        break

assert client is not None, "No client with matches found"
client_id = client['id']
print(f"\n  Found {matches_env['total']} total matches for {client['company_name']}:")
for i, m in enumerate(matches_env['items'], 1):
    print(f"  Match #{i}: Overall Score: {m['match_score']:.1f}% | Status: [{m['status'].upper()}]")
    print(f"    Breakdown => Semantic: {m.get('semantic_score', 0)*100:.1f}% | Category: {m.get('category_score', 0)*100:.0f}% | Budget: {m.get('budget_score', 0)*100:.0f}% | Location: {m.get('location_score', 0)*100:.0f}%")
    print(f"    AI Reason: \"{m.get('match_reason', 'N/A')}\"")

# 4. Status Transition
match_to_update = matches_env['items'][0]
print(f"\n[Step 4] Simulating Client Action: Accepting Match ({match_to_update['id']})...")
code, updated_match = req(f"/matches/{match_to_update['id']}/status", method='PATCH', data={'status': 'accepted'})
print(f"  PATCH HTTP: {code} => Match status successfully updated to: '{updated_match['status']}'")
assert updated_match['status'] == 'accepted'

# 5. Live Simulation: Create New Client & Run AI Engine
print("\n[Step 5] Simulating New Client Registration & Instant AI Matching...")
timestamp = int(time.time())
new_client_payload = {
    'company_name': f'AeroVision Robotics #{timestamp % 1000}',
    'category': 'Electronics',
    'product_requirement': 'Autonomous flight navigation systems, multi-sensor fusion, LiDAR integration and low-latency computer vision edge inference on Jetson Orin microcontrollers.',
    'quantity_required': 500,
    'budget': 85000,
    'location': 'Seattle, WA',
    'delivery_timeline': 'within 4 months',
    'additional_notes': 'Must have AS9100 aerospace certification and fast turnaround prototyping.'
}
code, created_client = req('/clients', method='POST', data=new_client_payload)
print(f"  Created Client: '{created_client['company_name']}' (UUID: {created_client['id']})")

code, match_run = req(f"/matching/run/{created_client['id']}", method='POST')
print(f"  AI Matching Engine: Generated {len(match_run)} high-affinity supplier matches in real time!")
for i, m in enumerate(match_run[:3], 1):
    print(f"    #{i} Supplier: {m['supplier_id']} | Score: {m['match_score']:.1f}% | Semantic: {m['semantic_score']*100:.1f}% | Status: [{m['status']}]")

# 6. Notifications
print("\n[Step 6] Verifying Automated In-App Notifications...")
code, notifications = req(f"/notifications?recipient_id={created_client['id']}")
print(f"  In-App Notifications generated for client: {notifications['total']} alerts")
for i, n in enumerate(notifications['items'][:3], 1):
    print(f"    Alert #{i} (read={n['is_read']}): {n['message']}")

# Mark all as read
code, mark_res = req(f"/notifications/mark-all-read?recipient_type=client&recipient_id={created_client['id']}", method='PATCH')
print(f"  Mark-All-Read API: {mark_res['message']}")

# 7. Category Breakdown
print("\n[Step 7] Checking Intelligence Analytics Category Breakdown...")
code, breakdown = req('/dashboard/category-breakdown')
print(f"  Active Industry Verticals: {len(breakdown)}")
for cat in breakdown:
    print(f"    * {cat['category']:<16} | Clients: {cat['total_clients']} | Suppliers: {cat['total_suppliers']} | Matches: {cat['total_matches']:<3} | Avg Score: {cat['average_match_score']:.1f}%")

# 8. Recent Activity Feed
print("\n[Step 8] Checking Live Real-Time Activity Feed...")
code, activity = req('/dashboard/recent-activity?limit=5')
print(f"  Total Recent Activities: {activity['total_items']}")
for act in activity['items'][:3]:
    print(f"    - [{act['type']}] {act['title']} => {act['description']}")

print("\n" + "=" * 65)
print("  >>> ALL DEMO SIMULATION STAGES COMPLETED SUCCESSFULLY (100%) <<<")
print("=" * 65)
