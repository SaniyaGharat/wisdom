from app.routers.health import router as health_router
from app.routers.clients import router as clients_router
from app.routers.suppliers import router as suppliers_router
from app.routers.matching import router as matching_router
from app.routers.matches import router as matches_router
from app.routers.notifications import router as notifications_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "health_router",
    "clients_router",
    "suppliers_router",
    "matching_router",
    "matches_router",
    "notifications_router",
    "dashboard_router",
]
