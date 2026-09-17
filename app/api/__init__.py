from app.api.auth import router as auth_router
from app.api.books import router as books_router
from app.api.borrows import router as borrows_router
from app.api.members import router as members_router
from app.api.analytics import router as analytics_router
from app.api.export import router as export_router

__all__ = [
    "auth_router",
    "books_router",
    "borrows_router",
    "members_router",
    "analytics_router",
    "export_router"
]
