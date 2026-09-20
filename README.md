# AI-Powered Client–Supplier Matchmaking Platform

Welcome to the **AI-Powered Client–Supplier Matchmaking Platform**.

## Complete Platform Architecture (Phase 1, 2, & 3)

1. **Phase 1: Backend Scaffolding & Data Layer**
   - FastAPI + PostgreSQL with SQLAlchemy 2.0 and Alembic migrations.
   - Pydantic v2 schemas and full REST CRUD endpoints for `/api/clients` and `/api/suppliers`.
2. **Phase 2: AI Hybrid Matching Engine**
   - Dense semantic text similarity using `sentence-transformers` (`all-MiniLM-L6-v2`) combined with structured business rule evaluation (category, location, quantity, budget, and delivery timelines).
   - Match endpoints at `/api/matching` and `/api/matches`.
3. **Phase 3: Notifications & Dashboard Aggregations**
   - Database-backed in-app notifications with pluggable provider architecture for email/SMS.
   - Read-only, high-performance SQL aggregation dashboard endpoints at `/api/dashboard`.

---

## Quick Start with Docker Compose

```bash
docker-compose up --build
```

- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Running Tests Locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1       # Windows PowerShell (or 'source .venv/bin/activate' on Linux/macOS)
pip install -r requirements.txt
pytest -v
```

For complete API documentation, mathematical scoring formula, and example responses, see [backend/README.md](file:///c:/Users/Saniya%20Gharat/Desktop/Projects/wisdom/backend/README.md).
