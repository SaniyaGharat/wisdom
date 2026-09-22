# AI-Powered Client–Supplier Matchmaking Platform — Technical Documentation

## 1. Overview

The **AI-Powered Client–Supplier Matchmaking Platform** is an enterprise B2B procurement and discovery web application designed to connect corporate buyers and procurement teams with verified industrial suppliers, manufacturers, and fabricators. Built for organizations looking to streamline supply chain discovery, the platform eliminates manual RFQ routing and brittle keyword searches by translating unstructured client requirements and supplier catalog capabilities into dense semantic representations, combining them with hard commercial constraints (categories, geographic proximity, capacity volumes, budget limits, and lead times) to calculate transparent, auditable match scores with real-time in-app notifications and dedicated role-based dashboards.

---

## 2. Architecture

The platform follows a clean, decoupled service architecture consisting of a **React/TypeScript Single Page Application (SPA)**, a high-throughput **FastAPI asynchronous backend**, a relational **PostgreSQL database**, a distinct **AI Semantic & Heuristic Matching Engine**, and an extensible **Notification Service Layer**.

### High-Level System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI["React 19 + TypeScript SPA<br/>Vite, TanStack Router/Query, Tailwind CSS"]
    end

    subgraph API Gateway and Service Layer
        API["FastAPI REST Backend :8000<br/>Pydantic v2, CORS, Structured Exception Envelopes"]
        Router["Routers: /clients, /suppliers, /matching, /notifications, /dashboard"]
    end

    subgraph Core Engines and Services
        Engine["AI Matching Engine<br/>SentenceTransformers all-MiniLM-L6-v2 + Cosine Similarity"]
        Scorer["Deterministic Business Scorer<br/>Category, Location, Quantity, Budget, Delivery"]
        NotifService["Notification Service<br/>BaseNotificationProvider to DatabaseNotificationProvider"]
    end

    subgraph Persistence Layer
        DB[("PostgreSQL Database :5432<br/>Clients, Suppliers, Matches, Notifications")]
    end

    UI -->|"HTTP / JSON REST API"| API
    API --> Router
    Router --> Engine
    Router --> NotifService
    Engine --> Scorer
    Router -->|"SQLAlchemy 2.0 ORM"| DB
    Engine -->|"Read/Upsert Matches"| DB
    NotifService -->|"Persist Alerts"| DB
```

### Core Use Case Request Flow

The core workflow executes from requirement ingestion through AI scoring to multi-stakeholder alert dispatch:

```
[Client or Supplier User]
      │
      │ 1. Submits Procurement Requirement or Offering via UI Form
      ▼
[FastAPI Backend: POST /api/clients or POST /api/suppliers]
      │
      │ 2. Validates payload via Pydantic & persists to PostgreSQL
      ▼
[PostgreSQL: clients & suppliers tables]
      │
      │ 3. Triggers matching pipeline:
      │    - Automatic trigger on ingestion
      │    - On-demand trigger: POST /api/matching/run/{id} (client or supplier)
      │    - Dedicated supplier trigger: POST /api/matching/run-supplier/{supplier_id}
      │    - Frontend renders multi-stage animated MatchmakingProgressModal
      ▼
[AI Matching Engine Service]
      │
      ├─► Fetches opposite universe (active suppliers for client, or active clients for supplier)
      ├─► Generates/retrieves 384-dim dense embeddings (all-MiniLM-L6-v2)
      ├─► Computes Cosine Similarity (35% weight)
      ├─► Evaluates Deterministic Business Rules (Category 20%, Location 15%, Quantity 10%, Budget 10%, Delivery 10%)
      ├─► Computes composite 0-100 score and granular sub-scores
      ├─► Generates human-readable match_reason
      └─► Synthesizes 2-sentence executive analyst briefing (match_summary) isolating caveats below 0.75
      │
      │ 4. Upserts qualified records (score >= 40.0)
      ▼
[PostgreSQL: matches table]
      │
      │ 5. Triggers Notification Dispatcher
      ▼
[Notification Service Layer]
      │
      ├─► Dispatches match alert to Client (high-scoring supplier identified)
      └─► Dispatches buyer lead alert to Supplier (new buyer demand matched)
      │
      │ 6. Persists notification records
      ▼
[PostgreSQL: notifications table]
      │
      │ 7. React Query polls / invalidates cache via GET /api/dashboard and GET /api/notifications
      ▼
[Client & Supplier Dashboards]
      Displays ranked match cards, radial progress score rings, multi-metric breakdown,
      executive analyst briefings, supplier verification badges, and in-app notifications
