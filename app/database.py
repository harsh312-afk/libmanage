from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_db_initialized = False

def init_db():
    Base.metadata.create_all(bind=engine)

def ensure_db_ready():
    global _db_initialized
    if not _db_initialized:
        init_db()
        try:
            from app.seed import seed_data
            seed_data()
        except Exception as e:
            print(f"Database seed notice: {e}")
        _db_initialized = True

def get_db():
    ensure_db_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
