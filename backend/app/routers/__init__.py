from app.routers.health import router as health_router
from app.routers.clients import router as clients_router
from app.routers.suppliers import router as suppliers_router

__all__ = ["health_router", "clients_router", "suppliers_router"]
