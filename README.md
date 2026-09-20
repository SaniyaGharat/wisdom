# AI-Powered Client–Supplier Matchmaking Platform

Welcome to the **AI-Powered Client–Supplier Matchmaking Platform**.

## Complete Platform Architecture

1. **Frontend Web Application (`frontend/`)**
   - Built with **React 19**, **TypeScript**, and **Vite**.
   - Custom **Linear/Notion-inspired dark mode SaaS design system** with CSS tokens, glassmorphism, responsive grid layouts, and micro-animations.
   - Centralized type-safe API client handling `{ items, total, limit, offset, has_more }` pagination and field-level validation errors.
   - **6 Main Screens**:
     1. **Landing/Home**: Value proposition with dual role CTAs and live platform telemetry.
     2. **Client Requirement Form**: Dynamic validation, category presets + custom input, instant "Find Matches Now" flow.
     3. **Supplier Offering Form**: Capacity, unit pricing, lead times, and deal discovery.
     4. **Client Dashboard**: Requirement banner, ranked match cards with radial score badges, expandable multi-criteria score breakdown, and Accept/Reject buttons.
     5. **Supplier Dashboard**: Capability overview, incoming buyer leads, and status controls.
     6. **Admin Overview**: Executive KPI stat cards, Category Breakdown chart, live Activity Stream, and filterable All-Matches table.
   - **Interactive features**: In-app notification bell with live unread counter & mark-read dropdown, simulated profile/role switcher, toast notifications, loading skeletons, and empty state handlers.

2. **Backend API (`backend/`)**
   - **FastAPI** + **PostgreSQL** with SQLAlchemy 2.0 and Alembic migrations.
   - **Hybrid AI Matching Engine**: 35% dense semantic embeddings (`sentence-transformers/all-MiniLM-L6-v2`) + 65% deterministic business scoring (category, location, capacity, budget, delivery).
   - In-app notification system with pluggable provider architecture.
   - SQL aggregation dashboard endpoints.
   - Hardened API with standardized pagination envelopes and global exception handlers.

---

## 🚀 Quick Start with Docker Compose

```bash
docker-compose up --build
```

- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 💻 Local Development Setup

### 1. Start Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1       # Windows PowerShell (or 'source .venv/bin/activate' on Linux/macOS)
pip install -r requirements.txt

# Apply migrations & seed initial database
alembic upgrade head
python -m app.seed.seed_data

# Run tests
pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