```

---

## 3. Technology Stack

| Layer | Technology | Rationale & Why It Was Chosen |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript** | Type safety across API contracts, component reusability, and concurrent rendering capabilities for complex data tables and live dashboard metrics. |
| **Build & Tooling** | **Vite 8 + TanStack Router & Query** | Near-instant HMR, strict route-level type safety, built-in loading/error states, and aggressive cache management for server state. |
| **Styling & UI** | **Tailwind CSS + Radix UI + Lucide** | Accessible headless primitives paired with a custom dark-mode design system; avoids bulky opinionated CSS frameworks while enforcing design consistency. |
| **Backend Framework** | **FastAPI (Python 3.11 - 3.13)** | High asynchronous throughput (ASGI), native OpenAPI/Swagger documentation generation, and strict input/output contract enforcement via Pydantic v2. |
| **AI / NLP Model** | **SentenceTransformers (`all-MiniLM-L6-v2`)** | 384-dimensional dense vector embeddings with exceptional balance of semantic representation quality, low CPU inference latency (<15ms per text), and small memory footprint (~80MB). |
| **Scientific Computing** | **NumPy + scikit-learn** | Optimized vector operations and vectorized cosine similarity computation between client requirements and supplier capability matrices. |
| **Database & ORM** | **PostgreSQL 16 + SQLAlchemy 2.0** | ACID compliance, strong relational integrity (foreign keys, cascading updates), indexed queries, and straightforward migration path to `pgvector` for future scale. |
| **Database Migrations** | **Alembic** | Version-controlled, reproducible schema migrations ensuring database state consistency across local environments and Docker containers. |
| **Testing** | **Pytest + Starlette TestClient** | Fast, comprehensive test execution with isolated transactional sessions across API contracts, business rules, and mathematical scoring edge cases. |
| **Containerization** | **Docker & Docker Compose** | One-command local reproducibility packaging PostgreSQL and FastAPI with pre-configured health checks and initialization scripts. |

---

## 4. AI Matching Approach

The matching engine is the core algorithmic differentiator of the platform. Rather than treating discovery as a simple database filter or full-text keyword search, the platform implements a **Hybrid AI Matching Architecture** balancing deep language comprehension with commercial viability.

### 4.1 Why Hybrid Over Pure Keyword Matching?

1. **Lexical Divergence vs. Semantic Equivalence**: In B2B procurement, buyers and suppliers frequently use different vocabulary for identical capabilities. For instance, a buyer asking for *"Custom multi-layer printed circuit boards with surface mount components"* will fail a keyword search against a supplier offering *"High-density SMT PCB fabrication and assembly"*, despite 100% technical compatibility. Transformer embeddings capture semantic proximity across synonyms and technical jargon.
2. **Commercial Feasibility Guarantee**: A pure semantic search engine (or vector database query) will gladly return a supplier with 99% textual alignment whose minimum order quantity is 100,000 units when the buyer only needs 2,000, or whose unit price exceeds the buyer's budget by 400%.
3. **Transparent Explainability**: Enterprise buyers and supplier sales representatives reject black-box scores. The hybrid approach calculates individual sub-scores for each commercial criterion and translates them into plain-English reasoning.

### 4.2 Embedding Model: `sentence-transformers/all-MiniLM-L6-v2`

The engine uses `all-MiniLM-L6-v2`, a 6-layer MiniLM model fine-tuned on over 1 billion sentence pairs:
- **Embedding Dimensions**: 384 dimensions.
- **Inference Speed**: Fast CPU inference (~15 ms per passage on standard developer hardware), requiring no dedicated GPU infrastructure for evaluation or small-to-medium catalogs.
- **Memory Footprint**: ~80 MB RAM, permitting in-process execution inside the FastAPI container.
- **Normalization**: Embeddings are L2-normalized during generation, allowing cosine similarity to be computed via dot product: $\text{sim}(u, v) = u \cdot v$.

### 4.3 The Weighted Composite Formula

The composite match score is normalized to a **0 to 100 scale** using the following weighted linear combination:

$$\text{Final Score} = 100 \times \sum_{i} (w_i \times S_i)$$

Where $\sum w_i = 1.00$, partitioned as follows:

| Component ($S_i$) | Weight ($w_i$) | Measurement Criteria & Calculation Logic |
| :--- | :---: | :--- |
| **Semantic Similarity** (`sem_score`) | **0.35 (35%)** | Cosine similarity between L2-normalized 384-dimensional embeddings of rich text representations (Requirement text + Category + Notes vs. Offering + Category + Capabilities). Clamped to $[0.0, 1.0]$. |
| **Category Alignment** (`cat_score`) | **0.20 (20%)** | Exact case-insensitive category match ($1.0$ if equal, $0.0$ if mismatched). Cross-category proposals receive zero for this component to prevent domain pollution. |
| **Geographic Proximity** (`loc_score`) | **0.15 (15%)** | $1.0$ if identical city/location; $0.5$ if regional/state match (e.g., both in Karnataka or Telangana); $0.0$ if distinct geographic regions without overlap. |
| **Quantity Capacity** (`qty_score`) | **0.10 (10%)** | $1.0$ if supplier available quantity $\ge$ client quantity required. Partial score ($\frac{\text{available}}{\text{required}}$) if supplier can partially fulfill the order. |
| **Budget Feasibility** (`bud_score`) | **0.10 (10%)** | Total order cost calculated as $\text{Supplier Unit Price} \times \text{Client Quantity}$. If $\text{Total Cost} \le \text{Budget}$, score is $1.0$. If over budget, linear decay penalty: $\max\left(0, 1.0 - \frac{\text{Total Cost} - \text{Budget}}{\text{Budget}}\right)$. |
| **Delivery Timeline** (`del_score`) | **0.10 (10%)** | Parsed lead time days vs. client timeline days. $1.0$ if $\text{Supplier Days} \le \text{Client Days}$. Linear decay penalty if supplier is up to $1.5\times$ slower; $0.0$ if $>1.5\times$ slower. Neutral default ($0.70$) if unparseable. |

### 4.4 Worked Example from Real Seed Data

Below is an authentic calculation executed by the matching engine on the project's seeded dataset:

#### **Input Entities**
- **Client**: *AeroForge Dynamics*
  - **Requirement**: "Aerospace Grade 6061-T6 Aluminum Billets (extrusion ready)"
  - **Category**: "Raw Materials"
  - **Quantity Required**: 12,000 units
  - **Budget**: ₹95,000.00
  - **Location**: "Hyderabad, Telangana, India"
  - **Timeline**: "within 4 weeks" (parsed: 28 days)
  - **Notes**: "Complete Mill Test Certificates (MTRs) and ultrasonic inspection required."
- **Supplier**: *Titanium & Alloy Works*
  - **Offering**: "Certified Aerospace Grade Aluminum 6061-T6 / 7075 Extrusion Billets"
  - **Category**: "Raw Materials"
  - **Available Quantity**: 40,000 units
  - **Unit Price**: ₹7.25 (Total Order Cost: $12,000 \times ₹7.25 = ₹87,000.00$)
  - **Location**: "Hyderabad, Telangana, India"
  - **Delivery**: "ships in 14-20 days" (parsed: 20 days)
  - **Notes**: "AS9100D registered facility, full lot traceability and ultrasonic inspection reports included."

#### **Computed Sub-Scores & Weight Contributions**

$$\begin{aligned}
\text{Semantic Score}  &= 0.8254 \times 0.35 = \mathbf{0.28889} \\
\text{Category Score}  &= 1.0000 \times 0.20 = \mathbf{0.20000} \\
\text{Location Score}  &= 1.0000 \times 0.15 = \mathbf{0.15000} \\
\text{Quantity Score}  &= 1.0000 \times 0.10 = \mathbf{0.10000} \\
\text{Budget Score}    &= 1.0000 \times 0.10 = \mathbf{0.10000} \\
\text{Delivery Score}  &= 1.0000 \times 0.10 = \mathbf{0.10000} \\
\hline
\text{Composite Sum}   &= 0.28889 + 0.20 + 0.15 + 0.10 + 0.10 + 0.10 = \mathbf{0.93889} \\
\mathbf{Final\ Score}  &= \mathbf{93.89\ /\ 100}
\end{aligned}$$

#### **Generated Plain-English `match_reason`**:
> *"Strong semantic alignment on product requirement (82%). Exact category match ('Raw Materials'). Within budget (₹87,000.00 <= ₹95,000.00). Sufficient supply (40,000 available for 12,000 required). Co-located in Hyderabad, Telangana, India. Delivery capability meets timeline (ships in 14-20 days vs within 4 weeks)."*

#### **Generated Executive Analyst Briefing (`match_summary`)**:
> *"Supplier Titanium & Alloy Works matches 94% because they offer Certified Aerospace Grade Aluminum 6061-T6 / 7075 Extrusion Billets with strong technical alignment to your Aerospace Grade 6061-T6 Aluminum Billets (extrusion ready) requirement, and benefits from co-location in Hyderabad, Telangana, India. All operational, budgetary, and delivery constraints align exceptionally well with your specifications."*

### 4.5 Two-Sentence Executive Analyst Summary & Caveat Isolation Algorithm

While `match_reason` provides an itemized technical checklist, executive decision-makers require a concise, natural-language briefing that immediately surfaces both capability alignment and commercial risks. The matching engine generates a synthesized 2-sentence executive summary (`match_summary`) computed via the following deterministic algorithm:

1. **Sentence 1 — Alignment Synthesis & Capability Fit**:
   - Classifies semantic overlap into qualitative tiers:
     - $\text{sem\_score} \ge 0.75 \implies$ `"strong technical alignment"`
     - $0.50 \le \text{sem\_score} < 0.75 \implies$ `"moderate capability overlap"`
     - $\text{sem\_score} < 0.50 \implies$ `"partial technical alignment"`
   - Appends co-location recognition if $\text{loc\_score} = 1.0$ (*", and benefits from co-location in {location}"*).
   - Combines these attributes into an active sentence stating the match percentage, offered capability, and alignment tier.

2. **Sentence 2 — Caveat Isolation (< 0.75 Threshold)**:
   - Examines all 6 sub-scores (`delivery`, `budget`, `quantity`, `location`, `category`, `semantic`).
   - Filters candidate caveats strictly below the **0.75 threshold**:
     $$\text{Caveat Candidates} = \{ (c, S_c) \mid S_c < 0.75 \}$$
   - If candidates exist, isolates the **single weakest sub-score** $\min(S_c)$ and generates targeted analytical guidance:
     - **Delivery ($S_{\text{del}} < 0.75$)**: *"However, their delivery capability ({delivery}) runs longer than your requested timeline ({timeline})."*
     - **Budget ($S_{\text{bud}} < 0.75$)**: *"However, their quoted unit pricing results in a total project cost exceeding your stated budget."*
     - **Quantity ($S_{\text{qty}} < 0.75$)**: *"However, their available capacity ({available} units) covers only part of your required volume ({required} units)."*
     - **Location ($S_{\text{loc}} < 0.75$)**: *"However, their facility in {supplier location} is geographically distant from your location in {client location}."*
     - **Category ($S_{\text{cat}} < 0.75$)**: *"However, their primary industry category ({supplier cat}) differs from your specified category ({client cat})."*
     - **Semantic ($S_{\text{sem}} < 0.75$)**: *"However, catalog capabilities show only moderate overlap with your exact custom specifications."*
   - If all sub-scores are $\ge 0.75$, the second sentence reinforces commercial viability:
     > *"All operational, budgetary, and delivery constraints align exceptionally well with your specifications."*

### 4.6 Supplier Trust & Verification Badging System

To reduce supplier qualification friction, the platform incorporates a structured verification and credential audit system:

1. **Schema Additions (`suppliers` table)**:
   - `verification_status` (`VARCHAR(50)`): Audit status (`verified`, `premium`, or `unverified`).
   - `certifications` (`TEXT`): Industry standards and audit credentials (e.g., `"AS9100D, ISO 9001:2015, IATF 16949"`).
2. **Visual Hierarchy & Trust Badges**:
   - **Verified Supplier**: Rendered with a green badge chip and `CheckCircle2` icon.
   - **Premium Verified Supplier**: Rendered with a gold/amber badge chip and `ShieldCheck` icon.
   - **Certification Hover Tooltips**: Badges feature interactive hover tooltips displaying the supplier's exact audit credentials.
3. **Buyer Decision Support**: Verification badges appear across match ranking cards, supplier profiles, and the admin match audit table, giving procurement teams immediate visibility into vendor compliance.

### 4.7 Known Limitations & Future Improvements

1. **Free-Text Timeline Parsing**: The current engine uses regex heuristics (`parse_timeline_to_days`) to extract numerical days from strings like `"within 3 weeks"` or `"ships in 5-7 business days"`. Unconventional phrasing defaults to a neutral score of $0.70$.
   - *Future improvement*: Require structured integer fields (`lead_time_days`) at form input while retaining a natural language parser as a secondary fallback.
2. **Geographic Proximity by String Parsing**: Location proximity checks match tokens (city and state). Non-standard spelling or foreign cities without state tags receive $0.0$.
   - *Future improvement*: Integrate geocoding coordinates (latitude/longitude) with Haversine distance scoring or postal code radius lookups.
3. **In-Memory Embedding Cache**: Embeddings are computed with an in-process LRU cache. In a distributed multi-worker configuration, cache misses would duplicate embedding computation.
   - *Future improvement*: Persist embedding vectors directly in PostgreSQL using the `pgvector` extension and perform indexing using HNSW (Hierarchical Navigable Small World) for sub-millisecond retrieval across millions of rows.

### 4.8 Design Alternatives Considered

During the design of the matching architecture, several alternative approaches were evaluated. The choices made reflect pragmatic engineering tradeoffs appropriate for an early-stage platform:

#### 1. Weighted Linear Combination vs. Learned Ranking Model
A trained ranking model (such as logistic regression, LambdaMART, or gradient boosted decision trees like XGBoost) could in theory learn non-linear feature interactions and better reflect empirical acceptance patterns. However, supervised ranking models require substantial volumes of historical ground-truth outcome data—specifically thousands of verified accept/reject decisions across diverse categories—which a greenfield deployment does not possess on day one.

Attempting to train a model without this data introduces serious risks of overfitting to synthetic distributions or hallucinations of buyer preferences. A fixed, parameterized weighted linear combination represents a transparent, auditable cold-start baseline: every sub-score is inspectable, stakeholders can verify why a match scored what it did, and weights can be adjusted without retraining loops. The score-effectiveness validation endpoint (`GET /api/dashboard/score-effectiveness`) and its dashboard visualization provide the initial empirical feedback loop to monitor whether these default weights correlate with real buyer decisions or require recalibration.

#### 2. Hybrid Scoring vs. Pure Vector / Similarity Search
Relying solely on a vector database or nearest-neighbor embedding retrieval was rejected because semantic similarity addresses only product capability alignment, leaving critical commercial realities unconstrained (as discussed in Section 4.1). In B2B transactions, an offering with 98% semantic overlap is completely non-viable if the supplier requires a minimum order of 100,000 units against a buyer demand of 2,000, or charges 3× the allocated budget. Dense semantic embeddings provide capability discovery; deterministic arithmetic rules ensure transactional viability. Combining both into a single composite score ensures that recommendations are both technically relevant and commercially executable.

#### 3. Local SentenceTransformers vs. Hosted Commercial Embedding APIs
Using local `sentence-transformers/all-MiniLM-L6-v2` was selected over third-party hosted embedding APIs (such as OpenAI `text-embedding-3-small` or Cohere Embed):
- **Tradeoff**: Proprietary hosted models offer higher dimensional spaces (1536+ dimensions) and marginally superior nuance on nuanced domain vocabularies.
- **Decision**: In exchange, hosted APIs introduce recurring per-call monetary costs, network latency overhead (100–300 ms roundtrips vs. ~15 ms local CPU inference), rate limits, and external availability dependencies on the critical ingestion path. Running `all-MiniLM-L6-v2` locally keeps the core discovery pipeline fast, completely self-contained, zero-cost, and capable of operating entirely offline or in air-gapped VPCs without leaking sensitive RFQ descriptions to external third parties.

#### 4. Evolution with Production Data
As the platform matures and real user interactions accumulate, this architecture is designed to evolve. Once a statistically meaningful volume of accept/reject decisions is recorded across various score bands—tracked directly through the score-effectiveness calibration tooling—the fixed heuristic weights can be empirically validated, optimized via Bayesian optimization, or replaced with a learned-to-rank model trained on historical conversion signal. Moving from intuitive, rule-weighted heuristics to data-informed predictive ranking is the natural evolution path as platform volume grows.

---

## 5. API Reference

The FastAPI backend exposes versioned, RESTful endpoints under `/api`. All endpoints return standardized JSON pagination envelopes (`{ items: [...], total, limit, offset, has_more }`) and RFC-compliant HTTP status codes.

> [!NOTE]
> **Interactive Swagger Documentation**: Full interactive documentation with schema validators and "Try It Out" execution is available at **`http://localhost:8000/docs`** (or ReDoc at `http://localhost:8000/redoc`) when the backend is running.

