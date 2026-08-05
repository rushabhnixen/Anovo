"""SQLAlchemy database setup — supports SQLite and PostgreSQL."""

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

logger = logging.getLogger(__name__)

_is_sqlite = settings.database_url.startswith("sqlite")
_engine_kwargs: dict = {
    "pool_pre_ping": True,  # test connections before reuse (fixes Neon idle drops)
}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_recycle"] = 300  # recycle connections every 5 min

engine = create_engine(settings.database_url, **_engine_kwargs)

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
    # Use BOOLEAN DEFAULT FALSE for PostgreSQL, BOOLEAN DEFAULT 0 for SQLite
    default_val = "FALSE" if not _is_sqlite else "0"
    migrations = {
        "is_premium": f"ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT {default_val}",
        "is_admin": f"ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT {default_val}",
        # Nullable with no default: existing rows simply have no reset in flight.
        "reset_token_hash": "ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(64)",
        "reset_token_expires": "ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP",
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
