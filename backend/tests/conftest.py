import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models import User, Product, Rating
from auth import create_jwt

# Use an in-memory SQLite database for tests
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate all tables before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def regular_user(db):
    user = User(email="user@test.com", is_admin=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    user = User(email="admin@test.com", is_admin=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_token(regular_user):
    return create_jwt(regular_user.id, is_admin=False)


@pytest.fixture
def admin_token(admin_user):
    return create_jwt(admin_user.id, is_admin=True)


@pytest.fixture
def product(db):
    p = Product(
        ean="4820024790022",
        name="Тестовий продукт",
        brand="Тестовий бренд",
        status="approved",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def approved_rating(db, product, regular_user):
    r = Rating(
        product_id=product.id,
        user_id=regular_user.id,
        score=4,
        comment="Гарний продукт",
        status="approved",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
