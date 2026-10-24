import os
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# On Vercel or read-only serverless environments, store database in /tmp
is_serverless = os.getenv("VERCEL") is not None or not os.access(BASE_DIR, os.W_OK)
if is_serverless:
    DATA_DIR = Path(tempfile.gettempdir()) / "libraria_data"
else:
    DATA_DIR = BASE_DIR / "data"

try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    DATA_DIR = Path(tempfile.gettempdir())
    DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Libraria"
    PROJECT_VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "libraria-secret-key-production-change-me-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'library.db'}")
    
    # Circulation Rules
    DEFAULT_LOAN_DAYS: int = 14
    FINE_PER_DAY: float = 0.50  # USD / currency units per day
    MAX_BOOKS_PER_MEMBER: int = 5
    MAX_RENEWALS: int = 2

settings = Settings()
