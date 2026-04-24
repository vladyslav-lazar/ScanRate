import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL".
    "postgresql://admin:admin@localhost:5432/scanrate"
)

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