"""SQLAlchemy ORM models for users and history."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Password reset. Only the SHA-256 hash of the token is stored, so a database
    # leak cannot be replayed to take over accounts. Both columns are cleared
    # once a token is used, making each token single-use.
    reset_token_hash = Column(String(64), nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

    history = relationship("HistoryEntry", back_populates="user", cascade="all, delete-orphan")


class HistoryEntry(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tool = Column(String(64), nullable=False)
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="history")