### Endpoint Groups

#### 1. System & Health
- `GET /api/health` — Returns system health, version, database connectivity, and embedding model load status.
- `GET /api/` — API root greeting with documentation and version links.

#### 2. Clients
- `POST /api/clients/` — Create a new client procurement requirement and automatically trigger AI matching.
- `GET /api/clients/` — Paginated list of clients with optional search and category filters.
- `GET /api/clients/{client_id}` — Retrieve detailed profile for a specific client.
- `PUT /api/clients/{client_id}` — Update an existing client requirement and re-trigger match calculation.
- `DELETE /api/clients/{client_id}` — Soft/hard delete client and cascade-remove associated match rows.

#### 3. Suppliers
- `POST /api/suppliers/` — Register a new supplier capability offering (supports `verification_status` and `certifications`).
- `GET /api/suppliers/` — Paginated list of suppliers with optional search and category filters.
- `GET /api/suppliers/{supplier_id}` — Retrieve detailed profile, capability metrics, audit verification status, and certifications for a supplier.
- `PUT /api/suppliers/{supplier_id}` — Update supplier catalog parameters, capacity, pricing, verification status, and certifications.
- `DELETE /api/suppliers/{supplier_id}` — Delete supplier profile and associated match relations.

#### 4. Matching Engine & Matches
- `POST /api/matching/run/{client_id}` — Trigger AI matching for a specific client requirement against all suppliers, or for a supplier against all clients.
- `POST /api/matching/run-supplier/{supplier_id}` — Dedicated endpoint to trigger AI matching for a specific supplier offering against all client requirements.
- `POST /api/matching/run-all` — Batch run matching engine across all clients and suppliers in the database.
- `GET /api/matches` — Paginated list of all stored matches with filters (`client_id`, `supplier_id`, `status`, `min_score`) and server-side sorting (`sort_by`: `match_score` or `created_at`, `sort_order`: `asc` or `desc`).
- `GET /api/matches/export` — Streamed CSV export of all filtered matches with 13 comprehensive columns (names, category, composite score, all 6 sub-scores, status, reason, and timestamps).
- `GET /api/matches/{match_id}` — Retrieve detailed match record including all 6 component sub-scores, plain-English justification (`match_reason`), and executive analyst briefing (`match_summary`).
- `PATCH /api/matches/{match_id}/status` — Update match disposition status (`pending`, `accepted`, `rejected`).

