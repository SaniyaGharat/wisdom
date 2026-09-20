# Pastel Match

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval.

## User Request
Build a complete React frontend for an AI-Powered Client–Supplier Matchmaking Platform (B2B procurement tool). This connects to an existing FastAPI backend via REST — do not build any backend logic, this is frontend only.

=== DESIGN DIRECTION (read this carefully, it matters more than the feature list) ===
Do NOT build a generic AI-generated-looking SaaS UI. Avoid: neon purple/blue gradients, glassmorphism, dark mode by default, overly rounded "bubbly" cards with heavy drop shadows, stock Inter font with no personality, generic gradient buttons, emoji-as-icons.

Instead, build this with a warm, pastel, editorial feel — cute but still professional enough for a B2B tool. Specifically:
- Light background, off-white/cream base (not pure white, not dark mode) — something like #FAF7F2 or a soft warm gray
- A pastel accent palette: think sage green, dusty rose, warm peach, soft butter yellow, muted lavender — pick 2-3 of these as primary/secondary/accent, not a full rainbow
- Typography with actual character: pair a friendly-but-structured serif or rounded display font for headings (e.g. something like Fraunces, Instrument Serif, or a soft geometric sans like Cabinet Grotesk) with a clean, readable body font. Avoid default system fonts and avoid Inter/Roboto looking generic.
- Flat or subtly-textured backgrounds instead of gradients. If you use shadows, keep them soft and low-opacity, not heavy glow effects.
- Rounded corners are fine but keep them moderate (8-14px), not maximally rounded "pill" everything
- Small illustrative touches are welcome (simple line-art icons, small decorative shapes) over generic icon-library icons wherever it fits naturally
- Score badges/gauges: use the pastel palette meaningfully — e.g. sage green for high match scores, butter yellow for moderate, dusty rose or soft coral for low — not harsh red/green/gray
- Buttons: solid pastel fill with a slightly darker border or subtle inset shadow on press, not gradient fills or neon glows
- This should feel like a thoughtfully designed small SaaS product a real design-conscious founder made, not a template

=== API INTEGRATION ===
Base URL from environment variable VITE_API_BASE_URL, defaulting to http://localhost:8000 for local dev.
Centralize all API calls in one client module.

All list endpoints return this envelope — handle it explicitly, don't assume a bare array:
{ "items": [...], "total": number, "limit": number, "offset": number, "has_more": boolean }

All errors return:
{ "error": string, "detail": string, "status_code": number, "errors": [{ "field", "message", "type" }] }
(the "errors" array appears on 422 validation errors — use it for inline field-level messages)

=== PAGES & FEATURES TO BUILD ===

1. Landing / Overview (/)
   - Hero section explaining the platform in plain language, warm and approachable tone (not corporate jargon-heavy)
   - Live KPI stats pulled from GET /api/dashboard/summary, shown as a few friendly stat cards
   - Two clear paths: "I'm looking for a supplier" (Client) / "I'm a supplier" (Supplier)
   - Brief, honest explanation of how the AI matching works (2-3 sentences, not a marketing wall of text)

2. Client Requirement Form (/clients/new, /clients/edit/:id)
   - Fields: company_name, product_requirement (textarea), category (dropdown + custom option), quantity_required, budget, location, delivery_timeline, additional_notes
   - POST to /api/clients, then offer "Find Matches" which calls POST /api/matching/run/{client_id} and routes to that client's dashboard
   - Inline validation matching backend rules (quantity/budget must be positive) with friendly, specific error copy, not "Invalid input"

3. Client Match Dashboard (/clients/:id/dashboard)
   - Pulled from GET /api/dashboard/clients/{id}
   - Shows the client's own requirement clearly at the top
   - Ranked match cards, each showing: supplier name, category, overall match_score as a soft pastel score badge, location, and the match_reason text in plain readable prose
   - Expandable section per card showing the 6 sub-scores (semantic, category, location, quantity, budget, delivery) as small progress bars in the pastel palette
   - Accept / Decline buttons per match (PATCH /api/matches/{id}/status), with status reflected as a small pastel badge (Notified / Accepted / Declined / Pending)
   - Notification bell showing unread count (GET /api/notifications/unread-count), opens a dropdown list (GET /api/notifications), marks read on open

4. Supplier Registration Form (/suppliers/new, /suppliers/edit/:id)
   - Mirrors the client form: supplier_name, product_offered, category, available_quantity, pricing_details, location, delivery_capability, additional_notes
   - Same POST + "Find Matches" flow

5. Supplier Match Dashboard (/suppliers/:id/dashboard)
   - Mirror of the client dashboard, from GET /api/dashboard/suppliers/{id}, showing inbound client matches instead

6. Platform Admin / Analytics (/admin)
   - KPI stat cards from GET /api/dashboard/summary (total clients, suppliers, matches, avg score, status breakdown)
   - Category breakdown chart from GET /api/dashboard/category-breakdown — a simple horizontal bar chart in the pastel palette, not a generic chart-library default theme
   - Live activity feed from GET /api/dashboard/recent-activity, chronological, with small distinct icons per event type (client_created, supplier_created, match_created, notification_sent)
   - Paginated/filterable all-matches table (GET /api/matches, filterable by status and min_score, sortable by score)
   - A "Run Matching for Everyone" button (POST /api/matching/run-all) for demo purposes

7. System health indicator
   - Small, subtle pill somewhere in the nav/footer using GET /api/health — a soft green dot + "All systems running" when status is "ok", a muted amber state if "degraded". Keep this understated, not a loud banner.

=== SESSION HANDLING (no auth yet) ===
No login system. After a client or supplier creates their profile, store their own ID in localStorage so returning users land back on their own dashboard via a simple "Select Client/Supplier" switcher in the nav — this simulates a logged-in view without building real auth.

=== STATES TO HANDLE EXPLICITLY ===
- Loading states for every API call (skeleton screens fit the pastel aesthetic better than spinners — use soft pulsing placeholder blocks)
- Empty states with friendly copy and an illustration or simple graphic, not a blank white area (e.g. "No matches yet — click Find Matches to see who's a fit")
- Error states that surface the backend's actual error message via a toast or inline banner, styled in the pastel palette (soft coral/rose for errors, not harsh red)

=== TECHNICAL ===
- React + TypeScript
- Mobile-responsive, but this is primarily a desktop business tool — don't over-invest in mobile polish
- No hardcoded data anywhere — everything comes from live API calls
- Handle loading/error/empty explicitly for every single data fetch, no assumed-success rendering
- Base URL configurable via VITE_API_BASE_URL (defaults to http://localhost:8000)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ab5b4c4-fd6b-4c80-a9c1-37bcf90449dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
