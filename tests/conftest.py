import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.book import Book
from main import app

# In-memory SQLite for isolated, fast testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture()
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture()
def test_admin(db):
    user = db.query(User).filter(User.email == "testadmin@library.com").first()
    if not user:
        user = User(
            name="Test Admin",
            email="testadmin@library.com",
            hashed_password=hash_password("adminpass123"),
            role="admin",
            card_number="CARD-ADM-99",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@pytest.fixture()
def test_member(db):
    user = db.query(User).filter(User.email == "testmember@library.com").first()
    if not user:
        user = User(
            name="Test Member",
            email="testmember@library.com",
            hashed_password=hash_password("memberpass123"),
            role="member",
            card_number="CARD-MEM-88",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@pytest.fixture()
def admin_headers(test_admin):
    token = create_access_token(data={"sub": str(test_admin.id), "email": test_admin.email, "role": test_admin.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def member_headers(test_member):
    token = create_access_token(data={"sub": str(test_member.id), "email": test_member.email, "role": test_member.role})
    return {"Authorization": f"Bearer {token}"}