#### 5. Notifications
- `GET /api/notifications` — Paginated list of notifications with filtering by recipient and read status.
- `GET /api/notifications/unread-count` — Count of unread notifications for navigation badges.
- `GET /api/notifications/{notification_id}` — Retrieve an individual notification by ID.
- `PATCH /api/notifications/{notification_id}/read` — Mark an individual notification as read.
- `PATCH /api/notifications/mark-all-read` — Bulk mark notifications as read for a given recipient.

#### 6. Analytics & Dashboard
- `GET /api/dashboard/summary` — Executive overview KPIs (total clients, suppliers, matches, average score, acceptance rate).
- `GET /api/dashboard/clients/{client_id}` — Consolidated dashboard payload for buyer view (active requirement, matches, stats).
- `GET /api/dashboard/suppliers/{supplier_id}` — Consolidated dashboard payload for supplier view (leads, conversion rate).
- `GET /api/dashboard/category-breakdown` — Distribution of clients, suppliers, and matches grouped by industrial category.
- `GET /api/dashboard/recent-activity` — Audit log stream of latest platform creations, match runs, and status updates (with max limit constraints).
- `GET /api/dashboard/score-trend` — Average match score over time and daily match counts grouped by day (`days` lookback parameter).
- `GET /api/dashboard/score-effectiveness` — Acceptance rate calibration grouped across descending score bands (`90-100`, `80-89`, `70-79`, `60-69`, `50-59`, `40-49`), computing empirical conversion rates $\frac{\text{accepted}}{\text{accepted} + \text{rejected}}$ to validate scoring quality against human buyer decisions.

