# AI-Powered Client–Supplier Matchmaking Platform (Phase 1: Backend Foundation)

Welcome to the backend service for the **AI-Powered Client–Supplier Matchmaking Platform**.

This repository contains the **Phase 1** implementation: the core backend scaffolding, PostgreSQL database models, Alembic migrations, Pydantic v2 schemas, REST CRUD APIs, database seeding, automated testing, and Docker orchestration.

---

## 🛠 Tech Stack

- **Python**: 3.11+ (Python 3.13 tested)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (OpenAPI & Swagger documentation)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (with SQLite support for tests)
- **ORM**: [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/latest/) & `pydantic-settings`
- **Testing**: [pytest](https://docs.pytest.org/) & `httpx`
- **Containerization**: Docker & Docker Compose

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint & middleware
│   ├── config.py                # Environment configuration (pydantic-settings)
│   ├── database.py              # SQLAlchemy engine, session maker, get_db dependency
│   ├── models/
│   │   ├── __init__.py          # Model exports
│   │   ├── client.py            # Client SQLAlchemy model
│   │   ├── supplier.py          # Supplier SQLAlchemy model
│   │   └── match.py             # Match stub model for Phase 2
│   ├── schemas/
│   │   ├── __init__.py          # Schema exports
│   │   ├── client.py            # Client Pydantic schemas (Create, Update, Response)
│   │   ├── supplier.py          # Supplier Pydantic schemas (Create, Update, Response)
│   │   └── common.py            # PaginatedResponse & HealthResponse schemas
│   ├── crud/
│   │   ├── __init__.py          # CRUD exports
│   │   ├── client.py            # Client database operations & filtering
│   │   └── supplier.py          # Supplier database operations & filtering
│   ├── routers/
│   │   ├── __init__.py          # Router exports
│   │   ├── health.py            # GET /api/health
│   │   ├── clients.py           # /api/clients CRUD routes
│   │   └── suppliers.py         # /api/suppliers CRUD routes
│   └── seed/
│       ├── __init__.py
│       └── seed_data.py         # Standalone seed script with sample data
├── alembic/
│   ├── versions/                # Database migration scripts
│   ├── env.py                   # Alembic environment runner
│   └── script.py.mako           # Migration script template
├── tests/
│   ├── conftest.py              # Test fixtures (SQLite in-memory test DB & TestClient)
│   ├── test_health.py           # Health check test
│   ├── test_clients.py          # Client CRUD & validation tests
│   └── test_suppliers.py        # Supplier CRUD & validation tests
├── .env.example                 # Example environment variables
├── .env                         # Local environment configuration
├── .gitignore                   # Git ignore file
├── alembic.ini                  # Alembic configuration
├── Dockerfile                   # Backend Docker image specification
├── docker-compose.yml           # Multi-container PostgreSQL + Backend service
├── requirements.txt             # Python package dependencies
└── README.md                    # Project documentation
```

---

## 🚀 Quick Start with Docker Compose (Recommended)

To spin up both PostgreSQL and the FastAPI application with a single command (auto-running migrations and seeding sample data):

```bash
docker-compose up --build
```

- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 💻 Local Development Setup

### 1. Create and Activate Virtual Environment

**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` in `.env` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/matchmaking_db"
```

### 4. Run Database Migrations

Apply database migrations using Alembic:
```bash
alembic upgrade head
```

To generate a new migration after updating models in `app/models/`:
```bash
alembic revision --autogenerate -m "describe_changes"
```

### 5. Seed the Database

Populate 8 realistic client requirements and 8 supplier offerings across categories (*Electronics*, *Textiles*, *Packaging*, *Raw Materials*):

```bash
python -m app.seed.seed_data
```

*(To reset and re-seed, run with `FORCE_SEED=true python -m app.seed.seed_data`)*

### 6. Start the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🧪 Running Tests

The test suite runs against an isolated in-memory SQLite database (`sqlite:///:memory:`) without needing a live PostgreSQL server:

```bash
pytest -v
```

---

## 📡 REST API Documentation

### Clients (`/api/clients`)

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/clients` | Create a new client requirement | `201 Created`, `422 Unprocessable` |
| `GET` | `/api/clients` | List clients (supports `limit`, `offset`, `category`, `location`) | `200 OK` |
| `GET` | `/api/clients/{id}` | Get client details by UUID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/clients/{id}` | Update client details | `200 OK`, `404 Not Found`, `422` |
| `DELETE` | `/api/clients/{id}` | Delete client by UUID | `204 No Content`, `404 Not Found` |

### Suppliers (`/api/suppliers`)

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/suppliers` | Create a new supplier offering | `201 Created`, `422 Unprocessable` |
| `GET` | `/api/suppliers` | List suppliers (supports `limit`, `offset`, `category`, `location`) | `200 OK` |
| `GET` | `/api/suppliers/{id}` | Get supplier details by UUID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/suppliers/{id}` | Update supplier details | `200 OK`, `404 Not Found`, `422` |
| `DELETE` | `/api/suppliers/{id}` | Delete supplier by UUID | `204 No Content`, `404 Not Found` |

### Health Check (`/api/health`)

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Service and database connectivity health check | `200 OK` |

---

## 🔒 Validation Rules

- **Quantity**: `quantity_required` and `available_quantity` must be integers `> 0`.
- **Budget & Pricing**: `budget` and `pricing_details` must be numeric values `>= 0`.
- **Required Strings**: Names, requirements/offerings, category, location, and timelines must be non-empty strings.
- **Errors**: Invalid inputs return standard `422 Unprocessable Entity` schemas with detailed field explanations.
