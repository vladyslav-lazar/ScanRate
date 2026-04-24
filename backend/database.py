import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv(
    "POSTGRES_USER",
    "admin"
)

POSTGRES_PASSWORD = os.getenv(
    "POSTGRES_PASSWORD",
    "admin"
)

POSTGRES_DB = os.getenv(
    "POSTGRES_DB",
    "scanrate"
)

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@db:5432/{POSTGRES_DB}"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # drops and reconnects stale connections automatically
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()