---

## 6. Setup Instructions

Because this evaluation is conducted locally, follow these tested instructions to run both services.

###  Quick Start

If you have Docker installed, you can launch the backend and database with one command, then start the frontend:

```bash
# 1. Clone and navigate to project root
git clone https://github.com/SaniyaGharat/wisdom
cd wisdom

# 2. Launch Backend & PostgreSQL (Applies migrations + seeds data + starts API on :8000)
docker-compose up --build -d

# 3. Start Frontend UI
cd frontend
npm install
npm run dev
```

Open **`http://localhost:8080`** in your browser to explore the live dashboard and run matches.

---

### Detailed Manual Setup (Step-by-Step)

#### Prerequisites
- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: v18+ (tested on Node v22.17.0)
- **PostgreSQL**: Local service running on port `5432` OR Docker Compose for the database

---

### Path A: Backend Setup via Docker Compose (Recommended)

From the project root:

```bash
# Start PostgreSQL database and FastAPI backend
docker-compose up --build
```

- Database initializes automatically on port `5432`.
- Alembic runs `alembic upgrade head`.
- The database seeds sample clients and suppliers, generating dozens of pre-computed AI matches across industrial categories.
- FastAPI server starts on **`http://localhost:8000`**.
- Interactive Swagger docs are ready at **`http://localhost:8000/docs`**.

