# AI-Powered Client–Supplier Matchmaking Platform

Welcome to the **AI-Powered Client–Supplier Matchmaking Platform**.

## Phase 1: Backend Foundation

The complete backend service implementation is located inside [`backend/`](file:///c:/Users/Saniya%20Gharat/Desktop/Projects/wisdom/backend).

### Quick Start with Docker

```bash
docker-compose up --build
```

- **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Running Tests Locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1    # On Windows (or 'source .venv/bin/activate' on Linux/macOS)
pip install -r requirements.txt
pytest -v
```

For full setup and API documentation, please refer to [backend/README.md](file:///c:/Users/Saniya%20Gharat/Desktop/Projects/wisdom/backend/README.md).
