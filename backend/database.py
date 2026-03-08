"""SQLAlchemy database setup with SQLite."""

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _auto_migrate():
    """Add any missing columns to existing tables (poor-man's migration)."""
    insp = inspect(engine)
    if not insp.has_table("users"):
        return
    existing = {col["name"] for col in insp.get_columns("users")}
    migrations = {
        "is_premium": "ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0",
        "is_admin": "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0",
    }
    with engine.begin() as conn:
        for col_name, ddl in migrations.items():
            if col_name not in existing:
                logger.info("Auto-migrating: adding column %s to users", col_name)
                conn.execute(text(ddl))


def create_tables():
    """Create all tables. Called on app startup."""
    Base.metadata.create_all(bind=engine)
    _auto_migrate()