---

### Path B: Backend Setup via Manual Python Virtualenv

If running against a local PostgreSQL server directly on your host:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure .env file
# Ensure backend/.env contains your local Postgres connection string:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/matchmaking_db"

# 5. Apply Alembic migrations
alembic upgrade head

# 6. Seed sample data and run AI matching engine
python -m app.seed.seed_data

# 7. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

### Frontend Setup

In a separate terminal:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Ensure environment variables are configured
# Create a .env file with the following variable:
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# 3. Install dependencies
npm install

# 4. Start the frontend development server
npm run dev
```

The Vite dev server will print the active URL:
- Local: **`http://localhost:8080/`**
- Open the URL in any modern browser to view the application.

---

## 7. Testing

The backend includes a comprehensive, automated test suite built with `pytest` and `httpx`.

### Running the Test Suite

```powershell
# From the backend directory with active virtual environment:
cd backend
pytest -v
```

### Test Suite Summary

- **Total Tests**: **58 automated tests**
- **Test Status**: **58 passed (100%)** in ~22 seconds
- **Test Coverage Breakdown**:
  - **`tests/test_matching_engine.py` (8 tests)**: Validates sentence transformer semantic differentiation, category exact matching, city/region location parsing, quantity capacity tiers, budget linear decay calculations, timeline regex parsing, and database transaction integration.
  - **`tests/test_match_summary.py` (5 tests)**: Validates 2-sentence executive summary generation, caveat threshold triggers (< 0.75) for delivery, budget, quantity, location, category, and semantic overlap, positive closing sentences when all sub-scores are strong ($\ge 0.75$), and integration into `compute_match` payload.
  - **`tests/test_api_hardening.py` (7 tests)**: Validates strict `{ items, total, limit, offset, has_more }` pagination envelopes, max page limit enforcement (rejecting limits $>100$ with HTTP 422), 404 handler envelopes for invalid UUIDs, and Pydantic validation error structures.
  - **`tests/test_clients.py` (9 tests)**: Full CRUD cycle for clients, required field validation, category filtering, and pagination offsets.
  - **`tests/test_suppliers.py` (10 tests)**: Full CRUD cycle for suppliers, price/quantity boundary tests, category filtering, and persistence/retrieval of `verification_status` and `certifications`.
  - **`tests/test_matches_api.py` (5 tests)**: Single client matching API, supplier-driven matching API (`/run-supplier/{supplier_id}`), batch match runner, preservation of user-accepted/rejected statuses during background rescoring, and RFC-4180 CSV export endpoint verification with 13 required columns.
  - **`tests/test_notifications.py` (4 tests)**: Verifies dual notifications created upon match generation (one for client, one for supplier), notification deduplication on re-matching, unread counters, and mark-as-read / mark-all-read endpoints.
  - **`tests/test_dashboard.py` (8 tests)**: Executive summary statistics, role-filtered dashboard views, category aggregations, recent audit activity streams with pagination limits, daily average match score trends over time (`/api/dashboard/score-trend`), acceptance rate calibration grouped across descending score bands (`/api/dashboard/score-effectiveness`), and edge-case handling when zero decided matches exist.
  - **`tests/test_health.py` (2 tests)**: Root landing endpoint and health check diagnostics verifying database connection and embedding model loading.

---

## 8. Scalability & Future Work

To ensure clear alignment, the following section outlines intentional architectural simplifications made for this evaluation prototype and the roadmap for enterprise production deployment:

### 1. Authentication & Authorization
- **Current Prototype**: Authentication was deferred by design to allow frictionless evaluation of all client, supplier, and admin dashboards without requiring account creation or token management. A simulated role/profile switcher in the UI header enables rapid role toggling.
- **Production Path**: Integrate OAuth2 / OpenID Connect (OIDC) with JWT bearer tokens via Supabase Auth, Clerk, or Auth0, enforcing Row-Level Security (RLS) and Role-Based Access Control (RBAC: `BUYER`, `SUPPLIER`, `ADMIN`).

### 2. Multi-Channel Notification Provider Pattern
- **Current Prototype**: Implements `DatabaseNotificationProvider`, persisting notifications to PostgreSQL with real-time UI polling and badge counters.
- **Production Path**: The notification subsystem is built around the abstract `BaseNotificationProvider` interface. Adding external channels requires only subclassing `BaseNotificationProvider` (e.g., `SendGridEmailProvider`, `TwilioSmsProvider`, `SlackWebhookProvider`) and registering them with the dispatcher, without altering core business or matching logic.

### 3. Persisted Vector Store (`pgvector`)
- **Current Prototype**: Uses an in-memory NumPy cache for generated embeddings, which is optimal for instant evaluation and small catalogs (<5,000 entities).
- **Production Path**: Enable the native PostgreSQL `pgvector` extension. Store 384-dimensional vectors in a `vector(384)` column on `clients` and `suppliers`, indexed using HNSW (Cosine distance). This allows vector search to execute directly within SQL queries alongside relational filter predicates (`WHERE category = 'Electronics'`).

### 4. Horizontal Scaling of Matching Engine
- **Current Prototype**: Matches are computed synchronously or on-demand within the FastAPI process worker.
- **Production Path**: Offload batch and trigger-based matching jobs to asynchronous distributed task queues using **Celery** or **ARQ** backed by **Redis**, allowing the web API to remain non-blocking during heavy catalog ingestions.

### 5. API Rate Limiting & Protection
- **Current Prototype**: Global CORS open (`*`) with standard Pydantic input validation.
- **Production Path**: Introduce Redis-backed token bucket rate limiting (via `slowapi` or Cloudflare WAF rules) to protect matching endpoints from resource exhaustion.

### 6. Cloud Deployment Experience
- During development, cloud deployment configurations were verified on **Render** (FastAPI backend + managed PostgreSQL) and **Cloudflare Pages** (Vite frontend with edge routing). For local evaluation, Docker Compose remains the canonical and fastest zero-dependency execution method.

---

## 9. Project Structure

```
wisdom/
├── docker-compose.yml              # Root multi-container orchestration (FastAPI + PostgreSQL)
├── DOCUMENTATION.md                # Top-level technical documentation (this file)
├── README.md                       # Repository overview and quick start guide
│
├── backend/                        # FastAPI Python REST API & AI Engine
│   ├── alembic/                    # Database migration environment
│   │   ├── versions/               # Schema migrations (0001 to 0004_supplier_badge_summary)
│   │   └── env.py                  # Alembic migration runner configuration
│   ├── app/
│   │   ├── crud/                   # Database query repositories
│   │   │   ├── client.py           # Client CRUD operations
│   │   │   ├── dashboard.py        # Analytics SQL aggregations (score trend & quality calibration)
│   │   │   ├── match.py            # Match upsert, sorting, & CSV export query logic
│   │   │   ├── notification.py     # Notification query & mark-read
│   │   │   └── supplier.py         # Supplier catalog CRUD operations (with verification)
│   │   ├── models/                 # SQLAlchemy 2.0 ORM domain models
│   │   │   ├── client.py           # Buyer requirements table schema
│   │   │   ├── match.py            # Match pairs, sub-scores, status, & match_summary schema
│   │   │   ├── notification.py     # In-app notifications schema
│   │   │   └── supplier.py         # Supplier capabilities, verification_status & certifications
│   │   ├── routers/                # FastAPI HTTP routing controllers
│   │   │   ├── clients.py          # /api/clients endpoints
│   │   │   ├── dashboard.py        # /api/dashboard endpoints (trend & effectiveness)
│   │   │   ├── health.py           # /api/health endpoint
│   │   │   ├── matches.py          # /api/matches endpoints (sortable listing & CSV export)
│   │   │   ├── matching.py         # /api/matching engine (client & supplier triggers)
│   │   │   ├── notifications.py    # /api/notifications endpoints
│   │   │   └── suppliers.py        # /api/suppliers endpoints
│   │   ├── schemas/                # Pydantic v2 validation & response contracts
│   │   │   ├── client.py           # Client request/response schemas
│   │   │   ├── common.py           # Pagination envelopes & error models
│   │   │   ├── dashboard.py        # Aggregation view schemas (ScoreTrendItem, ScoreBandEffectiveness)
│   │   │   ├── match.py            # Match & sub-score schemas (includes match_summary)
│   │   │   ├── notification.py     # Notification schemas
│   │   │   └── supplier.py         # Supplier schemas (includes verification_status & certifications)
│   │   ├── seed/                   # Demonstration & evaluation fixtures
│   │   │   └── seed_data.py        # Populates 16 clients, 15 suppliers, triggers matching
│   │   ├── services/               # Core business & computation services
│   │   │   ├── matching_engine.py  # Hybrid AI engine (embeddings + business scoring + 2-sentence summary)
│   │   │   └── notification_service.py # Provider-based notification dispatcher
│   │   ├── config.py               # Pydantic BaseSettings environment configurations
│   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   └── main.py                 # FastAPI application factory & middleware setup
│   ├── tests/                      # Automated Pytest suite (58 passing tests)
│   │   ├── conftest.py             # Isolated SQLite/Postgres test fixtures
│   │   ├── test_api_hardening.py   # Pagination envelope & error handling tests
│   │   ├── test_clients.py         # Client CRUD & validation tests
│   │   ├── test_dashboard.py       # Analytics dashboard tests (trends & effectiveness)
│   │   ├── test_health.py          # Health check & version tests
│   │   ├── test_match_summary.py   # Executive analyst summary & caveat threshold tests
│   │   ├── test_matches_api.py     # Match API, supplier runs, sorting & CSV export tests
│   │   ├── test_matching_engine.py # Sub-score math & embedding tests
│   │   ├── test_notifications.py   # In-app notification creation & deduplication tests
│   │   └── test_suppliers.py       # Supplier CRUD & verification status tests
│   ├── demo_simulation.py          # Demo data simulator — assigns realistic accept/reject decisions across score bands for dashboard calibration & verifies CSV export
│   ├── Dockerfile                  # Production-ready backend container image
│   ├── requirements.txt            # Pinned Python dependencies
│   └── alembic.ini                 # Alembic configuration
│
└── frontend/                       # React 19 + TypeScript Web Client
    ├── public/                     # Static web assets & favicons
    ├── src/
    │   ├── components/             # Reusable UI widgets & feature views
    │   │   ├── ui/                 # Radix UI primitives (dialogs, tabs, dropdowns)
    │   │   ├── admin-dashboard.tsx # Executive overview, Recharts score trend, calibration matrix & CSV export
    │   │   ├── app-shell.tsx       # Navigation bar, notification bell, workspace switcher & auto-heal
    │   │   ├── match-dashboard.tsx # Match cards, radial score badges, executive summary & run matching
    │   │   ├── matchmaking-progress-modal.tsx # Multi-stage animated AI matchmaking execution modal
    │   │   ├── verified-badge.tsx  # Tiered supplier trust badge (Verified / Premium) with certification tooltip
    │   │   ├── profile-form.tsx    # Dynamic requirement & offering forms
    │   │   └── states.tsx          # Loading skeletons & empty state placeholders
    │   ├── hooks/                  # Custom React hooks (mobile detection, media queries)
    │   ├── lib/                    # Utilities, formatters, and API client
    │   │   ├── api.ts              # Type-safe Fetch wrapper with error handling & export
    │   │   ├── format.ts           # Currency (INR ₹), date, and score formatters
    │   │   └── utils.ts            # ClassName merging helper (clsx + tailwind-merge)
    │   ├── routes/                 # TanStack file-based routes
    │   │   ├── __root.tsx          # Root layout with AppShell and Toast providers
    │   │   ├── index.tsx           # Landing page with value proposition & live stats
    │   │   ├── admin.tsx           # Admin analytics view
    │   │   ├── clients.$id.dashboard.tsx # Buyer-specific match dashboard
    │   │   ├── clients.new.tsx     # New requirement submission form
    │   │   ├── suppliers.$id.dashboard.tsx # Supplier-specific leads dashboard
    │   │   └── suppliers.new.tsx   # New supplier catalog submission form
    │   ├── styles.css              # Design tokens, CSS variables, glassmorphism
    │   └── router.tsx              # TanStack router tree setup
    ├── package.json                # Frontend dependencies & npm scripts
    ├── tsconfig.json               # Strict TypeScript configuration
    └── vite.config.ts              # Vite bundler & plugin configuration
```
